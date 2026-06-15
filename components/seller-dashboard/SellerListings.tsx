
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreVertical, Edit, Trash2, Repeat, Play, Pause, RefreshCw, AlertTriangle, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useShowcaseConversion } from '@/hooks/useShowcaseConversion';
import { useSellerListingActions } from '@/hooks/useSellerListingActions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { isShowcasePuppyAgeExpired } from '@/lib/utils/showcase-age';
import {
  formatSaleListingExpiryLabel,
  isSaleListingExpired,
} from '@/lib/utils/sale-listing-expiry';
import { ShowcaseConversionDialog } from './ShowcaseConversionDialog';

interface Listing {
  id: string;
  title: string;
  breed: string;
  location: string;
  price: number;
  admin_approved: boolean | null;
  is_published: boolean | null;
  created_at: string;
  type: 'listing' | 'showcase' | 'stud' | 'service';
  date_of_birth?: string;
  is_expired?: boolean | null;
  converted_to_sale_id?: string | null;
  status?: string;
  is_paused?: boolean | null;
  is_deleted?: boolean | null;
  payment_status?: string | null;
  current_boost_id?: string | null;
  boost_type?: string | null;
  /** From `boosts` row when `current_boost_id` is set */
  boost_end_time?: string | null;
  boost_start_time?: string | null;
  expires_at?: string | null;
  can_renew?: boolean | null;
  pending_edit_id?: string | null;
}

const SellerListings: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { convertToSaleListing, isConverting } = useShowcaseConversion();
  const { 
    deleteListing, 
    pauseListing, 
    renewListing, 
    isDeleting, 
    isPausing, 
    isRenewing 
  } = useSellerListingActions();
  
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null);
  const [isDeletingDraft, setIsDeletingDraft] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<{id: string, type: string} | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [conversionDialogOpen, setConversionDialogOpen] = useState(false);
  const [selectedShowcaseId, setSelectedShowcaseId] = useState<string | null>(null);

  // Fetch sale listings with pagination (exclude deleted)
  const { data: saleListingsData, isLoading: isLoadingSale } = useQuery({
    queryKey: ['seller-sale-listings', user?.id],
    /** Default app staleTime is 60s; sale + showcase must stay in sync so we always refetch on this page. */
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      if (!user?.id) return { data: [], count: 0 };
      
      const { data, error, count } = await supabase
        .from('sale_listings')
        .select('*', { count: 'exact' })
        .eq('seller_id', user.id)
        .or('is_deleted.is.null,is_deleted.eq.false')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      return {
        data: data.map(listing => ({
          ...listing,
          breed: getBreedDisplayName(listing.breed_1, listing.breed_2, listing.breed_type)
        })),
        count: count || 0
      };
    },
    enabled: !!user?.id,
  });

  const saleListings = saleListingsData?.data || [];
  const saleListingsCount = saleListingsData?.count || 0;

  // Fetch drafts from sale_listing_drafts table
  const { data: saleDrafts = [], isLoading: isLoadingDrafts } = useQuery({
    queryKey: ['seller-sale-drafts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('sale_listing_drafts')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
        
      if (error) throw error;
      
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch stud listings with pagination (exclude deleted)
  const { data: studListingsData, isLoading: isLoadingStud } = useQuery({
    queryKey: ['seller-stud-listings', user?.id],
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      if (!user?.id) return { data: [], count: 0 };
      
      const { data, error, count } = await supabase
        .from('stud_listings')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .or('is_deleted.is.null,is_deleted.eq.false')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      return {
        data: data.map(listing => ({
          ...listing,
          breed: getBreedDisplayName(listing.breed1, listing.breed2, listing.breed_type)
        })),
        count: count || 0
      };
    },
    enabled: !!user?.id,
  });

  const studListings = studListingsData?.data || [];
  const studListingsCount = studListingsData?.count || 0;

  // Fetch showcase listings with pagination (exclude deleted)
  const { data: showcaseListingsData, isLoading: isLoadingShowcase } = useQuery({
    queryKey: ['seller-showcase-listings', user?.id],
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      if (!user?.id) return { data: [], count: 0 };
      
      const { data, error, count } = await supabase
        .from('showcase_listings')
        .select('*', { count: 'exact' })
        .eq('seller_id', user.id)
        .or('is_deleted.is.null,is_deleted.eq.false')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      return {
        data: data.map(listing => ({
          ...listing,
          breed: listing.breed || 'Unknown Breed'
        })),
        count: count || 0
      };
    },
    enabled: !!user?.id,
  });

  const showcaseListings = showcaseListingsData?.data || [];
  const showcaseListingsCount = showcaseListingsData?.count || 0;

  // Helper function to get breed display name
  const getBreedDisplayName = (breed1: string | null, breed2: string | null, breed_type: string | null) => {
    if (breed_type === 'crossbreed' && breed1 && breed2) {
      return `${breed1} x ${breed2}`;
    }
    
    if (breed1) {
      return breed1;
    }
    
    return 'Mixed Breed';
  };

  // Helper functions
  const getListingStatus = (listing: Listing) => {
    if (listing.is_deleted) return 'deleted';
    if (listing.status === 'pending_re_approval') return 'pending_re_approval';
    if (
      listing.type === 'listing' &&
      (listing.status === 'expired' ||
        isSaleListingExpired(listing.expires_at, listing.status))
    ) {
      return 'expired';
    }
    if (listing.is_paused) return 'paused';
    if (listing.payment_status === 'expired') return 'expired';
    if (!listing.admin_approved) return 'pending_approval';
    if (listing.is_published) return 'active';
    return 'draft';
  };

  const hasPendingEdit = (listing: Listing) => Boolean(listing.pending_edit_id);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 text-white">Active</Badge>;
      case 'pending_approval':
        return <Badge variant="outline">Pending Approval</Badge>;
      case 'pending_re_approval':
        return <Badge className="bg-yellow-500 text-white">Pending Re-Approval</Badge>;
      case 'edit_pending':
        return <Badge className="bg-amber-500 text-white">Edit Pending Review</Badge>;
      case 'paused':
        return <Badge className="bg-blue-500 text-white">Paused</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatBoostExpiryLine = (
    boostType: string | null | undefined,
    boostEnd: string | null | undefined,
    boostStart?: string | null | undefined,
  ) => {
    if (!boostType && !boostEnd && !boostStart) return null;

    if (boostStart && new Date(boostStart).getTime() > Date.now() + 60_000) {
      try {
        return `Scheduled — goes live ${new Date(boostStart).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })}`;
      } catch {
        return `Scheduled — goes live ${boostStart}`;
      }
    }

    if (boostEnd) {
      try {
        return new Date(boostEnd).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        });
      } catch {
        return boostEnd;
      }
    }
    const tier = (boostType || "").toLowerCase();
    if (tier === "standard") {
      return "No fixed end date (Standard — active until bumped by newer boosts)";
    }
    return "End date not set in database — refresh or contact support if this persists";
  };

  const getBoostBadge = (boostType: string | null | undefined) => {
    if (!boostType) return null;

    const boostColors: Record<string, string> = {
      'gold': 'bg-yellow-500 text-white border-yellow-600',
      'elite': 'bg-purple-500 text-white border-purple-600',
      'premium': 'bg-blue-500 text-white border-blue-600',
      'standard': 'bg-orange-500 text-white border-orange-600'
    };
    
    const boostLabels: Record<string, string> = {
      'gold': 'Gold Boost',
      'elite': 'Elite Boost',
      'premium': 'Premium Boost',
      'standard': 'Standard Boost'
    };
    
    return (
      <Badge className={boostColors[boostType] || 'bg-gray-500 text-white'}>
        ⚡ {boostLabels[boostType] || boostType}
      </Badge>
    );
  };

  const getListingTypeBadge = (type: string) => {
    const typeLabels: Record<string, string> = {
      'listing': 'Sale',
      'stud': 'Stud',
      'showcase': 'Showcase',
      'service': 'Service'
    };
    
    const typeColors: Record<string, string> = {
      'listing': 'bg-green-100 text-green-800 border-green-300',
      'stud': 'bg-blue-100 text-blue-800 border-blue-300',
      'showcase': 'bg-purple-100 text-purple-800 border-purple-300',
      'service': 'bg-gray-100 text-gray-800 border-gray-300'
    };
    
    return (
      <Badge className={typeColors[type] || 'bg-gray-100 text-gray-800'}>
        {typeLabels[type] || type}
      </Badge>
    );
  };

  const canEdit = (listing: Listing) => {
    if (hasPendingEdit(listing)) return false;
    const status = getListingStatus(listing);
    return ['active', 'paused', 'draft', 'pending_approval'].includes(status);
  };

  const canPause = (listing: Listing) => {
    const status = getListingStatus(listing);
    return ['active', 'paused'].includes(status);
  };

  const canRenew = (listing: Listing) => {
    const status = getListingStatus(listing);
    if (listing.type === 'listing') {
      return status === 'expired' && listing.can_renew !== false;
    }
    return ['expired', 'paused'].includes(status);
  };


  // Get all boost IDs from listings
  const allBoostIds = useMemo(() => {
    return [
      ...(saleListings.map((l: any) => l.current_boost_id).filter(Boolean)),
      ...(studListings.map((l: any) => l.current_boost_id).filter(Boolean)),
      ...(showcaseListings.map((l: any) => l.current_boost_id).filter(Boolean))
    ];
  }, [saleListings, studListings, showcaseListings]);

  // Fetch boost information for all listings
  const { data: boostData } = useQuery({
    queryKey: ['seller-listing-boosts', user?.id, allBoostIds.join(',')],
    queryFn: async () => {
      if (!user?.id || allBoostIds.length === 0) return new Map();
      
      // Fetch boost details (including expiry — previously only boost_type was loaded)
      const { data: boosts } = await supabase
        .from('boosts')
        .select('id, boost_type, boost_start_time, boost_end_time')
        .in('id', allBoostIds);
      
      const boostMap = new Map<
        string,
        { boost_type: string; boost_start_time: string | null; boost_end_time: string | null }
      >();
      boosts?.forEach((boost) => {
        boostMap.set(boost.id, {
          boost_type: boost.boost_type,
          boost_start_time: boost.boost_start_time ?? null,
          boost_end_time: boost.boost_end_time ?? null,
        });
      });
      
      return boostMap;
    },
    enabled: !!user?.id && allBoostIds.length > 0,
  });

  const boostMap = boostData || new Map();

  const boostFieldsFromRow = (currentBoostId: string | null | undefined) => {
    if (!currentBoostId) {
      return { boost_type: null as string | null, boost_end_time: null as string | null, boost_start_time: null as string | null };
    }
    const row = boostMap.get(currentBoostId);
    if (!row) {
      return { boost_type: null as string | null, boost_end_time: null as string | null, boost_start_time: null as string | null };
    }
    return {
      boost_type: row.boost_type,
      boost_end_time: row.boost_end_time,
      boost_start_time: row.boost_start_time,
    };
  };

  // Combine all listings and sort by created_at (newest first)
  const listings: Listing[] = useMemo(() => {
    const normId = (u: string) => u.replace(/-/g, '').toLowerCase();
    const showcaseIdsWithSaleChild = new Set(
      saleListings
        .map((s: { converted_from_showcase_id?: string | null }) => s.converted_from_showcase_id)
        .filter((id): id is string => Boolean(id))
        .map((id) => normId(id))
    );

    const combined = [
      ...(saleListings.map((listing) => {
        const b = boostFieldsFromRow((listing as any).current_boost_id);
        return {
        id: listing.id,
        title: listing.title,
        breed: listing.breed,
        location: listing.location,
        price: listing.price || listing.uniform_price || 0,
        admin_approved: listing.admin_approved,
        is_published: listing.is_published,
        created_at: listing.created_at,
        type: 'listing' as const,
        status: (listing as any).status || 'draft',
        is_paused: (listing as any).is_paused || false,
        is_deleted: (listing as any).is_deleted || false,
        payment_status: (listing as any).payment_status || 'pending',
        current_boost_id: (listing as any).current_boost_id || null,
        boost_type: b.boost_type,
        boost_end_time: b.boost_end_time,
        boost_start_time: b.boost_start_time,
        expires_at: (listing as { expires_at?: string | null }).expires_at ?? null,
        can_renew: (listing as { can_renew?: boolean | null }).can_renew ?? null,
        pending_edit_id: (listing as { pending_edit_id?: string | null }).pending_edit_id ?? null,
      };
      })),
      ...(studListings.map((listing) => {
        const b = boostFieldsFromRow((listing as any).current_boost_id);
        return {
        id: listing.id,
        title: listing.title,
        breed: listing.breed,
        location: listing.location,
        price: listing.stud_fee,
        admin_approved: listing.admin_approved,
        is_published: listing.is_published,
        created_at: listing.created_at,
        type: 'stud' as const,
        status: (listing as any).status || 'draft',
        is_paused: (listing as any).is_paused || false,
        is_deleted: (listing as any).is_deleted || false,
        payment_status: (listing as any).payment_status || 'pending',
        current_boost_id: (listing as any).current_boost_id || null,
        boost_type: b.boost_type,
        boost_end_time: b.boost_end_time,
        boost_start_time: b.boost_start_time,
        pending_edit_id: (listing as { pending_edit_id?: string | null }).pending_edit_id ?? null,
      };
      })),
      ...(showcaseListings.map((listing) => {
        const b = boostFieldsFromRow((listing as any).current_boost_id);
        return {
        id: listing.id,
        title: listing.title,
        breed: listing.breed,
        location: listing.location,
        price: 0, // Showcase listings don't have prices
        admin_approved: listing.admin_approved,
        is_published: listing.is_published,
        created_at: listing.created_at,
        type: 'showcase' as const,
        date_of_birth: listing.date_of_birth,
        is_expired: listing.is_expired || isShowcasePuppyAgeExpired(listing.date_of_birth, listing.created_at),
        converted_to_sale_id: listing.converted_to_sale_id,
        status: (listing as any).status || 'draft',
        is_paused: (listing as any).is_paused || false,
        is_deleted: (listing as any).is_deleted || false,
        payment_status: (listing as any).payment_status || 'pending',
        current_boost_id: (listing as any).current_boost_id || null,
        boost_type: b.boost_type,
        boost_end_time: b.boost_end_time,
        boost_start_time: b.boost_start_time,
        pending_edit_id: (listing as { pending_edit_id?: string | null }).pending_edit_id ?? null,
      };
      })),
    ]
      // Converted showcases stay in DB (wishlist/audit) but the For Sale ad is the live listing — hide duplicate card.
      // Also match sale_listings.converted_from_showcase_id so we hide even if showcase.converted_to_sale_id is missing in the client row.
      .filter((l) => {
        if (l.type !== 'showcase') return true;
        if (l.converted_to_sale_id) return false;
        if (showcaseIdsWithSaleChild.has(normId(String(l.id)))) return false;
        return true;
      });
    
    // Sort by created_at descending (newest first)
    return combined.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [saleListings, studListings, showcaseListings, boostMap]);

  // Filter out deleted listings and sort by status priority
  const visibleListings = useMemo(() => {
    return listings.filter(listing => !listing.is_deleted);
  }, [listings]);
  
  const pendingReApprovalListings = useMemo(() => {
    return visibleListings.filter(l => getListingStatus(l) === 'pending_re_approval');
  }, [visibleListings]);

  // Calculate total count from all tables (excluding deleted)
  const totalCount = visibleListings.length;

  // Pagination logic - paginate the combined listings
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedListings = useMemo(() => {
    return visibleListings.slice(startIndex, endIndex);
  }, [visibleListings, startIndex, endIndex]);

  // Reset to page 1 when listings change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const isLoading = isLoadingSale || isLoadingStud || isLoadingShowcase || isLoadingDrafts;

  // Handle draft deletion
  const handleDeleteDraft = async (draftId: string) => {
    setIsDeletingDraft(true);
    try {
      const { error } = await supabase
        .from('sale_listing_drafts')
        .delete()
        .eq('id', draftId);

      if (error) throw error;

      toast({
        title: "Draft deleted",
        description: "Your draft has been deleted successfully.",
      });

      // Refresh the drafts list
      queryClient.invalidateQueries({ queryKey: ['seller-sale-drafts', user?.id] });
      setDraftToDelete(null);
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast({
        title: "Error deleting draft",
        description: "There was a problem deleting your draft. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingDraft(false);
    }
  };

  if (isLoading) {
    return <p>Loading...</p>;
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Pending Re-Approval Banner */}
        {pendingReApprovalListings.length > 0 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              You have {pendingReApprovalListings.length} listing(s) pending admin re-approval after recent edits.
            </AlertDescription>
          </Alert>
        )}

        {/* Unfinished Drafts Section */}
        {saleDrafts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Unfinished Drafts</h2>
              <Badge variant="outline">{saleDrafts.length} draft{saleDrafts.length !== 1 ? 's' : ''}</Badge>
            </div>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {saleDrafts.map((draft) => (
                <Card 
                  key={draft.id} 
                  className="transition-all duration-200 hover:shadow-lg hover:border-primary/20 cursor-pointer border-blue-200 bg-blue-50/30"
                  onClick={() => router.push(`/add-sale-listing?draft=${draft.id}`)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span className="truncate">{draft.draft_name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDraftToDelete(draft.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <span className="font-medium text-foreground">Last saved:</span> 
                        {new Date(draft.updated_at).toLocaleDateString()} at {new Date(draft.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {draft.form_data && typeof draft.form_data === 'object' && 'title' in draft.form_data && (
                        <p className="flex items-center gap-2">
                          <span className="font-medium text-foreground">Title:</span> 
                          {String(draft.form_data.title)}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                      <Badge className="bg-blue-500 text-white">Draft</Badge>
                    </div>
                    
                    <div className="pt-2">
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/add-sale-listing?draft=${draft.id}`);
                        }}
                      >
                        Continue Editing
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Delete Draft Confirmation Dialog */}
        <AlertDialog open={!!draftToDelete} onOpenChange={(open) => !open && setDraftToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Draft</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this draft? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingDraft}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => draftToDelete && handleDeleteDraft(draftToDelete)}
                disabled={isDeletingDraft}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeletingDraft ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Listing Confirmation Dialog */}
        <AlertDialog open={!!listingToDelete} onOpenChange={(open) => !open && setListingToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Listing</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this listing? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (listingToDelete) {
                    deleteListing({ 
                      listingId: listingToDelete.id, 
                      listingType: listingToDelete.type as any 
                    });
                    setListingToDelete(null);
                  }
                }}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Published Listings Section */}
        {visibleListings.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">My Listings</h2>
              {visibleListings.length > itemsPerPage && (
                <span className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, visibleListings.length)} of {visibleListings.length}
                </span>
              )}
            </div>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {paginatedListings.map((listing) => {
            const status = getListingStatus(listing);
            const editPending = hasPendingEdit(listing);
            return (
            <Card 
              key={listing.id} 
              className={cn(
                "transition-all duration-200 hover:shadow-lg",
                status === 'pending_re_approval' ? 'border-yellow-200 bg-yellow-50/30' :
                editPending ? 'border-amber-300 bg-amber-50/40' :
                'hover:border-primary/20'
              )}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  <span className="truncate">{listing.title}</span>
                  {status === 'pending_re_approval' && (
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 ml-2" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Pending admin re-approval</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {editPending && (
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 ml-2" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Your edit is waiting for admin review</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <span className="font-medium text-foreground">Breed:</span> {listing.breed}
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="font-medium text-foreground">Location:</span> {listing.location}
                  </p>
                  {listing.type !== 'showcase' && (
                    <p className="flex items-center gap-2">
                      <span className="font-medium text-foreground">Price:</span> 
                      <span className="text-lg font-semibold text-primary">€{listing.price}</span>
                    </p>
                  )}
                  {listing.type === 'showcase' && listing.date_of_birth && (
                    <p className="flex items-center gap-2">
                      <span className="font-medium text-foreground">Date of Birth:</span> 
                      {new Date(listing.date_of_birth).toLocaleDateString()}
                    </p>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                  {getListingTypeBadge(listing.type)}
                  {getStatusBadge(status)}
                  {editPending && getStatusBadge('edit_pending')}
                  {getBoostBadge(listing.boost_type)}
                  {listing.type === 'showcase' && listing.is_expired && (
                    <Badge variant="destructive">Expired</Badge>
                  )}
                  {listing.type === 'listing' && status === 'expired' && (
                    <Badge variant="destructive">Expired</Badge>
                  )}
                  {listing.type === 'showcase' && listing.converted_to_sale_id && (
                    <Badge className="bg-blue-500 text-white">Converted</Badge>
                  )}
                </div>
                {listing.boost_type && (
                  <p className="text-xs text-muted-foreground pt-2">
                    <span className="font-medium text-foreground">Boost expiry: </span>
                    {formatBoostExpiryLine(listing.boost_type, listing.boost_end_time, listing.boost_start_time)}
                  </p>
                )}
                {listing.type === 'listing' && listing.expires_at && status === 'active' && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Ad expiry: </span>
                    {formatSaleListingExpiryLabel(listing.expires_at)}
                  </p>
                )}
                {listing.type === 'listing' && status === 'expired' && (
                  <p className="text-xs text-orange-700">
                    This ad expired after 4 weeks. Use Renew to request admin re-approval.
                  </p>
                )}
                {editPending && (
                  <p className="text-xs text-amber-800 bg-amber-100/80 rounded-md px-2 py-1.5">
                    Your edited version is awaiting admin review. This listing stays live with the current content until approved.
                  </p>
                )}
                
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-3">
                  {/* Boost Button (Sale & Stud only) */}
                  {(listing.type === 'listing' || listing.type === 'stud') && status === 'active' && (
                    <Button
                      onClick={() => {
                        const listingType = listing.type === 'listing' ? 'sale' : 'stud';
                        router.push(`/boost-listing?listingId=${encodeURIComponent(listing.id)}&type=${encodeURIComponent(listingType)}&title=${encodeURIComponent(listing.title)}`);
                      }}
                      size="sm"
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white flex-1 min-w-[100px]"
                    >
                      <TrendingUp className="mr-1 h-3 w-3" />
                      Boost
                    </Button>
                  )}

                  {/* Convert to Sale (Showcase only) */}
                  {listing.type === 'showcase' && listing.is_expired && !listing.converted_to_sale_id && (
                    <Button
                      onClick={() => {
                        setSelectedShowcaseId(listing.id);
                        setConversionDialogOpen(true);
                      }}
                      disabled={isConverting}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white flex-1 min-w-[100px]"
                    >
                      <Repeat className="mr-1 h-3 w-3" />
                      Convert
                    </Button>
                  )}

                  {/* Renew Button */}
                  {canRenew(listing) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => renewListing({ listingId: listing.id, listingType: listing.type as any })}
                          disabled={isRenewing}
                          size="sm"
                          variant="outline"
                          className="flex-1 min-w-[100px]"
                        >
                          <RefreshCw className="mr-1 h-3 w-3" />
                          Renew
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Request renewal and admin approval</p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* Actions Dropdown - Hide for showcase listings in convert state */}
                  {!(listing.type === 'showcase' && listing.is_expired && !listing.converted_to_sale_id) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[180px] bg-background z-50">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      
                      {/* Boost */}
                      {(listing.type === 'listing' || listing.type === 'stud') && status === 'active' && (
                        <DropdownMenuItem
                          onClick={() => {
                            // Store state in sessionStorage for Next.js navigation
                            if (typeof window !== 'undefined') {
                              sessionStorage.setItem('boostListingId', listing.id);
                              sessionStorage.setItem('boostListingTitle', listing.title);
                              sessionStorage.setItem('boostListingType', listing.type === 'listing' ? 'sale' : 'stud');
                            }
                            router.push('/boost-listing');
                          }}
                        >
                          <TrendingUp className="mr-2 h-4 w-4" />
                          Boost Listing
                        </DropdownMenuItem>
                      )}

                      {(listing.type === 'listing' || listing.type === 'stud') && status === 'active' && <DropdownMenuSeparator />}

                      {/* Edit */}
                      {canEdit(listing) && (
                        <DropdownMenuItem
                          onClick={() => {
                            const editPath = listing.type === 'listing' ? '/edit-sale-listing' :
                                           listing.type === 'stud' ? '/edit-stud-listing' :
                                           '/edit-showcase-listing';
                            router.push(`${editPath}/${listing.id}`);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {editPending && (
                        <DropdownMenuItem disabled className="text-amber-700">
                          <Edit className="mr-2 h-4 w-4" />
                          Edit (pending review)
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />
                      
                      {/* Pause/Resume */}
                      {canPause(listing) && (
                        <DropdownMenuItem
                          onClick={() => pauseListing({ 
                            listingId: listing.id, 
                            listingType: listing.type as any, 
                            isPaused: !listing.is_paused 
                          })}
                          disabled={isPausing}
                        >
                          {listing.is_paused ? (
                            <>
                              <Play className="mr-2 h-4 w-4" />
                              Resume
                            </>
                          ) : (
                            <>
                              <Pause className="mr-2 h-4 w-4" />
                              Pause
                            </>
                          )}
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />
                      
                      {/* Delete */}
                      <DropdownMenuItem
                        onClick={() => setListingToDelete({ id: listing.id, type: listing.type })}
                        disabled={isDeleting}
                        className="text-red-500 focus:text-red-500"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  )}
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>

            {/* Pagination */}
            {visibleListings.length > itemsPerPage && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          variant={page === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "w-9 h-9",
                            page === currentPage && "bg-brand-dark-green hover:bg-brand-dark-green"
                          )}
                          aria-label={`Go to page ${page}`}
                          aria-current={page === currentPage ? "page" : undefined}
                        >
                          {page}
                        </Button>
                      );
                    }
                    // Show ellipsis
                    if (
                      (page === currentPage - 2 && currentPage > 3) ||
                      (page === currentPage + 2 && currentPage < totalPages - 2)
                    ) {
                      return <span key={page} className="px-1 text-gray-500">...</span>;
                    }
                    return null;
                  })}
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
      </div>
    )}
        
        {visibleListings.length === 0 && saleDrafts.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No listings or drafts found. <Link href="/add-listing" className="text-primary hover:underline">Create your first listing!</Link>
            </p>
          </div>
        )}
      </div>

      {/* Showcase Conversion Dialog */}
      {selectedShowcaseId && (
        <ShowcaseConversionDialog
          showcaseId={selectedShowcaseId}
          open={conversionDialogOpen}
          onOpenChange={(open) => {
            setConversionDialogOpen(open);
            if (!open) {
              setSelectedShowcaseId(null);
            }
          }}
          onSuccess={() => {
            // Refresh listings after successful conversion
            queryClient.invalidateQueries({ queryKey: ['seller-sale-listings', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['seller-showcase-listings', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['seller-stud-listings', user?.id] });
          }}
        />
      )}
    </TooltipProvider>
  );
};

export default SellerListings;
