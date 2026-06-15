-- Create marketplace_boost_config table to store admin-configurable marketplace boost settings
-- Separate from boost_config which is for listing boosts

CREATE TABLE IF NOT EXISTS public.marketplace_boost_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  boost_name TEXT NOT NULL DEFAULT 'Marketplace Boost',
  boost_amount INTEGER NOT NULL DEFAULT 1000, -- €10 in cents
  currency TEXT NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default configuration (only if table is empty)
INSERT INTO public.marketplace_boost_config (
  boost_name,
  boost_amount,
  currency
)
SELECT 
  'Marketplace Boost',
  1000,
  'EUR'
WHERE NOT EXISTS (SELECT 1 FROM public.marketplace_boost_config);

-- Enable RLS
ALTER TABLE public.marketplace_boost_config ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read marketplace boost config
CREATE POLICY "Anyone can read marketplace boost config"
ON public.marketplace_boost_config
FOR SELECT
USING (true);

-- Policy: Only admins can update marketplace boost config
CREATE POLICY "Only admins can update marketplace boost config"
ON public.marketplace_boost_config
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Policy: Only admins can insert marketplace boost config
CREATE POLICY "Only admins can insert marketplace boost config"
ON public.marketplace_boost_config
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_marketplace_boost_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS marketplace_boost_config_updated_at ON public.marketplace_boost_config;
CREATE TRIGGER marketplace_boost_config_updated_at
BEFORE UPDATE ON public.marketplace_boost_config
FOR EACH ROW
EXECUTE FUNCTION update_marketplace_boost_config_updated_at();
