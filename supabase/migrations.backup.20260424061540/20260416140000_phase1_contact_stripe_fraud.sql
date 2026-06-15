-- Contact form persistence (written by send-email edge function with service role)
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text NOT NULL DEFAULT '',
  message text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at
  ON public.contact_submissions (created_at DESC);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.contact_submissions IS 'Contact form rows; inserts via service role only (send-email).';

-- Stripe Connect: charges can be enabled before payouts (e.g. pending bank verification).
-- Used with payout_enabled so buyers can reserve when seller can accept charges.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean DEFAULT false;
