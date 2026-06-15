-- Create or replace the admin check function if it doesn't exist
-- This function checks if the current authenticated user has admin role
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- Enable Row Level Security on quiz_breeds table
ALTER TABLE public.quiz_breeds ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read breeds" ON public.quiz_breeds;
DROP POLICY IF EXISTS "Admins can insert breeds" ON public.quiz_breeds;
DROP POLICY IF EXISTS "Admins can update breeds" ON public.quiz_breeds;
DROP POLICY IF EXISTS "Admins can delete breeds" ON public.quiz_breeds;

-- Policy 1: Allow anyone (including unauthenticated users) to read breeds
-- This is needed because breeds are displayed on the public /breeds page
CREATE POLICY "Anyone can read breeds"
ON public.quiz_breeds
FOR SELECT
TO public
USING (true);

-- Policy 2: Only admins can insert (add) new breeds
CREATE POLICY "Admins can insert breeds"
ON public.quiz_breeds
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_current_user_admin() = true
);

-- Policy 3: Only admins can update (edit) existing breeds
CREATE POLICY "Admins can update breeds"
ON public.quiz_breeds
FOR UPDATE
TO authenticated
USING (
  public.is_current_user_admin() = true
)
WITH CHECK (
  public.is_current_user_admin() = true
);

-- Policy 4: Only admins can delete breeds
CREATE POLICY "Admins can delete breeds"
ON public.quiz_breeds
FOR DELETE
TO authenticated
USING (
  public.is_current_user_admin() = true
);

