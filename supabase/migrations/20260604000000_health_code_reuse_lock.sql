-- Lock V1 / V2 / H1 codes once used on an approved live listing (one ad per code).

CREATE TABLE IF NOT EXISTS public.health_code_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  code_type text NOT NULL CHECK (code_type IN ('H1', 'V1', 'V2')),
  listing_id uuid NOT NULL,
  listing_type text NOT NULL CHECK (listing_type IN ('sale', 'stud')),
  locked_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT health_code_usages_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_health_code_usages_listing
  ON public.health_code_usages (listing_id, listing_type);

CREATE INDEX IF NOT EXISTS idx_health_code_usages_code_type
  ON public.health_code_usages (code_type);

COMMENT ON TABLE public.health_code_usages IS
  'Tracks health codes locked to a live listing after admin approval. Each code may only be used once.';

ALTER TABLE public.health_code_usages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view health code usages" ON public.health_code_usages;
CREATE POLICY "Admins can view health code usages"
  ON public.health_code_usages FOR SELECT
  TO authenticated
  USING (public.is_current_user_admin());

-- ---------------------------------------------------------------------------
-- Extract codes from a listing row (sale puppy_details or stud certs)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.extract_listing_health_codes(
  p_listing_id uuid,
  p_listing_type text
)
RETURNS TABLE(code text, code_type text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_listing_type = 'sale' THEN
    RETURN QUERY
    SELECT DISTINCT UPPER(TRIM(elem->>'v1Code')), 'V1'
    FROM public.sale_listings s
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.puppy_details, '[]'::jsonb)) AS elem
    WHERE s.id = p_listing_id
      AND NULLIF(TRIM(elem->>'v1Code'), '') IS NOT NULL
    UNION
    SELECT DISTINCT UPPER(TRIM(elem->>'v2Code')), 'V2'
    FROM public.sale_listings s
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.puppy_details, '[]'::jsonb)) AS elem
    WHERE s.id = p_listing_id
      AND NULLIF(TRIM(elem->>'v2Code'), '') IS NOT NULL
    UNION
    SELECT DISTINCT UPPER(TRIM(elem->>'h1Code')), 'H1'
    FROM public.sale_listings s
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.puppy_details, '[]'::jsonb)) AS elem
    WHERE s.id = p_listing_id
      AND NULLIF(TRIM(elem->>'h1Code'), '') IS NOT NULL;
  ELSIF p_listing_type = 'stud' THEN
    RETURN QUERY
    SELECT UPPER(TRIM(st.v1_cert)), 'V1'
    FROM public.stud_listings st
    WHERE st.id = p_listing_id AND NULLIF(TRIM(st.v1_cert), '') IS NOT NULL
    UNION
    SELECT UPPER(TRIM(st.v2_cert)), 'V2'
    FROM public.stud_listings st
    WHERE st.id = p_listing_id AND NULLIF(TRIM(st.v2_cert), '') IS NOT NULL
    UNION
    SELECT UPPER(TRIM(st.h1_cert)), 'H1'
    FROM public.stud_listings st
    WHERE st.id = p_listing_id AND NULLIF(TRIM(st.h1_cert), '') IS NOT NULL;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Availability check (for seller forms + admin)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_health_code_available(
  p_code text,
  p_code_type text,
  p_exclude_listing_id uuid DEFAULT NULL,
  p_exclude_listing_type text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text := UPPER(TRIM(p_code));
  v_existing record;
BEGIN
  IF v_code IS NULL OR v_code = '' THEN
    RETURN true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.health_codes hc
    WHERE hc.code = v_code
      AND hc.code_type = p_code_type
      AND hc.is_active = true
  ) THEN
    RETURN false;
  END IF;

  SELECT u.listing_id, u.listing_type
  INTO v_existing
  FROM public.health_code_usages u
  WHERE u.code = v_code;

  IF NOT FOUND THEN
    RETURN true;
  END IF;

  IF p_exclude_listing_id IS NOT NULL
     AND v_existing.listing_id = p_exclude_listing_id
     AND v_existing.listing_type = p_exclude_listing_type THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_health_code_available(text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_health_code_available(text, text, uuid, text) TO anon;

-- ---------------------------------------------------------------------------
-- Sync locks when listing goes live; release when deleted
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.release_health_code_locks_for_listing(
  p_listing_id uuid,
  p_listing_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.health_code_usages
  WHERE listing_id = p_listing_id
    AND listing_type = p_listing_type;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_health_code_locks_for_listing(
  p_listing_id uuid,
  p_listing_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_owner record;
BEGIN
  -- Drop locks for codes no longer on this listing
  DELETE FROM public.health_code_usages u
  WHERE u.listing_id = p_listing_id
    AND u.listing_type = p_listing_type
    AND NOT EXISTS (
      SELECT 1
      FROM public.extract_listing_health_codes(p_listing_id, p_listing_type) c
      WHERE c.code = u.code
    );

  FOR v_row IN
    SELECT c.code, c.code_type
    FROM public.extract_listing_health_codes(p_listing_id, p_listing_type) c
    INNER JOIN public.health_codes hc
      ON hc.code = c.code
      AND hc.code_type = c.code_type
      AND hc.is_active = true
  LOOP
    SELECT listing_id, listing_type INTO v_owner
    FROM public.health_code_usages
    WHERE code = v_row.code;

    IF FOUND THEN
      IF v_owner.listing_id = p_listing_id AND v_owner.listing_type = p_listing_type THEN
        UPDATE public.health_code_usages
        SET code_type = v_row.code_type, locked_at = NOW()
        WHERE code = v_row.code;
      ELSE
        RAISE EXCEPTION 'Health code % is already used on another listing', v_row.code
          USING ERRCODE = 'unique_violation';
      END IF;
    ELSE
      INSERT INTO public.health_code_usages (code, code_type, listing_id, listing_type)
      VALUES (v_row.code, v_row.code_type, p_listing_id, p_listing_type);
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_listing_health_code_locks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_type text;
BEGIN
  IF TG_TABLE_NAME = 'sale_listings' THEN
    v_listing_type := 'sale';
  ELSIF TG_TABLE_NAME = 'stud_listings' THEN
    v_listing_type := 'stud';
  ELSE
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.is_deleted, false) = true AND COALESCE(OLD.is_deleted, false) = false THEN
    PERFORM public.release_health_code_locks_for_listing(NEW.id, v_listing_type);
    RETURN NEW;
  END IF;

  IF NEW.admin_approved = true
     AND NEW.is_published = true
     AND COALESCE(NEW.is_deleted, false) = false THEN
    PERFORM public.sync_health_code_locks_for_listing(NEW.id, v_listing_type);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sale_listings_health_code_locks_trigger ON public.sale_listings;
CREATE TRIGGER sale_listings_health_code_locks_trigger
  AFTER INSERT OR UPDATE OF admin_approved, is_published, is_deleted, puppy_details
  ON public.sale_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_listing_health_code_locks();

DROP TRIGGER IF EXISTS stud_listings_health_code_locks_trigger ON public.stud_listings;
CREATE TRIGGER stud_listings_health_code_locks_trigger
  AFTER INSERT OR UPDATE OF admin_approved, is_published, is_deleted, v1_cert, v2_cert, h1_cert
  ON public.stud_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_listing_health_code_locks();

-- Backfill locks for existing approved live listings
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id FROM public.sale_listings
    WHERE admin_approved = true
      AND is_published = true
      AND COALESCE(is_deleted, false) = false
  LOOP
    BEGIN
      PERFORM public.sync_health_code_locks_for_listing(r.id, 'sale');
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not lock sale listing %: %', r.id, SQLERRM;
    END;
  END LOOP;

  FOR r IN
    SELECT id FROM public.stud_listings
    WHERE admin_approved = true
      AND is_published = true
      AND COALESCE(is_deleted, false) = false
  LOOP
    BEGIN
      PERFORM public.sync_health_code_locks_for_listing(r.id, 'stud');
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not lock stud listing %: %', r.id, SQLERRM;
    END;
  END LOOP;
END;
$$;
