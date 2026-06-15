'use client';

import React, { useState } from 'react';
import BreedCard from './BreedCard';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { ArrowUp } from 'lucide-react';
import { useBreedData } from '@/hooks/use-breed-data';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Badge } from '@/components/ui/badge';


interface BreedGridProps {
  filters: {
    size: string[];
    grooming: string[];
    energy: string[];
    search: string;
  };
  breedType?: 'Pedigree' | 'Mixed' | 'all';
}

const BreedGrid: React.FC<BreedGridProps> = ({ filters, breedType = 'all' }) => {
  const isMobile = useIsMobile();
  const [visibleBreeds, setVisibleBreeds] = useState(8);
  const [activeBreedId, setActiveBreedId] = useState<number | null>(null);
  const [activeCrossbreeds, setActiveCrossbreeds] = useState(false);
  
  // Use the new centralized hook for breed data
  const { breeds, isLoading, error } = useBreedData(breedType);
  
  const handleLoadMore = () => {
    setVisibleBreeds(prevCount => Math.min(prevCount + 24, filteredBreeds.length));
  };
  
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  
  // Handle breed card activation
  const handleBreedCardActivation = (breedId: number | null) => {
    setActiveBreedId(breedId);
    setActiveCrossbreeds(false);
  };
  
  // Handle crossbreeds card activation
  const handleCrossbreedsActivation = () => {
    setActiveCrossbreeds(!activeCrossbreeds);
    setActiveBreedId(null);
  };
  
  // Helper function to extract value from descriptive text
  // e.g., "High (Very active...)" -> "High", "Very High (description)" -> "Very High", "Moderate (Regular...)" -> "Moderate"
  const extractValue = (text: string | null | undefined): string => {
    if (!text) return '';
    // Extract everything before first parenthesis, dash, or colon (which indicates description)
    const match = text.match(/^([^(–:]+)/);
    return match ? match[1].trim() : text.trim();
  };

  // Helper function to normalize values for comparison
  // Handles variations like "VeryHigh" vs "Very High", "Moderate" vs "Medium"
  const normalizeValue = (value: string): string => {
    // Remove all spaces and convert to lowercase for consistent comparison
    let normalized = value.toLowerCase().trim().replace(/\s+/g, '');
    
    // Handle common variations
    if (normalized === 'medium' || normalized === 'moderate') return 'moderate';
    if (normalized.includes('very') && normalized.includes('high')) return 'veryhigh';
    if (normalized === 'extralarge' || normalized === 'extralarge') return 'extralarge';
    
    // Return the normalized value (already lowercase, no spaces)
    return normalized;
  };

  // Apply filters to breeds
  const filteredBreeds = breeds.filter(breed => {
    // Search filter
    if (filters.search && !breed.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    
    // Size filter - extract first word and normalize
    if (filters.size.length > 0) {
      const breedSize = extractValue(breed.size);
      const normalizedBreedSize = normalizeValue(breedSize);
      const matchesSize = filters.size.some(filterSize => {
        const normalizedFilterSize = normalizeValue(filterSize);
        return normalizedBreedSize === normalizedFilterSize;
      });
      if (!matchesSize) {
        return false;
      }
    }
    
    // Grooming filter - extract first word and normalize
    if (filters.grooming.length > 0) {
      const breedGrooming = extractValue(breed.grooming);
      const normalizedBreedGrooming = normalizeValue(breedGrooming);
      const matchesGrooming = filters.grooming.some(filterGrooming => {
        const normalizedFilterGrooming = normalizeValue(filterGrooming);
        return normalizedBreedGrooming === normalizedFilterGrooming;
      });
      if (!matchesGrooming) {
        return false;
      }
    }
    
    // Energy filter - extract first word and normalize
    if (filters.energy.length > 0) {
      const breedEnergy = extractValue(breed.energy);
      const normalizedBreedEnergy = normalizeValue(breedEnergy);
      const matchesEnergy = filters.energy.some(filterEnergy => {
        const normalizedFilterEnergy = normalizeValue(filterEnergy);
        return normalizedBreedEnergy === normalizedFilterEnergy;
      });
      if (!matchesEnergy) {
        return false;
      }
    }
    
    return true;
  });
  
  const displayedBreeds = filteredBreeds.slice(0, visibleBreeds);
  const hasMoreBreeds = visibleBreeds < filteredBreeds.length;
  
  // Crossbreeds card component
  const CrossbreedsCard = () => {
    const [showOverlay, setShowOverlay] = useState(false);
    
    // Handle mouse interactions for desktop
    const handleMouseEnter = () => {
      if (!isMobile) {
        setShowOverlay(true);
      }
    };

    const handleMouseLeave = () => {
      if (!isMobile) {
        setShowOverlay(false);
      }
    };
    
    const handleCardClick = () => {
      if (isMobile) {
        handleCrossbreedsActivation();
      }
    };
    
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.4, delay: Math.min(displayedBreeds.length * 0.1, 0.8) } }
        }}
        className="h-full"
      >
        <div 
          className="relative rounded-lg overflow-hidden h-full bg-white shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer"
          onClick={handleCardClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          role="button"
          aria-label="View all crossbreed listings"
        >
          <div className="relative h-full">
            <AspectRatio ratio={1/1} className="bg-muted">
              <img 
                src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?q=80&w=600&auto=format&fit=crop"
                alt="Crossbreeds" 
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105 media-scroll-fix"
                draggable={false}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>

              {/* Breed name - bottom */}
              <div className={`absolute bottom-6 ${isMobile ? 'inset-x-0 text-center' : 'left-3'}`}>
                <h3 className="font-berkshire text-lg md:text-2xl text-white drop-shadow-md px-2">Crossbreeds</h3>
              </div>
            </AspectRatio>
          </div>
          
          {/* Enhanced overlay content */}
          <motion.div 
            className={`absolute inset-0 bg-brand-dark-green/70 flex flex-col items-center justify-center p-4 ${!showOverlay && !isMobile ? 'opacity-0 hover:opacity-100' : ''} transition-opacity duration-300`}
            animate={{ opacity: showOverlay || activeCrossbreeds ? 1 : (isMobile ? 0 : undefined) }}
            initial={isMobile ? { opacity: 0 } : undefined}
          >
            <Link 
              href="/breeds/crossbreeds"
              className="w-full max-w-[200px]"
              onClick={(e) => {
                if (isMobile && !activeCrossbreeds) {
                  e.preventDefault();
                }
              }}
            >
              <Button 
                className="w-full bg-brand-soft-green hover:bg-brand-soft-green/90 text-white font-medium shadow-lg transition-all duration-300 hover:shadow-xl hover:translate-y-[-2px] border border-white/20 group relative overflow-hidden px-2 py-3 h-auto min-h-[2.5rem]"
              >
                <span className="absolute inset-0 w-full h-full bg-white/10 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out"></span>
                <span className="relative text-wrap text-sm sm:text-base">
                  See all<br className="sm:hidden" /> Crossbreed<br className="sm:hidden" /> Listings
                </span>
              </Button>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    );
  };
  
  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-lg">
        <h3 className="text-lg font-medium text-red-700 mb-2">Failed to load breeds</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }
  
  return (
    <div className="animate-fade-in">
      {filteredBreeds.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-700 mb-2">No breeds match your filters</h3>
          <p className="text-gray-500">Try adjusting your filter criteria to see more results.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {displayedBreeds.map((breed, index) => (
              <BreedCard 
                key={breed.id} 
                breed={breed}
                delay={Math.min(index * 0.1, 0.8)} // stagger animation up to 0.8s
                isActive={breed.id === activeBreedId}
                onActivate={() => handleBreedCardActivation(breed.id === activeBreedId ? null : breed.id)}
              />
            ))}
            {/* Add Crossbreeds card only for Pedigree breeds page */}
            {breedType === 'Pedigree' && (
              <CrossbreedsCard />
            )}
          </div>
          
          <div className="mt-10 flex flex-col items-center gap-6">
            {hasMoreBreeds && (
              <Button 
                onClick={handleLoadMore} 
                variant="outline" 
                className="px-8 py-2 border-brand-soft-green text-brand-dark-green hover:bg-brand-soft-green/10"
              >
                Load More Breeds ({filteredBreeds.length - visibleBreeds} more)
              </Button>
            )}
            
            {visibleBreeds > 8 && (
              <Button
                onClick={scrollToTop}
                variant="ghost"
                className="flex items-center gap-2 text-brand-dark-green hover:bg-brand-soft-green/10"
              >
                <ArrowUp size={16} />
                Scroll to top
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BreedGrid;
