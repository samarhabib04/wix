'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Crown, Shield, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function VetPartnerUpgradePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);
  const [vetPartnerData, setVetPartnerData] = useState<{
    tier: 'free' | 'paid';
    status: string;
  } | null>(null);

  useEffect(() => {
    const fetchVetPartnerStatus = async () => {
      if (!user) return;

      // Get user's business that is a vet partner
      const { data: business, error } = await supabase
        .from('business_listings')
        .select('id, is_vet_partner, vet_partner_tier')
        .eq('user_id', user.id)
        .eq('is_vet_partner', true)
        .single();

      if (error || !business || ('error' in business)) {
        router.push('/my-business-dashboard');
        return;
      }

      const businessData = business as any;
      setCurrentBusinessId(businessData.id);

      // Get vet partner details
      const { data: vp, error: vpError } = await supabase
        .from('vet_partners' as any)
        .select('tier, status')
        .eq('business_id', businessData.id)
        .single();

      if (vp && !('error' in vp)) {
        const vpData = vp as any;
        setVetPartnerData({
          tier: vpData.tier,
          status: vpData.status,
        });
      }
    };

    fetchVetPartnerStatus();
  }, [user, router]);

  const handleUpgrade = async () => {
    if (!currentBusinessId) {
      toast({
        title: "Error",
        description: "Business not found",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    try {
      // Create Stripe checkout session (priceId resolved by edge function)
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          mode: 'subscription',
          tier: 'vet_partner_paid', // Special tier for vet partners
          billingPeriod: 'monthly',
          autoRenew: true,
          businessListingId: currentBusinessId,
          planDetails: {
            id: 'vet_partner_paid',
            name: 'Vet Partner - Paid',
            price: 12,
            duration: 'month',
          },
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Upgrade failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process upgrade",
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

  if (!vetPartnerData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (vetPartnerData.tier === 'paid') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-6 w-6 text-yellow-500" />
              You're Already a Paid Vet Partner
            </CardTitle>
            <CardDescription>
              You have access to all paid vet partner features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/my-business-dashboard')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Upgrade to Paid Vet Partner</h1>
        <p className="text-muted-foreground">
          Unlock enhanced visibility and features
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Free Tier */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Free Vet Partner
            </CardTitle>
            <CardDescription>Your current plan</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Vet Partner badge</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Listed in Vet Directory</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Geolocated visibility</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Social media handles displayed</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Paid Tier */}
        <Card className="border-2 border-brand-soft-green">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Paid Vet Partner
              </CardTitle>
              <Badge>€12/month</Badge>
            </div>
            <CardDescription>All free features plus:</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Priority placement in vet directory per county</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Public reviews from DogQuest users</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Ability to reply to reviews</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Enquiry/contact form</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Profile analytics</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Carousel placements on key pages</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-brand-soft-green/10 border-brand-soft-green">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">Ready to upgrade?</h3>
              <p className="text-sm text-muted-foreground">
                Start your paid subscription for just €12/month
              </p>
            </div>
            <Button
              onClick={handleUpgrade}
              disabled={processing}
              className="bg-brand-soft-green hover:bg-brand-dark-green"
            >
              {processing ? 'Processing...' : 'Upgrade Now'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
