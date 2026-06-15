-- Add documents JSON column to stud_listings table
-- This allows stud listings to have optional supporting documents

-- Add documents column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stud_listings' 
    AND column_name = 'documents'
  ) THEN
    ALTER TABLE public.stud_listings 
    ADD COLUMN documents jsonb DEFAULT '[]'::jsonb;
    
    -- Add comment to document the column
    COMMENT ON COLUMN public.stud_listings.documents IS 'Array of supporting documents with id, name, url, and size fields';
  END IF;
END $$;
