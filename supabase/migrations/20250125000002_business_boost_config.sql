-- Create business_boost_config table to store admin-configurable business boost settings
-- Similar to marketplace_boost_config but for business listing boosts

CREATE TABLE IF NOT EXISTS public.business_boost_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boost_name TEXT NOT NULL DEFAULT 'Business Boost',
  boost_amount INTEGER NOT NULL DEFAULT 1000, -- €10 in cents
  currency TEXT NOT NULL DEFAULT 'EUR',
  max_active_boosts INTEGER NOT NULL DEFAULT 40,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default config if it doesn't exist
INSERT INTO public.business_boost_config (
  boost_name,
  boost_amount,
  currency,
  max_active_boosts
)
SELECT 
  'Business Boost',
  1000,
  'EUR',
  40
WHERE NOT EXISTS (SELECT 1 FROM public.business_boost_config);

-- Enable RLS
ALTER TABLE public.business_boost_config ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read business boost config
DROP POLICY IF EXISTS "Anyone can read business boost config" ON public.business_boost_config;
CREATE POLICY "Anyone can read business boost config"
ON public.business_boost_config
FOR SELECT
USING (true);

-- Policy: Only admins can update business boost config
DROP POLICY IF EXISTS "Only admins can update business boost config" ON public.business_boost_config;
CREATE POLICY "Only admins can update business boost config"
ON public.business_boost_config
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND (user_profiles.role = 'admin' OR user_profiles.is_admin = true)
  )
);

-- Policy: Only admins can insert business boost config
DROP POLICY IF EXISTS "Only admins can insert business boost config" ON public.business_boost_config;
CREATE POLICY "Only admins can insert business boost config"
ON public.business_boost_config
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND (user_profiles.role = 'admin' OR user_profiles.is_admin = true)
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_business_boost_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS business_boost_config_updated_at ON public.business_boost_config;
CREATE TRIGGER business_boost_config_updated_at
BEFORE UPDATE ON public.business_boost_config
FOR EACH ROW
EXECUTE FUNCTION update_business_boost_config_updated_at();
