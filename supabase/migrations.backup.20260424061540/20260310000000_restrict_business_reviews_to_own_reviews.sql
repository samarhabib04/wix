-- RLS Policy: Users can only read reviews for businesses they own
-- This policy restricts users to only view reviews for businesses they own
-- Checks: business_reviews.business_id -> business_listings.id -> business_listings.user_id = auth.uid()

-- Drop existing SELECT policies that allow broader access
DROP POLICY IF EXISTS "Users can view their own reviews" ON public.business_reviews;
DROP POLICY IF EXISTS "Business owners can view their business reviews" ON public.business_reviews;
DROP POLICY IF EXISTS "Business owners can view reviews for their business" ON public.business_reviews;
DROP POLICY IF EXISTS "Public can view approved business reviews" ON public.business_reviews;

-- Create policy: Users can only read reviews for businesses they own
-- Checks if the logged-in user owns the business that the review is for
CREATE POLICY "Users can only read reviews for their own businesses"
ON public.business_reviews
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.business_listings bl
    WHERE bl.id = business_reviews.business_id
    AND bl.user_id = auth.uid()
  )
);

-- Keep admin policy for admins to view all reviews
DROP POLICY IF EXISTS "Admins can view all business reviews" ON public.business_reviews;

CREATE POLICY "Admins can view all business reviews"
ON public.business_reviews
FOR SELECT
TO authenticated
USING (public.is_current_user_admin() = true);

-- Add comment
COMMENT ON POLICY "Users can only read reviews for their own businesses" ON public.business_reviews IS 
'Restricts users to only view business reviews for businesses they own (checks business_listings.user_id = auth.uid())';
