-- V1 green tick expires after 28 days when V2 has not been uploaded.
-- Dashboard notifications via SQL cron; emails via process-v1-code-expiry edge function.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sale_listing_has_v1_only(p_puppy_details JSONB)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(p_puppy_details, '[]'::jsonb) <> 'null'::jsonb
    AND jsonb_typeof(COALESCE(p_puppy_details, '[]'::jsonb)) = 'array'
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(p_puppy_details, '[]'::jsonb)) AS elem
      WHERE NULLIF(TRIM(COALESCE(elem->>'v1Code', elem->>'v1_code', '')), '') IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(p_puppy_details, '[]'::jsonb)) AS elem
      WHERE NULLIF(TRIM(COALESCE(elem->>'v2Code', elem->>'v2_code', '')), '') IS NOT NULL
    );
$$;

CREATE OR REPLACE FUNCTION public.stud_listing_has_v1_only(p_v1_cert TEXT, p_v2_cert TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT
    NULLIF(TRIM(COALESCE(p_v1_cert, '')), '') IS NOT NULL
    AND NULLIF(TRIM(COALESCE(p_v2_cert, '')), '') IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.v1_green_tick_anchor(
  p_verification_date TIMESTAMPTZ,
  p_created_at TIMESTAMPTZ
)
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(p_verification_date, p_created_at);
$$;

CREATE OR REPLACE FUNCTION public.v1_green_tick_expires_at(
  p_verification_date TIMESTAMPTZ,
  p_created_at TIMESTAMPTZ
)
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
AS $$
  SELECT public.v1_green_tick_anchor(p_verification_date, p_created_at) + INTERVAL '28 days';
$$;

CREATE OR REPLACE FUNCTION public.is_v1_green_tick_past_expiry(
  p_verification_date TIMESTAMPTZ,
  p_created_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT
    public.v1_green_tick_anchor(p_verification_date, p_created_at) IS NOT NULL
    AND public.v1_green_tick_expires_at(p_verification_date, p_created_at) <= NOW();
$$;

-- ---------------------------------------------------------------------------
-- Reminders (7 days + 1 day before V1 expiry)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_v1_code_expiry_reminders()
RETURNS TABLE(
  listing_id UUID,
  seller_id UUID,
  listing_title TEXT,
  listing_type TEXT,
  action TEXT,
  v1_expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  reminder_days INTEGER;
  reminder_type TEXT;
  reminder_title TEXT;
  reminder_message TEXT;
BEGIN
  FOREACH reminder_days IN ARRAY ARRAY[7, 1]
  LOOP
    IF reminder_days = 7 THEN
      reminder_type := 'v1_expiry_reminder_7d';
      reminder_title := 'V1 vaccination expiring soon';
      reminder_message := 'Your green tick (V1 only) expires in 7 days unless you add a V2 code.';
    ELSE
      reminder_type := 'v1_expiry_reminder_1d';
      reminder_title := 'V1 vaccination expiring tomorrow';
      reminder_message := 'Your green tick (V1 only) expires tomorrow unless you add a V2 code.';
    END IF;

    RETURN QUERY
    WITH sale_candidates AS (
      SELECT
        s.id,
        s.seller_id,
        s.title,
        'sale'::TEXT AS listing_type,
        public.v1_green_tick_expires_at(s.verification_date, s.created_at) AS expires_at
      FROM public.sale_listings s
      WHERE COALESCE(s.is_deleted, FALSE) = FALSE
        AND s.green_tick = TRUE
        AND public.sale_listing_has_v1_only(s.puppy_details)
        AND public.v1_green_tick_anchor(s.verification_date, s.created_at) IS NOT NULL
        AND public.v1_green_tick_expires_at(s.verification_date, s.created_at) > NOW()
        AND (
          public.v1_green_tick_expires_at(s.verification_date, s.created_at)::DATE - CURRENT_DATE
        ) = reminder_days
        AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = s.seller_id)
        AND NOT EXISTS (
          SELECT 1 FROM public.notifications n
          WHERE n.listing_id = s.id AND n.type = reminder_type
        )
    ),
    stud_candidates AS (
      SELECT
        st.id,
        st.user_id AS seller_id,
        st.title,
        'stud'::TEXT AS listing_type,
        public.v1_green_tick_expires_at(st.verification_date, st.created_at) AS expires_at
      FROM public.stud_listings st
      WHERE COALESCE(st.is_deleted, FALSE) = FALSE
        AND st.green_tick = TRUE
        AND public.stud_listing_has_v1_only(st.v1_cert, st.v2_cert)
        AND public.v1_green_tick_anchor(st.verification_date, st.created_at) IS NOT NULL
        AND public.v1_green_tick_expires_at(st.verification_date, st.created_at) > NOW()
        AND (
          public.v1_green_tick_expires_at(st.verification_date, st.created_at)::DATE - CURRENT_DATE
        ) = reminder_days
        AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = st.user_id)
        AND NOT EXISTS (
          SELECT 1 FROM public.notifications n
          WHERE n.listing_id = st.id AND n.type = reminder_type
        )
    ),
    candidates AS (
      SELECT * FROM sale_candidates
      UNION ALL
      SELECT * FROM stud_candidates
    ),
    inserted AS (
      INSERT INTO public.notifications (user_id, title, message, listing_type, listing_id, type)
      SELECT
        c.seller_id,
        reminder_title,
        reminder_message || ' Listing: "' || c.title || '". Add V2 in your listing edit, then contact support if the green tick does not return after review.',
        c.listing_type,
        c.id,
        reminder_type
      FROM candidates c
      RETURNING public.notifications.listing_id AS nid, public.notifications.type AS ntype
    )
    SELECT
      c.id,
      c.seller_id,
      c.title,
      c.listing_type,
      CASE WHEN reminder_days = 7 THEN 'reminder_7d' ELSE 'reminder_1d' END,
      c.expires_at
    FROM candidates c
    INNER JOIN inserted i ON i.nid = c.id AND i.ntype = reminder_type;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- Expire V1-only green ticks
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_expired_v1_green_ticks()
RETURNS TABLE(
  listing_id UUID,
  seller_id UUID,
  listing_title TEXT,
  listing_type TEXT,
  action TEXT,
  v1_expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  WITH sale_targets AS (
    SELECT
      s.id,
      s.seller_id,
      s.title,
      public.v1_green_tick_expires_at(s.verification_date, s.created_at) AS expires_at
    FROM public.sale_listings s
    WHERE COALESCE(s.is_deleted, FALSE) = FALSE
      AND s.green_tick = TRUE
      AND public.sale_listing_has_v1_only(s.puppy_details)
      AND public.is_v1_green_tick_past_expiry(s.verification_date, s.created_at)
  ),
  sale_expired AS (
    UPDATE public.sale_listings s
    SET
      green_tick = FALSE,
      verification_date = NULL,
      updated_at = NOW()
    FROM sale_targets t
    WHERE s.id = t.id
    RETURNING s.id, t.seller_id, t.title, t.expires_at
  ),
  stud_targets AS (
    SELECT
      st.id,
      st.user_id AS seller_id,
      st.title,
      public.v1_green_tick_expires_at(st.verification_date, st.created_at) AS expires_at
    FROM public.stud_listings st
    WHERE COALESCE(st.is_deleted, FALSE) = FALSE
      AND st.green_tick = TRUE
      AND public.stud_listing_has_v1_only(st.v1_cert, st.v2_cert)
      AND public.is_v1_green_tick_past_expiry(st.verification_date, st.created_at)
  ),
  stud_expired AS (
    UPDATE public.stud_listings st
    SET
      green_tick = FALSE,
      verification_date = NULL,
      updated_at = NOW()
    FROM stud_targets t
    WHERE st.id = t.id
    RETURNING st.id, t.seller_id, t.title, t.expires_at
  ),
  expired AS (
    SELECT id, seller_id, title, 'sale'::TEXT AS listing_type, expires_at FROM sale_expired
    UNION ALL
    SELECT id, seller_id, title, 'stud'::TEXT AS listing_type, expires_at FROM stud_expired
  ),
  inserted AS (
    INSERT INTO public.notifications (user_id, title, message, listing_type, listing_id, type)
    SELECT
      e.seller_id,
      'Green tick removed (V1 expired)'::TEXT,
      'The green tick on "' || e.title || '" was removed because V2 was not added within 28 days of V1. Add V2 and request admin review to restore verification.'::TEXT,
      e.listing_type,
      e.id,
      'v1_green_tick_expired'::TEXT
    FROM expired e
    WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id = e.seller_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.listing_id = e.id AND n.type = 'v1_green_tick_expired'
      )
    RETURNING public.notifications.listing_id AS nid
  )
  SELECT
    e.id,
    e.seller_id,
    e.title,
    e.listing_type,
    'expired'::TEXT,
    e.expires_at
  FROM expired e
  WHERE e.id IN (SELECT i.nid FROM inserted i);
END;
$$;

CREATE OR REPLACE FUNCTION public.process_all_v1_code_expiry()
RETURNS TABLE(
  listing_id UUID,
  seller_id UUID,
  listing_title TEXT,
  listing_type TEXT,
  action TEXT,
  v1_expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.process_expired_v1_green_ticks();
  RETURN QUERY SELECT * FROM public.process_v1_code_expiry_reminders();
END;
$$;

-- ---------------------------------------------------------------------------
-- Daily cron (~02:20 UTC, after sale listing expiry)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  jid BIGINT;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'process-v1-code-expiry-daily' LIMIT 1;
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END;
$$;

SELECT cron.schedule(
  'process-v1-code-expiry-daily',
  '20 2 * * *',
  $$ SELECT public.process_all_v1_code_expiry(); $$
);

COMMENT ON FUNCTION public.process_expired_v1_green_ticks IS
  'Removes green_tick from V1-only sale/stud listings 28 days after verification_date when V2 was not added.';
