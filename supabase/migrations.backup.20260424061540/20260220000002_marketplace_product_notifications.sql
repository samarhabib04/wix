-- Marketplace product notification triggers
-- Notify admins when products need approval
-- Notify users when products go live

-- 1. Trigger function to notify admins when product status changes to pending_approval
CREATE OR REPLACE FUNCTION public.marketplace_products_approval_required_tf()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_users uuid[];
  business_name text;
  business_user_id uuid;
BEGIN
  -- Only trigger on status change to pending_approval
  IF NEW.status = 'pending_approval' AND (OLD.status IS NULL OR OLD.status != 'pending_approval') THEN
    -- Get business owner user_id
    SELECT user_id INTO business_user_id
    FROM public.business_listings
    WHERE id = NEW.business_id;

    -- Get business name
    SELECT name INTO business_name
    FROM public.business_listings
    WHERE id = NEW.business_id;

    -- Collect all admin users
    SELECT array_agg(id) INTO admin_users
    FROM public.user_profiles
    WHERE role = 'admin' OR is_admin = true;

    IF admin_users IS NULL OR array_length(admin_users, 1) IS NULL THEN
      RETURN NEW;
    END IF;

    -- Insert notifications for all admins
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
      'New marketplace product awaiting approval',
      COALESCE(
        'Product "' || COALESCE(NEW.name, 'Untitled') || '" from ' || COALESCE(business_name, 'Unknown business') || ' requires admin approval.',
        'A marketplace product requires admin approval.'
      ),
      'marketplace_product_approval_required',
      NEW.id,
      'marketplace_product',
      false,
      NOW(),
      NOW()
    FROM unnest(admin_users) AS admin_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_marketplace_products_approval_required ON public.marketplace_products;

CREATE TRIGGER trigger_marketplace_products_approval_required
  AFTER INSERT OR UPDATE OF status ON public.marketplace_products
  FOR EACH ROW
  EXECUTE FUNCTION public.marketplace_products_approval_required_tf();

-- 2. Function to notify business owner when product goes live
CREATE OR REPLACE FUNCTION public.notify_user_product_live()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  business_user_id uuid;
BEGIN
  -- Only trigger when product becomes published and approved
  IF NEW.is_published = true 
     AND NEW.admin_approved = true 
     AND NEW.status = 'live'
     AND (OLD.is_published = false OR OLD.admin_approved = false OR OLD.status != 'live') THEN
    
    -- Get business owner user_id
    SELECT user_id INTO business_user_id
    FROM public.business_listings
    WHERE id = NEW.business_id;

    IF business_user_id IS NOT NULL THEN
      -- Insert notification for business owner
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
      VALUES (
        business_user_id,
        'Product Approved and Live',
        COALESCE(
          'Your product "' || COALESCE(NEW.name, 'Untitled') || '" has been approved and is now live on the marketplace!',
          'Your product has been approved and is now live!'
        ),
        'product_approved',
        NEW.id,
        'marketplace_product',
        false,
        NOW(),
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for product going live
DROP TRIGGER IF EXISTS trigger_notify_user_product_live ON public.marketplace_products;

CREATE TRIGGER trigger_notify_user_product_live
  AFTER UPDATE OF is_published, admin_approved, status ON public.marketplace_products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_user_product_live();

COMMENT ON FUNCTION public.marketplace_products_approval_required_tf() IS 'Notifies all admins when a marketplace product status changes to pending_approval';
COMMENT ON FUNCTION public.notify_user_product_live() IS 'Notifies business owner when their product goes live (is_published = true AND admin_approved = true AND status = live)';
