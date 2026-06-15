-- Create marketplace_sales table to track all marketplace product sales
-- Used for earnings tracking, notifications, and payment processing

CREATE TABLE IF NOT EXISTS public.marketplace_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.business_listings(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL, -- Price per unit in cents
  total_amount INTEGER NOT NULL, -- Total amount in cents
  commission_amount INTEGER NOT NULL DEFAULT 100, -- Fixed €1 commission in cents
  business_payout_amount INTEGER NOT NULL, -- Amount paid to business (total - commission)
  stripe_payment_intent_id TEXT NOT NULL,
  stripe_transfer_id TEXT, -- Transfer ID for Stripe Connect payout
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payout_status TEXT NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketplace_sales ENABLE ROW LEVEL SECURITY;

-- Policy: Businesses can view their own sales
CREATE POLICY "Businesses can view their own marketplace sales"
  ON public.marketplace_sales
  FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM public.business_listings WHERE user_id = auth.uid()
    )
  );

-- Policy: Buyers can view their own purchases
CREATE POLICY "Buyers can view their own marketplace purchases"
  ON public.marketplace_sales
  FOR SELECT
  USING (auth.uid() = buyer_id);

-- Policy: Admins can view all sales
CREATE POLICY "Admins can view all marketplace sales"
  ON public.marketplace_sales
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND (role = 'admin' OR is_admin = true)
    )
  );

-- Policy: Service role can manage all sales
CREATE POLICY "Service role can manage marketplace sales"
  ON public.marketplace_sales
  FOR ALL
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_marketplace_sales_product_id 
  ON public.marketplace_sales(product_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_sales_business_id 
  ON public.marketplace_sales(business_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_sales_buyer_id 
  ON public.marketplace_sales(buyer_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_sales_payment_status 
  ON public.marketplace_sales(payment_status);

CREATE INDEX IF NOT EXISTS idx_marketplace_sales_payout_status 
  ON public.marketplace_sales(payout_status);

CREATE INDEX IF NOT EXISTS idx_marketplace_sales_stripe_payment_intent 
  ON public.marketplace_sales(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_sales_created_at 
  ON public.marketplace_sales(created_at DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_marketplace_sales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_marketplace_sales_updated_at
  BEFORE UPDATE ON public.marketplace_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_sales_updated_at();
