-- Add eircode column to business_listings table
-- This allows businesses to store their postal code/eircode for better geocoding

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_listings' 
    AND column_name = 'eircode'
  ) THEN
    ALTER TABLE public.business_listings 
    ADD COLUMN eircode TEXT;
  END IF;
END $$;
