import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, MapPin, Euro } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UnifiedListing } from '@/hooks/useUnifiedListings';
import { getScrollableItemProps } from '@/hooks/useScrollToItem';
import { resolveListingPrimaryImage } from '@/lib/utils/listing-primary-image';
import {
  formatPostedOnLabel,
  formatPuppyAgeInWeeks,
} from '@/lib/utils/sale-listing-age';

interface UnifiedListingCardProps {
  listing: UnifiedListing;
  isWishlisted: boolean;
  toggleWishlist: (id: string, e: React.MouseEvent) => void;
  onCardClick: (listing: UnifiedListing) => void;
}

export const UnifiedListingCard: React.FC<UnifiedListingCardProps> = ({
  listing,
  isWishlisted,
  toggleWishlist,
  onCardClick
}) => {
  // Get primary image - prioritize puppy_details imageUrl if available
  const primaryImage =
    listing.cardImage ||
    resolveListingPrimaryImage({
      images: listing.images,
      primaryImageIndex: listing.primaryImageIndex,
      puppyDetails: listing.puppyDetails,
    });

  // Get boost border styling based on boost type (matching homepage styling)
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

  const boostBorder = getBoostBorder();
  const isBoosted = !!listing.boostType;

  // Get type badge styling
  const getTypeBadge = () => {
    switch(listing.type) {
      case 'sale':
        return {
          text: 'For Sale',
          className: 'bg-blue-100 text-blue-800'
        };
      case 'stud':
        return {
          text: 'Stud',
          className: 'bg-green-100 text-green-800'
        };
      case 'showcase':
        return {
          text: 'Showcase',
          className: 'bg-pink-100 text-pink-800'
        };
      default:
        return {
          text: 'Listing',
          className: 'bg-gray-100 text-gray-800'
        };
    }
  };

  const typeBadge = getTypeBadge();

  // Format price/fee display
  const getPriceDisplay = () => {
    if (listing.type === 'stud' && listing.studFee) {
      return `€${listing.studFee.toLocaleString()} stud fee`;
    }
    if (listing.type === 'sale' && listing.price) {
      return `€${listing.price.toLocaleString()}`;
    }
    return null;
  };

  const priceDisplay = getPriceDisplay();
  const puppyAgeLabel =
    listing.type === 'sale' ? formatPuppyAgeInWeeks(listing.dateOfBirth) : null;
  const postedOnLabel =
    listing.type === 'sale' ? formatPostedOnLabel(listing.createdAt) : null;

  // Generate scroll restoration props
  const scrollProps = getScrollableItemProps(listing.type, listing.id);

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
      onClick={() => onCardClick(listing)}
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

        <div className="relative">
          <div className="aspect-square overflow-hidden">
            <img 
              src={primaryImage} 
              alt={`${listing.breed} listing preview`}
              className="w-full h-full object-cover media-scroll-fix"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </div>
          
          {/* Wishlist button */}
          <button 
            className="absolute top-2 right-2 bg-white/70 p-1.5 rounded-full hover:bg-white/90 transition-colors"
            onClick={(e) => toggleWishlist(listing.id, e)}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart 
              className={cn("w-5 h-5", isWishlisted ? "fill-red-500 stroke-red-500" : "stroke-gray-600")}
            />
          </button>

          {/* Type badge */}
          <div className="absolute top-2 left-2">
            <Badge className={typeBadge.className}>
              {typeBadge.text}
            </Badge>
          </div>

          {/* Certification badges - Positioned top right for better visibility */}
          <div className="absolute top-2 right-12 flex gap-1.5">
            {listing.hasGoldStar && (
              <div className="verification-badge verification-badge-gold inline-flex items-center justify-center bg-white rounded-full p-1.5 shadow-lg">
                <img 
                  src="/badges/goldernstart.jpeg"
                  alt="Health Checked"
                  className="h-6 w-6 media-scroll-fix"
                  draggable={false}
                />
              </div>
            )}
            {listing.hasGreenTick && (
              <div className="verification-badge verification-badge-green inline-flex items-center justify-center bg-white rounded-full p-1.5 shadow-lg">
                <img 
                  src="/badges/greentick.jpeg"
                  alt="Vaccinated"
                  className="h-6 w-6 media-scroll-fix"
                  draggable={false}
                />
              </div>
            )}
          </div>
        </div>

        <CardContent className="p-3">
          <div className="space-y-2">
            <h3 className="font-medium text-base line-clamp-1">
              {listing.title}
            </h3>
            <p className="text-sm text-gray-600">{listing.breed}</p>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center text-xs text-gray-500 gap-0.5">
                <MapPin className="h-3 w-3" />
                <span>{listing.location}</span>
              </div>
              
              {priceDisplay && (
                <div className="flex items-center text-sm font-medium text-brand-dark-green gap-0.5">
                  <Euro className="h-3 w-3" />
                  <span>{priceDisplay.replace('€', '')}</span>
                </div>
              )}
            </div>

            {/* Puppy age + posted date for sale listings */}
            {listing.type === 'sale' && (puppyAgeLabel || postedOnLabel) && (
              <div className="text-xs text-gray-500 space-y-0.5">
                {puppyAgeLabel && <p>{puppyAgeLabel} old</p>}
                {postedOnLabel && <p>{postedOnLabel}</p>}
              </div>
            )}

            {/* Additional info for sale listings */}
            {listing.type === 'sale' && (listing.maleCount || listing.femaleCount) && (
              <div className="text-xs text-gray-500">
                {listing.maleCount ? `${listing.maleCount} males` : ''} 
                {listing.maleCount && listing.femaleCount ? ', ' : ''}
                {listing.femaleCount ? `${listing.femaleCount} females` : ''}
              </div>
            )}

            {/* Additional info for stud/showcase listings */}
            {(listing.type === 'stud' || listing.type === 'showcase') && listing.sex && (
              <div className="text-xs text-gray-500">
                {listing.sex}
                {listing.size && ` • ${listing.size}`}
                {listing.age && ` • ${listing.age}`}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
