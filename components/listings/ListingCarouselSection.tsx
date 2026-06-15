import React, { useState, useMemo, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { useWishlist } from '@/hooks/use-wishlist';
import { useReservations } from '@/hooks/use-reservations';
import WishlistAuthModal from '@/components/WishlistAuthModal';
import { formatBreedName, capitalizeFirstLetter, capitalizeWords } from '@/lib/utils/breed-utils';

// Define types for media items
export type MediaItem = string | {
  type: 'image' | 'video';
  src: string;
  isGeneralImage?: boolean;
  puppyIndex?: number;
  puppyData?: any;
};

interface ListingCarouselSectionProps {
  title: string;
  images: MediaItem[];
  video?: string;
  isWishListed: boolean;
  onWishlistToggle: () => void;
  itemType?: "showcase" | "listing" | "stud"; // Add item type prop
  onImageChange?: (index: number) => void; // New prop for image change callback
  listingId?: string; // Add listing ID for reservation checking
  badge?: React.ReactNode; // Optional badge to display on the carousel
  /** When true, do not render the built-in modal — parent should render WishlistAuthModal with the same useWishlist instance as onWishlistToggle. */
  suppressWishlistAuthModal?: boolean;
}

const ListingCarouselSection: React.FC<ListingCarouselSectionProps> = ({
  title,
  images,
  video,
  isWishListed,
  onWishlistToggle,
  itemType = "listing", // Default to listing type
  onImageChange,
  listingId,
  badge,
  suppressWishlistAuthModal = false,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const { wishlistAuthModalOpen, setWishlistAuthModalOpen, pendingWishlistItem } = useWishlist();
  
  // Fetch reservations for this listing
  const { data: reservations = [] } = useReservations(listingId || '');
  
  // Helper function to check if a puppy is reserved
  const isPuppyReserved = (puppyData: any) => {
    if (!puppyData?.collar_code || !reservations.length) return false;
    
    return reservations.some(reservation => 
      reservation.puppy_collar_color && 
      reservation.puppy_collar_color.toLowerCase() === puppyData.collar_code.toLowerCase()
    );
  };

  // Process media items to ensure they're all in the correct format
  const mediaItems = useMemo(() => {
    
    return images.map((item): { type: 'image' | 'video'; src: string; isGeneralImage?: boolean; puppyIndex?: number; puppyData?: any } => {
      if (typeof item === 'string') {
        return { type: 'image', src: item, isGeneralImage: true };
      }
      return item;
    });
  }, [images]);

  const handleThumbnailClick = (index: number) => {
    if (carouselApi) {
      carouselApi.scrollTo(index);
    }
    setActiveIndex(index);
    // Call the callback if provided
    if (onImageChange) {
      onImageChange(index);
    }
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onWishlistToggle();
  };

  useEffect(() => {
    if (!carouselApi) {
      return;
    }

    carouselApi.on("select", () => {
      const newIndex = carouselApi.selectedScrollSnap();
      setActiveIndex(newIndex);
      // Call the callback if provided
      if (onImageChange) {
        onImageChange(newIndex);
      }
    });
  }, [carouselApi, onImageChange]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    if (mediaItems[activeIndex]?.type === "video") {
      video.play().catch(err => {
      });
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [activeIndex, mediaItems]);


  return (
    <div className="relative">
      {/* Wishlist Auth Modal — optional when parent owns modal + wishlist actions */}
      {!suppressWishlistAuthModal && (
        <WishlistAuthModal
          open={wishlistAuthModalOpen}
          onOpenChange={setWishlistAuthModalOpen}
          itemToSave={pendingWishlistItem || undefined}
        />
      )}
      
      {/* Badge - positioned absolutely at top left, flush with image container */}
      {badge && (
        <div className="absolute top-0 left-0 z-20 pointer-events-none" style={{ marginTop: '-1px', marginLeft: '-1px' }}>
          <div className="pointer-events-auto">
            {badge}
          </div>
        </div>
      )}
      
      {/* Wishlist button - positioned absolutely at top right of carousel */}
      <button 
        onClick={handleWishlistClick}
        className="absolute top-3 right-3 z-10 bg-white rounded-full p-2 shadow-md"
        aria-label={isWishListed ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart className={cn("w-5 h-5 transition-colors", 
          isWishListed ? "fill-red-500 text-red-500" : "text-gray-400")} />
      </button>

      {/* Main Carousel - Responsive full width images */}
      <Carousel
        className="w-full max-w-full"
        opts={{
          loop: true,
          startIndex: activeIndex,
          skipSnaps: false, // Fix mobile carousel skipping images
          dragFree: false // Ensure proper snapping on mobile
        }}
        setApi={setCarouselApi}
      >
        <CarouselContent>
          {mediaItems.map((item, index) => (
            <CarouselItem key={index} className="min-w-0">
              <div className="rounded-lg relative bg-muted rounded-lg overflow-hidden" style={{ aspectRatio: '1/1' }}>
                  {item.type === 'video' ? (
                    <video
                      ref={index === activeIndex ? videoRef : null}
                      src={item.src}
                      controls
                      muted
                      playsInline
                      className="w-full h-full object-contain rounded-lg block bg-white"
                      aria-label={`Video of ${title}`}
                      draggable={false}
                    />
                  ) : (
                     <>
                       <img
                          src={item.src}
                          alt={`${title} - Image ${index}`}
                          className={cn(
                            "w-full h-full object-cover rounded-lg transition-all duration-300 media-scroll-fix block bg-white",
                            !item.isGeneralImage && item.puppyData && isPuppyReserved(item.puppyData) && "grayscale opacity-60"
                          )}
                          draggable={false}
                        />
                       
                       {/* Reserved overlay */}
                       {!item.isGeneralImage && item.puppyData && isPuppyReserved(item.puppyData) && (
                         <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded-lg">
                           <div className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-lg shadow-lg">
                             RESERVED
                           </div>
                         </div>
                       )}
                       
                        {/* Puppy image overlays */}
                        {!item.isGeneralImage && item.puppyData && (
                          <div className="absolute inset-0 pointer-events-none">
                            {/* Overlays container for even spacing */}
                            <div className="absolute bottom-2 left-2 right-2 flex justify-end items-end">
                              {/* Collar code overlay */}
                              {item.puppyData.collar_code && (
                                <div className={cn(
                                  "bg-gray-600 border border-white bg-opacity-75 text-white px-2 py-1 md:px-3 md:py-1.5 rounded text-sm lg:text-2xl font-medium",
                                  isPuppyReserved(item.puppyData) && "opacity-75"
                                )}>
                                  Collar: {capitalizeWords(item.puppyData.collar_code)}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2" />
        <CarouselNext className="right-2" />
      </Carousel>

      {/* Thumbnails Row */}
      <div className="flex justify-center mt-1 gap-2 overflow-x-auto pb-2 hide-scrollbar">
        {mediaItems.map((item, index) => (
          <button 
            key={index} 
            className={cn(
              "flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 relative",
              activeIndex === index ? "border-brand-dark-green" : "border-transparent"
            )}
            onClick={() => handleThumbnailClick(index)}
            aria-label={`View ${item.type} ${index + 1}`}
          >
            {item.type === 'video' ? (
              <div className="relative w-full h-full">
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                    <div className="w-0 h-0 border-l-4 border-l-brand-dark-green border-t-2 border-t-transparent border-b-2 border-b-transparent ml-0.5"></div>
                  </div>
                </div>
                <video 
                  src={item.src}
                  className="w-full h-full object-cover"
                  preload="metadata"
                  draggable={false}
                />
              </div>
            ) : (
               <>
                 <img 
                   src={item.src} 
                   alt={`Thumbnail ${index + 1}`}
                   className={cn(
                     "w-full h-full object-cover transition-all duration-300",
                     !item.isGeneralImage && item.puppyData && isPuppyReserved(item.puppyData) && "grayscale opacity-60"
                   )}
                   draggable={false}
                 />
                 {/* Reserved indicator for thumbnails */}
                 {!item.isGeneralImage && item.puppyData && isPuppyReserved(item.puppyData) && (
                   <div className="absolute inset-0 bg-red-600 bg-opacity-80 flex items-center justify-center">
                     <span className="text-white text-xs font-bold">RES</span>
                   </div>
                 )}
                 {/* Small indicator for individual puppy images */}
                 {!item.isGeneralImage && !isPuppyReserved(item.puppyData) && (
                   <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-blue-500 rounded-full"></div>
                 )}
               </>
             )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ListingCarouselSection;
