// Utilities to normalize and match breed names across inconsistent data entries
export const normalizeBreedKey = (name?: string | null): string => {
  if (!name) return '';
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '');
};

// Build an ILIKE pattern that tolerates missing spaces or extra characters between words
// Example: "Alaskan Malamute" -> "%alaskan%malamute%"
export const ilikePatternForBreed = (name?: string | null): string => {
  if (!name) return '%%';
  const tokens = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return `%${tokens.join('%')}%`;
};

// Check if a breed matches a filter using fuzzy matching
export const doesBreedMatchFilter = (breed: string, filter: string): boolean => {
  if (!breed || !filter) return true;
  const normalizedBreed = normalizeBreedKey(breed);
  const normalizedFilter = normalizeBreedKey(filter);
  return normalizedBreed.includes(normalizedFilter) || normalizedFilter.includes(normalizedBreed);
};

/** Supabase `.or()` filter: breed columns + title (sellers often put the real breed in the title). */
export const saleListingBreedOrFilter = (canonicalBreed: string): string => {
  const pattern = ilikePatternForBreed(canonicalBreed);
  return `breed.ilike.${pattern},breed_1.ilike.${pattern},breed_2.ilike.${pattern},title.ilike.${pattern}`;
};

export const studListingBreedOrFilter = (canonicalBreed: string): string => {
  const pattern = ilikePatternForBreed(canonicalBreed);
  return `breed1.ilike.${pattern},breed2.ilike.${pattern},title.ilike.${pattern}`;
};
