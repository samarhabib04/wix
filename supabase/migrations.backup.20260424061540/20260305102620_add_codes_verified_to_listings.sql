-- Add codes_verified column to sale_listings and stud_listings tables
-- This column tracks whether all health codes (H1, V1, V2) entered for a listing are valid

-- Add codes_verified to sale_listings
ALTER TABLE public.sale_listings
ADD COLUMN IF NOT EXISTS codes_verified BOOLEAN NOT NULL DEFAULT false;

-- Add codes_verified to stud_listings
ALTER TABLE public.stud_listings
ADD COLUMN IF NOT EXISTS codes_verified BOOLEAN NOT NULL DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN public.sale_listings.codes_verified IS 'Indicates whether all health codes (H1, V1, V2) entered for this listing are valid and verified against the health_codes database';
COMMENT ON COLUMN public.stud_listings.codes_verified IS 'Indicates whether all health codes (H1, V1, V2) entered for this listing are valid and verified against the health_codes database';

-- Create index for faster queries on verification status
CREATE INDEX IF NOT EXISTS idx_sale_listings_codes_verified ON public.sale_listings(codes_verified);
CREATE INDEX IF NOT EXISTS idx_stud_listings_codes_verified ON public.stud_listings(codes_verified);
