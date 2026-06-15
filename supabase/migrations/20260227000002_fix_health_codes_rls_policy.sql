-- Fix RLS policy to explicitly allow anonymous access to health codes
-- This ensures the policy works correctly for unauthenticated users

-- Drop the existing policy
DROP POLICY IF EXISTS "Anyone can view active health codes" ON public.health_codes;

-- Recreate the policy with explicit roles (anon and authenticated)
CREATE POLICY "Anyone can view active health codes"
ON public.health_codes
FOR SELECT
TO anon, authenticated
USING (is_active = true);
