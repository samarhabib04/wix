type PuppyImageLike = {
  imageUrl?: string | null;
  image_url?: string | null;
};

interface ResolveListingPrimaryImageInput {
  images?: string[] | null;
  primaryImageIndex?: number | null;
  puppyDetails?: PuppyImageLike[] | null;
  fallbackImage?: string;
}

const DEFAULT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1605897472359-85e4b94d685d?q=80&w=800';

export function resolveListingPrimaryImage({
  images,
  primaryImageIndex,
  puppyDetails,
  fallbackImage = DEFAULT_FALLBACK_IMAGE,
}: ResolveListingPrimaryImageInput): string {
  if (Array.isArray(puppyDetails) && puppyDetails.length > 0) {
    const firstPuppy = puppyDetails[0];
    const puppyImage = firstPuppy?.imageUrl || firstPuppy?.image_url;
    if (puppyImage && puppyImage.trim() !== '') {
      return puppyImage;
    }
  }

  if (Array.isArray(images) && images.length > 0) {
    if (
      typeof primaryImageIndex === 'number' &&
      primaryImageIndex >= 0 &&
      primaryImageIndex < images.length
    ) {
      return images[primaryImageIndex];
    }
    return images[0];
  }

  return fallbackImage;
}
