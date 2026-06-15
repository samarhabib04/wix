-- ============================================================================
-- FIX RLS FOR USER_PROFILES
-- ============================================================================
-- This migration fixes the RLS policies for user_profiles to ensure
-- users can only see their own profile and admins can see all.
-- ============================================================================

-- First, check if RLS is enabled (diagnostic)
-- Run this to verify: SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles';

-- Force enable RLS (in case it wasn't enabled)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on user_profiles to start fresh
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.user_profiles';
    END LOOP;
END $$;

-- Fix the admin check function to handle RLS properly
-- The function needs SECURITY DEFINER to bypass RLS when checking admin status
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR is_admin = true)
  );
$$;

-- Create a single, more restrictive SELECT policy
-- Users can only see their own profile
CREATE POLICY "Users can read their own profile only"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Admins can see all profiles (separate policy)
CREATE POLICY "Admins can read all profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
    AND (up.role = 'admin' OR up.is_admin = true)
  )
);

-- INSERT: Users can create their own profile (id must match auth.uid())
CREATE POLICY "Users can create their own profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- UPDATE: Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- UPDATE: Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
    AND (up.role = 'admin' OR up.is_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
    AND (up.role = 'admin' OR up.is_admin = true)
  )
);

-- DELETE: Only admins can delete profiles
CREATE POLICY "Admins can delete profiles"
ON public.user_profiles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
    AND (up.role = 'admin' OR up.is_admin = true)
  )
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- After applying this migration, run these to verify:

-- 1. Check if RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles';
-- Expected: rowsecurity should be 't' (true)

-- 2. Check existing policies:
-- SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles';
-- Expected: Should see the policies we just created

-- 3. Test as regular user (should only see own profile):
-- SELECT COUNT(*) FROM public.user_profiles;
-- Expected: Should return 1 (only your own profile)

-- 4. Test admin check function:
-- SELECT public.is_current_user_admin();
-- Expected: Should return true for admin, false for regular users

-- ============================================================================
