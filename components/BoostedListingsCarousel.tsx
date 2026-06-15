'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
import { useBoostCarouselListings } from '@/hooks/useBoostCarouselListings';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import NewListingCard from '@/components/NewListingCard';
import { useRouter } from 'next/navigation';
import { useWishlist } from '@/hooks/use-wishlist';
import WishlistAuthModal from '@/components/WishlistAuthModal';
import { formatBreedName } from '@/lib/utils/breed-utils';
import type { ListingType } from '@/components/CarouselSection';
import { BOOST_SYNC_EVENT } from '@/hooks/useBoostRealtimeSync';

const BoostedListingsCarousel: React.FC = () => {
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
    limit: 24,
  });

  const listings = useMemo(
    () =>
      rawListings.map((listing) => ({
        ...listing,
        breed: formatBreedName(listing.breed),
        location: (listing.location || '').replace(/\b\w/g, (c: string) => c.toUpperCase()),
      })),
    [rawListings]
  );

  const handleToggleWishlist = useCallback(async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const listing = listings.find(item => item.id === id);
    if (!listing) return;

    const itemType = listing.type || 'listing';
    const wishlistId = listing.originalId || listing.id;

    await toggleWishlist(wishlistId.toString(), itemType as 'listing' | 'showcase' | 'stud', e);
  }, [toggleWishlist, listings]);

  const handleCardClick = useCallback((listing: ListingType) => {
    const type = listing.type || 'listing';
    const id = listing.originalId || listing.id;
    if (type === 'stud') router.push(`/stud/${id}`);
    else if (type === 'showcase') router.push(`/showcase/${id}`);
    else router.push(`/listing/${id}`);
  }, [router]);

  useEffect(() => {
    const onSync = () => void refetch();
    window.addEventListener(BOOST_SYNC_EVENT, onSync);
    return () => window.removeEventListener(BOOST_SYNC_EVENT, onSync);
  }, [refetch]);

  if (isLoading || listings.length === 0) return null;

  return (
    <>
      <WishlistAuthModal
        open={wishlistAuthModalOpen}
        onOpenChange={setWishlistAuthModalOpen}
        itemToSave={pendingWishlistItem || undefined}
      />
      <section className="w-full py-8">
      <div className="container mx-auto px-4 rounded-2xl bg-gradient-to-br from-amber-50 via-white to-amber-50/30">
        <div className="text-center mb-8 pt-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Featured Boosted Listings</h2>
          <p className="text-gray-600">Hand-picked boosted puppies and studs</p>
        </div>

        <div className="relative pb-8">
          <Carousel
            opts={{
              align: 'start',
              loop: false,
              dragFree: true,
              containScroll: 'trimSnaps',
              slidesToScroll: 'auto',
              breakpoints: {
                '(max-width: 640px)': { dragFree: true, containScroll: 'keepSnaps' },
                '(max-width: 768px)': { slidesToScroll: 1 },
                '(max-width: 1024px)': { slidesToScroll: 2 },
              },
            }}
            className="w-full touch-pan-x"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {listings.map((listing) => {
                const wishlistId = listing.originalId || listing.id;
                const wishlisted = isInWishlist(wishlistId.toString());
                return (
                  <CarouselItem key={String(listing.originalId ?? listing.id)} className="pl-2 md:pl-4 basis-[80%] sm:basis-[40%] md:basis-[30%] lg:basis-[22%] cursor-pointer overflow-visible touch-pan-y">
                    <NewListingCard
                      listing={listing}
                      isWishlisted={wishlisted}
                      toggleWishlist={handleToggleWishlist}
                      onCardClick={handleCardClick}
                      hasReservations={false}
                      showBoostTier={true}
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

export default BoostedListingsCarousel;
