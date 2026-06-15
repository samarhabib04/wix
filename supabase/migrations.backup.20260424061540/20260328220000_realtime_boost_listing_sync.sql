-- Realtime for cross-device boost UI sync (see hooks/useBoostRealtimeSync.ts).
-- REPLICA IDENTITY FULL so UPDATE payloads include current_boost_id in `old` for filtering.
-- ADD TABLE is wrapped so re-apply / already-enabled projects do not fail.

ALTER TABLE public.boosts REPLICA IDENTITY FULL;
ALTER TABLE public.sale_listings REPLICA IDENTITY FULL;
ALTER TABLE public.stud_listings REPLICA IDENTITY FULL;
ALTER TABLE public.showcase_listings REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.boosts;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.sale_listings;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.stud_listings;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.showcase_listings;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Business / marketplace product boost carousels (hooks invalidate these query keys).
ALTER TABLE public.business_boosts REPLICA IDENTITY FULL;
ALTER TABLE public.marketplace_product_boosts REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.business_boosts;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_product_boosts;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
