'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase, Edit, Trash2, ExternalLink, Search, Filter, Plus, Check, X, MessageSquare, Eye, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";
import BusinessDetailsModal from "@/components/admin-dashboard/BusinessDetailsModal";
import BusinessListingEditForm from "@/components/business-dashboard/BusinessListingEditForm";
import { adminToast } from "@/lib/utils/adminToast";
import { useAdminNotificationCounts } from "@/hooks/useAdminNotificationCounts";
import { NotificationBadge } from "@/components/admin-dashboard/NotificationBadge";
import TruncatedCellText from "@/components/admin-dashboard/TruncatedCellText";

interface BusinessData {
  id: string;
  name: string;
  type: string;
  location: string;
  rating: number;
  reviewCount: number;
  status: string;
  featured: boolean;
  joinDate: string;
  email: string;
  phone: string;
  website?: string;
  description: string;
  adminApproved: boolean;
  banner_image?: string | null;
  logo_image?: string | null;
  address?: string;
  social?: any;
  // All additional fields from database
  admin_notes?: string | null;
  coordinates?: any;
  county?: string;
  created_at?: string;
  updated_at?: string;
  current_boost_id?: string | null;
  is_vet_partner?: boolean;
  profile_image?: string | null;
  profile_image_url?: string | null;
  refund_policy?: string | null;
  reviews_list?: any;
  slug?: string;
  stripe_subscription_id?: string | null;
  subscription_billing_period?: string | null;
  subscription_end_date?: string | null;
  subscription_start_date?: string | null;
  subscription_tier?: string | null;
  user_id?: string;
  vet_partner_invited_at?: string | null;
  vet_partner_invited_by_admin?: string | null;
  vet_partner_stripe_subscription_id?: string | null;
  vet_partner_subscription_end?: string | null;
  vet_partner_subscription_start?: string | null;
  vet_partner_tier?: string | null;
  views?: number;
  opening_hours?: any;
  about_us?: string | null;
  gallery_images?: string[] | null;
}

export default function AdminBusinessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openedFromQueryRef = useRef<string | null>(null);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [businessData, setBusinessData] = useState<BusinessData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [businessToDelete, setBusinessToDelete] = useState<string | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessData | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<BusinessData | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const { data: notificationCounts } = useAdminNotificationCounts();
  
  useEffect(() => {
    fetchBusinessData();
  }, []);

  const fetchBusinessData = async () => {
    try {
      setIsLoading(true);

      // Fetch business listings and user profiles separately, then join in code
      const { data: listings, error: listingsError } = await supabase
        .from('business_listings')
        .select('id, name, type, address, eircode, county, phone, website, description, logo_image, banner_image, coordinates, social, opening_hours, about_us, gallery_images, status, admin_approved, admin_notes, slug, partner, user_id, created_at, updated_at, views, rating, reviews, reviews_list, email, is_vet_partner, subscription_tier, refund_policy')
        .order('created_at', { ascending: false });

      if (listingsError) {
        console.error('Error fetching business listings:', listingsError);
        toast(adminToast.error('Failed to load business listings'));
        return;
      }

      // Get unique user IDs from listings
      const userIds = [...new Set(listings?.map(listing => listing.user_id).filter(Boolean) || [])];

      let userProfilesMap = new Map();
      
      if (userIds.length > 0) {

        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name, business_name, county, role, email, phone')
          .in('id', userIds);

        if (profilesError) {
          console.error('❌ Error fetching user profiles:', profilesError);
          toast(adminToast.error(`Failed to fetch user profiles: ${profilesError.message}`));
        } else {

          // Create a map for quick lookup
          profiles?.forEach(profile => {
            userProfilesMap.set(profile.id, profile);
          });
        }
      } else {

      }

      // Transform the data to match our interface
      const transformedData: BusinessData[] = (listings || []).map((listing: any) => {
        const profile = userProfilesMap.get(listing.user_id);
        const businessName = listing.name || 
                           profile?.business_name || 
                           `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 
                           'Unknown Business';
        
        // Determine status display
        let statusDisplay = "Draft";
        if (listing.admin_approved && listing.status === 'approved') {
          statusDisplay = "Active";
        } else if (listing.status === 'pending') {
          statusDisplay = "Pending Approval";
        } else if (listing.status === 'rejected') {
          statusDisplay = "Rejected";
        } else if (listing.status === 'expired') {
          statusDisplay = "Expired";
        }
        
        return {
          id: listing.id,
          name: businessName,
          type: listing.type || 'General Business',
          location: `${listing.county || profile?.county || 'Unknown'}, Ireland`,
          rating: parseFloat(listing.rating) || 0,
          reviewCount: listing.reviews || 0,
          status: statusDisplay,
          featured: listing.partner || false,
          joinDate: new Date(listing.created_at).toISOString().split('T')[0],
          email: profile?.email || '',
          phone: listing.phone || profile?.phone || '',
          website: listing.website,
          description: listing.description || '',
          adminApproved: listing.admin_approved,
          banner_image: listing.banner_image,
          logo_image: listing.logo_image,
          address: listing.address,
          social: listing.social,
          county: listing.county || profile?.county || '',
          opening_hours: listing.opening_hours || null,
          about_us: listing.about_us || null,
          gallery_images: listing.gallery_images || null
        };
      });
      setBusinessData(transformedData);
    } catch (error) {
      console.error('Error in fetchBusinessData:', error);
      toast(adminToast.error('Failed to load business data'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprovalToggle = async (id: string, currentlyApproved: boolean) => {
    try {
      const newStatus = currentlyApproved ? 'pending' : 'approved';
      const newAdminApproved = !currentlyApproved;

      const { error } = await supabase
        .from('business_listings')
        .update({ 
          status: newStatus, 
          admin_approved: newAdminApproved 
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating business listing approval:', error);
        toast(adminToast.error('Failed to update business listing'));
        return;
      }

      toast(adminToast.success(`Business listing ${newAdminApproved ? 'approved' : 'set to pending'} successfully`));
      // Refresh the data
      fetchBusinessData();
    } catch (error) {
      console.error('Error in handleApprovalToggle:', error);
      toast(adminToast.error('Failed to update business listing'));
    }
  };

  const handleReject = async () => {
    if (!selectedListing) {

      return;
    }

    try {

      // Update the database first

      const { error } = await supabase
        .from('business_listings')
        .update({ 
          status: 'rejected', 
          admin_approved: false,
          admin_notes: rejectionReason || null
        })
        .eq('id', selectedListing);

      if (error) {
        console.error('❌ Database update error:', error);
        toast(adminToast.error('Failed to reject business listing'));
        return;
      }

      // Find the business listing and user details to send email
      const rejectedBusiness = businessData.find(b => b.id === selectedListing);

      if (rejectedBusiness && rejectedBusiness.email) {

        toast(adminToast.success("Business listing rejected successfully"));
      } else {

        toast(adminToast.success("Business listing rejected (no email address found)"));
      }

      setRejectDialogOpen(false);
      setSelectedListing(null);
      setRejectionReason("");

      await fetchBusinessData();
      
    } catch (error) {
      console.error('❌ Error in handleReject:', error);
      toast(adminToast.error('Failed to reject business listing'));
    }
  };

  const openRejectDialog = (id: string) => {

    setSelectedListing(id);
    setRejectDialogOpen(true);
  };

  const handleViewBusiness = async (business: BusinessData) => {
    try {
      // Fetch full business details from database
      const { data: fullBusiness, error } = await supabase
        .from('business_listings')
        .select('id, name, type, address, eircode, county, phone, website, description, logo_image, banner_image, coordinates, social, opening_hours, about_us, gallery_images, status, admin_approved, admin_notes, slug, partner, user_id, created_at, updated_at, views, rating, reviews, reviews_list, email, is_vet_partner, subscription_tier, refund_policy')
        .eq('id', business.id)
        .single() as any;

      if (error || !fullBusiness) {
        console.error('Error fetching full business details:', error);
        toast(adminToast.error('Failed to load business details'));
        setSelectedBusiness(business);
        setViewModalOpen(true);
        return;
      }

      // Get user profile if available
      let userProfile = null;
      if (fullBusiness.user_id) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name, business_name, county, role, email, phone')
          .eq('id', fullBusiness.user_id)
          .single();
        userProfile = profile;
      }

      // Merge full business data with existing data
      const enrichedBusiness: BusinessData = {
        ...business,
        ...fullBusiness,
        email: userProfile?.email || fullBusiness.email || business.email,
        phone: fullBusiness.phone || userProfile?.phone || business.phone,
        county: fullBusiness.county || userProfile?.county || business.location.split(',')[0],
        location: `${fullBusiness.county || userProfile?.county || 'Unknown'}, Ireland`,
        created_at: fullBusiness.created_at,
        updated_at: fullBusiness.updated_at,
        admin_notes: fullBusiness.admin_notes,
        coordinates: fullBusiness.coordinates,
        current_boost_id: fullBusiness.current_boost_id ?? undefined,
        is_vet_partner: fullBusiness.is_vet_partner,
        profile_image: fullBusiness.profile_image,
        profile_image_url: fullBusiness.profile_image_url,
        refund_policy: fullBusiness.refund_policy,
        reviews_list: fullBusiness.reviews_list,
        slug: fullBusiness.slug,
        stripe_subscription_id: fullBusiness.stripe_subscription_id,
        subscription_billing_period: fullBusiness.subscription_billing_period,
        subscription_end_date: fullBusiness.subscription_end_date,
        subscription_start_date: fullBusiness.subscription_start_date,
        subscription_tier: fullBusiness.subscription_tier,
        user_id: fullBusiness.user_id,
        vet_partner_invited_at: fullBusiness.vet_partner_invited_at,
        vet_partner_invited_by_admin: fullBusiness.vet_partner_invited_by_admin,
        vet_partner_stripe_subscription_id: fullBusiness.vet_partner_stripe_subscription_id,
        vet_partner_subscription_end: fullBusiness.vet_partner_subscription_end,
        vet_partner_subscription_start: fullBusiness.vet_partner_subscription_start,
        vet_partner_tier: fullBusiness.vet_partner_tier,
        views: fullBusiness.views,
        opening_hours: fullBusiness.opening_hours,
      };

      setSelectedBusiness(enrichedBusiness);
      setViewModalOpen(true);
    } catch (error) {
      console.error('Error in handleViewBusiness:', error);
      toast(adminToast.error('Failed to load business details'));
      // Still show modal with available data
      setSelectedBusiness(business);
      setViewModalOpen(true);
    }
  };

  useEffect(() => {
    const id = searchParams.get("open");
    if (!id) {
      openedFromQueryRef.current = null;
      return;
    }
    if (openedFromQueryRef.current === id) return;
    openedFromQueryRef.current = id;
    const stub: BusinessData = {
      id,
      name: "",
      type: "",
      location: "",
      rating: 0,
      reviewCount: 0,
      status: "",
      featured: false,
      joinDate: "",
      email: "",
      phone: "",
      description: "",
      adminApproved: false,
    };
    void handleViewBusiness(stub).finally(() => {
      router.replace("/admin-dashboard/businesses", { scroll: false });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deep link once per ?open= id from notifications
  }, [searchParams, router]);

  const handleEditBusiness = async (business: BusinessData) => {
    try {
      // Fetch full business details from database — explicitly select all columns
      // to avoid PostgREST schema cache issues with newly-added columns like eircode
      const { data: fullBusiness, error } = await supabase
        .from('business_listings')
        .select('id, name, type, address, eircode, county, phone, website, description, logo_image, banner_image, coordinates, social, opening_hours, about_us, gallery_images, status, admin_approved, admin_notes, slug, partner, user_id, created_at, updated_at, views, rating, reviews, reviews_list, email, is_vet_partner, subscription_tier, refund_policy')
        .eq('id', business.id)
        .single() as any;

      if (error || !fullBusiness) {
        console.error('Error fetching full business details for edit:', error);
        toast(adminToast.error('Failed to load business details'));
        // Still open edit modal with available data
        setEditingBusiness(business);
        setEditModalOpen(true);
        return;
      }

      // Merge full business data with existing data
      const enrichedBusiness: BusinessData = {
        ...business,
        ...fullBusiness,
        opening_hours: fullBusiness.opening_hours || null,
      };

      setEditingBusiness(enrichedBusiness);
      setEditModalOpen(true);
    } catch (error) {
      console.error('Error in handleEditBusiness:', error);
      toast(adminToast.error('Failed to load business details'));
      // Still open edit modal with available data
      setEditingBusiness(business);
      setEditModalOpen(true);
    }
  };

  const handleSaveEdit = async (formData: any) => {
    if (!editingBusiness) return;
    
    setIsSavingEdit(true);
    try {
      // Prepare social data
      const socialData = {
        facebook: formData.facebook || null,
        instagram: formData.instagram || null,
        tiktok: formData.tiktok || null
      };

      // Prepare update data - admin can edit all fields including status
      const updateData: any = {
        name: formData.name,
        type: formData.type,
        address: formData.address,
        county: formData.county,
        phone: formData.phone,
        website: formData.website || null,
        description: formData.description,
        social: socialData,
        ...(formData.logo_image !== undefined && { logo_image: formData.logo_image }),
        ...(formData.banner_image !== undefined && { banner_image: formData.banner_image }),
        ...(formData.opening_hours !== undefined && { opening_hours: formData.opening_hours }),
        ...(formData.coordinates !== undefined && { coordinates: formData.coordinates }),
        ...(formData.eircode !== undefined && { eircode: formData.eircode }),
        ...(formData.about_us !== undefined && { about_us: formData.about_us || null }),
        ...(formData.gallery_images !== undefined && { gallery_images: formData.gallery_images || [] }),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('business_listings')
        .update(updateData)
        .eq('id', editingBusiness.id);

      if (error) {
        console.error('Error updating business:', error);
        toast(adminToast.error('Failed to update business listing'));
        return;
      }

      toast(adminToast.success('Business listing updated successfully'));
      setEditModalOpen(false);
      setEditingBusiness(null);
      await fetchBusinessData();
    } catch (error) {
      console.error('Error saving edit:', error);
      toast(adminToast.error('Failed to update business listing'));
    } finally {
      setIsSavingEdit(false);
    }
  };
  
  // Filter businesses based on search term and status
  const filteredBusinesses = businessData.filter(business => {
    const matchesSearch = business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         business.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         business.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         business.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "pending" && (business.status === "Pending Approval" || business.status === "Draft")) ||
                         (statusFilter === "approved" && business.status === "Active") ||
                         (statusFilter === "rejected" && business.status === "Rejected");
    
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('business_listings')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting business listing:', error);
        toast(adminToast.error('Failed to delete business listing'));
        return;
      }

      toast(adminToast.success("Business listing deleted successfully"));
      setDeleteDialogOpen(false);
      setBusinessToDelete(null);
      // Refresh the data
      fetchBusinessData();
    } catch (error) {
      console.error('Error in handleDelete:', error);
      toast(adminToast.error('Failed to delete business listing'));
    }
  };

  const openDeleteDialog = (id: string) => {
    setBusinessToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handlePartnerToggle = async (id: string, currentlyPartner: boolean) => {
    try {

      const { error } = await supabase
        .from('business_listings')
        .update({ partner: !currentlyPartner })
        .eq('id', id);

      if (error) {
        console.error('Error updating partner status:', error);
        toast(adminToast.error('Failed to update partner status'));
        return;
      }

      toast(adminToast.success(`Business ${!currentlyPartner ? 'added to' : 'removed from'} Dog Quest Partners successfully`));
      // Refresh the data
      await fetchBusinessData();
    } catch (error) {
      console.error('Error in handlePartnerToggle:', error);
      toast(adminToast.error('Failed to update partner status'));
    }
  };

  const handleApprove = async (id: string) => {
    await handleApprovalToggle(id, false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight">Business Listings</h2>
              {notificationCounts && notificationCounts.business > 0 && (
                <NotificationBadge 
                  count={notificationCounts.business}
                  href="/admin-dashboard/notifications?filter=approvals"
                />
              )}
            </div>
            <p className="text-muted-foreground">
              Manage service providers such as vets, groomers and pet stores
            </p>
          </div>
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Business
          </Button>
        </div>
        <div className="py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-center text-muted-foreground">Loading business data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight">Business Listings</h2>
              {notificationCounts && notificationCounts.business > 0 && (
                <NotificationBadge 
                  count={notificationCounts.business}
                  href="/admin-dashboard/notifications?filter=approvals"
                />
              )}
            </div>
            <p className="text-muted-foreground">
              Manage service providers such as vets, groomers and pet stores
            </p>
          </div>
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Business
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 min-w-0">
          <div className="relative flex-1 w-full min-w-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search businesses..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="self-end sm:self-auto">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        <div className="rounded-md border bg-white overflow-x-auto">
          <Table className="table-fixed min-w-[1080px]">
            <TableHeader>
              <TableRow>
                <TableHead>Business Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Join Date</TableHead>
                <TableHead>Partner Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBusinesses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center">
                      <div className="rounded-full bg-brand-light-green/20 p-3 mb-4">
                        <Briefcase className="h-8 w-8 text-brand-dark-green" />
                      </div>
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        {businessData.length === 0 ? "No Business Listings Yet" : "No Matching Businesses"}
                      </h3>
                      <p className="text-muted-foreground max-w-sm">
                        {businessData.length === 0 
                          ? "Business service providers will appear here once they submit their listings for approval." 
                          : "No businesses found matching your search criteria. Try adjusting your filters or search terms."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredBusinesses.map((business) => (
                  <TableRow key={business.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <div>
                          <TruncatedCellText text={business.name} maxChars={36} className="max-w-[220px]" />
                          <TruncatedCellText text={business.email} maxChars={28} className="max-w-[220px] text-xs text-muted-foreground" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><TruncatedCellText text={business.type} maxChars={20} className="max-w-[140px]" /></TableCell>
                    <TableCell><TruncatedCellText text={business.location} maxChars={26} className="max-w-[180px]" /></TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className="font-medium">{business.rating.toFixed(1)}</span>
                        <span className="text-muted-foreground ml-1">({business.reviewCount})</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          business.status === 'Active' 
                            ? 'bg-green-100 text-green-800' 
                            : business.status === 'Pending Approval' || business.status === 'Draft'
                            ? 'bg-yellow-100 text-yellow-800'
                            : business.status === 'Rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {business.status}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-600">Approved:</span>
                          <Switch
                            checked={business.adminApproved}
                            onCheckedChange={() => handleApprovalToggle(business.id, business.adminApproved)}
                            className="scale-75"
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                          <TruncatedCellText text={business.joinDate} maxChars={16} className="max-w-[120px]" />
                        {business.phone && (
                            <TruncatedCellText text={business.phone} maxChars={16} className="max-w-[120px] text-xs text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Partner:</span>
                        <Switch
                          checked={business.featured}
                          onCheckedChange={() => handlePartnerToggle(business.id, business.featured)}
                          className="scale-90"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleViewBusiness(business)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditBusiness(business)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Business
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleApprove(business.id)}
                            disabled={business.adminApproved}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Approve
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {

                              openRejectDialog(business.id);
                            }}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Reject
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(business.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>1</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">2</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">3</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {/* Business Details Modal */}
      <BusinessDetailsModal
        business={selectedBusiness}
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
      />

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={(open) => {

        setRejectDialogOpen(open);
        if (!open) {
          setSelectedListing(null);
          setRejectionReason("");
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reject Business Listing</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this business listing. This will help the business owner understand what needs to be improved.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              placeholder="Enter rejection reason (optional)..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {

                setRejectDialogOpen(false);
                setSelectedListing(null);
                setRejectionReason("");
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {

                handleReject();
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Reject Listing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Business Listing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this business listing? This action cannot be undone and will permanently remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => businessToDelete && handleDelete(businessToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Business Dialog */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Business Listing</DialogTitle>
            <DialogDescription>
              Update business information. Changes will be saved immediately.
            </DialogDescription>
          </DialogHeader>
          {editingBusiness && (
            <BusinessListingEditForm
              listing={{
                id: editingBusiness.id,
                name: editingBusiness.name,
                type: editingBusiness.type,
                address: editingBusiness.address || editingBusiness.location.split(',').slice(0, -1).join(',').trim() || '',
                county: editingBusiness.county || editingBusiness.location.split(',').pop()?.trim() || '',
                phone: editingBusiness.phone,
                website: editingBusiness.website || null,
                description: editingBusiness.description,
                social: editingBusiness.social || {},
                banner_image: editingBusiness.banner_image || null,
                logo_image: editingBusiness.logo_image || null,
                opening_hours: editingBusiness.opening_hours || null,
                coordinates: editingBusiness.coordinates || null,
                eircode: (editingBusiness as any).eircode || null,
                about_us: (editingBusiness as any).about_us || null,
                gallery_images: (editingBusiness as any).gallery_images || null,
              }}
              onSave={handleSaveEdit}
              onCancel={() => {
                setEditModalOpen(false);
                setEditingBusiness(null);
              }}
              isSaving={isSavingEdit}
              isAdmin={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

