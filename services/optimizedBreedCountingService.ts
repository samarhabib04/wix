/**
 * Optimized breed counting service that uses database caching for better performance
 */

import { supabase } from "@/lib/supabase/client";
import { PUBLIC_MARKETPLACE_SALE_STATUSES } from "@/lib/listings/public-marketplace-sale-status";
import { formatBreedName, normalizeBreedForMatching } from "@/lib/utils/breed-utils";
import { isShowcasePuppyAgeExpired } from "@/lib/utils/showcase-age";

export interface BreedCount {
  breedName: string;
  saleCount: number;
  showcaseCount: number;
  studCount: number;
  totalCount: number;
}

export interface OptimizedCountOptions {
  mode?: 'Pedigree' | 'Mixed' | 'all';
  useCache?: boolean;
}

// Cache for storing breed counts in memory
let breedCountsCache: Map<string, BreedCount> | null = null;
let lastCacheUpdate: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get breed counts using database cache for optimal performance
 */
export async function getOptimizedBreedCounts(
  options: OptimizedCountOptions = { mode: 'all', useCache: true }
): Promise<Map<string, BreedCount>> {
  const { mode = 'all', useCache = true } = options;
  
  // Check if we can use memory cache
  if (useCache && breedCountsCache && (Date.now() - lastCacheUpdate < CACHE_DURATION)) {
    return filterBreedCountsByMode(breedCountsCache, mode);
  }

  // Note: breed_counts_cache table doesn't exist yet, so we skip the database cache
  // and go straight to fresh queries for now

  // Fallback to direct database queries if cache is not available
  return await getFreshBreedCounts(mode);
}

/**
 * Filter breed counts by mode (Pedigree, Mixed, or all)
 * Note: This is only used when fetching from database cache, which currently doesn't exist
 * The fallback getFreshBreedCounts already handles filtering properly
 */
function filterBreedCountsByMode(
  breedCounts: Map<string, BreedCount>, 
  mode: 'Pedigree' | 'Mixed' | 'all'
): Map<string, BreedCount> {
  return breedCounts;
}

/**
 * Get fresh breed counts directly from database (fallback method)
 */
async function getFreshBreedCounts(mode: 'Pedigree' | 'Mixed' | 'all'): Promise<Map<string, BreedCount>> {
  const breedCounts = new Map<string, BreedCount>();

  try {
    // Get sale listings (count all admin_approved and published listings)
    const { data: saleListings } = await supabase
      .from('sale_listings')
      .select('breed, breed_1, breed_2, breed_type')
      .eq('admin_approved', true)
      .eq('is_published', true)
      .eq('is_deleted', false)
      .eq('is_paused', false)
      .in('status', [...PUBLIC_MARKETPLACE_SALE_STATUSES]);

    // Get showcase listings
    const { data: showcaseListings } = await supabase
      .from('showcase_listings')
      .select('breed, date_of_birth, created_at')
      .eq('admin_approved', true)
      .eq('is_published', true);

    // Get stud listings
    const { data: studListings } = await supabase
      .from('stud_listings')
      .select('breed1, breed2, crossbreed_breeds, breed_type')
      .eq('admin_approved', true)
      .eq('is_published', true);

    // Process each listing type
    if (saleListings) {
      saleListings.forEach(listing => {
        if (mode === 'all') {
          addBreedToCount(breedCounts, listing.breed, 'sale');
          addBreedToCount(breedCounts, listing.breed_1, 'sale');
          addBreedToCount(breedCounts, listing.breed_2, 'sale');
        } else if (mode === 'Pedigree') {
          const isPurebred = !listing.breed_type?.toLowerCase().includes('mixed');
          if (isPurebred) {
            addBreedToCount(breedCounts, listing.breed, 'sale');
          }
        } else if (mode === 'Mixed') {
          const isMixed = listing.breed_type?.toLowerCase().includes('mixed');
          if (isMixed) {
            addBreedToCount(breedCounts, listing.breed, 'sale');
          }
        }
      });
    }

    if (showcaseListings) {
      showcaseListings.forEach(listing => {
        if (isShowcasePuppyAgeExpired(listing.date_of_birth, listing.created_at)) return;
        if (mode === 'all') {
          addBreedToCount(breedCounts, listing.breed, 'showcase');
        } else if (mode === 'Pedigree') {
          // Only count as pedigree if it's not explicitly a mixed breed
          const isMixed = listing.breed?.toLowerCase().includes('mixed') || listing.breed?.toLowerCase().includes('cross');
          if (!isMixed) {
            addBreedToCount(breedCounts, listing.breed, 'showcase');
          }
        } else if (mode === 'Mixed') {
          // Only count as mixed if it contains 'mixed' or 'cross'
          const isMixed = listing.breed?.toLowerCase().includes('mixed') || listing.breed?.toLowerCase().includes('cross');
          if (isMixed) {
            addBreedToCount(breedCounts, listing.breed, 'showcase');
          }
        }
      });
    }

    if (studListings) {
      studListings.forEach(listing => {
        if (mode === 'all') {
          addBreedToCount(breedCounts, listing.breed1, 'stud');
          addBreedToCount(breedCounts, listing.breed2, 'stud');
          if (Array.isArray(listing.crossbreed_breeds)) {
            listing.crossbreed_breeds.forEach(breed => addBreedToCount(breedCounts, breed, 'stud'));
          }
        } else if (mode === 'Pedigree') {
          const hasCross = Array.isArray(listing.crossbreed_breeds) && listing.crossbreed_breeds.length > 0;
          if (!hasCross && listing.breed1) {
            addBreedToCount(breedCounts, listing.breed1, 'stud');
          }
        }
      });
    }

  } catch (error) {
    console.error('Error fetching fresh breed counts:', error);
  }

  return breedCounts;
}

/**
 * Add breed to count map
 */
function addBreedToCount(
  breedCounts: Map<string, BreedCount>,
  breedName: string | null,
  listingType: 'sale' | 'showcase' | 'stud'
) {
  if (!breedName?.trim()) return;

  const normalized = normalizeBreedForMatching(breedName);
  const formatted = formatBreedName(breedName);

  if (!breedCounts.has(normalized)) {
    breedCounts.set(normalized, {
      breedName: formatted,
      saleCount: 0,
      showcaseCount: 0,
      studCount: 0,
      totalCount: 0
    });
  }

  const count = breedCounts.get(normalized)!;
  if (listingType === 'sale') count.saleCount++;
  else if (listingType === 'showcase') count.showcaseCount++;
  else if (listingType === 'stud') count.studCount++;
  
  count.totalCount = count.saleCount + count.showcaseCount + count.studCount;

}

/**
 * Get count for a specific breed using optimized method
 */
export async function getOptimizedBreedCount(breedName: string, mode: 'Pedigree' | 'Mixed' | 'all' = 'all'): Promise<number> {
  try {
    // Try database function first for single breed lookup
    const { data, error } = await supabase
      .rpc('get_breed_count_from_cache', { search_breed: breedName });
    
    if (!error && data !== null) {
      return data;
    }
  } catch (error) {
  }

  // Fallback to getting all counts
  const breedCounts = await getOptimizedBreedCounts({ mode });
  const normalized = normalizeBreedForMatching(breedName);
  return breedCounts.get(normalized)?.totalCount || 0;
}

/**
 * Invalidate the memory cache (useful when we know data has changed)
 */
export function invalidateBreedCountsCache(): void {
  breedCountsCache = null;
  lastCacheUpdate = 0;
}

/**
 * Get all breed counts as an array for easier iteration
 */
export function getAllOptimizedBreedCounts(breedCounts: Map<string, BreedCount>): BreedCount[] {
  return Array.from(breedCounts.values()).sort((a, b) => b.totalCount - a.totalCount);
}
