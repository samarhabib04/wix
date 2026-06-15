-- Update marketplace_products table for draft system
-- Add comprehensive product fields, status workflow, and category system

-- Create product category ENUM
CREATE TYPE marketplace_product_category AS ENUM (
  'Nutrition',
  'Health & Wellness',
  'Training & Behaviour',
  'Grooming',
  'Active Play',
  'Beds & Crates',
  'Collars, Leads & Harnesses',
  'Travel & Living',
  'Cleaning & Hygiene',
  'Puppy Essentials'
);

-- Create product status ENUM
CREATE TYPE marketplace_product_status AS ENUM (
  'draft',
  'pending_approval',
  'live'
);

-- Create product condition ENUM
CREATE TYPE marketplace_product_condition AS ENUM (
  'new',
  'used'
);

-- Add new columns to marketplace_products table
ALTER TABLE public.marketplace_products
  ADD COLUMN IF NOT EXISTS status marketplace_product_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS category marketplace_product_category,
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS full_description TEXT,
  ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_required BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS condition marketplace_product_condition NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS boost_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS boost_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Rename existing description to full_description if it exists and full_description is null
DO $$
BEGIN
  UPDATE public.marketplace_products
  SET full_description = description
  WHERE full_description IS NULL AND description IS NOT NULL;
END $$;

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_marketplace_products_status ON public.marketplace_products(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_category ON public.marketplace_products(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_is_published ON public.marketplace_products(is_published);

-- Update RLS policies to allow business owners to view their drafts
DROP POLICY IF EXISTS "Business owners can manage their own marketplace products" ON public.marketplace_products;

CREATE POLICY "Business owners can manage their own marketplace products"
  ON public.marketplace_products
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_listings
      WHERE business_listings.id = marketplace_products.business_id
      AND business_listings.user_id = auth.uid()
    )
  );

-- Update public view policy to only show published and approved products
DROP POLICY IF EXISTS "Public can view approved active products" ON public.marketplace_products;

CREATE POLICY "Public can view approved active products"
  ON public.marketplace_products
  FOR SELECT
  USING (
    status = 'live' 
    AND is_published = true 
    AND admin_approved = true 
    AND is_active = true
  );

-- Add comment for documentation
COMMENT ON COLUMN public.marketplace_products.status IS 'Product workflow status: draft, pending_approval, or live';
COMMENT ON COLUMN public.marketplace_products.is_published IS 'Separate from admin_approved - indicates product is published and visible';
COMMENT ON COLUMN public.marketplace_products.images IS 'JSONB array of image URLs, first image is main product image';
