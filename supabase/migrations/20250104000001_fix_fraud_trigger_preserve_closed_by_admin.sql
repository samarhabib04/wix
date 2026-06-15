-- Fix check_signup_fraud trigger to preserve closed_by_admin and related fields
-- This prevents the trigger from overwriting admin-closed fraud alerts

-- Step 1: Create RPC function to update fraud_flags
-- The trigger will preserve closed_by_admin if it's in the update
CREATE OR REPLACE FUNCTION public.update_user_fraud_flags(
  p_user_id UUID,
  p_fraud_flags JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update fraud_flags directly
  -- The trigger will detect closed_by_admin in NEW.fraud_flags and preserve it
  UPDATE public.user_profiles
  SET fraud_flags = p_fraud_flags
  WHERE id = p_user_id;
END;
$$;

-- Step 2: Fix the trigger to preserve closed_by_admin when it's being set
CREATE OR REPLACE FUNCTION public.check_signup_fraud()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  fraud_analysis jsonb;
  admin_users uuid[];
  notification_error text;
  preserved_fields jsonb := '{}'::jsonb;
  is_closed_by_admin_in_new BOOLEAN := false;
  is_closed_by_admin_in_old BOOLEAN := false;
BEGIN
  -- Check if NEW.fraud_flags (what we're trying to set) has closed_by_admin
  -- This means an admin is trying to close the alert
  IF NEW.fraud_flags IS NOT NULL 
     AND jsonb_typeof(NEW.fraud_flags) = 'object' 
     AND (NEW.fraud_flags->>'closed_by_admin')::boolean = true THEN
    is_closed_by_admin_in_new := true;
    
    -- Preserve the closed_by_admin fields from NEW (what admin is setting)
    preserved_fields := jsonb_build_object(
      'closed_by_admin', NEW.fraud_flags->'closed_by_admin',
      'closed_at', NEW.fraud_flags->'closed_at',
      'closed_by', NEW.fraud_flags->'closed_by'
    );
  END IF;

  -- Check if OLD.fraud_flags has closed_by_admin (already closed)
  IF OLD.fraud_flags IS NOT NULL 
     AND jsonb_typeof(OLD.fraud_flags) = 'object' 
     AND (OLD.fraud_flags->>'closed_by_admin')::boolean = true THEN
    is_closed_by_admin_in_old := true;
    
    -- If NEW doesn't have it, preserve from OLD
    IF NOT is_closed_by_admin_in_new THEN
      preserved_fields := jsonb_build_object(
        'closed_by_admin', OLD.fraud_flags->'closed_by_admin',
        'closed_at', OLD.fraud_flags->'closed_at',
        'closed_by', OLD.fraud_flags->'closed_by'
      );
    END IF;
  END IF;

  -- If admin is closing the alert (closed_by_admin in NEW), skip fraud analysis
  -- and just use the NEW.fraud_flags with any preserved fields
  IF is_closed_by_admin_in_new THEN
    -- Admin is closing, preserve the fraud_flags they're setting
    NEW.fraud_flags := NEW.fraud_flags || preserved_fields;
    RETURN NEW; -- Skip fraud analysis
  END IF;

  -- If already closed and only fraud_flags is changing, preserve it
  -- Check if email, phone, first_name, last_name are unchanged
  IF is_closed_by_admin_in_old 
     AND OLD.email = NEW.email 
     AND OLD.phone = NEW.phone 
     AND OLD.first_name = NEW.first_name 
     AND OLD.last_name = NEW.last_name THEN
    -- Only fraud_flags is being updated, preserve closed_by_admin and skip re-analysis
    IF NEW.fraud_flags IS NOT NULL AND jsonb_typeof(NEW.fraud_flags) = 'object' THEN
      -- Merge the new fraud_flags with preserved fields
      NEW.fraud_flags := NEW.fraud_flags || preserved_fields;
    ELSE
      -- If new fraud_flags is null or invalid, keep old one with preserved fields
      NEW.fraud_flags := OLD.fraud_flags || preserved_fields;
    END IF;
    RETURN NEW; -- Skip fraud analysis
  END IF;

  -- Normal fraud analysis flow (for new users or when user data changes)
  BEGIN
    -- Analyze the signup data for fraud indicators
    fraud_analysis := analyze_signup_fraud(
      NEW.email,
      NEW.phone,
      NEW.first_name,
      NEW.last_name
    );
    
    -- Merge fraud analysis with preserved fields
    IF is_closed_by_admin_in_old THEN
      -- User was closed but data changed, merge analysis with preserved closed status
      NEW.fraud_flags := fraud_analysis || preserved_fields;
    ELSE
      -- Normal case: use analysis result
      NEW.fraud_flags := fraud_analysis;
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    -- If fraud analysis fails, preserve existing flags or create error object
    IF is_closed_by_admin_in_old THEN
      -- Preserve closed status even if analysis fails
      NEW.fraud_flags := COALESCE(OLD.fraud_flags, '{}'::jsonb) || preserved_fields;
    ELSE
      NEW.fraud_flags := jsonb_build_object(
        'analysis_failed', true,
        'error', SQLERRM,
        'analyzed_at', now()
      );
    END IF;
  END;
  
  -- If suspicious and not closed by admin, try to create notifications for admins (non-blocking)
  IF (NEW.fraud_flags->>'is_suspicious')::boolean = true 
     AND NOT is_closed_by_admin_in_old 
     AND NOT is_closed_by_admin_in_new THEN
    
    BEGIN
      -- Get all admin users
      SELECT array_agg(id) INTO admin_users
      FROM public.user_profiles 
      WHERE role = 'admin' OR is_admin = true;
      
      -- Insert notification for each admin
      IF admin_users IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        SELECT 
          admin_id,
          'Suspicious User Signup',
          'User ' || COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '') || 
          ' (' || NEW.email || ') registered with suspicious details. Flags: ' || 
          array_to_string(ARRAY(SELECT jsonb_array_elements_text(NEW.fraud_flags->'flags')), ', '),
          'fraud_alert'
        FROM unnest(admin_users) AS admin_id;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log notification failure but don't block user creation
      notification_error := SQLERRM;
      RAISE LOG 'Failed to create fraud notifications for user %: %', NEW.email, notification_error;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;
