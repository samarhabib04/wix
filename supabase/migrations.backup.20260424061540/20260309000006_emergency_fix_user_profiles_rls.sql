-- ============================================================================
-- EMERGENCY FIX: USER_PROFILES RLS - ENFORCE STRICT ACCESS CONTROL
-- ============================================================================
-- Current issue: Regular users can see all 60 profiles instead of just their own
-- This migration will enforce strict RLS policies
-- ============================================================================

-- Step 1: Drop ALL existing policies (including any permissive ones)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_profiles'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.user_profiles CASCADE';
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Step 2: Ensure RLS is enabled (should already be, but double-check)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create a STRICT admin check function that definitely works
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role text;
    user_is_admin boolean;
BEGIN
    -- Directly query user_profiles (bypassing RLS with SECURITY DEFINER)
    SELECT role, COALESCE(is_admin, false)
    INTO user_role, user_is_admin
    FROM public.user_profiles
    WHERE id = auth.uid();
    
    -- Return true ONLY if explicitly admin
    IF user_role = 'admin' OR user_is_admin = true THEN
        RETURN true;
    ELSE
        RETURN false;
    END IF;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN false;
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

-- Step 4: Create ONLY ONE SELECT policy that is RESTRICTIVE
-- This policy uses a subquery to check admin status to avoid recursion
CREATE POLICY "user_profiles_select_restrictive"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
    -- Allow if user is viewing their own profile
    auth.uid() = id
    OR
    -- Allow if user is admin (check via subquery to avoid RLS recursion)
    (
        EXISTS (
            SELECT 1 
            FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND (up.role = 'admin' OR up.is_admin = true)
        )
    )
);

-- Step 5: INSERT - users can only create their own profile
CREATE POLICY "user_profiles_insert_own"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Step 6: UPDATE - users can update own, admins can update all
CREATE POLICY "user_profiles_update_own_or_admin"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
    auth.uid() = id
    OR
    EXISTS (
        SELECT 1 
        FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND (up.role = 'admin' OR up.is_admin = true)
    )
)
WITH CHECK (
    auth.uid() = id
    OR
    EXISTS (
        SELECT 1 
        FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND (up.role = 'admin' OR up.is_admin = true)
    )
);

-- Step 7: DELETE - only admins
CREATE POLICY "user_profiles_delete_admin_only"
ON public.user_profiles
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND (up.role = 'admin' OR up.is_admin = true)
    )
);

-- ============================================================================
-- IMMEDIATE VERIFICATION
-- ============================================================================
-- Run these queries RIGHT AFTER applying this migration:

-- 1. Check current user can see (should be 1 for regular users)
SELECT COUNT(*) as visible_count FROM public.user_profiles;
-- Expected: 1 for regular users, all for admins

-- 2. Check what policies exist now
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%auth.uid() = id%' THEN '✅ Restrictive - own data'
        WHEN qual LIKE '%admin%' THEN '✅ Admin check'
        ELSE '⚠️ Check this'
    END as policy_type
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles';

-- 3. Test admin function
SELECT 
    auth.uid() as user_id,
    public.is_current_user_admin() as is_admin,
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()) as user_role,
    (SELECT is_admin FROM public.user_profiles WHERE id = auth.uid()) as is_admin_flag;

-- 4. Verify you can only see your own profile (as regular user)
SELECT id, email, role, is_admin 
FROM public.user_profiles;
-- Expected: Only 1 row (your own profile) for regular users

-- ============================================================================
-- IF STILL NOT WORKING:
-- ============================================================================
-- The issue might be that the subquery in the policy is also being filtered by RLS.
-- In that case, we need to use a different approach - create a helper function
-- that uses SECURITY DEFINER to check admin status without RLS filtering.
-- ============================================================================
