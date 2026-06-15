-- NOTE: This SQL script cannot create users directly in Supabase auth.users table
-- because auth.create_user() function does not exist in Supabase.
-- 
-- Please use the Node.js script instead:
--   node scripts/create-seller-user.js
--
-- Or use the Supabase Dashboard:
--   1. Go to Authentication > Users
--   2. Click "Add user" > "Create new user"
--   3. Enter email: hammadhk737@gmail.com
--   4. Enter password: Seller@2024!Secure
--   5. Check "Auto Confirm User"
--   6. After creating, run the SQL below to update the user_profiles table

-- This SQL will only update the user_profiles table after the user is created via Dashboard or Node.js script
DO $$
DECLARE
  target_email text := 'hammadhk737@gmail.com';
  user_id uuid;
BEGIN
  -- Find the user ID from auth.users
  SELECT id INTO user_id FROM auth.users WHERE email = target_email;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % does not exist. Please create the user first via Supabase Dashboard or Node.js script.', target_email;
  END IF;

  -- Insert or update user profile with seller role
  INSERT INTO public.user_profiles (
    id,
    first_name,
    last_name,
    phone,
    county,
    role,
    newsletter_opt_in,
    auth_method,
    business_name,
    seller_id,
    dbe_id,
    profile_complete,
    email,
    avatar_url,
    is_admin,
    updated_at
  ) VALUES (
    user_id,
    '',
    '',
    '',
    '',
    'seller',
    false,
    'email_password',
    '',
    '',
    '',
    false,
    target_email,
    NULL,
    false,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET 
    role = 'seller',
    is_admin = false,
    auth_method = 'email_password',
    email = target_email,
    updated_at = now();

  -- Output success message
  RAISE NOTICE '========================================';
  RAISE NOTICE 'User profile updated successfully!';
  RAISE NOTICE 'Email: %', target_email;
  RAISE NOTICE 'Password: Seller@2024!Secure';
  RAISE NOTICE 'Role: seller';
  RAISE NOTICE 'User ID: %', user_id;
  RAISE NOTICE '========================================';
END $$;
