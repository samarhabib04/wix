-- notifications.listing_id is uuid; user_wishlists.item_id is text — cast on insert.

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
