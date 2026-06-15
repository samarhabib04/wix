'use client';

import { useRouter } from "next/navigation";
import { CalendarIcon, ShieldCheckIcon, StarIcon, ArrowRight, Plus, CheckCircle, XCircle, Clock, AlertCircle, CreditCard, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { StripeConnectOnboarding } from "@/components/business/StripeConnectOnboarding";

export default function BusinessDashboardHome() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [businessData, setBusinessData] = useState({
    name: "Loading...",
    listingStatus: "Loading...",
    subscription: {
      plan: "Loading...",
      expiryDate: "Loading..."
    },
    reviews: {
      count: 0,
      averageRating: 0
    },
    totalListings: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [partnerRequest, setPartnerRequest] = useState<{
    id: string;
    status: 'pending' | 'approved' | 'rejected';
    rejection_reason: string | null;
    requested_at: string;
  } | null>(null);
  const [isPartner, setIsPartner] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [hasEliteSubscription, setHasEliteSubscription] = useState(false);
  const [businessSlug, setBusinessSlug] = useState<string | null>(null);

  useEffect(() => {
    const fetchBusinessData = async () => {
      if (!user) return;

      try {

        // Fetch user profile for business name and details
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('business_name, first_name, last_name, email, county, role')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
        } else {

        }

        // Fetch all business listings for this user
        const { data: listings, error: listingsError } = await supabase
          .from('business_listings')
          .select('id, name, status, admin_approved, rating, reviews, type, created_at, county')
          .eq('user_id', user.id);

        if (listingsError) {
          console.error('Error fetching listings:', listingsError);
        } else {

        }

        // Fetch subscription data from business_subscriptions table by user_id only
        let subscriptionData: any = null;
        
        // Get the user's business listing (for businessId and slug, not for subscription)
        const { data: businessListing, error: businessError } = await supabase
          .from('business_listings')
          .select('id, partner, slug')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (businessError && businessError.code !== 'PGRST116') {
          console.error('Error fetching business listing:', businessError);
        }
        
        if (businessListing) {
          setBusinessId(businessListing.id);
          setBusinessSlug((businessListing as any).slug || businessListing.id);

        }
          
        // Query subscription from business_subscriptions table by user_id only
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

          const tier = (subscription as any).subscription_tier;
          const status = (subscription as any).status;
            
            if (tier) {
              subscriptionData = {
                subscription_tier: tier,
              subscription_end: (subscription as any).end_date,
                subscribed: status === 'active',
              billing_period: (subscription as any).billing_period
              };
              setHasEliteSubscription(tier === 'elite_marketplace');
              
              // Also set businessId if we found a subscription but no business listing
            if (!businessListing && (subscription as any).business_id) {
              setBusinessId((subscription as any).business_id);
            }
          }
        } else {

        }
        
        // Fallback to subscribers table for backward compatibility
        if (!subscriptionData) {
          const { data: subscriber, error: subscriptionError } = await supabase
            .from('subscribers')
            .select('subscription_tier, subscription_end, subscribed, auto_renew, created_at')
            .eq('user_id', user.id)
            .maybeSingle();

          if (subscriptionError) {
            console.error('Error fetching subscription from subscribers:', subscriptionError);
          } else if (subscriber) {
            subscriptionData = subscriber;
            setHasEliteSubscription(subscriber.subscription_tier === 'elite_marketplace');
          }
        }

        // Determine business name from various sources
        const businessName = profile?.business_name || 
                           `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 
                           user.email?.split('@')[0] || 
                           "Your Business";

        // Calculate listing status based on all listings
        let listingStatus = "No Listing";
        let totalListings = listings?.length || 0;
        
        if (listings && listings.length > 0) {
          const activeListings = listings.filter(l => l.admin_approved && l.status === 'approved');
          const pendingListings = listings.filter(l => l.status === 'pending');
          const expiredListings = listings.filter(l => l.status === 'expired');
          
          if (activeListings.length > 0) {
            listingStatus = `${activeListings.length} Active Listing${activeListings.length > 1 ? 's' : ''}`;
          } else if (pendingListings.length > 0) {
            listingStatus = `${pendingListings.length} Pending Approval`;
          } else if (expiredListings.length > 0) {
            listingStatus = `${expiredListings.length} Expired`;
          } else {
            listingStatus = `${totalListings} Draft${totalListings > 1 ? 's' : ''}`;
          }
        }

        // Calculate subscription info
        let subscriptionInfo = {
          plan: "No Subscription",
          expiryDate: "N/A"
        };

        // Show subscription if there's a subscription_tier, regardless of subscribed status
        // This matches the subscription page logic which shows the plan even if status is pending
        if (subscriptionData && subscriptionData.subscription_tier) {
          // Map subscription tier to readable format (matching subscription page)
          const tierMap = {
            'standard': 'Standard Business',
            'premium': 'Premium Business', 
            'elite_marketplace': 'Elite Marketplace'
          };
          
          const periodSuffix = subscriptionData.billing_period 
            ? ` (${subscriptionData.billing_period})`
            : '';
          
          const tierName = tierMap[subscriptionData.subscription_tier as keyof typeof tierMap] || 
                          subscriptionData.subscription_tier;
          
          subscriptionInfo = {
            plan: `${tierName}${periodSuffix}`,
            expiryDate: subscriptionData.subscription_end 
              ? new Date(subscriptionData.subscription_end).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })
              : 'N/A'
          };
        }

        // Fetch reviews from business_reviews table
        // Use the business_id from businessListing (same as reviews page logic)
        let totalReviews = 0;
        let averageRating = 0;
        
        // Get business_id - use businessListing.id if available
        const businessIdForReviews = businessListing?.id;
        
        if (businessIdForReviews) {

          // Fetch reviews for this business (matching the reviews page logic - no status filter)
          const { data: businessReviews, error: reviewsError } = await supabase
            .from('business_reviews')
            .select('rating, status')
            .eq('business_id', businessIdForReviews);
          
          if (reviewsError) {
            console.error('Error fetching business reviews:', reviewsError);
            console.error('Business ID used:', businessIdForReviews);
          } else {

            if (businessReviews && businessReviews.length > 0) {
              // Count all reviews (matching reviews page behavior)
              totalReviews = businessReviews.length;
              const ratingsSum = businessReviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0);
              averageRating = ratingsSum / totalReviews;

            } else {

            }
          }
        } else {

        }
        
        // Fallback: If no reviews found in business_reviews, try to get from listings
        if (totalReviews === 0 && listings && listings.length > 0) {
          const totalReviewsFromListings = listings.reduce((sum, listing) => sum + (Number(listing.reviews) || 0), 0);
          const totalRatings = listings.filter(l => l.rating && Number(l.rating) > 0);
          if (totalReviewsFromListings > 0) {
            totalReviews = totalReviewsFromListings;
            averageRating = totalRatings.length > 0 
          ? totalRatings.reduce((sum, listing) => sum + Number(listing.rating), 0) / totalRatings.length 
          : 0;

          }
        }

        setBusinessData({
          name: businessName,
          listingStatus,
          subscription: subscriptionInfo,
          reviews: {
            count: totalReviews,
            averageRating: Math.round(averageRating * 10) / 10 // Round to 1 decimal
          },
          totalListings
        });

      } catch (error) {
        console.error('Error fetching business data:', error);
        // Set fallback data
        setBusinessData({
          name: user.email?.split('@')[0] || "Your Business",
          listingStatus: "Error Loading",
          subscription: {
            plan: "Error Loading",
            expiryDate: "Error Loading"
          },
          reviews: {
            count: 0,
            averageRating: 0
          },
          totalListings: 0
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinessData();
  }, [user]);

  // Fetch vet partner request status and partner status
  useEffect(() => {
    const fetchPartnerRequest = async () => {
      if (!user || !businessId) return;

      try {
        // First check if already a partner
        const { data: business, error: businessError } = await supabase
          .from('business_listings')
          .select('partner')
          .eq('id', businessId)
          .maybeSingle();
        
        if (business) {
          setIsPartner(business.partner || false);
        }

        // Then check for partner requests
        const { data, error } = await supabase
          .from('vet_partner_requests' as any)
          .select('id, status, rejection_reason, requested_at')
          .eq('business_id', businessId)
          .order('requested_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error fetching partner request:', error);
        } else if (data) {
          setPartnerRequest(data as any);
          // If request is approved, ensure isPartner is true
          if ((data as any).status === 'approved') {
            setIsPartner(true);
          }
        }
      } catch (error) {
        console.error('Error fetching partner request:', error);
      }
    };

    if (businessId) {
      fetchPartnerRequest();
    }
  }, [user, businessId]);

  // Handle submitting a vet partner request
  const handleSubmitRequest = async () => {
    if (!user || !businessId) {
      toast({
        title: "Error",
        description: "Please ensure you have a business listing first.",
        variant: "destructive",
      });
      return;
    }

    // Check if already a partner
    if (isPartner) {
      toast({
        title: "Already a Partner",
        description: "You are already a Dog Quest Partner.",
        variant: "default",
      });
      return;
    }

    // Check if there's already a pending request
    if (partnerRequest?.status === 'pending') {
      toast({
        title: "Request Pending",
        description: "You already have a pending request. Please wait for admin review.",
        variant: "default",
      });
      return;
    }

    setIsSubmittingRequest(true);

    try {
      const { data, error } = await supabase
        .from('vet_partner_requests' as any)
        .insert({
          business_id: businessId,
          user_id: user.id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      const requestData = data as any;
      setPartnerRequest({
        id: requestData.id,
        status: 'pending',
        rejection_reason: null,
        requested_at: requestData.requested_at,
      });

      toast({
        title: "Request Submitted",
        description: "Your request to become a Dog Quest Partner has been submitted. You will be notified when it's reviewed.",
        variant: "default",
      });
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingRequest(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <section className="rounded-lg bg-gradient-to-r from-brand-dark-green to-brand-soft-green p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
        <h1 className="text-2xl font-bold">Welcome back, {businessData.name}!</h1>
        <p className="mt-2 text-brand-light-green">
          Manage your business listing, check reviews, and update your subscription.
        </p>
          </div>
          {businessSlug && (
            <Button
              variant="secondary"
              onClick={() => {
                const url = `/services/${businessSlug}`;
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <ExternalLink className="h-4 w-4" />
              View Profile
            </Button>
          )}
        </div>
      </section>
      
      {/* Summary Tiles */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Listing Status */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-brand-light-green/20 p-2">
                <ShieldCheckIcon className="h-5 w-5 text-brand-dark-green" />
              </div>
              <div>
                <h3 className="font-medium">Listing Status</h3>
                <div className={`mt-1 text-lg font-bold ${
                  businessData.listingStatus.includes("Active") ? "text-green-600" : 
                  businessData.listingStatus.includes("Expired") ? "text-red-600" : 
                  businessData.listingStatus.includes("Pending") ? "text-amber-600" : 
                  "text-gray-600"
                }`}>
                  {isLoading ? "Loading..." : businessData.listingStatus}
                </div>
                {businessData.totalListings > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Total: {businessData.totalListings} listing{businessData.totalListings > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Subscription Plan */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-brand-light-green/20 p-2">
                <CalendarIcon className="h-5 w-5 text-brand-dark-green" />
              </div>
              <div>
                <h3 className="font-medium">Subscription Plan</h3>
                <div className="mt-1 text-lg font-bold">
                  {isLoading ? "Loading..." : businessData.subscription.plan}
                </div>
                <div className="text-sm text-muted-foreground">
                  {businessData.subscription.expiryDate !== "N/A" && businessData.subscription.expiryDate !== "Error Loading" 
                    ? `Expires ${businessData.subscription.expiryDate}`
                    : businessData.subscription.expiryDate
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-brand-light-green/20 p-2">
                <StarIcon className="h-5 w-5 text-brand-dark-green" />
              </div>
              <div>
                <h3 className="font-medium">Reviews Received</h3>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">
                    {isLoading ? "Loading..." : `${businessData.reviews.count} review${businessData.reviews.count !== 1 ? 's' : ''}`}
                  </span>
                  {businessData.reviews.count > 0 && businessData.reviews.averageRating > 0 && (
                    <>
                      <span className="text-amber-500">★</span>
                      <span className="font-bold">{businessData.reviews.averageRating}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Enquiries Quick Access */}
      {businessId && (
        <Card className="border-brand-soft-green/50">
          <CardContent className="pt-6">
            <div>
              <h3 className="text-lg font-medium">Customer Enquiries</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                View and manage enquiries from customers interested in your business.
              </p>
              <Button
                onClick={() => router.push("/my-business-dashboard/enquiries")}
                className="bg-brand-soft-green hover:bg-brand-dark-green mt-4"
              >
                View Enquiries
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Combined Payment Setup & Dog Quest Partner - 2 Columns */}
      {!isLoading && businessId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1: Payment Setup */}
          {hasEliteSubscription && (
            <Card id="payment-setup" className="border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-blue-100 p-3">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium">Payment Setup</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Set up Stripe Connect to receive payments for your marketplace sales.
                    </p>
                    <div className="mt-3">
                      <StripeConnectOnboarding 
                        businessId={businessId || undefined}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Column 2: Dog Quest Partner */}
          <Card className="border-brand-soft-green/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-brand-soft-green p-3">
                  <ShieldCheckIcon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  {isPartner ? (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-medium">Dogquest Partner</h3>
                        <Badge className="bg-green-500 text-white">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Active Partner
                        </Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        Congratulations! You are a verified Dog Quest Partner. Your business is featured prominently in our directory with priority placement and special badges.
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-medium">Want to Become a Dogquest Partner</h3>
                      <p className="mt-1 text-muted-foreground">
                        Join our exclusive network of trusted partners and get featured prominently in our directory.
                        Partners receive priority placement, enhanced visibility, and special badges.
                      </p>
                      
                      {partnerRequest && (
                        <div className="mt-4">
                          {partnerRequest.status === 'pending' && (
                            <Alert className="bg-amber-50 border-amber-300">
                              <Clock className="h-4 w-4 text-amber-600" />
                              <AlertDescription className="text-amber-800">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                                    Pending Review
                                  </Badge>
                                  <span>Your request is being reviewed by our admin team.</span>
                                </div>
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          {partnerRequest.status === 'rejected' && (
                            <Alert className="bg-red-50 border-red-300">
                              <XCircle className="h-4 w-4 text-red-600" />
                              <AlertDescription className="text-red-800">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                                      Rejected
                                    </Badge>
                                    <span>Your request was not approved.</span>
                                  </div>
                                  {partnerRequest.rejection_reason && (
                                    <div className="mt-2 p-2 bg-red-100 rounded text-sm">
                                      <strong>Reason:</strong> {partnerRequest.rejection_reason}
                                    </div>
                                  )}
                                  <p className="text-sm mt-2">
                                    You can submit a new request after addressing the feedback above.
                                  </p>
                                </div>
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
            {!isPartner && (!partnerRequest || partnerRequest.status === 'rejected') && (
              <CardFooter className="flex justify-end border-t pt-4">
                <Button
                  onClick={handleSubmitRequest}
                  disabled={isSubmittingRequest || !businessId}
                  className="bg-brand-soft-green hover:bg-brand-dark-green"
                >
                  {isSubmittingRequest ? "Submitting..." : "Request Partner Status"}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      )}

      {/* CTA Section */}
      <Card className="border-brand-soft-green/50">
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium">Want to update your listing or renew your subscription?</h3>
          <p className="mt-2 text-muted-foreground">
            Keep your business information up-to-date and ensure your listing stays active.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row sm:justify-end gap-2 border-t p-4">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => router.push("/my-business-dashboard/listing")}
          >
            Update Listing
          </Button>
          <Button
            onClick={() => router.push("/my-business-dashboard/subscription")}
            className="w-full sm:w-auto bg-brand-soft-green hover:bg-brand-dark-green"
          >
            Manage Subscription
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

