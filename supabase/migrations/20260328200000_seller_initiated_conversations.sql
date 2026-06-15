-- Allow sellers to start conversations with buyers about listings they own (e.g. wishlist / showcase interest).
DROP POLICY IF EXISTS "Sellers can create conversations for their listings" ON public.conversations;

CREATE POLICY "Sellers can create conversations for their listings"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = seller_id
  AND buyer_id IS NOT NULL
  AND buyer_id <> seller_id
  AND (
    (listing_type = 'sale' AND EXISTS (
      SELECT 1 FROM public.sale_listings sl
      WHERE sl.id = conversations.listing_id::uuid
      AND sl.seller_id = auth.uid()
      AND COALESCE(sl.is_deleted, false) = false
    ))
    OR (listing_type = 'stud' AND EXISTS (
      SELECT 1 FROM public.stud_listings st
      WHERE st.id = conversations.listing_id::uuid
      AND st.user_id = auth.uid()
      AND COALESCE(st.is_deleted, false) = false
    ))
    OR (listing_type = 'showcase' AND EXISTS (
      SELECT 1 FROM public.showcase_listings sh
      WHERE sh.id = conversations.listing_id::uuid
      AND sh.seller_id = auth.uid()
      AND COALESCE(sh.is_deleted, false) = false
    ))
  )
);

COMMENT ON POLICY "Sellers can create conversations for their listings" ON public.conversations IS
  'Seller can INSERT a row where they are seller_id when they own the referenced listing (sale/stud/showcase).';
