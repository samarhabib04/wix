'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, AlertTriangle, CheckCircle, XCircle, Euro, Calendar, Eye, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Reservation {
  id: string;
  listing_id: string;
  user_id: string;
  puppy_collar_color: string | null;
  status: string;
  amount: number;
  seller_payout_amount: number;
  platform_fee_amount: number;
  confirmation_deadline: string;
  created_at: string;
  buyer_confirmed: boolean | null;
  seller_confirmed: boolean | null;
  dispute_status: string | null;
  dispute_reason: string | null;
  message: string | null;
  sale_listings: {
    title: string;
    seller_id: string;
    images: string[] | null;
  };
  user_profiles: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  seller_profiles: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export default function AdminHandleReservationsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [resolution, setResolution] = useState<'approve_refund' | 'approve_release'>('approve_refund');
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          sale_listings!inner (
            title,
            seller_id,
            images
          )
        `)
        .eq('status', 'disputed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch buyer and seller profiles separately
      const reservationsWithProfiles = await Promise.all(
        (data || []).map(async (reservation: any) => {
          const [buyerProfileResult, sellerProfileResult] = await Promise.all([
            supabase
              .from('user_profiles')
              .select('first_name, last_name, email')
              .eq('id', reservation.user_id)
              .single(),
            supabase
              .from('user_profiles')
              .select('first_name, last_name, email')
              .eq('id', reservation.sale_listings.seller_id)
              .single()
          ]);

          return {
            ...reservation,
            user_profiles: buyerProfileResult.data,
            seller_profiles: sellerProfileResult.data
          };
        })
      );

      setReservations(reservationsWithProfiles as unknown as Reservation[]);
    } catch (error: any) {
      console.error('Error fetching reservations:', error);
      toast({
        title: "Error",
        description: "Failed to load disputed reservations.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedReservation) return;

    setResolvingId(selectedReservation.id);
    try {
      const { data, error } = await supabase.functions.invoke('admin-resolve-reservation', {
        body: {
          reservationId: selectedReservation.id,
          resolution,
          adminNotes: adminNotes.trim() || undefined
        }
      });

      if (error) throw error;

      toast({
        title: "Dispute Resolved",
        description: `Reservation dispute has been resolved. ${resolution === 'approve_refund' ? 'Refund approved.' : 'Payment released to seller.'}`,
      });

      setResolveDialogOpen(false);
      setSelectedReservation(null);
      setAdminNotes('');
      setResolution('approve_refund');
      fetchReservations();
    } catch (error: any) {
      console.error('Error resolving reservation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to resolve dispute.",
        variant: "destructive"
      });
    } finally {
      setResolvingId(null);
    }
  };

  const openResolveDialog = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setResolution('approve_refund');
    setAdminNotes('');
    setResolveDialogOpen(true);
  };

  const getDisputeStatusBadge = (disputeStatus: string | null) => {
    if (!disputeStatus || disputeStatus === 'none') return null;
    switch (disputeStatus) {
      case 'buyer_denied':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Buyer Denied</Badge>;
      case 'seller_denied':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Seller Denied</Badge>;
      case 'admin_reviewing':
        return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" />Under Review</Badge>;
      default:
        return <Badge variant="outline">{disputeStatus}</Badge>;
    }
  };

  const filteredReservations = reservations.filter(reservation => {
    if (filterStatus !== 'all' && reservation.dispute_status !== filterStatus) return false;
    if (!reservation.dispute_status) return false;
    if (searchTerm && 
        !reservation.sale_listings?.title?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !reservation.user_profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !reservation.seller_profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Handle Reservations</h1>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded-lg"></div>
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
        <h1 className="text-2xl font-semibold mb-2">Handle Reservations</h1>
        <p className="text-muted-foreground">
          Review and resolve disputed reservations
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reservations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Disputes</SelectItem>
            <SelectItem value="buyer_denied">Buyer Denied</SelectItem>
            <SelectItem value="seller_denied">Seller Denied</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredReservations.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500 opacity-50" />
            <p className="text-lg font-medium mb-2">No disputed reservations</p>
            <p className="text-sm text-muted-foreground">
              All reservations are currently resolved
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReservations.map((reservation) => (
            <Card key={reservation.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getDisputeStatusBadge(reservation.dispute_status)}
                      {reservation.puppy_collar_color && (
                        <Badge variant="outline">
                          {reservation.puppy_collar_color} Collar
                        </Badge>
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold text-lg">
                        {reservation.sale_listings.title}
                      </h3>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          <strong>Buyer:</strong> {reservation.user_profiles 
                            ? `${reservation.user_profiles.first_name} ${reservation.user_profiles.last_name} (${reservation.user_profiles.email})`
                            : 'Unknown'}
                        </p>
                        <p>
                          <strong>Seller:</strong> {reservation.seller_profiles
                            ? `${reservation.seller_profiles.first_name} ${reservation.seller_profiles.last_name} (${reservation.seller_profiles.email})`
                            : 'Unknown'}
                        </p>
                        <p>
                          Reserved on {new Date(reservation.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Euro className="w-4 h-4 text-muted-foreground" />
                        <span>€{(reservation.amount / 100).toFixed(2)} deposit</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Euro className="w-4 h-4 text-green-600" />
                        <span>€{(reservation.seller_payout_amount / 100).toFixed(2)} to seller</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Euro className="w-4 h-4 text-muted-foreground" />
                        <span>€{(reservation.platform_fee_amount / 100).toFixed(2)} platform fee</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className={`w-4 h-4 ${reservation.buyer_confirmed ? 'text-green-500' : 'text-muted-foreground'}`} />
                        <span>Buyer: {reservation.buyer_confirmed ? 'Confirmed' : 'Not Confirmed'}</span>
                      </div>
                    </div>

                    {reservation.dispute_reason && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Dispute Reason:</strong> {reservation.dispute_reason}
                        </AlertDescription>
                      </Alert>
                    )}

                    {reservation.message && (
                      <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                        <strong>Buyer Message:</strong> {reservation.message}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      onClick={() => openResolveDialog(reservation)}
                      disabled={resolvingId === reservation.id}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Resolve Dispute
                    </Button>
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

      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resolve Reservation Dispute</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm font-medium mb-2">Reservation Details:</p>
                <p className="text-sm">{selectedReservation.sale_listings.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Disputed by: {selectedReservation.dispute_status === 'buyer_denied' ? 'Buyer' : 'Seller'}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Resolution</label>
                <Select value={resolution} onValueChange={(value: 'approve_refund' | 'approve_release') => setResolution(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approve_refund">
                      Approve Refund (€{(selectedReservation.seller_payout_amount / 100).toFixed(2)} to buyer, €{(selectedReservation.platform_fee_amount / 100).toFixed(2)} kept by platform)
                    </SelectItem>
                    <SelectItem value="approve_release">
                      Approve Release (€{(selectedReservation.seller_payout_amount / 100).toFixed(2)} to seller)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes (Optional)</label>
                <Textarea
                  placeholder="Add notes about this resolution..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setResolveDialogOpen(false);
                    setSelectedReservation(null);
                    setAdminNotes('');
                    setResolution('approve_refund');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleResolve}
                  disabled={resolvingId === selectedReservation.id}
                >
                  {resolvingId === selectedReservation.id ? "Resolving..." : "Resolve Dispute"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
