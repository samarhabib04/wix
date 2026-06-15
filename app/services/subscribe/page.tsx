'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Info, CheckIcon, Star } from "lucide-react";
import Link from "next/link";

interface Plan {
  id: string;
  name: string;
  tier: 'standard' | 'premium' | 'elite_marketplace';
  duration: 'monthly' | 'annual';
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  popular?: boolean;
}

const plans: Plan[] = [
  { 
    id: "standard-monthly", 
    name: "Standard Business", 
    tier: "standard",
    duration: "monthly",
    monthlyPrice: 8,
    annualPrice: 80,
    popular: false,
    features: [
      "Appears in Business Directory",
      "Basic profile visibility",
      "Contact information display"
    ]
  },
  { 
    id: "standard-annual", 
    name: "Standard Business", 
    tier: "standard",
    duration: "annual",
    monthlyPrice: 8,
    annualPrice: 80,
    popular: true,
    features: [
      "Appears in Business Directory",
      "Basic profile visibility",
      "Contact information display",
      "Save €16 per year"
    ]
  },
  { 
    id: "premium-monthly", 
    name: "Premium Business", 
    tier: "premium",
    duration: "monthly",
    monthlyPrice: 12,
    annualPrice: 120,
    popular: false,
    features: [
      "Premium badge",
      "Priority placement in Business Directory",
      "Reviews enabled",
      "Enquiry/contact form",
      "Full analytics",
      "Social media handles displayed",
      "Eligibility for promotions and boosts",
      "About Us section with gallery images"
    ]
  },
  { 
    id: "premium-annual", 
    name: "Premium Business", 
    tier: "premium",
    duration: "annual",
    monthlyPrice: 12,
    annualPrice: 120,
    popular: false,
    features: [
      "Premium badge",
      "Priority placement in Business Directory",
      "Reviews enabled",
      "Enquiry/contact form",
      "Full analytics",
      "Social media handles displayed",
      "Eligibility for promotions and boosts",
      "About Us section with gallery images",
      "Save €24 per year"
    ]
  },
  { 
    id: "elite-monthly", 
    name: "Elite Marketplace", 
    tier: "elite_marketplace",
    duration: "monthly",
    monthlyPrice: 15,
    annualPrice: 0, // Only monthly available
    popular: false,
    features: [
      "All Premium features",
      "Marketplace access",
      "Sell physical dog products",
      "Stripe Connect integration",
      "€1 commission per sale",
      "About Us section with gallery images"
    ]
  }
];

export default function SubscriptionPlansPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string>("standard-annual");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingBusinessListingId, setPendingBusinessListingId] = useState<string | null>(null);

  // Check if there's a pending business listing
  useEffect(() => {
    const listingId = sessionStorage.getItem('pendingBusinessListingId');
    if (listingId) {
      setPendingBusinessListingId(listingId);
    }
  }, []);

  // Helper function to calculate savings
  const calculateSavings = (planId: string, monthlyPrice: number, annualPrice: number) => {
    if (planId.includes('annual')) {
      const monthlyTotal = monthlyPrice * 12;
      const savings = monthlyTotal - annualPrice;
      const percentage = Math.round((savings / monthlyTotal) * 100);
      return { amount: savings, percentage };
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get the selected plan
    const planData = plans.find(plan => plan.id === selectedPlan);
    if (!planData) {
      toast({
        title: "Error",
        description: "Please select a valid subscription plan",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please log in to continue with payment.",
          variant: "destructive"
        });
        router.push("/auth/login");
        return;
      }

      // Use tier + billingPeriod instead of hardcoded priceId
      // The create-checkout function will resolve the price ID from environment variables
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          mode: 'subscription',
          tier: planData.tier,
          billingPeriod: planData.duration,
          autoRenew: true,
          businessListingId: pendingBusinessListingId,
          planDetails: {
            id: planData.id,
            name: planData.name,
            price: planData.duration === 'monthly' ? planData.monthlyPrice : planData.annualPrice,
            duration: planData.duration
          }
        }
      });
      
      if (error) {
        console.error('Checkout creation error:', error);
        toast({
          title: "Error",
          description: `There was a problem creating your checkout session: ${error.message}`,
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
      
      if (data?.error) {
        console.error('Checkout response error:', data.error);
        toast({
          title: "Error",
          description: data.error.message || data.error || "Failed to create checkout session",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
      
      // Redirect to Stripe checkout
      if (data?.url) {

        window.location.href = data.url;
      } else {
        console.error('No checkout URL returned:', data);
        toast({
          title: "Error",
          description: "No checkout URL returned. Please try again.",
          variant: "destructive"
        });
        setIsSubmitting(false);
      }
      
    } catch (error: any) {
      console.error("Subscription checkout failed:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  };

  const selectedPlanData = plans.find(plan => plan.id === selectedPlan);
  const price = selectedPlanData?.duration === 'monthly' 
    ? selectedPlanData.monthlyPrice 
    : selectedPlanData?.annualPrice || 0;

  // Group plans by tier for better display
  const standardPlans = plans.filter(p => p.tier === 'standard');
  const premiumPlans = plans.filter(p => p.tier === 'premium');
  const elitePlans = plans.filter(p => p.tier === 'elite_marketplace');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-berkshire text-brand-dark-green mb-4">Choose Your Subscription Plan</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Complete your business listing by selecting a subscription plan. Your listing will be submitted for admin review after successful payment.
          </p>
        </div>

        {pendingBusinessListingId && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <Info className="h-4 w-4" />
            <AlertTitle>Business Listing Ready</AlertTitle>
            <AlertDescription>
              Your business details have been saved. Complete payment below to submit your listing for admin review.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-8">
            {/* Standard Business Plans */}
            <div>
              <h2 className="text-2xl font-semibold mb-4">Standard Business</h2>
              <p className="text-muted-foreground mb-4">Basic visibility in Business Directory</p>
              <RadioGroup
                value={selectedPlan}
                onValueChange={setSelectedPlan}
                className="grid gap-4 md:grid-cols-2"
              >
                {standardPlans.map((plan) => {
                  const savings = calculateSavings(plan.id, plan.monthlyPrice, plan.annualPrice);
                  const displayPrice = plan.duration === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
                  
                  return (
                    <div key={plan.id} className="relative">
                      <RadioGroupItem 
                        value={plan.id} 
                        id={plan.id} 
                        className="absolute top-4 left-4 z-10"
                      />
                      
                      {plan.popular && (
                        <div className="absolute right-4 top-0 -translate-y-1/2 rounded-full bg-brand-soft-green px-3 py-1 text-xs font-medium text-white z-10">
                          Popular
                        </div>
                      )}
                      
                      <label 
                        htmlFor={plan.id} 
                        className={`cursor-pointer block h-full ${
                          selectedPlan === plan.id 
                            ? 'ring-2 ring-brand-soft-green' 
                            : ''
                        }`}
                      >
                        <Card className={`h-full transition-all pl-12 ${
                          selectedPlan === plan.id 
                            ? 'border-brand-soft-green shadow-lg' 
                            : 'hover:shadow-md'
                        }`}>
                          <CardHeader>
                            <CardTitle className="text-xl">{plan.name}</CardTitle>
                            <CardDescription>
                              <div className="mt-2">
                                <span className="text-3xl font-bold">€{displayPrice}</span>
                                <span className="text-muted-foreground">/{plan.duration === 'monthly' ? 'month' : 'year'}</span>
                              </div>
                              {savings && (
                                <div className="mt-1 text-sm text-green-600 font-medium">
                                  Save €{savings.amount} ({savings.percentage}%)
                                </div>
                              )}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {plan.features.map((feature, index) => (
                                <li key={index} className="flex items-center gap-2">
                                  <CheckIcon className="h-4 w-4 text-green-600" />
                                  <span className="text-sm">{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      </label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>

            {/* Premium Business Plans */}
            <div>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Premium Business
              </h2>
              <p className="text-muted-foreground mb-4">Enhanced visibility with reviews and analytics</p>
              <RadioGroup
                value={selectedPlan}
                onValueChange={setSelectedPlan}
                className="grid gap-4 md:grid-cols-2"
              >
                {premiumPlans.map((plan) => {
                  const savings = calculateSavings(plan.id, plan.monthlyPrice, plan.annualPrice);
                  const displayPrice = plan.duration === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
                  
                  return (
                    <div key={plan.id} className="relative">
                      <RadioGroupItem 
                        value={plan.id} 
                        id={plan.id} 
                        className="absolute top-4 left-4 z-10"
                      />
                      
                      <label 
                        htmlFor={plan.id} 
                        className={`cursor-pointer block h-full ${
                          selectedPlan === plan.id 
                            ? 'ring-2 ring-brand-soft-green' 
                            : ''
                        }`}
                      >
                        <Card className={`h-full transition-all pl-12 ${
                          selectedPlan === plan.id 
                            ? 'border-brand-soft-green shadow-lg' 
                            : 'hover:shadow-md'
                        }`}>
                          <CardHeader>
                            <CardTitle className="text-xl">{plan.name}</CardTitle>
                            <CardDescription>
                              <div className="mt-2">
                                <span className="text-3xl font-bold">€{displayPrice}</span>
                                <span className="text-muted-foreground">/{plan.duration === 'monthly' ? 'month' : 'year'}</span>
                              </div>
                              {savings && (
                                <div className="mt-1 text-sm text-green-600 font-medium">
                                  Save €{savings.amount} ({savings.percentage}%)
                                </div>
                              )}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {plan.features.map((feature, index) => (
                                <li key={index} className="flex items-center gap-2">
                                  <CheckIcon className="h-4 w-4 text-green-600" />
                                  <span className="text-sm">{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      </label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>

            {/* Elite Marketplace Plan */}
            <div>
              <h2 className="text-2xl font-semibold mb-4">Elite Marketplace</h2>
              <p className="text-muted-foreground mb-4">Premium features + Marketplace access</p>
              <RadioGroup
                value={selectedPlan}
                onValueChange={setSelectedPlan}
                className="grid gap-4 md:grid-cols-1 max-w-md"
              >
                {elitePlans.map((plan) => {
                  return (
                    <div key={plan.id} className="relative">
                      <RadioGroupItem 
                        value={plan.id} 
                        id={plan.id} 
                        className="absolute top-4 left-4 z-10"
                      />
                      
                      <label 
                        htmlFor={plan.id} 
                        className={`cursor-pointer block h-full ${
                          selectedPlan === plan.id 
                            ? 'ring-2 ring-brand-soft-green' 
                            : ''
                        }`}
                      >
                        <Card className={`h-full transition-all pl-12 ${
                          selectedPlan === plan.id 
                            ? 'border-brand-soft-green shadow-lg' 
                            : 'hover:shadow-md'
                        }`}>
                          <CardHeader>
                            <CardTitle className="text-xl">{plan.name}</CardTitle>
                            <CardDescription>
                              <div className="mt-2">
                                <span className="text-3xl font-bold">€{plan.monthlyPrice}</span>
                                <span className="text-muted-foreground">/month</span>
                              </div>
                              <div className="mt-1 text-sm text-muted-foreground">
                                (Monthly only)
                              </div>
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {plan.features.map((feature, index) => (
                                <li key={index} className="flex items-center gap-2">
                                  <CheckIcon className="h-4 w-4 text-green-600" />
                                  <span className="text-sm">{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      </label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-brand-soft-green hover:bg-brand-dark-green text-white px-8 py-6 text-lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                `Continue to Payment - €${price}`
              )}
            </Button>
          </div>
        </form>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            <Link 
              href="/my-business-dashboard/subscription"
              className="text-brand-soft-green hover:underline"
            >
              Already have a subscription? Manage it here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
