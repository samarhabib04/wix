import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { corsHeadersForRequest } from "../_shared/cors-headers.ts";
import { isStripeConnectReadyFromProfile } from "../_shared/stripe-connect-status.ts";

const reservationPaymentSchema = z.object({
  listingId: z.string().uuid({ message: "Invalid listing ID format" }),
  // New input fields for enhanced tracking
  reservationType: z.enum(['basic', 'individual']).optional().default('basic'),
  puppyId: z.string().optional(),
  puppyGender: z.enum(['male', 'female']).optional(),
  puppyColor: z.string().optional(),
  // Maintained for backward compatibility and manual entry
  // Accepts string, empty string, null, or undefined
  collarColor: z.union([z.string(), z.literal(""), z.null()]).optional(),
  message: z.string().max(500).optional()
});

// Helper function to sanitize IP address
const sanitizeIP = (ip?: string) => {
  return ip && ip !== '::1' ? ip : null;
};

serve(async (req) => {
  const corsHeaders = corsHeadersForRequest(req, "POST, OPTIONS");
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate user
    const { authenticated, user, error: authError } = await authenticateUser(req);

    if (!authenticated || !user) {
      console.error('Authentication failed:', authError);
      return createErrorResponse(
        authError || { status: 401, error: 'Unauthorized', message: 'Please login to continue' },
        corsHeaders,
      );
    }

    // Initialize Supabase admin client for DB operations containing sensitive data
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get client IP for fraud prevention logging
    let clientIP = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || '';
    // Handle multiple IPs in x-forwarded-for
    if (clientIP.includes(',')) {
      clientIP = clientIP.split(',')[0].trim();
    }
    clientIP = sanitizeIP(clientIP);

    // 2. Validate request body
    const body = await req.json();
    const validation = await validateRequest(reservationPaymentSchema, body);

    if (!validation.success) {
      console.error('Validation failed:', validation.error);
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: validation.error
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { listingId, reservationType, puppyId, puppyGender, puppyColor, collarColor, message } = validation.data;

    // 3. Check for fraud / user bans
    const { data: fraudResult, error: fraudError } = await supabaseAdmin.rpc('check_user_fraud_status', {
      check_user_id: user.id,
      check_ip_address: clientIP
    });

    const isFraudulent = !fraudError && fraudResult && fraudResult.is_banned;

    if (isFraudulent) {
      console.warn(`Suspicious reservation attempt blocked for user ${user.id} from IP ${clientIP}`);
      return new Response(
        JSON.stringify({
          error: 'Unable to process reservation',
          message: 'Your account has been flagged for security review. Please contact support.'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Listing Data Retrieval
    // Validate listingId format first
    if (!listingId || typeof listingId !== 'string') {
      console.error('Invalid listingId format:', listingId);
      return new Response(
        JSON.stringify({ error: 'Invalid listing ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: listing, error: listingError } = await supabaseAdmin
      .from('sale_listings')
      .select('*, seller_id, title, price, images, male_count, female_count, puppy_details, selected_colors')
      .eq('id', listingId)
      .maybeSingle();

    if (listingError) {
      console.error('Listing fetch error:', {
        error: listingError,
        message: listingError.message,
        code: listingError.code,
        details: listingError.details,
        hint: listingError.hint,
        listingId
      });
      return new Response(
        JSON.stringify({ 
          error: 'Listing fetch failed',
          details: listingError.message || 'Database error occurred'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!listing) {
      console.error('Listing not found for ID:', listingId);
      // Check if listing exists but might be unpublished or not approved
      const { data: unpublishedListing } = await supabaseAdmin
        .from('sale_listings')
        .select('id, title, is_published, admin_approved')
        .eq('id', listingId)
        .maybeSingle();
      
      if (unpublishedListing) {

        return new Response(
          JSON.stringify({ 
            error: 'Listing not available',
            message: 'This listing may not be published or approved yet'
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Listing not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- 5. AVAILABILITY CHECK ---
    // Fetch active reservations to validation availability

    const { data: reservations, error: reservedError } = await supabaseAdmin
      .from('reservations')
      .select('reservation_type, puppy_gender, puppy_id, puppy_collar_color, status')
      .eq('listing_id', listingId)
      .in('status', ['pending', 'confirmed', 'completed', 'awaiting_confirmation', 'both_confirmed']);

    if (reservedError) {
      console.error('[AVAILABILITY] Error fetching reservations:', reservedError);
      throw new Error('Failed to check availability');
    }

    const type = reservationType || 'individual'; // Default to individual since we removed basic option

    // All reservations are now individual (specific puppy selection)
    // Check specific availability based on type
    if (type === 'individual') {
      if (!puppyId) {
        console.error('[AVAILABILITY] Puppy ID is required but not provided');
        return new Response(
          JSON.stringify({ error: "Puppy ID is required. Please select a specific puppy." }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if puppy exists in listing and get its details
      const puppyDetails = Array.isArray(listing.puppy_details) ? listing.puppy_details : [];
      const selectedPuppy = puppyDetails.find((p: any) => p && p.id === puppyId);
      
      if (!selectedPuppy) {
        console.error('[AVAILABILITY] Puppy not found in listing. puppyId:', puppyId, 'Available puppy IDs:', puppyDetails.map((p: any) => p?.id).filter(Boolean));
        return new Response(
          JSON.stringify({ error: "Puppy not found in listing details." }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // CRITICAL: Check BOTH the reservations table AND the isReserved flag from puppy_details
      const isReservedInTable = reservations.some((r: any) => r.puppy_id === puppyId);
      const isReservedInDetails = selectedPuppy.isReserved === true;

      if (isReservedInTable || isReservedInDetails) {
        const reason = isReservedInTable ? 'found in reservations table' : 'marked as reserved in puppy_details';
        console.warn('[AVAILABILITY] Puppy is already reserved:', reason, {
          puppyId,
          isReservedInTable,
          isReservedInDetails
        });
        
        return new Response(
          JSON.stringify({ 
            error: 'This puppy is already reserved',
            details: `Puppy is reserved (${reason})`
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

    } else {
      // Basic/Gender Check - Gender is required for basic reservations
      if (!puppyGender) {
        return new Response(
          JSON.stringify({ error: "Puppy gender is required for basic reservation." }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (puppyGender) {
        const limit = puppyGender === 'male' ? (listing.male_count || 0) : (listing.female_count || 0);

        // Count reservations for this gender (basic or unspecified type)
        const reservedCount = reservations.filter((r: any) =>
          (r.reservation_type === 'basic' || !r.reservation_type) &&
          r.puppy_gender === puppyGender
        ).length;

        if (reservedCount >= limit) {
          return new Response(
            JSON.stringify({ error: `No ${puppyGender} puppies available` }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Fallback: Total Capacity Check (if gender not specified or as safety net)
      // Ensure total reservations don't exceed total puppies
      const totalCapacity = (listing.male_count || 0) + (listing.female_count || 0);
      // We count ALL reservations against total capacity to prevent overbooking
      if (reservations.length >= totalCapacity) {
        return new Response(
          JSON.stringify({ error: `No puppies available` }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    // --- AVAILABILITY CHECK END ---

    // 6. Get Seller Profile and Stripe info

    const { data: sellerProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('stripe_account_id, stripe_onboarding_completed, payout_enabled, stripe_charges_enabled')
      .eq('id', listing.seller_id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching seller profile:', profileError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch seller payment information',
          details: profileError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hasStripeConnect = isStripeConnectReadyFromProfile(sellerProfile);

    // IMPORTANT: If seller doesn't have Stripe setup, we return a specific status
    // so the frontend can show a helpful error message
    if (!hasStripeConnect) {
      console.warn(`Seller ${listing.seller_id} missing Stripe Connect setup`);
      return new Response(
        JSON.stringify({
          requiresPaymentSetup: true,
          error: 'Seller payment setup required',
          message: 'The seller needs to complete their payment setup to accept reservations.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Create Stripe Checkout Session
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16', // Use verified version
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Check for existing customer or create one
    const { data: existingCustomer } = await supabaseAdmin
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let customerId = existingCustomer?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id
        }
      });
      customerId = customer.id;

      // Save mapping
      await supabaseAdmin.from('stripe_customers').insert({
        user_id: user.id,
        stripe_customer_id: customerId
      });
    }

    // Prepare Metadata - Include all new tracking fields
    const descriptor = reservationType === 'individual'
      ? 'Specific Puppy'
      : (collarColor ? `Collar: ${collarColor}` : 'Puppy Reservation');

    const reservationMetadata = {
      listing_id: listingId,
      user_id: user.id,
      reservation_type: reservationType || 'basic',
      // Ensure fields are strings for Stripe Metadata
      puppy_id: puppyId || '',
      puppy_gender: puppyGender || '',
      puppy_color: puppyColor || '',
      collar_color: collarColor || '',
      message: message || '',
      ip_address: clientIP || '',
      type: 'reservation',
      fraud_detected: isFraudulent ? 'true' : 'false',
      fraud_flags: isFraudulent && fraudResult ? JSON.stringify(fraudResult.flags || []) : ''
    };

    const sessionConfig: any = {
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Puppy Reservation Deposit: ${listing.title}`,
              description: `Secure deposit for ${descriptor}. The remaining balance will be paid directly to the seller upon collection.`,
              images: listing.images && listing.images.length > 0 ? [listing.images[0]] : [],
              metadata: {
                listing_id: listingId
              }
            },
            unit_amount: 5000, // 50.00 EUR
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/my-buyer-dashboard/reservations?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/listing/${listingId}?canceled=true`,
      metadata: reservationMetadata,
    };

    // Add Direct Payment vs Connect Splitting logic
    if (hasStripeConnect) {
      // Platform Fee logic: 50 EUR total. 10 EUR platform fee, 40 EUR to seller.
      sessionConfig.payment_intent_data = {
        application_fee_amount: 1000, // 10.00 EUR
        transfer_data: {
          destination: sellerProfile.stripe_account_id,
        },
        metadata: reservationMetadata // Should also be on PI for easy webhook access
      };
    } else {
      // Fallback for direct payments (shouldn't happen given check above, but for safety)
      sessionConfig.payment_intent_data = {
        metadata: {
          ...reservationMetadata,
          direct_payment: 'true'
        }
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    // Return session URL for redirect
    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in create-reservation-payment:', error);

    // Log fatal errors to DB if possible (skipped here for brevity/permissions)

    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// --- HELPER FUNCTIONS ---

// Type definitions
interface AuthError {
  status: number;
  error: string;
  message: string;
}

interface AuthResult {
  authenticated: boolean;
  user: any | null;
  error: AuthError | null;
}

// Helper to authenticate user from request
async function authenticateUser(req: Request): Promise<AuthResult> {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    }
  );

  const { data: { user }, error } = await supabaseClient.auth.getUser();

  if (error || !user) {
    return {
      authenticated: false,
      user: null,
      error: { status: 401, error: 'Unauthorized', message: error?.message || 'Authentication required' }
    };
  }

  return { authenticated: true, user, error: null };
}

async function validateRequest<T>(schema: z.Schema<T>, data: any): Promise<{ success: true; data: T } | { success: false; error: any }> {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    return { success: false, error };
  }
}

function createErrorResponse(authError: AuthError, cors: Record<string, string>): Response {
  return new Response(
    JSON.stringify(authError),
    { status: authError.status, headers: { ...cors, 'Content-Type': 'application/json' } }
  );
}
