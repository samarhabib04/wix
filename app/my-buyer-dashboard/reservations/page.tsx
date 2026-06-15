'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, CheckCircle, XCircle, Euro, Calendar, AlertTriangle, Shield, Eye, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Reservation {
  id: string;
  listing_id: string;
  puppy_collar_color: string | null;
  puppy_gender: 'male' | 'female' | null;
  reservation_type: 'basic' | 'individual' | null;
  puppy_id: string | null;
  puppy_color: string | null;
  status: string;
  amount: number;
  seller_payout_amount: number;
  platform_fee_amount: number;
  confirmation_deadline: string;
  created_at: string;
  buyer_confirmed: boolean | null;
  seller_confirmed: boolean | null;
  dispute_status: string | null;
  admin_confirmed?: boolean | null;
  user_confirmed?: boolean | null;
  dispute_reason: string | null;
  message: string | null;
  sale_listings: {
    title: string;
    seller_id: string;
    images: string[] | null;
    puppy_details: any[] | null;
  };
}

export default function BuyerReservationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);


  useEffect(() => {
    if (user) {
      fetchReservations();
    }
  }, [user]);

  const fetchReservations = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          sale_listings!inner (
            title,
            seller_id,
            images,
            puppy_details
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReservations((data || []) as unknown as Reservation[]);
    } catch (error: any) {
      console.error('Error fetching reservations:', error);
      toast({
        title: "Error",
        description: "Failed to load reservations.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (reservationId: string) => {
    setConfirmingId(reservationId);
    try {
      const { data, error } = await supabase.functions.invoke('reservations-confirm', {
        body: { reservationId }
      });

      if (error) throw error;

      toast({
        title: "Reservation Confirmed",
        description: data.bothConfirmed
          ? "You and the seller have both confirmed. The escrow period is now active and your deposit stays protected until the sale is complete."
          : "Your confirmation is saved. We still need the seller to confirm before escrow starts.",
      });

      fetchReservations();
    } catch (error: any) {
      console.error('Error confirming reservation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to confirm reservation.",
        variant: "destructive"
      });
    } finally {
      setConfirmingId(null);
    }
  };



  const getStatusBadge = (reservation: Reservation) => {
    switch (reservation.status) {
      case 'awaiting_confirmation':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Awaiting Confirmation</Badge>;
      case 'both_confirmed':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Both Confirmed</Badge>;
      case 'disputed':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Disputed</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'refunded':
        return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" />Refunded</Badge>;
      default:
        return <Badge variant="outline">{reservation.status}</Badge>;
    }
  };

  const getDaysRemaining = (deadline: string) => {
    const days = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  // Helper function to get puppy details from puppy_details array
  const getPuppyFromDetails = (puppyDetails: any[] | null | undefined, puppyId: string | null): any => {
    if (!puppyDetails || !Array.isArray(puppyDetails) || !puppyId) {
      return null;
    }
    return puppyDetails.find((p: any) => p && p.id === puppyId) || null;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">My Reservations</h1>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded-lg"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2">My Reservations</h1>
        <p className="text-muted-foreground">
          Manage your puppy reservations
        </p>
      </div>

      {reservations.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium mb-2">No reservations yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              When you reserve a puppy, it will appear here
            </p>
            <Button onClick={() => router.push('/listings')}>
              Browse Listings
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reservations.map((reservation) => (
            <Card key={reservation.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(reservation)}
                      {reservation.puppy_gender && (
                        <Badge variant={reservation.puppy_gender === 'male' ? 'default' : 'secondary'}>
                          {reservation.puppy_gender === 'male' ? '♂ Male' : '♀ Female'}
                        </Badge>
                      )}
                      {reservation.reservation_type && (
                        <Badge variant="outline">
                          {reservation.reservation_type === 'individual' ? 'Individual Puppy' : 'Gender Only'}
                        </Badge>
                      )}
                      {reservation.puppy_collar_color ? (
                        <Badge variant="outline">
                          {reservation.puppy_collar_color} Collar
                        </Badge>
                      ) : reservation.reservation_type === 'basic' && (
                        <Badge variant="outline" className="opacity-60">
                          No Collar Preference
                        </Badge>
                      )}
                      {reservation.dispute_status && reservation.dispute_status !== 'none' && (
                        <Badge variant="destructive">
                          {reservation.dispute_status.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold text-lg">
                        {reservation.sale_listings.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Reserved on {new Date(reservation.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Euro className="w-4 h-4 text-muted-foreground" />
                        <span>€{(reservation.amount / 100).toFixed(2)} deposit</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span title="Time left in the confirmation and escrow window for this reservation">
                          {reservation.status === 'both_confirmed' || reservation.status === 'awaiting_confirmation'
                            ? `${getDaysRemaining(reservation.confirmation_deadline)} days left in window`
                            : 'Window ended'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className={`w-4 h-4 ${reservation.buyer_confirmed ? 'text-green-500' : 'text-muted-foreground'}`} />
                        <span>You: {reservation.buyer_confirmed ? 'Confirmed (paid)' : 'Pending'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className={`w-4 h-4 ${reservation.seller_confirmed ? 'text-green-500' : 'text-muted-foreground'}`} />
                        <span>Seller: {reservation.seller_confirmed ? 'Confirmed' : 'Pending'}</span>
                      </div>
                    </div>

                    {/* Reservation Details */}
                    {(() => {
                      // Get puppy from puppy_details if puppy_id exists
                      const puppyFromDetails = reservation.puppy_id 
                        ? getPuppyFromDetails(reservation.sale_listings?.puppy_details, reservation.puppy_id)
                        : null;
                      
                      // Prefer puppy_details data, fallback to reservation fields
                      const displayGender = puppyFromDetails?.sex 
                        ? (puppyFromDetails.sex === 'male' ? '♂ Male' : '♀ Female')
                        : reservation.puppy_gender 
                          ? (reservation.puppy_gender === 'male' ? '♂ Male' : '♀ Female')
                          : 'Not specified';
                      
                      const displayCollar = puppyFromDetails?.colourCollar 
                        ? puppyFromDetails.colourCollar
                        : reservation.puppy_collar_color || 'No preference';
                      
                      const displayColor = puppyFromDetails?.color 
                        ? puppyFromDetails.color
                        : reservation.puppy_color || null;
                      
                      return (
                        <div className="bg-muted/50 p-4 rounded-md space-y-2 text-sm">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-muted-foreground">Gender: </span>
                              <span className="font-medium">{displayGender}</span>
                              {puppyFromDetails?.sex && (
                                <span className="text-xs text-muted-foreground ml-1">(from puppy details)</span>
                              )}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Type: </span>
                              <span className="font-medium">
                                {reservation.reservation_type 
                                  ? (reservation.reservation_type === 'individual' ? 'Individual Puppy' : 'Gender Only')
                                  : 'N/A'}
                              </span>
                            </div>
                            {reservation.puppy_id && (
                              <div>
                                <span className="text-muted-foreground">Puppy ID: </span>
                                <span className="font-medium font-mono text-xs">{reservation.puppy_id}</span>
                              </div>
                            )}
                            {displayColor && (
                              <div>
                                <span className="text-muted-foreground">Color: </span>
                                <span className="font-medium">{displayColor}</span>
                                {puppyFromDetails?.color && (
                                  <span className="text-xs text-muted-foreground ml-1">(from puppy details)</span>
                                )}
                              </div>
                            )}
                            <div>
                              <span className="text-muted-foreground">Collar: </span>
                              <span className="font-medium">{displayCollar}</span>
                              {puppyFromDetails?.colourCollar && (
                                <span className="text-xs text-muted-foreground ml-1">(from puppy details)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Legacy only: older reservations before payment counted as buyer confirmation */}
                    {reservation.status === 'awaiting_confirmation' && !reservation.buyer_confirmed && (
                      <Alert className="border-brand-dark-green/40 bg-brand-light-green/10">
                        <Info className="h-4 w-4 text-brand-dark-green" />
                        <AlertDescription className="text-foreground space-y-2">
                          <p className="font-medium text-brand-dark-green">
                            {reservation.seller_confirmed
                              ? 'Seller confirmed — one step left'
                              : 'Confirm you are happy to proceed'}
                          </p>
                          {reservation.seller_confirmed ? (
                            <p className="text-sm leading-relaxed">
                              Your €{(reservation.amount / 100).toFixed(2)} deposit is already paid; you are{' '}
                              <strong>not</strong> being charged again. The seller has confirmed this reservation.
                              Tap <strong>Confirm sale</strong> below to agree you are ready to complete the purchase on
                              these terms. Once you do, both sides are confirmed and the{' '}
                              <strong>escrow</strong> period runs: your funds stay with Dog Quest until the sale is
                              finished or any dispute is resolved.
                            </p>
                          ) : (
                            <p className="text-sm leading-relaxed">
                              Your deposit payment was received (that is separate from this button). Tap{' '}
                              <strong>Confirm sale</strong> when you are happy to go ahead with this puppy. The seller
                              must confirm too. After <strong>both</strong> of you confirm, the escrow period begins and
                              your deposit remains protected until the sale is complete.
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground leading-relaxed border-t border-brand-dark-green/15 pt-2 mt-1">
                            <strong className="text-foreground">What is escrow?</strong> Your payment is held safely by
                            the platform—not sent straight to the seller—until the agreed steps are completed. That
                            protects you if something goes wrong.
                          </p>
                        </AlertDescription>
                      </Alert>
                    )}

                    {reservation.status === 'awaiting_confirmation' &&
                      reservation.buyer_confirmed &&
                      !reservation.seller_confirmed && (
                        <Alert className="border-blue-200 bg-blue-50/60 dark:bg-blue-950/20">
                          <Clock className="h-4 w-4 text-blue-700" />
                          <AlertDescription className="text-foreground space-y-1">
                            <p className="font-medium text-blue-900 dark:text-blue-100">
                              Waiting for the seller
                            </p>
                            <p className="text-sm leading-relaxed">
                              Your deposit payment counts as your confirmation — no extra step needed. When the seller
                              confirms this reservation in their dashboard, the <strong>escrow</strong> period begins and
                              your deposit stays protected until the sale is complete or any dispute is resolved.
                            </p>
                          </AlertDescription>
                        </Alert>
                      )}

                    {reservation.dispute_reason && reservation.dispute_status && reservation.dispute_status !== 'none' && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Dispute Reason:</strong> {reservation.dispute_reason}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {reservation.status === 'awaiting_confirmation' && !reservation.buyer_confirmed && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleConfirm(reservation.id)}
                          disabled={confirmingId === reservation.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {confirmingId === reservation.id ? "Confirming..." : "Confirm sale"}
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/listing/${reservation.listing_id}`)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Listing
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
