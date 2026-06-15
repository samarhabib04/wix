'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Zap, XCircle, Calendar, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";
import { adminToast } from "@/lib/utils/adminToast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import Link from "next/link";
import TruncatedCellText from "@/components/admin-dashboard/TruncatedCellText";

interface BusinessBoost {
  id: string;
  business_id: string;
  business_name: string;
  business_slug: string;
  stripe_payment_intent_id: string;
  boost_start_time: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminBoostsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [boosts, setBoosts] = useState<BusinessBoost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedBoost, setSelectedBoost] = useState<BusinessBoost | null>(null);

  useEffect(() => {
    fetchBoosts();
  }, []);

  const fetchBoosts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('business_boosts' as any)
        .select(`
          *,
          business_listings!inner (
            id,
            name,
            slug
          )
        `)
        .order('boost_start_time', { ascending: false });

      if (error) throw error;

      const boostsList: BusinessBoost[] = ((data as any) || []).map((b: any) => ({
        id: b.id,
        business_id: b.business_id,
        business_name: b.business_listings.name,
        business_slug: b.business_listings.slug,
        stripe_payment_intent_id: b.stripe_payment_intent_id,
        boost_start_time: b.boost_start_time,
        is_active: b.is_active,
        created_at: b.created_at,
      }));

      setBoosts(boostsList);
    } catch (error: any) {
      console.error('Error fetching boosts:', error);
      toast(adminToast.error('Failed to load boosts'));
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBoosts = boosts.filter(b => {
    const matchesSearch = b.business_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && b.is_active) ||
                         (statusFilter === 'inactive' && !b.is_active);
    
    return matchesSearch && matchesStatus;
  });

  const handleDeactivate = async (boostId: string) => {
    try {
      const { error } = await supabase
        .from('business_boosts' as any)
        .update({
          is_active: false,
        })
        .eq('id', boostId);

      if (error) throw error;

      toast(adminToast.success('Boost deactivated successfully'));
      fetchBoosts();
    } catch (error: any) {
      console.error('Error deactivating boost:', error);
      toast(adminToast.error('Failed to deactivate boost'));
    }
  };

  const handleView = (boost: BusinessBoost) => {
    setSelectedBoost(boost);
    setViewDialogOpen(true);
  };

  const activeBoostsCount = boosts.filter(b => b.is_active).length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Business Boosts Management</h1>
        <p className="text-muted-foreground">
          Manage active business boosts. Currently {activeBoostsCount} active boost{activeBoostsCount !== 1 ? 's' : ''}.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search businesses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Boosts</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12">Loading boosts...</div>
      ) : filteredBoosts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No boosts found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <Table className="table-fixed min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Boost Start</TableHead>
                <TableHead>Payment Intent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBoosts.map((boost) => (
                <TableRow key={boost.id}>
                  <TableCell>
                    <Link 
                      href={`/services/${boost.business_slug}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      <TruncatedCellText text={boost.business_name} maxChars={24} className="max-w-[180px]" />
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(boost.boost_start_time), 'PPpp')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded block max-w-[190px] truncate" title={boost.stripe_payment_intent_id}>
                      {boost.stripe_payment_intent_id.substring(0, 20)}...
                    </code>
                  </TableCell>
                  <TableCell>
                    {boost.is_active ? (
                      <Badge variant="default" className="bg-green-600">
                        <Zap className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-100 text-gray-600">
                        <XCircle className="h-3 w-3 mr-1" />
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(boost)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {boost.is_active && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeactivate(boost.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Deactivate
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Boost Details</DialogTitle>
            <DialogDescription>
              Boost information for {selectedBoost?.business_name}
            </DialogDescription>
          </DialogHeader>
          {selectedBoost && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-1">Business</h3>
                <Link 
                  href={`/services/${selectedBoost.business_slug}`}
                  className="text-blue-600 hover:underline"
                >
                  {selectedBoost.business_name}
                </Link>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Boost Start Time</h3>
                <p className="text-sm text-gray-600">
                  {format(new Date(selectedBoost.boost_start_time), 'PPpp')}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Created At</h3>
                <p className="text-sm text-gray-600">
                  {format(new Date(selectedBoost.created_at), 'PPpp')}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Payment Intent ID</h3>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded block">
                  {selectedBoost.stripe_payment_intent_id}
                </code>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Status</h3>
                <Badge>
                  {selectedBoost.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <Link href={`/services/${selectedBoost.business_slug}`}>
                <Button variant="outline" className="w-full">
                  View Business Profile
                </Button>
              </Link>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
