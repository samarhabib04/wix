-- Vet Partners Table
-- Supports free (invite-only) and paid (€12/month) tiers

CREATE TYPE vet_partner_tier AS ENUM ('free', 'paid');
CREATE TYPE vet_partner_status AS ENUM ('active', 'suspended', 'pending_approval');

CREATE TABLE IF NOT EXISTS public.vet_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES public.business_listings(id) ON DELETE CASCADE,
  tier vet_partner_tier NOT NULL DEFAULT 'free',
  invited_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  invited_at timestamp with time zone,
  stripe_subscription_id text,
  stripe_customer_id text,
  status vet_partner_status NOT NULL DEFAULT 'pending_approval',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vet_partners_business_id ON public.vet_partners(business_id);
CREATE INDEX IF NOT EXISTS idx_vet_partners_tier ON public.vet_partners(tier);
CREATE INDEX IF NOT EXISTS idx_vet_partners_status ON public.vet_partners(status);

-- Enable RLS
ALTER TABLE public.vet_partners ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Business owners can view their own vet partner status"
  ON public.vet_partners
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.business_listings
      WHERE business_listings.id = vet_partners.business_id
      AND business_listings.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all vet partners"
  ON public.vet_partners
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.is_admin = true)
    )
  );

CREATE POLICY "Admins can manage vet partners"
  ON public.vet_partners
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.is_admin = true)
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vet_partners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vet_partners_updated_at
  BEFORE UPDATE ON public.vet_partners
  FOR EACH ROW
  EXECUTE FUNCTION update_vet_partners_updated_at();
