'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, CheckCircle, XCircle, Clock, Calendar, Eye } from "lucide-react";
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

interface Promotion {
  id: string;
  business_id: string;
  business_name: string;
  business_slug: string;
  title: string;
  description: string | null;
  banner_image_url: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  admin_approved: boolean;
  created_at: string;
}

export default function AdminPromotionsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'active' | 'expired'>('all');
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('business_promotions' as any)
        .select(`
          *,
          business_listings!inner (
            id,
            name,
            slug
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const promotionsList: Promotion[] = ((data as any) || []).map((p: any) => ({
        id: p.id,
        business_id: p.business_id,
        business_name: p.business_listings.name,
        business_slug: p.business_listings.slug,
        title: p.title,
        description: p.description,
        banner_image_url: p.banner_image_url,
        start_date: p.start_date,
        end_date: p.end_date,
        is_active: p.is_active,
        admin_approved: p.admin_approved,
        created_at: p.created_at,
      }));

      setPromotions(promotionsList);
    } catch (error: any) {
      console.error('Error fetching promotions:', error);
      toast(adminToast.error('Failed to load promotions'));
    } finally {
      setIsLoading(false);
    }
  };

  const getPromotionStatus = (promotion: Promotion): 'pending' | 'approved' | 'active' | 'expired' => {
    if (!promotion.admin_approved) return 'pending';
    if (new Date(promotion.end_date) < new Date()) return 'expired';
    if (promotion.is_active) return 'active';
    return 'approved';
  };

  const filteredPromotions = promotions.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.business_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const status = getPromotionStatus(p);
    const matchesStatus = statusFilter === 'all' || statusFilter === status;
    
    return matchesSearch && matchesStatus;
  });

  const handleApprove = async (promotionId: string) => {
    try {
      const promotion = promotions.find(p => p.id === promotionId);
      if (!promotion) return;

      const now = new Date();
      const startDate = new Date(promotion.start_date);
      const endDate = new Date(promotion.end_date);
      
      // Check if dates are valid
      if (startDate > endDate) {
        toast(adminToast.error('Start date must be before end date'));
        return;
      }

      // Set is_active to true if start date is today or in the past
      const shouldBeActive = startDate <= now && endDate >= now;

      const { error } = await supabase
        .from('business_promotions' as any)
        .update({
          admin_approved: true,
          is_active: shouldBeActive,
        })
        .eq('id', promotionId);

      if (error) throw error;

      toast(adminToast.success('Promotion approved successfully'));
      fetchPromotions();
    } catch (error: any) {
      console.error('Error approving promotion:', error);
      toast(adminToast.error('Failed to approve promotion'));
    }
  };

  const handleReject = async (promotionId: string) => {
    try {
      const { error } = await supabase
        .from('business_promotions' as any)
        .update({
          admin_approved: false,
          is_active: false,
        })
        .eq('id', promotionId);

      if (error) throw error;

      toast(adminToast.success('Promotion rejected'));
      fetchPromotions();
    } catch (error: any) {
      console.error('Error rejecting promotion:', error);
      toast(adminToast.error('Failed to reject promotion'));
    }
  };

  const handleView = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setViewDialogOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Promotions Management</h1>
        <p className="text-muted-foreground">Review and manage business promotions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search promotions..."
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
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12">Loading promotions...</div>
      ) : filteredPromotions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No promotions found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <Table className="table-fixed min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPromotions.map((promotion) => {
                const status = getPromotionStatus(promotion);
                return (
                  <TableRow key={promotion.id}>
                    <TableCell>
                      <Link 
                        href={`/services/${promotion.business_slug}`}
                        className="text-blue-600 hover:underline"
                      >
                        <TruncatedCellText text={promotion.business_name} maxChars={24} className="max-w-[180px]" />
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">
                      <TruncatedCellText text={promotion.title} maxChars={28} className="max-w-[220px]" />
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{format(new Date(promotion.start_date), 'MMM d, yyyy')}</div>
                        <div className="text-gray-500">to {format(new Date(promotion.end_date), 'MMM d, yyyy')}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {status === 'pending' && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                      {status === 'approved' && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approved
                        </Badge>
                      )}
                      {status === 'active' && (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      )}
                      {status === 'expired' && (
                        <Badge variant="outline" className="bg-gray-100 text-gray-600">
                          <XCircle className="h-3 w-3 mr-1" />
                          Expired
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(promotion)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {status === 'pending' && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleApprove(promotion.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleReject(promotion.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedPromotion?.title}</DialogTitle>
            <DialogDescription>
              Promotion details for {selectedPromotion?.business_name}
            </DialogDescription>
          </DialogHeader>
          {selectedPromotion && (
            <div className="space-y-4">
              {selectedPromotion.banner_image_url && (
                <img
                  src={selectedPromotion.banner_image_url}
                  alt={selectedPromotion.title}
                  className="w-full h-48 object-cover rounded-lg"
                />
              )}
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-sm text-gray-600">
                  {selectedPromotion.description || 'No description provided'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-1">Start Date</h3>
                  <p className="text-sm text-gray-600">
                    {format(new Date(selectedPromotion.start_date), 'PPpp')}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">End Date</h3>
                  <p className="text-sm text-gray-600">
                    {format(new Date(selectedPromotion.end_date), 'PPpp')}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Status</h3>
                <Badge>
                  {getPromotionStatus(selectedPromotion)}
                </Badge>
              </div>
              <Link href={`/services/${selectedPromotion.business_slug}`}>
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
