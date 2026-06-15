-- Admin shop (public.products): numeric stock count for admin visibility and inventory
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.products.stock_quantity IS 'Units available for the Dog Quest admin shop product.';

-- Backfill from existing boolean (1 unit if previously marked in stock)
UPDATE public.products
SET stock_quantity = CASE WHEN in_stock THEN 1 ELSE 0 END;
