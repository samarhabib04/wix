-- Trigger to notify business when a marketplace product is purchased
-- Fires when marketplace_sales record is inserted with payment_status = 'paid'

CREATE OR REPLACE FUNCTION public.notify_business_product_purchased()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  business_user_id uuid;
  product_name text;
  total_amount_euros numeric;
BEGIN
  -- Only trigger when payment_status is 'paid'
  IF NEW.payment_status = 'paid' THEN
    -- Get business owner user_id
    SELECT user_id INTO business_user_id
    FROM public.business_listings
    WHERE id = NEW.business_id;

    -- Get product name
    SELECT name INTO product_name
    FROM public.marketplace_products
    WHERE id = NEW.product_id;

    -- Calculate total amount in euros (convert from cents)
    total_amount_euros := NEW.total_amount / 100.0;

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
        'New Product Sale',
        COALESCE(
          'Customer purchased "' || COALESCE(product_name, 'Product') || '" x ' || NEW.quantity || ' - €' || total_amount_euros::text,
          'A customer purchased your product'
        ),
        'marketplace_product_purchased',
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
DROP TRIGGER IF EXISTS trigger_notify_business_product_purchased ON public.marketplace_sales;

CREATE TRIGGER trigger_notify_business_product_purchased
  AFTER INSERT ON public.marketplace_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_business_product_purchased();
