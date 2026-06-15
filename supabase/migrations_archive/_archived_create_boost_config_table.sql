-- Create boost_config table to store dynamic boost card headings
CREATE TABLE IF NOT EXISTS public.boost_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gold_boost_name TEXT NOT NULL DEFAULT 'Gold Boost',
  elite_boost_name TEXT NOT NULL DEFAULT 'Elite Boost',
  premium_boost_name TEXT NOT NULL DEFAULT 'Premium Boost',
  standard_boost_name TEXT NOT NULL DEFAULT 'Standard Boost',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default configuration
INSERT INTO public.boost_config (
  gold_boost_name,
  elite_boost_name,
  premium_boost_name,
  standard_boost_name
)
VALUES (
  'Gold Boost',
  'Elite Boost',
  'Premium Boost',
  'Standard Boost'
)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.boost_config ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read boost config
CREATE POLICY "Anyone can read boost config"
ON public.boost_config
FOR SELECT
USING (true);

-- Policy: Only admins can update boost config
CREATE POLICY "Only admins can update boost config"
ON public.boost_config
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Policy: Only admins can insert boost config
CREATE POLICY "Only admins can insert boost config"
ON public.boost_config
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_boost_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER boost_config_updated_at
BEFORE UPDATE ON public.boost_config
FOR EACH ROW
EXECUTE FUNCTION update_boost_config_updated_at();
