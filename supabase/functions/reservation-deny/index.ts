import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeadersForRequest } from "../_shared/cors-headers.ts";

interface DenyRequest {
  reservationId: string;
  reason?: string;
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
    let requestBody: DenyRequest;
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

    const { reservationId, reason } = requestBody;

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
        dispute_status,
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

    // Check if reservation can be denied
    if (reservation.status !== 'awaiting_confirmation') {
      return new Response(
        JSON.stringify({ error: `Reservation cannot be denied in current status: ${reservation.status}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Determine dispute status
    const disputeStatus = isBuyer ? 'buyer_denied' : 'seller_denied';

    // Update reservation to disputed status
    const { error: updateError } = await supabaseAdmin
      .from('reservations')
      .update({
        status: 'disputed',
        dispute_status: disputeStatus,
        dispute_reason: reason || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', reservationId);

    if (updateError) {
      console.error('Error updating reservation:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to deny reservation' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

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

    // Create notifications
    const notifications: any[] = [
      // Notify the other party
      {
        user_id: isBuyer ? reservation.sale_listings.seller_id : reservation.user_id,
        title: 'Reservation Disputed',
        message: `The ${isBuyer ? 'buyer' : 'seller'} has denied the reservation for "${reservation.sale_listings.title}". The dispute will be reviewed by an administrator.`,
        type: 'reservation_disputed',
        listing_id: reservation.listing_id
      }
    ];

    // Notify all admins
    if (adminUsers && adminUsers.length > 0) {
      adminUsers.forEach(admin => {
        notifications.push({
          user_id: admin.id,
          title: 'Reservation Dispute Requires Review',
          message: `A reservation for "${reservation.sale_listings.title}" has been disputed by the ${isBuyer ? 'buyer' : 'seller'}. ${reason ? `Reason: ${reason}` : 'No reason provided.'}`,
          type: 'admin_dispute_review',
          listing_id: reservation.listing_id
        });
      });
    }

    try {
      const { error: notificationError } = await supabaseAdmin
        .from('notifications')
        .insert(notifications);

      if (notificationError) {
        console.error('Error creating notifications:', notificationError);
      }
    } catch (error) {
      console.error('Error creating notifications:', error);
      // Don't fail the request if notification creation fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Reservation denied. The dispute has been sent for admin review.',
        reservationId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in reservation-deny:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
