-- Fix showcase_listings trigger to use seller_id instead of user_id
-- The showcase_listings table uses seller_id, not user_id

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
