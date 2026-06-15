import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { corsHeadersForRequest } from '../_shared/cors-headers.ts';
import { authenticateUser } from '../_shared/auth-helpers.ts';
import {
  formatBoostScheduleMessage,
  getBoostActivationWindow,
} from '../_shared/boost-activation-window.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
);

function getListingBoostTableName(
  listingType: string | null | undefined,
): 'sale_listings' | 'stud_listings' | 'showcase_listings' {
  const t = (listingType || '').toLowerCase();
  if (t === 'sale' || t === 'listing') return 'sale_listings';
  if (t === 'stud') return 'stud_listings';
  return 'showcase_listings';
}

serve(async (req) => {
  const corsHeaders = corsHeadersForRequest(req, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const auth = await authenticateUser(req);
    if (!auth.success) {
      return new Response(JSON.stringify({ error: auth.error.message }), {
        status: auth.error.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const user = auth.data.user;

    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : '';
    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'session_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({
          error: 'Payment not completed yet',
          payment_status: session.payment_status,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const meta = session.metadata || {};
    if (meta.user_id && meta.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const boostId = meta.boost_id;
    if (!boostId) {
      return new Response(JSON.stringify({ error: 'Missing boost_id on checkout session' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: boostRow, error: boostErr } = await supabaseAdmin
      .from('boosts')
      .select('id, boost_type, listing_id, listing_type, user_id, payment_status')
      .eq('id', boostId)
      .single();

    if (boostErr || !boostRow) {
      console.error('[handle-boost-payment-success] boost lookup failed:', boostErr);
      return new Response(JSON.stringify({ error: 'Boost record not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (boostRow.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paidAt = new Date((session.created || Math.floor(Date.now() / 1000)) * 1000);
    const boostType = (boostRow.boost_type || meta.boost_type || '').trim().toLowerCase();
    const { boostStart, boostEnd } = getBoostActivationWindow(boostType, paidAt);
    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent as { id?: string } | null)?.id || null;

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
      console.error('[handle-boost-payment-success] boost update failed:', boostUpdateError);
      return new Response(JSON.stringify({ error: 'Failed to activate boost' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const listingTable = getListingBoostTableName(boostRow.listing_type);
    const { error: listingUpdateError } = await supabaseAdmin
      .from(listingTable)
      .update({ current_boost_id: boostRow.id })
      .eq('id', boostRow.listing_id);

    if (listingUpdateError) {
      console.error('[handle-boost-payment-success] listing update failed:', listingUpdateError);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        boost_id: boostRow.id,
        boost_type: boostType,
        boost_start_time: boostStart,
        boost_end_time: boostEnd,
        scheduling_message: formatBoostScheduleMessage(boostType, paidAt),
        scheduled_for_future: new Date(boostStart).getTime() > paidAt.getTime() + 60_000,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[handle-boost-payment-success]', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
