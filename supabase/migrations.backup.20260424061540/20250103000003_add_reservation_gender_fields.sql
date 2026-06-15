-- Add gender and reservation type fields to reservations table
-- This migration adds fields for tracking puppy gender, reservation type, and individual puppy details

-- Add reservation_type column (basic or individual)
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS reservation_type TEXT DEFAULT 'basic' 
  CHECK (reservation_type IN ('basic', 'individual'));

-- Add puppy_gender column (male or female)
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS puppy_gender TEXT 
  CHECK (puppy_gender IS NULL OR puppy_gender IN ('male', 'female'));

-- Add puppy_id column (for individual reservations - references puppy in listing's puppy_details JSON)
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS puppy_id TEXT;

-- Add puppy_color column (for individual reservations)
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS puppy_color TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reservations_gender 
ON public.reservations (puppy_gender) 
WHERE puppy_gender IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_type 
ON public.reservations (reservation_type);

CREATE INDEX IF NOT EXISTS idx_reservations_puppy_id 
ON public.reservations (puppy_id) 
WHERE puppy_id IS NOT NULL;

-- Add comments explaining the fields
COMMENT ON COLUMN public.reservations.reservation_type IS 'Type of reservation: basic (gender only) or individual (specific puppy)';
COMMENT ON COLUMN public.reservations.puppy_gender IS 'Gender of reserved puppy: male or female';
COMMENT ON COLUMN public.reservations.puppy_id IS 'ID of specific puppy (for individual reservations)';
COMMENT ON COLUMN public.reservations.puppy_color IS 'Color of reserved puppy (for individual reservations)';
