-- Showcase listings expire when puppies are outside the 4–6 week window (28–42 calendar days inclusive),
-- based on date_of_birth — not the previous dev-only 15-minute rule on created_at.

DROP FUNCTION IF EXISTS public.is_showcase_expired(timestamp with time zone);

CREATE OR REPLACE FUNCTION public.is_showcase_expired(birth_date date)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  age_days integer;
BEGIN
  IF birth_date IS NULL THEN
    RETURN TRUE;
  END IF;
  age_days := (CURRENT_DATE - birth_date);
  RETURN age_days < 28 OR age_days > 42;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_expired_showcases()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.showcase_listings
  SET
    is_expired = TRUE,
    expiration_checked_at = now()
  WHERE
    is_expired = FALSE
    AND converted_to_sale_id IS NULL
    AND date_of_birth IS NOT NULL
    AND public.is_showcase_expired((date_of_birth)::date) = TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_expired_showcases()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.update_expired_showcases();

  UPDATE public.showcase_listings s
  SET
    is_published = FALSE,
    updated_at = now()
  WHERE
    s.is_published = TRUE
    AND s.converted_to_sale_id IS NULL
    AND s.date_of_birth IS NOT NULL
    AND public.is_showcase_expired((s.date_of_birth)::date) = TRUE;

  INSERT INTO public.notifications (user_id, title, message, listing_type, listing_id, type)
  SELECT
    s.seller_id,
    'Showcase ended'::text,
    'Your puppy showcase has ended: Showcase is only for litters between 4 and 6 weeks old. Convert to a For Sale listing to keep advertising your pups.'::text,
    'showcase'::text,
    s.id,
    'expired_showcase'::text
  FROM public.showcase_listings s
  WHERE
    s.converted_to_sale_id IS NULL
    AND s.date_of_birth IS NOT NULL
    AND public.is_showcase_expired((s.date_of_birth)::date) = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.listing_id = s.id AND n.type = 'expired_showcase'
    );
END;
$$;

-- Undo false expirations from the old 15-minute rule when the litter is still in the 4–6 week window
UPDATE public.showcase_listings
SET is_expired = FALSE
WHERE converted_to_sale_id IS NULL
  AND date_of_birth IS NOT NULL
  AND public.is_showcase_expired((date_of_birth)::date) = FALSE;

-- Run daily ~02:05 UTC (was every minute for testing)
DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'process-expired-showcases-daily' LIMIT 1;
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END;
$$;

SELECT cron.schedule(
  'process-expired-showcases-daily',
  '5 2 * * *',
  $$ SELECT public.process_expired_showcases(); $$
);
