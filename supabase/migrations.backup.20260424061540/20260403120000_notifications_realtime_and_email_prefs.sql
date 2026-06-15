-- 1) Realtime: seller/buyer nav badges use useRealtimeNotifications() postgres_changes on `notifications`.
-- Without this table in supabase_realtime, unread counts only refresh on full page load.

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) Email notification toggles (Settings → Notifications). Used by SellerSettings / future email jobs.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS notify_email_messages boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_boost_expiry boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_listing_expiry boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.user_profiles.notify_email_messages IS 'Email alerts for new buyer messages (seller preference).';
COMMENT ON COLUMN public.user_profiles.notify_email_boost_expiry IS 'Email reminders before listing boosts expire.';
COMMENT ON COLUMN public.user_profiles.notify_email_listing_expiry IS 'Email reminders before listings expire.';
