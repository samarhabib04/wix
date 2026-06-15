-- Add ON DELETE SET NULL behavior to sale_listings_converted_from_showcase_id_fkey
-- This allows deleting showcase_listings while keeping the sale_listings

-- First, drop the existing foreign key constraint
ALTER TABLE public.sale_listings
DROP CONSTRAINT IF EXISTS sale_listings_converted_from_showcase_id_fkey;

-- Recreate the foreign key with ON DELETE SET NULL
-- This means when a showcase_listing is deleted, converted_from_showcase_id will be set to NULL
ALTER TABLE public.sale_listings
ADD CONSTRAINT sale_listings_converted_from_showcase_id_fkey
FOREIGN KEY (converted_from_showcase_id)
REFERENCES public.showcase_listings(id)
ON DELETE SET NULL;
