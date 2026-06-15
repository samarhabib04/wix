-- Add RLS policy to allow business owners to view all reviews for their business listings
-- This allows business owners to see pending, approved, and rejected reviews for their business

CREATE POLICY "Business owners can view reviews for their business"
  ON public.business_reviews
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.business_listings
      WHERE business_listings.id = business_reviews.business_id
      AND business_listings.user_id = auth.uid()
    )
  );

-- Add RLS policy to allow business owners to delete reviews for their business listings
CREATE POLICY "Business owners can delete reviews for their business"
  ON public.business_reviews
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.business_listings
      WHERE business_listings.id = business_reviews.business_id
      AND business_listings.user_id = auth.uid()
    )
  );
