import { supabase } from '@/lib/supabase/client';
import { validateHealthCode, type HealthCodeType } from './code-validation';

export interface ListingVerificationBadges {
  green_tick: boolean;
  gold_star: boolean;
  codes_verified: boolean;
  verification_date: string | null;
}

function parsePuppyDetails(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function extractCodesFromSaleListing(listing: {
  puppy_details?: unknown;
}): { code: string; type: HealthCodeType }[] {
  return extractCodesFromPuppyDetails(parsePuppyDetails(listing.puppy_details));
}

/**
 * Validates listing health codes against `health_codes` and derives badge flags.
 * - green_tick: at least one valid V1 or V2 code was entered
 * - gold_star: at least one valid H1 code was entered
 * - codes_verified: every entered code is valid
 */
export async function resolveListingVerificationBadges(
  listingType: 'sale' | 'stud',
  listing: Record<string, unknown>,
  context?: { excludeListingId?: string; excludeListingType?: 'sale' | 'stud' },
): Promise<ListingVerificationBadges> {
  const codes =
    listingType === 'sale'
      ? extractCodesFromSaleListing(listing)
      : extractCodesFromStudListing({
          v1_cert: listing.v1_cert as string | undefined,
          v2_cert: listing.v2_cert as string | undefined,
          h1_cert: listing.h1_cert as string | undefined,
        });

  if (codes.length === 0) {
    return {
      green_tick: false,
      gold_star: false,
      codes_verified: false,
      verification_date: null,
    };
  }

  const results = await Promise.all(
    codes.map(async ({ code, type }) => ({
      type,
      isValid: await validateHealthCode(code, type, context),
    })),
  );

  const hasValidV1 = results.some((r) => r.type === 'V1' && r.isValid);
  const hasValidV2 = results.some((r) => r.type === 'V2' && r.isValid);
  const hasValidH1 = results.some((r) => r.type === 'H1' && r.isValid);
  const green_tick = hasValidV1 || hasValidV2;

  const existingVerificationDate =
    typeof listing.verification_date === 'string' ? listing.verification_date : null;

  return {
    green_tick,
    gold_star: hasValidH1,
    codes_verified: results.every((r) => r.isValid),
    verification_date: green_tick
      ? existingVerificationDate || new Date().toISOString()
      : null,
  };
}

export async function fetchListingVerificationFields(
  listingId: string,
  listingType: 'sale' | 'stud',
): Promise<Record<string, unknown> | null> {
  const tableName = listingType === 'sale' ? 'sale_listings' : 'stud_listings';
  const select =
    listingType === 'sale'
      ? 'puppy_details, verification_date, green_tick'
      : 'v1_cert, v2_cert, h1_cert, verification_date, green_tick';

  const { data, error } = await supabase
    .from(tableName as 'sale_listings' | 'stud_listings')
    .select(select)
    .eq('id', listingId)
    .maybeSingle();

  if (error || !data) {
    console.error(`Error fetching verification fields for ${listingType} listing:`, error);
    return null;
  }

  return data as unknown as Record<string, unknown>;
}

export async function getVerificationBadgeUpdatesForListing(
  listingId: string,
  listingType: 'sale' | 'stud',
): Promise<ListingVerificationBadges | null> {
  const listing = await fetchListingVerificationFields(listingId, listingType);
  if (!listing) return null;
  return resolveListingVerificationBadges(listingType, listing, {
    excludeListingId: listingId,
    excludeListingType: listingType,
  });
}

/**
 * Checks all health codes for a listing and updates codes_verified status
 * @param listingId - The ID of the listing
 * @param listingType - 'sale' or 'stud'
 * @param codes - Array of codes with their types
 * @returns Promise<boolean> - true if all codes are valid, false otherwise
 */
export async function verifyListingCodes(
  listingId: string,
  listingType: 'sale' | 'stud',
  codes: { code: string; type: HealthCodeType }[]
): Promise<boolean> {
  if (!listingId || codes.length === 0) {
    // If no codes provided, set verified to false
    await updateCodesVerifiedStatus(listingId, listingType, false);
    return false;
  }

  // Filter out empty codes
  const codesToValidate = codes.filter((c) => c.code && c.code.trim());

  if (codesToValidate.length === 0) {
    // No codes entered, set verified to false
    await updateCodesVerifiedStatus(listingId, listingType, false);
    return false;
  }

  // Validate all codes
  const validationPromises = codesToValidate.map(async ({ code, type }) => {
    return await validateHealthCode(code.trim().toUpperCase(), type, {
      excludeListingId: listingId,
      excludeListingType: listingType,
    });
  });

  const results = await Promise.all(validationPromises);
  const allValid = results.every((isValid) => isValid);

  // Update the listing's codes_verified status
  await updateCodesVerifiedStatus(listingId, listingType, allValid);

  return allValid;
}

/**
 * Updates the codes_verified field in the database
 * @param listingId - The ID of the listing
 * @param listingType - 'sale' or 'stud'
 * @param verified - Whether all codes are verified
 */
async function updateCodesVerifiedStatus(
  listingId: string,
  listingType: 'sale' | 'stud',
  verified: boolean
): Promise<void> {
  try {
    const tableName = listingType === 'sale' ? 'sale_listings' : 'stud_listings';
    
    const { error } = await supabase
      .from(tableName as any)
      .update({ codes_verified: verified })
      .eq('id', listingId);

    if (error) {
      console.error(`Error updating codes_verified for ${listingType} listing:`, error);
    } else {

    }
  } catch (error) {
    console.error(`Exception updating codes_verified for ${listingType} listing:`, error);
  }
}

/**
 * Extracts all health codes from puppy details array
 * @param puppyDetails - Array of puppy detail objects
 * @returns Array of codes with their types
 */
export function extractCodesFromPuppyDetails(puppyDetails: any[]): { code: string; type: HealthCodeType }[] {
  const codes: { code: string; type: HealthCodeType }[] = [];

  puppyDetails.forEach((puppy) => {
    if (puppy.v1Code && puppy.v1Code.trim()) {
      codes.push({ code: puppy.v1Code, type: 'V1' });
    }
    if (puppy.v2Code && puppy.v2Code.trim()) {
      codes.push({ code: puppy.v2Code, type: 'V2' });
    }
    if (puppy.h1Code && puppy.h1Code.trim()) {
      codes.push({ code: puppy.h1Code, type: 'H1' });
    }
  });

  return codes;
}

/**
 * Extracts health codes from stud listing form data
 * @param formData - Stud listing form data
 * @returns Array of codes with their types
 */
export function extractCodesFromStudListing(formData: {
  v1_cert?: string;
  v2_cert?: string;
  h1_cert?: string;
}): { code: string; type: HealthCodeType }[] {
  const codes: { code: string; type: HealthCodeType }[] = [];

  if (formData.v1_cert && formData.v1_cert.trim()) {
    codes.push({ code: formData.v1_cert, type: 'V1' });
  }
  if (formData.v2_cert && formData.v2_cert.trim()) {
    codes.push({ code: formData.v2_cert, type: 'V2' });
  }
  if (formData.h1_cert && formData.h1_cert.trim()) {
    codes.push({ code: formData.h1_cert, type: 'H1' });
  }

  return codes;
}
