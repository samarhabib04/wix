'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, User, Ruler, Heart } from 'lucide-react';
import { cn } from "@/lib/utils";
import { IconTooltip } from "@/components/ui/tooltip";
import { useWishlist } from "@/hooks/use-wishlist";
import WishlistAuthModal from './WishlistAuthModal';
import Link from 'next/link';
import { formatBreedName } from '@/lib/utils/breed-utils';
import {
  formatPostedOnLabel,
  formatPuppyAgeInWeeks,
} from '@/lib/utils/sale-listing-age';

interface ListingPreviewModalProps {
  id: number;
  title: string;
  breed: string;
  price: number;
  minPrice?: number;
  maxPrice?: number;
  location: string;
  image: string;
  hasGreenTick?: boolean;
  hasGoldStar?: boolean;
  sex?: string;
  age?: string;
  size?: string;
  description?: string;
  isWormed?: boolean;
  type?: 'listing' | 'showcase' | 'stud';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // New prop for the original string ID to help with URL creation
  originalId?: string;
  // New prop for pick of litter option
  pickOfLitter?: boolean;
  /** ISO date string — sale listings only */
  dateOfBirth?: string;
  /** ISO timestamp — sale listings only */
  createdAt?: string;
}

export function ListingPreviewModal({
  id,
  title,
  breed,
  price,
  minPrice,
  maxPrice,
  location,
  image,
  hasGreenTick,
  hasGoldStar,
  sex,
  age,
  size,
  description,
  isWormed,
  type = 'listing', // Default to 'listing' if not provided
  open,
  onOpenChange,
  originalId,
  pickOfLitter = false,
  dateOfBirth,
  createdAt,
}: ListingPreviewModalProps) {
  const { 
    isInWishlist, 
    toggleWishlist,
    wishlistAuthModalOpen,
    setWishlistAuthModalOpen,
    pendingWishlistItem
  } = useWishlist();
  
  const isWishlisted = isInWishlist(id.toString());

  // Helper function to capitalize first letter of each word
  const capitalizeWords = (str: string) => {
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(id.toString(), type, e);
  };
  
  // Function to get the badge text based on listing type
  const getListingTypeBadge = () => {
    switch(type) {
      case 'showcase':
        return {
          text: 'Showcase',
          className: 'bg-[#FFDEE2] text-gray-800'
        };
      case 'stud':
        return {
          text: 'Stud',
          className: 'bg-blue-500 text-white'
        };
      default:
        return {
          text: 'Sale',
          className: 'bg-brand-soft-green text-white'
        };
    }
  };
  
  // Function to create a URL-friendly slug from the title
  const createSlug = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special chars except whitespace and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Remove consecutive hyphens
      .trim();
  };
  
  // Updated function to get the appropriate URL based on the listing type
  const getListingUrl = () => {

    switch(type) {
      case 'showcase':
        // If we have an original UUID, use its last 4 characters plus the title slug
        if (originalId && typeof originalId === 'string') {
          // Extract last 4 characters from UUID
          const lastFourChars = originalId.slice(-4);
          const titleSlug = createSlug(title);

          return `/showcase/${lastFourChars}-${titleSlug}`;
        }
        // Fallback to just numeric ID if no originalId provided
        return `/showcase/${id}`;
      case 'stud':
        // For stud listings, use the originalId if available, otherwise fall back to numeric id
        const studId = originalId || id.toString();

        return `/stud/${studId}`;
      default:
        // For regular sale listings, use the originalId (UUID) if available
        const listingId = originalId || id.toString();

        return `/listing/${listingId}`;
    }
  };
  
  // Function to get the appropriate button color based on listing type
  const getButtonClass = () => {
    if (type === 'showcase') {
      return "bg-pink-500 hover:bg-pink-600"; // Pink button for showcase listings
    }
    if (type === 'stud') {
      return "bg-blue-500 hover:bg-blue-600"; // Blue button for stud listings
    }
    return "bg-brand-dark-green hover:bg-brand-soft-green"; // Default green for other listing types
  };

  // Function to get the close button class based on listing type
  const getCloseButtonClass = () => {
    if (type === 'stud') {
      return "border-blue-200 border-2"; // Blue border for stud listings
    }
    if (type === 'listing') {
      return "border-brand-soft-green border-2"; // Blue border for sale listings
    }
    return "border-pink-200 border-2"; // Default pink border
  };
  
  // Function to format price display for modals
  const getModalPriceDisplay = () => {
    // Don't show price for showcase listings
    if (type === 'showcase') {
      return null;
    }
    
    if (type === 'stud') {
      if (pickOfLitter) {
        return 'Pick of the Litter';
      }
      // Show stud fee/price
      if (price && price > 0) {
        return `€${price.toLocaleString()}`;
      }
      return '';
    }
    
    // Check if we have valid price range data for sale listings
    const hasMinPrice = minPrice && minPrice > 0;
    const hasMaxPrice = maxPrice && maxPrice > 0;
    const hasMainPrice = price && price > 0;

    // If we have both min and max prices and they're different
    if (hasMinPrice && hasMaxPrice && minPrice !== maxPrice) {

      return `€${minPrice.toLocaleString()} - €${maxPrice.toLocaleString()}`;
    }
    
    // If min and max are the same, show single price
    if (hasMinPrice && hasMaxPrice && minPrice === maxPrice) {

      return `€${minPrice.toLocaleString()}`;
    }
    
    // Fallback to individual min or max price
    if (hasMinPrice) {

      return `€${minPrice.toLocaleString()}`;
    } else if (hasMaxPrice) {

      return `€${maxPrice.toLocaleString()}`;
    } else if (hasMainPrice) {

      return `€${price.toLocaleString()}`;
    }

    return '';
  };
  
  const badge = getListingTypeBadge();
  const priceDisplay = getModalPriceDisplay();
  const salePuppyAge =
    type === 'listing' ? formatPuppyAgeInWeeks(dateOfBirth) : null;
  const salePostedOn =
    type === 'listing' ? formatPostedOnLabel(createdAt) : null;
  
  // Function to truncate description to 200 characters - but not for showcase listings
  const truncateDescription = (text: string | undefined) => {
    if (!text || type === 'showcase') return '';
    return text.length > 200 ? text.substring(0, 200) + '...' : text;
  };
  
  return (
    <>
      <WishlistAuthModal
        open={wishlistAuthModalOpen}
        onOpenChange={setWishlistAuthModalOpen}
        itemToSave={pendingWishlistItem || undefined}
      />
      
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[625px] p-0 overflow-hidden rounded-lg z-[9999]">
          <div className="flex flex-col relative z-[9999]">
            {/* Image section - full width on both mobile and desktop */}
            <div className="relative w-full">
              <div className="w-full aspect-square">
                <img 
                  src={image} 
                  alt={title}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <button 
                className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full hover:bg-white transition-colors z-[10]"
                onClick={handleWishlistToggle}
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart 
                  className={cn("w-5 h-5", isWishlisted ? "fill-red-500 stroke-red-500" : "stroke-gray-600")}
                />
              </button>
              
              {/* Listing type badge */}
              <div className="absolute top-2 left-2 z-[10]">
                <span className={`px-2 py-1 ${badge.className} text-xs font-medium rounded-md`}>
                  {badge.text}
                </span>
              </div>
              
              {/* Price display - only show if priceDisplay is not null */}
              {priceDisplay && (
                <div className="absolute bottom-2 left-2 z-[10]">
                  <div className="bg-white/90 backdrop-blur-sm rounded-md px-2 py-1 font-medium text-sm">
                    {priceDisplay}
                  </div>
                </div>
              )}
            </div>
            
            {/* Content section */}
            <div className="py-6 px-4 bg-white relative z-[10]">
              <DialogHeader className="mb-4">
                <DialogTitle className="text-xl">{title}</DialogTitle>
                <DialogDescription className="text-base">{formatBreedName(breed)}</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {sex && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{sex}</span>
                    </div>
                  )}
                  {age && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{age}</span>
                    </div>
                  )}
                  {salePuppyAge && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{salePuppyAge} old</span>
                    </div>
                  )}
                  {salePostedOn && (
                    <div className="flex items-center gap-2 col-span-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{salePostedOn}</span>
                    </div>
                  )}
                  {size && (
                    <div className="flex items-center gap-2">
                      <Ruler className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{size}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{capitalizeWords(location)}</span>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-2">
                  {hasGoldStar && (
                    <IconTooltip content="This dog has been health checked by a licensed vet.">
                      <img 
                        src="/badges/goldernstart.jpeg"
                        alt="Gold Star"
                        className="h-8 w-8"
                      />
                    </IconTooltip>
                  )}
                  {hasGreenTick && (
                    <IconTooltip content="This dog has received its vaccinations from a licensed vet.">
                      <img 
                        src="/badges/greentick.jpeg"
                        alt="Green Tick"
                        className="h-8 w-8"
                      />
                    </IconTooltip>
                  )}
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button 
                    className={getButtonClass()}
                    asChild
                  >
                    <Link href={getListingUrl() || '#'}>See More</Link>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className={getCloseButtonClass()}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
