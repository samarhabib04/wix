
import React, { useState, useCallback, useMemo } from 'react';
import { ListingType } from './CarouselSection';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconTooltip } from '@/components/ui/tooltip';
'use client';

import { useRouter } from 'next/navigation';
import { useWishlist } from '@/hooks/use-wishlist';
import { useAuth } from '@/contexts/AuthContext';
import { useReservations } from '@/hooks/use-reservations';
import WishlistAuthModal from './WishlistAuthModal';

interface ListingCarouselProps {
  listings: ListingType[];
  tier: 'Gold' | 'Elite' | 'Premium';
  className?: string;
  opts?: any;
}

const ListingCard = React.memo(({ 
  listing, 
  isWishlisted, 
  toggleWishlist, 
  tierStyles,
  displayTier,
  onCardClick,
  hasReservations
}: { 
  listing: ListingType; 
  isWishlisted: boolean; 
  toggleWishlist: (id: number, e: React.MouseEvent) => void; 
  tierStyles: string;
  displayTier: string;
  onCardClick: (listing: ListingType) => void;
  hasReservations: boolean;
}) => {
  // Get boost glow styling based on boost type
  const getBoostGlow = () => {
    if (!listing.boostType) return '';
    
    switch(listing.boostType) {
      case 'standard':
        return 'shadow-boost-bronze';
      case 'premium':
        return 'shadow-boost-silver';
      case 'elite':
      case 'gold':
        return 'shadow-boost-gold';
      default:
        return '';
    }
  };

  const boostGlow = getBoostGlow();

  return (
    <div 
      className={cn(
        "h-full transition-all duration-150 hover:shadow-lg hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft-green focus-visible:ring-offset-2 rounded-bl-xl rounded-br-xl",
        tierStyles
      )}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${listing.title}`}
      onClick={() => onCardClick(listing)}
    >
      <Card className={cn("rounded-xl overflow-visible h-full", boostGlow)}>
        <div className="relative">
          <div className="aspect-square overflow-visible">
            <img 
              src={listing.image} 
              alt={`${listing.breed} listing preview`}
              className={cn(
                "w-full h-full object-cover media-scroll-fix",
                hasReservations && "grayscale opacity-60"
              )}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </div>
          
          {/* Reserved overlay */}
          {hasReservations && (
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
              <div className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-lg shadow-lg">
                RESERVED
              </div>
            </div>
          )}
          <button 
            className="absolute top-2 right-2 bg-white/70 p-1.5 rounded-full hover:bg-white/90 transition-colors"
            onClick={(e) => toggleWishlist(listing.id, e)}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart 
              className={cn("w-5 h-5", isWishlisted ? "fill-red-500 stroke-red-500" : "stroke-gray-600")}
            />
          </button>
        </div>

        <CardContent className="p-3">
          <div className="space-y-2">
            <h3 className="font-medium text-base line-clamp-1">
              {listing.title.length > 20 ? `${listing.title.substring(0, 20)}...` : listing.title}
            </h3>
            <p className="text-sm text-gray-600">{listing.breed}</p>
            <div className="flex justify-between items-center mt-1">
              <div className="flex items-center text-xs text-gray-500 gap-0.5">
                <MapPin className="h-3 w-3" />
                <span>{listing.location}</span>
              </div>
              
            </div>
            <div className="flex justify-between items-center pt-1">
              <p className="text-base font-semibold">€{listing.price}</p>
              <div className="flex gap-1.5 mt-[-22px]">
                {listing.hasGoldStar && (
                  <IconTooltip content="This dog has been health checked by a licensed vet.">
                    <img 
                      src="/badges/goldernstart.jpeg"
                      alt="Gold Star"
                      className="h-10 w-10 media-scroll-fix"
                      draggable={false}
                    />
                  </IconTooltip>
                )}
                {listing.hasGreenTick && (
                  <IconTooltip content="This dog has received its vaccinations from a licensed vet.">
                    <img 
                      src="/badges/greentick.jpeg"
                      alt="Green Tick"
                      className="h-10 w-10 media-scroll-fix"
                      draggable={false}
                    />
                  </IconTooltip>
                )}
              </div>
              
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

ListingCard.displayName = 'ListingCard';

const ListingCarousel: React.FC<ListingCarouselProps> = ({ listings, tier, className, opts }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [emblaApi, setEmblaApi] = useState<any>(null);
  const router = useRouter();
  const { user } = useAuth();
  const { 
    isInWishlist, 
    toggleWishlist, 
    wishlistAuthModalOpen,
    setWishlistAuthModalOpen,
    pendingWishlistItem
  } = useWishlist();
  
  const pagesCount = useMemo(() => {
    return Math.ceil(listings.length / 4);
  }, [listings.length]);

  const handleToggleWishlist = useCallback((id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const listing = listings.find(item => item.id === id);
    if (!listing) return;
    
    const itemType = listing.type || 'listing';
    toggleWishlist(id.toString(), itemType as "listing" | "showcase" | "stud", e);
  }, [toggleWishlist, listings]);

  const handleCardClick = useCallback((listing: ListingType) => {
    const listingType = listing.type || 'listing';
    
    if (listingType === 'stud') {
      router.push(`/stud/${listing.id}`);
    } else if (listingType === 'showcase') {
      router.push(`/showcase/${listing.id}`);
    } else {
      router.push(`/listing/${listing.id}`);
    }
  }, [router]);

  const tierStyles = useMemo(() => {
    switch(tier) {
      case 'Gold':
        return 'bg-amber-50 border-4 border-amber-200 rounded-bl-xl rounded-br-xl';
      default:
        return '';
    }
  }, [tier]);

  const tierBadgeStyle = useMemo(() => {
    switch(tier) {
      case 'Gold':
        return 'bg-amber-500 text-white hover:bg-amber-600';
      default:
        return '';
    }
  }, [tier]);

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

  // Default carousel options
  const defaultOpts = {
    align: 'start',
    loop: true,
    dragFree: true,
    containScroll: 'trimSnaps',
    inViewThreshold: 0.6,
    duration: 25,
  };

  // Merge default options with custom options
  const carouselOpts = { ...defaultOpts, ...opts };

  return (
    <div className={cn("relative", className)}>
      {/* Wishlist Auth Modal */}
      <WishlistAuthModal
        open={wishlistAuthModalOpen}
        onOpenChange={setWishlistAuthModalOpen}
        itemToSave={pendingWishlistItem || undefined}
      />
      
      <Carousel
        opts={carouselOpts}
        className="w-full overflow-visible"
        setApi={(api) => {
          if (api) {
            setEmblaApi(api);
            api.on('select', () => handleScroll(api));
            api.on('reInit', () => handleScroll(api));
          }
        }}
      >
        <CarouselContent className="-ml-2 md:-ml-4 overflow-visible">
          {listings.map(listing => (
            <CarouselItem 
              key={listing.id} 
              className="pl-2 md:pl-4 basis-[80%] sm:basis-[40%] md:basis-[30%] lg:basis-[22%] cursor-pointer overflow-visible"
            >
              <ListingCard 
                listing={listing}
                isWishlisted={user ? isInWishlist(listing.id.toString()) : false}
                toggleWishlist={handleToggleWishlist}
                tierStyles={tierStyles}
                displayTier={tier}
                onCardClick={handleCardClick}
                hasReservations={false}
              />
            </CarouselItem>
          ))}
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
    </div>
  );
};

export default React.memo(ListingCarousel);
