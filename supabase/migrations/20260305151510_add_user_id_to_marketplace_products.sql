-- Add user_id column to marketplace_products table
-- This allows fetching products by user_id instead of business_id
-- Useful when users have multiple business listings

-- Add user_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'marketplace_products' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.marketplace_products 
    ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    
    -- Update existing rows to set user_id from business_listings
    UPDATE public.marketplace_products mp
    SET user_id = bl.user_id
    FROM public.business_listings bl
    WHERE mp.business_id = bl.id AND mp.user_id IS NULL;
    
    -- Make user_id NOT NULL after backfilling
    ALTER TABLE public.marketplace_products 
    ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- Create index on user_id for performance
CREATE INDEX IF NOT EXISTS idx_marketplace_products_user_id 
ON public.marketplace_products(user_id);

-- Update RLS policy to use user_id directly (more efficient)
DROP POLICY IF EXISTS "Business owners can manage their own marketplace products" ON public.marketplace_products;

CREATE POLICY "Business owners can manage their own marketplace products"
  ON public.marketplace_products
  FOR ALL
  USING (user_id = auth.uid());
