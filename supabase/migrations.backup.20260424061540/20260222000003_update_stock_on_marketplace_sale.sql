-- Create trigger to automatically decrement stock when a marketplace sale is created
-- This ensures stock is always updated when a sale is recorded with payment_status = 'paid'

CREATE OR REPLACE FUNCTION update_marketplace_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Only decrement stock when payment_status is 'paid'
  IF NEW.payment_status = 'paid' THEN
    -- Decrement stock_quantity by the quantity sold
    -- Use GREATEST to ensure stock never goes below 0
    UPDATE public.marketplace_products
    SET 
      stock_quantity = GREATEST(0, stock_quantity - NEW.quantity),
      updated_at = now()
    WHERE id = NEW.product_id;
    
    -- Log the stock update
    RAISE NOTICE 'Updated stock for product %: decremented by %', NEW.product_id, NEW.quantity;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires AFTER INSERT on marketplace_sales
DROP TRIGGER IF EXISTS trigger_update_marketplace_product_stock ON public.marketplace_sales;
CREATE TRIGGER trigger_update_marketplace_product_stock
  AFTER INSERT ON public.marketplace_sales
  FOR EACH ROW
  WHEN (NEW.payment_status = 'paid')
  EXECUTE FUNCTION update_marketplace_product_stock();

-- Also handle updates when payment_status changes from non-paid to 'paid'
CREATE OR REPLACE FUNCTION update_marketplace_product_stock_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- If payment_status changed from non-paid to 'paid', decrement stock
  IF OLD.payment_status != 'paid' AND NEW.payment_status = 'paid' THEN
    UPDATE public.marketplace_products
    SET 
      stock_quantity = GREATEST(0, stock_quantity - NEW.quantity),
      updated_at = now()
    WHERE id = NEW.product_id;
    
    RAISE NOTICE 'Updated stock for product %: decremented by % (payment status changed to paid)', NEW.product_id, NEW.quantity;
  END IF;
  
  -- If payment_status changed from 'paid' to non-paid (refund), restore stock
  IF OLD.payment_status = 'paid' AND NEW.payment_status != 'paid' THEN
    UPDATE public.marketplace_products
    SET 
      stock_quantity = stock_quantity + OLD.quantity,
      updated_at = now()
    WHERE id = NEW.product_id;
    
    RAISE NOTICE 'Restored stock for product %: incremented by % (payment status changed from paid)', NEW.product_id, OLD.quantity;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires AFTER UPDATE on marketplace_sales
DROP TRIGGER IF EXISTS trigger_update_marketplace_product_stock_on_payment_change ON public.marketplace_sales;
CREATE TRIGGER trigger_update_marketplace_product_stock_on_payment_change
  AFTER UPDATE ON public.marketplace_sales
  FOR EACH ROW
  WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  EXECUTE FUNCTION update_marketplace_product_stock_on_payment();
