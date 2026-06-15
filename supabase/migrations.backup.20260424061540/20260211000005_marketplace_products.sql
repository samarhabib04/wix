-- Marketplace Products Table
-- Physical dog products sold by businesses via Stripe Connect

CREATE TABLE IF NOT EXISTS public.marketplace_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_listings(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  price decimal(10, 2) NOT NULL,
  image_url text,
  admin_approved boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_products_business_id ON public.marketplace_products(business_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_admin_approved ON public.marketplace_products(admin_approved);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_is_active ON public.marketplace_products(is_active);

-- Enable RLS
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Business owners can manage their own marketplace products"
  ON public.marketplace_products
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_listings
      WHERE business_listings.id = marketplace_products.business_id
      AND business_listings.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view approved active products"
  ON public.marketplace_products
  FOR SELECT
  USING (admin_approved = true AND is_active = true);

CREATE POLICY "Admins can view all marketplace products"
  ON public.marketplace_products
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.is_admin = true)
    )
  );

CREATE POLICY "Admins can approve marketplace products"
  ON public.marketplace_products
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.is_admin = true)
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_marketplace_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_marketplace_products_updated_at
  BEFORE UPDATE ON public.marketplace_products
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_products_updated_at();
