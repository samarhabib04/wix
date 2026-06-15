-- ============================================================================
-- FIX USER_PROFILES RLS USING HELPER FUNCTION
-- ============================================================================
-- The issue: Subqueries in policies are also filtered by RLS, causing recursion
-- Solution: Use a SECURITY DEFINER helper function to check admin status
-- ============================================================================

-- Step 1: Drop ALL existing policies
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
    END LOOP;
END $$;

-- Step 2: Create helper function to check if user is admin (bypasses RLS)
-- This function uses SECURITY DEFINER so it can read user_profiles without RLS filtering
CREATE OR REPLACE FUNCTION public.check_user_is_admin(user_id uuid)
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
    -- This query bypasses RLS because function uses SECURITY DEFINER
    SELECT role, COALESCE(is_admin, false)
    INTO user_role, user_is_admin
    FROM public.user_profiles
    WHERE id = user_id;
    
    RETURN (user_role = 'admin' OR user_is_admin = true);
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN false;
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

-- Step 3: Update the main admin check function
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.check_user_is_admin(auth.uid());
$$;

-- Step 4: Ensure RLS is enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 5: Create STRICT SELECT policy using the helper function
-- This avoids RLS recursion because the helper function uses SECURITY DEFINER
CREATE POLICY "user_profiles_select_own_or_admin"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
    -- Users can see their own profile
    auth.uid() = id
    OR
    -- Admins can see all (using helper function that bypasses RLS)
    public.check_user_is_admin(auth.uid())
);

-- Step 6: INSERT policy
CREATE POLICY "user_profiles_insert_own"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Step 7: UPDATE policy
CREATE POLICY "user_profiles_update_own_or_admin"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
    auth.uid() = id
    OR
    public.check_user_is_admin(auth.uid())
)
WITH CHECK (
    auth.uid() = id
    OR
    public.check_user_is_admin(auth.uid())
);

-- Step 8: DELETE policy (admin only)
CREATE POLICY "user_profiles_delete_admin_only"
ON public.user_profiles
FOR DELETE
TO authenticated
USING (public.check_user_is_admin(auth.uid()));

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test 1: Count visible profiles (should be 1 for regular users)
SELECT COUNT(*) as visible_profiles FROM public.user_profiles;
-- Expected: 1 for regular users, all for admins

-- Test 2: Check admin helper function
SELECT 
    auth.uid() as user_id,
    public.check_user_is_admin(auth.uid()) as is_admin_check,
    public.is_current_user_admin() as is_admin_check_v2;

-- Test 3: List policies
SELECT 
    policyname,
    cmd,
    LEFT(qual, 100) as policy_expression
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles';

-- Test 4: Verify you can only see your own profile
SELECT id, email, role, is_admin 
FROM public.user_profiles
LIMIT 5;
-- Expected: Only 1 row (your own) for regular users

-- ============================================================================
