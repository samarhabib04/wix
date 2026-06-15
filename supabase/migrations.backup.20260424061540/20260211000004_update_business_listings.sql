-- Update business_listings table with new fields for subscriptions and vet partners

-- Add subscription_tier column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_listings' 
    AND column_name = 'subscription_tier'
  ) THEN
    CREATE TYPE business_subscription_tier_enum AS ENUM ('standard', 'premium', 'elite_marketplace');
    ALTER TABLE public.business_listings 
    ADD COLUMN subscription_tier business_subscription_tier_enum;
  END IF;
END $$;

-- Add profile_image_url column (separate from logo_image)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_listings' 
    AND column_name = 'profile_image_url'
  ) THEN
    ALTER TABLE public.business_listings 
    ADD COLUMN profile_image_url text;
  END IF;
END $$;

-- Add is_vet_partner column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_listings' 
    AND column_name = 'is_vet_partner'
  ) THEN
    ALTER TABLE public.business_listings 
    ADD COLUMN is_vet_partner boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add vet_partner_tier column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_listings' 
    AND column_name = 'vet_partner_tier'
  ) THEN
    CREATE TYPE vet_partner_tier_enum AS ENUM ('free', 'paid');
    ALTER TABLE public.business_listings 
    ADD COLUMN vet_partner_tier vet_partner_tier_enum;
  END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_business_listings_subscription_tier ON public.business_listings(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_business_listings_is_vet_partner ON public.business_listings(is_vet_partner);
CREATE INDEX IF NOT EXISTS idx_business_listings_vet_partner_tier ON public.business_listings(vet_partner_tier);
