-- Resync public boost headings (fixes rows still on 20260320000002 copy: Pawfect Matches / Best in Show / etc.).
-- Standard empty = no section title. Admins can change anytime via boost_config.

UPDATE public.boost_config
SET
  gold_boost_name = 'Tonight''s Pawfect Picks',
  elite_boost_name = 'Puppy in My Pocket',
  premium_boost_name = 'Love at First Wag',
  standard_boost_name = '',
  updated_at = NOW()
WHERE EXISTS (SELECT 1 FROM public.boost_config);

INSERT INTO public.boost_config (gold_boost_name, elite_boost_name, premium_boost_name, standard_boost_name)
SELECT 'Tonight''s Pawfect Picks', 'Puppy in My Pocket', 'Love at First Wag', ''
WHERE NOT EXISTS (SELECT 1 FROM public.boost_config);
