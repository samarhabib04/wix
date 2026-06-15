-- Fix marketplace_products description column constraint
-- Make description nullable since we're using short_description and full_description

ALTER TABLE public.marketplace_products
  ALTER COLUMN description DROP NOT NULL;

-- Migrate any remaining data: set description to short_description if null
UPDATE public.marketplace_products
SET description = short_description
WHERE description IS NULL AND short_description IS NOT NULL;
