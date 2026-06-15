import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersForRequest } from "../_shared/cors-headers.ts";

interface SubscriptionRequest {
  action: "create" | "upgrade" | "cancel" | "check";
  businessId?: string;
  tier?: "standard" | "premium" | "elite_marketplace";
  billingPeriod?: "monthly" | "annual";
  priceId?: string;
  currentSubscriptionId?: string;
}

serve(async (req) => {
  const corsHeaders = corsHeadersForRequest(req, "POST, OPTIONS");
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestBody: SubscriptionRequest = await req.json();
    const { action, businessId, tier, billingPeriod, priceId, currentSubscriptionId } = requestBody;

    if (action === "check" && businessId) {
      // Check subscription status for a business
      // First try to get active subscription
      const { data: activeSubscription, error: activeError } = await supabaseAdmin
        .from("business_subscriptions")
        .select("*")
        .eq("business_id", businessId)
        .eq("status", "active")
        .maybeSingle();

      // If no active subscription, check for any subscription (including pending)
      let subscription = activeSubscription;
      if (!activeSubscription && (!activeError || activeError.code === "PGRST116")) {
        const { data: anySubscription, error: anyError } = await supabaseAdmin
          .from("business_subscriptions")
          .select("*")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (!anyError) {
          subscription = anySubscription;
        }
      }

      if (activeError && activeError.code !== "PGRST116") {
        return new Response(JSON.stringify({ error: activeError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          subscribed: !!subscription && subscription.status === 'active', // Only 'active' status means subscribed, not 'pending'
          subscription: subscription || null,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "create" && businessId && tier && billingPeriod) {
      // Resolve priceId from environment variables if not provided
      let resolvedPriceId = priceId;
      if (!resolvedPriceId) {
        const envVarName = `STRIPE_PRICE_${tier.toUpperCase()}_BUSINESS_${billingPeriod.toUpperCase()}`;
        resolvedPriceId = Deno.env.get(envVarName) || '';
        
        if (!resolvedPriceId) {
          return new Response(JSON.stringify({ 
            error: "Price ID not configured",
            message: `Stripe price ID for ${tier} (${billingPeriod}) is not configured. Please set ${envVarName} in Supabase environment variables.`
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      // Verify business belongs to user
      const { data: business, error: businessError } = await supabaseAdmin
        .from("business_listings")
        .select("id, user_id")
        .eq("id", businessId)
        .single();

      if (businessError || !business || business.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Business not found or unauthorized" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create subscription record (Stripe checkout will be handled separately)
      // Calculate subscription dates
      const now = new Date();
      const startDate = now.toISOString();
      
      // Calculate end_date based on billing period (will be updated after payment)
      let endDate: string | null = null;
      if (billingPeriod === 'monthly') {
        const end = new Date(now);
        end.setMonth(end.getMonth() + 1);
        endDate = end.toISOString();
      } else if (billingPeriod === 'annual') {
        const end = new Date(now);
        end.setFullYear(end.getFullYear() + 1);
        endDate = end.toISOString();
      }

      const { data: subscription, error: subError } = await supabaseAdmin
        .from("business_subscriptions")
        .insert({
          business_id: businessId,
          user_id: user.id,
          subscription_tier: tier,
          billing_period: billingPeriod,
          stripe_price_id: resolvedPriceId,
          amount_paid: 0, // Will be updated after payment confirmation
          status: "pending",
          start_date: startDate, // Explicitly set start_date
          end_date: endDate, // Set end_date based on billing period
          auto_renew: true, // Default to auto-renew
        })
        .select()
        .single();

      if (subError) {
        return new Response(JSON.stringify({ error: subError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          subscription,
          message: "Subscription created. Proceed to checkout.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "upgrade" && currentSubscriptionId && tier && billingPeriod) {
      // IMPORTANT: Do NOT update subscription tier/billing_period here!
      // The subscription should only be updated AFTER payment is confirmed via webhook.
      // This function just validates the upgrade request and calculates credit.

      // Get current subscription
      const { data: currentSub, error: subError } = await supabaseAdmin
        .from("business_subscriptions")
        .select("*")
        .eq("id", currentSubscriptionId)
        .single();

      if (subError || !currentSub) {
        return new Response(JSON.stringify({ error: "Current subscription not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify business belongs to user
      const { data: business } = await supabaseAdmin
        .from("business_listings")
        .select("id, user_id")
        .eq("id", currentSub.business_id)
        .single();

      if (!business || business.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Calculate time carryover (for informational purposes only)
      const now = new Date();
      const endDate = currentSub.end_date ? new Date(currentSub.end_date) : now;
      const remainingMs = endDate.getTime() - now.getTime();
      const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

      // Calculate credit (proportional to remaining time)
      // This is a simplified calculation - adjust based on pricing tiers
      const dailyRateOld = currentSub.billing_period === "annual" 
        ? (currentSub.subscription_tier === "standard" ? 80 : currentSub.subscription_tier === "premium" ? 120 : 0) / 365
        : (currentSub.subscription_tier === "standard" ? 8 : currentSub.subscription_tier === "premium" ? 12 : 0) / 30;

      const creditAmount = dailyRateOld * remainingDays;

      // DO NOT update subscription here - let the webhook handle it after payment confirmation
      // The subscription tier/billing_period will be updated by the checkout.session.completed webhook
      // after Stripe confirms the payment

      return new Response(
        JSON.stringify({
          success: true,
          subscription: currentSub, // Return current subscription, not updated one
          creditAmount,
          remainingDays,
          message: "Subscription upgrade validated. Proceed to checkout.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "cancel" && currentSubscriptionId) {
      // Get current subscription
      const { data: currentSub, error: subError } = await supabaseAdmin
        .from("business_subscriptions")
        .select("*")
        .eq("id", currentSubscriptionId)
        .single();

      if (subError || !currentSub) {
        return new Response(JSON.stringify({ error: "Subscription not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify business belongs to user
      const { data: business } = await supabaseAdmin
        .from("business_listings")
        .select("id, user_id")
        .eq("id", currentSub.business_id)
        .single();

      if (!business || business.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Cancel subscription (set auto_renew to false, status will change to cancelled at end_date)
      const { error: cancelError } = await supabaseAdmin
        .from("business_subscriptions")
        .update({
          auto_renew: false,
        })
        .eq("id", currentSubscriptionId);

      if (cancelError) {
        return new Response(JSON.stringify({ error: cancelError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Subscription cancelled. Access continues until end date.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action or missing parameters" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
