'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, HelpCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Reservation {
  id: string;
  listing_id: string;
  puppy_collar_color: string | null;
  status: string;
  user_id: string | null;
  created_at: string;
  amount: number;
  confirmation_deadline: string;
  buyer_confirmed?: boolean | null;
  seller_confirmed?: boolean | null;
}

export default function ReservationConfirmPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const id = params.id as string;
  const [isConfirming, setIsConfirming] = useState(false);
  const [isRequestingHelp, setIsRequestingHelp] = useState(false);

  // Fetch reservation details
  const { data: reservation, isLoading, error } = useQuery({
    queryKey: ['reservation', id],
    queryFn: async (): Promise<Reservation> => {
      if (!id) throw new Error('No reservation ID provided');
      
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleConfirmProceeding = async () => {
    if (!id) return;
    
    setIsConfirming(true);
    try {
      const { error } = await supabase.functions.invoke('reservations-confirm', {
        body: { reservationId: id }
      });

      if (error) throw error;

      toast({
        title: "Confirmation Received",
        description: "Thank you for confirming! We'll proceed with your reservation.",
      });

      router.push('/my-buyer-dashboard/orders');
    } catch (error) {
      console.error('Error confirming reservation:', error);
      toast({
        title: "Error",
        description: "Failed to confirm reservation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleRequestHelp = async () => {
    if (!id) return;
    
    setIsRequestingHelp(true);
    try {
      const { error } = await supabase.functions.invoke('reservations-help', {
        body: { reservationId: id }
      });

      if (error) throw error;

      toast({
        title: "Help Request Sent",
        description: "Our team will contact you soon to discuss your needs.",
      });

      router.push(`/contact?reservation=${id}`);
    } catch (error) {
      console.error('Error requesting help:', error);
      toast({
        title: "Error", 
        description: "Failed to send help request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRequestingHelp(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullPage label="Loading reservation details..." />;
  }

  if (error || !reservation) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Reservation not found or you don't have permission to view it.</p>
            <Button 
              onClick={() => router.push('/')} 
              variant="outline" 
              className="mt-4"
            >
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const deadlineDate = new Date(reservation.confirmation_deadline);
  const daysRemaining = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const isBuyer = user?.id && reservation.user_id === user.id;
  const buyerAlreadyConfirmedByPayment =
    Boolean(isBuyer && reservation.buyer_confirmed && reservation.status === 'awaiting_confirmation');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Reservation Confirmation</CardTitle>
            <p className="text-muted-foreground">
              {buyerAlreadyConfirmedByPayment
                ? 'Your reserve payment already confirms you want to proceed.'
                : "Let us know if you're ready to proceed or need assistance"}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Reservation Details */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">Reservation ID:</span>
                <Badge variant="outline">{reservation.id.slice(0, 8)}</Badge>
              </div>
              {reservation.puppy_collar_color && (
                <div className="flex justify-between items-center">
                  <span className="font-medium">Collar Color:</span>
                  <span className="capitalize">{reservation.puppy_collar_color}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="font-medium">Status:</span>
                <Badge>{reservation.status}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Reserved On:</span>
                <span>{new Date(reservation.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Action Buttons — buyers who paid no longer need a second "I'm Proceeding" tap */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {buyerAlreadyConfirmedByPayment ? (
                <div className="md:col-span-2 space-y-3">
                  <p className="text-sm text-center text-muted-foreground">
                    We’re waiting for the seller to confirm. You can track this under{' '}
                    <strong>My Reservations</strong> in your dashboard.
                  </p>
                  <Button
                    type="button"
                    size="lg"
                    className="w-full"
                    onClick={() => router.push('/my-buyer-dashboard/reservations')}
                  >
                    Go to My Reservations
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    onClick={handleConfirmProceeding}
                    disabled={isConfirming}
                    size="lg"
                    className="h-16 flex flex-col gap-2"
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span>{isConfirming ? 'Confirming...' : "I'm Proceeding"}</span>
                  </Button>

                  <Button
                    onClick={handleRequestHelp}
                    disabled={isRequestingHelp}
                    variant="outline"
                    size="lg"
                    className="h-16 flex flex-col gap-2"
                  >
                    <HelpCircle className="h-5 w-5" />
                    <span>{isRequestingHelp ? 'Sending...' : 'I Need Help / Changes'}</span>
                  </Button>
                </>
              )}
            </div>

            {/* Timeline Reminder */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
              <p className="text-sm text-amber-800">
                <strong>Timeline Reminder:</strong> If you don't confirm by Day 21, funds will be released automatically.
                {daysRemaining > 0 && (
                  <span className="block mt-1">
                    You have {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining.
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

