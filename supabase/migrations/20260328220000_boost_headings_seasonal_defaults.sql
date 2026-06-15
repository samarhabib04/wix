-- Seasonal public headings for listing boost carousels (admin-editable via boost_config).
-- Standard empty = no section heading on the new-listings row.
UPDATE public.boost_config
SET
  gold_boost_name = 'Tonight''s Pawfect Picks',
  elite_boost_name = 'Puppy in My Pocket',
  premium_boost_name = 'Love at First Wag',
  standard_boost_name = '',
  updated_at = NOW()
WHERE id = (SELECT id FROM public.boost_config LIMIT 1);
