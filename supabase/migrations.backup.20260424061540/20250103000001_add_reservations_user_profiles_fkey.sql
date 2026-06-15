-- Add foreign key relationship from reservations.user_id to user_profiles.id
-- This allows PostgREST to automatically join user_profiles when querying reservations
-- Note: This assumes user_profiles.id matches auth.users.id (which is standard in Supabase)

-- Check if constraint already exists before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'reservations_user_id_user_profiles_fkey'
  ) THEN
    -- Add the foreign key constraint
    ALTER TABLE public.reservations
    ADD CONSTRAINT reservations_user_id_user_profiles_fkey
    FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for faster lookups (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_reservations_user_id 
ON public.reservations(user_id);
