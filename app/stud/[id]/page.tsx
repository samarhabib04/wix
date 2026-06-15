'use client';

import { formatBreedName } from '@/lib/utils/breed-utils';
import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Heart, MapPin, Check, MessageCircle, Dog, Calendar, UserRound, Info, PawPrint, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { IconTooltip } from '@/components/ui/tooltip';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import ListingCarouselSection from '@/components/listings/ListingCarouselSection';
import FamilyTreeSection from '@/components/listings/FamilyTreeSection';
import ContinueSearchSection from '@/components/listings/ContinueSearchSection';
import { useStudDetail } from '@/hooks/use-stud-detail';
import { resolveSellerLinkLabel } from '@/lib/utils/seller-display';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import BusinessBoostCarousel from '@/components/business/BusinessBoostCarousel';
import MarketplaceProductBoostCarousel from '@/components/marketplace/MarketplaceProductBoostCarousel';

// Custom image URLs
const GREEN_TICK_URL = "/badges/greentick.jpeg";
const GOLD_STAR_URL = "/badges/goldernstart.jpeg";

const StudDetail: React.FC = () => {
  const params = useParams();
  const id = params?.id as string;
  const { data: listing, isLoading, error } = useStudDetail(id || '');
  const { toast } = useToast();

  const [isWishListed, setIsWishListed] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  // Fetch randomized similar stud listings - only from stud_listings for Stud listings
  const { data: similarStudListings = [] } = useQuery({
    queryKey: ['similar-stud-listings', id],
    queryFn: async () => {
      // Fetch only from stud_listings (Stud category)
      const { data: studData } = await supabase
        .from('stud_listings')
        .select('id, title, location, images, breed1, gold_star, green_tick')
        .eq('admin_approved', true)
        .eq('is_published', true)
        .neq('id', id)
        .limit(10);

      const allListings = (studData || []).map(item => ({
        id: item.id,
        title: item.title,
        location: item.location,
        image: Array.isArray(item.images) ? item.images[0] : (item.images as any)?.[0] || '',
        breed: formatBreedName(item.breed1 || 'Mixed Breed'),
        verified: item.gold_star || item.green_tick,
        type: 'stud' as const
      }));

      // Randomize and return 4 listings
      return allListings.sort(() => Math.random() - 0.5).slice(0, 4);
    },
    enabled: !!id,
  });

  // Helper functions
  const getBreedDisplayName = (breed1: string | null | undefined, breed2: string | null | undefined, breed_type: string | null | undefined) => {
    if (breed_type === 'crossbreed' && breed1 && breed2) {
      return `${formatBreedName(breed1)} - ${formatBreedName(breed2)}`;
    }
    
    if (breed1) {
      return formatBreedName(breed1);
    }
    
    return 'Mixed Breed';
  };

  const calculateAge = (dobString: string) => {
    const dob = new Date(dobString);
    const now = new Date();
    const ageInYears = Math.floor((now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return ageInYears > 0 ? `${ageInYears} year${ageInYears > 1 ? 's' : ''}` : 'Less than 1 year';
  };

  const handleWishlistToggle = () => {
    setIsWishListed(!isWishListed);
    toast({
      title: isWishListed ? "Removed from wishlist" : "Added to wishlist",
      description: isWishListed ? "The stud has been removed from your wishlist." : "The stud has been added to your wishlist.",
    });
  };

  const handleContactSeller = () => {
    setContactModalOpen(true);
  };

  const handleSubmitContact = () => {
    setContactModalOpen(false);
    toast({
      title: "Message Sent",
      description: "Your message has been sent to the seller.",
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading stud details...</div>
      </div>
    );
  }

  // Error or not found state
  if (error || !listing) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Stud Not Found</h1>
          <p className="text-gray-600 mb-4">The stud listing you're looking for could not be found.</p>
          <Link href="/stud">
            <Button className="bg-blue-500 hover:bg-blue-600">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Stud Listings
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Create family tree object for FamilyTreeSection - always show even if empty
  const familyTree = {
    mother: {
      name: listing.mother_name || '',
      breed: listing.mother_breed || '',
      image: listing.mother_image || ''
    },
    father: {
      name: listing.father_name || '',
      breed: listing.father_breed || '',
      image: listing.father_image || ''
    },
    grandparents: {
      maternalGrandmother: {
        name: listing.maternal_grandmother_name || '',
        breed: listing.maternal_grandmother_breed || '',
        image: listing.maternal_grandmother_image || ''
      },
      maternalGrandfather: {
        name: listing.maternal_grandfather_name || '',
        breed: listing.maternal_grandfather_breed || '',
        image: listing.maternal_grandfather_image || ''
      },
      paternalGrandmother: {
        name: listing.paternal_grandmother_name || '',
        breed: listing.paternal_grandmother_breed || '',
        image: listing.paternal_grandmother_image || ''
      },
      paternalGrandfather: {
        name: listing.paternal_grandfather_name || '',
        breed: listing.paternal_grandfather_breed || '',
        image: listing.paternal_grandfather_image || ''
      }
    }
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        {/* Two column layout for medium screens and up */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Left column - Image carousel and seller info */}
          <div className="space-y-6">
            {/* Image carousel with wishlist button */}
            <div className="relative">
              {/* Stud badge - positioned absolutely at top left of carousel */}
              <div className="absolute top-3 left-3 z-10">
                <Badge className="bg-blue-500 text-white px-3 py-1.5">Stud</Badge>
              </div>
              
              <ListingCarouselSection 
                title={listing.title}
                images={listing.images}
                video={listing.video_url}
                isWishListed={isWishListed}
                onWishlistToggle={handleWishlistToggle}
              />
            </div>

            {/* Seller information — always show here (CSS media + isMobile caused missing card on some viewports/hydration) */}
            <section>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Seller Information</h2>
                    <div className="flex gap-2">
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        <Check className="w-3 h-3 mr-1" />
                        Phone Verified
                      </Badge>
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        <Check className="w-3 h-3 mr-1" />
                        Email Verified
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center mb-2">
                        <Link
                          href={`/users/${listing.user_id}`}
                          className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {resolveSellerLinkLabel(
                            listing.seller_name,
                            listing.user_id
                          )}
                        </Link>
                      </div>
                      {listing.location?.trim() ? (
                        <p className="text-gray-600 mb-2">County: {listing.location}</p>
                      ) : null}
                    </div>

                    {(listing.vet_name?.trim() || listing.vet_location?.trim()) && (
                      <div>
                        {listing.vet_name?.trim() ? (
                          <p className="mb-2">
                            <span className="font-semibold">Vet:</span> {listing.vet_name}
                          </p>
                        ) : null}
                        {listing.vet_location?.trim() ? (
                          <p className="mb-2">
                            <span className="font-semibold">Vet Location:</span>{' '}
                            {listing.vet_location}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Right column - Listing details */}
          <div className="space-y-6">
            {/* Listing information */}
            <section>
              <div className="space-y-2 text-gray-700">
                {/* Title */}
                <h1 className="text-3xl font-berkshire">{listing.title}</h1>
                
                {/* Updated Badges Section with Symbols instead of Pills */}
                <div className="flex flex-wrap gap-2 mb-12 mt-4">
                  {listing.gold_star && (
                    <IconTooltip content="This listing has been verified with a health check" contentClassName="bg-white text-gray-800">
                      <div className="w-8 h-8 flex items-center justify-center cursor-pointer">
                        <img src={GOLD_STAR_URL} alt="Health Checked" className="w-full h-full object-contain" />
                      </div>
                    </IconTooltip>
                  )}
                  {listing.green_tick && (
                    <IconTooltip content="This dog has received its vaccinations from a licensed vet" contentClassName="bg-white text-gray-800">
                      <div className="w-8 h-8 flex items-center justify-center cursor-pointer">
                        <img src={GREEN_TICK_URL} alt="Vaccinated" className="w-full h-full object-contain" />
                      </div>
                    </IconTooltip>
                  )}
                </div>

                {/* Price */}
                <div className="bg-[#E1E8E0] mt-8 p-3 rounded-lg inline-block">
                  <h3 className="text-2xl font-bold text-brand-dark-green">
                    {listing.pick_of_litter ? 'Pick of the Litter' : `€${listing.stud_fee}`}
                  </h3>
                </div>

                {/* Breed - With icon */}
                <div className="flex items-center">
                  <IconTooltip content="Breed" className="mr-1">
                    <Dog className="w-4 h-4 text-blue-500" />
                  </IconTooltip>
                  <span className="font-medium text-blue-500">Breed:</span>
                  <span className="ml-2">{getBreedDisplayName(listing.breed1, listing.breed2, listing.breed_type)}</span>
                </div>

                {/* Location - With icon */}
                <div className="flex items-center">
                  <IconTooltip content="Location" className="mr-1">
                    <MapPin className="w-4 h-4 text-blue-500" />
                  </IconTooltip>
                  <span className="font-medium text-blue-500">Location:</span>
                  <span className="ml-2">{listing.location}</span>
                </div>

                {/* Age - With icon */}
                <div className="flex items-center">
                  <IconTooltip content="Age" className="mr-1">
                    <Calendar className="w-4 h-4 text-blue-500" />
                  </IconTooltip>
                  <span className="font-medium text-blue-500">Age:</span>
                  <span className="ml-2">{calculateAge(listing.dob)}</span>
                </div>
              </div>
            </section>

            {/* Action buttons - desktop version and mobile */}
            <section className="flex justify-start">
              <div className="group relative overflow-hidden w-full max-w-xs">
                <Button 
                  onClick={handleContactSeller}
                  className="w-full h-32 md:h-36 lg:h-40 flex flex-col items-center justify-center gap-3 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.02] border-0 relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative z-10">
                    <div className="p-3 bg-white/15 rounded-2xl group-hover:bg-white/25 transition-all duration-300 backdrop-blur-sm">
                      <MessageCircle className="h-7 w-7 md:h-8 md:w-8 lg:h-9 lg:w-9" />
                    </div>
                    <div className="text-center mt-2">
                      <span className="text-lg md:text-xl lg:text-2xl font-bold block tracking-wide">Contact</span>
                      <span className="text-xs md:text-sm opacity-95 font-medium">Message Seller</span>
                    </div>
                  </div>
                </Button>
                <div className="absolute top-3 right-3 z-20">
                  <IconTooltip 
                    content="Message the seller to inquire about this stud" 
                    contentClassName="bg-white text-gray-800 z-[9999]"
                  >
                    <div className="p-1.5 bg-black/15 rounded-full hover:bg-black/25 transition-colors backdrop-blur-sm">
                      <Info className="h-4 w-4 text-white" />
                    </div>
                  </IconTooltip>
                </div>
              </div>
            </section>

            {/* Listing description */}
            <section>
              <h2 className="text-2xl font-berkshire mb-4">Description</h2>
              <div className="whitespace-pre-line bg-white pt-2 pb-6 rounded-lg shadow-sm break-words overflow-wrap">
                {listing.description}
              </div>
            </section>

            {/* Stud Details Section */}
            <section>
              <Card>
                <CardContent className="p-6 bg-blue-50 border border-blue-200">
                  <h2 className="text-2xl font-berkshire mb-4">Stud Details</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      {listing.microchip_number && (
                        <div>
                          <p className="font-semibold text-gray-700">Microchip Number</p>
                          <p className="text-gray-600">{listing.microchip_number}</p>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-700">Age</p>
                        <p className="text-gray-600">{calculateAge(listing.dob)}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Breed</p>
                        <p className="text-gray-600">{getBreedDisplayName(listing.breed1, listing.breed2, listing.breed_type)}</p>
                      </div>
                      {listing.sex && (
                        <div>
                          <p className="font-semibold text-gray-700">Sex</p>
                          <p className="text-gray-600">{listing.sex}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <p className="font-semibold text-gray-700">Stud Fee</p>
                        <p className="text-gray-600">
                          {listing.pick_of_litter ? 'Pick of the Litter' : `€${listing.stud_fee}`}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Date of Birth</p>
                        <p className="text-gray-600">{new Date(listing.dob).toLocaleDateString()}</p>
                      </div>
                      {(listing.vet_name?.trim() || listing.vet_location?.trim()) && (
                        <div>
                          <p className="font-semibold text-gray-700">Veterinarian</p>
                          {listing.vet_name?.trim() ? (
                            <p className="text-gray-600">{listing.vet_name}</p>
                          ) : null}
                          {listing.vet_location?.trim() ? (
                            <p className="text-gray-500 text-sm">{listing.vet_location}</p>
                          ) : null}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-700">Verification Status</p>
                        <div className="flex items-center gap-2 mt-1">
                          {listing.gold_star && (
                            <div className="flex items-center">
                              <img src={GOLD_STAR_URL} alt="Health Checked" className="w-4 h-4 mr-1" />
                              <span className="text-sm text-gray-600">Health Checked</span>
                            </div>
                          )}
                          {listing.green_tick && (
                            <div className="flex items-center">
                              <img src={GREEN_TICK_URL} alt="Vaccinated" className="w-4 h-4 mr-1" />
                              <span className="text-sm text-gray-600">Vaccinated</span>
                            </div>
                          )}
                          {!listing.gold_star && !listing.green_tick && (
                            <p className="text-gray-500">No verification badges</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

          </div>
        </div>

        {/* Family tree section - full width */}
        {familyTree && (
          <FamilyTreeSection 
            puppy={{
              title: listing.title,
              breed: getBreedDisplayName(listing.breed1, listing.breed2, listing.breed_type),
              image: listing.images[0] || ''
            }}
            familyTree={familyTree}
            backgroundColor="#E8F4FD"
            className="mb-8"
          />
        )}

        {/* Contact Modal */}
        <Dialog open={contactModalOpen} onOpenChange={setContactModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Contact Stud Owner</DialogTitle>
              <DialogDescription>Send a message to the owner about this stud.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-1">Message</label>
                <textarea 
                  id="message" 
                  rows={5} 
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Type your message here..."
                ></textarea>
              </div>
              <Button onClick={handleSubmitContact} className="w-full bg-blue-500 hover:bg-blue-600">Send Message</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Section 1: Looking for something else? - White Background */}
      <section className="bg-white py-12 px-4">
        <ContinueSearchSection
          title="Looking for something else?"
          listings={similarStudListings}
          goldStarUrl={GOLD_STAR_URL}
          hideLinks={true}
          backgroundColor="bg-white"
        />
      </section>

      {/* Business Boost Carousel */}
      <BusinessBoostCarousel title="Featured Businesses" />

      {/* Marketplace Product Boost Carousel */}
      <MarketplaceProductBoostCarousel title="Featured Products" />

      {/* Section 2: CTA Links - Split Cards with Custom Colors */}
      <section className="bg-[#E1E8E0] py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* View All Stud Services */}
            <Link href="/stud">
              <div className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-shadow duration-300 h-full flex flex-col items-center justify-center">
                <div className="bg-blue-100 rounded-full p-4 mb-3">
                  <ArrowLeft className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">View All Stud Services</h3>
                <p className="text-gray-600">Browse all available stud services</p>
              </div>
            </Link>

            {/* View Puppies for Sale */}
            <Link href="/listings">
              <div className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-shadow duration-300 h-full flex flex-col items-center justify-center">
                <div className="bg-brand-light-green rounded-full p-4 mb-3">
                  <PawPrint className="w-6 h-6 text-brand-dark-green" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Looking to Buy?</h3>
                <p className="text-gray-600">View puppies available for sale</p>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default StudDetail;






























