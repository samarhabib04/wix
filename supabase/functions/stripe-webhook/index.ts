import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { corsHeadersForRequest } from '../_shared/cors-headers.ts';
import { getBoostActivationWindow } from '../_shared/boost-activation-window.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

// Create a Supabase client with the service role key
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
);

// Helper function to send reservation confirmation email
async function sendReservationConfirmationEmail(customerEmail: string, metadata: any) {
  try {

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h1 style="color: #2d5a27; margin-bottom: 20px;">Reservation Confirmed! 🐕</h1>
          
          <p>Your puppy reservation has been confirmed and payment processed successfully.</p>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2d5a27; margin-top: 0;">Reservation Details:</h3>
            <p><strong>Puppy:</strong> ${metadata.collar_color || 'Any available'} collar</p>
            <p><strong>Amount Paid:</strong> €50.00</p>
            <p><strong>Escrow Period:</strong> 14 days</p>
          </div>
          
          <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #2d5a27; margin-top: 0;">Next Steps:</h4>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Your payment counts as your confirmation — no extra buyer step</li>
              <li>The seller confirms next; then the escrow period runs</li>
              <li>Your €50 deposit is held securely until the agreed steps complete</li>
              <li>You can raise a dispute if needed within the escrow period</li>
            </ul>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Questions? Contact us at <a href="mailto:dogquestireland@gmail.com">dogquestireland@gmail.com</a>
          </p>
        </div>
      </div>
    `;

    const { error } = await supabaseAdmin.functions.invoke('send-email', {
      body: {
        to: customerEmail,
        subject: 'Puppy Reservation Confirmed - Dog Quest',
        html: emailHtml,
      }
    });

    if (error) {
      console.error('Error sending reservation email:', error);
      return false;
    } else {

      return true;
    }
  } catch (error) {
    console.error('Failed to send reservation confirmation email:', error);
    return false;
  }
}

/** Matches app `messageSenderDisplayName` so seller notifications align with chat / dashboard. */
function reservationBuyerDisplayName(
  profile: {
    first_name?: string | null;
    last_name?: string | null;
    business_name?: string | null;
    role?: string | null;
    is_admin?: boolean | null;
  } | null,
  emptyLabel: string,
): string {
  if (!profile) return emptyLabel;
  if (profile.role === 'admin' || profile.is_admin === true) return 'Admin';
  if (profile.business_name?.trim()) return profile.business_name.trim();
  const first = profile.first_name != null ? String(profile.first_name).trim() : '';
  const rawLast = profile.last_name != null ? String(profile.last_name).trim() : '';
  const last = rawLast && rawLast !== '0' ? rawLast : '';
  const full = `${first} ${last}`.trim();
  if (full) return full;
  return emptyLabel;
}

function getListingBoostTableName(listingType: string | null | undefined): 'sale_listings' | 'stud_listings' | 'showcase_listings' {
  if (listingType === 'sale' || listingType === 'listing') return 'sale_listings';
  if (listingType === 'stud') return 'stud_listings';
  return 'showcase_listings';
}

serve(async (req) => {
  const corsHeaders = corsHeadersForRequest(req, 'POST, OPTIONS');
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'POST') {
    // Check if webhook secret is configured
    if (!webhookSecret || webhookSecret === '') {
      console.error('❌ STRIPE_WEBHOOK_SECRET is not set or empty!');
      return new Response(
        JSON.stringify({
          error: 'Webhook secret not configured',
          message: 'STRIPE_WEBHOOK_SECRET environment variable is missing or empty'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body = await req.text();
    const signature = req.headers.get('stripe-signature') || '';

    if (!signature) {
      console.error('❌ Missing stripe-signature header');
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    try {
      // Verify the webhook signature

      const event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret,
      );

      // Handle specific event types
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;

          // Handle reservation payments
          if (session.metadata?.type === 'reservation') {
            const listingId = session.metadata.listing_id;
            const userId = session.metadata.user_id;
            // Enhanced tracking fields
            const reservationType = session.metadata.reservation_type || 'individual';
            const puppyId = session.metadata.puppy_id || null;
            const puppyGender = session.metadata.puppy_gender || null;
            const puppyColor = session.metadata.puppy_color || null;
            const collarColor = session.metadata.collar_color || null;
            const message = session.metadata.message || null;
            const clientIP = session.metadata.ip_address || null;

            if (!listingId || !userId) {
              console.error('Missing required metadata:', { listingId, userId });
              throw new Error('Missing required reservation metadata');
            }

            // Get listing details to get seller_id
            const { data: listing, error: listingError } = await supabaseAdmin
              .from('sale_listings')
              .select('id, title, seller_id')
              .eq('id', listingId)
              .single();

            if (listingError || !listing) {
              console.error('Error fetching listing:', listingError);
              throw new Error(`Listing not found: ${listingId}`);
            }

            // CRITICAL: Create reservation FIRST (this is the most important part)
            // Check if reservation already exists (prevent duplicates)
            let reservation: any;
            const { data: existingReservation } = await supabaseAdmin
              .from('reservations')
              .select('id, status')
              .eq('stripe_session_id', session.id)
              .single();

            if (existingReservation) {

              // Update existing reservation to correct status and fields
              const { data: updatedReservation, error: updateError } = await supabaseAdmin
                .from('reservations')
                .update({
                  status: 'awaiting_confirmation',
                  // Paying the reserve deposit is the buyer's confirmation — no second buyer click required
                  buyer_confirmed: true,
                  seller_confirmed: false,
                  dispute_status: 'none',
                  stripe_payment_intent_id: session.payment_intent as string,
                  confirmation_deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                  // Update fields if they were missing or changed
                  reservation_type: reservationType,
                  puppy_id: puppyId,
                  puppy_gender: puppyGender,
                  puppy_color: puppyColor,
                  puppy_collar_color: collarColor && collarColor.trim() !== '' ? collarColor : null
                })
                .eq('id', existingReservation.id)
                .select()
                .single();

              if (updateError) {
                console.error('Error updating existing reservation:', updateError);
                throw new Error(`Failed to update reservation: ${updateError.message}`);
              }

              reservation = updatedReservation;

            } else {
              // Create reservation record NOW (after payment is successful)

              // CRITICAL: Log puppy_id before insert to verify it's being passed
              if (!puppyId || puppyId.trim() === '') {
                console.warn('[WEBHOOK] ⚠️ WARNING: puppy_id is NULL or empty! Trigger will NOT fire!');
              } else {

              }

              const { data: newReservation, error: reservationError } = await supabaseAdmin
                .from('reservations')
                .insert({
                  listing_id: listingId,
                  user_id: userId,
                  // New fields
                  reservation_type: reservationType,
                  puppy_id: puppyId,
                  puppy_gender: puppyGender,
                  puppy_color: puppyColor,
                  puppy_collar_color: collarColor && collarColor.trim() !== '' ? collarColor : null,

                  message: message && message.trim() !== '' ? message : null,
                  amount: 5000, // €50 in cents
                  fee_amount: 1000, // €10 platform fee
                  seller_payout_amount: 4000, // €40 to seller
                  platform_fee_amount: 1000, // €10 to platform
                  status: 'awaiting_confirmation',
                  buyer_confirmed: true,
                  seller_confirmed: false,
                  dispute_status: 'none',
                  confirmation_deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                  stripe_session_id: session.id,
                  stripe_payment_intent_id: session.payment_intent as string,
                  ip_address: clientIP
                })
                .select()
                .single();

              if (reservationError) {
                console.error('[WEBHOOK] ❌ Error creating reservation:', reservationError);
                console.error('[WEBHOOK] Reservation error details:', JSON.stringify(reservationError, null, 2));
                throw new Error(`Failed to create reservation: ${reservationError.message}`);
              }

              reservation = newReservation;

              // CRITICAL: Verify puppy_id was saved correctly
              if (!reservation.puppy_id || reservation.puppy_id.trim() === '') {
                console.error('[WEBHOOK] ❌ CRITICAL: Reservation created but puppy_id is NULL/empty!');
                console.error('[WEBHOOK] This means the trigger will NOT fire to update isReserved!');
                console.error('[WEBHOOK] Reservation data:', JSON.stringify(reservation, null, 2));
              } else {

              }
            }

            // Link fraud log if fraud was detected
            if (session.metadata.fraud_detected === 'true') {
              await supabaseAdmin
                .from('fraud_logs')
                .update({
                  reservation_id: reservation.id
                })
                .eq('stripe_session_id', session.id)
                .is('reservation_id', null);
            }

            // Create notifications for both buyer and seller
            try {
              let sellerReservationMessage =
                `A buyer has made a €50 reservation for your listing "${listing.title}". Please confirm the sale in your dashboard.`;
              try {
                const { data: nameRows, error: nameErr } = await supabaseAdmin.rpc(
                  'get_public_user_name',
                  { user_id_param: userId },
                );
                if (!nameErr && nameRows && nameRows.length > 0) {
                  const who = reservationBuyerDisplayName(
                    nameRows[0] as {
                      first_name?: string | null;
                      last_name?: string | null;
                      business_name?: string | null;
                      role?: string | null;
                      is_admin?: boolean | null;
                    },
                    '',
                  ).trim();
                  if (who) {
                    sellerReservationMessage =
                      `${who} has made a €50 reservation for your listing "${listing.title}". Please confirm the sale in your dashboard.`;
                  }
                }
              } catch (nameLookupErr) {
                console.warn('[WEBHOOK] get_public_user_name for seller notification:', nameLookupErr);
              }

              const notifications = [
                {
                  user_id: userId,
                  title: 'Reservation Payment Confirmed',
                  message: `Your €50 reservation payment for "${listing.title}" has been confirmed — that is your confirmation to proceed. When the seller confirms in their dashboard, the escrow period begins.`,
                  type: 'reservation_payment_confirmed',
                  listing_id: listingId,
                  read: false
                },
                {
                  user_id: listing.seller_id,
                  title: 'New Reservation Received',
                  message: sellerReservationMessage,
                  type: 'new_reservation_received',
                  listing_id: listingId,
                  read: false
                }
              ];

              const { error: notificationError } = await supabaseAdmin
                .from('notifications')
                .insert(notifications);

              if (notificationError) {
                console.error('Error creating notifications:', notificationError);
              } else {

              }
            } catch (notificationErr) {
              console.error('Exception creating notifications:', notificationErr);
            }

            // Send confirmation emails to buyer and seller (non-blocking)
            const userEmail = session.customer_details?.email;
            if (userEmail) {
              try {
                await sendReservationConfirmationEmail(userEmail, {
                  ...session.metadata,
                  reservation_id: reservation.id,
                  collar_color: collarColor
                });
              } catch (emailError) {
                console.error('Error sending confirmation email (non-blocking):', emailError);
                // Don't fail the webhook if email fails
              }
            }

            // Always create a conversation for reservations

            try {
              const collarInfo = collarColor && collarColor.trim()
                ? ` (${collarColor} collar)`
                : '';
              const subject = `Reservation for ${listing.title}${collarInfo}`;

              // Build the initial message
              let initialMessage = message && message.trim()
                ? `${message.trim()}\n\n`
                : 'Hi! I\'ve just reserved this puppy.\n\n';

              initialMessage += `[€50 deposit paid via secure escrow system${collarInfo ? ` for the ${collarColor} collar puppy` : ''}]`;

              // Check if conversation already exists
              const { data: existingConversation } = await supabaseAdmin
                .from('conversations')
                .select('id')
                .eq('buyer_id', userId)
                .eq('seller_id', listing.seller_id)
                .eq('listing_id', listingId)
                .eq('listing_type', 'sale')
                .single();

              if (existingConversation) {
                // Add message to existing conversation

                const { error: messageError } = await supabaseAdmin
                  .from('messages')
                  .insert({
                    conversation_id: existingConversation.id,
                    sender_id: userId,
                    recipient_id: listing.seller_id,
                    content: initialMessage,
                    message_type: 'reserve'
                  });

                if (messageError) {
                  console.error('Error adding message to existing conversation:', messageError);
                }

                // Update reservation with conversation ID
                await supabaseAdmin
                  .from('reservations')
                  .update({ conversation_id: existingConversation.id })
                  .eq('id', reservation.id);
              } else {
                // Create new conversation
                const { data: newConversation, error: conversationError } = await supabaseAdmin
                  .from('conversations')
                  .insert({
                    buyer_id: userId,
                    seller_id: listing.seller_id,
                    listing_id: listingId,
                    listing_type: 'sale',
                    subject: subject,
                    status: 'active'
                  })
                  .select()
                  .single();

                if (conversationError) {
                  console.error('Error creating conversation:', conversationError);
                } else {

                  // Create the initial message
                  const { error: messageError } = await supabaseAdmin
                    .from('messages')
                    .insert({
                      conversation_id: newConversation.id,
                      sender_id: userId,
                      recipient_id: listing.seller_id,
                      content: initialMessage,
                      message_type: 'reserve'
                    });

                  if (messageError) {
                    console.error('Error creating initial message:', messageError);
                  }

                  // Update reservation with conversation ID
                  await supabaseAdmin
                    .from('reservations')
                    .update({ conversation_id: newConversation.id })
                    .eq('id', reservation.id);
                }
              }
            } catch (error) {
              console.error('Exception creating/updating conversation:', error);
            }

            // Log successful reservation processing

            // CRITICAL: Final check - verify trigger should fire
            if (reservation.puppy_id) {

            } else {
              console.error('[WEBHOOK] ❌ Trigger will NOT fire: puppy_id is NULL/empty');
              console.error('[WEBHOOK] Check metadata extraction above - puppy_id may not be in Stripe session metadata');
            }

            // Break out of the reservation handling
            break;
          }

          // Handle listing boost checkout sessions.
          // This must run in webhook (not only on redirect pages) so boosts are consistent across devices.
          if (session.metadata?.boost_type && (session.metadata?.boost_id || session.metadata?.listing_id)) {
            try {
              const boostIdFromMeta = session.metadata?.boost_id || null;
              const listingIdFromMeta = session.metadata?.listing_id || null;
              const listingTypeFromMeta = session.metadata?.listing_type || null;
              const paymentIntentId = (session.payment_intent as string | null) || null;
              // Prefer checkout session creation time (same instant family as Stripe dashboard).
              const paidAt = new Date(
                (session.created || event.created || Math.floor(Date.now() / 1000)) * 1000,
              );

              let boostRow: {
                id: string;
                boost_type: string;
                listing_id: string;
                listing_type: string;
                payment_status: string | null;
              } | null = null;

              if (boostIdFromMeta) {
                const { data, error } = await supabaseAdmin
                  .from('boosts')
                  .select('id, boost_type, listing_id, listing_type, payment_status')
                  .eq('id', boostIdFromMeta)
                  .single();
                if (error) {
                  console.error('[WEBHOOK] boost lookup by id failed:', error);
                } else {
                  boostRow = data;
                }
              }

              if (!boostRow) {
                const { data, error } = await supabaseAdmin
                  .from('boosts')
                  .select('id, boost_type, listing_id, listing_type, payment_status')
                  .eq('stripe_session_id', session.id)
                  .maybeSingle();
                if (error) {
                  console.error('[WEBHOOK] boost lookup by stripe_session_id failed:', error);
                } else {
                  boostRow = data;
                }
              }

              if (!boostRow && listingIdFromMeta && listingTypeFromMeta) {
                const { data, error } = await supabaseAdmin
                  .from('boosts')
                  .select('id, boost_type, listing_id, listing_type, payment_status')
                  .eq('listing_id', listingIdFromMeta)
                  .eq('listing_type', listingTypeFromMeta)
                  .eq('user_id', session.metadata?.user_id || '')
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();
                if (error) {
                  console.error('[WEBHOOK] fallback boost lookup failed:', error);
                } else {
                  boostRow = data;
                }
              }

              if (!boostRow) {
                console.error('[WEBHOOK] No boost row found for checkout session:', session.id);
              } else {
                const boostType = (boostRow.boost_type || session.metadata?.boost_type || '')
                  .trim()
                  .toLowerCase();
                const { boostStart, boostEnd } = getBoostActivationWindow(boostType, paidAt);

                const { error: boostUpdateError } = await supabaseAdmin
                  .from('boosts')
                  .update({
                    payment_status: 'paid',
                    is_active: true,
                    stripe_payment_intent_id: paymentIntentId,
                    boost_start_time: boostStart,
                    boost_end_time: boostEnd,
                  })
                  .eq('id', boostRow.id);

                if (boostUpdateError) {
                  console.error('[WEBHOOK] Failed to activate boost:', boostUpdateError);
                } else {
                  const listingTable = getListingBoostTableName(boostRow.listing_type);
                  const { error: listingUpdateError } = await supabaseAdmin
                    .from(listingTable)
                    .update({ current_boost_id: boostRow.id })
                    .eq('id', boostRow.listing_id);

                  if (listingUpdateError) {
                    console.error('[WEBHOOK] Failed to attach current_boost_id to listing:', listingUpdateError);
                  }
                }
              }
            } catch (boostErr) {
              console.error('[WEBHOOK] Exception while processing listing boost checkout:', boostErr);
            }

            break;
          }

          // Handle other checkout.session.completed events (subscriptions, shop orders, etc.)
          // Get metadata from the session
          const userId = session.metadata?.user_id;
          const businessListingId = session.metadata?.business_listing_id;
          const userEmail = session.metadata?.user_email || session.customer_details?.email;

          // Handle business boost payment (legacy - using productType)
          if (session.metadata?.productType === 'business_boost' && businessListingId) {

            const paymentIntentId = session.payment_intent as string;
            const sessionId = session.id;
            const boostAmount = parseInt(session.metadata?.boost_amount || '1000', 10);
            
            if (paymentIntentId) {
              const { error: boostError } = await supabaseAdmin
                .from('business_boosts')
                .insert({
                  business_id: businessListingId,
                  user_id: userId || '',
                  stripe_payment_intent_id: paymentIntentId,
                  stripe_session_id: sessionId,
                  amount: boostAmount,
                  currency: 'EUR',
                  payment_status: 'paid',
                  boost_start_time: new Date().toISOString(),
                  is_active: true,
                });

              if (boostError) {
                console.error('Error creating business boost:', boostError);
              } else {

              }
            } else {
              console.error('No payment intent ID found in session for business boost');
            }
          }

          // Handle business listing boost payment
          if (session.metadata?.product_type === 'business_listing_boost') {
            const businessListingId = session.metadata?.business_listing_id;
            const boostAmount = parseInt(session.metadata?.boost_amount || '1000', 10);

            if (!businessListingId) {
              console.error('Missing business_listing_id in metadata for business listing boost');
            } else {
              const paymentIntentId = session.payment_intent as string;
              const sessionId = session.id;
              
              if (paymentIntentId) {
                try {
                  const { error: boostError } = await supabaseAdmin
                    .from('business_boosts')
                    .insert({
                      business_id: businessListingId,
                      user_id: userId || '',
                      stripe_payment_intent_id: paymentIntentId,
                      stripe_session_id: sessionId,
                      amount: boostAmount,
                      currency: 'EUR',
                      payment_status: 'paid',
                      boost_start_time: new Date().toISOString(),
                      is_active: true,
                    });

                  if (boostError) {
                    console.error('Error creating business listing boost:', boostError);
                  } else {

                  }
                } catch (error) {
                  console.error('Exception creating business listing boost:', error);
                }
              } else {
                console.error('No payment intent ID found in session for business listing boost');
              }
            }
          }

          // Handle marketplace product boost payment
          if (session.metadata?.product_type === 'marketplace_product_boost') {
            const productId = session.metadata?.product_id;
            const businessListingId = session.metadata?.business_listing_id;
            const boostAmount = parseInt(session.metadata?.boost_amount || '1000', 10);

            if (!productId || !businessListingId) {
              console.error('Missing product_id or business_listing_id in metadata for product boost');
            } else {
              const paymentIntentId = session.payment_intent as string;
              const sessionId = session.id;
              
              if (paymentIntentId) {
                try {
                  const { error: boostError } = await supabaseAdmin
                    .from('marketplace_product_boosts')
                    .insert({
                      product_id: productId,
                      business_id: businessListingId,
                      user_id: userId || '',
                      stripe_payment_intent_id: paymentIntentId,
                      stripe_session_id: sessionId,
                      amount: boostAmount,
                      currency: 'EUR',
                      payment_status: 'paid',
                      boost_start_time: new Date().toISOString(),
                      is_active: true,
                    });

                  if (boostError) {
                    console.error('Error creating marketplace product boost:', boostError);
                  } else {

                  }
                } catch (error) {
                  console.error('Exception creating marketplace product boost:', error);
                }
              } else {
                console.error('No payment intent ID found in session for marketplace product boost');
              }
            }
          }

          // Handle business subscription payment
          if (businessListingId && session.mode === 'subscription') {

            // Get the subscription from Stripe
            const subscriptionId = session.subscription as string;
            if (subscriptionId) {
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);
              
              // Get price ID from subscription
              const priceId = subscription.items.data[0]?.price.id;
              
              // Determine tier and billing period by comparing price ID with environment variables
              let tier: 'standard' | 'premium' | 'elite_marketplace' = 'standard';
              let billingPeriod: 'monthly' | 'annual' = 'monthly';
              
              // Get all price IDs from environment variables and match
              const standardMonthly = Deno.env.get('STRIPE_PRICE_STANDARD_BUSINESS_MONTHLY');
              const standardAnnual = Deno.env.get('STRIPE_PRICE_STANDARD_BUSINESS_ANNUAL');
              const premiumMonthly = Deno.env.get('STRIPE_PRICE_PREMIUM_BUSINESS_MONTHLY');
              const premiumAnnual = Deno.env.get('STRIPE_PRICE_PREMIUM_BUSINESS_ANNUAL');
              const eliteMonthly = Deno.env.get('STRIPE_PRICE_ELITE_MARKETPLACE_MONTHLY');
              
              // Match price ID to determine tier and billing period
              if (priceId === standardMonthly) {
                tier = 'standard';
                billingPeriod = 'monthly';
              } else if (priceId === standardAnnual) {
                tier = 'standard';
                billingPeriod = 'annual';
              } else if (priceId === premiumMonthly) {
                tier = 'premium';
                billingPeriod = 'monthly';
              } else if (priceId === premiumAnnual) {
                tier = 'premium';
                billingPeriod = 'annual';
              } else if (priceId === eliteMonthly) {
                tier = 'elite_marketplace';
                billingPeriod = 'monthly';
              } else {
                // Fallback: try to determine from subscription interval if price ID doesn't match
                console.warn('Price ID not found in environment variables, using fallback method:', priceId);
                const interval = subscription.items.data[0]?.price.recurring?.interval;
                billingPeriod = interval === 'year' ? 'annual' : 'monthly';
                
                // Try to get tier from metadata if available
                if (session.metadata?.tier) {
                  tier = session.metadata.tier as 'standard' | 'premium' | 'elite_marketplace';
                } else {
                  // Default to standard if we can't determine
                  console.warn('Could not determine tier, defaulting to standard');
                  tier = 'standard';
                }
              }

              // Get user_id from session metadata or business_listings
              let userId = session.metadata?.user_id;
              if (!userId && businessListingId) {
                // Fallback: get user_id from business_listings
                const { data: business } = await supabaseAdmin
                  .from('business_listings')
                  .select('user_id')
                  .eq('id', businessListingId)
                  .single();
                if (business) {
                  userId = business.user_id;
                }
              }

              if (!userId) {
                console.error('Could not determine user_id for subscription:', { businessListingId, sessionId: session.id });
                throw new Error('User ID is required for business subscription');
              }

              // Calculate end date
              const endDate = new Date(subscription.current_period_end * 1000).toISOString();
              const startDate = new Date(subscription.current_period_start * 1000).toISOString();

              // Get subscription amount from invoice or price
              const amountPaid = subscription.items.data[0]?.price.unit_amount 
                ? (subscription.items.data[0].price.unit_amount / 100) 
                : 0;

              // Cancel any other active subscriptions for this user
              // This ensures only one subscription is active at a time per user (prevents multiple active subscriptions)
              const { data: otherActiveSubs, error: cancelError } = await supabaseAdmin
                .from('business_subscriptions')
                .select('id, stripe_subscription_id')
                .eq('user_id', userId)
                .eq('status', 'active')
                .neq('stripe_subscription_id', subscriptionId); // Exclude current subscription

              if (cancelError) {
                console.error('Error checking for other active subscriptions:', cancelError);
                // Continue anyway - this is not critical
              } else if (otherActiveSubs && otherActiveSubs.length > 0) {
                const { error: cancelUpdateError } = await supabaseAdmin
                  .from('business_subscriptions')
                  .update({ 
                    status: 'cancelled', 
                    auto_renew: false,
                    updated_at: new Date().toISOString()
                  })
                  .in('id', otherActiveSubs.map(sub => sub.id));

                if (cancelUpdateError) {
                  console.error('Error cancelling other active subscriptions:', cancelUpdateError);
                  // Continue anyway - we'll still process the new subscription
                }
              }

              // Update or create business subscription
              const { data: existingSub, error: checkError } = await supabaseAdmin
                .from('business_subscriptions')
                .select('id')
                .eq('business_id', businessListingId)
                .maybeSingle();

              if (checkError) {
                console.error('Error checking existing subscription:', checkError);
                throw new Error(`Failed to check existing subscription: ${checkError.message}`);
              }

              if (existingSub) {
                // Update existing subscription

                const { data: updatedSub, error: updateError } = await supabaseAdmin
                  .from('business_subscriptions')
                  .update({
                    user_id: userId,
                    subscription_tier: tier,
                    billing_period: billingPeriod,
                    stripe_subscription_id: subscriptionId,
                    stripe_customer_id: subscription.customer as string,
                    stripe_price_id: priceId,
                    amount_paid: amountPaid,
                    status: 'active',
                    start_date: startDate,
                    end_date: endDate,
                    auto_renew: !subscription.cancel_at_period_end,
                  })
                  .eq('id', existingSub.id)
                  .select()
                  .single();

                if (updateError) {
                  console.error('Error updating subscription:', updateError);
                  throw new Error(`Failed to update subscription: ${updateError.message}`);
                }

              } else {
                // Create new subscription

                const { data: newSub, error: insertError } = await supabaseAdmin
                  .from('business_subscriptions')
                  .insert({
                    business_id: businessListingId,
                    user_id: userId,
                    subscription_tier: tier,
                    billing_period: billingPeriod,
                    stripe_subscription_id: subscriptionId,
                    stripe_customer_id: subscription.customer as string,
                    stripe_price_id: priceId,
                    amount_paid: amountPaid,
                    status: 'active',
                    start_date: startDate,
                    end_date: endDate,
                    auto_renew: !subscription.cancel_at_period_end,
                  })
                  .select()
                  .single();

                if (insertError) {
                  console.error('Error creating subscription:', insertError);
                  console.error('Insert error details:', JSON.stringify(insertError, null, 2));
                  throw new Error(`Failed to create subscription: ${insertError.message}`);
                }

              }

              // Update business_listings subscription_tier and billing_period
              const { error: businessUpdateError } = await supabaseAdmin
              .from('business_listings')
              .update({
                  subscription_tier: tier,
                  subscription_billing_period: billingPeriod,
                  updated_at: new Date().toISOString(),
              })
              .eq('id', businessListingId);

              if (businessUpdateError) {
                console.error('Error updating business_listings subscription_tier:', businessUpdateError);
                // Don't throw - subscription was created/updated successfully
              }

            }
          }

          // Update the order in Supabase if it exists (for regular purchases)
          if (session.metadata?.order_id) {

            const updateData: any = {
              payment_status: 'Paid',
              fulfillment_status: 'Pending',
              stripe_session_id: session.id
            };

            if (session.metadata.user_id) {
              const { data: existingOrder } = await supabaseAdmin
                .from('shop_orders')
                .select('user_id')
                .eq('id', session.metadata.order_id)
                .single();

              if (existingOrder && !existingOrder.user_id) {
                updateData.user_id = session.metadata.user_id;

              }
            }

            const { error } = await supabaseAdmin
              .from('shop_orders')
              .update(updateData)
              .eq('id', session.metadata.order_id);

            if (error) {
              console.error('Error updating order:', error);
            } else {

            }

            // Handle marketplace products if present
            if (session.metadata?.has_marketplace === 'true' && session.metadata?.marketplace_items) {

              try {
                const marketplaceItems = JSON.parse(session.metadata.marketplace_items);
                const paymentIntentId = session.payment_intent as string;
                
                if (!paymentIntentId) {
                  console.error('No payment intent ID found for marketplace products');
                  break;
                }

                // Retrieve payment intent to get the actual amount
                const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
                const totalAmount = paymentIntent.amount; // in cents

                // Process each marketplace item
                for (const item of marketplaceItems) {
                  // Extract product and business info from metadata
                  const productId = item.product_id;
                  const businessId = item.business_id;
                  const stripeAccountId = item.stripe_account_id;
                  const unitPrice = item.unit_price || item.price; // Fallback to price if unit_price not set
                  
                  if (!productId || !businessId) {
                    console.error('Missing product_id or business_id in marketplace item:', item);
                    continue;
                  }

                  const COMMISSION_AMOUNT = 100; // €1 in cents
                  const unitPriceInCents = Math.round(unitPrice * 100);
                  const totalItemAmount = unitPriceInCents * item.quantity;
                  const commissionAmount = COMMISSION_AMOUNT * item.quantity;
                  const businessPayoutAmount = totalItemAmount - commissionAmount;

                  // Create marketplace sale record first (with pending payout status)
                  let saleRecordId: string | null = null;
                  try {
                    const { data: saleRecord, error: saleError } = await supabaseAdmin
                      .from('marketplace_sales')
                      .insert({
                        product_id: productId,
                        business_id: businessId,
                        buyer_id: session.metadata.user_id || null,
                        quantity: item.quantity,
                        unit_price: unitPriceInCents,
                        total_amount: totalItemAmount,
                        commission_amount: commissionAmount,
                        business_payout_amount: businessPayoutAmount,
                        stripe_payment_intent_id: paymentIntentId,
                        stripe_transfer_id: null,
                        payment_status: 'paid',
                        payout_status: 'pending',
                      })
                      .select('id')
                      .single();

                    if (saleError) {
                      console.error('Error creating marketplace_sales record:', saleError);
                      // Continue processing even if record creation fails
                    } else {
                      saleRecordId = saleRecord?.id || null;

                    }
                  } catch (err: any) {
                    console.error('Exception creating marketplace_sales record:', err);
                  }

                  // Transfer to business Stripe Connect account
                  if (stripeAccountId && businessPayoutAmount > 0) {
                    try {
                      const transfer = await stripe.transfers.create({
                        amount: businessPayoutAmount,
                        currency: 'eur',
                        destination: stripeAccountId,
                        metadata: {
                          order_id: session.metadata.order_id || '',
                          product_id: productId,
                          business_id: businessId,
                          commission_amount: commissionAmount.toString(),
                          type: 'marketplace_sale',
                        },
                      });

                      // Update sale record with transfer ID and completed payout status
                      if (saleRecordId) {
                        try {
                          const { error: updateError } = await supabaseAdmin
                            .from('marketplace_sales')
                            .update({
                              stripe_transfer_id: transfer.id,
                              payout_status: 'completed',
                            })
                            .eq('id', saleRecordId);
                          
                          if (updateError) {
                            console.error('Error updating marketplace_sales with transfer ID:', updateError);
                          } else {

                          }
                        } catch (err: any) {
                          console.error('Exception updating marketplace_sales with transfer ID:', err);
                        }
                      }
                    } catch (transferError: any) {
                      console.error('Error creating transfer for marketplace product:', transferError);
                      
                      // Check if it's a balance insufficient error (common in test mode)
                      const isBalanceError = transferError?.code === 'balance_insufficient' || 
                                           transferError?.raw?.code === 'balance_insufficient';
                      
                      if (isBalanceError) {
                        console.warn('⚠️ Stripe balance insufficient - this is expected in test mode.');
                        console.warn('💡 To fix: Add test funds to your Stripe platform account using test card 4000000000000077');
                        console.warn('💡 See: https://stripe.com/docs/testing#available-balance');
                        console.warn('💡 The sale record is created and will be processed once funds are available.');
                      }
                      
                      // Update sale record with failed payout status
                      // In test mode with balance errors, we'll mark as 'pending' so it can be retried
                      if (saleRecordId) {
                        try {
                          const { error: updateError } = await supabaseAdmin
                            .from('marketplace_sales')
                            .update({
                              payout_status: isBalanceError ? 'pending' : 'failed',
                            })
                            .eq('id', saleRecordId);
                          
                          if (updateError) {
                            console.error('Error updating marketplace_sales payout status:', updateError);
                          } else {

                          }
                        } catch (err: any) {
                          console.error('Exception updating marketplace_sales payout status:', err);
                        }
                      }
                    }
                  } else {
                    console.warn('Skipping transfer - missing stripe_account_id or invalid payout amount:', {
                      stripe_account_id: stripeAccountId,
                      business_payout_amount: businessPayoutAmount,
                    });
                  }
                }

              } catch (marketplaceError: any) {
                console.error('Error processing marketplace products:', marketplaceError);
                // Don't fail the webhook if marketplace processing fails
              }
            }
          }
          break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;

          // Find business subscription by Stripe subscription ID
          const { data: businessSub, error: subError } = await supabaseAdmin
            .from('business_subscriptions')
            .select('*, business_listings!inner(id)')
            .eq('stripe_subscription_id', subscription.id)
            .single();

          if (businessSub) {
            // Cancel any other active subscriptions for this user
            // This ensures only one subscription is active at a time per user (prevents multiple active subscriptions)
            const userId = (businessSub as any).user_id;
            if (userId) {
              const { data: otherActiveSubs, error: cancelError } = await supabaseAdmin
                .from('business_subscriptions')
                .select('id, stripe_subscription_id')
                .eq('user_id', userId)
                .eq('status', 'active')
                .neq('stripe_subscription_id', subscription.id); // Exclude current subscription

              if (cancelError) {
                console.error('Error checking for other active subscriptions:', cancelError);
                // Continue anyway - this is not critical
              } else if (otherActiveSubs && otherActiveSubs.length > 0) {
                const { error: cancelUpdateError } = await supabaseAdmin
                  .from('business_subscriptions')
                  .update({ 
                    status: 'cancelled', 
                    auto_renew: false,
                    updated_at: new Date().toISOString()
                  })
                  .in('id', otherActiveSubs.map(sub => sub.id));

                if (cancelUpdateError) {
                  console.error('Error cancelling other active subscriptions:', cancelUpdateError);
                  // Continue anyway - we'll still process the current subscription
                }
              }
            }

            const priceId = subscription.items.data[0]?.price.id;
            let tier: 'standard' | 'premium' | 'elite_marketplace' = 'standard';
            let billingPeriod: 'monthly' | 'annual' = 'monthly';

            // Determine tier from price ID (simplified - should match your actual price IDs)
            if (priceId) {
              // This logic should match your actual Stripe price ID patterns
              // You may need to adjust based on how you name your prices
              if (priceId.includes('elite') || priceId.includes('marketplace')) {
                tier = 'elite_marketplace';
              } else if (priceId.includes('premium')) {
                tier = 'premium';
              }
            }

            if (subscription.items.data[0]?.price.recurring?.interval === 'year') {
              billingPeriod = 'annual';
            }

            const endDate = new Date(subscription.current_period_end * 1000).toISOString();
            const startDate = new Date(subscription.current_period_start * 1000).toISOString();

            await supabaseAdmin
              .from('business_subscriptions')
              .update({
                subscription_tier: tier,
                billing_period: billingPeriod,
                stripe_customer_id: subscription.customer as string,
                stripe_price_id: priceId || '',
                status: subscription.status === 'active' ? 'active' : 'cancelled',
                start_date: startDate,
                end_date: endDate,
                auto_renew: !subscription.cancel_at_period_end,
              })
              .eq('id', businessSub.id);

            // Update business_listings subscription_tier
            await supabaseAdmin
              .from('business_listings')
              .update({
                subscription_tier: tier,
              })
              .eq('id', businessSub.business_listings.id);

          }

          // Also check for vet partner subscriptions
          // (We'll implement this when we add vet partner functionality)
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;

          const { data: businessSub } = await supabaseAdmin
            .from('business_subscriptions')
            .select('id, business_id')
            .eq('stripe_subscription_id', subscription.id)
            .single();

          if (businessSub) {
            await supabaseAdmin
              .from('business_subscriptions')
              .update({
                status: 'cancelled',
                auto_renew: false,
              })
              .eq('id', businessSub.id);

            // Remove subscription_tier from business_listings
            await supabaseAdmin
              .from('business_listings')
              .update({
                subscription_tier: null,
              })
              .eq('id', businessSub.business_id);

          }
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;

          // Handle subscription invoice payments
          if (invoice.subscription) {
            const subscriptionId = invoice.subscription as string;
            const { data: businessSub } = await supabaseAdmin
              .from('business_subscriptions')
              .select('id')
              .eq('stripe_subscription_id', subscriptionId)
              .single();

            if (businessSub) {
              // Update subscription status to active if payment succeeded
              await supabaseAdmin
                .from('business_subscriptions')
                .update({
                  status: 'active',
                })
                .eq('id', businessSub.id);

            }
          }
          break;
        }

        default:

          break;
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      console.error('❌ Webhook error:', error);
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);

      // Handle signature verification errors specifically
      if (error.type === 'StripeSignatureVerificationError' || error.message?.includes('signature')) {
        console.error('🔐 Signature verification failed!');
        console.error('This usually means:');
        console.error('1. The STRIPE_WEBHOOK_SECRET in Supabase does not match the secret in Stripe Dashboard');
        console.error('2. The webhook secret was changed in Stripe but not updated in Supabase');
        console.error('3. The request body was modified before signature verification');

        return new Response(
          JSON.stringify({
            error: 'Signature verification failed',
            message: error.message,
            hint: 'Check that STRIPE_WEBHOOK_SECRET matches the webhook secret in Stripe Dashboard'
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // For other errors, return 400
      return new Response(
        JSON.stringify({
          error: error.message || 'Webhook processing failed',
          type: error.constructor.name
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } else {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
