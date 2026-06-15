import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { corsHeadersForRequest } from "../_shared/cors-headers.ts";

interface CancelRequest {
  reservationId: string;
  reason?: string;
}

interface MailerLiteSubscriber {
  email: string;
  fields?: {
    [key: string]: string;
  };
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
    let requestBody: CancelRequest;
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

    // Fetch reservation with listing and user details
    const { data: reservation, error: fetchError } = await supabaseAdmin
      .from('reservations')
      .select(`
        id,
        user_id,
        listing_id,
        status,
        amount,
        fee_amount,
        stripe_payment_intent_id,
        stripe_session_id,
        puppy_collar_color,
        created_at,
        sale_listings (
          seller_id,
          title,
          breed
        )
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

    // Get user profile to check if admin
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role, is_admin, first_name, last_name, email')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify authorization (seller or admin)
    const isAdmin = userProfile.is_admin || userProfile.role === 'admin';
    const isSeller = reservation.sale_listings?.seller_id === user.id;

    if (!isAdmin && !isSeller) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Only the seller or admin can cancel reservations' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if reservation can be cancelled
    if (!['pending', 'confirmed', 'reserved', 'awaiting_confirmation'].includes(reservation.status)) {
      return new Response(
        JSON.stringify({ error: 'Reservation cannot be cancelled in current status' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    let refundAmount = 0;
    let refundId = null;

    // Process Stripe refund if payment exists
    if (reservation.stripe_payment_intent_id || reservation.stripe_session_id) {
      try {
        let paymentIntentId = reservation.stripe_payment_intent_id;

        // If we only have session ID, get the payment intent
        if (!paymentIntentId && reservation.stripe_session_id) {
          const session = await stripe.checkout.sessions.retrieve(reservation.stripe_session_id);
          paymentIntentId = session.payment_intent as string;
        }

        if (paymentIntentId) {
          // Calculate refund amount (€50 deposit minus platform fee)
          const totalAmount = reservation.amount; // Amount in cents
          const platformFee = reservation.fee_amount || 1000; // Default 10 euro platform fee
          refundAmount = Math.max(0, totalAmount - platformFee); // Refund deposit minus platform fee

          if (refundAmount > 0) {
            const refund = await stripe.refunds.create({
              payment_intent: paymentIntentId,
              amount: refundAmount,
              reason: 'requested_by_customer',
              metadata: {
                reservation_id: reservationId,
                cancelled_by: user.id,
                reason: reason || 'Reservation cancelled'
              }
            });

            refundId = refund.id;

          }
        }
      } catch (stripeError) {
        console.error('Stripe refund error:', stripeError);
        // Continue with cancellation even if refund fails
      }
    }

    // Update reservation status
    const { error: updateError } = await supabaseAdmin
      .from('reservations')
      .update({
        status: 'cancelled',
        refund_amount: refundAmount,
        refund_date: new Date().toISOString(),
        refund_reason: reason || 'Reservation cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', reservationId);

    if (updateError) {
      console.error('Error updating reservation:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update reservation status' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get buyer details for email notification and cancellation group
    const { data: buyerProfile, error: buyerError } = await supabaseAdmin
      .from('user_profiles')
      .select('first_name, last_name, email')
      .eq('id', reservation.user_id)
      .single();

    // Call cancellation handler to add user to MailerLite group
    if (!buyerError && buyerProfile?.email) {
      try {

        const { data: cancellationData, error: cancellationError } = await supabaseAdmin.functions.invoke('handle-cancellation', {
          body: {
            userEmail: buyerProfile.email,
            cancellationType: 'reservation',
            entityId: reservationId
          }
        });

        if (cancellationError) {
          console.error('❌ Failed to call handle-cancellation function:', cancellationError);
        } else if (cancellationData?.success) {

        } else {
          console.error('❌ handle-cancellation function failed:', cancellationData);
        }
      } catch (cancellationError) {
        console.error('❌ Exception calling handle-cancellation:', cancellationError);
        // Don't fail the request if cancellation handler fails
      }
    }

    if (!buyerError && buyerProfile?.email) {
      // Send cancellation email via MailerLite
      try {
        const mailerLiteApiKey = Deno.env.get('MAILERLITE_API_KEY');
        if (mailerLiteApiKey) {
          const emailData = {
            first_name: buyerProfile.first_name || 'Valued Customer',
            reservation_id: reservationId.slice(0, 8),
            puppy_breed: reservation.sale_listings?.breed || 'puppy',
            puppy_title: reservation.sale_listings?.title || 'listing',
            collar_color: reservation.puppy_collar_color || 'N/A',
            refund_amount: refundAmount ? `€${(refundAmount / 100).toFixed(2)}` : '€0.00',
            site_url: 'https://dogquest.ie'
          };

          // Create campaign for cancellation email using bye.html template
          const campaignResponse = await fetch('https://connect.mailerlite.com/api/campaigns', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${mailerLiteApiKey}`,
            },
            body: JSON.stringify({
              name: `Reservation Cancellation - ${reservationId.slice(0, 8)}`,
              type: 'regular',
              emails: [{
                subject: "We've processed your cancellation",
                preview: "Here's what happens next.",
                from_name: 'DogQuest',
                from: 'noreply@dogquest.ie',
                content: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cancellation Processed</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9f9f9;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="padding: 40px 20px; text-align: center; background-color: #2c5530; color: white;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">DogQuest</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Your Trusted Companion</p>
        </div>
        
        <div style="padding: 40px 20px;">
            <h2 style="color: #2c5530; margin-bottom: 20px;">Hello ${emailData.first_name},</h2>
            
            <p style="margin-bottom: 20px; line-height: 1.6; color: #333;">
                We've processed your cancellation for reservation <strong>${emailData.reservation_id}</strong>.
            </p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #2c5530;">Cancellation Details:</h3>
                <p style="margin: 5px 0;"><strong>Puppy:</strong> ${emailData.puppy_title}</p>
                <p style="margin: 5px 0;"><strong>Breed:</strong> ${emailData.puppy_breed}</p>
                ${emailData.collar_color !== 'N/A' ? `<p style="margin: 5px 0;"><strong>Collar Color:</strong> ${emailData.collar_color}</p>` : ''}
                <p style="margin: 5px 0;"><strong>Refund Amount:</strong> ${emailData.refund_amount}</p>
            </div>
            
            ${refundAmount > 0 ? `
            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #2c5530;">
                    <strong>Refund Processing:</strong> Your refund of ${emailData.refund_amount} will be processed back to your original payment method within 5-10 business days.
                </p>
            </div>
            ` : ''}
            
            <p style="margin: 20px 0; line-height: 1.6; color: #333;">
                We're sorry to see you go, but we understand that circumstances change. 
                We'd love to help you find the perfect companion in the future.
            </p>
            
            <div style="margin: 30px 0;">
                <h3 style="color: #2c5530; margin-bottom: 15px;">What's Next?</h3>
                <div style="margin-bottom: 10px;">
                    <a href="${emailData.site_url}/puppies" style="display: inline-block; background-color: #2c5530; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-right: 10px; margin-bottom: 10px;">
                        See Future Litters
                    </a>
                    <a href="${emailData.site_url}/newsletter" style="display: inline-block; background-color: #f8f9fa; color: #2c5530; padding: 12px 24px; text-decoration: none; border-radius: 5px; border: 1px solid #2c5530;">
                        Manage Email Preferences
                    </a>
                </div>
            </div>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
                If you have any questions about your cancellation or refund, please don't hesitate to contact our support team.
            </p>
        </div>
        
        <div style="padding: 20px; text-align: center; background-color: #f8f9fa; color: #666; font-size: 12px;">
            <p style="margin: 0;">© 2024 DogQuest. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">Finding families their perfect companions across Ireland.</p>
        </div>
    </div>
</body>
</html>
                `
              }]
            }),
          });

          if (campaignResponse.ok) {

          }
        }
      } catch (emailError) {
        console.error('Error sending cancellation email:', emailError);
        // Don't fail the whole operation if email fails
      }
    }

    // Create notifications
    const notifications = [];

    // Notify buyer
    if (reservation.user_id) {
      notifications.push({
        user_id: reservation.user_id,
        title: 'Reservation Cancelled',
        message: `Your reservation ${reservationId.slice(0, 8)} has been cancelled. ${refundAmount > 0 ? `A refund of €${(refundAmount / 100).toFixed(2)} will be processed.` : ''}`,
        type: 'reservation_cancelled',
        listing_id: reservation.listing_id
      });
    }

    // Notify seller (if not the one who cancelled)
    if (reservation.sale_listings?.seller_id && reservation.sale_listings.seller_id !== user.id) {
      notifications.push({
        user_id: reservation.sale_listings.seller_id,
        title: 'Reservation Cancelled',
        message: `Reservation ${reservationId.slice(0, 8)} for your listing has been cancelled by ${isAdmin ? 'admin' : 'the buyer'}.`,
        type: 'reservation_cancelled',
        listing_id: reservation.listing_id
      });
    }

    if (notifications.length > 0) {
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
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Reservation cancelled successfully',
        reservationId,
        refundAmount: refundAmount > 0 ? (refundAmount / 100).toFixed(2) : '0.00',
        refundId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in reservations-cancel:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
