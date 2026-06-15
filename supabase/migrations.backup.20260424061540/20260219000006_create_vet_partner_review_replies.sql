-- Create vet_partner_review_replies table for paid partners to reply to reviews

CREATE TABLE IF NOT EXISTS public.vet_partner_review_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.business_reviews(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.business_listings(id) ON DELETE CASCADE,
  reply_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vet_partner_review_replies_review_id ON public.vet_partner_review_replies(review_id);
CREATE INDEX IF NOT EXISTS idx_vet_partner_review_replies_business_id ON public.vet_partner_review_replies(business_id);

-- Enable RLS
ALTER TABLE public.vet_partner_review_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Business owners can view replies to their reviews
CREATE POLICY "Business owners can view their review replies"
  ON public.vet_partner_review_replies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.business_listings
      WHERE business_listings.id = vet_partner_review_replies.business_id
      AND business_listings.user_id = auth.uid()
    )
  );

-- Business owners can create replies (only paid partners)
CREATE POLICY "Paid vet partners can create review replies"
  ON public.vet_partner_review_replies
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.business_listings bl
      LEFT JOIN public.vet_partners vp ON vp.business_id = bl.id
      LEFT JOIN public.business_subscriptions bs ON bs.business_id = bl.id AND bs.status = 'active'
      WHERE bl.id = vet_partner_review_replies.business_id
      AND bl.user_id = auth.uid()
      AND bl.partner = true
      AND (
        vp.tier = 'paid' OR
        bl.vet_partner_tier = 'paid' OR
        (bs.subscription_tier IN ('premium', 'elite_marketplace'))
      )
    )
  );

-- Business owners can update their replies
CREATE POLICY "Business owners can update their review replies"
  ON public.vet_partner_review_replies
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.business_listings
      WHERE business_listings.id = vet_partner_review_replies.business_id
      AND business_listings.user_id = auth.uid()
    )
  );

-- Anyone can view replies (for public display)
CREATE POLICY "Anyone can view review replies"
  ON public.vet_partner_review_replies
  FOR SELECT
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vet_partner_review_replies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vet_partner_review_replies_updated_at
  BEFORE UPDATE ON public.vet_partner_review_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_vet_partner_review_replies_updated_at();
