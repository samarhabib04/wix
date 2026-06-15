/**
 * Centralized breed counting service for consistent breed availability calculations
 * across sale listings, showcase listings, and stud listings
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

export interface ListingData {
  saleListings: any[];
  showcaseListings: any[];
  studListings: any[];
}

export interface CountOptions {
  mode?: 'Pedigree' | 'Mixed' | 'all';
}

// Alias map to canonical breed names to improve matching accuracy
const CANONICAL_ALIAS_MAP: Record<string, string> = {
  // Common shorthand and synonyms
  'malamute': 'alaskan malamute',
  'afghan': 'afghan hound',
  'gsd': 'german shepherd',
  'german shepherd dog': 'german shepherd',
  'lab': 'labrador retriever',
  'labrador': 'labrador retriever',
  'springer spaniel': 'english springer spaniel',
  'springer': 'english springer spaniel',
  'westie': 'west highland white terrier',
  'yorkie': 'yorkshire terrier',
};

const canonicalizeBreed = (breedName: string): string => {
  if (!breedName) return '';
  const lower = breedName.toLowerCase().trim();
  return CANONICAL_ALIAS_MAP[lower] || breedName;
};

/**
 * Fetch all active listings from the database
 */
export async function fetchActiveListings(): Promise<ListingData> {
  const [saleResult, showcaseResult, studResult] = await Promise.all([
    supabase
      .from('sale_listings')
      .select('breed, breed_1, breed_2, breed_type')
      .eq('admin_approved', true)
      .eq('is_published', true)
      .eq('is_deleted', false)
      .eq('is_paused', false)
      .in('status', [...PUBLIC_MARKETPLACE_SALE_STATUSES]),
    
    supabase
      .from('showcase_listings')
      .select('breed, date_of_birth, created_at')
      .eq('admin_approved', true)
      .eq('is_published', true),
      
    supabase
      .from('stud_listings')
      .select('breed1, breed2, crossbreed_breeds')
      .eq('admin_approved', true)
      .eq('is_published', true)
  ]);

  if (saleResult.error) throw saleResult.error;
  if (showcaseResult.error) throw showcaseResult.error;
  if (studResult.error) throw studResult.error;

  return {
    saleListings: saleResult.data || [],
    showcaseListings: showcaseResult.data || [],
    studListings: studResult.data || []
  };
}

/**
 * Count breed occurrences across all listing types
 */
export function calculateBreedCounts(
  listings: ListingData,
  options: CountOptions = { mode: 'all' }
): Map<string, BreedCount> {
  const mode = options.mode || 'all';
  const breedCounts = new Map<string, BreedCount>();

  // Helper to add breed to count map with canonicalization
  const addBreedCount = (breedName: string, listingType: 'sale' | 'showcase' | 'stud') => {
    if (!breedName?.trim()) return;

    const canonical = canonicalizeBreed(breedName);
    const normalized = normalizeBreedForMatching(canonical);
    const formatted = formatBreedName(canonical);
    
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
  };

  const isPurebredSale = (listing: any): boolean => {
    const type = (listing.breed_type || '').toLowerCase();
    const isMixed = type.includes('mixed');
    return !isMixed;
  };

  // Count sale listings
  listings.saleListings.forEach((listing) => {
    if (mode === 'Pedigree') {
      if (isPurebredSale(listing)) {
        addBreedCount(listing.breed, 'sale');
      }
    } else if (mode === 'Mixed') {
      // For mixed breeds, count the crossbreed label in `breed`
      const type = (listing.breed_type || '').toLowerCase();
      if (type.includes('mixed')) {
        addBreedCount(listing.breed, 'sale');
      }
    } else {
      // all
      addBreedCount(listing.breed, 'sale');
      addBreedCount(listing.breed_1, 'sale');
      addBreedCount(listing.breed_2, 'sale');
    }
  });

  // Count showcase listings
  listings.showcaseListings.forEach((listing) => {
    if (isShowcasePuppyAgeExpired(listing.date_of_birth, listing.created_at)) return;
    if (mode === 'Pedigree') {
      if (listing.breed && listing.breed.toLowerCase() !== 'mixed breed') {
        addBreedCount(listing.breed, 'showcase');
      }
    } else {
      addBreedCount(listing.breed, 'showcase');
    }
  });

  // Count stud listings
  listings.studListings.forEach((listing) => {
    if (mode === 'Pedigree') {
      const hasCross = Array.isArray(listing.crossbreed_breeds) && listing.crossbreed_breeds.length > 0;
      const b1 = listing.breed1;
      const b2 = listing.breed2;

      // Consider as purebred if only one breed or both equal and no cross breeds listed
      if (b1 && !hasCross && (!b2 || normalizeBreedForMatching(canonicalizeBreed(b1)) === normalizeBreedForMatching(canonicalizeBreed(b2)))) {
        addBreedCount(b1, 'stud');
      }
      // Do not count breed2 or crossbreeds for Pedigree counts
    } else if (mode === 'Mixed') {
      // For mixed breeds, count crossbreed listings
      if (Array.isArray(listing.crossbreed_breeds) && listing.crossbreed_breeds.length > 0) {
        listing.crossbreed_breeds.forEach((breed: string) => addBreedCount(breed, 'stud'));
      }
      // Also count mixed breed studs based on breed_type or multiple breeds
      if (listing.breed_type?.toLowerCase().includes('mixed') || (listing.breed1 && listing.breed2 && listing.breed1 !== listing.breed2)) {
        addBreedCount(listing.breed1, 'stud');
        addBreedCount(listing.breed2, 'stud');
      }
    } else {
      // all - count everything
      addBreedCount(listing.breed1, 'stud');
      addBreedCount(listing.breed2, 'stud');
      if (Array.isArray(listing.crossbreed_breeds)) {
        listing.crossbreed_breeds.forEach((breed: string) => addBreedCount(breed, 'stud'));
      }
    }
  });

  return breedCounts;
}

/**
 * Get count for a specific breed name
 */
export function getBreedCount(breedName: string, breedCounts: Map<string, BreedCount>): number {
  const normalized = normalizeBreedForMatching(canonicalizeBreed(breedName));
  return breedCounts.get(normalized)?.totalCount || 0;
}

/**
 * Get detailed count information for a specific breed
 */
export function getBreedCountDetails(breedName: string, breedCounts: Map<string, BreedCount>): BreedCount | null {
  const normalized = normalizeBreedForMatching(canonicalizeBreed(breedName));
  return breedCounts.get(normalized) || null;
}

/**
 * Get all breed counts as an array for easier iteration
 */
export function getAllBreedCounts(breedCounts: Map<string, BreedCount>): BreedCount[] {
  return Array.from(breedCounts.values()).sort((a, b) => b.totalCount - a.totalCount);
}
