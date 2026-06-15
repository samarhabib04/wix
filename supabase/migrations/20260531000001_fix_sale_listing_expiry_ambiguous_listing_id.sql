-- Fix: RETURNS TABLE(listing_id ...) shadows RETURNING listing_id in PL/pgSQL.

CREATE OR REPLACE FUNCTION public.process_sale_listing_expiry_reminders()
RETURNS TABLE(
  listing_id UUID,
  seller_id UUID,
  listing_title TEXT,
  action TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reminder_days INTEGER;
  reminder_type TEXT;
  reminder_title TEXT;
  reminder_message TEXT;
BEGIN
  FOREACH reminder_days IN ARRAY ARRAY[7, 1]
  LOOP
    IF reminder_days = 7 THEN
      reminder_type := 'sale_expiry_reminder_7d';
      reminder_title := 'Listing expiring soon';
      reminder_message := 'Your For Sale listing expires in 7 days. Renew from your dashboard to keep it live.';
    ELSE
      reminder_type := 'sale_expiry_reminder_1d';
      reminder_title := 'Listing expiring tomorrow';
      reminder_message := 'Your For Sale listing expires in 1 day. Renew from your dashboard to keep it live.';
    END IF;

    RETURN QUERY
    WITH candidates AS (
      SELECT s.id, s.seller_id, s.title, s.expires_at
      FROM public.sale_listings s
      WHERE public.sale_listing_is_live(s)
        AND s.expires_at IS NOT NULL
        AND s.expires_at > NOW()
        AND (s.expires_at::DATE - CURRENT_DATE) = reminder_days
        AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = s.seller_id)
        AND NOT EXISTS (
          SELECT 1 FROM public.notifications n
          WHERE n.listing_id = s.id AND n.type = reminder_type
        )
    ),
    inserted AS (
      INSERT INTO public.notifications (user_id, title, message, listing_type, listing_id, type)
      SELECT
        c.seller_id,
        reminder_title,
        reminder_message || ' Listing: "' || c.title || '".',
        'sale'::TEXT,
        c.id,
        reminder_type
      FROM candidates c
      RETURNING public.notifications.listing_id AS nid
    )
    SELECT
      c.id,
      c.seller_id,
      c.title,
      CASE WHEN reminder_days = 7 THEN 'reminder_7d' ELSE 'reminder_1d' END,
      c.expires_at
    FROM candidates c
    WHERE c.id IN (SELECT i.nid FROM inserted i);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_expired_sale_listings()
RETURNS TABLE(
  listing_id UUID,
  seller_id UUID,
  listing_title TEXT,
  action TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH expired AS (
    UPDATE public.sale_listings s
    SET
      is_published = FALSE,
      status = 'expired',
      can_renew = TRUE,
      updated_at = NOW()
    WHERE COALESCE(s.is_deleted, FALSE) = FALSE
      AND COALESCE(s.is_paused, FALSE) = FALSE
      AND COALESCE(s.admin_approved, FALSE) = TRUE
      AND COALESCE(s.is_published, FALSE) = TRUE
      AND s.status IN ('active', 'approved')
      AND s.expires_at IS NOT NULL
      AND public.is_sale_listing_expired(s.expires_at) = TRUE
    RETURNING s.id, s.seller_id, s.title, s.expires_at
  ),
  inserted AS (
    INSERT INTO public.notifications (user_id, title, message, listing_type, listing_id, type)
    SELECT
      e.seller_id,
      'For Sale listing expired'::TEXT,
      'Your For Sale listing "' || e.title || '" has expired after 4 weeks. Renew from your dashboard to request admin re-approval.'::TEXT,
      'sale'::TEXT,
      e.id,
      'expired_sale'::TEXT
    FROM expired e
    WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id = e.seller_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.listing_id = e.id AND n.type = 'expired_sale'
      )
    RETURNING public.notifications.listing_id AS nid
  )
  SELECT
    e.id,
    e.seller_id,
    e.title,
    'expired'::TEXT,
    e.expires_at
  FROM expired e
  WHERE e.id IN (SELECT i.nid FROM inserted i);
END;
$$;
