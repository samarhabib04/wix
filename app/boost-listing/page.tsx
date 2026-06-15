'use client';

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Zap, TrendingUp, Crown, Award, Check, ArrowLeft, AlertCircle } from "lucide-react";
import {
  boostTierPublicTitle,
  resolveBoostDisplayNames,
  STANDARD_BOOST_CARD_LABEL,
} from "@/hooks/useBoostConfig";
import { redirectToStripeCheckout } from "@/lib/utils/stripe-checkout";

/** Fixed height so tier rows align; Standard uses seasonal title or Standard Boost fallback. */
const BOOST_LISTING_TITLE_SLOT_CLASS =
  "text-2xl font-playfair font-bold h-28 sm:h-32 leading-snug text-balance line-clamp-3";

const BOOST_TIERS = [
  {
    id: 'standard',
    name: 'Standard Boost',
    price: 5,
    currency: 'EUR',
    icon: Zap,
    color: 'from-orange-400 to-orange-600',
    borderColor: 'border-orange-300',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    description: 'Top of Breed & Sale pages',
    duration: 'Until bumped by new listings',
    features: [
      'Top placement on Breed pages',
      'Top placement on Sale pages',
      'Gets bumped by newer listings',
      'One-off payment',
      'No time limit'
    ],
    maxSlots: null
  },
  {
    id: 'premium',
    name: 'Premium Boost',
    price: 10,
    currency: 'EUR',
    icon: TrendingUp,
    color: 'from-blue-400 to-blue-600',
    borderColor: 'border-blue-300',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    description: 'Featured placement with Bronze styling',
    duration: '24 hours',
    features: [
      'Above Standard on Breed & Sale pages',
      'Featured in Premium Carousel',
      'Bronze visual styling',
      '24 hour feature duration',
      'Maximum 40 active listings'
    ],
    maxSlots: 40
  },
  {
    id: 'elite',
    name: 'Elite Boost',
    price: 12.5,
    currency: 'EUR',
    icon: Award,
    color: 'from-purple-500 to-purple-700',
    borderColor: 'border-purple-300',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    description: 'Premium placement with Silver styling',
    duration: '24 hours',
    features: [
      'Above Premium & Standard',
      'Featured in Elite Carousel',
      'Silver visual styling',
      '24 hour feature duration',
      'Maximum 20 active listings'
    ],
    maxSlots: 20,
    badge: 'Popular'
  },
  {
    id: 'gold',
    name: 'Gold Boost',
    price: 20,
    currency: 'EUR',
    icon: Crown,
    color: 'from-yellow-400 to-yellow-600',
    borderColor: 'border-yellow-300',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    description: 'Maximum visibility with Gold styling',
    duration: '4 hours each evening (7:00 PM-11:00 PM)',
    features: [
      'Top priority placement',
      'Featured in Gold Carousel during the evening window',
      'Gold visual styling',
      '4-hour evening feature window (7:00 PM-11:00 PM)',
      'Maximum 5 active listings',
      'Prime-time buyer exposure'
    ],
    maxSlots: 5,
    badge: 'Recommended',
    featured: true
  }
];

function BoostListingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading, role } = useAuth();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [maxWaitTimeReached, setMaxWaitTimeReached] = useState(false);

  // Get listing details from URL params or sessionStorage (passed from boost buttons)
  const [selectedListingId, setSelectedListingId] = useState<string>('');
  const [selectedListingType, setSelectedListingType] = useState<'sale' | 'stud'>('sale');
  const [selectedListingTitle, setSelectedListingTitle] = useState<string>('');

  const [boostNames, setBoostNames] = useState(() => resolveBoostDisplayNames(null));

  useEffect(() => {
    const fetchBoostNames = async () => {
      try {
        const { data, error } = await supabase
          .from('boost_config' as any)
          .select('*')
          .single();

        if (data && !error) {
          setBoostNames(resolveBoostDisplayNames(data as unknown as Record<string, unknown>));
        }
      } catch (error) {
        console.error('Error fetching boost names:', error);
      }
    };

    fetchBoostNames();
  }, []);

  useEffect(() => {
    // Maximum wait time of 3 seconds - prevent infinite loading
    const timeoutId = setTimeout(() => {
      setMaxWaitTimeReached(true);
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, []);

  // Check authentication and role
  useEffect(() => {
    // Wait for auth to load (max 3 seconds)
    if (authLoading && !maxWaitTimeReached) return;

    // Redirect to login if not authenticated after max wait
    if (!user && maxWaitTimeReached) {
      router.push(`/auth/login?next=${encodeURIComponent('/boost-listing')}`);
      return;
    }

    // Check role only if it's loaded
    if (role !== null && role !== 'seller' && role !== 'admin') {
      router.push('/my-seller-dashboard');
      return;
    }
  }, [user, authLoading, role, router, maxWaitTimeReached]);

  useEffect(() => {
    // First, try to read from URL query parameters
    const urlListingId = searchParams.get('listingId');
    const urlListingType = searchParams.get('type') as 'sale' | 'stud' | null;
    const urlListingTitle = searchParams.get('title');

    if (urlListingId) {
      setSelectedListingId(urlListingId);
    }

    if (urlListingType && (urlListingType === 'sale' || urlListingType === 'stud')) {
      setSelectedListingType(urlListingType);
    }

    if (urlListingTitle) {
      setSelectedListingTitle(decodeURIComponent(urlListingTitle));
    }

    // If no URL params, try sessionStorage (fallback for other navigation methods)
    if (!urlListingId && typeof window !== 'undefined') {
      const listingId = sessionStorage.getItem('boostListingId');
      const listingType = sessionStorage.getItem('boostListingType') as 'sale' | 'stud' | null;
      const listingTitle = sessionStorage.getItem('boostListingTitle');

      if (listingId) {
        setSelectedListingId(listingId);
        // Clear sessionStorage after reading
        sessionStorage.removeItem('boostListingId');
      }

      if (listingType && (listingType === 'sale' || listingType === 'stud')) {
        setSelectedListingType(listingType);
        sessionStorage.removeItem('boostListingType');
      }

      if (listingTitle) {
        setSelectedListingTitle(listingTitle);
        sessionStorage.removeItem('boostListingTitle');
      }
    }
  }, [searchParams]);

  // Show loading only briefly (max 3 seconds)
  if (authLoading && !maxWaitTimeReached) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const handleBoostPurchase = async (boostType: string) => {
    if (!user) {
      toast.error('Please sign in to purchase a boost');
      router.push('/auth/login');
      return;
    }

    if (!selectedListingId) {
      toast.error('Please select a listing to boost from your dashboard');
      router.push('/my-seller-dashboard/listings');
      return;
    }

    setIsProcessing(boostType);

    try {
      const { data, error } = await supabase.functions.invoke('create-boost-payment', {
        body: {
          listing_id: selectedListingId,
          listing_type: selectedListingType,
          boost_type: boostType,
          currency: 'EUR'
        }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.message || data.error);
      }

      if (data?.url) {
        toast.success('Redirecting to payment...');
        redirectToStripeCheckout(data.url);
        return;
      }
    } catch (error: any) {
      console.error('Error creating boost payment:', error);
      toast.error(error.message || 'Failed to create boost payment');
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/my-seller-dashboard/listings')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Listings
          </Button>

          <h1 className="text-4xl font-playfair font-bold mb-4 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            Boost Your Listing
          </h1>

          {selectedListingTitle && (
            <div className="bg-muted/50 rounded-lg px-4 py-3 mt-4 mb-4 border border-border max-w-md mx-auto">
              <p className="text-sm text-muted-foreground">
                Boosting: <span className="font-semibold text-foreground">{selectedListingTitle}</span>
              </p>
            </div>
          )}

          {!selectedListingId && (
            <Alert variant="destructive" className="mt-4 max-w-2xl">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Listing Selected</AlertTitle>
              <AlertDescription>
                You must select a listing to boost. Please go to your{' '}
                <Button
                  variant="link"
                  className="p-0 h-auto font-normal text-brand-soft-green hover:text-brand-dark-green underline"
                  onClick={() => router.push('/my-seller-dashboard/listings')}
                >
                  Listings Dashboard
                </Button>
                {' '}and click the boost button on the listing you want to promote.
              </AlertDescription>
            </Alert>
          )}

          <p className="text-lg text-muted-foreground max-w-3xl mt-4">
            Increase your listing's visibility and reach more potential buyers with our boost options.
            Choose the tier that works best for you.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {BOOST_TIERS.map((tier) => {
            const Icon = tier.icon;
            const isProcessingTier = isProcessing === tier.id;
            const publicTitle = boostTierPublicTitle(
              tier.id as 'gold' | 'elite' | 'premium' | 'standard',
              boostNames
            );
            const cardHeading =
              publicTitle ??
              (tier.id === 'standard' ? STANDARD_BOOST_CARD_LABEL : tier.name);

            return (
              <Card
                key={tier.id}
                className={`relative flex h-full flex-col overflow-hidden transition-all duration-300 hover:shadow-xl ${tier.featured
                  ? 'border-2 border-yellow-400 shadow-lg scale-105'
                  : 'hover:scale-105'
                  }`}
              >
                {tier.badge && (
                  <div className="absolute top-4 right-4">
                    <Badge
                      className={`${tier.bgColor} ${tier.textColor} border ${tier.borderColor} font-lora`}
                    >
                      {tier.badge}
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${tier.color} flex items-center justify-center mb-4 shadow-md`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>

                  <CardTitle className={BOOST_LISTING_TITLE_SLOT_CLASS}>
                    {cardHeading}
                  </CardTitle>

                  <CardDescription className="text-sm mt-2">
                    {tier.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col space-y-6">
                  {/* Price */}
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-foreground">
                        €{tier.price}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {tier.duration}
                    </p>
                  </div>

                  {/* Features */}
                  <div className="space-y-3">
                    {tier.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground leading-tight">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <Button
                    onClick={() => handleBoostPurchase(tier.id)}
                    disabled={isProcessingTier || !selectedListingId}
                    className={`w-full bg-gradient-to-r ${tier.color} hover:opacity-90 text-white font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isProcessingTier ? 'Processing...' : !selectedListingId ? 'Select a Listing First' : `Choose ${tier.name}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Feature Comparison */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-2xl font-playfair">How Boosts Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  When Your Boost Goes Live
                </h3>
                <p className="text-muted-foreground">
                  Premium and Elite boosts activate immediately for 24 hours. Gold boosts run each evening from 7:00 PM to 11:00 PM Irish time — if you purchase outside that window, your boost is scheduled for the next 7:00 PM slot and ends at 11:00 PM that evening.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  Priority Placement
                </h3>
                <p className="text-muted-foreground">
                  Higher tier boosts get better placement. Gold listings appear above Elite, Elite above Premium, and so on.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Visual Distinction
                </h3>
                <p className="text-muted-foreground">
                  Boosted listings get special badges and styling (Bronze, Silver, Gold) to stand out from regular listings.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Carousel Features
                </h3>
                <p className="text-muted-foreground">
                  Premium, Elite, and Gold boosts are featured in dedicated carousels on the homepage during their active period.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

export default function BoostListingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading boost page...</p>
        </div>
      </div>
    }>
      <BoostListingPageContent />
    </Suspense>
  );
}




























