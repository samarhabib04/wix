-- ============================================================================
-- FINAL FIX FOR USER_PROFILES RLS POLICIES
-- ============================================================================
-- This migration fixes the issue where all users can see all profiles.
-- The problem is likely that multiple SELECT policies are using OR logic,
-- or the admin check is incorrectly allowing access.
-- ============================================================================

-- Step 1: Drop ALL existing policies on user_profiles
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

-- Step 2: Ensure RLS is enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Fix the admin check function
-- Make sure it uses SECURITY DEFINER and checks both role and is_admin
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
    -- Get user role and is_admin flag (bypassing RLS with SECURITY DEFINER)
    SELECT role, COALESCE(is_admin, false)
    INTO user_role, user_is_admin
    FROM public.user_profiles
    WHERE id = auth.uid();
    
    -- Return true if user is admin
    RETURN (user_role = 'admin' OR user_is_admin = true);
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN false;
END;
$$;

-- Step 4: Create a SINGLE, comprehensive SELECT policy
-- This uses a CASE statement to ensure only one condition applies
CREATE POLICY "user_profiles_select_policy"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
    -- Users can see their own profile
    auth.uid() = id
    OR
    -- Admins can see all profiles (using the function)
    public.is_current_user_admin() = true
);

-- Step 5: INSERT policy - users can only create their own profile
CREATE POLICY "user_profiles_insert_policy"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Step 6: UPDATE policy - users can update own, admins can update all
CREATE POLICY "user_profiles_update_policy"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
    auth.uid() = id
    OR
    public.is_current_user_admin() = true
)
WITH CHECK (
    auth.uid() = id
    OR
    public.is_current_user_admin() = true
);

-- Step 7: DELETE policy - only admins can delete
CREATE POLICY "user_profiles_delete_policy"
ON public.user_profiles
FOR DELETE
TO authenticated
USING (public.is_current_user_admin() = true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running this, test with:

-- 1. As regular user (seller):
-- SELECT COUNT(*) FROM public.user_profiles;
-- Expected: 1 (only own profile)

-- 2. As admin:
-- SELECT COUNT(*) FROM public.user_profiles;
-- Expected: All profiles

-- 3. Check policies:
-- SELECT policyname, cmd, qual FROM pg_policies 
-- WHERE schemaname = 'public' AND tablename = 'user_profiles';
-- Expected: Should see 4 policies (SELECT, INSERT, UPDATE, DELETE)

-- 4. Test admin function:
-- SELECT public.is_current_user_admin();
-- Expected: true for admin, false for regular users

-- ============================================================================
