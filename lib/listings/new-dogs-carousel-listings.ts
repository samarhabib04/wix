import type { UnifiedListing } from '@/hooks/useUnifiedListings';

/** Shown only in tier carousels (Gold / Puppy in My Pocket / Premium), not in New Dogs & Puppies. */
export const DEDICATED_BOOST_CAROUSEL_TIERS = ['gold', 'elite', 'premium'] as const;

export type DedicatedBoostCarouselTier = (typeof DEDICATED_BOOST_CAROUSEL_TIERS)[number];

export function isDedicatedBoostCarouselTier(
  boostType?: string | null
): boostType is DedicatedBoostCarouselTier {
  if (!boostType) return false;
  return (DEDICATED_BOOST_CAROUSEL_TIERS as readonly string[]).includes(boostType);
}

/**
 * Homepage “New Dogs & Puppies” row: non-boosted + at most one Standard boost.
 * Gold / Elite / Premium never appear here (they have their own carousels).
 */
export function filterListingsForNewDogsCarousel(
  orderedSaleListings: UnifiedListing[]
): UnifiedListing[] {
  let standardBoostIncluded = false;

  return orderedSaleListings.filter((listing) => {
    if (isDedicatedBoostCarouselTier(listing.boostType)) {
      return false;
    }

    if (listing.boostType === 'standard') {
      if (standardBoostIncluded) return false;
      standardBoostIncluded = true;
      return true;
    }

    return true;
  });
}
