-- Admin approval notifications for new/changed listings that need review
-- This migration adds:
-- 1) A helper function to notify all admins when an item requires approval
-- 2) Triggers on sale_listings, stud_listings, showcase_listings, business_listings

-- 1. Generic function to insert notifications for all admins
CREATE OR REPLACE FUNCTION public.notify_admins_approval_required(
  p_listing_id uuid,
  p_listing_type text,
  p_title text,
  p_seller_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_users uuid[];
  seller_name text;
  seller_email text;
  notification_type text;
BEGIN
  -- Collect all admin users
  SELECT array_agg(id) INTO admin_users
  FROM public.user_profiles
  WHERE role = 'admin' OR is_admin = true;

  IF admin_users IS NULL OR array_length(admin_users, 1) IS NULL THEN
    -- No admins to notify
    RETURN;
  END IF;

  -- Get seller name/email (best effort)
  SELECT 
    COALESCE(
      NULLIF(TRIM(
        COALESCE(business_name, '') ||
        CASE WHEN business_name IS NOT NULL AND business_name <> '' THEN ' - ' ELSE '' END ||
        COALESCE(first_name || ' ' || last_name, '')
      ), ''),
      email,
      'Unknown seller'
    ),
    email
  INTO seller_name, seller_email
  FROM public.user_profiles
  WHERE id = p_seller_id;

  IF seller_name IS NULL THEN
    seller_name := 'Unknown seller';
  END IF;

  -- Choose a specific type for easy filtering in the UI
  notification_type := CASE lower(p_listing_type)
    WHEN 'sale' THEN 'listing_approval_required'
    WHEN 'stud' THEN 'stud_approval_required'
    WHEN 'showcase' THEN 'showcase_approval_required'
    WHEN 'business' THEN 'business_approval_required'
    ELSE 'approval_required'
  END;

  -- Insert one notification per admin
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    listing_id,
    listing_type,
    read,
    created_at,
    updated_at
  )
  SELECT
    admin_id,
    CASE lower(p_listing_type)
      WHEN 'sale' THEN 'New listing awaiting approval'
      WHEN 'stud' THEN 'New stud listing awaiting approval'
      WHEN 'showcase' THEN 'New showcase awaiting approval'
      WHEN 'business' THEN 'New business listing awaiting approval'
      ELSE 'New item awaiting approval'
    END,
    COALESCE(
      'Listing "' || COALESCE(p_title, 'Untitled') || '" from ' || seller_name || ' requires admin approval.',
      'An item requires admin approval.'
    ),
    notification_type,
    p_listing_id,
    p_listing_type,
    false,
    NOW(),
    NOW()
  FROM unnest(admin_users) AS admin_id;
END;
$$;

COMMENT ON FUNCTION public.notify_admins_approval_required(uuid, text, text, uuid)
IS 'Creates notifications for all admin users when a listing/showcase/business requires approval';


-- 2. Trigger helper functions + triggers on listing tables

-- Helper comment:
-- We only want to notify when an item ENTERS a needs-approval state.
-- Conditions:
--   - INSERT: admin_approved is NULL/false (new item needing approval)
--   - UPDATE: admin_approved changed from true -> false (re-approval required)

-- We implement this via small trigger functions per table that call
-- notify_admins_approval_required with the appropriate parameters.

-- sale_listings (puppy/for-sale adverts)

CREATE OR REPLACE FUNCTION public.sale_listings_approval_required_tf()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF
    (TG_OP = 'INSERT' AND COALESCE(NEW.admin_approved, false) = false)
    OR
    (TG_OP = 'UPDATE'
     AND COALESCE(OLD.admin_approved, true) = true
     AND COALESCE(NEW.admin_approved, false) = false)
  THEN
    PERFORM public.notify_admins_approval_required(
      NEW.id,
      'sale',
      NEW.title,
      NEW.seller_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sale_listings_approval_required_trigger ON public.sale_listings;

CREATE TRIGGER sale_listings_approval_required_trigger
AFTER INSERT OR UPDATE ON public.sale_listings
FOR EACH ROW
EXECUTE FUNCTION public.sale_listings_approval_required_tf();


-- stud_listings

CREATE OR REPLACE FUNCTION public.stud_listings_approval_required_tf()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF
    (TG_OP = 'INSERT' AND COALESCE(NEW.admin_approved, false) = false)
    OR
    (TG_OP = 'UPDATE'
     AND COALESCE(OLD.admin_approved, true) = true
     AND COALESCE(NEW.admin_approved, false) = false)
  THEN
    PERFORM public.notify_admins_approval_required(
      NEW.id,
      'stud',
      NEW.title,
      NEW.user_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stud_listings_approval_required_trigger ON public.stud_listings;

CREATE TRIGGER stud_listings_approval_required_trigger
AFTER INSERT OR UPDATE ON public.stud_listings
FOR EACH ROW
EXECUTE FUNCTION public.stud_listings_approval_required_tf();


-- showcase_listings

CREATE OR REPLACE FUNCTION public.showcase_listings_approval_required_tf()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF
    (TG_OP = 'INSERT' AND COALESCE(NEW.admin_approved, false) = false)
    OR
    (TG_OP = 'UPDATE'
     AND COALESCE(OLD.admin_approved, true) = true
     AND COALESCE(NEW.admin_approved, false) = false)
  THEN
    PERFORM public.notify_admins_approval_required(
      NEW.id,
      'showcase',
      NEW.title,
      NEW.seller_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS showcase_listings_approval_required_trigger ON public.showcase_listings;

CREATE TRIGGER showcase_listings_approval_required_trigger
AFTER INSERT OR UPDATE ON public.showcase_listings
FOR EACH ROW
EXECUTE FUNCTION public.showcase_listings_approval_required_tf();


-- business_listings (services / vets / groomers etc.)

CREATE OR REPLACE FUNCTION public.business_listings_approval_required_tf()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF
    (TG_OP = 'INSERT' AND COALESCE(NEW.admin_approved, false) = false)
    OR
    (TG_OP = 'UPDATE'
     AND COALESCE(OLD.admin_approved, true) = true
     AND COALESCE(NEW.admin_approved, false) = false)
  THEN
    PERFORM public.notify_admins_approval_required(
      NEW.id,
      'business',
      NEW.name,
      NEW.user_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS business_listings_approval_required_trigger ON public.business_listings;

CREATE TRIGGER business_listings_approval_required_trigger
AFTER INSERT OR UPDATE ON public.business_listings
FOR EACH ROW
EXECUTE FUNCTION public.business_listings_approval_required_tf();

