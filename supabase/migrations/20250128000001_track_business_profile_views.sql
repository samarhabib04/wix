-- Add views column to business_listings if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'business_listings' 
    AND column_name = 'views'
  ) THEN
    ALTER TABLE public.business_listings 
    ADD COLUMN views INTEGER NOT NULL DEFAULT 0;
    
    -- Create index for better query performance
    CREATE INDEX IF NOT EXISTS idx_business_listings_views ON public.business_listings(views);
  END IF;
END $$;

-- Create function to increment business profile views
-- This function safely increments the views counter for a business listing

CREATE OR REPLACE FUNCTION increment_business_views(business_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE business_listings
  SET views = COALESCE(views, 0) + 1
  WHERE id = business_id
    AND admin_approved = true
    AND status = 'approved';
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION increment_business_views(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_business_views(uuid) TO anon;

-- Add comment
COMMENT ON FUNCTION increment_business_views(uuid) IS 'Increments the views counter for a business listing when someone views the profile';
