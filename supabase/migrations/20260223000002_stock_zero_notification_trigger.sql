-- Trigger to notify business when marketplace product stock reaches zero
-- Fires when marketplace_products.stock_quantity changes from > 0 to 0

CREATE OR REPLACE FUNCTION public.notify_business_stock_zero()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  business_user_id uuid;
  product_name text;
  business_name text;
BEGIN
  -- Only trigger when stock_quantity changes to 0 (was > 0 before)
  IF NEW.stock_quantity = 0 AND (OLD.stock_quantity IS NULL OR OLD.stock_quantity > 0) THEN
    -- Get business owner user_id
    SELECT user_id INTO business_user_id
    FROM public.business_listings
    WHERE id = NEW.business_id;

    -- Get product name
    SELECT name INTO product_name
    FROM public.marketplace_products
    WHERE id = NEW.id;

    -- Get business name
    SELECT name INTO business_name
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
        'Product Out of Stock',
        COALESCE(
          'Your product "' || COALESCE(product_name, 'Product') || '" is now out of stock. Please add more inventory to continue selling.',
          'One of your products is out of stock'
        ),
        'marketplace_product_out_of_stock',
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

-- Create trigger
DROP TRIGGER IF EXISTS trigger_notify_business_stock_zero ON public.marketplace_products;

CREATE TRIGGER trigger_notify_business_stock_zero
  AFTER UPDATE ON public.marketplace_products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_business_stock_zero();
