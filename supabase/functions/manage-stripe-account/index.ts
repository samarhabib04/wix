import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { corsHeadersForRequest } from "../_shared/cors-headers.ts";
import {
  deriveStripeConnectStatus,
  resolveOnboardingUrls,
} from "../_shared/stripe-connect-status.ts";

serve(async (req) => {
  const corsHeaders = corsHeadersForRequest(req, "GET, POST, OPTIONS");
  // Handle CORS preflight requests - must be isolated to prevent any errors
  if (req.method === 'OPTIONS') {
    try {
      return new Response(null, { 
        status: 200,
        headers: corsHeaders 
      });
    } catch (error) {
      // Even if there's an error, return a valid CORS response
      console.error('Error in OPTIONS handler:', error);
      return new Response(null, { 
        status: 200,
        headers: corsHeaders 
      });
    }
  }

  // Wrap entire handler in try-catch to ensure CORS headers are always returned
  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user?.email) {
      throw new Error('User not authenticated');
    }

    // Parse request body safely
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      throw new Error('Invalid request body');
    }
    
    const { action, return_path: returnPath } = requestBody;
    
    if (!action) {
      throw new Error('Action parameter is required');
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw new Error('User profile not found');
    }

    switch (action) {
      case 'create_account': {
        // If account already exists, check if we need to delete it first
        if (profile.stripe_account_id) {
          try {
            // Try to retrieve the existing account
            await stripe.accounts.retrieve(profile.stripe_account_id);
            // Account exists and is accessible, return it
            return new Response(
              JSON.stringify({ 
                account_id: profile.stripe_account_id,
                status: 'exists'
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
              }
            );
          } catch (error: any) {
            // Account might be in wrong mode or deleted, delete it from our DB and create new one

            await supabaseAdmin
              .from('user_profiles')
              .update({
                stripe_account_id: null,
                stripe_onboarding_completed: false,
                payout_enabled: false,
                stripe_charges_enabled: false,
              })
              .eq('id', user.id);
          }
        }
        
        // Create Stripe Connect account
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'IE', // Ireland
          email: user.email,
          business_type: 'individual',
          metadata: {
            user_id: user.id,
            email: user.email
          }
        });

        // Update user profile with Stripe account ID
        await supabaseAdmin
          .from('user_profiles')
          .update({
            stripe_account_id: account.id,
            stripe_onboarding_completed: false,
            payout_enabled: false,
            stripe_charges_enabled: false,
          })
          .eq('id', user.id);

        return new Response(
          JSON.stringify({ 
            account_id: account.id,
            status: 'created'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      case 'create_onboarding_link': {
        if (!profile.stripe_account_id) {
          throw new Error('No Stripe account found');
        }

        const origin = req.headers.get('origin') || '';
        const onboardingUrls = resolveOnboardingUrls(origin, returnPath);

        try {
          // First, try to retrieve the account to verify it exists and is accessible
          let account;
          try {
            account = await stripe.accounts.retrieve(profile.stripe_account_id);

          } catch (retrieveError: any) {
            // If retrieval fails, it might be a mode mismatch
            const retrieveErrorMsg = retrieveError?.message || retrieveError?.toString() || '';

            // If it's a mode mismatch or access error, clear and recreate
            if (retrieveErrorMsg.includes('mode') || retrieveErrorMsg.includes('No such account')) {

              await supabaseAdmin
                .from('user_profiles')
                .update({
                  stripe_account_id: null,
                  stripe_onboarding_completed: false,
                  payout_enabled: false,
                  stripe_charges_enabled: false,
                })
                .eq('id', user.id);
              
              // Create new account
              const newAccount = await stripe.accounts.create({
                type: 'express',
                country: 'IE',
                email: user.email,
                business_type: 'individual',
                metadata: {
                  user_id: user.id,
                  email: user.email
                }
              });
              
              await supabaseAdmin
                .from('user_profiles')
                .update({
                  stripe_account_id: newAccount.id,
                  stripe_onboarding_completed: false,
                  payout_enabled: false,
                  stripe_charges_enabled: false,
                })
                .eq('id', user.id);
              
              // Create account link with new account
              const accountLink = await stripe.accountLinks.create({
                account: newAccount.id,
                refresh_url: onboardingUrls.refresh_url,
                return_url: onboardingUrls.return_url,
                type: 'account_onboarding',
              });
              
              return new Response(
                JSON.stringify({ url: accountLink.url }),
                {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  status: 200,
                }
              );
            }
            throw retrieveError;
          }
          
          // If we get here, account was retrieved successfully, try to create link
          try {
            const accountLink = await stripe.accountLinks.create({
              account: profile.stripe_account_id,
              refresh_url: onboardingUrls.refresh_url,
              return_url: onboardingUrls.return_url,
              type: 'account_onboarding',
            });

            return new Response(
              JSON.stringify({ url: accountLink.url }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
              }
            );
          } catch (linkError: any) {
            // If creating the link fails, it might be a mode mismatch
            // Re-throw to be caught by outer catch block
            throw linkError;
          }
        } catch (error: any) {
          // Handle mode mismatch error - check multiple ways
          const errorMessage = error?.message || error?.raw?.message || error?.raw?.error?.message || error?.toString() || JSON.stringify(error) || '';

          // Check for mode mismatch in various forms - be very permissive
          const errorLower = errorMessage.toLowerCase();
          const isModeMismatch = 
            (errorLower.includes('test mode') && errorLower.includes('live mode')) ||
            errorLower.includes('test mode account link') ||
            errorLower.includes('live mode account link') ||
            (errorLower.includes('mode') && (errorLower.includes('test') || errorLower.includes('live'))) ||
            error?.code === 'resource_missing' ||
            (error?.type === 'invalid_request_error' && errorLower.includes('mode')) ||
            (error?.raw?.message && error.raw.message.toLowerCase().includes('mode'));

          if (isModeMismatch) {
            console.error('Stripe mode mismatch detected:', errorMessage);

            // Clear the old account from database (we can't delete it from Stripe since it's in different mode)
            await supabaseAdmin
              .from('user_profiles')
              .update({
                stripe_account_id: null,
                stripe_onboarding_completed: false,
                payout_enabled: false,
                stripe_charges_enabled: false,
              })
              .eq('id', user.id);
            
            try {
              // Create a new account in the correct mode (matches current STRIPE_SECRET_KEY)
              const newAccount = await stripe.accounts.create({
                type: 'express',
                country: 'IE',
                email: user.email,
                business_type: 'individual',
                metadata: {
                  user_id: user.id,
                  email: user.email
                }
              });

              // Update user profile with new account ID
              await supabaseAdmin
                .from('user_profiles')
                .update({
                  stripe_account_id: newAccount.id,
                  stripe_onboarding_completed: false,
                  payout_enabled: false,
                  stripe_charges_enabled: false,
                })
                .eq('id', user.id);
              
              // Create account link with new account
              const accountLink = await stripe.accountLinks.create({
                account: newAccount.id,
                refresh_url: onboardingUrls.refresh_url,
                return_url: onboardingUrls.return_url,
                type: 'account_onboarding',
              });
              
              return new Response(
                JSON.stringify({ url: accountLink.url }),
                {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  status: 200,
                }
              );
            } catch (recreateError: any) {
              console.error('Error recreating account:', recreateError);
              throw new Error(`Account mode mismatch detected and failed to create new account. Error: ${recreateError.message}`);
            }
          }
          
          // If we get here and it's not a mode mismatch, but we still have an error,
          // it might be an account issue. Let's try to be more aggressive and recreate
          // if the error seems account-related
          const errorMessage2 = error?.message || error?.raw?.message || error?.raw?.error?.message || error?.toString() || '';
          const errorLower2 = errorMessage2.toLowerCase();
          const isAccountError = 
            errorLower2.includes('account') ||
            errorLower2.includes('invalid') ||
            error?.code === 'resource_missing' ||
            error?.type === 'invalid_request_error';
          
          if (isAccountError && !isModeMismatch) {

            // Try to recreate the account
            try {
              // Clear the old account
              await supabaseAdmin
                .from('user_profiles')
                .update({
                  stripe_account_id: null,
                  stripe_onboarding_completed: false,
                  payout_enabled: false,
                  stripe_charges_enabled: false,
                })
                .eq('id', user.id);
              
              // Create new account
              const newAccount = await stripe.accounts.create({
                type: 'express',
                country: 'IE',
                email: user.email,
                business_type: 'individual',
                metadata: {
                  user_id: user.id,
                  email: user.email
                }
              });
              
              await supabaseAdmin
                .from('user_profiles')
                .update({
                  stripe_account_id: newAccount.id,
                  stripe_onboarding_completed: false,
                  payout_enabled: false,
                  stripe_charges_enabled: false,
                })
                .eq('id', user.id);
              
              // Create account link
              const accountLink = await stripe.accountLinks.create({
                account: newAccount.id,
                refresh_url: onboardingUrls.refresh_url,
                return_url: onboardingUrls.return_url,
                type: 'account_onboarding',
              });
              
              return new Response(
                JSON.stringify({ url: accountLink.url }),
                {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  status: 200,
                }
              );
            } catch (recreateError: any) {
              console.error('Failed to recreate account:', recreateError);
              // Fall through to throw original error
            }
          }
          
          // Re-throw other errors
          console.error('Unhandled error in create_onboarding_link:', error);
          throw error;
        }
      }

      case 'check_status': {
        if (!profile.stripe_account_id) {
          return new Response(
            JSON.stringify({ 
              status: 'no_account',
              onboarding_completed: false,
              payout_enabled: false,
              charges_enabled: false,
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          );
        }

        try {
          // Get account details from Stripe
          const account = await stripe.accounts.retrieve(profile.stripe_account_id);
          const derived = deriveStripeConnectStatus(account);

          // Update user profile with current status
          await supabaseAdmin
            .from('user_profiles')
            .update({
              stripe_onboarding_completed: derived.onboardingCompleted,
              payout_enabled: derived.payoutEnabled,
              stripe_charges_enabled: derived.chargesEnabled,
            })
            .eq('id', user.id);

          return new Response(
            JSON.stringify({
              status: 'exists',
              account_id: profile.stripe_account_id,
              onboarding_completed: derived.onboardingCompleted,
              payout_enabled: derived.payoutEnabled,
              charges_enabled: derived.chargesEnabled,
              connect_ready_for_payments: derived.connectReadyForPayments,
              requirements: derived.pendingRequirements,
              capabilities: account.capabilities
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          );
        } catch (error: any) {
          // If account doesn't exist or was deleted/closed, clean up database
          const isAccountMissing = 
            error.code === 'resource_missing' || 
            error.statusCode === 404 || 
            error.type === 'StripeInvalidRequestError' ||
            (error.message && (
              error.message.includes('No such account') ||
              error.message.includes('account does not exist') ||
              error.message.includes('deleted') ||
              error.message.includes('closed')
            ));

          if (isAccountMissing) {

            // Clean up database
            await supabaseAdmin
              .from('user_profiles')
              .update({
                stripe_account_id: null,
                stripe_onboarding_completed: false,
                payout_enabled: false,
                stripe_charges_enabled: false,
              })
              .eq('id', user.id);
            
            // Return no_account status
            return new Response(
              JSON.stringify({ 
                status: 'no_account',
                onboarding_completed: false,
                payout_enabled: false,
                charges_enabled: false,
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
              }
            );
          }
          
          // Re-throw other errors (network issues, API errors, etc.)
          console.error('Error retrieving Stripe account:', error);
          throw error;
        }
      }

      case 'create_login_link': {
        if (!profile.stripe_account_id) {
          throw new Error('No Stripe account found');
        }

        const loginLink = await stripe.accounts.createLoginLink(profile.stripe_account_id);

        return new Response(
          JSON.stringify({ url: loginLink.url }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      case 'reset_account': {
        // Reset/delete the Stripe account and clear from user profile
        if (profile.stripe_account_id) {
          try {
            // Try to delete the account from Stripe (may fail if in wrong mode, that's ok)
            try {
              await stripe.accounts.del(profile.stripe_account_id);
            } catch (deleteError) {
              // Continue anyway to clear from database
            }
          } catch (error) {

          }
        }

        // Clear account from user profile
        await supabaseAdmin
          .from('user_profiles')
          .update({
            stripe_account_id: null,
            stripe_onboarding_completed: false,
            payout_enabled: false,
            stripe_charges_enabled: false,
          })
          .eq('id', user.id);

        return new Response(
          JSON.stringify({ 
            status: 'reset',
            message: 'Stripe account has been reset. You can create a new one.'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      default:
        throw new Error('Invalid action');
    }

  } catch (error: any) {
    console.error('Error managing Stripe account:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    // Extract error message from various error formats
    const errorMessage = 
      error?.message || 
      error?.raw?.message || 
      error?.raw?.error?.message ||
      error?.toString() || 
      (typeof error === 'string' ? error : 'Internal server error');
    
    // Always include CORS headers in error responses
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error?.raw || error?.details || null
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});
