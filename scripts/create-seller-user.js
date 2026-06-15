/**
 * Script to create a seller user in Supabase
 * 
 * Usage:
 *   node scripts/create-seller-user.js
 * 
 * Or with custom email/password:
 *   node scripts/create-seller-user.js hammadhk737@gmail.com Seller@2024!Secure
 */

const { createClient } = require('@supabase/supabase-js');

// Try to load dotenv if available
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // dotenv not installed, user will need to set env vars manually
}

// Usage: node scripts/create-seller-user.js [email] [password] [serviceRoleKey]
// Optional: --replace-existing  (required to delete + recreate if email already exists)
const argv = process.argv.slice(2);
const replaceExisting = argv.includes('--replace-existing');
const positional = argv.filter((a) => !a.startsWith('--'));

// Use environment variables or fallback to defaults
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://sehzakutrlropprdcewu.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || positional[2];

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('   Option 1: Set as environment variable:');
  console.error('     $env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  console.error('     node scripts/create-seller-user.js');
  console.error('');
  console.error('   Option 2: Pass as third argument after email and password:');
  console.error('     node scripts/create-seller-user.js hammadhk737@gmail.com Seller@2024!Secure "your-service-role-key"');
  console.error('');
  console.error('   To get your Service Role Key:');
  console.error('     1. Go to Supabase Dashboard → Project Settings → API');
  console.error('     2. Copy the "service_role" key (NOT the anon key)');
  console.error('');
  process.exit(1);
}

const email = positional[0] || 'hammadhk737@gmail.com';
const password = positional[1] || 'Seller@2024!Secure';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createSellerUser() {
  try {

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error('❌ Error checking existing users:', listError.message);
      if (listError.message.includes('not allowed') || listError.message.includes('permission')) {
        console.error('');
        console.error('⚠️  This error usually means you are using the ANON KEY instead of the SERVICE ROLE KEY.');
        console.error('');
        console.error('   To fix this:');
        console.error('   1. Go to Supabase Dashboard → Project Settings → API');
        console.error('   2. Find the "service_role" key (NOT the "anon" key)');
        console.error('   3. Copy the service_role key and use it in the script');
        console.error('');
        console.error('   The service_role key starts with "eyJ..." and has "service_role" in the payload.');
        console.error('   The anon key has "anon" in the payload (which is what you likely used).');
      }
      throw listError;
    }

    const existingUser = existingUsers?.users?.find(u => u.email === email);
    if (existingUser) {
      if (!replaceExisting) {
        console.error('❌ A user with this email already exists:', email);
        console.error('');
        console.error('   Deleting and recreating would remove their account, listings, and data.');
        console.error('   If you really intend to replace them, run again with:');
        console.error('     node scripts/create-seller-user.js --replace-existing <email> <password>');
        console.error('');
        process.exit(1);
      }

      console.warn('⚠️  --replace-existing: removing existing auth user + profile for:', email);

      // Delete user profile first
      const { error: deleteProfileError } = await supabaseAdmin
        .from('user_profiles')
        .delete()
        .eq('id', existingUser.id)
        .or(`email.eq.${email}`);
      
      if (deleteProfileError) {
        console.warn('⚠️  Warning: Could not delete user profile:', deleteProfileError.message);
      }

      // Delete auth user
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
      if (deleteError) {
        console.error('❌ Error deleting existing user:', deleteError.message);
        throw deleteError;
      }

    }

    // Create the new user with confirmed email
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // User can log in immediately
      user_metadata: {
        role: 'seller'
      }
    });

    if (createError) {
      console.error('❌ Error creating user:', createError.message);
      throw createError;
    }

    if (!userData?.user?.id) {
      throw new Error('User created but no user ID returned');
    }

    const userId = userData.user.id;

    // Create user profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        id: userId,
        email,
        role: 'seller',
        auth_method: 'email_password',
        profile_complete: false,
        newsletter_opt_in: false,
        is_admin: false,
        first_name: '',
        last_name: '',
        phone: '',
        county: '',
        business_name: '',
        seller_id: '',
        dbe_id: '',
        avatar_url: null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('❌ Error creating user profile:', profileError.message);
      throw profileError;
    }

  } catch (error) {
    console.error('❌ Failed to create user:', error.message);
    process.exit(1);
  }
}

createSellerUser();
