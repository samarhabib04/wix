'use client';

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Filter, Check, X, ArrowUpDown, MoreHorizontal, Star, Eye, Edit, CheckCircle, XCircle, Clock, PawPrint, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { adminToast } from "@/lib/utils/adminToast";
import { useAdminListingEdit } from "@/hooks/useAdminListingEdit";
import { AdminInlineEditTable } from "@/components/admin-dashboard/AdminInlineEditTable";
import StudListingDetailsModal from "@/components/admin-dashboard/StudListingDetailsModal";
import ListingDetailsModal from "@/components/admin-dashboard/ListingDetailsModal";
import { usePaginatedListings } from "@/hooks/usePaginatedListings";
import ListingsPagination from "@/components/admin-dashboard/ListingsPagination";
import ViewListingsSection from "@/components/admin-dashboard/ViewListingsSection";
import { useAdminNotificationCounts } from "@/hooks/useAdminNotificationCounts";
import { NotificationBadge } from "@/components/admin-dashboard/NotificationBadge";
import { adminListingKind, tableForAdminListingKind } from "@/lib/utils/admin-listing-kind";
import { getVerificationBadgeUpdatesForListing } from "@/lib/utils/code-verification";
import {
  approvePendingListingEditForListing,
  rejectPendingListingEditForListing,
  type EditableListingType,
} from "@/lib/utils/listing-edit-approval";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminListingsPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  /** When opening from a deep link, the row may not be on the current page — modal still loads by id + type. */
  const [selectedListingFallback, setSelectedListingFallback] = useState<{
    id: string;
    listingTypeForModal: string;
  } | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const deepLinkHandledRef = useRef<string | null>(null);
  const [rejectionMessage, setRejectionMessage] = useState("");
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [listingToReject, setListingToReject] = useState<{ id: string, type: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<{ id: string, type: string } | null>(null);
  const { updateListing } = useAdminListingEdit();
  const queryClient = useQueryClient();

  const {
    listings,
    totalCount,
    currentPage,
    totalPages,
    isLoading,
    error,
    goToPage,
    refreshListings,
    patchListing,
  } = usePaginatedListings({
    searchTerm,
    filterStatus,
    activeTab,
    pageSize: 6
  });

  const { data: notificationCounts } = useAdminNotificationCounts();

  const listingManagementHeader = useMemo(() => {
    switch (filterStatus) {
      case 'pending':
        return {
          title: 'Pending approval',
          subtitle: 'Review and approve listings awaiting approval.',
        };
      case 'active':
        return {
          title: 'Active listings',
          subtitle: 'Published adverts live on the marketplace (status Active).',
        };
      case 'all':
        return {
          title: 'Listings',
          subtitle: 'All rows matching your tab, search, and status filter.',
        };
      case 'inactive':
        return {
          title: 'Inactive listings',
          subtitle: 'Adverts that are not published to buyers.',
        };
      case 'pending_re_approval':
        return {
          title: 'Pending re-approval',
          subtitle: 'Edited listings waiting for another admin review.',
        };
      case 'rejected':
        return {
          title: 'Rejected listings',
          subtitle: 'Adverts that were rejected.',
        };
      case 'expired_verification':
        return {
          title: 'Expired verification',
          subtitle: 'Listings with an expired green tick verification window.',
        };
      default:
        return {
          title: 'Listings',
          subtitle: 'Manage adverts across the marketplace.',
        };
    }
  }, [filterStatus]);

  const markApprovalNotificationsResolved = async (listingId: string, kind: "sale" | "stud" | "showcase" | "marketplace") => {
    if (!user || kind === "marketplace") return;

    const typeByKind: Record<"sale" | "stud" | "showcase", string> = {
      sale: "listing_approval_required",
      stud: "stud_approval_required",
      showcase: "showcase_approval_required",
    };

    const specificType = typeByKind[kind];
    const relevantTypes = [specificType, "approval_required"];

    const { data: typedRows, error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("listing_id", listingId)
      .eq("read", false)
      .in("type", relevantTypes)
      .select("id, type");

    if (error) {
      console.error("Error marking approval notifications as resolved:", error);
      return;
    }

    // Fallback for legacy/misaligned notification types on the same listing.
    // This ensures the badge drops when the listing is no longer pending approval.
    if (!typedRows || typedRows.length === 0) {
      const { error: fallbackError } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("listing_id", listingId)
        .eq("read", false);
      if (fallbackError) {
        console.error("Fallback notification resolve failed:", fallbackError);
      }
    }

    await queryClient.invalidateQueries({ queryKey: ["admin-notification-counts"] });
    await queryClient.invalidateQueries({ queryKey: ["unread-notifications", user.id] });
    await queryClient.refetchQueries({ queryKey: ["admin-notification-counts", user.id] });
  };

  useEffect(() => {
    const open = searchParams.get("open");
    const kind = searchParams.get("kind");
    if (!open || !kind) {
      deepLinkHandledRef.current = null;
      return;
    }
    const key = `${open}:${kind}`;
    if (deepLinkHandledRef.current === key) return;
    const validKinds = ["stud", "showcase", "sale", "marketplace"];
    if (!validKinds.includes(kind)) {
      router.replace("/admin-dashboard/listings", { scroll: false });
      return;
    }
    deepLinkHandledRef.current = key;
    setActiveTab(kind);
    setFilterStatus("all");
    setSelectedListingId(open);
    setSelectedListingFallback({ id: open, listingTypeForModal: kind });
    setDetailsModalOpen(true);
    // Do not router.replace here: (1) modal must mount while ?open= is still in the URL if a parent
    // shows only a loading shell; (2) React Strict Mode remount would clear URL then lose modal state.
    // URL is cleared when the modal closes (see onOpenChange).
  }, [searchParams, router]);

  // Toggle gold star for stud listing
  const toggleGoldStar = async (listingId: string, currentValue: boolean) => {
    try {

      const { error, data } = await supabase
        .from('stud_listings')
        .update({ gold_star: !currentValue })
        .eq('id', listingId)
        .select();

      if (error) {
        console.error('Error toggling gold star:', error);
        toast(adminToast.error(`Failed to update gold star: ${error.message}`));
        return;
      }

      toast(adminToast.success(`Gold star ${!currentValue ? 'enabled' : 'disabled'}`));

      // Refresh listings
      refreshListings();
    } catch (error) {
      console.error('Error toggling gold star:', error);
      toast(adminToast.error('Failed to update gold star'));
    }
  };

  // Toggle green tick for stud listing
  const toggleGreenTick = async (listingId: string, currentValue: boolean) => {
    try {

      const { error, data } = await supabase
        .from('stud_listings')
        .update({ green_tick: !currentValue })
        .eq('id', listingId)
        .select();

      if (error) {
        console.error('Error toggling green tick:', error);
        toast(adminToast.error(`Failed to update green tick: ${error.message}`));
        return;
      }

      toast(adminToast.success(`Green tick ${!currentValue ? 'enabled' : 'disabled'}`));

      // Refresh listings
      refreshListings();
    } catch (error) {
      console.error('Error toggling green tick:', error);
      toast(adminToast.error('Failed to update green tick'));
    }
  };

  // Toggle gold star for sale listing
  const toggleSaleGoldStar = async (listingId: string, currentValue: boolean) => {
    try {

      const { error, data } = await supabase
        .from('sale_listings')
        .update({ gold_star: !currentValue })
        .eq('id', listingId)
        .select();

      if (error) {
        console.error('Error toggling sale gold star:', error);
        toast(adminToast.error(`Failed to update gold star: ${error.message}`));
        return;
      }

      toast(adminToast.success(`Gold star ${!currentValue ? 'enabled' : 'disabled'}`));

      // Refresh listings
      refreshListings();
    } catch (error) {
      console.error('Error toggling sale gold star:', error);
      toast(adminToast.error('Failed to update gold star'));
    }
  };

  // Toggle green tick for sale listing
  const toggleSaleGreenTick = async (listingId: string, currentValue: boolean) => {
    try {

      const { error, data } = await supabase
        .from('sale_listings')
        .update({ green_tick: !currentValue })
        .eq('id', listingId)
        .select();

      if (error) {
        console.error('Error toggling sale green tick:', error);
        toast(adminToast.error(`Failed to update green tick: ${error.message}`));
        return;
      }

      toast(adminToast.success(`Green tick ${!currentValue ? 'enabled' : 'disabled'}`));

      // Refresh listings
      refreshListings();
    } catch (error) {
      console.error('Error toggling sale green tick:', error);
      toast(adminToast.error('Failed to update green tick'));
    }
  };

  // Generic toggle function that delegates to the appropriate function
  const handleToggleGoldStar = (listingId: string, currentValue: boolean, listingType: string) => {
    const kind = adminListingKind(listingType);
    if (kind === "stud") {
      toggleGoldStar(listingId, currentValue);
    } else if (kind === "sale") {
      toggleSaleGoldStar(listingId, currentValue);
    }
  };

  const handleToggleGreenTick = (listingId: string, currentValue: boolean, listingType: string) => {
    const kind = adminListingKind(listingType);
    if (kind === "stud") {
      toggleGreenTick(listingId, currentValue);
    } else if (kind === "sale") {
      toggleSaleGreenTick(listingId, currentValue);
    }
  };

  // Fixed approve function for dropdown actions
  const handleApproveFromDropdown = async (listingId: string, listingType: string) => {
    try {
      const kind = adminListingKind(listingType);
      if (!kind) {
        toast(adminToast.error("Unknown listing type."));
        return;
      }

      let error;
      let data;

      // Fetch existing listing to preserve current_boost_id
      let existingListing: any = null;
      if (kind === "stud") {
        const { data: existing } = await supabase
          .from('stud_listings')
          .select('current_boost_id')
          .eq('id', listingId)
          .single();
        existingListing = existing;
      } else if (kind === "showcase") {
        const { data: existing } = await supabase
          .from('showcase_listings')
          .select('current_boost_id')
          .eq('id', listingId)
          .single();
        existingListing = existing;
      } else if (kind === "sale") {
        const { data: existing } = await supabase
          .from('sale_listings')
          .select('current_boost_id')
          .eq('id', listingId)
          .single();
        existingListing = existing;
      }

      if (kind === "stud") {
        const updateData: any = {
          admin_approved: true,
          is_published: true,
          updated_at: new Date().toISOString()
        };
        // Preserve current_boost_id if it exists
        if (existingListing?.current_boost_id) {
          updateData.current_boost_id = existingListing.current_boost_id;
        }
        const badges = await getVerificationBadgeUpdatesForListing(listingId, 'stud');
        if (badges) {
          Object.assign(updateData, badges);
        }
        const result = await supabase
          .from('stud_listings')
          .update(updateData)
          .eq('id', listingId)
          .select();

        error = result.error;
        data = result.data;
      } else if (kind === "showcase") {
        const updateData: any = {
          admin_approved: true,
          is_published: true,
          updated_at: new Date().toISOString()
        };
        // Preserve current_boost_id if it exists
        if (existingListing?.current_boost_id) {
          updateData.current_boost_id = existingListing.current_boost_id;
        }
        const result = await supabase
          .from('showcase_listings')
          .update(updateData)
          .eq('id', listingId)
          .select();

        error = result.error;
        data = result.data;
      } else if (kind === "sale") {
        const updateData: any = {
          admin_approved: true,
          is_published: true,
          status: 'active',
          rejection_message: null, // Clear any previous rejection message
          pending_edit_id: null, // Clear pending edit after approval
          updated_at: new Date().toISOString()
        };
        // Preserve current_boost_id if it exists
        if (existingListing?.current_boost_id) {
          updateData.current_boost_id = existingListing.current_boost_id;
        }
        const badges = await getVerificationBadgeUpdatesForListing(listingId, 'sale');
        if (badges) {
          Object.assign(updateData, badges);
        }
        const result = await supabase
          .from('sale_listings')
          .update(updateData)
          .eq('id', listingId)
          .select();

        error = result.error;
        data = result.data;
      } else if (kind === "marketplace") {
        const result = await supabase
          .from('marketplace_products' as any)
          .update({
            admin_approved: true,
            is_published: true,
            is_active: true,
            status: 'live',
            updated_at: new Date().toISOString()
          })
          .eq('id', listingId)
          .select();

        error = result.error;
        data = result.data;
      }

      if (error) {
        console.error('Error approving listing:', error);
        toast(adminToast.error(`Failed to approve listing: ${error.message}`));
        return;
      }

      if (!data || data.length === 0) {
        console.error('No data returned from approve update');
        toast(adminToast.error('Failed to approve listing - no data returned'));
        return;
      }

      await markApprovalNotificationsResolved(listingId, kind);

      toast(adminToast.success('Listing approved successfully!'));

      // Refresh the listings
      refreshListings();
    } catch (error) {
      console.error('Error approving listing:', error);
      toast(adminToast.error('Failed to approve listing'));
    }
  };

  const handleRejectFromDropdown = (listingId: string, listingType: string) => {
    setListingToReject({ id: listingId, type: listingType });
    setRejectionMessage("");
    setRejectionDialogOpen(true);
  };

  const confirmRejection = async () => {
    if (!listingToReject) return;

    try {
      const kind = adminListingKind(listingToReject.type);
      if (!kind) {
        toast(adminToast.error("Unknown listing type."));
        return;
      }

      let error;
      let data;

      if (kind === "stud") {
        const result = await supabase
          .from('stud_listings')
          .update({
            admin_approved: false,
            is_published: false,
            status: 'rejected',
            rejection_message: rejectionMessage || 'Listing rejected by admin',
            updated_at: new Date().toISOString()
          })
          .eq('id', listingToReject.id)
          .select();

        error = result.error;
        data = result.data;
      } else if (kind === "showcase") {
        const result = await supabase
          .from('showcase_listings')
          .update({
            admin_approved: false,
            is_published: false,
            status: 'rejected',
            rejection_message: rejectionMessage || 'Listing rejected by admin',
            updated_at: new Date().toISOString()
          })
          .eq('id', listingToReject.id)
          .select();

        error = result.error;
        data = result.data;
      } else if (kind === "sale") {
        const rejectionData = {
          admin_approved: false,
          is_published: false,
          status: 'rejected',
          rejection_message: rejectionMessage || 'Listing rejected by admin',
          updated_at: new Date().toISOString()
        };

        const result = await supabase
          .from('sale_listings')
          .update(rejectionData)
          .eq('id', listingToReject.id)
          .select();

        error = result.error;
        data = result.data;
      } else if (kind === "marketplace") {
        const result = await supabase
          .from('marketplace_products' as any)
          .update({
            admin_approved: false,
            is_published: false,
            is_active: false,
            status: 'draft',
            updated_at: new Date().toISOString()
          })
          .eq('id', listingToReject.id)
          .select();

        error = result.error;
        data = result.data;
      }

      if (error) {
        console.error('Error rejecting listing:', error);
        toast(adminToast.error(`Failed to reject listing: ${error.message}`));
        return;
      }

      if (!data || data.length === 0) {
        console.error('No data returned from reject update');
        toast(adminToast.error('Failed to reject listing - no data returned'));
        return;
      }

      await markApprovalNotificationsResolved(listingToReject.id, kind);

      toast(adminToast.success('Listing rejected'));

      // Close dialog and reset state
      setRejectionDialogOpen(false);
      setListingToReject(null);
      setRejectionMessage("");

      // Refresh the listings
      refreshListings();
    } catch (error) {
      console.error('Error rejecting listing:', error);
      toast(adminToast.error('Failed to reject listing'));
    }
  };

  const handleEditFromDropdown = (listingId: string, listingType: string) => {

    try {
      const kind = adminListingKind(listingType);
      if (kind === "stud") {
        router.push(`/admin-dashboard/edit-stud/${listingId}`);
      } else if (kind === "showcase") {
        router.push(`/admin-dashboard/edit-showcase/${listingId}`);
      } else if (kind === "sale") {
        router.push(`/admin-dashboard/edit-sale/${listingId}`);
      } else if (kind === "marketplace") {
        // Marketplace products are edited by business owners, not admins
        toast(adminToast.info("Marketplace products are managed by business owners. Contact them for edits."));
      } else {
        console.error("Unknown listing type for editing:", listingType);
        toast(adminToast.error("Unknown listing type for editing"));
      }
    } catch (error) {
      console.error('Error navigating to edit page:', error);
      toast(adminToast.error('Failed to navigate to edit page'));
    }
  };

  const handleViewDetails = (listingId: string, listingType: string) => {
    setSelectedListingFallback(null);
    const listing = listings.find((l) => l.id === listingId);

    if (listing) {
      setSelectedListingId(listingId);
      setDetailsModalOpen(true);
      return;
    }

    const kind = adminListingKind(listingType);
    if (kind) {
      setSelectedListingId(listingId);
      setSelectedListingFallback({ id: listingId, listingTypeForModal: kind });
      setDetailsModalOpen(true);
      return;
    }

    console.error(
      "Listing not found:",
      listingId,
      "Available listings:",
      listings.map((l) => ({ id: l.id, type: l.listing_type }))
    );
    toast(adminToast.error("Listing not found"));
  };

  const handleListingUpdated = () => {
    refreshListings();
  };

  const handleDeleteFromDropdown = (listingId: string, listingType: string) => {
    setListingToDelete({ id: listingId, type: listingType });
    setDeleteDialogOpen(true);
  };

  const confirmDeletion = async () => {
    if (!listingToDelete) return;

    try {

      let error;
      let data;

      const deleteKind = adminListingKind(listingToDelete.type);
      if (!deleteKind) {
        toast(adminToast.error("Unknown listing type."));
        return;
      }
      const tableName = tableForAdminListingKind(deleteKind);

      // Marketplace products don't have is_deleted field
      const updateData: any = {
        is_published: false
      };
      
      if (tableName !== 'marketplace_products') {
        updateData.is_deleted = true;
        updateData.deleted_at = new Date().toISOString();
      } else {
        // For marketplace, set status to draft
        updateData.status = 'draft';
        updateData.admin_approved = false;
      }
      
      const result = await supabase
        .from(tableName as any)
        .update(updateData)
        .eq('id', listingToDelete.id)
        .select();

      error = result.error;
      data = result.data;

      if (error) {
        console.error('Error deleting listing:', error);
        toast(adminToast.error(`Failed to delete listing: ${error.message}`));
        return;
      }

      if (!data || data.length === 0) {
        console.error('No data returned from delete update');
        toast(adminToast.error('Failed to delete listing - no data returned'));
        return;
      }

      toast(adminToast.success('Listing deleted successfully'));

      // Close dialog and reset state
      setDeleteDialogOpen(false);
      setListingToDelete(null);

      // Refresh the listings
      refreshListings();
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast(adminToast.error('Failed to delete listing'));
    }
  };

  // Handle inline field updates
  const handleFieldUpdate = async (listing: any, field: string, value: string | number | boolean): Promise<void> => {
    return new Promise(async (resolve) => {
      const rowKind = adminListingKind(listing.listing_type || listing.type);
      if (!rowKind) {
        toast(adminToast.error("Unknown listing type."));
        resolve();
        return;
      }
      const tableName = tableForAdminListingKind(rowKind);

      // Handle status field updates
      if (field === 'status') {
        const statusValue = value as string;

        // Pending seller edit: Active = approve edit; Rejected = reject edit (listing stays live)
        if (
          listing.pending_edit_id &&
          rowKind &&
          (rowKind === 'sale' || rowKind === 'stud') &&
          (statusValue === 'active' || statusValue === 'approved' || statusValue === 'rejected')
        ) {
          const sellerId = listing.seller_id || listing.user_id;
          if (!sellerId) {
            toast(adminToast.error('Could not resolve seller for this listing.'));
            resolve();
            return;
          }

          try {
            if (statusValue === 'active' || statusValue === 'approved') {
              await approvePendingListingEditForListing({
                listingType: rowKind as EditableListingType,
                listingId: listing.id,
                pendingEditId: listing.pending_edit_id,
                sellerId,
                adminNotes: listing.admin_notes ?? null,
              });
              toast(adminToast.success('Edit approved — changes are now live.'));
            } else {
              await rejectPendingListingEditForListing({
                listingType: rowKind as EditableListingType,
                listingId: listing.id,
                pendingEditId: listing.pending_edit_id,
                sellerId,
                listingTitle: listing.title || 'Listing',
                adminNotes: listing.rejection_message || listing.admin_notes,
              });
              toast(adminToast.success('Edit rejected. Live listing unchanged.'));
            }
            await markApprovalNotificationsResolved(listing.id, rowKind);
            refreshListings();
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to process edit';
            toast(adminToast.error(message));
          }
          resolve();
          return;
        }

        let is_published = false;
        let admin_approved = false;

        // Set is_published and admin_approved based on status
        if (statusValue === 'approved' || statusValue === 'active') {
          is_published = true;
          admin_approved = true;
        } else if (statusValue === 'expired') {
          // Expired means approved but not published (for showcase)
          is_published = false;
          admin_approved = true;
        } else if (statusValue === 'inactive') {
          // Inactive means approved but not published (for stud/sale)
          is_published = false;
          admin_approved = true;
        } else if (statusValue === 'rejected') {
          is_published = false;
          admin_approved = false;
        } else {
          // For pending, pending_review, pending_re_approval, draft
          is_published = false;
          admin_approved = false;
        }

        const updates: any = {
          is_published,
          admin_approved
        };
        
        // Only set rejection_message for tables that have this column (not marketplace_products)
        if (tableName !== 'marketplace_products') {
          // For rejected status, also set rejection_message if not already set
          if (statusValue === 'rejected') {
            updates.rejection_message = listing.rejection_message || 'Listing rejected by admin';
          } else {
            // Clear rejection message when status changes from rejected
            updates.rejection_message = null;
          }
        }
        
        // Update status field for sale_listings, showcase_listings, and marketplace_products
        if (tableName === 'sale_listings' || tableName === 'showcase_listings' || tableName === 'marketplace_products') {
          // Map status values for marketplace_products
          if (tableName === 'marketplace_products') {
            if (statusValue === 'active' || statusValue === 'approved') {
              updates.status = 'live';
              updates.is_published = true;
              updates.admin_approved = true;
              updates.is_active = true; // Ensure product is active when approved
            } else if (statusValue === 'pending' || statusValue === 'pending_review') {
              updates.status = 'pending_approval';
              updates.is_published = false;
              updates.admin_approved = false;
            } else if (statusValue === 'inactive' || statusValue === 'draft') {
              updates.status = 'draft';
              updates.is_published = false;
            } else if (statusValue === 'rejected') {
              updates.status = 'draft';
              updates.is_published = false;
              updates.admin_approved = false;
              updates.is_active = false;
            }
          } else if (tableName === 'showcase_listings') {
            // Keep DB-compatible showcase status while exposing only "Active" in UI.
            updates.status = statusValue === 'active' ? 'approved' : statusValue;
          } else if (tableName === 'sale_listings') {
            // Sale listings: single live value in DB — `active` (normalize legacy `approved`).
            if (statusValue === 'active' || statusValue === 'approved') {
              updates.status = 'active';
            } else {
              updates.status = statusValue;
            }
          }
        }

        if (
          admin_approved &&
          (rowKind === 'sale' || rowKind === 'stud') &&
          (statusValue === 'active' || statusValue === 'approved')
        ) {
          const badges = await getVerificationBadgeUpdatesForListing(listing.id, rowKind);
          if (badges) {
            Object.assign(updates, badges);
          }
        }

        const { error } = await supabase
          .from(tableName as any)
          .update(updates)
          .eq('id', listing.id);

        if (error) {
          console.error('Error updating listing:', error);
          toast(adminToast.error(`Failed to update status: ${error.message}`));
        } else {
          if (statusValue !== 'pending' && statusValue !== 'pending_review' && statusValue !== 'pending_re_approval') {
            await markApprovalNotificationsResolved(listing.id, rowKind);
          }
          toast(adminToast.success('Status updated successfully'));
          refreshListings();
        }
        resolve();
      }
      // Handle green_tick and gold_star updates with verification_date
      else if (field === 'green_tick' || field === 'gold_star') {
        const updates: Record<string, unknown> = { [field]: value };

        // If enabling green_tick, set verification_date to now
        if (field === 'green_tick' && value === true) {
          updates.verification_date = new Date().toISOString();
        }
        // If disabling green_tick, clear verification_date
        if (field === 'green_tick' && value === false) {
          updates.verification_date = null;
        }

        const { error } = await supabase
          .from(tableName as any)
          .update(updates)
          .eq('id', listing.id);

        if (error) {
          console.error(`Error updating ${field}:`, error);
          toast(adminToast.error(`Failed to update ${field === 'green_tick' ? 'green tick' : 'gold star'}: ${error.message}`));
          throw error;
        }

        patchListing(listing.id, updates);
        resolve();
      }
      else {
        if (rowKind === "marketplace") {
          toast(adminToast.info("Marketplace products are edited by the business owner."));
          resolve();
          return;
        }
        updateListing({
          listingId: listing.id,
          field,
          value,
          oldValue: listing[field],
          listingType: rowKind === "stud" ? "stud" : rowKind === "showcase" ? "showcase" : "sale"
        });
        resolve();
      }
    });
  };

  // Status badge renderer
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-600">Active</Badge>;
      case "approved":
        return <Badge className="bg-green-600">Active</Badge>;
      case "inactive":
        return <Badge variant="outline">Inactive</Badge>;
      case "pending":
      case "pending_review":
        return <Badge variant="secondary">Pending Review</Badge>;
      case "pending_re_approval":
        return <Badge className="bg-orange-500">Pending Re-Approval</Badge>;
      case "edit_pending_review":
        return <Badge className="bg-amber-500">Edit Pending Review</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Boost badge renderer
  const getBoostBadge = (boost: string | null) => {
    if (!boost) return null;

    switch (boost) {
      case "Gold":
        return <Badge className="bg-yellow-500">Gold</Badge>;
      case "Elite":
        return <Badge className="bg-purple-500">Elite</Badge>;
      case "Premium":
        return <Badge className="bg-blue-500">Premium</Badge>;
      case "Standard":
        return <Badge className="bg-slate-500">Standard</Badge>;
      default:
        return null;
    }
  };

  const listingForModal = useMemo(() => {
    if (!detailsModalOpen || !selectedListingId) return null;
    const found = listings.find((l) => l.id === selectedListingId);
    if (found) {
      const normalizedType = found.type || found.listing_type || "Unknown";
      return { ...found, type: normalizedType, listing_type: normalizedType };
    }
    if (selectedListingFallback && selectedListingFallback.id === selectedListingId) {
      const t = selectedListingFallback.listingTypeForModal;
      return { id: selectedListingId, type: t, listing_type: t };
    }
    return null;
  }, [detailsModalOpen, selectedListingId, listings, selectedListingFallback]);

  const isStudModal =
    listingForModal &&
    ['stud', 'Stud'].includes(String(listingForModal.type || listingForModal.listing_type));

  const studDetailsModal = (
    <StudListingDetailsModal
      listingId={isStudModal ? selectedListingId : null}
      open={detailsModalOpen && !!isStudModal && !!selectedListingId}
      onOpenChange={(open) => {
        setDetailsModalOpen(open);
        if (!open) {
          setSelectedListingFallback(null);
          router.replace("/admin-dashboard/listings", { scroll: false });
        }
      }}
      onListingUpdated={handleListingUpdated}
    />
  );

  const detailsModal = (
    <ListingDetailsModal
      listing={!isStudModal ? listingForModal : null}
      open={detailsModalOpen && !!listingForModal && !isStudModal}
      onOpenChange={(open) => {
        setDetailsModalOpen(open);
        if (!open) {
          setSelectedListingFallback(null);
          router.replace("/admin-dashboard/listings", { scroll: false });
        }
      }}
      onListingUpdated={handleListingUpdated}
    />
  );

  if (isLoading) {
    return (
      <>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h2 className="text-2xl font-bold">Listings Management</h2>
          </div>
          <div className="py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-center text-muted-foreground">Loading listings...</p>
          </div>
        </div>
        {studDetailsModal}
        {detailsModal}
      </>
    );
  }

  if (role !== 'admin') {
    return (
      <>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h2 className="text-2xl font-bold">Listings Management</h2>
          </div>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <p className="text-red-500">Access denied. Admin privileges required.</p>
            </div>
          </div>
        </div>
        {studDetailsModal}
        {detailsModal}
      </>
    );
  }

  return (
    <>
      <div className="space-y-6 w-full max-w-full" style={{ boxSizing: 'border-box' }}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold">{listingManagementHeader.title}</h2>
                {notificationCounts &&
                  (notificationCounts.sales > 0 ||
                    notificationCounts.stud > 0 ||
                    notificationCounts.showcase > 0 ||
                    (notificationCounts.otherApprovals ?? 0) > 0) && (
                  <NotificationBadge
                    count={
                      notificationCounts.sales +
                      notificationCounts.stud +
                      notificationCounts.showcase +
                      (notificationCounts.otherApprovals ?? 0)
                    }
                    href="/admin-dashboard/notifications?filter=approvals"
                  />
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">{listingManagementHeader.subtitle}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                Total: {totalCount}
              </div>
              <Button
                variant="outline"
                onClick={() => setFilterStatus("all")}
                className="text-xs sm:text-sm whitespace-nowrap"
                size="sm"
              >
                <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">View All Listings</span>
                <span className="sm:hidden">All</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-full">
          <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <TabsList className="inline-flex md:grid md:grid-cols-5 lg:w-[750px] bg-gray-100 p-1 rounded-lg w-max md:w-full">
                <TabsTrigger
                  value="all"
                  className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm font-medium whitespace-nowrap px-4 md:px-3"
                >
                  All Listings
                </TabsTrigger>
                <TabsTrigger
                  value="sale"
                  className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm font-medium whitespace-nowrap px-4 md:px-3"
                >
                  For Sale
                  {notificationCounts && notificationCounts.sales > 0 && (
                    <NotificationBadge count={notificationCounts.sales} className="ml-2" />
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="stud"
                  className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm font-medium whitespace-nowrap px-4 md:px-3"
                >
                  Stud
                  {notificationCounts && notificationCounts.stud > 0 && (
                    <NotificationBadge count={notificationCounts.stud} className="ml-2" />
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="showcase"
                  className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm font-medium whitespace-nowrap px-4 md:px-3"
                >
                  Showcase
                  {notificationCounts && notificationCounts.showcase > 0 && (
                    <NotificationBadge count={notificationCounts.showcase} className="ml-2" />
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="marketplace"
                  className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm font-medium whitespace-nowrap px-4 md:px-3"
                >
                  Marketplace
                  {notificationCounts && notificationCounts.marketplace > 0 && (
                    <NotificationBadge count={notificationCounts.marketplace} className="ml-2" />
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  placeholder="Search by title, seller, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 border-border bg-background focus:ring-2 focus:ring-brand-light-green focus:border-brand-light-green transition-colors w-full"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[200px] h-10 border-border bg-background focus:ring-2 focus:ring-brand-light-green focus:border-brand-light-green flex-shrink-0">
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  <SelectItem value="all" className="hover:bg-brand-light-green/10">
                    <div className="flex items-center gap-2">
                      <PawPrint className="h-4 w-4" />
                      All Statuses
                    </div>
                  </SelectItem>
                  <SelectItem value="active" className="hover:bg-brand-light-green/10">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Active (live)
                    </div>
                  </SelectItem>
                  <SelectItem value="inactive" className="hover:bg-brand-light-green/10">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      Inactive
                    </div>
                  </SelectItem>
                  <SelectItem value="pending" className="hover:bg-brand-light-green/10">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-600" />
                      Pending Review
                    </div>
                  </SelectItem>
                  <SelectItem value="pending_re_approval" className="hover:bg-brand-light-green/10">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      Pending Re-Approval
                    </div>
                  </SelectItem>
                  <SelectItem value="rejected" className="hover:bg-brand-light-green/10">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      Rejected
                    </div>
                  </SelectItem>
                  <SelectItem value="expired_verification" className="hover:bg-brand-light-green/10">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-amber-600" />
                      Expired Verification
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <TabsContent value="all" className="mt-6 space-y-4">
              <AdminInlineEditTable
                listings={listings}
                onFieldUpdate={handleFieldUpdate}
                onViewDetails={handleViewDetails}
                onEdit={handleEditFromDropdown}
                onDelete={handleDeleteFromDropdown}
              />
              {listings.length > 0 && (
                <ListingsPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  onPageChange={goToPage}
                />
              )}
            </TabsContent>
            <TabsContent value="sale" className="mt-6 space-y-4">
              <AdminInlineEditTable
                listings={listings}
                onFieldUpdate={handleFieldUpdate}
                onViewDetails={handleViewDetails}
                onEdit={handleEditFromDropdown}
                onDelete={handleDeleteFromDropdown}
              />
              {listings.length > 0 && (
                <ListingsPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  onPageChange={goToPage}
                />
              )}
            </TabsContent>
            <TabsContent value="stud" className="mt-6 space-y-4">
              <AdminInlineEditTable
                listings={listings}
                onFieldUpdate={handleFieldUpdate}
                onViewDetails={handleViewDetails}
                onEdit={handleEditFromDropdown}
                onDelete={handleDeleteFromDropdown}
              />
              {listings.length > 0 && (
                <ListingsPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  onPageChange={goToPage}
                />
              )}
            </TabsContent>
            <TabsContent value="showcase" className="mt-6 space-y-4">
              <AdminInlineEditTable
                listings={listings}
                onFieldUpdate={handleFieldUpdate}
                onViewDetails={handleViewDetails}
                onEdit={handleEditFromDropdown}
                onDelete={handleDeleteFromDropdown}
              />
              {listings.length > 0 && (
                <ListingsPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  onPageChange={goToPage}
                />
              )}
            </TabsContent>
            <TabsContent value="marketplace" className="mt-6 space-y-4">
              {!isLoading && totalCount === 0 && (
                <p className="text-sm text-muted-foreground rounded-md border border-dashed border-border bg-muted/30 px-3 py-2">
                  {filterStatus === "pending" ? (
                    <>
                      No marketplace products are in <span className="font-medium">Pending Review</span> (they need database status{" "}
                      <span className="font-mono text-xs">pending_approval</span>).{" "}
                    </>
                  ) : (
                    <>No marketplace products match this filter. </>
                  )}
                  Red badges on <span className="font-medium">For Sale</span>, <span className="font-medium">Stud</span>, or <span className="font-medium">Showcase</span> count those listing notifications only, not marketplace rows in this tab.
                  Unread <span className="font-medium">marketplace product</span> notifications are included in the <span className="font-medium">Shop</span> sidebar badge.
                  If you expect a product here, try <span className="font-medium">All Statuses</span> or confirm it was submitted for approval from the seller marketplace dashboard.
                </p>
              )}
              <AdminInlineEditTable
                listings={listings}
                onFieldUpdate={handleFieldUpdate}
                onViewDetails={handleViewDetails}
                onEdit={handleEditFromDropdown}
                onDelete={handleDeleteFromDropdown}
                onReject={handleRejectFromDropdown}
              />
              {listings.length > 0 && (
                <ListingsPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  onPageChange={goToPage}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>

        <ViewListingsSection />
      </div>

      {studDetailsModal}
      {detailsModal}

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Listing</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this listing. This message will be sent to the seller.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-message">Rejection Reason</Label>
              <Textarea
                id="rejection-message"
                placeholder="Please explain why this listing is being rejected..."
                value={rejectionMessage}
                onChange={(e) => setRejectionMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRejection}
            >
              Reject Listing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Listing</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this listing? This action will mark it as deleted and hide it from view.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeletion}
            >
              Delete Listing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

