
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface PaginatedUsersParams {
  searchTerm: string;
  filterStatus: string;
  filterFraud: string;
  activeTab: string;
  pageSize?: number;
}

interface PaginatedUsersResult {
  users: any[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  goToPage: (page: number) => void;
  refreshUsers: () => void;
}

export const usePaginatedUsers = ({
  searchTerm,
  filterStatus,
  filterFraud,
  activeTab,
  pageSize = 8
}: PaginatedUsersParams): PaginatedUsersResult => {
  const [allCachedUsers, setAllCachedUsers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cacheKeyRef = useRef<string>('');

  const totalPages = Math.ceil(totalCount / pageSize);

  // Create cache key based on filters that require API calls
  const getCacheKey = useCallback(() => {
    return `${activeTab}-${filterStatus}-${filterFraud}`;
  }, [activeTab, filterStatus, filterFraud]);

  // Fetch users from API (only when filters change, not on search term change)
  const fetchUsersFromAPI = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build the base query - include status and is_suspended fields
      let query = supabase
        .from('user_profiles')
        .select('*, fraud_flags, status, is_suspended', { count: 'exact' });

      // Apply role filter (activeTab)
      if (activeTab !== 'all') {
        query = query.eq('role', activeTab);
      }

      // Apply status filter (but not search - search is done client-side)
      if (filterStatus !== 'all') {
        if (filterStatus === 'active') {
          // Active users: not suspended
          query = query.or('is_suspended.is.null,is_suspended.eq.false').or('status.is.null,status.neq.suspended');
        } else if (filterStatus === 'suspended') {
          // Suspended users: either is_suspended is true OR status is 'suspended'
          query = query.or('is_suspended.eq.true,status.eq.suspended');
        }
      }

      // Fetch all matching profiles (we'll filter by fraud_flags and search client-side)
      let allProfiles;
      let profilesError;
      
      try {
        const result = await query.order('created_at', { ascending: false });
        allProfiles = result.data;
        profilesError = result.error;
      } catch (queryError: any) {
        console.error('Query execution error:', queryError);
        profilesError = queryError;
        allProfiles = null;
      }

      if (profilesError) {
        console.error('Profiles query error details:', {
          message: profilesError.message,
          details: profilesError.details,
          hint: profilesError.hint,
          code: profilesError.code
        });
        throw profilesError;
      }

      if (!allProfiles || allProfiles.length === 0) {
        setAllCachedUsers([]);
        setIsLoading(false);
        return;
      }

      // Filter by fraud flags and status (since fraud_flags is JSON data, we can't filter in query)
      // Also apply status filter in memory if needed (for active status with complex conditions)
      const fraudFilteredProfiles = allProfiles.filter(profile => {
        // Apply fraud filter
        const fraudFlags = profile.fraud_flags || {};
        const isSuspicious = (typeof fraudFlags === 'object' && fraudFlags !== null && 'is_suspicious' in fraudFlags) 
          ? Boolean(fraudFlags.is_suspicious) 
          : false;
        
        if (filterFraud === 'suspicious' && !isSuspicious) {
          return false;
        }
        if (filterFraud === 'clean' && isSuspicious) {
          return false;
        }
        
        // Apply status filter in memory if needed (for active status with complex conditions)
        if (filterStatus === 'active') {
          const isSuspended = profile.is_suspended === true || profile.status === 'suspended';
          if (isSuspended) {
            return false;
          }
        }
        
        return true;
      });

      // Get user IDs for fetching listings count
      const userIds = fraudFilteredProfiles.map(profile => profile.id);

      // Fetch listings count for each user
      const [studListings, saleListings] = await Promise.all([
        supabase
          .from('stud_listings')
          .select('user_id')
          .in('user_id', userIds),
        supabase
          .from('sale_listings')
          .select('seller_id')
          .in('seller_id', userIds)
      ]);

      // Create listing counts map
      const listingCounts = new Map<string, number>();
      
      studListings.data?.forEach(listing => {
        const currentCount = listingCounts.get(listing.user_id) || 0;
        listingCounts.set(listing.user_id, currentCount + 1);
      });

      saleListings.data?.forEach(listing => {
        const currentCount = listingCounts.get(listing.seller_id) || 0;
        listingCounts.set(listing.seller_id, currentCount + 1);
      });

      // Transform profiles to User format
      const transformedUsers = fraudFilteredProfiles.map(profile => {
        const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
        const displayRole = profile.role || "buyer";
        const fraudFlags = profile.fraud_flags || {};
        const isSuspicious = (typeof fraudFlags === 'object' && fraudFlags !== null && 'is_suspicious' in fraudFlags) 
          ? Boolean(fraudFlags.is_suspicious) 
          : false;
        
        // Determine status from database fields
        // User is suspended if is_suspended is true OR status is 'suspended'
        const isSuspended = profile.is_suspended === true || profile.status === 'suspended';
        const userStatus = isSuspended ? "suspended" : (profile.status || "active");
        
        return {
          id: profile.id,
          name: fullName || "Anonymous User",
          email: profile.email || "No email",
          role: displayRole,
          status: userStatus,
          /** True when the account is suspended (mirrors hook logic for badges and admin actions) */
          isSuspended,
          profileComplete: profile.profile_complete === true,
          joined: profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "Unknown",
          listings: listingCounts.get(profile.id) || 0,
          avatar: profile.avatar_url || "",
          county: profile.county || "Unknown",
          fraudFlags,
          isSuspicious,
          // Store original profile data for client-side filtering
          _originalProfile: profile
        };
      });

      setAllCachedUsers(transformedUsers);
      cacheKeyRef.current = getCacheKey();
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
      toast.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, filterStatus, filterFraud, getCacheKey]);

  // Client-side filtering and pagination
  const filteredAndPaginatedUsers = useMemo(() => {
    if (!allCachedUsers || allCachedUsers.length === 0) {
      return { users: [], totalCount: 0 };
    }

    // Apply client-side search filter
    let filtered = allCachedUsers;
    
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.trim().toLowerCase();
      filtered = allCachedUsers.filter(user => {
        const nameMatch = user.name.toLowerCase().includes(searchLower);
        const emailMatch = user.email.toLowerCase().includes(searchLower);
        const idMatch = user.id.toLowerCase().includes(searchLower);
        return nameMatch || emailMatch || idMatch;
      });
    }

    // Apply pagination
    const offset = (currentPage - 1) * pageSize;
    const paginated = filtered.slice(offset, offset + pageSize);

    return {
      users: paginated,
      totalCount: filtered.length
    };
  }, [allCachedUsers, searchTerm, currentPage, pageSize]);

  // Update users and totalCount when filtered results change
  useEffect(() => {
    setUsers(filteredAndPaginatedUsers.users);
    setTotalCount(filteredAndPaginatedUsers.totalCount);
  }, [filteredAndPaginatedUsers]);

  // Fetch from API only when filters change (not search term)
  useEffect(() => {
    const currentCacheKey = getCacheKey();
    // Only fetch if cache key changed (filters changed) or cache is empty
    if (cacheKeyRef.current !== currentCacheKey || allCachedUsers.length === 0) {
      fetchUsersFromAPI();
    }
  }, [activeTab, filterStatus, filterFraud, fetchUsersFromAPI, getCacheKey, allCachedUsers.length]);

  // Reset to page 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterFraud, activeTab]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const refreshUsers = useCallback(() => {
    // Clear cache and refetch
    setAllCachedUsers([]);
    cacheKeyRef.current = '';
    fetchUsersFromAPI();
  }, [fetchUsersFromAPI]);

  return {
    users,
    totalCount,
    currentPage,
    totalPages,
    isLoading,
    error,
    goToPage,
    refreshUsers
  };
};
