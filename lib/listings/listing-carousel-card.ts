import type { ListingType } from '@/components/CarouselSection';
import type { UnifiedListing } from '@/hooks/useUnifiedListings';

const DEFAULT_CARD_IMAGE =
  'https://images.unsplash.com/photo-1605897472359-85e4b94d685d?q=80&w=800';

/** Stable numeric id for carousel cards (wishlist UI); navigation uses `originalId` (UUID). */
export function toNumericListingCardId(id: string): number {
  return Math.abs(
    id.split('').reduce((acc, char) => {
      const next = (acc << 5) - acc + char.charCodeAt(0);
      return next & next;
    }, 0)
  );
}

export function unifiedListingToCarouselCard(listing: UnifiedListing): ListingType {
  const primaryIndex = Number.isInteger(listing.primaryImageIndex)
    ? listing.primaryImageIndex
    : 0;

  return {
    id: toNumericListingCardId(listing.id),
    originalId: listing.id,
    title: listing.title,
    breed: listing.breed,
    price: listing.price || 0,
    location: listing.location,
    image: listing.cardImage || listing.images[primaryIndex] || listing.images[0] || DEFAULT_CARD_IMAGE,
    images: listing.images,
    puppyDetails: listing.puppyDetails,
    primaryImageIndex: primaryIndex,
    hasGreenTick: listing.hasGreenTick,
    hasGoldStar: listing.hasGoldStar,
    type: 'listing',
    created_at: listing.createdAt || '',
    date_of_birth: listing.dateOfBirth,
    boostType: (listing.boostType as ListingType['boostType']) || undefined,
  };
}
