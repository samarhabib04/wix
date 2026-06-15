
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, PawPrint } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart } from 'lucide-react';
import { IconTooltip } from '@/components/ui/tooltip';

interface ListingCard {
  id: string;
  title: string;
  price?: number;
  location: string;
  image: string;
  breed: string;
  verified?: boolean;
  type: 'sale' | 'stud' | 'showcase';
}

interface LinkType {
  to: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
}

interface ContinueSearchSectionProps {
  title: string;
  listings: ListingCard[];
  link1?: LinkType;
  link2?: LinkType;
  goldStarUrl: string;
  hideLinks?: boolean;
  backgroundColor?: string;
}

const ContinueSearchSection: React.FC<ContinueSearchSectionProps> = ({
  title,
  listings,
  link1,
  link2,
  goldStarUrl,
  hideLinks = false,
  backgroundColor
}) => {
  const router = useRouter();
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Default fallback image
  const DEFAULT_IMAGE_URL = "https://images.unsplash.com/photo-1605897472359-85e4b94d685d?q=80&w=800";

  const getListingUrl = (listing: ListingCard) => {
    switch (listing.type) {
      case 'sale':
        return `/listing/${listing.id}`;
      case 'stud':
        return `/stud/${listing.id}`;
      case 'showcase':
        return `/showcase/${listing.id}`;
      default:
        return `/listing/${listing.id}`;
    }
  };

  const handleCardClick = (listing: ListingCard) => {
    router.push(getListingUrl(listing));
  };

  const getImageUrl = (listing: ListingCard) => {
    // If image is empty or invalid, use fallback
    if (!listing.image || listing.image.trim() === '' || imageErrors[listing.id]) {
      return DEFAULT_IMAGE_URL;
    }
    return listing.image;
  };

  const handleImageError = (listingId: string) => {
    setImageErrors(prev => ({ ...prev, [listingId]: true }));
  };

  return (
    <div className={`w-full ${backgroundColor || 'bg-white'} pb-10 px-4`}>
      <div className="mx-auto w-full max-w-7xl">
        <PawPrint className="w-6 h-6 text-brand-dark-green" />
        <h2 className="text-2xl font-berkshire mb-4 text-center">{title}</h2>
        <Separator className="my-4 bg-brand-light-green/50" />
        
        {/* Related Listings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {listings.map((listing) => (
            <div key={listing.id} onClick={() => handleCardClick(listing)} className="cursor-pointer">
              <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                  <div className="relative">
                    <AspectRatio ratio={4/3} className="bg-muted">
                      <Image 
                        src={getImageUrl(listing)} 
                        alt={listing.title} 
                        fill
                        className="object-cover rounded-t-lg"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        loading="lazy"
                        quality={60}
                        onError={() => handleImageError(listing.id)}
                      />
                    </AspectRatio>
                    <div className="absolute top-2 right-2">
                      <button 
                        aria-label="Add to wishlist"
                        className="bg-white rounded-full p-1.5 shadow-md"
                      >
                        <Heart className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                    {listing.type !== 'sale' && (
                      <div className="absolute top-2 left-2">
                        <Badge 
                          className={`
                            ${listing.type === 'stud' ? 'bg-[#9b87f5] text-white' : 'bg-[#FFDEE2] text-gray-800'}
                            px-2 py-1 text-xs font-medium capitalize
                          `}
                        >
                          {listing.type}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg line-clamp-1">{listing.title}</h3>
                    </div>
                    {listing.price !== undefined && (
                      <p className="font-medium text-brand-dark-green mb-2">€{listing.price}</p>
                    )}
                    <div className="flex items-center text-gray-600 text-sm">
                      <span>{listing.location}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2">
                      {listing.verified && (
                        <IconTooltip content="This listing has been verified with a health check" contentClassName="bg-white text-gray-800">
                          <div className="relative w-5 h-5 cursor-pointer">
                            <Image src={goldStarUrl} alt="Verified" width={20} height={20} className="object-contain" loading="lazy" />
                          </div>
                        </IconTooltip>
                      )}
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 text-xs">
                        {listing.breed}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          ))}
        </div>
        
        {/* Navigation Links - only show if hideLinks is false and we have at least one link */}
        {!hideLinks && (link1 || link2) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            {link1 && (
              <Link href={link1.to || '#'}>
                <div className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-shadow duration-300 h-full flex flex-col items-center justify-center">
                  <div className={`${link1.bgColor} rounded-full p-4 mb-3`}>
                    {link1.icon}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{link1.label}</h3>
                  <p className="text-gray-600">{link1.description}</p>
                </div>
              </Link>
            )}
            {link2 && (
              <Link href={link2.to || '#'}>
                <div className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-shadow duration-300 h-full flex flex-col items-center justify-center">
                  <div className={`${link2.bgColor} rounded-full p-4 mb-3`}>
                    {link2.icon}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{link2.label}</h3>
                  <p className="text-gray-600">{link2.description}</p>
                </div>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContinueSearchSection;
