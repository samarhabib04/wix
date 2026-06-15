-- Ad Editing: Prevent created_at and expires_at from being modified on listing updates
-- Ensures edited ads keep their original lifecycle (don't reappear as "new", don't restart duration)

-- sale_listings: preserve created_at and expires_at on UPDATE
CREATE OR REPLACE FUNCTION protect_sale_listing_lifecycle()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = OLD.created_at;
  NEW.expires_at = OLD.expires_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_sale_listing_lifecycle_trigger ON public.sale_listings;
CREATE TRIGGER protect_sale_listing_lifecycle_trigger
  BEFORE UPDATE ON public.sale_listings
  FOR EACH ROW
  EXECUTE FUNCTION protect_sale_listing_lifecycle();

-- stud_listings: preserve created_at on UPDATE (stud may not have expires_at)
CREATE OR REPLACE FUNCTION protect_stud_listing_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = OLD.created_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_stud_listing_created_at_trigger ON public.stud_listings;
CREATE TRIGGER protect_stud_listing_created_at_trigger
  BEFORE UPDATE ON public.stud_listings
  FOR EACH ROW
  EXECUTE FUNCTION protect_stud_listing_created_at();

-- showcase_listings: preserve created_at on UPDATE
CREATE OR REPLACE FUNCTION protect_showcase_listing_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = OLD.created_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_showcase_listing_created_at_trigger ON public.showcase_listings;
CREATE TRIGGER protect_showcase_listing_created_at_trigger
  BEFORE UPDATE ON public.showcase_listings
  FOR EACH ROW
  EXECUTE FUNCTION protect_showcase_listing_created_at();
