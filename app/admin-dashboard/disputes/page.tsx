'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Eye, MessageSquare, DollarSign } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Dispute {
  id: string;
  reservation_id: string;
  reason: string;
  description: string;
  status: string;
  created_at: string;
  evidence_files: any[];
  reservations: {
    puppy_collar_color: string;
    amount: number;
    sale_listings: {
      title: string;
      breed: string;
    };
    user_profiles: {
      first_name: string;
      last_name: string;
    };
  };
}

export default function AdminDisputesPage() {
  const { toast } = useToast();
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: disputes, isLoading } = useQuery({
    queryKey: ['admin-disputes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservation_disputes')
        .select(`
          *,
          reservations (
            puppy_collar_color,
            amount,
            sale_listings (title, breed),
            user_profiles (first_name, last_name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as unknown) as Dispute[];
    }
  });

  const handleStatusUpdate = async (disputeId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('reservation_disputes')
        .update({ status: newStatus })
        .eq('id', disputeId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Dispute status updated"
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Disputes Management</h2>
        <div className="py-12 text-center">Loading disputes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Disputes Management</h2>

      <div className="grid gap-4">
        {disputes && disputes.length > 0 ? (
          disputes.map((dispute) => (
            <Card key={dispute.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Dispute #{dispute.id.substring(0, 8)}
                  </CardTitle>
                  <Badge
                    variant={
                      dispute.status === 'resolved' ? 'default' :
                      dispute.status === 'pending' ? 'secondary' :
                      'destructive'
                    }
                  >
                    {dispute.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Reason:</strong> {dispute.reason}</p>
                  <p><strong>Description:</strong> {dispute.description}</p>
                  {dispute.reservations && (
                    <div className="mt-4 p-4 bg-gray-50 rounded">
                      <p><strong>Reservation:</strong> {dispute.reservations.sale_listings?.title}</p>
                      <p><strong>Amount:</strong> €{dispute.reservations.amount}</p>
                      <p><strong>Buyer:</strong> {dispute.reservations.user_profiles?.first_name} {dispute.reservations.user_profiles?.last_name}</p>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Created {formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedDispute(dispute);
                      setDialogOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <Select
                    value={dispute.status}
                    onValueChange={(value) => handleStatusUpdate(dispute.id, value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No disputes found</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dispute Details</DialogTitle>
          </DialogHeader>
          {selectedDispute && (
            <div className="space-y-4">
              <div>
                <strong>Status:</strong> <Badge>{selectedDispute.status}</Badge>
              </div>
              <div>
                <strong>Reason:</strong>
                <p>{selectedDispute.reason}</p>
              </div>
              <div>
                <strong>Description:</strong>
                <p>{selectedDispute.description}</p>
              </div>
              {selectedDispute.evidence_files && selectedDispute.evidence_files.length > 0 && (
                <div>
                  <strong>Evidence Files:</strong>
                  <div className="mt-2 space-y-1">
                    {selectedDispute.evidence_files.map((file: any, idx: number) => (
                      <div key={idx} className="text-sm text-muted-foreground">
                        {file.name || `File ${idx + 1}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}



