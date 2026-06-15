-- Create vet_partner_enquiries table for contact form submissions

CREATE TABLE IF NOT EXISTS public.vet_partner_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_listings(id) ON DELETE CASCADE,
  vet_partner_id uuid REFERENCES public.vet_partners(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_vet_partner_enquiries_business_id ON public.vet_partner_enquiries(business_id);
CREATE INDEX IF NOT EXISTS idx_vet_partner_enquiries_vet_partner_id ON public.vet_partner_enquiries(vet_partner_id);
CREATE INDEX IF NOT EXISTS idx_vet_partner_enquiries_user_id ON public.vet_partner_enquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_vet_partner_enquiries_read ON public.vet_partner_enquiries(read);
CREATE INDEX IF NOT EXISTS idx_vet_partner_enquiries_created_at ON public.vet_partner_enquiries(created_at DESC);

-- Enable RLS
ALTER TABLE public.vet_partner_enquiries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Business owners can view enquiries for their business
CREATE POLICY "Business owners can view their vet partner enquiries"
  ON public.vet_partner_enquiries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.business_listings
      WHERE business_listings.id = vet_partner_enquiries.business_id
      AND business_listings.user_id = auth.uid()
    )
  );

-- Users can create enquiries
CREATE POLICY "Users can create vet partner enquiries"
  ON public.vet_partner_enquiries
  FOR INSERT
  WITH CHECK (true); -- Allow anyone to submit enquiries

-- Business owners can update read status
CREATE POLICY "Business owners can update enquiry read status"
  ON public.vet_partner_enquiries
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.business_listings
      WHERE business_listings.id = vet_partner_enquiries.business_id
      AND business_listings.user_id = auth.uid()
    )
  );

-- Admins can view all enquiries
CREATE POLICY "Admins can view all vet partner enquiries"
  ON public.vet_partner_enquiries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.is_admin = true)
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vet_partner_enquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vet_partner_enquiries_updated_at
  BEFORE UPDATE ON public.vet_partner_enquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_vet_partner_enquiries_updated_at();
