'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, TrendingUp, ArrowRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BoostSuccessDetails {
  boost_id: string;
  boost_type?: string;
  boost_start_time: string;
  boost_end_time?: string | null;
  scheduling_message?: string;
  scheduled_for_future?: boolean;
}

function BoostPaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);
  const [boostDetails, setBoostDetails] = useState<BoostSuccessDetails | null>(null);
  
  const sessionId = searchParams.get('session_id');
  const boostId = searchParams.get('boost_id');

  useEffect(() => {
    const processPaymentSuccess = async () => {
      if (!sessionId) {
        toast({
          title: 'Error',
          description: 'No payment session found',
          variant: 'destructive',
        });
        router.push('/my-seller-dashboard');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('handle-boost-payment-success', {
          body: { session_id: sessionId }
        });

        if (error) {
          throw error;
        }

        setBoostDetails(data);
        const isScheduled = data?.scheduled_for_future === true;
        toast({
          title: isScheduled ? 'Boost Scheduled!' : 'Boost Activated!',
          description: data?.scheduling_message || (isScheduled
            ? 'Your boost is scheduled and will go live at the start of its window.'
            : 'Your listing boost has been successfully activated.'),
        });
      } catch (error) {
        console.error('Error processing boost payment:', error);
        toast({
          title: 'Processing Error',
          description: 'There was an issue processing your boost payment. Please contact support.',
          variant: 'destructive',
        });
      } finally {
        setIsProcessing(false);
      }
    };

    processPaymentSuccess();
  }, [sessionId, router, toast]);

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Processing your boost payment...</p>
        </div>
      </div>
    );
  }

  const isScheduled = boostDetails?.scheduled_for_future === true;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              {isScheduled ? (
                <Clock className="h-8 w-8 text-green-600" />
              ) : (
                <CheckCircle className="h-8 w-8 text-green-600" />
              )}
            </div>
            <h1 className="text-3xl font-bold">
              {isScheduled ? 'Boost Scheduled!' : 'Boost Activated!'}
            </h1>
            <p className="text-muted-foreground">
              {boostDetails?.scheduling_message || (isScheduled
                ? 'Your boost is paid and will go live at the scheduled time.'
                : 'Your listing boost has been successfully activated and is now live.')}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Boost Details
              </CardTitle>
              <CardDescription>
                {isScheduled
                  ? 'Your boost will appear in carousels and priority placement when its window starts'
                  : 'Your boost is now active and improving your listing visibility'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {boostDetails && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Boost ID:</span>
                    <Badge variant="secondary">{boostDetails.boost_id}</Badge>
                  </div>
                  {boostDetails.boost_type && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Type:</span>
                      <Badge variant="outline">{boostDetails.boost_type}</Badge>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {isScheduled ? 'Goes live:' : 'Activated:'}
                    </span>
                    <span className="text-sm">{new Date(boostDetails.boost_start_time).toLocaleString()}</span>
                  </div>
                  {boostDetails.boost_end_time && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Ends:</span>
                      <span className="text-sm">{new Date(boostDetails.boost_end_time).toLocaleString()}</span>
                    </div>
                  )}
                </>
              )}
              
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">What happens next?</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {isScheduled ? (
                    <>
                      <li>• Your boost is confirmed and paid</li>
                      <li>• It will appear in carousels when its window starts</li>
                      <li>• Gold boosts run 7:00 PM–11:00 PM Irish time each evening</li>
                      <li>• You can track timing in your seller dashboard</li>
                    </>
                  ) : (
                    <>
                      <li>• Your listing is now prioritized in search results</li>
                      <li>• Higher visibility on breed and category pages</li>
                      <li>• Increased chances of buyer engagement</li>
                      <li>• You can track performance in your seller dashboard</li>
                    </>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild>
              <Link href="/my-seller-dashboard/listings" className="flex items-center gap-2">
                View My Listings
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/my-seller-dashboard">
                Seller Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function BoostPaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <BoostPaymentSuccessContent />
    </Suspense>
  );
}

