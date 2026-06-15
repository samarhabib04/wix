-- Allow public users to view approved business listings
-- This is needed for the business_boosts carousel to work properly
-- when joining business_listings through business_boosts

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Public can view approved business listings" ON public.business_listings;

-- Create policy to allow public viewing of approved business listings
CREATE POLICY "Public can view approved business listings"
  ON public.business_listings
  FOR SELECT
  USING (
    admin_approved = true 
    AND status = 'approved'
  );
