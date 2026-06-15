-- Add refund_policy column to business_listings table
-- This allows each business to set their own refund policy for marketplace products

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_listings' 
    AND column_name = 'refund_policy'
  ) THEN
    ALTER TABLE public.business_listings 
    ADD COLUMN refund_policy TEXT;
  END IF;
END $$;
