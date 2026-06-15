-- Create notification trigger function for vet partner requests
-- This function automatically creates notifications when requests are created or updated

CREATE OR REPLACE FUNCTION create_vet_partner_request_notification()
RETURNS TRIGGER AS $$
DECLARE
  admin_users uuid[];
  business_user_id uuid;
  business_name text;
  admin_id uuid;
BEGIN
  -- When a new request is created, notify all admins
  IF TG_OP = 'INSERT' THEN
    -- Get business name for notification
    SELECT user_id, name INTO business_user_id, business_name
    FROM public.business_listings
    WHERE id = NEW.business_id;
    
    -- Get all admin users
    SELECT array_agg(id) INTO admin_users
    FROM public.user_profiles
    WHERE role = 'admin' OR is_admin = true;
    
    -- Create notification for each admin
    IF admin_users IS NOT NULL THEN
      FOREACH admin_id IN ARRAY admin_users
      LOOP
        INSERT INTO public.notifications (
          user_id,
          title,
          message,
          type,
          read,
          created_at,
          updated_at
        ) VALUES (
          admin_id,
          'New Vet Partner Request',
          'Business "' || COALESCE(business_name, 'Unknown') || '" has requested to become a Dog Quest Partner.',
          'vet_partner_request_submitted',
          false,
          NOW(),
          NOW()
        );
      END LOOP;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- When a request is approved or rejected, notify the business user
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    -- Get business user_id
    SELECT user_id INTO business_user_id
    FROM public.business_listings
    WHERE id = NEW.business_id;
    
    IF business_user_id IS NOT NULL THEN
      IF NEW.status = 'approved' THEN
        -- Create approval notification
        INSERT INTO public.notifications (
          user_id,
          title,
          message,
          type,
          read,
          created_at,
          updated_at
        ) VALUES (
          business_user_id,
          'Vet Partner Request Approved',
          'Congratulations! Your request to become a Dog Quest Partner has been approved.',
          'vet_partner_request_approved',
          false,
          NOW(),
          NOW()
        );
      ELSIF NEW.status = 'rejected' THEN
        -- Create rejection notification with reason
        INSERT INTO public.notifications (
          user_id,
          title,
          message,
          type,
          read,
          created_at,
          updated_at
        ) VALUES (
          business_user_id,
          'Vet Partner Request Rejected',
          'Your request to become a Dog Quest Partner has been rejected.' ||
          CASE 
            WHEN NEW.rejection_reason IS NOT NULL AND NEW.rejection_reason != '' THEN
              ' Reason: ' || NEW.rejection_reason
            ELSE ''
          END,
          'vet_partner_request_rejected',
          false,
          NOW(),
          NOW()
        );
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create notifications
DROP TRIGGER IF EXISTS trigger_create_vet_partner_request_notification ON public.vet_partner_requests;
CREATE TRIGGER trigger_create_vet_partner_request_notification
  AFTER INSERT OR UPDATE ON public.vet_partner_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_vet_partner_request_notification();

-- Add comment to function
COMMENT ON FUNCTION create_vet_partner_request_notification() IS 'Automatically creates notifications when vet partner requests are created or updated';
