import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, CheckCircle, Euro, User, Calendar, MessageCircle, AlertTriangle } from 'lucide-react';
import { useReservations } from '@/hooks/use-reservations';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';

interface Reservation {
  id: string;
  listing_id: string;
  puppy_collar_color: string | null;
  puppy_gender: 'male' | 'female' | null;
  reservation_type: 'basic' | 'individual' | null;
  puppy_id: string | null;
  puppy_color: string | null;
  status: string;
  user_id: string;
  amount: number;
  seller_payout_amount: number;
  platform_fee_amount: number;
  confirmation_deadline: string;
  created_at: string;
  user_confirmed: boolean;
  admin_confirmed: boolean;
}

interface ReservationManagementProps {
  sellerId: string;
}

export const ReservationManagement: React.FC<ReservationManagementProps> = ({ sellerId }) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingReservation, setConfirmingReservation] = useState<string | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    fetchReservations();
  }, [sellerId]);

  const fetchReservations = async () => {
    try {
      // This would need to be implemented to fetch reservations for seller's listings
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          sale_listings!inner(seller_id, title)
        `)
        .eq('sale_listings.seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReservations((data || []) as any);
    } catch (error) {
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

  const confirmReservation = async (reservationId: string) => {
    setConfirmingReservation(reservationId);
    try {
      const { error } = await supabase
        .from('reservations')
        .update({
          user_confirmed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', reservationId);

      if (error) throw error;

      toast({
        title: "Reservation Confirmed",
        description: "The reservation has been confirmed. Payment will be processed."
      });

      fetchReservations();
    } catch (error) {
      console.error('Error confirming reservation:', error);
      toast({
        title: "Error",
        description: "Failed to confirm reservation.",
        variant: "destructive"
      });
    } finally {
      setConfirmingReservation(null);
    }
  };

  const getStatusBadge = (reservation: Reservation) => {
    switch (reservation.status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending Payment</Badge>;
      case 'confirmed':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Confirmed</Badge>;
      case 'completed':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
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
      <Card>
        <CardHeader>
          <CardTitle>Reservations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Euro className="w-5 h-5" />
          Puppy Reservations
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reservations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Euro className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No reservations yet</p>
            <p className="text-sm">Reservations will appear here when buyers reserve your puppies</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reservations.map((reservation) => (
              <Card key={reservation.id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(reservation)}
                        {reservation.puppy_gender && (
                          <Badge variant={reservation.puppy_gender === 'male' ? 'default' : 'secondary'}>
                            {reservation.puppy_gender === 'male' ? '♂ Male' : '♀ Female'}
                          </Badge>
                        )}
                        {reservation.reservation_type && (
                          <Badge variant="outline">
                            {reservation.reservation_type === 'individual' ? 'Individual' : 'Gender Only'}
                          </Badge>
                        )}
                        {reservation.puppy_collar_color ? (
                          <Badge variant="outline">
                            {reservation.puppy_collar_color} Collar
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="opacity-60">
                            No Collar Preference
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Euro className="w-4 h-4 text-muted-foreground" />
                          <span>€{(reservation.amount / 100).toFixed(2)} deposit</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>Buyer ID: {reservation.user_id.slice(-8)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{new Date(reservation.created_at).toLocaleDateString()}</span>
                        </div>
                        {reservation.status === 'confirmed' && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-warning" />
                            <span>{getDaysRemaining(reservation.confirmation_deadline)} days left</span>
                          </div>
                        )}
                      </div>

                      {reservation.status === 'confirmed' && !reservation.user_confirmed && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Please confirm this reservation to receive your €{(reservation.seller_payout_amount / 100).toFixed(2)} payout.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      {reservation.status === 'confirmed' && !reservation.user_confirmed && (
                        <Button
                          size="sm"
                          onClick={() => confirmReservation(reservation.id)}
                          disabled={confirmingReservation === reservation.id}
                          className="bg-success hover:bg-success/90"
                        >
                          {confirmingReservation === reservation.id ? "Confirming..." : "Confirm Sale"}
                        </Button>
                      )}
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reservation Details</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="font-medium">Total Deposit</p>
                                <p>€{(reservation.amount / 100).toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="font-medium">Your Payout</p>
                                <p className="text-success">€{(reservation.seller_payout_amount / 100).toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="font-medium">Platform Fee</p>
                                <p>€{(reservation.platform_fee_amount / 100).toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="font-medium">Puppy</p>
                                <p>
                                  {reservation.puppy_gender && (
                                    <span>{reservation.puppy_gender === 'male' ? '♂ Male' : '♀ Female'} - </span>
                                  )}
                                  {reservation.puppy_collar_color ? `${reservation.puppy_collar_color} collar` : 'No collar preference'}
                                  {reservation.reservation_type === 'individual' && reservation.puppy_id && (
                                    <span className="block text-xs text-muted-foreground mt-1">ID: {reservation.puppy_id}</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            
                            <div className="border-t pt-4">
                              <p className="text-sm text-muted-foreground">
                                Reservation created on {new Date(reservation.created_at).toLocaleString()}
                              </p>
                              {reservation.status === 'confirmed' && (
                                <p className="text-sm text-muted-foreground">
                                  Confirmation deadline: {new Date(reservation.confirmation_deadline).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
