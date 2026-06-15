import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import Stripe from 'https://esm.sh/stripe@11.18.0?dts';
import { corsHeadersForRequest } from '../_shared/cors-headers.ts';
import {
  countBoostsInActivationWindow,
  formatBoostScheduleMessage,
  getBoostActivationWindow,
} from '../_shared/boost-activation-window.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
);

// Boost pricing structure
const BOOST_PRICES = {
  standard: { amount: 500, currency: 'EUR' }, // €5
  premium: { amount: 1000, currency: 'EUR' }, // €10  
  elite: { amount: 1250, currency: 'EUR' }, // €12.50
  gold: { amount: 2000, currency: 'EUR' }, // €20
};

serve(async (req) => {
  const corsHeaders = corsHeadersForRequest(req, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'POST') {
    try {
      const { listing_id, listing_type, boost_type, currency = 'EUR' } = await req.json();

      if (!listing_id || !listing_type || !boost_type) {
        return new Response(JSON.stringify({ error: 'listing_id, listing_type, and boost_type are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!BOOST_PRICES[boost_type as keyof typeof BOOST_PRICES]) {
        return new Response(JSON.stringify({ error: 'Invalid boost type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check boost capacity limits
      const BOOST_LIMITS = {
        gold: 5,
        elite: 20,
        premium: 40,
        standard: null // No limit
      };

      const limit = BOOST_LIMITS[boost_type as keyof typeof BOOST_LIMITS];
      
      if (limit !== null) {
        const now = new Date();
        const { data: activeBoosts, error: countError } = await supabase
          .from('boosts')
          .select('boost_type, boost_start_time, boost_end_time')
          .eq('boost_type', boost_type)
          .eq('is_active', true)
          .eq('payment_status', 'paid');

        if (countError) {
          console.error('Error checking boost capacity:', countError);
        } else {
          const count = countBoostsInActivationWindow(activeBoosts || [], boost_type, now);
          if (count >= limit) {
            const windowLabel =
              boost_type === 'gold'
                ? 'this evening\'s 7:00 PM–11:00 PM (Irish time) window'
                : 'the current 24-hour window';
            return new Response(JSON.stringify({
              error: 'Boost capacity reached',
              message: `All ${limit} ${boost_type} boost slots are in use for ${windowLabel}. Please try again later.`,
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      }

      // Get user from auth header
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Authorization required' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !userData.user) {
        return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const user = userData.user;
      const pricing = BOOST_PRICES[boost_type as keyof typeof BOOST_PRICES];
      const origin = req.headers.get('origin') || 'https://dog-quest-shop.lovable.app';
      const purchaseTime = new Date();
      const { boostStart, boostEnd } = getBoostActivationWindow(boost_type, purchaseTime);
      const schedulingMessage = formatBoostScheduleMessage(boost_type, purchaseTime);

      // Check if customer exists in Stripe, create if not
      // IMPORTANT: With Stripe Accounts V2, we must create customer first if they don't exist
      const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
      let customerId = null;
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;

      } else {
        // Create customer if they don't exist (required for Accounts V2)

        const newCustomer = await stripe.customers.create({
          email: user.email!,
          metadata: {
            user_id: user.id,
          },
        });
        customerId = newCustomer.id;

      }

      // Create boost record first
      const boostData = {
        listing_id,
        listing_type,
        boost_type,
        user_id: user.id,
        amount: pricing.amount,
        currency: currency.toUpperCase(),
        payment_status: 'pending',
      };

      const { data: boost, error: boostError } = await supabase
        .from('boosts')
        .insert(boostData)
        .select()
        .single();

      if (boostError) {
        console.error('Error creating boost record:', boostError);
        return new Response(JSON.stringify({ error: 'Failed to create boost record' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create Stripe checkout session
      // Always use customer ID (never use customer_email with customer_creation for Accounts V2)
      const sessionConfig: any = {
        mode: 'payment',
        customer: customerId, // Always use existing customer (required for Accounts V2)
        line_items: [{
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `${boost_type.charAt(0).toUpperCase() + boost_type.slice(1)} Boost`,
              description:
                boost_type === 'gold'
                  ? schedulingMessage
                  : `${boost_type.charAt(0).toUpperCase() + boost_type.slice(1)} boost for ${listing_type} listing`,
            },
            unit_amount: pricing.amount,
          },
          quantity: 1,
        }],
        success_url: `${origin}/boost-payment-success?session_id={CHECKOUT_SESSION_ID}&boost_id=${boost.id}`,
        cancel_url: `${origin}/my-seller-dashboard/listings`,
        metadata: {
          user_id: user.id,
          user_email: user.email!,
          listing_id,
          listing_type,
          boost_type,
          boost_id: boost.id,
        },
        payment_method_types: ['card'],
      };

      const session = await stripe.checkout.sessions.create(sessionConfig);
      
      // Update boost record with Stripe session ID
      await supabase
        .from('boosts')
        .update({ stripe_session_id: session.id })
        .eq('id', boost.id);

      return new Response(JSON.stringify({
        url: session.url,
        boost_id: boost.id,
        boost_type,
        boost_start_time: boostStart,
        boost_end_time: boostEnd,
        scheduling_message: schedulingMessage,
        scheduled_for_future: new Date(boostStart).getTime() > purchaseTime.getTime() + 60_000,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Error in create-boost-payment function:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
