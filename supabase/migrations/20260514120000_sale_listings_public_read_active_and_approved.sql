-- Align public SELECT on sale_listings with app filters (PUBLIC_MARKETPLACE_SALE_STATUSES).
-- Previously only status = 'active' was visible to anon; boosted rows often use
-- status = 'approved', so guests saw a different duplicate listing without boost.

DROP POLICY IF EXISTS "Public can view active sale listings" ON public.sale_listings;

CREATE POLICY "Public can view active sale listings"
  ON public.sale_listings
  FOR SELECT
  USING (
    admin_approved = true
    AND is_published = true
    AND is_deleted = false
    AND is_paused = false
    AND status IN ('active', 'approved')
  );
