-- Business Promotions Table
-- Maximum one active promotion per business, 30-day duration

CREATE TABLE IF NOT EXISTS public.business_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_listings(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  banner_image_url text,
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone NOT NULL, -- 30 days from start
  is_active boolean NOT NULL DEFAULT false,
  admin_approved boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add missing columns if table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_promotions') THEN
    -- Add admin_approved column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'business_promotions' AND column_name = 'admin_approved') THEN
      ALTER TABLE public.business_promotions ADD COLUMN admin_approved boolean NOT NULL DEFAULT false;
    END IF;
    -- Add other columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'business_promotions' AND column_name = 'is_active') THEN
      ALTER TABLE public.business_promotions ADD COLUMN is_active boolean NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'business_promotions' AND column_name = 'updated_at') THEN
      ALTER TABLE public.business_promotions ADD COLUMN updated_at timestamp with time zone NOT NULL DEFAULT now();
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_business_promotions_business_id ON public.business_promotions(business_id);
CREATE INDEX IF NOT EXISTS idx_business_promotions_is_active ON public.business_promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_business_promotions_admin_approved ON public.business_promotions(admin_approved);
CREATE INDEX IF NOT EXISTS idx_business_promotions_dates ON public.business_promotions(start_date, end_date);

-- Enable RLS
ALTER TABLE public.business_promotions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop if exists, then create)
DROP POLICY IF EXISTS "Business owners can manage their own promotions" ON public.business_promotions;
CREATE POLICY "Business owners can manage their own promotions"
  ON public.business_promotions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_listings
      WHERE business_listings.id = business_promotions.business_id
      AND business_listings.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all promotions" ON public.business_promotions;
CREATE POLICY "Admins can view all promotions"
  ON public.business_promotions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.is_admin = true)
    )
  );

DROP POLICY IF EXISTS "Admins can approve promotions" ON public.business_promotions;
CREATE POLICY "Admins can approve promotions"
  ON public.business_promotions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.is_admin = true)
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_business_promotions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop triggers if they exist, then create them
DROP TRIGGER IF EXISTS update_business_promotions_updated_at ON public.business_promotions;
CREATE TRIGGER update_business_promotions_updated_at
  BEFORE UPDATE ON public.business_promotions
  FOR EACH ROW
  EXECUTE FUNCTION update_business_promotions_updated_at();

-- Function to ensure only one active promotion per business
CREATE OR REPLACE FUNCTION ensure_single_active_promotion()
RETURNS TRIGGER AS $$
BEGIN
  -- If this promotion is being set to active, deactivate all others for this business
  IF NEW.is_active = true AND (OLD.is_active IS NULL OR OLD.is_active = false) THEN
    UPDATE public.business_promotions
    SET is_active = false
    WHERE business_id = NEW.business_id
    AND id != NEW.id
    AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_single_active_promotion_trigger ON public.business_promotions;
CREATE TRIGGER ensure_single_active_promotion_trigger
  BEFORE INSERT OR UPDATE ON public.business_promotions
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_active_promotion();
