import { resolveListingPrimaryImage } from '@/lib/utils/listing-primary-image';
import type { UnifiedListing } from '@/hooks/useUnifiedListings';
import { parsePuppyDetails, parseSaleListingImages } from '@/lib/listings/parse-sale-listing-media';

export function transformSaleListingRow(
  listing: Record<string, unknown>,
  boostType?: string
): UnifiedListing {
  const images = parseSaleListingImages(listing.images);
  const puppyDetails = parsePuppyDetails(listing.puppy_details);
  const primaryImageIndex =
    typeof listing.primary_image_index === 'number' ? listing.primary_image_index : 0;

  return {
    id: String(listing.id),
    title: String(listing.title ?? ''),
    breed: String(listing.breed ?? 'Mixed Breed'),
    location: String(listing.location ?? ''),
    cardImage: resolveListingPrimaryImage({
      images,
      primaryImageIndex,
      puppyDetails,
    }),
    price:
      (listing.uniform_price as number | null) ??
      (listing.min_price as number | null) ??
      (listing.max_price as number | null) ??
      0,
    hasGreenTick: Boolean(listing.green_tick),
    hasGoldStar: Boolean(listing.gold_star),
    images,
    primaryImageIndex,
    type: 'sale',
    boostType,
    description: listing.description != null ? String(listing.description) : '',
    createdAt: listing.created_at != null ? String(listing.created_at) : '',
    updatedAt: listing.updated_at != null ? String(listing.updated_at) : '',
    userId: listing.seller_id != null ? String(listing.seller_id) : '',
    maleCount: typeof listing.male_count === 'number' ? listing.male_count : undefined,
    femaleCount: typeof listing.female_count === 'number' ? listing.female_count : undefined,
    dateOfBirth: listing.date_of_birth != null ? String(listing.date_of_birth) : undefined,
    currentBoostId:
      listing.current_boost_id != null ? String(listing.current_boost_id) : undefined,
    puppyDetails: puppyDetails.length > 0 ? puppyDetails : undefined,
    energy: listing.energy != null ? String(listing.energy) : undefined,
    size: listing.size != null ? String(listing.size) : undefined,
  };
}
