-- Wishlist insert was rolling back: notifications RLS only allows INSERT when auth.uid() = user_id,
-- but the trigger inserts a row for the seller while the session user is the buyer.
-- Disable row security for the duration of the trigger so the definer can insert for the seller.

CREATE OR REPLACE FUNCTION public.create_listing_wishlist_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seller_uid uuid;
  listing_title text;
  listing_type_for_notif text;
  liker_display text;
BEGIN
  SET LOCAL row_security = off;

  IF NEW.item_type IS NULL OR NEW.item_type NOT IN ('listing', 'stud', 'showcase') THEN
    RETURN NEW;
  END IF;

  seller_uid := NULL;
  listing_title := NULL;
  listing_type_for_notif := NULL;

  IF NEW.item_type = 'listing' THEN
    SELECT sl.seller_id, sl.title
    INTO seller_uid, listing_title
    FROM public.sale_listings sl
    WHERE sl.id::text = NEW.item_id;

    listing_type_for_notif := 'sale';
  ELSIF NEW.item_type = 'stud' THEN
    SELECT st.user_id, st.title
    INTO seller_uid, listing_title
    FROM public.stud_listings st
    WHERE st.id::text = NEW.item_id;

    listing_type_for_notif := 'stud';
  ELSIF NEW.item_type = 'showcase' THEN
    SELECT sh.seller_id, sh.title
    INTO seller_uid, listing_title
    FROM public.showcase_listings sh
    WHERE sh.id::text = NEW.item_id;

    listing_type_for_notif := 'showcase';
  END IF;

  IF seller_uid IS NULL THEN
    RETURN NEW;
  END IF;

  IF seller_uid = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT
    COALESCE(
      NULLIF(TRIM(up.business_name), ''),
      NULLIF(TRIM(CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, ''))), ''),
      NULL
    )
  INTO liker_display
  FROM public.user_profiles up
  WHERE up.id = NEW.user_id;

  IF liker_display IS NULL OR liker_display = '' THEN
    SELECT COALESCE(email, 'Someone')
    INTO liker_display
    FROM auth.users
    WHERE id = NEW.user_id;
  END IF;

  IF liker_display IS NULL OR liker_display = '' THEN
    liker_display := 'Someone';
  END IF;

  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    read,
    listing_id,
    listing_type,
    created_at,
    updated_at
  ) VALUES (
    seller_uid,
    liker_display || ' liked your listing',
    COALESCE(liker_display, 'Someone') || ' added "' || COALESCE(NULLIF(TRIM(listing_title), ''), 'your listing') || '" to their wishlist.',
    'listing_liked',
    false,
    NEW.item_id::uuid,
    listing_type_for_notif,
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.create_listing_wishlist_notification() IS
  'Creates a notification for the listing owner when a user wishlists a sale, stud, or showcase listing. Uses SET LOCAL row_security = off so inserts are not blocked by notifications RLS.';

-- Idempotent: allow re-running migration after partial apply
DROP POLICY IF EXISTS "Sellers can view wishlists for their own listings" ON public.user_wishlists;

CREATE POLICY "Sellers can view wishlists for their own listings"
ON public.user_wishlists
FOR SELECT
TO authenticated
USING (
  (
    item_type = 'listing'
    AND EXISTS (
      SELECT 1
      FROM public.sale_listings sl
      WHERE sl.id::text = user_wishlists.item_id
        AND sl.seller_id = auth.uid()
    )
  )
  OR (
    item_type = 'stud'
    AND EXISTS (
      SELECT 1
      FROM public.stud_listings st
      WHERE st.id::text = user_wishlists.item_id
        AND st.user_id = auth.uid()
    )
  )
  OR (
    item_type = 'showcase'
    AND EXISTS (
      SELECT 1
      FROM public.showcase_listings sh
      WHERE sh.id::text = user_wishlists.item_id
        AND sh.seller_id = auth.uid()
    )
  )
);
