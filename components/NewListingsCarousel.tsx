'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ListingType } from './CarouselSection';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import NewListingCard from './NewListingCard';
import { useRouter } from 'next/navigation';
import { useWishlist } from '@/hooks/use-wishlist';
import { useAuth } from '@/contexts/AuthContext';
import { useReservations } from '@/hooks/use-reservations';
import WishlistAuthModal from './WishlistAuthModal';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import ViewAllListingsModal from './ViewAllListingsModal';
import { ListingPreviewModal } from './ListingPreviewModal';
import {
  DEFAULT_NEW_LISTINGS_SECTION_HEADING,
  sanitizeBoostHeadingInput,
  useBoostConfig,
} from '@/hooks/useBoostConfig';
import { getOrderedSaleListings, useUnifiedListings } from '@/hooks/useUnifiedListings';
import { filterListingsForNewDogsCarousel } from '@/lib/listings/new-dogs-carousel-listings';

// Helper function to capitalize location
const capitalizeLocation = (location: string): string => {
  if (!location) return '';
  return location
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const NewListingsCarousel: React.FC = () => {
  const boostNames = useBoostConfig();
  const newListingsHeading =
    sanitizeBoostHeadingInput(boostNames.standard) ||
    DEFAULT_NEW_LISTINGS_SECTION_HEADING;
  const [currentSlide, setCurrentSlide] = useState(0);
  const [emblaApi, setEmblaApi] = useState<any>(null);
  const [viewAllModalOpen, setViewAllModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<ListingType | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { 
    isInWishlist, 
    toggleWishlist, 
    wishlistAuthModalOpen,
    setWishlistAuthModalOpen,
    pendingWishlistItem,
    wishlistedItems
  } = useWishlist();

  const { data: unifiedListings = [], isLoading } = useUnifiedListings();

  const toNumericId = useCallback((id: string | number): number => {
    if (typeof id === 'number') return id;
    return Math.abs(id.split('').reduce((a: number, b: string) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0));
  }, []);

  const newListings = useMemo<ListingType[]>(() => {
    const saleListings = filterListingsForNewDogsCarousel(
      getOrderedSaleListings(unifiedListings)
    ).slice(0, 16);

    return saleListings.map((listing) => {
      const primaryIndex = Number.isInteger(listing.primaryImageIndex) ? listing.primaryImageIndex : 0;
      const coverImage = listing.cardImage || listing.images[primaryIndex] || listing.images[0] || 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d';
      return {
        id: toNumericId(listing.id),
        originalId: listing.id,
        title: listing.title,
        breed: listing.breed,
        price: listing.price || 0,
        location: capitalizeLocation(listing.location),
        image: coverImage,
        images: listing.images,
        puppyDetails: listing.puppyDetails,
        primaryImageIndex: primaryIndex,
        hasGoldStar: listing.hasGoldStar,
        hasGreenTick: listing.hasGreenTick,
        type: 'listing',
        created_at: listing.createdAt,
        boostType: (listing.boostType as 'standard' | 'premium' | 'elite' | 'gold' | null) || undefined,
      };
    });
  }, [unifiedListings, toNumericId]);


  const pagesCount = useMemo(() => {
    return Math.ceil(newListings.length / 4);
  }, [newListings.length]);

  const handleToggleWishlist = useCallback(async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const listing = newListings.find(item => item.id === id);
    if (!listing) return;
    
    const itemType = listing.type || 'listing';
    // Use originalId (UUID) for wishlist operations instead of hashed numeric ID
    const wishlistId = listing.originalId || listing.id;

    await toggleWishlist(wishlistId.toString(), itemType as "listing" | "showcase" | "stud", e);
  }, [toggleWishlist, newListings]);

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

  const handleModalClose = useCallback(() => {
    setPreviewModalOpen(false);
    setSelectedListing(null);
  }, []);

  const handleScroll = useCallback((api: any) => {
    if (!api) return;
    const slideIndex = api.selectedScrollSnap() || 0;
    setCurrentSlide(slideIndex);
  }, []);

  const goToSlide = useCallback((index: number) => {
    if (emblaApi) {
      emblaApi.scrollTo(index);
      setCurrentSlide(index);
    }
  }, [emblaApi]);

  if (isLoading || newListings.length === 0) {
    return null;
  }

  const headingText =
    newListingsHeading.trim() || DEFAULT_NEW_LISTINGS_SECTION_HEADING;

  return (
    <section
      id="new-dogs-puppies"
      className="mt-8 scroll-mt-28 py-12 pl-8 pr-2 sm:px-4 bg-white w-full max-w-full overflow-visible"
    >
      <div className="container mx-auto overflow-visible px-0 sm:px-4">
        <div className="mb-16 overflow-visible">
          <h2 className="text-center text-3xl md:text-4xl font-semibold text-brand-dark-green mt-4 mb-8 font-berkshire">
            {headingText}
          </h2>
          
          {/* Wishlist Auth Modal */}
          <WishlistAuthModal
            open={wishlistAuthModalOpen}
            onOpenChange={setWishlistAuthModalOpen}
            itemToSave={pendingWishlistItem || undefined}
          />

          {/* View All Listings Modal */}
          <ViewAllListingsModal
            open={viewAllModalOpen}
            onOpenChange={setViewAllModalOpen}
          />

          {/* Listing Preview Modal */}
          {selectedListing && (
            <ListingPreviewModal
              id={selectedListing.id}
              title={selectedListing.title}
              breed={selectedListing.breed}
              price={selectedListing.price}
              minPrice={selectedListing.minPrice}
              maxPrice={selectedListing.maxPrice}
              location={selectedListing.location}
              image={selectedListing.image}
              hasGoldStar={selectedListing.hasGoldStar}
              hasGreenTick={selectedListing.hasGreenTick}
              type={selectedListing.type}
              open={previewModalOpen}
              onOpenChange={handleModalClose}
              originalId={selectedListing.originalId?.toString()}
              pickOfLitter={selectedListing.pickOfLitter}
            />
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
            setApi={(api) => {
              if (api) {
                setEmblaApi(api);
                api.on('select', () => handleScroll(api));
                api.on('reInit', () => handleScroll(api));
              }
            }}
          >
            <CarouselContent className="-ml-2 md:-ml-4 overflow-visible pr-4 sm:pr-8">
              {newListings.map(listing => {
                // Use originalId (UUID) for wishlist check instead of hashed numeric ID
                const wishlistId = listing.originalId || listing.id;
                const isWishlistedStatus = user ? isInWishlist(wishlistId.toString()) : false;
                
                return (
                  <CarouselItem 
                    key={`${listing.type}-${listing.id}`} 
                    className="pl-2 md:pl-4 basis-[80%] sm:basis-[40%] md:basis-[30%] lg:basis-[22%] cursor-pointer overflow-visible touch-pan-y"
                  >
                    <NewListingCard 
                      listing={listing}
                      isWishlisted={isWishlistedStatus}
                      toggleWishlist={handleToggleWishlist}
                      onCardClick={handleCardClick}
                      hasReservations={false}
                    />
                  </CarouselItem>
                );
              })}
              
              {/* View All Arrow at the end */}
              <CarouselItem className="pl-2 md:pl-4 basis-[80%] sm:basis-[40%] md:basis-[30%] lg:basis-[22%] cursor-pointer overflow-visible">
                <div 
                  className="h-full flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors rounded-lg border-2 border-dashed border-gray-300 hover:border-brand-soft-green min-h-[300px]"
                  onClick={() => setViewAllModalOpen(true)}
                >
                  <div className="text-center">
                    <ArrowRight className="h-8 w-8 text-brand-soft-green mx-auto mb-2" />
                    <p className="text-brand-soft-green font-medium">View All</p>
                  </div>
                </div>
              </CarouselItem>
            </CarouselContent>
            <div className="flex justify-end gap-2 mt-6 mb-0">
              <CarouselPrevious className="relative -left-0 h-8 w-8" />
              <CarouselNext className="relative -right-0 h-8 w-8" />
            </div>
            <div className="flex justify-center gap-1 mt-3">
              {Array.from({ length: pagesCount }).map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.preventDefault();
                    goToSlide(index);
                  }}
                  className={`h-2 w-2 rounded-full transition-colors ${currentSlide === index ? 'bg-gray-800' : 'bg-gray-300'}`}
                  aria-label={`Go to page ${index + 1}`}
                  aria-current={currentSlide === index ? "true" : "false"}
                ></button>
              ))}
            </div>
          </Carousel>

          {/* View All Button underneath carousel */}
          <div className="flex justify-center mt-8">
            <Button 
              onClick={() => setViewAllModalOpen(true)}
              className="bg-brand-soft-green hover:bg-brand-soft-green/90 text-white px-8 py-3 text-lg"
            >
              View All
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewListingsCarousel;
