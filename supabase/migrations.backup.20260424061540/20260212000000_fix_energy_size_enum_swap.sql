-- Fix swapped enum values for energy_level and size_level
-- The enums were incorrectly defined with swapped values

-- Step 1: Create temporary columns to hold the swapped values
ALTER TABLE public.sale_listings 
ADD COLUMN IF NOT EXISTS energy_temp text,
ADD COLUMN IF NOT EXISTS size_temp text;

ALTER TABLE public.stud_listings 
ADD COLUMN IF NOT EXISTS energy_temp text,
ADD COLUMN IF NOT EXISTS size_temp text;

ALTER TABLE public.showcase_listings 
ADD COLUMN IF NOT EXISTS energy_temp text,
ADD COLUMN IF NOT EXISTS size_temp text;

-- Step 2: Copy values with the swap
-- Energy column currently has size values, so copy to size_temp
-- Size column currently has energy values, so copy to energy_temp
UPDATE public.sale_listings 
SET 
  energy_temp = size::text,
  size_temp = energy::text
WHERE energy IS NOT NULL OR size IS NOT NULL;

UPDATE public.stud_listings 
SET 
  energy_temp = size::text,
  size_temp = energy::text
WHERE energy IS NOT NULL OR size IS NOT NULL;

UPDATE public.showcase_listings 
SET 
  energy_temp = size::text,
  size_temp = energy::text
WHERE energy IS NOT NULL OR size IS NOT NULL;

-- Step 3: Drop the old enum columns
ALTER TABLE public.sale_listings DROP COLUMN IF EXISTS energy;
ALTER TABLE public.sale_listings DROP COLUMN IF EXISTS size;
ALTER TABLE public.stud_listings DROP COLUMN IF EXISTS energy;
ALTER TABLE public.stud_listings DROP COLUMN IF EXISTS size;
ALTER TABLE public.showcase_listings DROP COLUMN IF EXISTS energy;
ALTER TABLE public.showcase_listings DROP COLUMN IF EXISTS size;

-- Step 4: Drop the old enum types
DROP TYPE IF EXISTS energy_level;
DROP TYPE IF EXISTS size_level;

-- Step 5: Recreate enum types with correct values
CREATE TYPE energy_level AS ENUM ('Low', 'Moderate', 'High', 'VeryHigh');
CREATE TYPE size_level AS ENUM ('Small', 'Medium', 'Large', 'ExtraLarge');

-- Step 6: Add columns back with correct enum types
ALTER TABLE public.sale_listings 
ADD COLUMN energy energy_level,
ADD COLUMN size size_level;

ALTER TABLE public.stud_listings 
ADD COLUMN energy energy_level,
ADD COLUMN size size_level;

ALTER TABLE public.showcase_listings 
ADD COLUMN energy energy_level,
ADD COLUMN size size_level;

-- Step 7: Copy swapped values back to correct columns
-- energy_temp contains what was in the size column (energy values: Low, Moderate, High, VeryHigh) -> goes to energy column
-- size_temp contains what was in the energy column (size values: Small, Medium, Large, ExtraLarge) -> goes to size column
UPDATE public.sale_listings 
SET 
  energy = CASE energy_temp
    WHEN 'Low' THEN 'Low'::energy_level
    WHEN 'Moderate' THEN 'Moderate'::energy_level
    WHEN 'High' THEN 'High'::energy_level
    WHEN 'VeryHigh' THEN 'VeryHigh'::energy_level
    ELSE NULL
  END,
  size = CASE size_temp
    WHEN 'Small' THEN 'Small'::size_level
    WHEN 'Medium' THEN 'Medium'::size_level
    WHEN 'Large' THEN 'Large'::size_level
    WHEN 'ExtraLarge' THEN 'ExtraLarge'::size_level
    ELSE NULL
  END
WHERE energy_temp IS NOT NULL OR size_temp IS NOT NULL;

UPDATE public.stud_listings 
SET 
  energy = CASE energy_temp
    WHEN 'Low' THEN 'Low'::energy_level
    WHEN 'Moderate' THEN 'Moderate'::energy_level
    WHEN 'High' THEN 'High'::energy_level
    WHEN 'VeryHigh' THEN 'VeryHigh'::energy_level
    ELSE NULL
  END,
  size = CASE size_temp
    WHEN 'Small' THEN 'Small'::size_level
    WHEN 'Medium' THEN 'Medium'::size_level
    WHEN 'Large' THEN 'Large'::size_level
    WHEN 'ExtraLarge' THEN 'ExtraLarge'::size_level
    ELSE NULL
  END
WHERE energy_temp IS NOT NULL OR size_temp IS NOT NULL;

UPDATE public.showcase_listings 
SET 
  energy = CASE energy_temp
    WHEN 'Low' THEN 'Low'::energy_level
    WHEN 'Moderate' THEN 'Moderate'::energy_level
    WHEN 'High' THEN 'High'::energy_level
    WHEN 'VeryHigh' THEN 'VeryHigh'::energy_level
    ELSE NULL
  END,
  size = CASE size_temp
    WHEN 'Small' THEN 'Small'::size_level
    WHEN 'Medium' THEN 'Medium'::size_level
    WHEN 'Large' THEN 'Large'::size_level
    WHEN 'ExtraLarge' THEN 'ExtraLarge'::size_level
    ELSE NULL
  END
WHERE energy_temp IS NOT NULL OR size_temp IS NOT NULL;

-- Step 8: Drop temporary columns
ALTER TABLE public.sale_listings DROP COLUMN IF EXISTS energy_temp;
ALTER TABLE public.sale_listings DROP COLUMN IF EXISTS size_temp;
ALTER TABLE public.stud_listings DROP COLUMN IF EXISTS energy_temp;
ALTER TABLE public.stud_listings DROP COLUMN IF EXISTS size_temp;
ALTER TABLE public.showcase_listings DROP COLUMN IF EXISTS energy_temp;
ALTER TABLE public.showcase_listings DROP COLUMN IF EXISTS size_temp;
