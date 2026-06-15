-- Shop order notification trigger
-- Notify admins when a shop order payment is confirmed

CREATE OR REPLACE FUNCTION public.notify_admin_new_shop_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_users uuid[];
BEGIN
  IF NEW.payment_status = 'Paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'Paid') THEN
    SELECT array_agg(id) INTO admin_users
    FROM public.user_profiles
    WHERE role = 'admin' OR is_admin = true;

    IF admin_users IS NULL OR array_length(admin_users, 1) IS NULL THEN
      RETURN NEW;
    END IF;

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
      'New Shop Order Received',
      COALESCE(
        'Order from ' || COALESCE(NEW.guest_email, 'Unknown customer') || ' — ' || COALESCE(NEW.currency, 'EUR') || ' ' || NEW.total_price,
        'A new shop order has been placed.'
      ),
      'new_shop_order',
      NEW.id,
      'shop_order',
      false,
      NOW(),
      NOW()
    FROM unnest(admin_users) AS admin_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_admin_new_shop_order ON public.shop_orders;

CREATE TRIGGER trigger_notify_admin_new_shop_order
  AFTER UPDATE OF payment_status ON public.shop_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_shop_order();

COMMENT ON FUNCTION public.notify_admin_new_shop_order() IS 'Notifies all admins when a shop order payment_status changes to Paid';
