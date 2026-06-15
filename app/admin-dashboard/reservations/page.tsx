'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Euro, 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle, 
  User, 
  Calendar,
  AlertTriangle,
  Eye,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AdminTable from '@/components/admin-dashboard/AdminTable';
import TruncatedCellText from '@/components/admin-dashboard/TruncatedCellText';

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
  created_at: string;
  sale_listings?: {
    title: string;
    breed: string;
    puppy_details?: any[] | null;
  };
  user_profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export default function AdminReservationsPage() {
  const { toast } = useToast();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Helper function to get puppy from puppy_details array
  const getPuppyFromDetails = (puppyDetails: any[] | null | undefined, puppyId: string | null): any => {
    if (!puppyId || !Array.isArray(puppyDetails)) return null;
    return puppyDetails.find((p: any) => p?.id === puppyId) || null;
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          sale_listings (title, breed, puppy_details),
          user_profiles (first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReservations((data || []) as unknown as Reservation[]);
    } catch (error: any) {
      console.error('Error fetching reservations:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load reservations"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredReservations = reservations.filter(reservation => {
    if (filterStatus !== "all" && reservation.status !== filterStatus) return false;
    if (searchTerm && 
        !reservation.sale_listings?.title?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !reservation.user_profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "confirmed":
        return <Badge className="bg-green-500">Confirmed</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const columns = [
    { key: "id", label: "ID", render: (value: string) => value.substring(0, 8) + "..." },
    { 
      key: "listing", 
      label: "Listing", 
      render: (value: any, row: Reservation) => {
        const puppyFromDetails = row.puppy_id 
          ? getPuppyFromDetails(row.sale_listings?.puppy_details, row.puppy_id)
          : null;
        const displayGender = puppyFromDetails?.sex 
          ? (puppyFromDetails.sex === 'male' ? '♂ Male' : '♀ Female')
          : row.puppy_gender 
            ? (row.puppy_gender === 'male' ? '♂ Male' : '♀ Female')
            : null;
        
        return (
          <div>
            <TruncatedCellText text={row.sale_listings?.title || 'N/A'} maxChars={28} className="font-medium max-w-[220px]" />
            {displayGender && (
              <Badge variant="outline" className="mt-1 text-xs">
                {displayGender}
              </Badge>
            )}
          </div>
        );
      }
    },
    { 
      key: "buyer", 
      label: "Buyer", 
      render: (value: any, row: Reservation) => (
        <TruncatedCellText
          text={`${row.user_profiles?.first_name || ''} ${row.user_profiles?.last_name || ''}`.trim() || 'Unknown'}
          maxChars={24}
          className="max-w-[180px]"
        />
      )
    },
    { 
      key: "details", 
      label: "Details", 
      render: (value: any, row: Reservation) => {
        const puppyFromDetails = row.puppy_id 
          ? getPuppyFromDetails(row.sale_listings?.puppy_details, row.puppy_id)
          : null;
        const displayCollar = puppyFromDetails?.colourCollar 
          ? puppyFromDetails.colourCollar
          : row.puppy_collar_color || 'No preference';
        const displayColor = puppyFromDetails?.color 
          ? puppyFromDetails.color
          : row.puppy_color || null;
        
        return (
          <div className="space-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">Type: </span>
              <span>{row.reservation_type === 'individual' ? 'Individual' : row.reservation_type === 'basic' ? 'Gender Only' : 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Collar: </span>
              <span>{displayCollar}</span>
              {puppyFromDetails?.colourCollar && (
                <span className="text-xs text-muted-foreground ml-1">(from details)</span>
              )}
            </div>
            {displayColor && (
              <div>
                <span className="text-muted-foreground">Color: </span>
                <span>{displayColor}</span>
                {puppyFromDetails?.color && (
                  <span className="text-xs text-muted-foreground ml-1">(from details)</span>
                )}
              </div>
            )}
          </div>
        );
      }
    },
    { key: "amount", label: "Amount", render: (value: number) => `€${(value / 100).toFixed(2)}` },
    { key: "status", label: "Status", render: (value: string) => getStatusBadge(value) },
    { 
      key: "created_at", 
      label: "Date", 
      render: (value: string) => new Date(value).toLocaleDateString()
    }
  ];

  const actions = [
    { label: "View Details", onClick: (reservation: Reservation) => {
      toast({ title: "Viewing", description: `Reservation ${reservation.id.substring(0, 8)}` });
    }}
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Reservations Management</h2>
        <div className="py-12 text-center">Loading reservations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-2xl font-bold">Reservations Management</h2>
        <div className="flex items-center gap-2">
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
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <AdminTable 
        data={filteredReservations} 
        columns={columns} 
        actions={actions}
        emptyMessage="No reservations found"
      />
    </div>
  );
}



