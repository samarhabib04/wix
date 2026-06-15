import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { ListingType } from '@/components/CarouselSection';
import { PUBLIC_MARKETPLACE_SALE_STATUSES } from '@/lib/listings/public-marketplace-sale-status';
import { transformSaleListingRow } from '@/lib/listings/transform-sale-listing';
import { unifiedListingToCarouselCard } from '@/lib/listings/listing-carousel-card';
import type { UnifiedListing } from '@/hooks/useUnifiedListings';
import { isBoostLiveNow } from '@/lib/utils/boost-activation-window';

export type BoostCarouselTier = 'gold' | 'elite' | 'premium' | 'standard';

const TIER_RANK: Record<BoostCarouselTier, number> = {
  gold: 0,
  elite: 1,
  premium: 2,
  standard: 3,
};

interface UseBoostCarouselListingsOptions {
  /** When set, only this tier. When omitted, all tiers (gold first, then newest boost within tier). */
  boostType?: BoostCarouselTier;
  listingType?: 'sale' | 'stud' | 'showcase';
  limit?: number;
}

async function fetchBoostCarouselListings(
  options: UseBoostCarouselListingsOptions
): Promise<ListingType[]> {
  const { boostType, listingType = 'sale', limit = 8 } = options;

  if (listingType !== 'sale') {
    // Stud/showcase boost carousels are rare; sale-only path matches production usage.
    return [];
  }

  const nowISO = new Date().toISOString();
  const now = new Date();
  let boostsQuery = supabase
    .from('boosts')
    .select('listing_id, boost_type, boost_start_time, boost_end_time, listing_type')
    .eq('is_active', true)
    .eq('listing_type', 'sale')
    .lte('boost_start_time', nowISO)
    .or(`boost_end_time.gt.${nowISO},boost_end_time.is.null`);

  if (boostType) {
    boostsQuery = boostsQuery.eq('boost_type', boostType);
  }

  const { data: boosts, error: boostsError } = await boostsQuery.order('boost_start_time', {
    ascending: false,
  });

  if (boostsError) throw boostsError;
  if (!boosts?.length) return [];

  const liveBoosts = boosts.filter((b) =>
    isBoostLiveNow(b.boost_type, b.boost_start_time, b.boost_end_time, now),
  );
  if (!liveBoosts.length) return [];

  const orderedListingIds: string[] = [];
  const seenIds = new Set<string>();
  for (const b of liveBoosts) {
    if (!b.listing_id || seenIds.has(b.listing_id)) continue;
    seenIds.add(b.listing_id);
    orderedListingIds.push(b.listing_id);
  }

  const { data: rows, error: listingsError } = await supabase
    .from('sale_listings')
    .select('*')
    .in('id', orderedListingIds)
    .eq('admin_approved', true)
    .eq('is_published', true)
    .not('is_deleted', 'is', true)
    .not('is_paused', 'is', true)
    .in('status', [...PUBLIC_MARKETPLACE_SALE_STATUSES]);

  if (listingsError) throw listingsError;

  const rowById = new Map((rows || []).map((row) => [row.id, row]));
  const boostByListingId = new Map<string, (typeof liveBoosts)[number]>();
  for (const b of liveBoosts) {
    if (b.listing_id && !boostByListingId.has(b.listing_id)) {
      boostByListingId.set(b.listing_id, b);
    }
  }

  let unified: UnifiedListing[] = [];

  for (const listingId of orderedListingIds) {
    const row = rowById.get(listingId);
    const boost = boostByListingId.get(listingId);
    if (!row || !boost?.boost_type) continue;

    unified.push(
      transformSaleListingRow(row as Record<string, unknown>, boost.boost_type)
    );
  }

  const sortByNewestBoost = (a: UnifiedListing, b: UnifiedListing) => {
    const aStart = boostByListingId.get(a.id)?.boost_start_time || '';
    const bStart = boostByListingId.get(b.id)?.boost_start_time || '';
    return new Date(bStart).getTime() - new Date(aStart).getTime();
  };

  if (boostType) {
    unified = [...unified].sort(sortByNewestBoost);
  } else {
    unified = [...unified].sort((a, b) => {
      const aRank = TIER_RANK[(a.boostType as BoostCarouselTier) || 'standard'] ?? 99;
      const bRank = TIER_RANK[(b.boostType as BoostCarouselTier) || 'standard'] ?? 99;
      if (aRank !== bRank) return aRank - bRank;
      return sortByNewestBoost(a, b);
    });
  }

  return unified.slice(0, limit).map(unifiedListingToCarouselCard);
}

export function useBoostCarouselListings(options: UseBoostCarouselListingsOptions) {
  const { boostType, listingType = 'sale', limit = 8 } = options;

  return useQuery({
    queryKey: ['boost-carousel-listings', boostType ?? 'all', listingType, limit],
    queryFn: () => fetchBoostCarouselListings({ boostType, listingType, limit }),
    staleTime: 30 * 1000,
    refetchOnMount: 'always',
  });
}
