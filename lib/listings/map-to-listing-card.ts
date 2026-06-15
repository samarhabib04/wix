import type { ListingType } from '@/components/CarouselSection';
import { resolveListingPrimaryImage } from '@/lib/utils/listing-primary-image';
import { parsePuppyDetails, parseSaleListingImages } from '@/lib/listings/parse-sale-listing-media';

const DEFAULT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1605897472359-85e4b94d685d?q=80&w=800';

function parseImagesArray(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter((img): img is string => typeof img === 'string' && img.trim() !== '');
  }
  return [];
}

/** Sale row → breed page card (same primary image rules as /listing/[id]). */
export function mapSaleRowToListingCard(
  listing: Record<string, unknown>,
  displayId: number
): ListingType {
  const images = parseSaleListingImages(listing.images);
  const puppyDetails = parsePuppyDetails(listing.puppy_details);
  const primaryImageIndex =
    typeof listing.primary_image_index === 'number' ? listing.primary_image_index : 0;

  return {
    id: displayId,
    originalId: String(listing.id),
    title: String(listing.title ?? ''),
    breed: String(listing.breed ?? ''),
    price:
      (listing.price as number | null) ??
      (listing.min_price as number | null) ??
      (listing.max_price as number | null) ??
      0,
    minPrice: typeof listing.min_price === 'number' ? listing.min_price : undefined,
    maxPrice: typeof listing.max_price === 'number' ? listing.max_price : undefined,
    location: String(listing.location ?? ''),
    hasGreenTick: Boolean(listing.green_tick),
    hasGoldStar: Boolean(listing.gold_star),
    image: resolveListingPrimaryImage({
      images,
      primaryImageIndex,
      puppyDetails,
      fallbackImage: DEFAULT_FALLBACK_IMAGE,
    }),
    images,
    primaryImageIndex,
    puppyDetails: puppyDetails.length > 0 ? puppyDetails : undefined,
    type: 'listing',
    created_at: listing.created_at != null ? String(listing.created_at) : '',
    date_of_birth:
      listing.date_of_birth != null ? String(listing.date_of_birth) : undefined,
  };
}

/** Stud row → breed page card. */
export function mapStudRowToListingCard(
  listing: Record<string, unknown>,
  displayId: number,
  breedLabel: string
): ListingType {
  const images = parseImagesArray(listing.images);
  const primaryImageIndex =
    typeof listing.primary_image_index === 'number' ? listing.primary_image_index : 0;

  return {
    id: displayId,
    originalId: String(listing.id),
    title: String(listing.title ?? ''),
    breed: breedLabel,
    price: (listing.stud_fee as number | null) ?? 0,
    location: String(listing.location ?? ''),
    hasGreenTick: Boolean(listing.green_tick),
    hasGoldStar: Boolean(listing.gold_star),
    pickOfLitter: Boolean(listing.pick_of_litter),
    image: resolveListingPrimaryImage({
      images,
      primaryImageIndex,
      fallbackImage: DEFAULT_FALLBACK_IMAGE,
    }),
    images,
    primaryImageIndex,
    type: 'stud',
    created_at: listing.created_at != null ? String(listing.created_at) : '',
  };
}

/** Showcase row → breed page card. */
export function mapShowcaseRowToListingCard(
  listing: Record<string, unknown>,
  displayId: number
): ListingType {
  const images = parseImagesArray(listing.images);
  const primaryImageIndex =
    typeof listing.primary_image_index === 'number' ? listing.primary_image_index : 0;

  return {
    id: displayId,
    originalId: String(listing.id),
    title: String(listing.title ?? ''),
    breed: String(listing.breed ?? ''),
    price: 0,
    location: String(listing.location ?? ''),
    hasGreenTick: false,
    hasGoldStar: false,
    image: resolveListingPrimaryImage({
      images,
      primaryImageIndex,
      fallbackImage: DEFAULT_FALLBACK_IMAGE,
    }),
    images,
    primaryImageIndex,
    type: 'showcase',
    created_at: listing.created_at != null ? String(listing.created_at) : '',
  };
}
