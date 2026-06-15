-- Allow buyers to INSERT listing_liked notifications for sellers (wishlist trigger).
-- Uses a helper function so column names like user_id are not ambiguous with joined tables.

DROP POLICY IF EXISTS "Buyers can insert listing_liked notifications for sellers" ON public.notifications;
DROP FUNCTION IF EXISTS public.check_listing_liked_notification_allowed(text, uuid, uuid);
DROP FUNCTION IF EXISTS public.check_listing_liked_notification_allowed(text, uuid, text);

CREATE OR REPLACE FUNCTION public.check_listing_liked_notification_allowed(
  p_type text,
  p_seller_user_id uuid,
  p_listing_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT p_type = 'listing_liked'
    AND p_seller_user_id IS NOT NULL
    AND p_listing_id IS NOT NULL
    AND btrim(p_listing_id) <> ''
    AND auth.uid() IS NOT NULL
    AND auth.uid() IS DISTINCT FROM p_seller_user_id
    AND (
      EXISTS (
        SELECT 1
        FROM public.user_wishlists uw
        INNER JOIN public.sale_listings sl ON sl.id::text = uw.item_id
        WHERE uw.user_id = auth.uid()
          AND uw.item_type = 'listing'
          AND uw.item_id = p_listing_id
          AND sl.seller_id = p_seller_user_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_wishlists uw
        INNER JOIN public.stud_listings st ON st.id::text = uw.item_id
        WHERE uw.user_id = auth.uid()
          AND uw.item_type = 'stud'
          AND uw.item_id = p_listing_id
          AND st.user_id = p_seller_user_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_wishlists uw
        INNER JOIN public.showcase_listings sh ON sh.id::text = uw.item_id
        WHERE uw.user_id = auth.uid()
          AND uw.item_type = 'showcase'
          AND uw.item_id = p_listing_id
          AND sh.seller_id = p_seller_user_id
      )
    );
$$;

COMMENT ON FUNCTION public.check_listing_liked_notification_allowed(text, uuid, text) IS
  'RLS helper: buyer may insert a listing_liked notification row for p_seller_user_id when wishlist + ownership match.';

REVOKE ALL ON FUNCTION public.check_listing_liked_notification_allowed(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_listing_liked_notification_allowed(text, uuid, text) TO authenticated;

CREATE POLICY "Buyers can insert listing_liked notifications for sellers"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  public.check_listing_liked_notification_allowed(
    type,
    user_id,
    listing_id::text
  )
);

COMMENT ON POLICY "Buyers can insert listing_liked notifications for sellers" ON public.notifications IS
  'Lets the wishlist trigger insert a notification for the seller (session = buyer).';
