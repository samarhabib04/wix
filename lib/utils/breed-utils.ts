
/**
 * Utility functions for handling breed name formatting and matching
 * This ensures consistent breed name display and filtering across the application
 */

import { DOG_BREEDS } from '@/data/dog-breeds';

/**
 * Maps database breed names (concatenated) to properly formatted display names
 */
const BREED_DISPLAY_MAP: Record<string, string> = {
  // Popular breeds that are often concatenated in the database
  'afghanhound': 'Afghan Hound',
  'alaskanmalamute': 'Alaskan Malamute',
  'americanbulldog': 'American Bulldog',
  'australiankelpie': 'Australian Kelpie',
  'australianshepherd': 'Australian Shepherd',
  'bassetthound': 'Basset Hound',
  'bordercollie': 'Border Collie',
  'bostonterrier': 'Boston Terrier',
  'bullterrier': 'Bull Terrier',
  'cockerspaniel': 'Cocker Spaniel',
  'englishspringerspaniel': 'English Springer Spaniel',
  'frenchbulldog': 'French Bulldog',
  'germanshepherd': 'German Shepherd',
  'goldenretriever': 'Golden Retriever',
  'greatdane': 'Great Dane',
  'irishsetter': 'Irish Setter',
  'irishwolfhound': 'Irish Wolfhound',
  'jackrussell': 'Jack Russell',
  'jackrussellterrier': 'Jack Russell Terrier',
  'labradorretriever': 'Labrador Retriever',
  'oldenglishsheepdog': 'Old English Sheepdog',
  'rhodesianridgeback': 'Rhodesian Ridgeback',
  'siberianhusky': 'Siberian Husky',
  'staffordshire': 'Staffordshire',
  'staffordshirebullterrier': 'Staffordshire Bull Terrier',
  'americanstaffordshireterrier': 'American Staffordshire Terrier',
  'westhighlandwhiteterrier': 'West Highland White Terrier',
  'yorkshireterrier': 'Yorkshire Terrier',
};

/**
 * Normalizes breed name for consistent matching across different data formats
 * This is used as the key for breed counting
 */
export const normalizeBreedForMatching = (breedName: string): string => {
  if (!breedName) return '';
  return breedName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, ''); // Remove all non-alphanumeric characters
};

/**
 * Capitalizes the first letter of each word
 */
export const capitalizeWords = (str: string): string => {
  if (!str) return str;
  return str
    .split(' ')
    .map(word => capitalizeFirstLetter(word))
    .join(' ');
};

/**
 * Capitalizes the first letter of a string
 */
export const capitalizeFirstLetter = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Formats a breed name from database format to display format
 * Handles concatenated lowercase, CamelCase, and hyphenated crossbreeds
 */
export const formatBreedName = (breed: string): string => {
  if (!breed) return '';

  // Helper to resolve a single breed token to a display name
  const resolveSingleBreed = (raw: string): string => {
    const normalized = normalizeBreedForMatching(raw);

    // 1) Direct map for common concatenated forms
    if (BREED_DISPLAY_MAP[normalized]) {
      return BREED_DISPLAY_MAP[normalized];
    }

    // 2) Look up against our canonical DOG_BREEDS by normalized match
    const fromList = DOG_BREEDS.find(
      (b) => normalizeBreedForMatching(b) === normalized
    );
    if (fromList) return fromList;

    // 3) Fallbacks: try to add spaces for CamelCase; finally capitalize words
    // Add spaces between lowercase-uppercase and also between multiple capital sequences
    const withSpaces = raw
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
    return capitalizeWords(withSpaces);
  };

  // Handle crossbreeds separated by hyphens
  if (breed.includes('-')) {
    return breed
      .split('-')
      .map((part) => resolveSingleBreed(part))
      .join(' - ');
  }

  return resolveSingleBreed(breed);
};

/** Show / marketing words often prepended in listing titles or free-text breed fields */
function stripBreedNoisePrefixes(raw: string): string {
  let t = raw.trim();
  let prev = '';
  // Repeat: "CH CH Dog" etc.
  const noise =
    /^(champion|champian|grand\s+champion|supreme\s+champion|junior\s+champion|intl\.?\s*ch\.?|gch\.?|ch\.?|sh\.?|jh\.?|cd\.?|na\.?|nf\.?)\s+|^(beautiful|gorgeous|stunning|adorable|cute|lovely|premium|quality)\s+/i;
  while (t !== prev && t.length > 0) {
    prev = t;
    t = t.replace(noise, '').trim();
  }
  return t;
}

/**
 * Finds a matching breed from the DOG_BREEDS list for filtering purposes
 * This handles the mismatch between database format and filter format
 */
export const findMatchingBreedForFilter = (databaseBreed: string): string => {
  if (!databaseBreed) return '';

  const cleaned = stripBreedNoisePrefixes(databaseBreed);

  // First format the database breed name (after stripping "Champion", "Beautiful", …)
  const formattedBreed = formatBreedName(cleaned);

  // Try to find an exact match in DOG_BREEDS
  const exactMatch = DOG_BREEDS.find(
    (breed) => breed.toLowerCase() === formattedBreed.toLowerCase()
  );

  if (exactMatch) {
    return exactMatch;
  }

  const hay = formattedBreed.toLowerCase();

  // Prefer the longest canonical breed contained in the string (e.g. "Australian Kelpie" over "Kelpie")
  const containedInHaystack = DOG_BREEDS.filter((breed) =>
    hay.includes(breed.toLowerCase())
  );
  if (containedInHaystack.length > 0) {
    containedInHaystack.sort((a, b) => b.length - a.length);
    return containedInHaystack[0];
  }

  // Fallback: haystack contained inside a breed name, or short token overlap
  const partialMatch = DOG_BREEDS.filter(
    (breed) =>
      breed.toLowerCase().includes(hay) || hay.includes(breed.toLowerCase())
  );
  if (partialMatch.length > 0) {
    partialMatch.sort((a, b) => b.length - a.length);
    return partialMatch[0];
  }

  return '';
};

/**
 * Picks the best canonical breed for quiz_breeds lookup when `breed` and `title` disagree.
 * Sellers often put the real breed in the title ("Champian Australian kelpie") but leave
 * `breed` wrong or outdated ("Airedale Terrier"). Prefer title when it clearly names a breed.
 */
export function resolveBreedForQuizLookup(listing: {
  breed?: string | null;
  title?: string | null;
}): string {
  const rawBreed = listing.breed?.trim() || '';
  const rawTitle = listing.title?.trim() || '';

  const fromField = rawBreed ? findMatchingBreedForFilter(rawBreed) : '';
  const fromTitle = rawTitle ? findMatchingBreedForFilter(rawTitle) : '';

  if (fromTitle && rawTitle) {
    const titleLower = rawTitle.toLowerCase();
    const key = fromTitle.toLowerCase();
    if (titleLower.includes(key)) {
      return fromTitle;
    }
    const words = key.split(/\s+/).filter((w) => w.length > 2);
    if (words.length > 0 && words.every((w) => titleLower.includes(w))) {
      return fromTitle;
    }
  }

  return fromField || fromTitle || '';
}

/**
 * Checks if a database breed matches a filter breed selection
 */
export const doesBreedMatchFilter = (databaseBreed: string, filterBreed: string): boolean => {
  if (!databaseBreed || !filterBreed) return false;
  
  // Format the database breed for comparison
  const formattedDatabaseBreed = formatBreedName(databaseBreed);
  
  // Check for exact match (case insensitive)
  if (formattedDatabaseBreed.toLowerCase() === filterBreed.toLowerCase()) {
    return true;
  }
  
  // Check for partial match
  if (formattedDatabaseBreed.toLowerCase().includes(filterBreed.toLowerCase()) ||
      filterBreed.toLowerCase().includes(formattedDatabaseBreed.toLowerCase())) {
    return true;
  }
  
  return false;
};

type ListingBreedFields = {
  breed?: string | null;
  breed_1?: string | null;
  breed_2?: string | null;
  breed1?: string | null;
  breed2?: string | null;
  title?: string | null;
};

/**
 * Whether a listing belongs on a breed page (e.g. quiz → /breeds/staffordshire-bull-terrier).
 * Uses title + breed fields; handles concatenated DB values and title/breed mismatches.
 */
export const listingMatchesCanonicalBreed = (
  listing: ListingBreedFields,
  canonicalBreed: string
): boolean => {
  if (!canonicalBreed?.trim()) return false;
  const target = canonicalBreed.trim().toLowerCase();

  const resolved = resolveBreedForQuizLookup({
    breed: listing.breed ?? listing.breed_1 ?? listing.breed1 ?? null,
    title: listing.title ?? null,
  });
  if (resolved && resolved.toLowerCase() === target) {
    return true;
  }

  const fields = [
    listing.breed,
    listing.breed_1,
    listing.breed_2,
    listing.breed1,
    listing.breed2,
    listing.title,
  ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

  return fields.some((field) => doesBreedMatchFilter(field, canonicalBreed));
};
