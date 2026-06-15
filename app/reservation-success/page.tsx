'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, Shield, MessageCircle, ArrowLeft, PawPrint } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

function ReservationSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const reservationId = searchParams.get('reservation_id');
  const sessionId = searchParams.get('session_id');
  const [reservation, setReservation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    const fetchReservation = async () => {
      if (!sessionId) {
        console.error('No session_id in URL');
        setLoading(false);
        return;
      }

      try {
        // Poll for the reservation (webhook creates it after payment)
        let attempts = 0;
        const maxAttempts = 20; // Wait up to 20 seconds for webhook to process
        let reservationData: any = null;
        
        while (attempts < maxAttempts) {
          // Get the reservation by stripe_session_id (created by webhook after payment)
          const { data, error: reservationError } = await supabase
            .from('reservations')
            .select('*, conversation_id')
            .eq('stripe_session_id', sessionId)
            .single();

          if (reservationError) {
            console.error('Error fetching reservation (attempt', attempts + 1, '):', {
              error: reservationError,
              code: reservationError.code,
              message: reservationError.message,
              details: reservationError.details,
              hint: reservationError.hint
            });
            
            // If it's a not found error and we've tried a few times, break
            if (reservationError.code === 'PGRST116' && attempts >= 3) {
              console.error('Reservation not found after multiple attempts');
              break;
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
            continue;
          }

          if (!data) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
            continue;
          }

          reservationData = data;

          // Get listing and seller details
          const { data: listingData, error: listingError } = await supabase
            .from('sale_listings')
            .select('title, seller_id')
            .eq('id', reservationData.listing_id)
            .single();

          if (listingError) {
            console.error('Error fetching listing:', listingError);
          }

          let sellerData = null;
          if (listingData?.seller_id) {
            const { data: seller, error: sellerError } = await supabase
              .from('user_profiles')
              .select('first_name, last_name')
              .eq('id', listingData.seller_id)
              .single();
            
            if (sellerError) {
              console.error('Error fetching seller:', sellerError);
            } else {
              sellerData = seller;
            }
          }

          const sellerName = sellerData 
            ? `${sellerData.first_name || ''} ${sellerData.last_name || ''}`.trim()
            : 'Seller';

          setReservation({
            ...reservationData,
            listing: {
              title: listingData?.title || 'Unknown Listing',
              seller_name: sellerName || 'Seller'
            }
          });

          // If we have a conversation_id, set it and prepare for redirect
          if (reservationData.conversation_id) {
            setConversationId(reservationData.conversation_id);
            
            // Auto-redirect to conversation after 3 seconds
            setTimeout(() => {
              const role = user?.user_metadata?.role;
              if (role === 'buyer') {
                router.push(`/my-buyer-dashboard/messages/${reservationData.conversation_id}`);
              } else if (role === 'seller') {
                router.push(`/my-seller-dashboard/messages/${reservationData.conversation_id}`);
              } else {
                router.push(`/`);
              }
            }, 3000);
          }
          
          // Break out of loop once we have the reservation
          break;
        }

        if (!reservationData && attempts >= maxAttempts) {
          console.error('Reservation not found after', maxAttempts, 'attempts');
          setReservation(null);
        }
      } catch (error) {
        console.error('Unexpected error fetching reservation:', error);
        setReservation(null);
      } finally {
        setLoading(false);
      }
    };

    fetchReservation();
  }, [sessionId, router, user]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Skeleton className="h-8 w-64 mb-6" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="text-center py-8">
            <h1 className="text-2xl font-bold text-destructive mb-4">Reservation Not Found</h1>
            <p className="text-muted-foreground mb-4">
              We couldn't find the reservation you're looking for.
            </p>
            {sessionId && (
              <p className="text-sm text-muted-foreground mb-6">
                Session ID: {sessionId}
                <br />
                {reservationId && `Reservation ID: ${reservationId}`}
              </p>
            )}
            <div className="space-y-3">
              <Button asChild className="w-full sm:w-auto">
                <Link href="/my-buyer-dashboard/reservations">View My Reservations</Link>
              </Button>
              <Button variant="outline" asChild className="w-full sm:w-auto ml-0 sm:ml-3">
                <Link href="/listings">Browse Listings</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-6">
              If you just completed payment, please wait a moment and refresh the page. 
              The reservation may still be processing.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const daysRemaining = Math.ceil(
    (new Date(reservation.confirmation_deadline).getTime() - new Date().getTime()) / 
    (1000 * 60 * 60 * 24)
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/my-buyer-dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-success flex items-center gap-2">
          <CheckCircle className="w-8 h-8" />
          Reservation Confirmed!
        </h1>
      </div>

      <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PawPrint className="w-5 h-5 text-primary" />
            Your Reserved Puppy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-6 py-3 rounded-full mb-4">
              <PawPrint className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold text-primary">
                {reservation.puppy_collar_color || 'Selected'} Collar Puppy
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              You have successfully reserved the puppy wearing the {(reservation.puppy_collar_color || 'selected').toLowerCase()} collar
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-success" />
            Reservation Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Listing</p>
              <p className="font-semibold">{reservation.listing?.title}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Seller</p>
              <p className="font-semibold">{reservation.listing?.seller_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Amount Paid</p>
              <p className="font-semibold text-success">€50.00</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Reservation Date</p>
              <p className="font-semibold">{new Date(reservation.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-warning" />
            Escrow Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-success"></div>
              <div>
                <p className="font-medium">Payment Confirmed</p>
                <p className="text-sm text-muted-foreground">Your €50 deposit has been secured</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-warning animate-pulse"></div>
              <div>
                <p className="font-medium">Awaiting Seller Confirmation</p>
                <p className="text-sm text-muted-foreground">
                  The seller has {daysRemaining} days to confirm the sale
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-muted"></div>
              <div>
                <p className="font-medium text-muted-foreground">Payment Release</p>
                <p className="text-sm text-muted-foreground">
                  Funds will be released after confirmation or automatically after 14 days
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Important Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Secure Escrow Protection</p>
              <p className="text-sm text-muted-foreground">
                Your payment is held securely and only released when both parties are satisfied
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-warning mt-0.5" />
            <div>
              <p className="font-medium">14-Day Confirmation Period</p>
              <p className="text-sm text-muted-foreground">
                You can raise a dispute if needed within the escrow period
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MessageCircle className="w-5 h-5 text-info mt-0.5" />
            <div>
              <p className="font-medium">Direct Communication</p>
              <p className="text-sm text-muted-foreground">
                You can message the seller directly through your dashboard
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        {conversationId ? (
          <Button 
            onClick={() => {
              const role = user?.user_metadata?.role;
              if (role === 'buyer') {
                router.push(`/my-buyer-dashboard/messages/${conversationId}`);
              } else if (role === 'seller') {
                router.push(`/my-seller-dashboard/messages/${conversationId}`);
              } else {
                router.push(`/`);
              }
            }}
            className="flex-1"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Open Chat with Seller
          </Button>
        ) : (
          <Button asChild className="flex-1">
            <Link href="/my-buyer-dashboard/messages">
              <MessageCircle className="w-4 h-4 mr-2" />
              View Messages
            </Link>
          </Button>
        )}
        <Button variant="outline" asChild className="flex-1">
          <Link href="/my-buyer-dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            View Dashboard
          </Link>
        </Button>
      </div>
      
      {conversationId && (
        <div className="text-center text-sm text-muted-foreground mt-4 flex items-center justify-center gap-2">
          <Clock className="w-4 h-4 animate-pulse" />
          <p>Redirecting to chat in 3 seconds...</p>
        </div>
      )}
    </div>
  );
}

export default function ReservationSuccessPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Skeleton className="h-8 w-64 mb-6" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    }>
      <ReservationSuccessContent />
    </Suspense>
  );
}

