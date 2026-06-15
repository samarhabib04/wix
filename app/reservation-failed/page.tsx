'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle, ArrowLeft, RefreshCw, MessageCircle, CreditCard } from 'lucide-react';

function ReservationFailedContent() {
  const searchParams = useSearchParams();
  const listingId = searchParams.get('listing_id');
  const error = searchParams.get('error') || 'Payment was cancelled or failed';

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href={listingId ? `/listing/${listingId}` : '/listings'}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Listing
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-destructive flex items-center gap-2">
          <XCircle className="w-8 h-8" />
          Reservation Failed
        </h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>What Happened?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            {error === 'cancelled' 
              ? 'Your payment was cancelled before completion.'
              : 'There was an issue processing your reservation payment.'
            }
          </p>
          <p className="text-sm text-muted-foreground">
            Don't worry - no charges were made to your account.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>What You Can Do</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <RefreshCw className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Try Again</p>
              <p className="text-sm text-muted-foreground">
                Return to the listing and attempt the reservation again
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-info mt-0.5" />
            <div>
              <p className="font-medium">Check Payment Method</p>
              <p className="text-sm text-muted-foreground">
                Ensure your payment method has sufficient funds and is valid
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MessageCircle className="w-5 h-5 text-warning mt-0.5" />
            <div>
              <p className="font-medium">Contact the Seller</p>
              <p className="text-sm text-muted-foreground">
                Message the seller directly to discuss alternative arrangements
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 border-info">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="font-semibold mb-2">Need Help?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              If you continue to experience issues, our support team is here to help.
            </p>
            <Button variant="outline" asChild>
              <Link href="/contact">Contact Support</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        {listingId && (
          <Button asChild className="flex-1">
            <Link href={`/listing/${listingId}`}>Try Reservation Again</Link>
          </Button>
        )}
        <Button variant="outline" asChild className="flex-1">
          <Link href="/listings">Browse Other Listings</Link>
        </Button>
      </div>
    </div>
  );
}

export default function ReservationFailedPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      </div>
    }>
      <ReservationFailedContent />
    </Suspense>
  );
}

