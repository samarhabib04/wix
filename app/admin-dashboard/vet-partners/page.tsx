'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Shield, CheckCircle, XCircle, Crown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";
import { adminToast } from "@/lib/utils/adminToast";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminNotificationCounts } from "@/hooks/useAdminNotificationCounts";
import { NotificationBadge } from "@/components/admin-dashboard/NotificationBadge";
import TruncatedCellText from "@/components/admin-dashboard/TruncatedCellText";

interface VetPartner {
  id: string;
  business_id: string;
  business_name: string;
  business_type: string;
  county: string;
  tier: 'free' | 'paid';
  status: 'active' | 'suspended' | 'pending_approval';
  invited_by: string | null;
  invited_at: string | null;
  created_at: string;
  subscription_tier?: string | null;
  subscription_status?: string | null;
}

interface VetPartnerRequest {
  id: string;
  business_id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  county: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  requested_at: string;
  responded_at: string | null;
  responded_by: string | null;
}

export default function AdminVetPartnersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'pending_approval'>('all');
  const [tierFilter, setTierFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [vetPartners, setVetPartners] = useState<VetPartner[]>([]);
  const [partnerRequests, setPartnerRequests] = useState<VetPartnerRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [requestSearchTerm, setRequestSearchTerm] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<VetPartnerRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { data: notificationCounts } = useAdminNotificationCounts();

  useEffect(() => {
    fetchVetPartners();
    fetchPartnerRequests();
  }, []);

  const fetchVetPartners = async () => {
    try {
      setIsLoading(true);
      
      // Get all businesses where partner = true (primary source)
      const { data: businessListings, error: listingsError } = await supabase
        .from('business_listings')
        .select(`
          id,
          name,
          type,
          county,
          partner,
          user_id,
          vet_partners (
            id,
            tier,
            status,
            invited_by,
            invited_at,
            created_at
          )
        `)
        .eq('partner', true);

      if (listingsError) throw listingsError;

      // Get unique user IDs from business listings
      const userIds = [...new Set((businessListings || []).map((b: any) => b.user_id).filter(Boolean))];
      
      // Fetch active subscriptions by user_id for all users
      const subscriptionsMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: subscriptions, error: subError } = await supabase
          .from('business_subscriptions' as any)
          .select('user_id, subscription_tier, status, billing_period')
          .in('user_id', userIds)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (subError) {
          console.error('Error fetching subscriptions:', subError);
        } else if (subscriptions) {
          // Create a map of user_id -> active subscription (most recent)
          subscriptions.forEach((sub: any) => {
            if (!subscriptionsMap.has(sub.user_id)) {
              subscriptionsMap.set(sub.user_id, sub);
            }
          });
        }
      }

      // Get active subscriptions for each business
      const partners: VetPartner[] = [];
      
      for (const business of (businessListings as any) || []) {
        const vetPartnerEntry = business.vet_partners?.[0];
        
        // Get active subscription by user_id
        const activeSubscription = business.user_id 
          ? subscriptionsMap.get(business.user_id)
          : null;

        // Determine tier based on subscription
        let tier: 'free' | 'paid' = 'free';
        if (activeSubscription) {
          if (activeSubscription.subscription_tier === 'premium' || 
              activeSubscription.subscription_tier === 'elite_marketplace') {
            tier = 'paid';
          } else if (activeSubscription.subscription_tier === 'standard') {
            tier = 'free';
          }
        } else {
          // No active subscription = free
          tier = 'free';
        }

        // Use tier from vet_partners table if it exists, otherwise use determined tier
        if (vetPartnerEntry?.tier) {
          tier = vetPartnerEntry.tier;
        }

        partners.push({
          id: vetPartnerEntry?.id || business.id,
          business_id: business.id,
          business_name: business.name,
          business_type: business.type,
          county: business.county,
          tier: tier,
          status: vetPartnerEntry?.status || 'active',
          invited_by: vetPartnerEntry?.invited_by || null,
          invited_at: vetPartnerEntry?.invited_at || null,
          created_at: vetPartnerEntry?.created_at || business.created_at,
          subscription_tier: activeSubscription?.subscription_tier || null,
          subscription_status: activeSubscription?.status || null,
        });
      }

      // Sort by tier (paid first), then by created_at
      partners.sort((a, b) => {
        if (a.tier === 'paid' && b.tier !== 'paid') return -1;
        if (a.tier !== 'paid' && b.tier === 'paid') return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setVetPartners(partners);
    } catch (error: any) {
      console.error('Error fetching vet partners:', error);
      toast(adminToast.error('Failed to load vet partners'));
    } finally {
      setIsLoading(false);
    }
  };


  const handleUpdateTier = async (vetPartnerId: string, businessId: string, newTier: 'free' | 'paid') => {
    try {
      // Update vet_partners table if entry exists
      const { data: existingVp, error: fetchError } = await supabase
        .from('vet_partners' as any)
        .select('id')
        .eq('business_id', businessId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingVp && (existingVp as any).id) {
        const { error } = await supabase
          .from('vet_partners' as any)
          .update({ tier: newTier })
          .eq('id', (existingVp as any).id);

        if (error) throw error;
      } else {
        // Create vet_partners entry if it doesn't exist
        const { error } = await supabase
          .from('vet_partners' as any)
          .insert({
            business_id: businessId,
            tier: newTier,
            status: 'active',
          });

        if (error) throw error;
      }

      // Update business_listings
      await supabase
        .from('business_listings')
        .update({ vet_partner_tier: newTier } as any)
        .eq('id', businessId);

      toast(adminToast.success(`Vet partner tier updated to ${newTier}`));
      fetchVetPartners();
    } catch (error: any) {
      console.error('Error updating tier:', error);
      toast(adminToast.error('Failed to update tier'));
    }
  };

  const handleUpdateStatus = async (vetPartnerId: string, newStatus: 'active' | 'suspended' | 'pending_approval') => {
    try {
      const { error } = await supabase
        .from('vet_partners' as any)
        .update({ status: newStatus })
        .eq('id', vetPartnerId);

      if (error) throw error;

      toast(adminToast.success(`Vet partner status updated to ${newStatus}`));
      fetchVetPartners();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast(adminToast.error('Failed to update status'));
    }
  };

  const fetchPartnerRequests = async () => {
    try {
      setIsLoadingRequests(true);
      const { data, error } = await supabase
        .from('vet_partner_requests' as any)
        .select(`
          *,
          business_listings!inner (
            id,
            name,
            type,
            county
          )
        `)
        .order('requested_at', { ascending: false });

      if (error) throw error;

      const requests: VetPartnerRequest[] = ((data as any) || []).map((req: any) => ({
        id: req.id,
        business_id: req.business_id,
        user_id: req.user_id,
        business_name: req.business_listings.name,
        business_type: req.business_listings.type,
        county: req.business_listings.county,
        status: req.status,
        rejection_reason: req.rejection_reason,
        requested_at: req.requested_at,
        responded_at: req.responded_at,
        responded_by: req.responded_by,
      }));

      setPartnerRequests(requests);
    } catch (error: any) {
      console.error('Error fetching partner requests:', error);
      toast(adminToast.error('Failed to load partner requests'));
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleApproveRequest = async () => {
    if (!selectedRequest || !user) return;

    setIsProcessing(true);
    try {
      // 1. Update the request status
      const { error: requestError } = await supabase
        .from('vet_partner_requests' as any)
        .update({
          status: 'approved',
          responded_at: new Date().toISOString(),
          responded_by: user.id,
        })
        .eq('id', selectedRequest.id);

      if (requestError) throw requestError;

      // 2. Update business_listings.partner to true (SAME AS TOGGLE)
      const { error: partnerError } = await supabase
        .from('business_listings')
        .update({ partner: true })
        .eq('id', selectedRequest.business_id);

      if (partnerError) throw partnerError;

      // 3. Notification is created automatically by trigger, but we can verify
      toast(adminToast.success('Vet partner request approved. Business is now a partner.'));
      setApproveDialogOpen(false);
      setSelectedRequest(null);
      fetchPartnerRequests();
      fetchVetPartners(); // Refresh partners list
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast(adminToast.error(error.message || 'Failed to approve request'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest || !user || !rejectionReason.trim()) {
      toast(adminToast.error('Please provide a rejection reason'));
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Update the request status with rejection reason
      const { error: requestError } = await supabase
        .from('vet_partner_requests' as any)
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason.trim(),
          responded_at: new Date().toISOString(),
          responded_by: user.id,
        })
        .eq('id', selectedRequest.id);

      if (requestError) throw requestError;

      // 2. Ensure business_listings.partner is false
      const { error: partnerError } = await supabase
        .from('business_listings')
        .update({ partner: false })
        .eq('id', selectedRequest.business_id);

      if (partnerError) throw partnerError;

      // 3. Notification is created automatically by trigger
      toast(adminToast.success('Vet partner request rejected.'));
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason("");
      fetchPartnerRequests();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast(adminToast.error(error.message || 'Failed to reject request'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveVetPartner = async (vetPartnerId: string, businessId: string) => {
    try {
      // Remove from vet_partners
      const { error: deleteError } = await supabase
        .from('vet_partners' as any)
        .delete()
        .eq('id', vetPartnerId);

      if (deleteError) throw deleteError;

      // Update business_listings
      await supabase
        .from('business_listings')
        .update({
          is_vet_partner: false,
          vet_partner_tier: null,
        } as any)
        .eq('id', businessId);

      toast(adminToast.success('Vet partner removed'));
      fetchVetPartners();
    } catch (error: any) {
      console.error('Error removing vet partner:', error);
      toast(adminToast.error('Failed to remove vet partner'));
    }
  };

  const filteredPartners = vetPartners.filter(vp => {
    const matchesSearch = 
      vp.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vp.business_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vp.county.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || vp.status === statusFilter;
    const matchesTier = tierFilter === 'all' || vp.tier === tierFilter;

    return matchesSearch && matchesStatus && matchesTier;
  });

  const filteredRequests = partnerRequests.filter(req => {
    const matchesSearch = 
      req.business_name.toLowerCase().includes(requestSearchTerm.toLowerCase()) ||
      req.business_type.toLowerCase().includes(requestSearchTerm.toLowerCase()) ||
      req.county.toLowerCase().includes(requestSearchTerm.toLowerCase());
    
    const matchesStatus = requestStatusFilter === 'all' || req.status === requestStatusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 bg-white p-6 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Vet Partners</h1>
            {notificationCounts && notificationCounts.vetPartner > 0 && (
              <NotificationBadge 
                count={notificationCounts.vetPartner}
                href="/admin-dashboard/notifications?filter=approvals"
              />
            )}
          </div>
          <p className="text-muted-foreground">
            Manage vet partner requests and tiers (tier determined by subscription plan)
          </p>
        </div>
      </div>

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">
            Partner Requests
            {notificationCounts && notificationCounts.vetPartner > 0 ? (
              <NotificationBadge count={notificationCounts.vetPartner} className="ml-2" />
            ) : partnerRequests.filter(r => r.status === 'pending').length > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">
                {partnerRequests.filter(r => r.status === 'pending').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="partners">Existing Partners</TabsTrigger>
        </TabsList>

        {/* Partner Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          {/* Request Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, type, or county..."
                  value={requestSearchTerm}
                  onChange={(e) => setRequestSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={requestStatusFilter} onValueChange={(v: any) => setRequestStatusFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Requests Table */}
          <div className="border rounded-lg overflow-x-auto">
            <Table className="table-fixed min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Business Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>County</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingRequests ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Loading requests...
                    </TableCell>
                  </TableRow>
                ) : filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium"><TruncatedCellText text={req.business_name} maxChars={24} className="max-w-[180px]" /></TableCell>
                      <TableCell><TruncatedCellText text={req.business_type} maxChars={16} className="max-w-[120px]" /></TableCell>
                      <TableCell><TruncatedCellText text={req.county} maxChars={16} className="max-w-[120px]" /></TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            req.status === 'approved'
                              ? 'default'
                              : req.status === 'rejected'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {req.status === 'pending' && <Clock className="mr-1 h-3 w-3" />}
                          {req.status === 'approved' && <CheckCircle className="mr-1 h-3 w-3" />}
                          {req.status === 'rejected' && <XCircle className="mr-1 h-3 w-3" />}
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(req.requested_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Existing Partners Tab */}
        <TabsContent value="partners" className="space-y-4">

          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, type, or county..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tierFilter} onValueChange={(v: any) => setTierFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Vet Partners Table */}
      <div className="border rounded-lg bg-white overflow-x-auto">
        <Table className="table-fixed min-w-[920px]">
          <TableHeader>
              <TableRow>
                <TableHead>Business Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>County</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading vet partners...
                </TableCell>
              </TableRow>
            ) : filteredPartners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No vet partners found
                </TableCell>
              </TableRow>
            ) : (
              filteredPartners.map((vp) => (
                <TableRow key={vp.id}>
                  <TableCell className="font-medium"><TruncatedCellText text={vp.business_name} maxChars={24} className="max-w-[180px]" /></TableCell>
                  <TableCell><TruncatedCellText text={vp.business_type} maxChars={16} className="max-w-[120px]" /></TableCell>
                  <TableCell><TruncatedCellText text={vp.county} maxChars={16} className="max-w-[120px]" /></TableCell>
                  <TableCell>
                    {vp.subscription_tier ? (
                      <Badge variant="outline">
                        {vp.subscription_tier === 'standard' ? 'Standard' :
                         vp.subscription_tier === 'premium' ? 'Premium' :
                         vp.subscription_tier === 'elite_marketplace' ? 'Elite' : vp.subscription_tier}
                        {vp.subscription_status === 'active' ? ' (Active)' : ` (${vp.subscription_status})`}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">No Subscription</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={vp.tier === 'paid' ? 'default' : 'secondary'}>
                      {vp.tier === 'paid' ? (
                        <>
                          <Crown className="mr-1 h-3 w-3" />
                          Paid
                        </>
                      ) : (
                        <>
                          <Shield className="mr-1 h-3 w-3" />
                          Free
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        vp.status === 'active'
                          ? 'default'
                          : vp.status === 'suspended'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {vp.status === 'active' && <CheckCircle className="mr-1 h-3 w-3" />}
                      {vp.status === 'suspended' && <XCircle className="mr-1 h-3 w-3" />}
                      {vp.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          </Table>
        </div>
        </TabsContent>
      </Tabs>

      {/* Approve Request Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Vet Partner Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this request? The business will become a Dog Quest Partner.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-2">
              <p><strong>Business:</strong> {selectedRequest.business_name}</p>
              <p><strong>Type:</strong> {selectedRequest.business_type}</p>
              <p><strong>County:</strong> {selectedRequest.county}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setApproveDialogOpen(false);
              setSelectedRequest(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleApproveRequest} disabled={isProcessing}>
              {isProcessing ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Request Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Vet Partner Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this request. The business owner will see this reason.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p><strong>Business:</strong> {selectedRequest.business_name}</p>
                <p><strong>Type:</strong> {selectedRequest.business_type}</p>
                <p><strong>County:</strong> {selectedRequest.county}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Rejection Reason *</label>
                <Textarea
                  placeholder="Enter the reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  required
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRejectDialogOpen(false);
              setSelectedRequest(null);
              setRejectionReason("");
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectRequest} 
              disabled={isProcessing || !rejectionReason.trim()}
            >
              {isProcessing ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
