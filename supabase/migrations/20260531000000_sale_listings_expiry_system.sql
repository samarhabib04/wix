-- For Sale listings: auto-expire after 4 weeks (28 days) from go-live.
-- Mirrors showcase expiry (process_expired_showcases + pg_cron).
-- Dashboard notifications via SQL; emails via process-sale-listing-expiry edge function.

-- ---------------------------------------------------------------------------
-- Lifecycle trigger: set expires_at on go-live / renewal; lock on content edits
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.manage_sale_listing_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.created_at := OLD.created_at;

    IF NEW.is_published = TRUE
       AND NEW.admin_approved = TRUE
       AND NEW.status IN ('active', 'approved')
       AND (
         OLD.is_published IS DISTINCT FROM TRUE
         OR OLD.admin_approved IS DISTINCT FROM TRUE
         OR OLD.status IN (
           'expired',
           'pending_re_approval',
           'pending_review',
           'pending',
           'pending_approval',
           'rejected',
           'inactive'
         )
       )
    THEN
      NEW.expires_at := NOW() + INTERVAL '28 days';
      NEW.can_renew := FALSE;
    ELSIF NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
      NEW.expires_at := OLD.expires_at;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_sale_listing_lifecycle_trigger ON public.sale_listings;
DROP TRIGGER IF EXISTS manage_sale_listing_lifecycle_trigger ON public.sale_listings;
CREATE TRIGGER manage_sale_listing_lifecycle_trigger
  BEFORE UPDATE ON public.sale_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.manage_sale_listing_lifecycle();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_sale_listing_expired(p_expires_at TIMESTAMPTZ)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF p_expires_at IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN p_expires_at <= NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.sale_listing_is_live(p_row public.sale_listings)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN COALESCE(p_row.is_deleted, FALSE) = FALSE
    AND COALESCE(p_row.is_paused, FALSE) = FALSE
    AND COALESCE(p_row.admin_approved, FALSE) = TRUE
    AND COALESCE(p_row.is_published, FALSE) = TRUE
    AND p_row.status IN ('active', 'approved')
    AND public.is_sale_listing_expired(p_row.expires_at) = FALSE;
END;
$$;

-- ---------------------------------------------------------------------------
-- Reminders: 7 days and 1 day before expiry (dashboard notifications)
-- Returns rows that received a new reminder (for email edge function).
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Expire overdue listings: unpublish + notify seller
-- Returns rows expired in this run (for email edge function).
-- ---------------------------------------------------------------------------
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

CREATE OR REPLACE FUNCTION public.process_all_sale_listing_expiry()
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
  RETURN QUERY SELECT * FROM public.process_expired_sale_listings();
  RETURN QUERY SELECT * FROM public.process_sale_listing_expiry_reminders();
END;
$$;

-- ---------------------------------------------------------------------------
-- Backfill: cap incorrect 60-day values; derive expiry for live ads missing it
-- ---------------------------------------------------------------------------
UPDATE public.sale_listings
SET expires_at = created_at + INTERVAL '28 days'
WHERE expires_at IS NULL
  AND COALESCE(is_deleted, FALSE) = FALSE
  AND COALESCE(admin_approved, FALSE) = TRUE
  AND COALESCE(is_published, FALSE) = TRUE
  AND status IN ('active', 'approved');

UPDATE public.sale_listings
SET expires_at = created_at + INTERVAL '28 days'
WHERE expires_at IS NOT NULL
  AND expires_at > created_at + INTERVAL '28 days'
  AND status IN ('active', 'approved', 'expired', 'pending_re_approval', 'inactive');

-- ---------------------------------------------------------------------------
-- Daily cron (~02:10 UTC, after showcase expiry at 02:05)
-- Schedule the edge function separately for emails, or invoke it manually.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  jid BIGINT;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'process-sale-listing-expiry-daily' LIMIT 1;
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END;
$$;

SELECT cron.schedule(
  'process-sale-listing-expiry-daily',
  '10 2 * * *',
  $$ SELECT public.process_all_sale_listing_expiry(); $$
);

COMMENT ON FUNCTION public.process_expired_sale_listings IS
  'Unpublish For Sale listings past expires_at (28 days from go-live). Sets status=expired and can_renew=true.';
