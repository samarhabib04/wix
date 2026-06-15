-- Ensure eircode column exists on business_listings (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'business_listings'
    AND column_name = 'eircode'
  ) THEN
    ALTER TABLE public.business_listings ADD COLUMN eircode TEXT;
  END IF;
END $$;

-- Ensure about_us column exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'business_listings'
    AND column_name = 'about_us'
  ) THEN
    ALTER TABLE public.business_listings ADD COLUMN about_us TEXT;
  END IF;
END $$;

-- Ensure gallery_images column exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'business_listings'
    AND column_name = 'gallery_images'
  ) THEN
    ALTER TABLE public.business_listings ADD COLUMN gallery_images JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Force PostgREST to reload its schema cache so new columns are visible via the API
NOTIFY pgrst, 'reload schema';
