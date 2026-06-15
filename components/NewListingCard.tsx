'use client';

import React from 'react';
import Image from 'next/image';
import { ListingType } from './CarouselSection';
import { useBoostConfig } from '@/hooks/useBoostConfig';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconTooltip } from '@/components/ui/tooltip';
import { getScrollableItemProps } from '@/hooks/useScrollToItem';
import { resolveListingPrimaryImage } from '@/lib/utils/listing-primary-image';
import {
  formatPostedOnLabel,
  formatPuppyAgeInWeeks,
} from '@/lib/utils/sale-listing-age';

interface NewListingCardProps {
  listing: ListingType;
  isWishlisted: boolean;
  toggleWishlist: (id: number, e: React.MouseEvent) => void;
  onCardClick: (listing: ListingType) => void;
  hasReservations?: boolean;
  showBoostTier?: boolean;
}

// Helper function to format price display based on puppy count and pricing
const formatPrice = (listing: ListingType): string => {
  if (listing.type === 'showcase') {
    return 'Showcase';
  }

  if (listing.type === 'stud') {
    // For stud listings, check if it's pick of the litter
    if (listing.pickOfLitter) {
      return 'Pick of the Litter';
    }
    // Otherwise show the stud fee/price
    if (listing.price && listing.price > 0) {
      return `€${listing.price.toLocaleString()}`;
    }
    return '';
  }

  // For sale listings - check if we have valid price data - prioritize min/max prices
  const hasMinPrice = listing.minPrice !== undefined && listing.minPrice !== null && listing.minPrice > 0;
  const hasMaxPrice = listing.maxPrice !== undefined && listing.maxPrice !== null && listing.maxPrice > 0;
  const hasMainPrice = listing.price && listing.price > 0;
  
  // For sale listings, prioritize min/max price data
  if (hasMinPrice && hasMaxPrice && listing.minPrice !== undefined && listing.maxPrice !== undefined) {
    // If min and max prices are the same, show single price
    if (listing.minPrice === listing.maxPrice) {
      return `€${listing.minPrice.toLocaleString()}`;
    }
    // Show price range
    return `€${listing.minPrice.toLocaleString()} - €${listing.maxPrice.toLocaleString()}`;
  }
  
  // Fallback to individual min or max price
  if (hasMinPrice && listing.minPrice !== undefined) {
    return `€${listing.minPrice.toLocaleString()}`;
  } else if (hasMaxPrice && listing.maxPrice !== undefined) {
    return `€${listing.maxPrice.toLocaleString()}`;
  } else if (hasMainPrice) {
    return `€${listing.price.toLocaleString()}`;
  }
  
  return '';
};

const NewListingCard = React.memo(({ 
  listing, 
  isWishlisted, 
  toggleWishlist, 
  onCardClick,
  hasReservations = false,
  showBoostTier = false
}: NewListingCardProps) => {
  const boostNames = useBoostConfig();
  const puppyAgeLabel =
    listing.type === 'listing'
      ? formatPuppyAgeInWeeks(listing.date_of_birth)
      : null;
  const postedOnLabel =
    listing.type === 'listing' ? formatPostedOnLabel(listing.created_at) : null;

  // Get primary image - use same logic as UnifiedListingCard
  const primaryImage = resolveListingPrimaryImage({
    images: listing.images,
    primaryImageIndex: listing.primaryImageIndex,
    puppyDetails: listing.puppyDetails as Array<{ imageUrl?: string; image_url?: string }> | undefined,
    fallbackImage: listing.image,
  });

  // Get badge color and text based on listing type
  const getBadgeStyles = () => {
    switch(listing.type) {
      case 'listing':
        return { color: 'bg-brand-soft-green text-white', text: 'Sale' };
      case 'stud':
        return { color: 'bg-blue-500 text-white', text: 'Stud' };
      case 'showcase':
        return { color: 'bg-pink-500 text-white', text: 'Showcase' };
      default:
        return { color: 'bg-brand-soft-green text-white', text: 'Sale' };
    }
  };

  // Get border color based on listing type
  const getBorderColor = () => {
    switch(listing.type) {
      case 'listing':
        return 'border-gray-200';
      case 'stud':
        return 'border-gray-200';
      case 'showcase':
        return 'border-gray-200';
      default:
        return 'border-gray-200';
    }
  };

  // Get boost border styling based on boost type
  const getBoostBorder = () => {
    if (!listing.boostType) return '';
    
    switch(listing.boostType) {
      case 'gold':
        return 'border-yellow-400 border-[3px] shadow-[0_0_15px_rgba(250,204,21,0.4)]';
      case 'elite':
        return 'border-purple-400 border-[3px] shadow-[0_0_15px_rgba(192,132,252,0.4)]';
      case 'premium':
        return 'border-blue-400 border-[3px] shadow-[0_0_15px_rgba(96,165,250,0.4)]';
      case 'standard':
        return 'border-orange-400 border-[3px] shadow-[0_0_15px_rgba(251,146,60,0.3)]';
      default:
        return '';
    }
  };

  // Get boost accent color for bottom section
  const getBoostAccentColor = () => {
    if (!listing.boostType) return '';
    
    switch(listing.boostType) {
      case 'gold':
        return 'bg-yellow-400';
      case 'elite':
        return 'bg-purple-400';
      case 'premium':
        return 'bg-blue-400';
      case 'standard':
        return 'bg-orange-400';
      default:
        return '';
    }
  };

  const getBoostTierBadge = () => {
    if (!showBoostTier || !listing.boostType) return null;
    
    switch(listing.boostType) {
      case 'gold':
        return { 
          text: boostNames.gold, 
          className: 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-yellow-300 shadow-lg font-playfair font-black tracking-tight', 
          tooltip: `${boostNames.gold} - Maximum visibility, top placement on all pages, featured 24/7` 
        };
      case 'elite':
        return { 
          text: boostNames.elite, 
          className: 'bg-gradient-to-r from-purple-500 to-purple-700 text-white border-purple-300 shadow-lg font-playfair font-black tracking-tight', 
          tooltip: `${boostNames.elite} - Above ${boostNames.premium} placement, featured in dedicated carousel` 
        };
      case 'premium':
        return { 
          text: boostNames.premium, 
          className: 'bg-gradient-to-r from-blue-400 to-blue-600 text-white border-blue-300 shadow-md font-lora font-bold tracking-normal', 
          tooltip: `${boostNames.premium} - Enhanced visibility, featured in dedicated carousel` 
        };
      case 'standard':
        if (!boostNames.standard.trim()) return null;
        return {
          text: boostNames.standard,
          className:
            'bg-gradient-to-r from-orange-400 to-orange-600 text-white border-orange-300 shadow-md font-inter font-semibold tracking-wide',
          tooltip: `${boostNames.standard} - Top placement until bumped by new boosts`,
        };
      default:
        return null;
    }
  };

  const badgeStyles = getBadgeStyles();
  const borderColor = getBorderColor();
  const boostBorder = getBoostBorder();
  const boostTierBadge = getBoostTierBadge();
  const boostAccentColor = getBoostAccentColor();

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(listing.id, e);
  };

  const handleCardClick = () => {
    // Just pass the listing as-is since the navigation logic is handled in the parent
    onCardClick(listing);
  };

  // Generate scroll restoration props
  const scrollProps = getScrollableItemProps(listing.type || 'listing', String(listing.originalId ?? listing.id ?? ''));

  // Check if this is a boosted listing
  const isBoosted = !!listing.boostType;

  return (
    <div 
      {...scrollProps}
      className={cn(
        "h-full group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2",
        "transition-all duration-700 ease-out",
        isBoosted && "hover:-translate-y-2"
      )}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${listing.title}`}
      onClick={handleCardClick}
    >
      <Card className={cn(
        "rounded-3xl overflow-hidden h-full p-0 bg-white relative",
        isBoosted 
          ? (boostBorder ? `${boostBorder} shadow-xl shadow-gray-900/5` : "border-2 border-gray-200 shadow-xl shadow-gray-900/5")
          : "border border-gray-100 shadow-sm",
        "transition-all duration-700 ease-out",
        isBoosted && [
          "group-hover:shadow-2xl",
          "group-hover:shadow-gray-900/15"
        ],
        isBoosted && !boostBorder && "group-hover:border-gray-300"
      )}>
        {/* Premium Glow Effect for Boosted Cards */}
        {isBoosted && (
          <>
            <div className={cn(
              "absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10",
              "bg-gradient-to-r from-gray-200/50 via-gray-100/30 to-gray-200/50",
              "blur-xl"
            )} />
            <div className={cn(
              "absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none",
              "bg-gradient-to-br from-white/40 via-transparent to-transparent"
            )} />
          </>
        )}

        {/* Image Section */}
        <div className="relative">
          <div className={cn(
            "relative aspect-square overflow-hidden",
            isBoosted ? "bg-gradient-to-br from-gray-50 via-white to-gray-50" : "bg-gray-50"
          )}>
            <Image 
              src={primaryImage} 
              alt={`${listing.breed} listing preview`}
              fill
              className={cn(
                "object-cover transition-all duration-700 ease-out",
                isBoosted ? "group-hover:scale-110" : "group-hover:scale-105",
                hasReservations && "grayscale opacity-60"
              )}
              loading="lazy"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              quality={85}
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwABmQAAX/2Q=="
            />
            
            {/* Elegant gradient overlay */}
            <div className={cn(
              "absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent",
              "opacity-0 group-hover:opacity-100 transition-opacity duration-700"
            )} />
            
            {/* Reserved overlay */}
            {hasReservations && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10 backdrop-blur-sm">
                <div className="bg-white text-gray-900 px-8 py-3 rounded-xl font-semibold text-sm shadow-2xl border border-gray-200">
                  RESERVED
                </div>
              </div>
            )}
          
            {/* Premium Wishlist Button */}
            <button 
              className={cn(
                "absolute top-4 right-4 z-10",
                isBoosted 
                  ? "bg-white/95 backdrop-blur-lg p-3 rounded-full shadow-lg border border-gray-100" 
                  : "bg-white/90 backdrop-blur-md p-2.5 rounded-full shadow-md",
                "hover:bg-white hover:scale-110 hover:shadow-xl",
                "transition-all duration-500 ease-out",
                "group-hover:border-gray-200"
              )}
              onClick={handleWishlistClick}
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart 
                className={cn(
                  isBoosted ? "w-5 h-5" : "w-4 h-4",
                  "transition-all duration-500",
                  isWishlisted 
                    ? "fill-red-500 stroke-red-500 scale-110" 
                    : "stroke-gray-500 group-hover:stroke-gray-700"
                )}
              />
            </button>
          </div>
        </div>

        {/* Premium Content Section */}
        <CardContent className={cn(
          "p-4 bg-white relative",
          isBoosted && "bg-gradient-to-b from-white to-gray-50/30"
        )}>
          <div className="space-y-2">
            {/* Title - Premium Typography */}
            <h3 className={cn(
              isBoosted ? "font-semibold text-base" : "font-medium text-sm",
              "leading-tight text-gray-900 line-clamp-2",
              "transition-colors duration-500",
              "group-hover:text-brand-dark-green"
            )}>
              {listing.title}
            </h3>
            
            {/* Breed - Elegant */}
            <p className={cn(
              "text-xs font-normal",
              isBoosted ? "text-gray-600" : "text-gray-500"
            )}>
              {listing.breed}
            </p>
            
            {/* Location - Refined */}
            <div className={cn(
              "flex items-center gap-1.5",
              isBoosted ? "text-xs text-gray-500" : "text-xs text-gray-400"
            )}>
              <MapPin className={cn(
                "transition-colors duration-500",
                isBoosted ? "h-3 w-3 text-brand-dark-green" : "h-2.5 w-2.5"
              )} />
              <span className="font-medium">{listing.location}</span>
            </div>

            {listing.type === 'listing' && (puppyAgeLabel || postedOnLabel) && (
              <div className={cn(
                'space-y-0.5',
                isBoosted ? 'text-xs text-gray-500' : 'text-xs text-gray-400'
              )}>
                {puppyAgeLabel && <p>{puppyAgeLabel} old</p>}
                {postedOnLabel && <p>{postedOnLabel}</p>}
              </div>
            )}
            
            {/* Price Section - Premium Layout with Boost Color */}
            <div className={cn(
              "relative -mx-4 px-4 pt-3 pb-3 rounded-b-3xl",
              isBoosted && boostAccentColor 
                ? `${boostAccentColor} bg-opacity-10` 
                : "",
              isBoosted 
                ? "border-t-2 border-gray-100" 
                : "border-t border-gray-50"
            )}>
              <div className="flex items-center justify-between">
                <p className={cn(
                  isBoosted ? "text-xl font-bold" : "text-lg font-semibold",
                  "tracking-tight text-gray-900",
                  "transition-all duration-500",
                  "group-hover:text-brand-dark-green"
                )}>
                  {formatPrice(listing)}
                </p>
                
                {/* Verification Badges - Premium */}
                <div className="flex gap-2">
                  {listing.hasGoldStar && (
                    <IconTooltip content="This dog has been health checked by a licensed vet.">
                      <div className={cn(
                        "inline-flex items-center justify-center rounded-full p-1",
                        "bg-white/80 backdrop-blur-sm shadow-sm",
                        "transition-all duration-500",
                        "group-hover:shadow-md group-hover:scale-110"
                      )}>
                        <Image 
                          src="/badges/goldernstart.jpeg"
                          alt="Gold Star"
                          width={isBoosted ? 24 : 20}
                          height={isBoosted ? 24 : 20}
                          className="object-contain"
                          loading="lazy"
                        />
                      </div>
                    </IconTooltip>
                  )}
                  {listing.hasGreenTick && (
                    <IconTooltip content="This dog has received its vaccinations from a licensed vet.">
                      <div className={cn(
                        "inline-flex items-center justify-center rounded-full p-1",
                        "bg-white/80 backdrop-blur-sm shadow-sm",
                        "transition-all duration-500",
                        "group-hover:shadow-md group-hover:scale-110"
                      )}>
                        <Image 
                          src="/badges/greentick.jpeg"
                          alt="Green Tick"
                          width={isBoosted ? 24 : 20}
                          height={isBoosted ? 24 : 20}
                          className="object-contain"
                          loading="lazy"
                        />
                      </div>
                    </IconTooltip>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

NewListingCard.displayName = 'NewListingCard';

export default NewListingCard;
