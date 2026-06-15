'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Calendar, ArrowRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SALE_LISTING_LIVE_DAYS } from '@/lib/config/sale-listing-expiry';

function ListingPaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);
  const [paymentData, setPaymentData] = useState<any>(null);
  const { toast } = useToast();

  const sessionId = searchParams.get('session_id');
  const listingType = searchParams.get('listing_type');
  const listingId = searchParams.get('listing_id');

  useEffect(() => {
    const handlePaymentSuccess = async () => {
      if (!sessionId) {
        toast({
          title: 'Error',
          description: 'Invalid payment session',
          variant: 'destructive',
        });
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('handle-listing-payment-success', {
          body: { session_id: sessionId }
        });

        if (error) {
          throw error;
        }

        setPaymentData(data);
        toast({
          title: 'Payment Successful!',
          description: 'Your listing has been activated and submitted for review.',
        });
      } catch (error) {
        console.error('Error processing payment:', error);
        toast({
          title: 'Error',
          description: 'There was an issue processing your payment. Please contact support.',
          variant: 'destructive',
        });
      } finally {
        setIsProcessing(false);
      }
    };

    handlePaymentSuccess();
  }, [sessionId, toast]);

  const getListingTypeDisplay = (type: string | null) => {
    switch (type) {
      case 'sale': return 'Sale Listing';
      case 'stud': return 'Stud Listing';
      case 'showcase': return 'Showcase Listing';
      default: return 'Listing';
    }
  };

  const getDurationText = (type: string | null, expiresAt?: string) => {
    if (type === 'showcase') {
      return 'Until puppy reaches 6 weeks old';
    }
    if (expiresAt) {
      const expiry = new Date(expiresAt);
      return `Until ${expiry.toLocaleDateString()}`;
    }
    return `${SALE_LISTING_LIVE_DAYS} days after approval`;
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-soft-green/20 to-brand-sage/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Processing your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-soft-green/20 to-brand-sage/20 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-berkshire text-brand-dark-green mb-2">
            Payment Successful!
          </h1>
          <p className="text-muted-foreground">
            Your listing has been activated and submitted for admin review.
          </p>
        </div>

          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {getListingTypeDisplay(listingType || null)}
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Active
                  </Badge>
                </CardTitle>
              </div>
              <CardDescription>
                Your listing is now active and will be reviewed by our admin team.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  Valid {getDurationText(listingType || null, paymentData?.expires_at)}
                </span>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Our admin team will review your listing</li>
                  <li>• You'll receive an email notification once approved</li>
                  <li>• Your listing will then be visible to potential buyers</li>
                  <li>• You can manage your listing from your seller dashboard</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild className="flex-1">
              <Link href="/my-seller-dashboard">
                View Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            
            <Button variant="outline" asChild>
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Need help? <Link href="/contact" className="text-primary hover:underline">Contact our support team</Link>
            </p>
          </div>
        </div>
      </div>
  );
}

export default function ListingPaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <ListingPaymentSuccessContent />
    </Suspense>
  );
}

