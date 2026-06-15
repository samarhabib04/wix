-- Update boost_config to use buyer-friendly names (replaces internal tier names)
-- Admins can still customize these via the admin dashboard
UPDATE public.boost_config
SET
  gold_boost_name = 'Pawfect Matches',
  elite_boost_name = 'Best in Show',
  premium_boost_name = 'Home at First Wag',
  standard_boost_name = 'New Arrivals',
  updated_at = NOW()
WHERE id = (SELECT id FROM public.boost_config LIMIT 1);
