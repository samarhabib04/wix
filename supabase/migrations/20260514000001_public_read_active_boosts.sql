-- Allow anyone (including anonymous users) to read active boost records.
-- Without this policy, only admins/owners could see boosts, causing the
-- homepage carousel to sort boosted listings first only for those users.

-- Drop any existing public-read policy to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view active boosts" ON public.boosts;
DROP POLICY IF EXISTS "Public can view active boosts" ON public.boosts;

-- Create the public read policy
CREATE POLICY "Anyone can view active boosts"
  ON public.boosts
  FOR SELECT
  USING (is_active = true);
