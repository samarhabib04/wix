'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, CheckCircle, XCircle, Euro, Calendar, MessageCircle, AlertTriangle, Shield, Eye, CreditCard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { messageSenderDisplayName } from '@/lib/utils/message-sender-display-name';
import { isStripeConnectReadyFromCheckStatus } from '@/lib/utils/stripe-connect';
import { useRouter } from 'next/navigation';
import { StripeConnectOnboarding } from '@/components/seller-dashboard/StripeConnectOnboarding';

interface StripeAccount {
  status: 'no_account' | 'exists';
  account_id?: string;
  onboarding_completed: boolean;
  payout_enabled: boolean;
  charges_enabled?: boolean;
  requirements?: string[];
}

interface Reservation {
  id: string;
  listing_id: string;
  user_id: string;
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
    puppy_details?: any[] | null;
  };
  user_profiles: {
    first_name: string | null;
    last_name: string | null;
    business_name: string | null;
    role: string | null;
    is_admin: boolean | null;
  } | null;
}

export default function SellerReservationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [stripeAccount, setStripeAccount] = useState<StripeAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaymentSetup, setIsPaymentSetup] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [isSubmittingDeny, setIsSubmittingDeny] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const [denyDialogOpen, setDenyDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      checkPaymentSetup();
    }
  }, [user]);

  useEffect(() => {
    if (isPaymentSetup && user) {
      fetchReservations();
    }
  }, [isPaymentSetup, user]);

  const checkPaymentSetup = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('manage-stripe-account', {
        body: { action: 'check_status' }
      });

      if (error) throw error;

      setStripeAccount(data);

      setIsPaymentSetup(isStripeConnectReadyFromCheckStatus(data));
    } catch (error) {
      console.error('Error checking payment setup:', error);
      toast({
        title: "Error",
        description: "Failed to check payment setup status.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSetupComplete = () => {
    checkPaymentSetup();
  };

  // Helper function to get puppy from puppy_details array
  const getPuppyFromDetails = (puppyDetails: any[] | null | undefined, puppyId: string | null): any => {
    if (!puppyId || !Array.isArray(puppyDetails)) return null;
    return puppyDetails.find((p: any) => p?.id === puppyId) || null;
  };

  const fetchReservations = async () => {
    if (!user?.id) return;

    try {
      setReservationsLoading(true);
      // First, fetch reservations with sale_listings
      const { data: reservationsData, error: reservationsError } = await supabase
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
        .eq('sale_listings.seller_id', user.id)
        .order('created_at', { ascending: false });

      if (reservationsError) throw reservationsError;

      if (!reservationsData || reservationsData.length === 0) {
        setReservations([]);
        return;
      }

      // Get unique user IDs from reservations (filter out null values)
      const userIds = [...new Set(reservationsData.map(r => r.user_id).filter((id): id is string => id !== null && id !== undefined))];

      // Buyer identity: use SECURITY DEFINER RPC (same as messaging) so RLS does not hide rows.
      let userProfilesMap: Record<string, Reservation['user_profiles']> = {};
      if (userIds.length > 0) {
        const results = await Promise.all(
          userIds.map(async (id) => {
            const { data, error } = await supabase.rpc('get_public_user_name', {
              user_id_param: id,
            });
            if (error) {
              console.error('get_public_user_name (reservations):', error);
              return [id, null] as const;
            }
            const row = data?.[0];
            if (!row) return [id, null] as const;
            return [
              id,
              {
                first_name: row.first_name,
                last_name: row.last_name,
                business_name: row.business_name,
                role: row.role,
                is_admin: row.is_admin,
              },
            ] as const;
          })
        );
        userProfilesMap = Object.fromEntries(results);
      }

      // Combine reservations with buyer display fields
      const enrichedReservations = reservationsData.map(reservation => ({
        ...reservation,
        user_profiles: reservation.user_id ? userProfilesMap[reservation.user_id] ?? null : null,
      }));

      setReservations(enrichedReservations as unknown as Reservation[]);
    } catch (error: any) {
      console.error('Error fetching reservations:', error);
      toast({
        title: "Error",
        description: "Failed to load reservations.",
        variant: "destructive"
      });
    } finally {
      setReservationsLoading(false);
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
          ? "Both parties have confirmed. The escrow period is now running — your payout timing follows the 14-day window."
          : "Your confirmation has been sent. Waiting for buyer confirmation.",
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

  const handleDeny = async (reservationId: string) => {
    if (!denyReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for denying the reservation.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmittingDeny(true);
    try {
      const { data, error } = await supabase.functions.invoke('reservation-deny', {
        body: {
          reservationId,
          reason: denyReason.trim()
        }
      });

      if (error) throw error;

      toast({
        title: "Reservation Denied",
        description: "The dispute has been sent for admin review.",
      });

      setDenyDialogOpen(false);
      setDenyReason('');
      fetchReservations();
    } catch (error: any) {
      console.error('Error denying reservation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to deny reservation.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingDeny(false);
      setDenyingId(null);
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


  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Reservations</h1>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If payment not set up, show setup form
  if (!isPaymentSetup) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Reservations</h1>
          <p className="text-muted-foreground">
            Set up payment details to enable reservations for your listings
          </p>
        </div>

        <Alert className="border-brand-dark-green bg-brand-light-green/10">
          <Shield className="h-4 w-4 text-brand-dark-green" />
          <AlertDescription className="text-brand-dark-green">
            <strong>Reservation Setup Required</strong>
            <div className="mt-2 space-y-1 text-sm">
              <p>To enable reservations, you must set up payment details:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>€50 reserve paid by buyer</li>
                <li>€40 released to seller after sale</li>
                <li>€10 kept by DogQuest as platform fee</li>
                <li>Funds held in escrow until both parties confirm</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>

        <StripeConnectOnboarding onSetupComplete={handlePaymentSetupComplete} />
      </div>
    );
  }

  // Payment is set up - show reservations list
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Reservations</h1>
        <p className="text-muted-foreground">
          Manage reservations for your listings
        </p>
      </div>

      {reservationsLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded-lg"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : reservations.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium mb-2">No reservations yet</p>
            <p className="text-sm text-muted-foreground">
              Reservations for your listings will appear here
            </p>
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
                        Reserved by{' '}
                        {messageSenderDisplayName(reservation.user_profiles, 'Unknown buyer')}
                        {' '}on {new Date(reservation.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Euro className="w-4 h-4 text-muted-foreground" />
                        <span>€{(reservation.amount / 100).toFixed(2)} deposit</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Euro className="w-4 h-4 text-green-600" />
                        <span className="text-green-600 font-medium">
                          €{(reservation.seller_payout_amount / 100).toFixed(2)} payout
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {reservation.status === 'both_confirmed' || reservation.status === 'awaiting_confirmation'
                            ? `${getDaysRemaining(reservation.confirmation_deadline)} days left`
                            : 'Escrow ended'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className={`w-4 h-4 ${reservation.buyer_confirmed ? 'text-green-500' : 'text-muted-foreground'}`} />
                        <span>Buyer: {reservation.buyer_confirmed ? 'Confirmed' : 'Pending'}</span>
                      </div>
                    </div>

                    {reservation.status === 'awaiting_confirmation' && !reservation.seller_confirmed && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          The buyer&apos;s deposit confirms they want to proceed. Confirm below to accept — that starts
                          escrow once both sides are aligned (buyer confirmation is automatic when they pay).
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
                        : reservation.puppy_collar_color 
                          ? reservation.puppy_collar_color
                          : reservation.reservation_type === 'individual'
                            ? 'Puppy\'s default collar'
                            : 'No preference';
                      
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

                    {reservation.message && (
                      <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                        <strong>Buyer Message:</strong> {reservation.message}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {reservation.status === 'awaiting_confirmation' && !reservation.seller_confirmed && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleConfirm(reservation.id)}
                          disabled={confirmingId === reservation.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {confirmingId === reservation.id ? "Confirming..." : "Confirm"}
                        </Button>
                        <Dialog open={denyDialogOpen && denyingId === reservation.id} onOpenChange={(open) => {
                          if (!open) {
                            setDenyDialogOpen(false);
                            setDenyReason('');
                            setDenyingId(null);
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setDenyingId(reservation.id);
                                setDenyDialogOpen(true);
                              }}
                            >
                              Deny
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Deny Reservation</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <p className="text-sm text-muted-foreground">
                                Please provide a reason for denying this reservation. This will create a dispute that will be reviewed by an administrator.
                              </p>
                              <textarea
                                className="w-full min-h-[100px] p-2 border rounded-md"
                                placeholder="Enter reason for denial..."
                                value={denyReason}
                                onChange={(e) => setDenyReason(e.target.value)}
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setDenyDialogOpen(false);
                                    setDenyReason('');
                                    setDenyingId(null);
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => handleDeny(reservation.id)}
                                  disabled={isSubmittingDeny || !denyReason.trim()}
                                >
                                  {isSubmittingDeny ? "Submitting..." : "Submit Denial"}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
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
