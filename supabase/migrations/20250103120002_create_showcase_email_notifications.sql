-- Create showcase_email_notifications table for storing email addresses
-- of non-logged-in users who want to be notified when a showcase listing goes live

CREATE TABLE IF NOT EXISTS public.showcase_email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  showcase_id UUID NOT NULL REFERENCES public.showcase_listings(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_showcase_email UNIQUE (showcase_id, email)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_showcase_email_notifications_showcase_id 
  ON public.showcase_email_notifications(showcase_id);

CREATE INDEX IF NOT EXISTS idx_showcase_email_notifications_email 
  ON public.showcase_email_notifications(email);

-- Enable RLS
ALTER TABLE public.showcase_email_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to insert (for non-logged-in users)
CREATE POLICY "Allow public insert for showcase email notifications"
  ON public.showcase_email_notifications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated users to read their own entries (if needed)
CREATE POLICY "Allow users to read showcase email notifications"
  ON public.showcase_email_notifications
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow service role to read all (for edge functions)
CREATE POLICY "Allow service role to read all showcase email notifications"
  ON public.showcase_email_notifications
  FOR SELECT
  TO service_role
  USING (true);
