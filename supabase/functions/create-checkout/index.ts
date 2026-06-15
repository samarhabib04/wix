import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { authenticateUser } from "../_shared/auth-helpers.ts";
import { subscriptionCheckoutSchema, paymentCheckoutSchema, validateRequest } from "../_shared/validation-schemas.ts";
import { corsHeadersForRequest } from "../_shared/cors-headers.ts";
import { isStripeConnectReadyFromProfile } from "../_shared/stripe-connect-status.ts";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-08-27.basil',
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
);

serve(async (req) => {
  const corsHeaders = corsHeadersForRequest(req, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'POST') {
    try {
      const requestBody = await req.json();

      // Handle subscription mode
      if (requestBody.mode === 'subscription') {
        // Pre-validation check: Ensure we have at least one valid combination
        const hasPriceId = requestBody.priceId && typeof requestBody.priceId === 'string' && requestBody.priceId.trim() !== '';
        const hasTierAndPeriod = !!(requestBody.tier && requestBody.billingPeriod);
        const hasProductType = requestBody.productType && typeof requestBody.productType === 'string' && requestBody.productType.trim() !== '';

        // If we have tier+billingPeriod, validate them and skip Zod validation if valid
        if (hasTierAndPeriod) {
          const validTiers = ['standard', 'premium', 'elite_marketplace', 'vet_partner_paid'];
          const validPeriods = ['monthly', 'annual'];
          
          if (!validTiers.includes(requestBody.tier)) {
            return new Response(JSON.stringify({ 
              error: "Invalid tier",
              message: `Invalid tier value: ${requestBody.tier}. Must be one of: ${validTiers.join(', ')}`,
              details: { received: { tier: requestBody.tier, billingPeriod: requestBody.billingPeriod } }
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          if (!validPeriods.includes(requestBody.billingPeriod)) {
            return new Response(JSON.stringify({ 
              error: "Invalid billing period",
              message: `Invalid billingPeriod value: ${requestBody.billingPeriod}. Must be one of: ${validPeriods.join(', ')}`,
              details: { received: { tier: requestBody.tier, billingPeriod: requestBody.billingPeriod } }
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          // If tier+billingPeriod are valid, bypass Zod validation and proceed

          // Continue to process the request with validated tier and billingPeriod
        } else if (!hasPriceId && !hasProductType) {
          // If we don't have tier+billingPeriod, priceId, or productType, fail early
          return new Response(JSON.stringify({ 
            error: "Validation failed",
            message: "Please provide either priceId, or both tier and billingPeriod, or productType",
            details: {
              received: {
                tier: requestBody.tier,
                billingPeriod: requestBody.billingPeriod,
                priceId: requestBody.priceId,
                productType: requestBody.productType
              },
              expected: {
                option1: "priceId (string)",
                option2: "tier + billingPeriod (tier: 'standard'|'premium'|'elite_marketplace'|'vet_partner_paid', billingPeriod: 'monthly'|'annual')",
                option3: "productType (string)"
              }
            }
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Only validate with Zod if we don't have tier+billingPeriod (to handle priceId or productType cases)
        let validation: { success: boolean; data?: any; error?: string } | null = null;
        if (!hasTierAndPeriod) {

          validation = validateRequest(subscriptionCheckoutSchema, requestBody);
          if (!validation.success) {
            console.error('Subscription validation error:', validation.error);
            console.error('Request body received:', JSON.stringify(requestBody, null, 2));
            console.error('Validation details:', {
              tier: requestBody.tier,
              billingPeriod: requestBody.billingPeriod,
              priceId: requestBody.priceId,
              productType: requestBody.productType,
              tierType: typeof requestBody.tier,
              billingPeriodType: typeof requestBody.billingPeriod,
              preValidation: { hasPriceId, hasTierAndPeriod, hasProductType }
            });
            
            return new Response(JSON.stringify({ 
              error: "Validation failed",
              message: validation.error || "Please provide either priceId, or both tier and billingPeriod, or productType",
              details: {
                received: {
                  tier: requestBody.tier,
                  billingPeriod: requestBody.billingPeriod,
                  priceId: requestBody.priceId,
                  productType: requestBody.productType
                },
                expected: {
                  option1: "priceId (string)",
                  option2: "tier + billingPeriod (tier: 'standard'|'premium'|'elite_marketplace'|'vet_partner_paid', billingPeriod: 'monthly'|'annual')",
                  option3: "productType (string)"
                }
              }
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
        
        // Extract validated data - use validation.data if Zod was used, otherwise use requestBody directly
        const tier = hasTierAndPeriod ? requestBody.tier : (validation?.data?.tier || requestBody.tier);
        const billingPeriod = hasTierAndPeriod ? requestBody.billingPeriod : (validation?.data?.billingPeriod || requestBody.billingPeriod);
        const autoRenew = validation?.data?.autoRenew ?? requestBody.autoRenew ?? true;
        const businessListingId = validation?.data?.businessListingId || requestBody.businessListingId;
        const planDetails = validation?.data?.planDetails || requestBody.planDetails;
        const priceId = validation?.data?.priceId || requestBody.priceId;
        const productType = validation?.data?.productType || requestBody.productType;

        // Get price ID from environment variables based on tier and billing period
        let resolvedPriceId = priceId && priceId.trim() !== '' ? priceId : null;
        
        if (!resolvedPriceId) {
          if (tier && billingPeriod) {
            // Handle business subscription tiers
            let envVarName = '';
            // Normalize tier and period names for environment variable lookup (define outside if/else for scope)
            const normalizedTier = tier.toUpperCase().trim();
            const normalizedPeriod = billingPeriod.toUpperCase().trim();
            
            if (tier === 'vet_partner_paid') {
              envVarName = 'STRIPE_PRICE_VET_PARTNER_PAID_MONTHLY';
            } else {
              envVarName = `STRIPE_PRICE_${normalizedTier}_BUSINESS_${normalizedPeriod}`;
            }
            resolvedPriceId = Deno.env.get(envVarName) || '';
            
            // If not found with STRIPE_ prefix, try without it (PRICE_...)
            if (!resolvedPriceId && tier !== 'vet_partner_paid') {
              const envVarNameWithoutPrefix = `PRICE_${normalizedTier}_BUSINESS_${normalizedPeriod}`;
              resolvedPriceId = Deno.env.get(envVarNameWithoutPrefix) || '';
              if (resolvedPriceId) {

                envVarName = envVarNameWithoutPrefix; // Update for logging
              }
            }
            
            // If still not found, try alternative naming (without BUSINESS suffix for some tiers)
            if (!resolvedPriceId && tier !== 'vet_partner_paid') {
              const altEnvVarName = `STRIPE_PRICE_${normalizedTier}_${normalizedPeriod}`;
              resolvedPriceId = Deno.env.get(altEnvVarName) || '';
              if (resolvedPriceId) {

              } else {
                // Try without STRIPE_ prefix and without BUSINESS
                const altEnvVarNameWithoutPrefix = `PRICE_${normalizedTier}_${normalizedPeriod}`;
                resolvedPriceId = Deno.env.get(altEnvVarNameWithoutPrefix) || '';
                if (resolvedPriceId) {

                }
              }
            }
          } else if (productType === 'business_boost') {
            // Handle business boost
            resolvedPriceId = Deno.env.get('STRIPE_PRICE_BUSINESS_BOOST') || '';
          }
        }

        // Validate priceId is provided and not empty
        if (!resolvedPriceId || resolvedPriceId.trim() === '') {
          console.error('Price ID is missing or empty', { 
            tier, 
            billingPeriod, 
            priceId,
            hasTier: !!tier,
            hasBillingPeriod: !!billingPeriod,
            productType
          });
          const primaryEnvVarName = tier && billingPeriod 
            ? `STRIPE_PRICE_${tier.toUpperCase()}_BUSINESS_${billingPeriod.toUpperCase()}`
            : 'STRIPE_PRICE_BUSINESS_BOOST';
          const fallbackEnvVarName = tier && billingPeriod 
            ? `PRICE_${tier.toUpperCase()}_BUSINESS_${billingPeriod.toUpperCase()}`
            : 'PRICE_BUSINESS_BOOST';
          return new Response(JSON.stringify({ 
            error: 'Stripe price ID is required but not configured',
            message: `The Stripe price ID for ${tier || 'unknown'} (${billingPeriod || 'unknown'}) is not configured in Supabase environment variables. Please set either ${primaryEnvVarName} or ${fallbackEnvVarName}`
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get user from auth header
        const authResult = await authenticateUser(req);
        if (!authResult.success) {

          return new Response(JSON.stringify({ 
            error: 'Authentication required for subscription',
            message: 'You must be logged in to create a subscription'
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const user = authResult.data.user;

        const origin = req.headers.get('origin') || 'https://dog-quest-shop.lovable.app';
        const customerEmail = user.email;

        // Check if customer exists in Stripe, create if not
        const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
        let customerId = null;
        
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;

        } else {
          // Create customer if it doesn't exist (required for Accounts V2)

          const newCustomer = await stripe.customers.create({
            email: customerEmail,
            metadata: {
              user_id: user.id,
            },
          });
          customerId = newCustomer.id;

        }

        // Create subscription checkout session
        let sessionConfig: any = {
          mode: 'subscription',
          customer: customerId, // Always use existing customer (required for Accounts V2)
          line_items: [{
            price: resolvedPriceId,
            quantity: 1,
          }],
          success_url: `${origin}/my-business-dashboard/subscription?session_id={CHECKOUT_SESSION_ID}&success=true`,
          cancel_url: `${origin}/my-business-dashboard/subscription?cancelled=true`,
          metadata: {
            user_id: user.id,
            user_email: customerEmail,
            business_listing_id: businessListingId || '',
            auto_renew: autoRenew.toString(),
            tier: tier || '',
            billing_period: billingPeriod || '',
          },
          payment_method_types: ['card'],
          allow_promotion_codes: true,
        };

        try {
          const session = await stripe.checkout.sessions.create(sessionConfig);

          return new Response(JSON.stringify({ url: session.url }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (stripeError: any) {
          console.error('Stripe API error:', stripeError);
          return new Response(JSON.stringify({ 
            error: 'Failed to create Stripe checkout session',
            message: stripeError.message || 'An error occurred while creating the checkout session',
            details: stripeError.type || 'stripe_error'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Handle business boost payment (one-time payment)
      if (requestBody.mode === 'payment' && requestBody.productType === 'business_boost') {
        const { productType, businessListingId } = requestBody;
        
        // Get authenticated user
        const authResult = await authenticateUser(req);
        if (!authResult.success) {
          return new Response(JSON.stringify({ 
            error: 'Authentication required',
            message: 'You must be logged in to purchase a business boost'
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const user = authResult.data.user;
        const origin = req.headers.get('origin') || 'https://dog-quest-shop.lovable.app';
        const customerEmail = user.email;

        // Resolve price ID from environment variables
        const resolvedPriceId = Deno.env.get('STRIPE_PRICE_BUSINESS_BOOST') || '';
        
        if (!resolvedPriceId) {
          return new Response(JSON.stringify({ 
            error: 'Stripe price ID not configured',
            message: 'STRIPE_PRICE_BUSINESS_BOOST is not configured in Supabase environment variables'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if customer exists in Stripe, create if not
        const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
        let customerId = null;
        
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        } else {
          const newCustomer = await stripe.customers.create({
            email: customerEmail,
            metadata: { user_id: user.id },
          });
          customerId = newCustomer.id;
        }

        // Create payment checkout session for boost
        const sessionConfig: any = {
          mode: 'payment',
          customer: customerId,
          line_items: [{
            price: resolvedPriceId,
            quantity: 1,
          }],
          success_url: `${origin}/my-business-dashboard/boost?session_id={CHECKOUT_SESSION_ID}&success=true`,
          cancel_url: `${origin}/my-business-dashboard/boost?cancelled=true`,
          metadata: {
            user_id: user.id,
            user_email: customerEmail,
            business_listing_id: businessListingId || '',
            product_type: 'business_boost',
          },
          payment_method_types: ['card'],
        };

        try {
          const session = await stripe.checkout.sessions.create(sessionConfig);
          return new Response(JSON.stringify({ url: session.url }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (stripeError: any) {
          console.error('Stripe API error for boost:', stripeError);
          return new Response(JSON.stringify({ 
            error: 'Failed to create Stripe checkout session',
            message: stripeError.message || 'An error occurred while creating the checkout session',
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Handle business listing boost payment (one-time payment)
      if (requestBody.mode === 'payment' && requestBody.productType === 'business_listing_boost') {
        const { productType, businessListingId, planDetails } = requestBody;
        
        // Get authenticated user
        const authResult = await authenticateUser(req);
        if (!authResult.success) {
          return new Response(JSON.stringify({ 
            error: 'Authentication required',
            message: 'You must be logged in to purchase a business boost'
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const user = authResult.data.user;
        const origin = req.headers.get('origin') || 'https://dog-quest-shop.lovable.app';
        const customerEmail = user.email;

        // Validate business listing exists and belongs to user
        if (!businessListingId) {
          return new Response(JSON.stringify({ 
            error: 'Missing required fields',
            message: 'Business Listing ID is required'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Verify business listing exists and belongs to the user
        const { data: business, error: businessError } = await supabase
          .from('business_listings' as any)
          .select('id, name, status, admin_approved, user_id')
          .eq('id', businessListingId)
          .eq('user_id', user.id)
          .single();

        if (businessError || !business) {
          return new Response(JSON.stringify({ 
            error: 'Business not found',
            message: 'The business listing does not exist or does not belong to you'
          }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Verify business is approved
        if (business.status !== 'approved' || !business.admin_approved) {
          return new Response(JSON.stringify({ 
            error: 'Business not eligible',
            message: 'Only approved businesses can be boosted'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if business listing already has an active boost
        const { data: activeBoosts, error: boostCheckError } = await supabase
          .from('business_boosts' as any)
          .select('id')
          .eq('business_id', businessListingId)
          .eq('is_active', true)
          .eq('payment_status', 'paid');

        if (boostCheckError) {
          console.error('Error checking for active boosts:', boostCheckError);
          return new Response(JSON.stringify({ 
            error: 'Database error',
            message: 'Failed to check for existing boosts'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (activeBoosts && activeBoosts.length > 0) {
          return new Response(JSON.stringify({ 
            error: 'Already boosted',
            message: 'This business listing already has an active boost. You cannot boost it again until the current boost expires.'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get boost config from database or use defaults
        let boostAmount = 1000; // Default €10 in cents
        let boostName = 'Business Boost';
        
        const { data: boostConfig } = await supabase
          .from('business_boost_config' as any)
          .select('boost_name, boost_amount')
          .single();

        if (boostConfig) {
          boostAmount = boostConfig.boost_amount || 1000;
          boostName = boostConfig.boost_name || 'Business Boost';
        } else if (planDetails?.price) {
          // Fallback to planDetails if config not found
          boostAmount = Math.round(planDetails.price * 100);
          boostName = planDetails?.name || 'Business Boost';
        }

        // Check if customer exists in Stripe, create if not
        const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
        let customerId = null;
        
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        } else {
          const newCustomer = await stripe.customers.create({
            email: customerEmail,
            metadata: { user_id: user.id },
          });
          customerId = newCustomer.id;
        }

        // Create payment checkout session for business listing boost
        const sessionConfig: any = {
          mode: 'payment',
          customer: customerId,
          line_items: [{
            price_data: {
              currency: 'eur',
              product_data: {
                name: boostName,
                description: `Boost for ${business.name}`,
              },
              unit_amount: boostAmount,
            },
            quantity: 1,
          }],
          success_url: `${origin}/my-business-dashboard/listing?boost_success=true`,
          cancel_url: `${origin}/my-business-dashboard/listing?boost_cancelled=true`,
          metadata: {
            user_id: user.id,
            user_email: customerEmail,
            business_listing_id: businessListingId,
            product_type: 'business_listing_boost',
            boost_amount: boostAmount.toString(),
          },
          payment_method_types: ['card'],
        };

        try {
          const session = await stripe.checkout.sessions.create(sessionConfig);
          return new Response(JSON.stringify({ url: session.url }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (stripeError: any) {
          console.error('Stripe API error for business listing boost:', stripeError);
          return new Response(JSON.stringify({ 
            error: 'Failed to create Stripe checkout session',
            message: stripeError.message || 'An error occurred while creating the checkout session',
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Handle marketplace product boost payment (one-time payment)
      if (requestBody.mode === 'payment' && requestBody.productType === 'marketplace_product_boost') {
        const { productType, businessListingId, productId, planDetails } = requestBody;
        
        // Get authenticated user
        const authResult = await authenticateUser(req);
        if (!authResult.success) {
          return new Response(JSON.stringify({ 
            error: 'Authentication required',
            message: 'You must be logged in to purchase a product boost'
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const user = authResult.data.user;
        const origin = req.headers.get('origin') || 'https://dog-quest-shop.lovable.app';
        const customerEmail = user.email;

        // Validate product exists and belongs to user's business
        if (!productId || !businessListingId) {
          return new Response(JSON.stringify({ 
            error: 'Missing required fields',
            message: 'Product ID and Business Listing ID are required'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Verify product belongs to the business
        const { data: product, error: productError } = await supabase
          .from('marketplace_products' as any)
          .select('id, business_id, name, status, admin_approved, is_published')
          .eq('id', productId)
          .eq('business_id', businessListingId)
          .single();

        if (productError || !product) {
          return new Response(JSON.stringify({ 
            error: 'Product not found',
            message: 'The product does not exist or does not belong to your business'
          }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Verify product is live
        if (product.status !== 'live' || !product.admin_approved || !product.is_published) {
          return new Response(JSON.stringify({ 
            error: 'Product not eligible',
            message: 'Only live, approved, and published products can be boosted'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get boost amount from planDetails or use default
        const boostAmount = planDetails?.price ? Math.round(planDetails.price * 100) : 1000; // Default €10
        const boostName = planDetails?.name || 'Marketplace Product Boost';

        // Check if customer exists in Stripe, create if not
        const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
        let customerId = null;
        
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        } else {
          const newCustomer = await stripe.customers.create({
            email: customerEmail,
            metadata: { user_id: user.id },
          });
          customerId = newCustomer.id;
        }

        // Create payment checkout session for product boost
        const sessionConfig: any = {
          mode: 'payment',
          customer: customerId,
          line_items: [{
            price_data: {
              currency: 'eur',
              product_data: {
                name: boostName,
                description: `Boost for ${product.name}`,
              },
              unit_amount: boostAmount,
            },
            quantity: 1,
          }],
          success_url: `${origin}/my-business-dashboard/marketplace?session_id={CHECKOUT_SESSION_ID}&boost_success=true`,
          cancel_url: `${origin}/my-business-dashboard/marketplace?cancelled=true`,
          metadata: {
            user_id: user.id,
            user_email: customerEmail,
            business_listing_id: businessListingId,
            product_id: productId,
            product_type: 'marketplace_product_boost',
            boost_amount: boostAmount.toString(),
          },
          payment_method_types: ['card'],
        };

        try {
          const session = await stripe.checkout.sessions.create(sessionConfig);
          return new Response(JSON.stringify({ url: session.url }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (stripeError: any) {
          console.error('Stripe API error for product boost:', stripeError);
          return new Response(JSON.stringify({ 
            error: 'Failed to create Stripe checkout session',
            message: stripeError.message || 'An error occurred while creating the checkout session',
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Handle regular payment mode (existing shop functionality)
      // Validate payment checkout data
      const validation = validateRequest(paymentCheckoutSchema, {
        cartItems: requestBody.cartItems,
        shippingInfo: requestBody.shippingInfo,
        currency: requestBody.currency,
        discount: requestBody.discount
      });
      
      if (!validation.success) {
        console.error('Payment validation error:', validation.error);
        return new Response(JSON.stringify({ error: validation.error }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const { cartItems, shippingInfo, currency, discount } = validation.data;

      // Separate marketplace products from admin products
      const marketplaceItems: any[] = [];
      const adminItems: any[] = [];
      let marketplaceMetadata: any = {};
      let marketplaceProducts: any[] = []; // Declare outside if block for shipping calculation
      
      for (const item of cartItems) {
        if (item.slug && item.slug.startsWith('marketplace-')) {
          marketplaceItems.push(item);
        } else {
          adminItems.push(item);
        }
      }

      // If there are marketplace products, we need to handle them separately
      if (marketplaceItems.length > 0) {
        // Fetch marketplace product details and business Stripe accounts
        const marketplaceProductIds = marketplaceItems.map(item => {
          const slug = item.slug || '';
          return slug.replace('marketplace-', '');
        });

        // First, fetch marketplace products with basic info including shipping
        const { data: fetchedMarketplaceProducts, error: mpError } = await supabase
          .from('marketplace_products' as any)
          .select(`
            id,
            shipping_cost,
            shipping_required,
            business_id,
            business_listings!inner (
              id,
              user_id
            )
          `)
          .in('id', marketplaceProductIds)
          .eq('admin_approved', true)
          .eq('is_published', true)
          .eq('is_active', true);

        if (mpError) {
          console.error('Error fetching marketplace products:', mpError);
          return new Response(JSON.stringify({ 
            error: 'Invalid marketplace products',
            message: `Database error: ${mpError.message || 'Failed to fetch marketplace products'}`,
            details: mpError
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Assign fetched products to the outer variable
        marketplaceProducts = fetchedMarketplaceProducts || [];

        if (!marketplaceProducts || marketplaceProducts.length === 0) {
          console.error('No marketplace products found:', {
            requestedIds: marketplaceProductIds,
            foundCount: marketplaceProducts?.length || 0
          });
          return new Response(JSON.stringify({ 
            error: 'Invalid marketplace products',
            message: 'No marketplace products found matching the requested IDs. Products may not be approved, active, or may not exist.',
            requestedIds: marketplaceProductIds
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (marketplaceProducts.length !== marketplaceProductIds.length) {
          console.warn('Some marketplace products not found:', {
            requested: marketplaceProductIds.length,
            found: marketplaceProducts.length,
            foundIds: marketplaceProducts.map((mp: any) => mp.id)
          });
        }

        // Fetch user profiles for all business owners to check Stripe Connect status
        const businessUserIds = [...new Set(marketplaceProducts.map((mp: any) => mp.business_listings?.user_id).filter(Boolean))];
        
        let userProfilesMap = new Map();
        if (businessUserIds.length > 0) {
          const { data: userProfiles, error: profilesError } = await supabase
            .from('user_profiles')
            .select('id, stripe_account_id, stripe_onboarding_completed, payout_enabled, stripe_charges_enabled')
            .in('id', businessUserIds);
          
          if (profilesError) {
            console.error('Error fetching user profiles:', profilesError);
            return new Response(JSON.stringify({ 
              error: 'Database error',
              message: `Failed to fetch user profiles: ${profilesError.message || 'Unknown error'}`,
              details: profilesError
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          } else if (userProfiles) {
            userProfiles.forEach((profile: any) => {
              userProfilesMap.set(profile.id, profile);
            });
          }
        }

        // Check if all businesses have Stripe Connect set up using userProfilesMap
        const businessesWithoutStripe = marketplaceProducts.filter((mp: any) => {
          const userId = mp.business_listings?.user_id;
          const userProfile = userId ? userProfilesMap.get(userId) : null;
          
          if (!userProfile) {
            console.warn('No user profile found for business:', {
              businessId: mp.business_id,
              userId: userId
            });
            return true;
          }
          
          const hasStripeSetup = isStripeConnectReadyFromProfile(userProfile);
          
          if (!hasStripeSetup) {
            console.warn('Business missing Stripe Connect setup:', {
              businessId: mp.business_id,
              userId: userId,
              hasAccountId: !!userProfile.stripe_account_id,
              onboardingCompleted: userProfile.stripe_onboarding_completed,
              payoutEnabled: userProfile.payout_enabled,
              chargesEnabled: userProfile.stripe_charges_enabled,
            });
          }
          
          return !hasStripeSetup;
        });

        if (businessesWithoutStripe.length > 0) {
          const businessDetails = businessesWithoutStripe.map((mp: any) => {
            const userId = mp.business_listings?.user_id;
            const userProfile = userId ? userProfilesMap.get(userId) : null;
            return {
              productId: mp.id,
              productName: mp.name,
              businessId: mp.business_id,
              userId: userId,
              stripeAccountId: userProfile?.stripe_account_id || null,
              onboardingCompleted: userProfile?.stripe_onboarding_completed || false,
              payoutEnabled: userProfile?.payout_enabled || false,
              chargesEnabled: userProfile?.stripe_charges_enabled || false,
            };
          });
          
          console.error('Businesses without Stripe Connect setup:', businessDetails);
          
          return new Response(JSON.stringify({ 
            error: 'Business payment setup required',
            message: 'One or more businesses have not completed their payment setup',
            details: businessDetails
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Group marketplace items by business (for Stripe Connect transfers)
        const itemsByBusiness = new Map<string, any[]>();
        const businessStripeAccounts = new Map<string, string>();

        for (const mp of marketplaceProducts) {
          const businessId = mp.business_id;
          const userId = mp.business_listings?.user_id;
          const userProfile = userId ? userProfilesMap.get(userId) : null;
          const stripeAccountId = userProfile?.stripe_account_id || null;
          
          if (!itemsByBusiness.has(businessId)) {
            itemsByBusiness.set(businessId, []);
            businessStripeAccounts.set(businessId, stripeAccountId);
          }

          const cartItem = marketplaceItems.find(item => {
            const itemId = (item.slug || '').replace('marketplace-', '');
            return itemId === mp.id;
          });

          if (cartItem) {
            itemsByBusiness.get(businessId)!.push({
              ...cartItem,
              marketplaceProduct: mp,
            });
          }
        }

        // For now, we'll handle marketplace products in the webhook
        // Store marketplace product info in metadata for webhook processing
        // Include all necessary fields for webhook to process sales
        const marketplaceItemsWithDetails = marketplaceItems.map(item => {
          const itemId = (item.slug || '').replace('marketplace-', '');
          const mp = marketplaceProducts.find((p: any) => p.id === itemId);
          const userId = mp?.business_listings?.user_id;
          const userProfile = userId ? userProfilesMap.get(userId) : null;
          
          return {
            id: item.id,
            slug: item.slug,
            product_id: itemId,
            business_id: mp?.business_id || null,
            stripe_account_id: userProfile?.stripe_account_id || null,
            quantity: item.quantity,
            price: item.price,
            unit_price: item.price, // Price per unit
          };
        });

        // Update the outer marketplaceMetadata variable
        marketplaceMetadata = {
          has_marketplace: 'true',
          marketplace_businesses: JSON.stringify(Array.from(itemsByBusiness.keys())),
          marketplace_items: JSON.stringify(marketplaceItemsWithDetails),
        };

        // Continue with regular checkout flow, but add marketplace metadata
        // The webhook will handle the Stripe Connect transfers
      }

      const origin = req.headers.get('origin') || 'https://dog-quest-shop.lovable.app';
      const customerEmail = shippingInfo.email;

      // Get authenticated user for payment mode
      const authHeader = req.headers.get('Authorization');
      let authenticatedUser = null;

      if (authHeader) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const { data: userData, error: userError } = await supabase.auth.getUser(token);
          
          if (!userError && userData.user) {
            authenticatedUser = userData.user;

          }
        } catch {
          // Continue as guest on auth error
        }
      }

      // Check if customer exists in Stripe, create if not (required for Accounts V2)
      const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
      let existingCustomerId = null;
      
      if (customers.data.length > 0) {
        const existingCustomer = customers.data[0];
        if (existingCustomer.email === customerEmail) {
          existingCustomerId = existingCustomer.id;

        }
      } else {
        // Create customer if it doesn't exist (required for Accounts V2)

        const newCustomer = await stripe.customers.create({
          email: customerEmail,
          metadata: authenticatedUser ? {
            user_id: authenticatedUser.id,
          } : {},
        });
        existingCustomerId = newCustomer.id;

      }

      // Currency conversion rates
      const EXCHANGE_RATES = {
        EUR: 1,
        GBP: 0.85,
      };

      const convertPrice = (priceInEUR: number, currency: string): number => {
        if (currency === 'EUR') return priceInEUR;
        if (currency === 'GBP') return priceInEUR * EXCHANGE_RATES.GBP;
        return priceInEUR;
      };

      // Calculate shipping cost
      // For marketplace products: Use shipping_cost from database (marketplace_products table)
      // For DogQuest products: €5 for collars, free otherwise
      const businessShipping = new Map<string, number>();
      let dogQuestShipping = 0;
      
      // Create a map of marketplace products from database for shipping lookup
      const marketplaceProductsMap = new Map();
      if (marketplaceItems.length > 0 && marketplaceProducts && marketplaceProducts.length > 0) {
        marketplaceProducts.forEach((mp: any) => {
          marketplaceProductsMap.set(mp.id, mp);
        });
      } else {
        console.warn('⚠️ Marketplace products map not created:', {
          marketplaceItems_length: marketplaceItems.length,
          marketplaceProducts_exists: !!marketplaceProducts,
          marketplaceProducts_length: marketplaceProducts?.length || 0
        });
      }
      
      cartItems.forEach((item: any) => {
        // Check if it's a marketplace product
        if (item.is_marketplace && item.business_id) {
          // Try multiple ways to find the product in the map
          const itemIdFromSlug = (item.slug || '').replace('marketplace-', '');
          const itemIdFromId = item.id;
          
          // Try to find product by slug-extracted ID first, then by item.id
          let dbProduct = marketplaceProductsMap.get(itemIdFromSlug);
          if (!dbProduct && itemIdFromId) {
            dbProduct = marketplaceProductsMap.get(itemIdFromId);
          }
          
          // If still not found, try to find by iterating (fallback)
          if (!dbProduct && marketplaceProductsMap.size > 0) {
            for (const [id, product] of marketplaceProductsMap.entries()) {
              if (id === itemIdFromSlug || id === itemIdFromId) {
                dbProduct = product;
                break;
              }
            }
          }
          
          // Convert shipping_cost to number, handle null/undefined
          let shipping = 0;
          if (dbProduct?.shipping_cost !== null && dbProduct?.shipping_cost !== undefined) {
            shipping = Number(dbProduct.shipping_cost) || 0;
          } else if (item.shipping_cost !== null && item.shipping_cost !== undefined) {
            shipping = Number(item.shipping_cost) || 0;
          }
          
          // Handle shipping_required - default to true if not specified
          const shippingRequired = dbProduct?.shipping_required !== undefined 
            ? (dbProduct.shipping_required !== false && dbProduct.shipping_required !== null)
            : (item.shipping_required !== false && item.shipping_required !== null);
          
          if (shippingRequired && shipping > 0) {
            // Use highest shipping cost if multiple products from same business
            if (!businessShipping.has(item.business_id)) {
              businessShipping.set(item.business_id, shipping);

            } else {
              const current = businessShipping.get(item.business_id) || 0;
              const newAmount = Math.max(current, shipping);
              businessShipping.set(item.business_id, newAmount);

            }
          } else {

          }
        } else {
          // DogQuest product - check for collars
          const isCollar = item.title?.toLowerCase().includes('collar') || 
                          (item.slug && item.slug.toLowerCase().includes('collar'));
          if (isCollar) {
            dogQuestShipping = 5; // €5 for collars

          }
        }
      });
      
      // Sum all business shipping costs
      let totalBusinessShipping = 0;
      businessShipping.forEach((cost, businessId) => {
        totalBusinessShipping += cost;

      });
      
      const shippingCost = totalBusinessShipping + dogQuestShipping;
      const convertedShippingCost = convertPrice(shippingCost, currency);

      // Handle regular product checkout with currency conversion
      const line_items = cartItems.map((item: any) => {
        const convertedPrice = convertPrice(item.price, currency);
        
        // Properly encode image URLs to handle spaces and special characters
        const encodedImageUrl = item.image ? encodeURI(item.image) : null;
        
        return {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: item.title,
              images: encodedImageUrl ? [encodedImageUrl] : [],
              metadata: {
                product_id: item.id || '', // Add product ID to metadata
                slug: item.slug || '',     // Add slug for reference
              },
            },
            unit_amount: Math.round(convertedPrice * 100),
          },
          quantity: item.quantity,
        };
      });

      // Note: Shipping will be added via shipping_options in Stripe session config
      // This is the standard Stripe way and ensures shipping is properly displayed

      // Calculate total price including discount
      let totalPrice = cartItems.reduce((sum: number, item: any) => {
        const convertedPrice = convertPrice(item.price, currency);
        return sum + (convertedPrice * item.quantity);
      }, 0);

      // Apply discount if present
      if (discount) {
        let discountAmount = 0;
        if (discount === true) {
          discountAmount = totalPrice * 0.1;
        } else if (typeof discount === 'object' && discount.percentOff) {
          discountAmount = totalPrice * (discount.percentOff / 100);
        }
        totalPrice = totalPrice - discountAmount;
      }

      // Add shipping cost to total
      totalPrice = totalPrice + convertedShippingCost;

      // Store order in database for regular purchases - now with user_id if authenticated
      const orderData: any = {
        guest_email: customerEmail,
        order_items: cartItems,
        shipping_info: shippingInfo,
        total_price: totalPrice,
        currency: currency,
        payment_status: 'Pending',
        fulfillment_status: 'Pending',
      };

      // Add user_id if user is authenticated
      if (authenticatedUser) {
        orderData.user_id = authenticatedUser.id;

      } else {

      }

      const { data: order, error: orderError } = await supabase
        .from('shop_orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        return new Response(JSON.stringify({ error: 'Failed to create order in database' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify shipping line item is included
      let sessionConfig: any = {
        mode: 'payment',
        line_items,
        success_url: `${origin}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/cart`,
        metadata: {
          user_email: customerEmail,
          order_id: order.id,
          currency: currency,
        },
        payment_method_types: ['card'],
      };

      // Add shipping address collection
      sessionConfig.shipping_address_collection = {
        allowed_countries: ['IE', 'GB'],
      };
      
      // Add shipping options with the actual shipping cost
      // This is the standard Stripe way to handle shipping
      if (convertedShippingCost > 0) {
        sessionConfig.shipping_options = [
          {
            shipping_rate_data: {
              type: 'fixed_amount',
              fixed_amount: {
                amount: Math.round(convertedShippingCost * 100), // Convert to cents
                currency: currency.toLowerCase(),
              },
              display_name: 'Standard Shipping',
              delivery_estimate: {
                minimum: { unit: 'business_day', value: 2 },
                maximum: { unit: 'business_day', value: 5 },
              },
            },
          },
        ];
      } else {
        // Free shipping option
        sessionConfig.shipping_options = [
          {
            shipping_rate_data: {
              type: 'fixed_amount',
              fixed_amount: {
                amount: 0,
                currency: currency.toLowerCase(),
              },
              display_name: 'Free shipping',
              delivery_estimate: {
                minimum: { unit: 'business_day', value: 2 },
                maximum: { unit: 'business_day', value: 5 },
              },
            },
          },
        ];

      }

      // Add user_id to metadata if user is authenticated
      if (authenticatedUser) {
        sessionConfig.metadata.user_id = authenticatedUser.id;
      }

      // Merge marketplace metadata if present
      if (marketplaceMetadata && Object.keys(marketplaceMetadata).length > 0) {
        sessionConfig.metadata = {
          ...sessionConfig.metadata,
          ...marketplaceMetadata,
        };
      }

      // Always use existing customer (required for Accounts V2)
      sessionConfig.customer = existingCustomerId;

      // Check if there are collars in the cart (for logging purposes)
      const session = await stripe.checkout.sessions.create(sessionConfig);

      if (!session.url) {
        console.error('No URL returned from Stripe session');
        return new Response(JSON.stringify({ error: 'Failed to create checkout session URL' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update order with Stripe session ID
      await supabase
        .from('shop_orders')
        .update({ stripe_session_id: session.id })
        .eq('id', order.id);

      return new Response(JSON.stringify({ url: session.url }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Error in create-checkout function:', error);
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
