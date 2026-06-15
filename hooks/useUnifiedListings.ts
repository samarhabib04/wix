import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { PUBLIC_MARKETPLACE_SALE_STATUSES, saleListingNotExpiredOrFilter } from '@/lib/listings/public-marketplace-sale-status';
import { isShowcasePuppyAgeExpired } from '@/lib/utils/showcase-age';
import { doesBreedMatchFilter } from '@/lib/utils/breed-match';
import { resolveListingPrimaryImage } from '@/lib/utils/listing-primary-image';
import { transformSaleListingRow } from '@/lib/listings/transform-sale-listing';
import { isBoostLiveNow } from '@/lib/utils/boost-activation-window';

export interface UnifiedListing {
  id: string;
  title: string;
  breed: string;
  location: string;
  cardImage: string;
  price?: number;
  studFee?: number;
  hasGreenTick: boolean;
  hasGoldStar: boolean;
  images: string[];
  primaryImageIndex: number;
  type: 'sale' | 'stud' | 'showcase';
  boostType?: string;
  /** When boosted, used to sort newest boost first (left / top of grids). */
  boostStartTime?: string;
  sex?: string;
  size?: string;
  energy?: string;
  age?: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  // Additional fields from different types
  maleCount?: number;
  femaleCount?: number;
  dateOfBirth?: string;
  pickOfLitter?: boolean;
  currentBoostId?: string;
  // Puppy details from sale_listings
  puppyDetails?: Array<{
    id?: string;
    sex?: string;
    color?: string;
    price?: string;
    h1Code?: string;
    v1Code?: string;
    v2Code?: string;
    imageUrl?: string;
    colourCollar?: string;
    microchipNumber?: string;
  }>;
}

interface UnifiedFilters {
  breed: string;
  breedSearch: string;
  county: string;
  hasGreenTick: boolean;
  hasGoldStar: boolean;
  sex: string;
  size: string;
  energy: string;
  adType: string; // 'all', 'sale', 'stud', 'showcase'
}

export const useUnifiedListings = () => {
  return useQuery({
    queryKey: ['unified-listings', 'public'],
    queryFn: async (): Promise<UnifiedListing[]> => {

      const results = await Promise.all([
        // Fetch sale listings - only active, approved, published and visible listings
        supabase
          .from('sale_listings')
          .select('*')
          .eq('admin_approved', true)
          .eq('is_published', true)
          .not('is_deleted', 'is', true)
          .not('is_paused', 'is', true)
          .in('status', [...PUBLIC_MARKETPLACE_SALE_STATUSES])
          .or(saleListingNotExpiredOrFilter()),
        
        // Fetch stud listings
        supabase
          .from('stud_listings')
          .select('*')
          .eq('admin_approved', true)
          .eq('is_published', true),
        
        // Fetch showcase listings
        supabase
          .from('showcase_listings')
          .select('*')
          .eq('admin_approved', true)
          .eq('is_published', true)
      ]);

      const [saleResult, studResult, showcaseResult] = results;
      
      if (saleResult.error) {
        console.error('Error fetching sale listings:', saleResult.error);
        throw saleResult.error;
      }
      
      if (studResult.error) {
        console.error('Error fetching stud listings:', studResult.error);
        throw studResult.error;
      }
      
      if (showcaseResult.error) {
        console.error('Error fetching showcase listings:', showcaseResult.error);
        throw showcaseResult.error;
      }

      // Fetch all user profiles for sellers of these listings
      const allSellerIds = [
        ...(saleResult.data || []).map((l: any) => l.seller_id),
        ...(studResult.data || []).map((l: any) => l.user_id),
        ...(showcaseResult.data || []).map((l: any) => l.seller_id),
      ].filter(Boolean); // Remove null/undefined

      let userProfilesMap = new Map<string, any>();
      if (allSellerIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id, is_suspended, status')
          .in('id', [...new Set(allSellerIds)]); // Get unique IDs

        if (profilesError) {
          console.error('Error fetching seller profiles for unified listings:', profilesError);
        } else {
          profiles?.forEach(p => userProfilesMap.set(p.id, p));
        }
      }

      // Helper function to filter out suspended sellers
      const filterSuspendedSellers = (listings: any[], userField: string, userProfilesMap: Map<string, any>) => {
        return listings.filter(listing => {
          const userId = listing[userField];
          if (!userId) return true; // If no user ID, allow through (shouldn't happen for active listings)

          const userProfile = userProfilesMap.get(userId);
          if (!userProfile) return true; // If no profile, allow through (shouldn't happen)

          const isSuspended = userProfile.is_suspended === true || userProfile.status === 'suspended';
          return !isSuspended;
        });
      };

      // Fetch all active boosts
      const nowISO = new Date().toISOString();
      const now = new Date();
      const { data: boosts, error: boostsError } = await supabase
        .from('boosts')
        .select('listing_id, boost_type, listing_type, boost_start_time, boost_end_time')
        .eq('is_active', true)
        .lte('boost_start_time', nowISO)
        .or(`boost_end_time.gt.${nowISO},boost_end_time.is.null`)
        .order('boost_start_time', { ascending: false });

      if (boostsError) {
        console.error('Error fetching boosts:', boostsError);
      }

      // Newest active boost per listing wins (query is already boost_start_time DESC).
      const boostMap = new Map<string, string>();
      const boostStartMap = new Map<string, string>();
      boosts?.forEach((boost) => {
        if (!isBoostLiveNow(boost.boost_type, boost.boost_start_time, boost.boost_end_time, now)) {
          return;
        }
        const key = `${boost.listing_type}-${boost.listing_id}`;
        if (!boostMap.has(key)) {
          boostMap.set(key, boost.boost_type);
          if (boost.boost_start_time) {
            boostStartMap.set(key, boost.boost_start_time);
          }
        }
      });

      const unifiedListings: UnifiedListing[] = [];

      // Filter suspended sellers from each listing type
      const filteredSaleListings = filterSuspendedSellers(saleResult.data || [], 'seller_id', userProfilesMap);
      const filteredStudListings = filterSuspendedSellers(studResult.data || [], 'user_id', userProfilesMap);
      const filteredShowcaseListings = filterSuspendedSellers(showcaseResult.data || [], 'seller_id', userProfilesMap).filter(
        (l: { date_of_birth?: string; created_at?: string }) =>
          !isShowcasePuppyAgeExpired(l.date_of_birth, l.created_at)
      );

      // Transform sale listings (boosted rows first in boost_start_time DESC, then the rest).
      const saleById = new Map<string, UnifiedListing>();
      filteredSaleListings.forEach((listing) => {
        const boostKey = `sale-${listing.id}`;
        saleById.set(listing.id, {
          ...transformSaleListingRow(
            listing as Record<string, unknown>,
            boostMap.get(boostKey)
          ),
          boostStartTime: boostStartMap.get(boostKey),
        });
      });

      const boostedSaleIds: string[] = [];
      boosts?.forEach((boost) => {
        if (boost.listing_type !== 'sale' || !boost.listing_id) return;
        if (boostedSaleIds.includes(boost.listing_id)) return;
        if (!saleById.has(boost.listing_id)) return;
        boostedSaleIds.push(boost.listing_id);
      });

      boostedSaleIds.forEach((id) => {
        const row = saleById.get(id);
        if (row) unifiedListings.push(row);
      });

      const boostedSet = new Set(boostedSaleIds);
      [...saleById.values()]
        .filter((row) => !boostedSet.has(row.id))
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        )
        .forEach((row) => unifiedListings.push(row));

      // Transform stud listings
      filteredStudListings.forEach(listing => {
        const images = Array.isArray(listing.images) ? listing.images.filter((img: unknown): img is string => typeof img === 'string') : [];
        const breed = listing.breed_type === 'crossbreed' && listing.breed1 && listing.breed2
          ? `${listing.breed1} - ${listing.breed2}`
          : listing.breed1 || 'Mixed Breed';
        
        unifiedListings.push({
          id: listing.id,
          title: listing.title,
          breed,
          location: listing.location,
          cardImage: resolveListingPrimaryImage({
            images,
            primaryImageIndex: 0,
          }),
          studFee: listing.stud_fee ?? 0,
          hasGreenTick: listing.green_tick || false,
          hasGoldStar: listing.gold_star || false,
          images,
          primaryImageIndex: 0,
          type: 'stud',
          boostType: boostMap.get(`stud-${listing.id}`) || undefined,
          boostStartTime: boostStartMap.get(`stud-${listing.id}`),
          sex: listing.sex ?? undefined,
          description: listing.description ?? undefined,
          createdAt: listing.created_at ?? undefined,
          updatedAt: listing.updated_at ?? undefined,
          userId: listing.user_id ?? undefined,
          pickOfLitter: listing.pick_of_litter ?? undefined,
          energy: (listing as any).energy ?? undefined,
          size: (listing as any).size ?? undefined,
        });
      });

      // Transform showcase listings
      filteredShowcaseListings.forEach(listing => {
        const images = Array.isArray(listing.images) ? listing.images.filter((img: unknown): img is string => typeof img === 'string') : [];
        
        unifiedListings.push({
          id: listing.id,
          title: listing.title,
          breed: listing.breed || 'Mixed Breed',
          location: listing.location,
          cardImage: resolveListingPrimaryImage({
            images,
            primaryImageIndex: listing.primary_image_index || 0,
          }),
          hasGreenTick: false,
          hasGoldStar: false,
          images,
          primaryImageIndex: listing.primary_image_index || 0,
          type: 'showcase',
          boostType: boostMap.get(`showcase-${listing.id}`) || undefined,
          boostStartTime: boostStartMap.get(`showcase-${listing.id}`),
          sex: listing.sex ?? undefined,
          size: (listing as any).size ?? undefined,
          energy: (listing as any).energy ?? undefined,
          description: listing.description ?? undefined,
          createdAt: listing.created_at ?? undefined,
          updatedAt: listing.updated_at ?? undefined,
          userId: listing.seller_id ?? undefined
        });
      });

      // Don't sort here - sorting should happen after filtering
      // to ensure boosted listings only appear first if they match filters
      return unifiedListings;
    },
  });
};

export const filterUnifiedListings = (listings: UnifiedListing[], filters: UnifiedFilters): UnifiedListing[] => {
  const normalizedBreed = (filters.breed || '').trim().toLowerCase();
  const normalizedBreedSearch = (filters.breedSearch || '').trim().toLowerCase();
  const normalizedCounty = (filters.county || '').trim().toLowerCase();
  const normalizedSize = (filters.size || '').trim().toLowerCase();
  const normalizedEnergy = (filters.energy || '').trim().toLowerCase();
  const normalizedSex = (filters.sex || '').trim();

  const isAllBreed = normalizedBreed === '' || normalizedBreed === 'all' || normalizedBreed === 'all-breeds';
  const isAllBreedSearch = normalizedBreedSearch === '';
  const isAllCounty = normalizedCounty === '' || normalizedCounty === 'all' || normalizedCounty === 'all-counties';
  const isAllSize = normalizedSize === '' || normalizedSize === 'all' || normalizedSize === 'all sizes';
  const isAllEnergy = normalizedEnergy === '' || normalizedEnergy === 'all' || normalizedEnergy === 'all energy levels';
  const isAnySex = normalizedSex === '' || normalizedSex.toLowerCase() === 'any';

  const filtered = listings.filter(listing => {
    // Ad type filter
    if (filters.adType && filters.adType !== 'all' && listing.type !== filters.adType) {

      return false;
    }

    // Breed filter using the utility function
    if (!isAllBreed && !doesBreedMatchFilter(listing.breed, filters.breed)) {

      return false;
    }

    // Breed search using the utility function
    if (!isAllBreedSearch && !doesBreedMatchFilter(listing.breed, filters.breedSearch)) {

      return false;
    }

    // County filter (case-insensitive partial match)
    if (!isAllCounty && !listing.location.toLowerCase().includes(normalizedCounty)) {

      return false;
    }

    // Green tick filter
    if (filters.hasGreenTick && !listing.hasGreenTick) {

      return false;
    }

    // Gold star filter
    if (filters.hasGoldStar && !listing.hasGoldStar) {

      return false;
    }

    // Sex filter
    if (!isAnySex) {
      // For sale listings, check male_count or female_count
      if (listing.type === 'sale') {
        const hasMales = (listing.maleCount || 0) > 0;
        const hasFemales = (listing.femaleCount || 0) > 0;
        
        if (normalizedSex === 'Male' && !hasMales) {

          return false;
        }
        if (normalizedSex === 'Female' && !hasFemales) {

          return false;
        }
      } else {
        // For stud/showcase listings, check the sex field directly
        if (!listing.sex || listing.sex !== normalizedSex) {

          return false;
        }
      }
    }

    // Size filter (only applies to listings that have size field)
    if (!isAllSize) {
      // Only filter out if listing has size field and it doesn't match
      if (listing.size && listing.size.toLowerCase() !== normalizedSize) {

        return false;
      }
      // If listing doesn't have size field and size filter is active, 
      // exclude it (mainly affects sale listings as showcase/stud should have size)
      if (!listing.size) {

        return false;
      }
    }

    // Energy filter (only applies to listings that have energy field)
    if (!isAllEnergy) {
      // Only filter out if listing has energy field and it doesn't match
      if (listing.energy && listing.energy.toLowerCase() !== normalizedEnergy) {

        return false;
      }
      // If listing doesn't have energy field and energy filter is active, 
      // exclude it
      if (!listing.energy) {

        return false;
      }
    }

    return true;
  });
  
  return filtered;
};

export const sortUnifiedListings = (
  listings: UnifiedListing[],
  breedFilter?: string
): UnifiedListing[] => {
  const normalizedBreedFilter = (breedFilter || '').trim().toLowerCase();
  const hasBreedFilter =
    normalizedBreedFilter !== '' &&
    normalizedBreedFilter !== 'all' &&
    normalizedBreedFilter !== 'all-breeds';

  return [...listings].sort((a, b) => {
    const aHasBoost = !!a.boostType;
    const bHasBoost = !!b.boostType;

    // 1) All boosted listings before non-boosted (For Sale grid + carousels).
    if (aHasBoost && !bHasBoost) return -1;
    if (!aHasBoost && bHasBoost) return 1;

    // 2) Among boosted: newest boost_start_time first (left / page 1).
    if (aHasBoost && bHasBoost) {
      const aBoostTime = new Date(a.boostStartTime || 0).getTime();
      const bBoostTime = new Date(b.boostStartTime || 0).getTime();
      if (aBoostTime !== bBoostTime) return bBoostTime - aBoostTime;
    }

    // 3) Breed filter only within the same boost group (never pulls non-boost above boosted).
    if (hasBreedFilter) {
      const aExactMatch = a.breed.toLowerCase() === normalizedBreedFilter;
      const bExactMatch = b.breed.toLowerCase() === normalizedBreedFilter;
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;
    }

    // 4) Newest listing created_at.
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
};

/** Sale listings: boosted block first, newest boost at the front. */
export function getOrderedSaleListings(
  unifiedListings: UnifiedListing[],
  breedFilter?: string
): UnifiedListing[] {
  return sortUnifiedListings(
    unifiedListings.filter((l) => l.type === 'sale'),
    breedFilter
  );
}

/**
 * When viewing For Sale, keep the same sequence as the homepage carousel: start from
 * {@link getOrderedSaleListings}, then drop rows that fail sidebar filters (by id), so relative order matches.
 * Other ad types use plain {@link filterUnifiedListings}.
 */
export function filterUnifiedListingsPreserveSaleOrder(
  unifiedListings: UnifiedListing[],
  filters: UnifiedFilters
): UnifiedListing[] {
  if (filters.adType !== 'sale') {
    return filterUnifiedListings(unifiedListings, filters);
  }

  const allowedIds = new Set(
    filterUnifiedListings(unifiedListings, filters).map((l) => l.id)
  );
  const orderedSale = getOrderedSaleListings(unifiedListings, filters.breed);
  return orderedSale.filter((l) => allowedIds.has(l.id));
}
