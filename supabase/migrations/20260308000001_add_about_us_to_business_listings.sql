-- Add gallery_images and about_us columns to business_listings table
-- These fields are for Premium and Elite Marketplace subscription tiers

DO $$ 
BEGIN
  -- Add gallery_images column (JSONB array of image URLs)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_listings' 
    AND column_name = 'gallery_images'
  ) THEN
    ALTER TABLE public.business_listings 
    ADD COLUMN gallery_images JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Add about_us column (TEXT for long-form content)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_listings' 
    AND column_name = 'about_us'
  ) THEN
    ALTER TABLE public.business_listings 
    ADD COLUMN about_us TEXT;
  END IF;
END $$;
