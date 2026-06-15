-- Business Boosts Table
-- €10 per boost, appears in carousels on Puppies For Sale and Dogs For Stud pages

CREATE TABLE IF NOT EXISTS public.business_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_listings(id) ON DELETE CASCADE,
  stripe_payment_intent_id text NOT NULL,
  boost_start_time timestamp with time zone NOT NULL DEFAULT now(),
  boost_end_time timestamp with time zone, -- null means active until pushed out
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add missing columns if table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_boosts') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'business_boosts' AND column_name = 'updated_at') THEN
      ALTER TABLE public.business_boosts ADD COLUMN updated_at timestamp with time zone NOT NULL DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'business_boosts' AND column_name = 'is_active') THEN
      ALTER TABLE public.business_boosts ADD COLUMN is_active boolean NOT NULL DEFAULT true;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_business_boosts_business_id ON public.business_boosts(business_id);
CREATE INDEX IF NOT EXISTS idx_business_boosts_is_active ON public.business_boosts(is_active);
CREATE INDEX IF NOT EXISTS idx_business_boosts_start_time ON public.business_boosts(boost_start_time DESC);
CREATE INDEX IF NOT EXISTS idx_business_boosts_stripe_payment_intent_id ON public.business_boosts(stripe_payment_intent_id);

-- Enable RLS
ALTER TABLE public.business_boosts ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop if exists, then create)
DROP POLICY IF EXISTS "Business owners can view their own boosts" ON public.business_boosts;
CREATE POLICY "Business owners can view their own boosts"
  ON public.business_boosts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.business_listings
      WHERE business_listings.id = business_boosts.business_id
      AND business_listings.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all boosts" ON public.business_boosts;
CREATE POLICY "Admins can view all boosts"
  ON public.business_boosts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.is_admin = true)
    )
  );

DROP POLICY IF EXISTS "Admins can manage boosts" ON public.business_boosts;
CREATE POLICY "Admins can manage boosts"
  ON public.business_boosts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.is_admin = true)
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_business_boosts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS update_business_boosts_updated_at ON public.business_boosts;
CREATE TRIGGER update_business_boosts_updated_at
  BEFORE UPDATE ON public.business_boosts
  FOR EACH ROW
  EXECUTE FUNCTION update_business_boosts_updated_at();
