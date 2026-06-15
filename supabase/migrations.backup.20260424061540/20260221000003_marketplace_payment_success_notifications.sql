-- Trigger to notify business when payment transfer completes
-- Fires when marketplace_sales.payout_status changes to 'completed'

CREATE OR REPLACE FUNCTION public.notify_business_payment_success()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  business_user_id uuid;
  product_name text;
  payout_amount_euros numeric;
BEGIN
  -- Only trigger when payout_status changes to 'completed'
  IF NEW.payout_status = 'completed' AND (OLD.payout_status IS NULL OR OLD.payout_status != 'completed') THEN
    -- Get business owner user_id
    SELECT user_id INTO business_user_id
    FROM public.business_listings
    WHERE id = NEW.business_id;

    -- Get product name
    SELECT name INTO product_name
    FROM public.marketplace_products
    WHERE id = NEW.product_id;

    -- Calculate payout amount in euros (convert from cents)
    payout_amount_euros := NEW.business_payout_amount / 100.0;

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
        'Payment Received',
        COALESCE(
          '€' || payout_amount_euros::text || ' has been transferred to your Stripe account for "' || COALESCE(product_name, 'Product') || '"',
          'Payment has been transferred to your Stripe account'
        ),
        'marketplace_payment_completed',
        NEW.product_id,
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

-- Create trigger
DROP TRIGGER IF EXISTS trigger_notify_business_payment_success ON public.marketplace_sales;

CREATE TRIGGER trigger_notify_business_payment_success
  AFTER UPDATE OF payout_status ON public.marketplace_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_business_payment_success();
