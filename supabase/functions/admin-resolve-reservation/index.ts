import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { corsHeadersForRequest } from "../_shared/cors-headers.ts";

interface ResolveRequest {
  reservationId: string;
  resolution: 'approve_refund' | 'approve_release';
  adminNotes?: string;
}

interface AuthResult {
  user: any;
  profile?: any;
}

interface AuthError {
  status: number;
  message: string;
}

/**
 * Authenticates a user from the Authorization header
 */
async function authenticateUser(req: Request): Promise<{ success: true; data: AuthResult } | { success: false; error: AuthError }> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    return {
      success: false,
      error: {
        status: 401,
        message: 'Authorization header required'
      }
    };
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

  if (authError || !user) {
    return {
      success: false,
      error: {
        status: 401,
        message: 'Invalid or expired token'
      }
    };
  }

  return {
    success: true,
    data: { user }
  };
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersForRequest(req, "POST, OPTIONS");
  // Handle CORS preflight requests - explicitly return 200 status
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Authenticate user and check admin role
    const authResult = await authenticateUser(req);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error.message }),
        {
          status: authResult.error.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { user } = authResult.data;

    // Check if user is admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || (!userProfile?.is_admin && userProfile?.role !== 'admin')) {
      return new Response(
        JSON.stringify({ error: 'Access denied. Admin role required.' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { reservationId, resolution, adminNotes }: ResolveRequest = await req.json();

    if (!reservationId || !resolution) {
      return new Response(
        JSON.stringify({ error: 'Reservation ID and resolution are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!['approve_refund', 'approve_release'].includes(resolution)) {
      return new Response(
        JSON.stringify({ error: 'Invalid resolution. Must be approve_refund or approve_release' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get reservation details
    const { data: reservation, error: fetchError } = await supabaseAdmin
      .from('reservations')
      .select(`
        id,
        user_id,
        listing_id,
        status,
        dispute_status,
        dispute_reason,
        amount,
        seller_payout_amount,
        stripe_payment_intent_id,
        sale_listings!inner (
          seller_id,
          title
        )
      `)
      .eq('id', reservationId)
      .single();

    if (fetchError || !reservation) {
      return new Response(
        JSON.stringify({ error: 'Reservation not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (reservation.status !== 'disputed') {
      return new Response(
        JSON.stringify({ error: 'Reservation is not in disputed status' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    let newStatus = 'completed';
    let newDisputeStatus = 'resolved';

    if (resolution === 'approve_refund') {
      // Refund €40 to buyer, keep €10 platform fee
      const refundAmount = reservation.seller_payout_amount || 4000; // €40 in cents

      if (reservation.stripe_payment_intent_id) {
        try {
          // Create partial refund
          await stripe.refunds.create({
            payment_intent: reservation.stripe_payment_intent_id,
            amount: refundAmount,
            reason: 'requested_by_customer',
            metadata: {
              reservation_id: reservation.id,
              admin_resolved: 'true',
              resolution: 'refund_to_buyer'
            }
          });

        } catch (stripeError) {
          // Log error but don't fail - admin decision is recorded
          console.error('Stripe refund error (non-blocking):', stripeError);
          // Continue with status update - payment can be processed manually later
        }
      } else {

      }

      newStatus = 'refunded';
      newDisputeStatus = 'resolved'; // Database constraint only allows: none, buyer_denied, seller_denied, admin_reviewing, resolved
    } else {
      // Approve release - transfer €40 to seller
      const transferAmount = reservation.seller_payout_amount || 4000; // €40 in cents

      // Get seller's Stripe account
      const { data: sellerProfile, error: sellerError } = await supabaseAdmin
        .from('user_profiles')
        .select('stripe_account_id, payout_enabled, stripe_charges_enabled')
        .eq('id', reservation.sale_listings.seller_id)
        .single();

      const sellerCanReceive =
        sellerProfile?.stripe_account_id &&
        (sellerProfile?.payout_enabled || sellerProfile?.stripe_charges_enabled);

      if (sellerCanReceive && reservation.stripe_payment_intent_id) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(reservation.stripe_payment_intent_id);
          
          if (paymentIntent.status === 'succeeded') {
            const transfer = await stripe.transfers.create({
              amount: transferAmount,
              currency: 'eur',
              destination: sellerProfile.stripe_account_id,
              transfer_data: {
                amount: transferAmount,
              },
              metadata: {
                reservation_id: reservation.id,
                type: 'reservation_payout',
                admin_resolved: 'true'
              }
            });

          }
        } catch (stripeError) {
          // Log error but don't fail - admin decision is recorded
          console.error('Stripe transfer error (non-blocking):', stripeError);
          // Continue with status update - payment can be processed manually later
        }
      } else {

      }

      newDisputeStatus = 'resolved'; // Database constraint only allows: none, buyer_denied, seller_denied, admin_reviewing, resolved
    }

    // Update reservation
    const { error: updateError } = await supabaseAdmin
      .from('reservations')
      .update({
        status: newStatus,
        dispute_status: newDisputeStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', reservationId);

    if (updateError) {
      console.error('Error updating reservation:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update reservation' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Record the resolution (if reservation_refunds table exists)
    try {
      await supabaseAdmin
        .from('reservation_refunds')
        .insert({
          reservation_id: reservation.id,
          refund_amount: resolution === 'approve_refund' 
            ? (reservation.seller_payout_amount || 4000) / 100 
            : 0,
          reason: `admin_${resolution}`,
          admin_notes: adminNotes || `Admin resolved dispute: ${resolution}`,
          processed_by: user.id
        });
    } catch (tableError) {

    }

    // Create notifications
    const notifications = [
      {
        user_id: reservation.user_id,
        title: 'Reservation Dispute Resolved',
        message: resolution === 'approve_refund' 
          ? `Your dispute for "${reservation.sale_listings.title}" has been resolved. A refund of €${((reservation.seller_payout_amount || 4000) / 100).toFixed(2)} has been processed.`
          : `Your dispute for "${reservation.sale_listings.title}" has been resolved. The payment has been released to the seller.`,
        type: 'dispute_resolved',
        listing_id: reservation.listing_id
      },
      {
        user_id: reservation.sale_listings.seller_id,
        title: 'Reservation Dispute Resolved',
        message: resolution === 'approve_refund'
          ? `The dispute for "${reservation.sale_listings.title}" has been resolved. A refund has been issued to the buyer.`
          : `The dispute for "${reservation.sale_listings.title}" has been resolved. Payment of €${((reservation.seller_payout_amount || 4000) / 100).toFixed(2)} has been released to you.`,
        type: 'dispute_resolved',
        listing_id: reservation.listing_id
      }
    ];

    const { error: notificationError } = await supabaseAdmin
      .from('notifications')
      .insert(notifications);

    if (notificationError) {
      console.error('Error creating notifications:', notificationError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Reservation dispute resolved successfully',
        reservationId,
        resolution
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in admin-resolve-reservation:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});