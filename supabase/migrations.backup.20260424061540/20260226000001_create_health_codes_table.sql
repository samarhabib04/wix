-- Create health_codes table for managing H1, V1, V2 health codes
-- Only admins can create, update, or delete codes
-- Everyone can view active codes for validation purposes

-- Create code_type enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'health_code_type') THEN
    CREATE TYPE health_code_type AS ENUM ('H1', 'V1', 'V2');
  END IF;
END $$;

-- Create health_codes table
CREATE TABLE IF NOT EXISTS public.health_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  code_type health_code_type NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  CONSTRAINT health_codes_code_unique UNIQUE (code)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_codes_code ON public.health_codes(code);
CREATE INDEX IF NOT EXISTS idx_health_codes_code_type ON public.health_codes(code_type);
CREATE INDEX IF NOT EXISTS idx_health_codes_is_active ON public.health_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_health_codes_code_type_active ON public.health_codes(code_type, is_active);

-- Enable RLS
ALTER TABLE public.health_codes ENABLE ROW LEVEL SECURITY;

-- Policy 1: Everyone can view active codes (for validation)
CREATE POLICY "Anyone can view active health codes"
ON public.health_codes
FOR SELECT
TO public
USING (is_active = true);

-- Policy 2: Only admins can insert (add) new codes
CREATE POLICY "Admins can insert health codes"
ON public.health_codes
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_current_user_admin() = true
);

-- Policy 3: Only admins can update (edit) existing codes
CREATE POLICY "Admins can update health codes"
ON public.health_codes
FOR UPDATE
TO authenticated
USING (
  public.is_current_user_admin() = true
)
WITH CHECK (
  public.is_current_user_admin() = true
);

-- Policy 4: Only admins can delete codes
CREATE POLICY "Admins can delete health codes"
ON public.health_codes
FOR DELETE
TO authenticated
USING (
  public.is_current_user_admin() = true
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_health_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER health_codes_updated_at
BEFORE UPDATE ON public.health_codes
FOR EACH ROW
EXECUTE FUNCTION update_health_codes_updated_at();

-- Add comments
COMMENT ON TABLE public.health_codes IS 'Stores valid H1, V1, V2 health codes that can be used in listings';
COMMENT ON COLUMN public.health_codes.code IS 'The actual code value (e.g., RDS1V1123456)';
COMMENT ON COLUMN public.health_codes.code_type IS 'Type of health code: H1, V1, or V2';
COMMENT ON COLUMN public.health_codes.is_active IS 'Soft delete flag - inactive codes cannot be used in listings';
