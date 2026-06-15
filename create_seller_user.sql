-- Create seller user: hammadbhj@gmail.com
-- Password: Seller@2024!Secure

-- Step 1: Create user in Supabase Dashboard first:
-- Go to: Authentication > Users > Add user > Create new user
-- Email: hammadbhj@gmail.com
-- Password: Seller@2024!Secure
-- Check "Auto Confirm User"
-- Then run the SQL below:

DO $$
DECLARE
  target_email text := 'hammadbhj@gmail.com';
  user_password text := 'Seller@2024!Secure';
  user_id uuid;
BEGIN
  -- Find the user ID from auth.users
  SELECT id INTO user_id FROM auth.users WHERE email = target_email;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % does not exist. Please create the user first via Supabase Dashboard: Authentication > Users > Add user', target_email;
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

  -- Return credentials
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Seller user created successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Email:    %', target_email;
  RAISE NOTICE 'Password: %', user_password;
  RAISE NOTICE 'Role:     seller';
  RAISE NOTICE 'User ID:  %', user_id;
  RAISE NOTICE '========================================';
END $$;
