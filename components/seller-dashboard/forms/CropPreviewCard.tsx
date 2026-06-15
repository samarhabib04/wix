'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Euro } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CropPreviewCardProps {
  listingType: 'sale' | 'showcase' | 'stud' | 'marketplace' | 'business' | null;
  previewImage: string | null;
  cropType?: 'logo' | 'banner' | null; // For business listings, specify if cropping logo or banner
}

export const CropPreviewCard: React.FC<CropPreviewCardProps> = ({
  listingType,
  previewImage,
  cropType = null
}) => {
  // Get type badge styling
  const getTypeBadge = () => {
    switch(listingType) {
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
      case 'marketplace':
        return {
          text: 'Product',
          className: 'bg-purple-100 text-purple-800'
        };
      default:
        return {
          text: 'Listing',
          className: 'bg-gray-100 text-gray-800'
        };
    }
  };

  const typeBadge = getTypeBadge();

  // Render sale/showcase/stud card (UnifiedListingCard style)
  if (listingType === 'sale' || listingType === 'showcase' || listingType === 'stud') {
    return (
      <div className="w-full max-w-xs mx-auto">
        <Card className="rounded-3xl overflow-hidden h-full p-0 bg-white border border-gray-100 shadow-sm">
          <div className="relative">
            <div className="aspect-square overflow-hidden">
              {previewImage ? (
                <img 
                  src={previewImage} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">Preview</span>
                </div>
              )}
            </div>
            
            {/* Type badge */}
            <div className="absolute top-2 left-2">
              <Badge className={typeBadge.className}>
                {typeBadge.text}
              </Badge>
            </div>
          </div>

          <CardContent className="p-3">
            <div className="space-y-2">
              <h3 className="font-medium text-base line-clamp-1">
                Sample Listing Title
              </h3>
              <p className="text-sm text-gray-600">Breed Name</p>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center text-xs text-gray-500 gap-0.5">
                  <MapPin className="h-3 w-3" />
                  <span>Location</span>
                </div>
                
                {listingType === 'sale' && (
                  <div className="flex items-center text-sm font-medium text-brand-dark-green gap-0.5">
                    <Euro className="h-3 w-3" />
                    <span>1,500</span>
                  </div>
                )}
                {listingType === 'stud' && (
                  <div className="flex items-center text-sm font-medium text-brand-dark-green gap-0.5">
                    <Euro className="h-3 w-3" />
                    <span>500</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render marketplace product card
  if (listingType === 'marketplace') {
    return (
      <div className="w-full max-w-xs mx-auto">
        <Card className="h-full overflow-hidden border-2 border-gray-100 flex flex-col">
          <div className="relative overflow-hidden">
            <div className="aspect-square overflow-hidden bg-gray-100 flex items-center justify-center">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt="Product preview"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">Preview</span>
                </div>
              )}
            </div>
          </div>
          
          <CardContent className="flex-1 flex flex-col p-4">
            <h3 className="font-semibold text-base mb-1 line-clamp-2">
              Sample Product Name
            </h3>
            <p className="text-sm text-gray-600 mb-2">Product Category</p>
            <div className="mt-auto">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-brand-dark-green">
                  €29.99
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Business listing preview (banner + logo)
  if (listingType === 'business') {
    // Show preview only in the position being cropped
    // When cropping logo, only show preview in logo position
    // When cropping banner, only show preview in banner position
    const showBannerPreview = cropType === 'banner' && previewImage;
    const showLogoPreview = cropType === 'logo' && previewImage;
    
    return (
      <div className="w-full max-w-xs mx-auto">
        <Card className="overflow-hidden border-2 border-brand-soft-green rounded-lg">
          <section className="w-full">
            {/* Banner Section */}
            <div className="relative w-full h-32 bg-gray-200">
              {showBannerPreview ? (
                <img
                  src={previewImage!}
                  alt="Banner preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-brand-dark-green to-brand-soft-green"></div>
              )}
            </div>

            {/* Logo and Details Section */}
            <div className="bg-white border-t border-gray-100">
              <div className="relative px-4 pt-8 pb-3">
                {/* Logo Avatar */}
                <div className="absolute left-4 top-0 -translate-y-1/2">
                  <div className="h-12 w-12 rounded-full border-4 border-white shadow-md bg-white overflow-hidden">
                    {showLogoPreview ? (
                      <img 
                        src={previewImage!} 
                        alt="Logo preview" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full bg-brand-soft-green flex items-center justify-center text-white text-sm font-bold">
                        B
                      </div>
                    )}
                  </div>
                </div>

                {/* Business Details */}
                <div className="pl-14">
                  <h2 className="text-lg font-berkshire text-gray-900 mb-1">
                    Business Name
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span>Business Type</span>
                    <span className="text-gray-400">•</span>
                    <span>County</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </Card>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="w-full max-w-xs mx-auto">
      <Card className="rounded-lg overflow-hidden h-full p-0 bg-white border border-gray-200 shadow-sm">
        <div className="relative">
          <div className="aspect-square overflow-hidden">
            {previewImage ? (
              <img 
                src={previewImage} 
                alt="Preview" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400 text-sm">Preview</span>
              </div>
            )}
          </div>
        </div>
        <CardContent className="p-3">
          <h3 className="font-medium text-base">Sample Listing</h3>
        </CardContent>
      </Card>
    </div>
  );
};
