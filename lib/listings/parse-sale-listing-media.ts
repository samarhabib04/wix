export type PuppyDetailRow = {
  id?: string;
  sex?: string;
  color?: string;
  price?: string;
  imageUrl?: string;
  image_url?: string;
  [key: string]: unknown;
};

export function parsePuppyDetails(raw: unknown): PuppyDetailRow[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as PuppyDetailRow[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as PuppyDetailRow[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** `sale_listings.images` is `text[]` in Postgres — not jsonb. */
export function parseSaleListingImages(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter((img): img is string => typeof img === 'string' && img.trim() !== '');
  }
  return [];
}
