
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { PUBLIC_MARKETPLACE_SALE_STATUSES } from '@/lib/listings/public-marketplace-sale-status';
import { toast } from 'sonner';
import { sellerDisplayNameWithFallback } from '@/lib/utils/seller-display';
import { firstRpcRow } from '@/lib/utils/rpc-rows';

type PublicNameRow = {
  first_name: string | null;
  last_name: string | null;
  business_name: string | null;
};

/** user_profiles is often empty for other users when RLS applies; RPC returns public display fields. */
async function loadSellerDisplayMaps(userIds: string[]): Promise<{
  profilesMap: Map<string, { id: string; first_name: string | null; last_name: string | null; business_name: string | null; email: string | null }>;
  publicNameByUserId: Map<string, PublicNameRow>;
}> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { profilesMap: new Map(), publicNameByUserId: new Map() };
  }

  const [{ data: profiles }, rpcPairs] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('id, first_name, last_name, business_name, email')
      .in('id', uniqueIds),
    Promise.all(
      uniqueIds.map(async (uid) => {
        const { data, error } = await supabase.rpc('get_public_user_name', {
          user_id_param: uid,
        });
        if (error) {
          console.error('get_public_user_name (paginated listings):', error);
          return [uid, null] as const;
        }
        const row = firstRpcRow<PublicNameRow>(data);
        if (!row) return [uid, null] as const;
        return [
          uid,
          {
            first_name: row.first_name,
            last_name: row.last_name,
            business_name: row.business_name,
          } satisfies PublicNameRow,
        ] as const;
      })
    ),
  ]);

  const profilesMap = new Map((profiles || []).map((p) => [p.id, p]));
  const publicNameByUserId = new Map<string, PublicNameRow>();
  for (const pair of rpcPairs) {
    if (pair[1]) publicNameByUserId.set(pair[0], pair[1]);
  }
  return { profilesMap, publicNameByUserId };
}

function mergedSellerProfile(
  userId: string,
  profilesMap: Map<string, { id: string; first_name: string | null; last_name: string | null; business_name: string | null; email: string | null }>,
  publicNameByUserId: Map<string, PublicNameRow>
) {
  const db = profilesMap.get(userId);
  const pub = publicNameByUserId.get(userId);
  return {
    first_name: db?.first_name ?? pub?.first_name ?? null,
    last_name: db?.last_name ?? pub?.last_name ?? null,
    business_name: db?.business_name ?? pub?.business_name ?? null,
    email: db?.email ?? null,
  };
}

interface PaginatedListingsParams {
  searchTerm: string;
  filterStatus: string;
  activeTab: string;
  pageSize?: number;
}

interface PaginatedListingsResult {
  listings: any[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  goToPage: (page: number) => void;
  refreshListings: () => void;
  patchListing: (listingId: string, updates: Record<string, unknown>) => void;
}

export const usePaginatedListings = ({
  searchTerm,
  filterStatus,
  activeTab,
  pageSize = 50
}: PaginatedListingsParams): PaginatedListingsResult => {
  const [listings, setListings] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs for request cancellation and race condition prevention
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);

  const totalPages = Math.ceil(totalCount / pageSize);

  const fetchListings = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    // Prevent multiple simultaneous fetches
    if (isFetchingRef.current) {
      return;
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    isFetchingRef.current = true;

    // Only update state if component is still mounted
    if (!isMountedRef.current) {
      return;
    }

    if (!silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const offset = (currentPage - 1) * pageSize;
      const limit = pageSize;

      let allResults: any[] = [];
      let totalRecords = 0;

      // Determine which tables to query based on active tab
      const tablesToQuery = activeTab === 'all' 
        ? ['stud_listings', 'showcase_listings', 'sale_listings']
        : activeTab === 'stud'
        ? ['stud_listings']
        : activeTab === 'showcase'
        ? ['showcase_listings']
        : activeTab === 'sale'
        ? ['sale_listings']
        : activeTab === 'marketplace'
        ? ['marketplace_products']
        : [];

      // For single table queries, we can use simple pagination
      if (tablesToQuery.length === 1) {
        const tableName = tablesToQuery[0];
        let query = supabase.from(tableName as any).select('*', { count: 'exact' });

        // Filter out deleted listings (marketplace_products doesn't have is_deleted column)
        if (tableName !== 'marketplace_products') {
          query = query.or('is_deleted.is.null,is_deleted.eq.false');
        }

        // Apply search filter (marketplace_products uses `name`, not `title`)
        if (searchTerm) {
          if (tableName === 'marketplace_products') {
            query = query.ilike('name', `%${searchTerm}%`);
          } else {
            query = query.ilike('title', `%${searchTerm}%`);
          }
        }

        // Apply status filter
        if (filterStatus !== 'all') {
          // For marketplace_products, use status field
          if (tableName === 'marketplace_products') {
            if (filterStatus === 'active' || filterStatus === 'approved') {
              query = query.eq('status', 'live');
            } else if (filterStatus === 'pending') {
              query = query.eq('status', 'pending_approval');
            } else if (filterStatus === 'inactive') {
              query = query.eq('status', 'draft');
            } else if (filterStatus === 'rejected') {
              query = query.eq('status', 'draft').eq('admin_approved', false);
            } else {
              // Sale/stud-only filters (e.g. expired verification) do not apply to marketplace rows
              query = query.lt('created_at', '1970-01-01T00:00:00.000Z');
            }
          } else {
            // For stud_listings, use admin_approved field since it doesn't have status column
            const hasStatusColumn = tableName !== 'stud_listings';
            
            if (filterStatus === 'active') {
              if (hasStatusColumn) {
                query = query.in('status', [...PUBLIC_MARKETPLACE_SALE_STATUSES]);
              } else {
                query = query.eq('admin_approved', true).eq('is_published', true);
              }
            } else if (filterStatus === 'inactive') {
              query = query.eq('is_published', false);
            } else if (filterStatus === 'pending') {
              if (hasStatusColumn) {
                // Include all pending-related statuses from database
                query = query.in('status', ['pending', 'pending_review', 'pending_approval', 'draft', 'pending_re_approval']);
              } else {
                query = query.eq('admin_approved', false);
              }
            } else if (filterStatus === 'pending_re_approval') {
              if (hasStatusColumn) {
                query = query.eq('status', 'pending_re_approval');
              } else {
                // For stud_listings, pending_re_approval means admin_approved: false and is_published: false
                query = query.eq('admin_approved', false).eq('is_published', false);
              }
            } else if (filterStatus === 'rejected') {
              if (hasStatusColumn) {
                query = query.eq('status', 'rejected');
              }
            } else if (filterStatus === 'approved') {
              // Legacy filter: same as Active (live sale listings).
              if (hasStatusColumn) {
                query = query.in('status', [...PUBLIC_MARKETPLACE_SALE_STATUSES]);
              } else {
                query = query.eq('admin_approved', true);
              }
            } else if (filterStatus === 'expired_verification') {
              query = query.eq('green_tick', false).not('verification_date', 'is', null);
            }
          }
        }

        const { data, error, count } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        // Check if request was aborted
        if (abortController.signal.aborted) {
          return;
        }

        if (error) throw error;

        // Get user profiles for the listings - with error handling
        // For marketplace_products, get business owner from business_listings
        let userField: string;
        let userIds: string[] = [];
        
        if (tableName === 'marketplace_products') {
          // Get business_ids first, then get user_ids from business_listings
          const businessIds = data ? [...new Set(data.map((listing: any) => listing.business_id))] : [];
          if (businessIds.length > 0) {
            try {
              const { data: businesses, error: businessError } = await supabase
                .from('business_listings')
                .select('id, user_id, name')
                .in('id', businessIds);
              
              if (!businessError && businesses) {
                userIds = businesses.map(b => b.user_id).filter(Boolean);
              }
            } catch (error) {
              console.error('Error fetching businesses:', error);
            }
          }
          userField = 'business_id';
        } else {
          userField = tableName === 'stud_listings' ? 'user_id' : 'seller_id';
          userIds = data ? [...new Set(data.map((listing: any) => listing[userField]))] : [];
        }
        
        let profilesMap = new Map<
          string,
          { id: string; first_name: string | null; last_name: string | null; business_name: string | null; email: string | null }
        >();
        let publicNameByUserId = new Map<string, PublicNameRow>();

        if (userIds.length > 0) {
          try {
            const loaded = await loadSellerDisplayMaps(userIds);
            profilesMap = loaded.profilesMap;
            publicNameByUserId = loaded.publicNameByUserId;
          } catch (profileError) {
            console.error('Error fetching seller display data:', profileError);
          }
        }

        // For marketplace, also get business names
        let businessMap = new Map();
        if (tableName === 'marketplace_products' && data) {
          const businessIds = [...new Set(data.map((listing: any) => listing.business_id))];
          try {
            const { data: businesses } = await supabase
              .from('business_listings')
              .select('id, name, user_id')
              .in('id', businessIds);
            
            if (businesses) {
              businessMap = new Map(businesses.map(b => [b.id, b]));
            }
          } catch (error) {
            console.error('Error fetching businesses:', error);
          }
        }

        allResults = data ? data
          .filter((listing: any) => {
            // Validate that listing has required fields
            if (tableName === 'marketplace_products') {
              return listing.id && listing.name && listing.business_id && listing.created_at;
            }
            return listing.id && 
                   listing.title && 
                   (listing.seller_id || listing.user_id) &&
                   listing.created_at;
          })
          .map((listing: any) => {
          let profile;
          let sellerName;
          let type;
          
          if (tableName === 'marketplace_products') {
            const business = businessMap.get(listing.business_id);
            const userId = business?.user_id;
            profile = userId
              ? mergedSellerProfile(userId, profilesMap, publicNameByUserId)
              : null;
            sellerName = business?.name || 'Unknown Business';
            type = 'Marketplace';
          } else {
            const uid = listing[userField];
            profile = mergedSellerProfile(uid, profilesMap, publicNameByUserId);
            sellerName = sellerDisplayNameWithFallback(profile, uid);
            type = tableName === 'stud_listings' ? 'Stud' : 
                    tableName === 'showcase_listings' ? 'Showcase' : 'Sale';
          }
          
          const result = {
            ...listing, // Include all listing data
            id: listing.id,
            title: tableName === 'marketplace_products' ? listing.name : listing.title,
            seller: sellerName,
            listing_type: type, // Explicitly set listing_type
            type: type, // Also set type for compatibility
            posted: listing.created_at ? new Date(listing.created_at).toLocaleDateString() : 'N/A',
            expires: "N/A",
            // Prioritize actual database status - only compute if status is NULL/undefined
            // This ensures we use the real status from database, not a computed value
            status: listing.status != null && listing.status !== '' 
              ? listing.status 
              : (listing.admin_approved ? (listing.is_published ? "active" : "inactive") : "pending"),
            verified: listing.admin_approved,
            boosted: null,
            hasPendingEdit: !!listing.pending_edit_id,
            gold_star: listing.gold_star || false,
            green_tick: listing.green_tick || false,
            verification_date: listing.verification_date,
            business_id: listing.business_id, // For marketplace products
            business_name: tableName === 'marketplace_products' ? sellerName : undefined,
            created_at: listing.created_at // Ensure created_at is preserved
          };
          
          // Ensure listing_type is always set (override any undefined from spread)
          result.listing_type = type;
          result.type = type;
          
          return result;
        }) : [];

        totalRecords = count || 0;
      } else {
        // For multiple tables (all tab), we need to fetch from all and then paginate
        const allTableResults = await Promise.all(
          tablesToQuery.map(async (tableName) => {
            // Check if request was aborted before starting query
            if (abortController.signal.aborted) {
              return { data: [], count: 0 };
            }
            let query = supabase.from(tableName as any).select('*', { count: 'exact' });
            
            // Filter out deleted listings (marketplace_products doesn't have is_deleted)
            if (tableName !== 'marketplace_products') {
              query = query.or('is_deleted.is.null,is_deleted.eq.false');
            }
            
            // Apply search filter
            if (searchTerm) {
              if (tableName === 'marketplace_products') {
                query = query.ilike('name', `%${searchTerm}%`);
              } else {
                query = query.ilike('title', `%${searchTerm}%`);
              }
            }

            // Apply status filter
            if (filterStatus !== 'all') {
              // For marketplace_products, use status field
              if (tableName === 'marketplace_products') {
                if (filterStatus === 'active' || filterStatus === 'approved') {
                  query = query.eq('status', 'live');
                } else if (filterStatus === 'pending') {
                  query = query.eq('status', 'pending_approval');
                } else if (filterStatus === 'inactive') {
                  query = query.eq('status', 'draft');
                } else if (filterStatus === 'rejected') {
                  query = query.eq('status', 'draft').eq('admin_approved', false);
                }
              } else {
                // For stud_listings, use admin_approved field since it doesn't have status column
                const hasStatusColumn = tableName !== 'stud_listings';
                
                if (filterStatus === 'active') {
                  if (hasStatusColumn) {
                    query = query.in('status', [...PUBLIC_MARKETPLACE_SALE_STATUSES]);
                  } else {
                    query = query.eq('admin_approved', true).eq('is_published', true);
                  }
                } else if (filterStatus === 'inactive') {
                  query = query.eq('is_published', false);
                } else if (filterStatus === 'pending') {
                  if (hasStatusColumn) {
                    query = query.in('status', ['pending', 'pending_review', 'draft', 'pending_re_approval']);
                  } else {
                    query = query.eq('admin_approved', false);
                  }
                } else if (filterStatus === 'pending_re_approval') {
                  if (hasStatusColumn) {
                    query = query.eq('status', 'pending_re_approval');
                  } else {
                    // For stud_listings, pending_re_approval means admin_approved: false and is_published: false
                    query = query.eq('admin_approved', false).eq('is_published', false);
                  }
                } else if (filterStatus === 'rejected') {
                  if (hasStatusColumn) {
                    query = query.eq('status', 'rejected');
                  }
                } else if (filterStatus === 'approved') {
                  if (hasStatusColumn) {
                    query = query.in('status', [...PUBLIC_MARKETPLACE_SALE_STATUSES]);
                  } else {
                    query = query.eq('admin_approved', true);
                  }
                } else if (filterStatus === 'expired_verification') {
                  query = query.eq('green_tick', false).not('verification_date', 'is', null);
                }
              }
            }
            
            const { data, error, count } = await query.order('created_at', { ascending: false });
            
            // Check if request was aborted
            if (abortController.signal.aborted) {
              return { data: [], count: 0 };
            }
            
            if (error) throw error;
            
            const userField = tableName === 'marketplace_products' ? 'business_id' :
                             tableName === 'stud_listings' ? 'user_id' : 'seller_id';
            const type = tableName === 'marketplace_products' ? 'Marketplace' :
                        tableName === 'stud_listings' ? 'Stud' : 
                        tableName === 'showcase_listings' ? 'Showcase' : 'Sale';
            
            return {
              data: data ? data.map((listing: any) => ({ ...listing, userField, type })) : [],
              count: count || 0
            };
          })
        );

        // Check if request was aborted after Promise.all
        if (abortController.signal.aborted) {
          return;
        }

        // Combine all results
        const combinedResults = allTableResults.flatMap(({ data }) => data);

        // Sort by created_at
        combinedResults.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // Apply pagination to combined results
        const paginatedResults = combinedResults.slice(offset, offset + limit);

        // Get user profiles for paginated results - with error handling
        // Handle marketplace_products separately
        let userIds: string[] = [];
        let businessIds: string[] = [];
        
        if (paginatedResults.length > 0) {
          const marketplaceResults = paginatedResults.filter((l: any) => l.type === 'Marketplace');
          const otherResults = paginatedResults.filter((l: any) => l.type !== 'Marketplace');
          
          businessIds = marketplaceResults.map((l: any) => l.business_id).filter(Boolean);
          userIds = otherResults.map((listing: any) => listing[listing.userField]).filter(Boolean);
        }
        
        let profilesMap = new Map<
          string,
          { id: string; first_name: string | null; last_name: string | null; business_name: string | null; email: string | null }
        >();
        let publicNameByUserId = new Map<string, PublicNameRow>();
        let businessMap = new Map();
        
        // Get businesses for marketplace products
        if (businessIds.length > 0) {
          try {
            const { data: businesses } = await supabase
              .from('business_listings')
              .select('id, name, user_id')
              .in('id', businessIds);
            
            if (businesses) {
              businessMap = new Map(businesses.map(b => [b.id, b]));
              const businessUserIds = businesses.map(b => b.user_id).filter(Boolean);
              userIds = [...userIds, ...businessUserIds];
            }
          } catch (error) {
            console.error('Error fetching businesses:', error);
          }
        }
        
        if (userIds.length > 0) {
          try {
            const loaded = await loadSellerDisplayMaps(userIds);
            profilesMap = loaded.profilesMap;
            publicNameByUserId = loaded.publicNameByUserId;
          } catch (profileError) {
            console.error('Error fetching seller display data:', profileError);
          }
        }

        allResults = paginatedResults
          .filter((listing: any) => {
            // Validate that listing has required fields
            if (listing.type === 'Marketplace') {
              return listing.id && listing.name && listing.business_id && listing.created_at;
            }
            return listing.id && 
                   listing.title && 
                   listing[listing.userField] &&
                   listing.created_at;
          })
          .map((listing: any) => {
          let profile;
          let sellerName;
          
          if (listing.type === 'Marketplace') {
            const business = businessMap.get(listing.business_id);
            const userId = business?.user_id;
            profile = userId
              ? mergedSellerProfile(userId, profilesMap, publicNameByUserId)
              : null;
            sellerName = business?.name || 'Unknown Business';
          } else {
            const uid = listing[listing.userField];
            profile = mergedSellerProfile(uid, profilesMap, publicNameByUserId);
            sellerName = sellerDisplayNameWithFallback(profile, uid);
          }
          
          // Determine listing type - use listing.type if available, otherwise infer from data
          const listingType = listing.type || listing.listing_type || 
            (listing.name && listing.business_id ? 'Marketplace' : 
             listing.user_id ? 'Stud' : 'Sale');
          
          const result = {
            ...listing, // Include all listing data
            id: listing.id,
            title: listingType === 'Marketplace' ? listing.name : listing.title,
            seller: sellerName,
            listing_type: listingType, // Explicitly set listing_type
            type: listingType, // Also set type for compatibility
            posted: listing.created_at ? new Date(listing.created_at).toLocaleDateString() : 'N/A',
            expires: "N/A",
            status: listing.status || (listing.admin_approved ? (listing.is_published ? "active" : "inactive") : "pending"),
            verified: listing.admin_approved,
            boosted: null,
            hasPendingEdit: !!listing.pending_edit_id,
            gold_star: listing.gold_star || false,
            green_tick: listing.green_tick || false,
            verification_date: listing.verification_date,
            business_id: listing.business_id, // For marketplace products
            business_name: listingType === 'Marketplace' ? sellerName : undefined,
            created_at: listing.created_at // Ensure created_at is preserved
          };
          
          // Ensure listing_type is always set (override any undefined from spread)
          result.listing_type = listingType;
          result.type = listingType;
          
          return result;
        });

        totalRecords = allTableResults.reduce((sum, { count }) => sum + count, 0);
      }

      // Check if request was aborted before updating state
      if (abortController.signal.aborted || !isMountedRef.current) {
        return;
      }

      setListings(allResults);
      setTotalCount(totalRecords);
    } catch (err) {
      // Don't update state if request was aborted or component unmounted
      if (abortController.signal.aborted || !isMountedRef.current) {
        return;
      }

      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      console.error('Error fetching listings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch listings');
      toast.error('Failed to fetch listings');
    } finally {
      // Only update loading state if component is still mounted and request wasn't aborted
      if (!abortController.signal.aborted && isMountedRef.current) {
      setIsLoading(false);
      }
      isFetchingRef.current = false;
      abortControllerRef.current = null;
    }
  }, [searchTerm, filterStatus, activeTab, currentPage, pageSize]);

  useEffect(() => {
    fetchListings();

    // Cleanup function to cancel request on unmount or when dependencies change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      isFetchingRef.current = false;
    };
  }, [fetchListings]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, activeTab]);

  // Cleanup on component unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      isFetchingRef.current = false;
      // Reset loading state to prevent stuck loading UI
      setIsLoading(false);
    };
  }, []);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const refreshListings = useCallback(() => {
    fetchListings({ silent: true });
  }, [fetchListings]);

  const patchListing = useCallback((listingId: string, updates: Record<string, unknown>) => {
    setListings((prev) =>
      prev.map((listing) =>
        listing.id === listingId ? { ...listing, ...updates } : listing,
      ),
    );
  }, []);

  return {
    listings,
    totalCount,
    currentPage,
    totalPages,
    isLoading,
    error,
    goToPage,
    refreshListings,
    patchListing,
  };
};
