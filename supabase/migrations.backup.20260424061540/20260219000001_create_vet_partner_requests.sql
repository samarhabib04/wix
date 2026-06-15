-- Create vet_partner_requests table to track business requests to become vet partners

CREATE TYPE vet_partner_request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE IF NOT EXISTS public.vet_partner_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES public.business_listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  status vet_partner_request_status NOT NULL DEFAULT 'pending',
  rejection_reason text,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  responded_at timestamp with time zone,
  responded_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_vet_partner_requests_business_id ON public.vet_partner_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_vet_partner_requests_user_id ON public.vet_partner_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_vet_partner_requests_status ON public.vet_partner_requests(status);
CREATE INDEX IF NOT EXISTS idx_vet_partner_requests_requested_at ON public.vet_partner_requests(requested_at DESC);

-- Enable RLS
ALTER TABLE public.vet_partner_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Business owners can view their own requests
CREATE POLICY "Business owners can view their own vet partner requests"
  ON public.vet_partner_requests
  FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view all requests
CREATE POLICY "Admins can view all vet partner requests"
  ON public.vet_partner_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.is_admin = true)
    )
  );

-- Business owners can create requests for their own business
CREATE POLICY "Business owners can create vet partner requests"
  ON public.vet_partner_requests
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.business_listings
      WHERE business_listings.id = business_id
      AND business_listings.user_id = auth.uid()
    )
  );

-- Admins can update requests (approve/reject)
CREATE POLICY "Admins can update vet partner requests"
  ON public.vet_partner_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.is_admin = true)
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vet_partner_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vet_partner_requests_updated_at
  BEFORE UPDATE ON public.vet_partner_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_vet_partner_requests_updated_at();
