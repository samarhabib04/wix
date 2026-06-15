'use client';

import React, { useEffect, useCallback, useMemo } from 'react';
import { DEFAULT_BOOST_DISPLAY_NAMES, sanitizeBoostHeadingInput, useBoostConfig } from '@/hooks/useBoostConfig';
import { useBoostCarouselListings } from '@/hooks/useBoostCarouselListings';
import { ListingType } from './CarouselSection';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import NewListingCard from './NewListingCard';
import { useRouter } from 'next/navigation';
import { useWishlist } from '@/hooks/use-wishlist';
import WishlistAuthModal from '@/components/WishlistAuthModal';
import { formatBreedName } from '@/lib/utils/breed-utils';
import { BOOST_SYNC_EVENT } from '@/hooks/useBoostRealtimeSync';

// Helper function to capitalize location
const capitalizeLocation = (location: string): string => {
  if (!location) return '';
  return location
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const withFormattedBreeds = (items: ListingType[]): ListingType[] =>
  items.map((listing) => ({
    ...listing,
    breed: formatBreedName(listing.breed),
    location: capitalizeLocation(listing.location || ''),
  }));

const carouselItemKey = (listing: ListingType) =>
  String(listing.originalId ?? listing.id);

interface BoostCarouselProps {
  boostType: 'gold' | 'elite' | 'premium' | 'standard';
  title: string;
  className?: string;
  listingType?: 'sale' | 'stud' | 'showcase';
}

const BoostCarousel: React.FC<BoostCarouselProps> = ({ boostType, title, className = "", listingType = 'sale' }) => {
  const router = useRouter();
  const {
    isInWishlist,
    toggleWishlist,
    wishlistAuthModalOpen,
    setWishlistAuthModalOpen,
    pendingWishlistItem,
  } = useWishlist();

  const { data: rawListings = [], isLoading, isFetched, refetch } = useBoostCarouselListings({
    boostType,
    listingType,
    limit: 8,
  });

  const listings = useMemo(() => withFormattedBreeds(rawListings), [rawListings]);
  const hasLoadedOnce = isFetched && listings.length > 0;

  const handleToggleWishlist = useCallback(async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const listing = listings.find(item => item.id === id);
    if (!listing) return;
    
    const itemType = listing.type || 'listing';
    const wishlistId = listing.originalId || listing.id;
    
    await toggleWishlist(wishlistId.toString(), itemType as "listing" | "showcase" | "stud", e);
  }, [toggleWishlist, listings]);

  const handleCardClick = useCallback((listing: ListingType) => {
    const listingType = listing.type || 'listing';
    const listingId = listing.originalId || listing.id;
    
    if (listingType === 'stud') {
      router.push(`/stud/${listingId}`);
    } else if (listingType === 'showcase') {
      router.push(`/showcase/${listingId}`);
    } else {
      router.push(`/listing/${listingId}`);
    }
  }, [router]);

  useEffect(() => {
    const onSync = () => void refetch();
    window.addEventListener(BOOST_SYNC_EVENT, onSync);
    return () => window.removeEventListener(BOOST_SYNC_EVENT, onSync);
  }, [refetch]);

  // Helper functions - defined before early returns
  const getTitleFont = () => {
    switch (boostType) {
      case 'gold':
        return 'font-playfair font-black tracking-tight';
      case 'elite':
        return 'font-playfair font-black tracking-tight';
      case 'premium':
        return 'font-lora font-bold tracking-normal';
      case 'standard':
        return 'font-inter font-semibold tracking-wide';
      default:
        return 'font-sans';
    }
  };

  /** Admin/env can leave a tier title blank; invisible paste (ZWSP etc.) falls back to defaults. */
  const getCarouselTitle = (): string => {
    const t = sanitizeBoostHeadingInput(title);
    if (t) return t;
    switch (boostType) {
      case 'gold':
        return DEFAULT_BOOST_DISPLAY_NAMES.gold;
      case 'elite':
        return DEFAULT_BOOST_DISPLAY_NAMES.elite;
      case 'premium':
        return DEFAULT_BOOST_DISPLAY_NAMES.premium;
      default:
        return '';
    }
  };

  const getBackgroundGradient = () => {
    switch (boostType) {
      case 'gold':
        return 'bg-gradient-to-br from-yellow-50 via-white to-yellow-50/30';
      case 'elite':
        return 'bg-gradient-to-br from-purple-50 via-white to-purple-50/30';
      case 'premium':
        return 'bg-gradient-to-br from-blue-50 via-white to-blue-50/30';
      case 'standard':
        return 'bg-gradient-to-br from-orange-50 via-white to-orange-50/30';
      default:
        return 'bg-white';
    }
  };

  // Don't show loading state - parent page handles loading
  if (isLoading) {
    return null;
  }

  // Only hide if no listings AND we've never loaded any listings before
  // This prevents the section from disappearing after it's been shown
  if (listings.length === 0 && !hasLoadedOnce) {
    return null;
  }

  // If we had listings before but they're gone now, still show the section with a message
  if (listings.length === 0 && hasLoadedOnce) {
    return null;
  }

  return (
    <>
      <WishlistAuthModal
        open={wishlistAuthModalOpen}
        onOpenChange={setWishlistAuthModalOpen}
        itemToSave={pendingWishlistItem || undefined}
      />
      <section className={`w-full py-12 pl-8 pr-2 sm:px-4 bg-white overflow-visible ${className}`}>
      <div className="container mx-auto overflow-visible px-0 sm:px-4">
        <div className="mb-16 overflow-visible">
          {getCarouselTitle().trim() ? (
            <h2 className={`text-center text-3xl md:text-4xl font-semibold text-brand-dark-green mt-4 mb-8 ${getTitleFont()}`}>
              {getCarouselTitle()}
            </h2>
          ) : (
            <div className="mt-2 mb-4" aria-hidden />
          )}
          <Carousel
            opts={{
              align: 'start',
              loop: false,
              dragFree: true,
              containScroll: 'trimSnaps',
              inViewThreshold: 0.6,
              duration: 25,
              axis: 'x', // Explicitly set horizontal axis
            }}
            className="w-full overflow-visible"
            orientation="horizontal"
          >
            <CarouselContent className="-ml-2 md:-ml-4 overflow-visible pr-4 sm:pr-8">
              {listings.map((listing) => {
                const wishlistId = listing.originalId || listing.id;
                const isWishlisted = isInWishlist(wishlistId.toString());

                return (
                  <CarouselItem key={carouselItemKey(listing)} className="pl-2 md:pl-4 basis-[80%] sm:basis-[40%] md:basis-[30%] lg:basis-[22%] cursor-pointer overflow-visible touch-pan-y">
                    <NewListingCard
                      listing={listing}
                      isWishlisted={isWishlisted}
                      toggleWishlist={handleToggleWishlist}
                      onCardClick={handleCardClick}
                      hasReservations={false}
                      showBoostTier={false}
                    />
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        </div>
      </div>
    </section>
    </>
  );
};

// Unified carousel that shows all boosted listings with gold at the top
const UnifiedBoostCarousel: React.FC = () => {
  const boostNames = useBoostConfig();
  const router = useRouter();
  const {
    isInWishlist,
    toggleWishlist,
    wishlistAuthModalOpen,
    setWishlistAuthModalOpen,
    pendingWishlistItem,
  } = useWishlist();

  const { data: rawListings = [], isLoading, refetch } = useBoostCarouselListings({
    listingType: 'sale',
    limit: 50,
  });

  const listings = useMemo(() => withFormattedBreeds(rawListings), [rawListings]);

  const handleToggleWishlist = useCallback(async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const listing = listings.find(item => item.id === id);
    if (!listing) return;
    
    const itemType = listing.type || 'listing';
    const wishlistId = listing.originalId || listing.id;
    
    await toggleWishlist(wishlistId.toString(), itemType as "listing" | "showcase" | "stud", e);
  }, [toggleWishlist, listings]);

  const handleCardClick = useCallback((listing: ListingType) => {
    const listingType = listing.type || 'listing';
    const listingId = listing.originalId || listing.id;
    
    if (listingType === 'stud') {
      router.push(`/stud/${listingId}`);
    } else if (listingType === 'showcase') {
      router.push(`/showcase/${listingId}`);
    } else {
      router.push(`/listing/${listingId}`);
    }
  }, [router]);

  useEffect(() => {
    const onSync = () => void refetch();
    window.addEventListener(BOOST_SYNC_EVENT, onSync);
    return () => window.removeEventListener(BOOST_SYNC_EVENT, onSync);
  }, [refetch]);

  if (isLoading || listings.length === 0) {
    return null;
  }

  return (
    <>
      <WishlistAuthModal
        open={wishlistAuthModalOpen}
        onOpenChange={setWishlistAuthModalOpen}
        itemToSave={pendingWishlistItem || undefined}
      />
      <section className="w-full py-8">
      <div className="container mx-auto px-4 rounded-2xl bg-gradient-to-br from-yellow-50 via-white to-purple-50/30">
        <div className="text-center mb-8 pt-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Featured Listings
          </h2>
          <p className="text-gray-600">
            Hand-picked listings from {boostNames.gold}, {boostNames.elite}, and {boostNames.premium}
          </p>
        </div>

        <div className="relative pb-8">
          <Carousel
            opts={{
              align: "start",
              loop: false,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {listings.map((listing) => {
                const wishlistId = listing.originalId || listing.id;
                const isWishlisted = isInWishlist(wishlistId.toString());

                return (
                  <CarouselItem key={carouselItemKey(listing)} className="pl-2 md:pl-4 basis-[80%] sm:basis-[40%] md:basis-[30%] lg:basis-[22%]">
                    <NewListingCard
                      listing={listing}
                      isWishlisted={isWishlisted}
                      toggleWishlist={handleToggleWishlist}
                      onCardClick={handleCardClick}
                      hasReservations={false}
                      showBoostTier={false}
                    />
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        </div>
      </div>
    </section>
    </>
  );
};

// Main component - renders all 3 tier carousels
const BoostCarousels: React.FC = () => {
  const boostNames = useBoostConfig();
  return (
    <>
      <BoostCarousel boostType="gold" title={boostNames.gold} />
      <BoostCarousel boostType="elite" title={boostNames.elite} />
      <BoostCarousel boostType="premium" title={boostNames.premium} />
      {/* Standard boost removed - now appears in "New Dogs & Puppies" carousel (only one at a time) */}
    </>
  );
};

export default BoostCarousels;
