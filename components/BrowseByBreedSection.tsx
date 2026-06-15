'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getOptimizedBreedCounts } from '@/services/optimizedBreedCountingService';
import { normalizeBreedForMatching } from '@/lib/utils/breed-utils';

// Helper function to create consistent breed slug
const createBreedSlug = (breedName: string): string => {
  return breedName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .trim();
};

// Crossbreeds card component for mixed breeds
const CrossbreedsCard = () => {
  const [isActive, setIsActive] = React.useState(false);
  const router = useRouter();
  const cardRef = React.useRef<HTMLDivElement>(null);
  const touchStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const touchMoveRef = React.useRef<boolean>(false);
  const [isTouchDevice, setIsTouchDevice] = React.useState(false);

  React.useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  React.useEffect(() => {
    if (!isTouchDevice) return;
    
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (isActive && cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setIsActive(false);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isActive, isTouchDevice]);

  const handleMouseEnter = () => {
    if (!isTouchDevice) {
      setIsActive(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isTouchDevice) {
      setIsActive(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    touchMoveRef.current = false;
  };

  const handleTouchMove = () => {
    touchMoveRef.current = true;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    if (touchMoveRef.current) {
      touchStartRef.current = null;
      return;
    }

    e.stopPropagation();
    setIsActive((prev) => !prev);
    touchStartRef.current = null;
  };

  return (
    <div
      ref={cardRef}
      className="relative rounded-lg overflow-hidden aspect-square w-full h-full cursor-pointer shadow-md transition-all duration-300 hover:shadow-lg"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Crossbreeds Image */}
      <img
        src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?q=80&w=600&auto=format&fit=crop"
        alt="Mixed breed dogs"
        className={cn(
          "w-full h-full object-cover transition-all duration-300 media-scroll-fix",
          isActive && "scale-105"
        )}
        loading="lazy"
        draggable={false}
      />
      
      {/* Crossbreeds Name Overlay */}
      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
        <h3 className="font-berkshire text-white text-lg sm:text-xl mb-1 drop-shadow-md">Crossbreeds</h3>
      </div>
      
      {/* Hover/Tap Overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-brand-dark-green/85 flex flex-col items-center justify-center text-center transition-all duration-300 px-4",
          isActive ? "opacity-100" : "opacity-0 pointer-events-none",
          "transform",
          isActive ? "translate-y-0" : "translate-y-8"
        )}
      >
        <Button 
          id="breed-view-crossbreeds"
          data-restore-target
          variant="outline" 
          className="bg-white text-brand-dark-green hover:bg-white/90 border-2 px-4 py-2 font-medium shadow-md transition-transform hover:scale-105"
          onClick={(e) => {
            e.stopPropagation();
            router.push('/mixed-breeds');
          }}
        >
          View
        </Button>
      </div>
    </div>
  );
};

// Individual breed card component
const BreedCard = ({ breed }: { breed: any }) => {
  const [isActive, setIsActive] = React.useState(false);
  const router = useRouter();
  const cardRef = React.useRef<HTMLDivElement>(null);
  const touchStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const touchMoveRef = React.useRef<boolean>(false);
  const [isTouchDevice, setIsTouchDevice] = React.useState(false);

  // Detect touch capability on mount
  React.useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Close overlay when clicked outside the card (for touch devices)
  React.useEffect(() => {
    if (!isTouchDevice) return;
    
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (isActive && cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setIsActive(false);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isActive, isTouchDevice]);

  const handleMouseEnter = () => {
    // Only activate on hover for non-touch devices
    if (!isTouchDevice) {
      setIsActive(true);
    }
  };

  const handleMouseLeave = () => {
    // Only deactivate on leave for non-touch devices
    if (!isTouchDevice) {
      setIsActive(false);
    }
  };

  // Improved touch handling to differentiate between taps and swipes
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    touchMoveRef.current = false;
  };

  const handleTouchMove = () => {
    touchMoveRef.current = true;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    // If there was significant movement, it's a swipe, not a tap
    if (touchMoveRef.current) {
      touchStartRef.current = null;
      return;
    }

    // Prevent event bubbling to avoid triggering carousel swipe
    e.stopPropagation();
    
    // Toggle active state on tap
    setIsActive((prev) => !prev);
    
    // Reset refs
    touchStartRef.current = null;
  };

  return (
    <div
      ref={cardRef}
      className="relative rounded-lg overflow-hidden aspect-square w-full h-full cursor-pointer shadow-md transition-all duration-300 hover:shadow-lg"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Breed Image with improved loading and animation */}
      <img
        src={breed.image_url || 'https://images.unsplash.com/photo-1605897472359-85e4b94d685d?q=80&w=600&auto=format&fit=crop'}
        alt={`${breed.breed} dog breed`}
        className={cn(
          "w-full h-full object-cover transition-all duration-300 media-scroll-fix",
          isActive && "scale-105" // Subtle zoom on hover/tap
        )}
        loading="lazy"
        draggable={false}
      />
      
      {/* Move Available Count Badge to top right */}
      <Badge 
        className="absolute top-3 right-3 bg-amber-500/90 text-white border-0 z-10 px-2 py-1 font-medium text-xs sm:text-sm shadow-sm"
      >
        {breed.available || 0} Available
      </Badge>
      
      {/* Breed Name Overlay with enhanced visual styling */}
      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
        <h3 className="font-berkshire text-white text-lg sm:text-xl mb-1 drop-shadow-md">{breed.breed}</h3>
      </div>
      
      {/* Hover/Tap Overlay with improved animation and center-aligned content */}
      <div
        className={cn(
          "absolute inset-0 bg-brand-dark-green/85 flex flex-col items-center justify-center text-center transition-all duration-300 px-4",
          isActive ? "opacity-100" : "opacity-0 pointer-events-none",
          // Add better animation
          "transform",
          isActive ? "translate-y-0" : "translate-y-8"
        )}
      >
        <Button 
          id={`breed-view-${breed.breed.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`}
          data-restore-target
          variant="outline" 
          className="bg-white text-brand-dark-green hover:bg-white/90 border-2 px-4 py-2 font-medium shadow-md transition-transform hover:scale-105"
          onClick={(e) => {
            e.stopPropagation();
            // Create a consistent URL-friendly slug using the same function as BreedDetail
            const slug = createBreedSlug(breed.breed);
            router.push(`/breeds/${slug}`);
          }}
        >
          View
        </Button>
      </div>
    </div>
  );
};

const BrowseByBreedSection = () => {
  const [carouselApi, setCarouselApi] = React.useState<any>(null);
  const isMobile = useIsMobile();
  const router = useRouter();
  
  // Fetch breeds from Supabase with actual availability counts
  const { data: dogBreeds = [], isLoading } = useQuery({
    queryKey: ['quiz-breeds-with-counts'],
    queryFn: async () => {
      try {
        // Get only pedigree breeds from quiz_breeds table
        const { data: breedsData, error: breedsError } = await supabase
          .from('quiz_breeds')
          .select('*')
          .eq('breed_type', 'Pedigree')
          .order('breed');
        
        if (breedsError) {
          console.error('Error fetching breeds:', breedsError);
          throw breedsError;
        }

        // Use the optimized breed counting service for accurate counts
        const breedCounts = await getOptimizedBreedCounts({ mode: 'Pedigree', useCache: true });

        // Map breeds with their actual availability counts
        return breedsData.map(breed => {
          const normalized = normalizeBreedForMatching(breed.breed);
          const count = breedCounts.get(normalized);
          
          return {
            ...breed,
            available: count?.saleCount || 0
          };
        });
        
      } catch (error) {
        console.error('Error fetching breed data:', error);
        throw error;
      }
    }
  });
  
  // Reset carousel to beginning when data loads
  React.useEffect(() => {
    if (carouselApi && dogBreeds.length > 0) {
      carouselApi.scrollTo(0, false); // Scroll to first slide without animation
    }
  }, [carouselApi, dogBreeds]);

  if (isLoading) {
    return (
      <section className="py-12 sm:py-16 px-4 bg-white">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 sm:mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-berkshire text-brand-dark-green mb-1 sm:mb-2">
                Browse Pedigree Breeds
              </h2>
              <p className="text-gray-600 text-base sm:text-lg max-w-lg">
                Whether you're after a big gentle giant or a hypoallergenic pal, start with the breed.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="aspect-square bg-gray-200 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 sm:py-16 px-4 bg-white">
      <style>{`
        /* Improve touch handling for carousel */
        .embla {
          overflow-y: visible !important;
          overflow-x: clip;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-y pinch-zoom;
        }
        
        /* Prevent scroll bounce on iOS */
        .embla__container {
          -webkit-overflow-scrolling: touch;
          will-change: transform;
          backface-visibility: hidden;
        }
      `}</style>
      <div className="container mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 sm:mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-berkshire text-brand-dark-green mb-1 sm:mb-2">
              Browse Pedigree Breeds
            </h2>
            <p className="text-gray-600 text-base sm:text-lg max-w-lg">
              Whether you're after a big gentle giant or a hypoallergenic pal, start with the pedigree breed.
            </p>
          </div>
        </div>

        <div className="relative">
          <Carousel
            opts={{
              align: "start",
              loop: false,
              dragFree: true, // Enable momentum-based scrolling
              containScroll: 'trimSnaps',
              skipSnaps: false,
              inViewThreshold: 0.7,
              duration: 20, // Smoother animation time
              startIndex: 0, // Always start from the first slide
              breakpoints: {
                '(min-width: 768px)': {
                  slidesToScroll: 2
                },
                '(min-width: 1024px)': {
                  slidesToScroll: 3
                }
              }
            }}
            className="w-full"
            setApi={setCarouselApi}
          >
            <CarouselContent className="-ml-2 md:-ml-4 justify-start">
              {dogBreeds.map((breed) => (
                <CarouselItem 
                  key={breed.id} 
                  className="mt-2 md:mt-0 pl-2 md:pl-4 basis-[80%] sm:basis-[40%] md:basis-[28%] lg:basis-[22%]"
                >
                  <BreedCard breed={breed} />
                </CarouselItem>
              ))}
              {/* Add Crossbreeds card at the end */}
              <CarouselItem 
                key="crossbreeds" 
                className="mt-2 md:mt-0 pl-2 md:pl-4 basis-[80%] sm:basis-[40%] md:basis-[28%] lg:basis-[22%]"
              >
                <CrossbreedsCard />
              </CarouselItem>
            </CarouselContent>
            <div className="flex justify-end gap-2 mt-6">
              <CarouselPrevious className="relative -left-0 h-8 w-8" />
              <CarouselNext className="relative -right-0 h-8 w-8" />
            </div>
          </Carousel>
        </div>
        
        {/* Mobile-optimized CTA Button */}
        <div className="flex justify-center mt-6 sm:mt-8 sm:mb-6">
          <Button 
            id="browse-all-breeds-btn"
            data-restore-target
            className="bg-brand-soft-green text-white hover:bg-brand-dark-green px-6 sm:px-6 py-4 sm:py-4 h-auto text-base sm:text-lg font-medium rounded-md shadow-md transition-all hover:shadow-lg"
            onClick={() => router.push('/breeds')}
          >
            Browse All Pedigree Breeds
          </Button>
        </div>
      </div>
    </section>
  );
};

export default BrowseByBreedSection;
