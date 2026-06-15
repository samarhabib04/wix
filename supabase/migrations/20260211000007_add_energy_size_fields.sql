-- Add Energy and Size enum fields to listing tables

-- Create enum types
DO $$ 
BEGIN
  -- Create Energy enum type
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'energy_level') THEN
    CREATE TYPE energy_level AS ENUM ('Low', 'Moderate', 'High', 'VeryHigh');
  END IF;
  
  -- Create Size enum type
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'size_level') THEN
    CREATE TYPE size_level AS ENUM ('Small', 'Medium', 'Large', 'ExtraLarge');
  END IF;
END $$;

-- Add Energy column to sale_listings
ALTER TABLE public.sale_listings 
ADD COLUMN IF NOT EXISTS energy energy_level;

-- Add Size column to sale_listings
ALTER TABLE public.sale_listings 
ADD COLUMN IF NOT EXISTS size size_level;

-- Add Energy column to stud_listings
ALTER TABLE public.stud_listings 
ADD COLUMN IF NOT EXISTS energy energy_level;

-- Add Size column to stud_listings
ALTER TABLE public.stud_listings 
ADD COLUMN IF NOT EXISTS size size_level;

-- Add Energy column to showcase_listings
ALTER TABLE public.showcase_listings 
ADD COLUMN IF NOT EXISTS energy energy_level;

-- Add Size column to showcase_listings
ALTER TABLE public.showcase_listings 
ADD COLUMN IF NOT EXISTS size size_level;

-- Delete all data from sale_listings
DELETE FROM public.sale_listings;

-- Delete all data from stud_listings
DELETE FROM public.stud_listings;

-- Delete all data from showcase_listings
DELETE FROM public.showcase_listings;
