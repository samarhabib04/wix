'use client';

import { useState, useEffect } from "react";
import { CheckIcon, RefreshCw, ArrowUpRight, Globe, Share2, BarChart3, Star, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

interface SubscriptionTier {
  id: 'standard' | 'premium' | 'elite_marketplace';
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  monthlyPriceId: string; // Will be set from env vars
  annualPriceId: string; // Will be set from env vars
  features: string[];
  popular?: boolean;
}

export default function BusinessSubscriptionPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'standard' | 'premium' | 'elite_marketplace' | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'annual'>('annual');
  const [selectedTierPeriod, setSelectedTierPeriod] = useState<{tier: 'standard' | 'premium' | 'elite_marketplace', period: 'monthly' | 'annual'} | null>(null);
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);
  const [businessSlug, setBusinessSlug] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<{
    subscribed: boolean;
    tier: 'standard' | 'premium' | 'elite_marketplace' | null;
    billingPeriod: 'monthly' | 'annual' | null;
    endDate: string | null;
    daysUntilExpiry: number;
  } | null>(null);

  // Subscription tiers configuration
  // Note: Price IDs are handled by the edge function, not frontend
  const tiers: SubscriptionTier[] = [
    {
      id: 'standard',
      name: 'Standard Business',
      description: 'Basic visibility in Dog Services',
      monthlyPrice: 8,
      annualPrice: 80,
      monthlyPriceId: '', // Handled by edge function
      annualPriceId: '', // Handled by edge function
      features: [
        'Appears in Dog Services',
        'Basic profile visibility',
        'Contact information display',
      ],
    },
    {
      id: 'premium',
      name: 'Premium Business',
      description: 'Enhanced visibility with reviews and analytics',
      monthlyPrice: 12,
      annualPrice: 120,
      monthlyPriceId: '', // Handled by edge function
      annualPriceId: '', // Handled by edge function
      features: [
        'Priority placement in Dog Services',
        'Reviews enabled',
        'Enquiry/contact form',
        'Social media handles displayed',
        'Eligibility for promotions and boosts',
        'About Us section with gallery images',
      ],
      popular: true,
    },
    {
      id: 'elite_marketplace',
      name: 'Elite Marketplace',
      description: 'Premium features + Marketplace access',
      monthlyPrice: 15,
      annualPrice: 150, // Annual pricing available
      monthlyPriceId: '', // Handled by edge function
      annualPriceId: '',
      features: [
        'All Premium features',
        'Marketplace access',
        'Sell physical dog products',
        'Stripe Connect integration',
        '€1 commission per sale',
        'About Us section with gallery images',
      ],
    },
  ];

  // Get user's business listing
  useEffect(() => {
    const fetchBusiness = async () => {
      if (!user) return;

      const { data: business, error } = await supabase
        .from('business_listings')
        .select('id, slug')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching business:', error);
        return;
      }

      if (business) {
        setCurrentBusinessId(business.id);
        setBusinessSlug(business.slug || null);
        checkSubscriptionStatus();
      }
    };

    fetchBusiness();
  }, [user]);

  // Handle success/cancel from URL params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('success') === 'true') {
        toast({
          title: "Payment Successful!",
          description: "Your subscription is being updated. Please wait...",
        });
        // Refresh subscription status immediately and again after delay (webhook might be delayed)
        checkSubscriptionStatus();
          // Refresh again after 3 seconds in case webhook is delayed
          setTimeout(() => {

          checkSubscriptionStatus();
          }, 3000);
          // One more refresh after 10 seconds to catch delayed webhooks
          setTimeout(() => {

          checkSubscriptionStatus();
          }, 10000);
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      } else if (params.get('cancelled') === 'true') {
        toast({
          title: "Checkout Cancelled",
          description: "Your subscription checkout was cancelled.",
          variant: "default",
        });
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [currentBusinessId]);

  // Refresh subscription when page becomes visible (user returns from Stripe)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {

        checkSubscriptionStatus();
      }
    };

    const handleFocus = () => {

      checkSubscriptionStatus();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentBusinessId]);

  // Check subscription status
  const checkSubscriptionStatus = async () => {
    if (!user?.id) {
      setRefreshing(false);
      return;
    }

    setRefreshing(true);
    try {

      // Query business_subscriptions table by user_id only
      // Only fetch active subscriptions for consistency
      const { data: subscription, error: subError } = await supabase
        .from('business_subscriptions' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!subError && subscription) {
        // Found subscription record
        const sub = subscription as any;
        const endDate = sub.end_date ? new Date(sub.end_date) : null;
        const daysUntilExpiry = endDate
          ? Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        setSubscriptionData({
          subscribed: sub.status === 'active',
          tier: sub.subscription_tier || null,
          billingPeriod: sub.billing_period || null,
          endDate: sub.end_date || null,
          daysUntilExpiry,
        });
            } else {
        // No subscription found

            setSubscriptionData({
              subscribed: false,
              tier: null,
              billingPeriod: null,
              endDate: null,
              daysUntilExpiry: 0,
            });
      }
    } catch (error: any) {
      console.error('Error checking subscription:', error);
      toast({
        title: "Error",
        description: "Failed to check subscription status. Please try refreshing.",
        variant: "destructive",
      });
      setSubscriptionData({
        subscribed: false,
        tier: null,
        billingPeriod: null,
        endDate: null,
        daysUntilExpiry: 0,
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubscribe = async () => {

    if (!selectedTier || !currentBusinessId) {

      toast({
        title: "Error",
        description: "Please select a subscription tier and ensure you have a business listing.",
        variant: "destructive",
      });
      return;
    }

    const tier = tiers.find(t => t.id === selectedTier);
    if (!tier) {

      return;
    }

    setProcessing(true);

    try {
      // IMPORTANT: Do NOT create subscription record before payment!
      // Subscription will only be created after payment confirmation via Stripe webhook.
      // This prevents users from getting active subscriptions without paying.
      
      // Create Stripe checkout session
      // Price ID will be resolved by the edge function based on tier and period

      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-checkout', {
        body: {
          mode: 'subscription',
          tier: selectedTier,
          billingPeriod: selectedPeriod,
          autoRenew: true,
          businessListingId: currentBusinessId,
          planDetails: {
            id: selectedTier,
            name: tier.name,
            price: selectedPeriod === 'monthly' ? tier.monthlyPrice : tier.annualPrice,
            duration: selectedPeriod,
          },
        },
      });

      if (checkoutError) {
        console.error('Error from create-checkout:', checkoutError);
        // Extract error message from edge function response
        const errorMessage = checkoutError.message || checkoutError.error || 'Failed to create checkout session';
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        setProcessing(false);
        return;
      }

      // Check if checkoutData contains an error (edge functions can return errors in data field)
      if (checkoutData?.error) {
        console.error('Checkout data contains error:', checkoutData.error);
        const errorMsg = checkoutData.error || checkoutData.message || 'Failed to create checkout session';
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
        setProcessing(false);
        return;
      }

      if (checkoutData?.url) {

        window.location.href = checkoutData.url;
      } else {
        console.error('No checkout URL in response:', checkoutData);
        toast({
          title: "Error",
          description: "No checkout URL returned from server",
          variant: "destructive",
        });
        setProcessing(false);
      }
    } catch (error: any) {
      console.error('Subscription checkout failed:', error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

  const handleUpgrade = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to upgrade your subscription.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedTier || !currentBusinessId) {

      toast({
        title: "Error",
        description: "Please select a subscription tier to upgrade to.",
        variant: "destructive",
      });
      return;
    }

    // Allow upgrade even if subscription status is pending (user just purchased)
    if (!subscriptionData?.subscribed && subscriptionData?.tier === null) {

      // If no subscription at all, use subscribe flow instead
      handleSubscribe();
      return;
    }

    // Get current subscription ID by user_id - only active subscriptions for consistency
    const { data: currentSub, error: subError } = await supabase
        .from('business_subscriptions' as any)
      .select('id, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError || !currentSub || ('error' in currentSub)) {
      console.error('Subscription not found, error:', subError);
      // If no subscription record but we have tier data, try subscribe flow
      if (subscriptionData?.tier) {

        handleSubscribe();
        return;
      }
      toast({
        title: "Error",
        description: "Current subscription not found. Please try subscribing first.",
        variant: "destructive",
      });
      return;
    }

    const tier = tiers.find(t => t.id === selectedTier);
    if (!tier) {
      console.error('Tier not found:', selectedTier);
      return;
    }

    setProcessing(true);
    try {
      // Calculate upgrade with time carryover
      // Price ID will be resolved by edge function from Supabase environment variables
      const { data: upgradeData, error: upgradeError } = await supabase.functions.invoke('manage-business-subscription', {
        body: {
          action: 'upgrade',
          currentSubscriptionId: (currentSub as any).id,
          tier: selectedTier,
          billingPeriod: selectedPeriod,
          // priceId will be resolved by edge function from Supabase environment variables
        },
      });
      if (upgradeError) {
        console.error('Upgrade error:', upgradeError);
        // Check if error has a message property
        const errorMessage = upgradeError.message || upgradeError.error || JSON.stringify(upgradeError);
        throw new Error(errorMessage);
      }

      // Check if upgradeData contains an error
      if (upgradeData?.error) {
        console.error('Upgrade data contains error:', upgradeData.error);
        throw new Error(upgradeData.error || upgradeData.message || 'Upgrade failed');
      }

      // Create Stripe checkout session for upgrade
      // Price ID will be resolved by the edge function based on tier and period

      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-checkout', {
        body: {
          mode: 'subscription',
          tier: selectedTier,
          billingPeriod: selectedPeriod,
          autoRenew: true,
          businessListingId: currentBusinessId,
          planDetails: {
            id: selectedTier,
            name: tier.name,
            price: selectedPeriod === 'monthly' ? tier.monthlyPrice : tier.annualPrice,
            duration: selectedPeriod,
          },
        },
      });

      if (checkoutError) {
        console.error('Checkout error:', checkoutError);
        const errorMessage = checkoutError.message || checkoutError.error || JSON.stringify(checkoutError);
        throw new Error(errorMessage);
      }

      // Check if checkoutData contains an error (edge functions can return errors in data field)
      if (checkoutData?.error) {
        console.error('Checkout data contains error:', checkoutData.error);
        const errorMsg = checkoutData.error || checkoutData.message || 'Failed to create checkout session';
        throw new Error(errorMsg);
      }

      if (checkoutData?.url) {

        window.location.href = checkoutData.url;
      } else {
        console.error('No checkout URL in response:', checkoutData);
        throw new Error('No checkout URL returned from server');
      }
    } catch (error: any) {
      console.error('Upgrade failed with error:', error);
      console.error('Error details:', {
        message: error?.message,
        error: error?.error,
        fullError: error,
      });
      
      // Extract error message from various possible formats
      let errorMessage = 'Failed to process upgrade. Please try again.';
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error) {
        errorMessage = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

  const calculateSavings = (tier: SubscriptionTier) => {
    if (selectedPeriod === 'annual' && tier.annualPrice > 0) {
      const monthlyTotal = tier.monthlyPrice * 12;
      const savings = monthlyTotal - tier.annualPrice;
      const percentage = Math.round((savings / monthlyTotal) * 100);
      return { amount: savings, percentage };
    }
    return null;
  };

  if (!currentBusinessId) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              You need to create a business listing first before subscribing.
            </p>
            <Button
              className="mt-4"
              onClick={() => router.push('/my-business-dashboard/listing')}
            >
              Create Business Listing
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Value Proposition Banner */}
      <Card className="bg-gradient-to-r from-brand-soft-green/10 to-brand-light-green/10 border-brand-soft-green">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="rounded-full bg-brand-soft-green p-3 flex-shrink-0">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold mb-2 break-words">Professional Online Presence Without Building a Website</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 break-words">
                Your DogQuest profile acts as a standalone web page. Share your profile URL directly on social media, 
                WhatsApp, Google, and printed materials. No need to design a site or maintain hosting.
              </p>
              {subscriptionData?.subscribed && businessSlug && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-4">
                  <Badge variant="outline" className="font-mono text-xs sm:text-sm break-all px-2 py-1">
                    {typeof window !== 'undefined' && window.location.origin}/services/{businessSlug}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0"
                    onClick={() => {
                      const url = `${window.location.origin}/services/${businessSlug}`;
                      navigator.clipboard.writeText(url);
                      toast({
                        title: "Copied!",
                        description: "Profile URL copied to clipboard",
                      });
                    }}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Copy URL
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg sm:text-xl">Current Subscription</CardTitle>
              <CardDescription className="break-words">
                {subscriptionData?.tier
                  ? subscriptionData.subscribed
                    ? `Active ${subscriptionData.tier === 'standard' ? 'standard' : subscriptionData.tier === 'premium' ? 'premium' : 'elite marketplace'} plan`
                    : `Pending ${subscriptionData.tier === 'standard' ? 'standard' : subscriptionData.tier === 'premium' ? 'premium' : 'elite marketplace'} plan`
                  : 'No active subscription'}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="flex-shrink-0"
              onClick={() => checkSubscriptionStatus()}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {subscriptionData?.subscribed ? (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="font-medium text-sm sm:text-base">Tier:</span>
                <Badge className="break-words text-xs sm:text-sm">
                  {subscriptionData.tier === 'standard' 
                    ? 'Standard Business' 
                    : subscriptionData.tier === 'premium' 
                      ? 'Premium Business' 
                      : subscriptionData.tier === 'elite_marketplace'
                        ? 'Elite Marketplace'
                        : subscriptionData.tier || 'Unknown'}
                </Badge>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="font-medium text-sm sm:text-base">Billing:</span>
                <span className="capitalize text-sm sm:text-base break-words">{subscriptionData.billingPeriod || 'Not specified'}</span>
              </div>
              {subscriptionData.endDate && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="font-medium text-sm sm:text-base">Expires:</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm sm:text-base">
                      {new Date(subscriptionData.endDate).toLocaleDateString()}
                    </span>
                    {subscriptionData.daysUntilExpiry <= 30 && subscriptionData.daysUntilExpiry > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        Expiring in {subscriptionData.daysUntilExpiry} days
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm sm:text-base text-muted-foreground break-words">
              Subscribe to access premium business features and increase your visibility.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Billing Period Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant={selectedPeriod === 'monthly' ? 'default' : 'outline'}
              onClick={() => setSelectedPeriod('monthly')}
              className="flex-1 text-sm sm:text-base"
            >
              Monthly
            </Button>
            <Button
              variant={selectedPeriod === 'annual' ? 'default' : 'outline'}
              onClick={() => setSelectedPeriod('annual')}
              className="flex-1 text-sm sm:text-base"
            >
              <span className="flex items-center justify-center gap-2">
                Annual
                <Badge variant="secondary" className="text-xs">
                  Save up to 17%
                </Badge>
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Tiers */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tiers.map((tier) => {
          // Check if this specific tier + period combination is selected
          // Only select if both tier matches AND the period matches the current selectedPeriod
          const isSelected = selectedTierPeriod !== null && 
            selectedTierPeriod.tier === tier.id && 
            selectedTierPeriod.period === selectedPeriod;
          const price = selectedPeriod === 'monthly' ? tier.monthlyPrice : tier.annualPrice;
          const savings = calculateSavings(tier);
          // Only show "Current Plan" if user has an active subscription AND tier matches AND billing period matches
          const isCurrentTier = subscriptionData?.subscribed === true && 
            subscriptionData?.tier === tier.id &&
            subscriptionData?.billingPeriod === selectedPeriod;
          const currentTier = subscriptionData?.tier;
          const isUpgrade = subscriptionData?.subscribed && currentTier !== null && currentTier !== undefined && 
            ((tier.id === 'premium' && currentTier === 'standard') ||
            (tier.id === 'elite_marketplace' && currentTier !== 'elite_marketplace'));

          // Skip if this tier doesn't have a price for the selected period
          if (selectedPeriod === 'monthly' && tier.monthlyPrice === 0) {
            return null;
          }
          if (selectedPeriod === 'annual' && tier.annualPrice === 0) {
            return null;
          }

          return (
            <Card
              key={`${tier.id}-${selectedPeriod}`}
              className={`cursor-pointer transition-all relative ${
                isSelected
                  ? 'border-2 border-brand-soft-green ring-2 ring-brand-soft-green/20'
                  : isCurrentTier
                  ? 'border-2 border-blue-500 opacity-75'
                  : tier.popular
                  ? 'border-brand-soft-green'
                  : ''
              }`}
              onClick={() => {
                if (isCurrentTier) return; // Don't allow selecting current plan
                setSelectedTier(tier.id);
                setSelectedTierPeriod({ tier: tier.id, period: selectedPeriod });
              }}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-brand-soft-green">Most Popular</Badge>
                </div>
              )}
              {isCurrentTier && (
                <div className="absolute top-2 right-2">
                  <Badge variant="outline">Current Plan</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl break-words">{tier.name}</CardTitle>
                <CardDescription className="text-sm sm:text-base break-words">{tier.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <span className="text-2xl sm:text-3xl font-bold">€{price}</span>
                    <span className="text-sm sm:text-base text-muted-foreground">
                      /{selectedPeriod === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                  {savings && (
                    <p className="text-xs sm:text-sm text-green-600 mt-1 break-words">
                      Save €{savings.amount} ({savings.percentage}%) vs monthly
                    </p>
                  )}
                </div>
                <ul className="space-y-2">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckIcon className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-xs sm:text-sm break-words">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <div className="w-full flex items-center justify-center">
                  <div
                    className={`h-5 w-5 rounded-full border-2 ${
                      isSelected
                        ? 'border-brand-soft-green bg-brand-soft-green'
                        : isCurrentTier
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    } flex items-center justify-center`}
                  >
                    {isSelected && <CheckIcon className="h-3 w-3 text-white" />}
                    {isCurrentTier && !isSelected && <CheckIcon className="h-3 w-3 text-white" />}
                  </div>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Action Button */}
      <div className="flex justify-end">
        <Button
          className="bg-brand-soft-green hover:bg-brand-dark-green w-full sm:w-auto"
          onClick={subscriptionData?.subscribed ? handleUpgrade : handleSubscribe}
          disabled={!selectedTier || processing}
          size="lg"
        >
          <span className="text-sm sm:text-base">
            {processing
              ? 'Processing...'
              : subscriptionData?.subscribed
              ? 'Upgrade Subscription'
              : 'Start Subscription'}
          </span>
          <ArrowUpRight className="ml-2 h-4 w-4 flex-shrink-0" />
        </Button>
      </div>
    </div>
  );
}
