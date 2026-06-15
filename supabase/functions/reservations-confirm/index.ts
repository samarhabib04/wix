import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeadersForRequest } from "../_shared/cors-headers.ts";

interface ConfirmRequest {
  reservationId: string;
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
  const corsHeaders = corsHeadersForRequest(req, "GET, POST, OPTIONS");
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    try {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    } catch (error) {
      console.error('Error in OPTIONS handler:', error);
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    }
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Authenticate user
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
    
    // Safely parse request body
    let requestBody: ConfirmRequest;
    try {
      requestBody = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { reservationId } = requestBody;

    if (!reservationId) {
      return new Response(
        JSON.stringify({ error: 'Reservation ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get reservation with listing details to check seller
    const { data: reservation, error: fetchError } = await supabaseAdmin
      .from('reservations')
      .select(`
        id, 
        user_id, 
        listing_id,
        status, 
        buyer_confirmed,
        seller_confirmed,
        amount, 
        seller_payout_amount, 
        platform_fee_amount,
        sale_listings!inner(seller_id, title)
      `)
      .eq('id', reservationId)
      .single();

    if (fetchError || !reservation) {
      console.error('Error fetching reservation:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Reservation not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Determine if user is buyer or seller
    const isBuyer = reservation.user_id === user.id;
    const isSeller = reservation.sale_listings.seller_id === user.id;

    if (!isBuyer && !isSeller) {
      return new Response(
        JSON.stringify({ error: 'Access denied. You are not the buyer or seller for this reservation.' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if reservation can be confirmed
    if (reservation.status !== 'awaiting_confirmation') {
      return new Response(
        JSON.stringify({ error: `Reservation cannot be confirmed in current status: ${reservation.status}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if already confirmed by this user
    if ((isBuyer && reservation.buyer_confirmed) || (isSeller && reservation.seller_confirmed)) {
      return new Response(
        JSON.stringify({ error: 'You have already confirmed this reservation' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Update the appropriate confirmation field
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (isBuyer) {
      updateData.buyer_confirmed = true;
    } else if (isSeller) {
      updateData.seller_confirmed = true;
    }

    // Check if both parties have confirmed
    const willBeBuyerConfirmed = isBuyer ? true : reservation.buyer_confirmed;
    const willBeSellerConfirmed = isSeller ? true : reservation.seller_confirmed;
    const bothWillBeConfirmed = willBeBuyerConfirmed && willBeSellerConfirmed;

    if (bothWillBeConfirmed) {
      updateData.status = 'both_confirmed';
    }

    // Update reservation
    const { error: updateError } = await supabaseAdmin
      .from('reservations')
      .update(updateData)
      .eq('id', reservationId);

    if (updateError) {
      console.error('Error updating reservation:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to confirm reservation' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create notification for the other party
    const otherPartyId = isBuyer ? reservation.sale_listings.seller_id : reservation.user_id;
    const userRole = isBuyer ? 'buyer' : 'seller';
    
    try {
      const { error: notificationError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: otherPartyId,
          title: 'Reservation Confirmed',
          message: `The ${userRole} has confirmed the reservation for "${reservation.sale_listings.title}". ${bothWillBeConfirmed ? 'Both parties have confirmed. The escrow period is now active.' : 'Please confirm to proceed.'}`,
          type: 'reservation_confirmed',
          listing_id: reservation.listing_id
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      // Don't fail the request if notification creation fails
    }

    // If both confirmed, trigger escrow release logic (will be handled by process-escrow-release cron)
    if (bothWillBeConfirmed) {

      // Get admin users to notify
      let adminUsers: any[] = [];
      try {
        const { data: adminData, error: adminError } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('role', 'admin');

        if (!adminError && adminData) {
          adminUsers = adminData;
        } else if (adminError) {
          console.error('Error fetching admin users:', adminError);
        }
      } catch (error) {
        console.error('Error fetching admin users:', error);
      }

      try {
        // Create notifications for both parties about escrow start
        const notifications: any[] = [
          {
            user_id: reservation.user_id,
            title: 'Escrow Period Started',
            message: `Both parties have confirmed. The 14-day escrow period has started for "${reservation.sale_listings.title}". Payment will be released after the period ends.`,
            type: 'escrow_started',
            listing_id: reservation.listing_id
          },
          {
            user_id: reservation.sale_listings.seller_id,
            title: 'Escrow Period Started',
            message: `Both parties have confirmed. The 14-day escrow period has started for "${reservation.sale_listings.title}". You will receive €${(reservation.seller_payout_amount / 100).toFixed(2)} after the period ends.`,
            type: 'escrow_started',
            listing_id: reservation.listing_id
          }
        ];

        // Notify all admins that both parties confirmed
        if (adminUsers && adminUsers.length > 0) {
          adminUsers.forEach(admin => {
            notifications.push({
              user_id: admin.id,
              title: 'Reservation Confirmed by Both Parties',
              message: `Both buyer and seller have confirmed reservation ${reservationId.slice(0, 8)} for "${reservation.sale_listings.title}". The 14-day escrow period has started.`,
              type: 'admin_reservation_confirmed',
              listing_id: reservation.listing_id
            });
          });
        }

        await supabaseAdmin
          .from('notifications')
          .insert(notifications);
      } catch (error) {
        console.error('Error creating escrow notifications:', error);
        // Don't fail the request if notification creation fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Reservation confirmed successfully',
        reservationId,
        bothConfirmed: bothWillBeConfirmed
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in reservations-confirm:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
