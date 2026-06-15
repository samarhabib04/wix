'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { getScrollableItemProps } from '@/hooks/useScrollToItem';

interface BreedCardProps {
  breed: {
    id: number;
    name: string;
    slug: string;
    image: string;
    availableCount: number;
    breed_type?: string;
  };
  delay?: number;
  isActive?: boolean;
  onActivate?: () => void;
}

const BreedCard: React.FC<BreedCardProps> = ({ 
  breed, 
  delay = 0, 
  isActive = false, 
  onActivate = () => {} 
}) => {
  const [showOverlay, setShowOverlay] = useState(false);
  const isMobile = useIsMobile();
  
  // Update local state when parent-controlled isActive prop changes
  useEffect(() => {
    if (isMobile) {
      setShowOverlay(isActive);
    }
  }, [isActive, isMobile]);
  
  const handleCardClick = () => {
    if (isMobile) {
      onActivate(); // Call parent handler to manage active state
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleCardClick();
    }
  };

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

  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, delay } }
  };

  // Generate scroll restoration props
  const scrollProps = getScrollableItemProps('breed', breed.slug);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
      className="h-full"
    >
      <div 
        {...scrollProps}
        className="relative rounded-lg overflow-hidden h-full bg-white shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer"
        onClick={handleCardClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`View ${breed.name} listings`}
      >
        <div className="relative h-full">
          <AspectRatio ratio={1/1} className="bg-muted">
            <img 
              src={breed.image} 
              alt={breed.name} 
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105 media-scroll-fix"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            
            {/* Available count - top (centered on mobile, left on desktop) */}
            <div className={`absolute top-3 ${isMobile ? 'inset-x-0 text-center flex justify-center' : 'left-3'}`}>
              <Badge variant="outline" className="bg-brand-soft-green/60 border-brand-soft-green text-white">
                Currently available: {breed.availableCount}
              </Badge>
            </div>

            {/* Breed name - bottom (centered on mobile, left on desktop) */}
            <div className={`absolute bottom-6 ${isMobile ? 'inset-x-0 text-center' : 'left-3'}`}>
              <h3 className="font-berkshire text-lg md:text-2xl text-white drop-shadow-md px-2">{breed.name}</h3>
            </div>
            
          </AspectRatio>
        </div>
        
        {/* Enhanced overlay content with improved button styling */}
        <motion.div 
          className={`absolute inset-0 bg-brand-dark-green/70 flex flex-col items-center justify-center p-4 ${!showOverlay && !isMobile ? 'opacity-0 hover:opacity-100' : ''} transition-opacity duration-300`}
          animate={{ opacity: showOverlay ? 1 : (isMobile ? 0 : undefined) }}
          initial={isMobile ? { opacity: 0 } : undefined}
        >
          <Link 
            href={breed.breed_type === 'Mixed Breed' ? `/mixed-breeds/${breed.slug || '#'}` : `/breeds/${breed.slug || '#'}`}
            className="w-full max-w-[200px]"
            onClick={(e) => {
              if (isMobile && !isActive) {
                e.preventDefault();
              }
            }}
          >
            <Button 
              className="w-full bg-brand-soft-green hover:bg-brand-soft-green/90 text-white font-medium shadow-lg transition-all duration-300 hover:shadow-xl hover:translate-y-[-2px] border border-white/20 group relative overflow-hidden px-2 py-3 h-auto min-h-[2.5rem]"
            >
              <span className="absolute inset-0 w-full h-full bg-white/10 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out"></span>
              <span className="relative text-wrap text-sm sm:text-base">
                See all<br className="sm:hidden" /> {breed.name}<br className="sm:hidden" /> Listings
              </span>
            </Button>
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default BreedCard;
