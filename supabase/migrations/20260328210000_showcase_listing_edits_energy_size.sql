-- Align showcase_listing_edits with showcase_listings (energy/size were added to main table later)
ALTER TABLE public.showcase_listing_edits
  ADD COLUMN IF NOT EXISTS energy energy_level,
  ADD COLUMN IF NOT EXISTS size size_level;
