
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

interface DirectoryUser {
  id: string;
  name: string;
  role: string;
  county: string;
  verified: boolean;
  avatar: string;
  bio: string;
  averageRating: number;
  reviewCount: number;
  activeListings: number;
  joinDate: string;
}

interface UserDirectoryParams {
  page?: number;
  limit?: number;
  searchQuery?: string;
  roleFilter?: string;
  countyFilter?: string;
}

interface UserDirectoryResponse {
  users: DirectoryUser[];
  totalCount: number;
  totalPages: number;
}

/** PostgREST returns jsonb as an object; normalize edge cases (string body, etc.). */
function parseDirectoryRpcPayload(raw: unknown): {
  users: unknown[];
  total_count: number;
} | null {
  let v: unknown = raw;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v) as unknown;
    } catch {
      return null;
    }
  }
  if (!v || typeof v !== "object" || Array.isArray(v)) {
    return null;
  }
  const o = v as Record<string, unknown>;
  const users = o.users;
  const totalRaw = o.total_count;
  const total =
    typeof totalRaw === "number"
      ? totalRaw
      : typeof totalRaw === "string"
        ? Number(totalRaw)
        : NaN;
  if (!Array.isArray(users) || !Number.isFinite(total)) {
    return null;
  }
  return { users, total_count: total };
}

export const useUserDirectory = (params: UserDirectoryParams = {}) => {
  const { 
    page = 1, 
    limit = 8, 
    searchQuery = "", 
    roleFilter, 
    countyFilter 
  } = params;

  return useQuery({
    // "rpc" token busts any in-memory cache from the pre-RPC directory query (same filters returned only self).
    queryKey: ["user-directory", "rpc", page, limit, searchQuery, roleFilter, countyFilter],
    queryFn: async (): Promise<UserDirectoryResponse> => {
      try {
        // SECURITY DEFINER RPC: same safe columns as public_user_profiles, but readable by any
        // authenticated role (the view inherits user_profiles RLS and only showed self for non-admins).
        const { data: directoryPayload, error: directoryError } = await supabase.rpc(
          "list_public_user_directory",
          {
            p_page: page,
            p_page_size: limit,
            p_search: searchQuery.trim() || null,
            p_role: roleFilter ? roleFilter.toLowerCase() : null,
            p_county: countyFilter ?? null,
          }
        );

        if (directoryError) {
          console.error("Error fetching user directory:", directoryError);
          throw directoryError;
        }

        const payload = parseDirectoryRpcPayload(directoryPayload);
        if (!payload) {
          console.error("Unexpected list_public_user_directory response:", directoryPayload);
          throw new Error("Invalid directory response");
        }

        const data = (payload.users ?? []) as Array<{
          id: string;
          first_name: string | null;
          last_name: string | null;
          role: string | null;
          county: string | null;
          business_name: string | null;
          created_at: string | null;
          avatar_url: string | null;
          is_admin: boolean | null;
        }>;
        const count = payload.total_count ?? 0;

        if (data.length === 0) {
          return {
            users: [],
            totalCount: count,
            totalPages: Math.ceil(count / limit),
          };
        }

        // Get user IDs to fetch listings count and reviews
        const userIds = data.map((user) => user.id).filter((id): id is string => Boolean(id));

        // Fetch active listings count and reviews with error handling
        let studListingsData: any[] = [];
        let saleListingsData: any[] = [];
        let reviewsData: any[] = [];

        try {
          // Fetch stud listings
          const studListingsResult = await supabase
            .from('stud_listings')
            .select('user_id')
            .in('user_id', userIds)
            .eq('admin_approved', true)
            .eq('is_published', true);

          studListingsData = studListingsResult.data || [];
          
          // Fetch sale listings  
          const saleListingsResult = await supabase
            .from('sale_listings')
            .select('seller_id')
            .in('seller_id', userIds)
            .eq('admin_approved', true)
            .eq('is_published', true);

          saleListingsData = saleListingsResult.data || [];

          // Fetch user reviews
          const reviewsResult = await supabase
            .from("user_reviews")
            .select("reviewed_user_id, rating")
            .in("reviewed_user_id", userIds)
            .eq("status", "approved");

          reviewsData = reviewsResult.data || [];
        } catch (listingsError) {
          console.error("Error fetching listings/reviews data:", listingsError);
          // Continue without listings data
        }

        // Create listing counts map
        const listingCounts = new Map<string, number>();
        
        // Count stud listings
        studListingsData.forEach(listing => {
          const currentCount = listingCounts.get(listing.user_id) || 0;
          listingCounts.set(listing.user_id, currentCount + 1);
        });

        // Count sale listings
        saleListingsData.forEach(listing => {
          const currentCount = listingCounts.get(listing.seller_id) || 0;
          listingCounts.set(listing.seller_id, currentCount + 1);
        });

        // Calculate average ratings and review counts for each user
        const userRatings = reviewsData.reduce((acc: Record<string, { total: number; count: number }>, review) => {
          if (!acc[review.reviewed_user_id]) {
            acc[review.reviewed_user_id] = { total: 0, count: 0 };
          }
          acc[review.reviewed_user_id].total += review.rating;
          acc[review.reviewed_user_id].count += 1;
          return acc;
        }, {});

        // Transform the data to match the expected format
        const transformedUsers: DirectoryUser[] = data.map((user: any) => {
          const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
          const displayRole = user.role === "seller" ? "Seller" : 
                             user.role === "buyer" ? "Buyer" : "User";
          
          // Create a simple bio based on role
          let bio = "";
          if (user.role === "seller") {
            bio = "Dog seller and breeder";
          } else if (user.role === "buyer") {
            bio = "Looking for the perfect dog companion";
          } else {
            bio = "Dog Quest community member";
          }

          // Format join date
          const joinDate = user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long' 
          }) : "Unknown";

          // Calculate average rating
          const userRating = userRatings[user.id];
          const averageRating = userRating ? Math.round((userRating.total / userRating.count) * 10) / 10 : 0;
          const reviewCount = userRating ? userRating.count : 0;

          // Get active listings count
          const activeListings = listingCounts.get(user.id) || 0;

          return {
            id: user.id,
            name: fullName || "Anonymous User",
            role: displayRole,
            county: user.county || "Unknown",
            verified: false,
            avatar: user.avatar_url || "",
            bio: bio,
            averageRating: averageRating,
            reviewCount: reviewCount,
            activeListings: activeListings,
            joinDate: joinDate
          };
        });
        
        return {
          users: transformedUsers,
          totalCount: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        };
      } catch (error) {
        console.error("Error in useUserDirectory:", error);
        throw error;
      }
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    retry: 1,
  });
};
