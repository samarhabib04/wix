'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, ArrowRight, ChevronDown, ChevronUp, Filter, X, Search, SlidersHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PaginatedGrid } from '@/components/PaginatedGrid';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { irishCounties } from '@/lib/utils/irish-data';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { ListingType } from '@/components/CarouselSection';
import NewListingCard from '@/components/NewListingCard';
import { useWishlist } from '@/hooks/use-wishlist';
import { useAuth } from '@/contexts/AuthContext';
import WishlistAuthModal from '@/components/WishlistAuthModal';
import { useToast } from '@/hooks/use-toast';
import {
  ilikePatternForBreed,
  saleListingBreedOrFilter,
  studListingBreedOrFilter,
} from '@/lib/utils/breed-match';
import { saleListingNotExpiredOrFilter } from '@/lib/listings/public-marketplace-sale-status';
import { listingMatchesCanonicalBreed } from '@/lib/utils/breed-utils';
import { isShowcasePuppyAgeExpired } from '@/lib/utils/showcase-age';
import {
  mapSaleRowToListingCard,
  mapShowcaseRowToListingCard,
  mapStudRowToListingCard,
} from '@/lib/listings/map-to-listing-card';

// Helper function to create breed slug
const createBreedSlug = (breedName: string): string => {
  return breedName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .trim();
};

// Helper function to extract size/grooming/energy from strings
const extractAttribute = (text: string): string => {
  if (!text) return 'Medium';

  // Extract the first word before any parentheses or additional description
  const match = text.match(/^([^(]+)/);
  return match ? match[1].trim() : text;
};

// Breed interface
interface Breed {
  id: string | number;
  breed: string;
  breed_type: string;
  description: string;
  size: string;
  grooming: string;
  energy: string;
  life_expectancy: string;
  image_url: string;
}

interface BreedDetailProps {
  breedType?: 'Pedigree' | 'Mixed';
}

const BreedDetail: React.FC<BreedDetailProps> = ({ breedType: initialBreedType }) => {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { toast } = useToast();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [breedType, setBreedType] = useState<'Pedigree' | 'Mixed' | null>(initialBreedType || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    sort: 'newest',
    county: 'all',
    type: 'all',
  });
  const [currentBreed, setCurrentBreed] = useState<Breed | null>(null);
  const [listings, setListings] = useState<ListingType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [wishlistAuthModalOpen, setWishlistAuthModalOpen] = useState(false);
  const [pendingWishlistListing, setPendingWishlistListing] = useState<ListingType | null>(null);

  // Fetch breed data from Supabase
  useEffect(() => {
    const fetchBreedData = async () => {
      if (!slug) return;

      try {
        setIsLoading(true);

        // Determine breed type from current URL path or prop
        const currentPath = pathname || (typeof window !== 'undefined' ? window.location.pathname : '');
        const isMixedBreed = initialBreedType === 'Mixed' || currentPath.includes('/mixed-breeds/');

        // Special handling for "crossbreeds" slug - show all mixed breeds
        if (slug === 'crossbreeds') {
          setBreedType('Mixed');
          setCurrentBreed({
            id: 'crossbreeds',
            breed: 'Crossbreeds',
            breed_type: 'Mixed Breed',
            description: 'Explore all our adorable crossbreed puppies including Cockapoos, Cavapoos, and more!',
            size: 'Various',
            grooming: 'Various',
            energy: 'Various',
            life_expectancy: '10-15 years',
            image_url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?q=80&w=600&auto=format&fit=crop'
          });

          // Fetch ALL mixed breed listings
          await fetchAllMixedBreedListings();
          setIsLoading(false);
          return;
        }

        const expectedBreedType = isMixedBreed ? 'Mixed Breed' : 'Pedigree';
        setBreedType(isMixedBreed ? 'Mixed' : 'Pedigree');

        let query = supabase
          .from('quiz_breeds')
          .select('*');

        // Filter by breed type based on the route
        query = query.eq('breed_type', expectedBreedType);

        const { data: breeds, error } = await query.order('breed');

        if (error) {
          console.error('Error fetching breeds:', error);
          return;
        }

        if (breeds) {
          // Find the breed that matches the slug
          const matchingBreed = breeds.find(breed =>
            createBreedSlug(breed.breed) === slug
          );

          if (matchingBreed) {
            setCurrentBreed({
              id: matchingBreed.id,
              breed: matchingBreed.breed,
              breed_type: matchingBreed.breed_type || '',
              description: matchingBreed.description || 'Gentle and family-loving companions',
              size: extractAttribute(matchingBreed.size || 'Medium'),
              grooming: extractAttribute(matchingBreed.grooming || 'Low'),
              energy: extractAttribute(matchingBreed.energy || 'Medium'),
              life_expectancy: matchingBreed.life_expectancy || '10-12 years',
              image_url: matchingBreed.image_url || 'https://images.unsplash.com/photo-1605897472359-85e4b94d685d?q=80&w=600&auto=format&fit=crop'
            });

            // Fetch listings for this breed
            await fetchListingsForBreed(matchingBreed.breed);
          }
        }
      } catch (error) {
        console.error('Error fetching breed data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBreedData();
  }, [slug, pathname, initialBreedType]);

  // Helper function to get breed display name
  const getBreedDisplayName = (breed1: string | null, breed2: string | null, breed_type: string | null) => {
    if (breed_type === 'crossbreed' && breed1 && breed2) {
      return `${breed1} x ${breed2}`;
    }

    if (breed1) {
      return breed1;
    }

    return 'Mixed Breed';
  };

  // Fetch listings for the current breed
  const fetchListingsForBreed = async (breedName: string) => {
    try {
      setIsLoadingListings(true);
      const allListings: ListingType[] = [];
      let listingCounter = 0; // Counter for generating numeric IDs

      const pattern = ilikePatternForBreed(breedName);
      const saleOr = saleListingBreedOrFilter(breedName);
      const studOr = studListingBreedOrFilter(breedName);

      // Fetch sale listings (breed columns + title; then canonical match)
      const { data: saleListings, error: saleError } = await supabase
        .from('sale_listings')
        .select('*')
        .or(saleOr)
        .eq('is_published', true)
        .eq('admin_approved', true)
        .neq('status', 'pending_re_approval')
        .neq('status', 'rejected')
        .or(saleListingNotExpiredOrFilter());

      if (saleError) {
        console.error('Error fetching sale listings:', saleError);
      } else if (saleListings) {
        saleListings
          .filter((listing) => listingMatchesCanonicalBreed(listing, breedName))
          .forEach((listing) => {
            allListings.push(
              mapSaleRowToListingCard(listing as Record<string, unknown>, ++listingCounter)
            );
          });
      }

      // Fetch stud listings (breed columns + title; then canonical match)
      const { data: studListings, error: studError } = await supabase
        .from('stud_listings')
        .select('*')
        .eq('admin_approved', true)
        .eq('is_published', true)
        .or(studOr)
        .order('created_at', { ascending: false })
        .limit(12);

      if (studError) {
        console.error('Error fetching stud listings:', studError);
      } else if (studListings) {
        studListings
          .filter((listing) => listingMatchesCanonicalBreed(listing, breedName))
          .slice(0, 6)
          .forEach((listing) => {
            allListings.push(
              mapStudRowToListingCard(
                listing as Record<string, unknown>,
                ++listingCounter,
                getBreedDisplayName(listing.breed1, listing.breed2, listing.breed_type)
              )
            );
          });
      }

      // Fetch showcase listings (breed + title; then canonical match)
      const { data: showcaseListings, error: showcaseError } = await supabase
        .from('showcase_listings')
        .select('*')
        .or(`breed.ilike.${pattern},title.ilike.${pattern}`)
        .eq('is_published', true)
        .eq('admin_approved', true);

      if (showcaseError) {
        console.error('Error fetching showcase listings:', showcaseError);
      } else if (showcaseListings) {
        showcaseListings
          .filter((listing) => !isShowcasePuppyAgeExpired(listing.date_of_birth, listing.created_at))
          .filter((listing) => listingMatchesCanonicalBreed(listing, breedName))
          .forEach((listing) => {
            allListings.push(
              mapShowcaseRowToListingCard(listing as Record<string, unknown>, ++listingCounter)
            );
          });
      }

      setListings(allListings);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setIsLoadingListings(false);
    }
  };

  // Fetch ALL mixed breed listings (for crossbreeds page)
  const fetchAllMixedBreedListings = async () => {
    try {
      setIsLoadingListings(true);
      const allListings: ListingType[] = [];
      let listingCounter = 0;

      // Fetch all sale listings where breed_type is 'crossbreed' or 'Mixed Breed'
      const { data: saleListings, error: saleError } = await supabase
        .from('sale_listings')
        .select('*')
        .eq('breed_type', 'crossbreed')
        .eq('is_published', true)
        .eq('admin_approved', true)
        .neq('status', 'pending_re_approval')
        .neq('status', 'rejected');

      if (saleError) {
        console.error('Error fetching mixed breed sale listings:', saleError);
      } else if (saleListings) {
        saleListings.forEach((listing) => {
          allListings.push(
            mapSaleRowToListingCard(listing as Record<string, unknown>, ++listingCounter)
          );
        });
      }

      // Fetch stud listings for mixed breeds
      const { data: studListings, error: studError } = await supabase
        .from('stud_listings')
        .select('*')
        .eq('breed_type', 'crossbreed')
        .eq('admin_approved', true)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (studError) {
        console.error('Error fetching mixed breed stud listings:', studError);
      } else if (studListings) {
        studListings.forEach((listing) => {
          allListings.push(
            mapStudRowToListingCard(
              listing as Record<string, unknown>,
              ++listingCounter,
              getBreedDisplayName(listing.breed1, listing.breed2, listing.breed_type)
            )
          );
        });
      }

      // Fetch showcase listings for mixed breeds
      const { data: showcaseListings, error: showcaseError } = await supabase
        .from('showcase_listings')
        .select('*')
        .eq('breed_type', 'crossbreed')
        .eq('is_published', true)
        .eq('admin_approved', true);

      if (showcaseError) {
        console.error('Error fetching mixed breed showcase listings:', showcaseError);
      } else if (showcaseListings) {
        showcaseListings
          .filter((listing) => !isShowcasePuppyAgeExpired(listing.date_of_birth, listing.created_at))
          .forEach((listing) => {
            allListings.push(
              mapShowcaseRowToListingCard(listing as Record<string, unknown>, ++listingCounter)
            );
          });
      }

      setListings(allListings);
    } catch (error) {
      console.error('Error fetching all mixed breed listings:', error);
    } finally {
      setIsLoadingListings(false);
    }
  };

  // Filter handlers
  const handleSortChange = (value: string) => {
    setFilters(prev => ({ ...prev, sort: value }));
  };

  const handleCountyChange = (value: string) => {
    setFilters(prev => ({ ...prev, county: value }));
  };

  const handleTypeChange = (value: string) => {
    setFilters(prev => ({ ...prev, type: value }));
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilters({
      sort: 'newest',
      county: 'all',
      type: 'all',
    });
  };

  // Filter and sort listings
  const filteredListings = listings
    .filter(listing => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = listing.title?.toLowerCase().includes(query);
        const matchesBreed = listing.breed?.toLowerCase().includes(query);
        const matchesLocation = listing.location?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesBreed && !matchesLocation) return false;
      }

      if (filters.county !== 'all') {
        if (!listing.location) return false;
        // Use includes for more flexible matching (e.g. "Dublin" matches "Co. Dublin")
        if (!listing.location.includes(filters.county)) return false;
      }
      if (filters.type !== 'all' && listing.type !== filters.type) return false;
      return true;
    })
    .sort((a, b) => {
      // Sort by boost status first (all tiers equal - just boosted vs not boosted)
      const aHasBoost = !!a.boostType;
      const bHasBoost = !!b.boostType;

      if (aHasBoost && !bHasBoost) return -1;
      if (!aHasBoost && bHasBoost) return 1;

      // Both boosted or both not boosted - apply user-selected sort
      switch (filters.sort) {
        case 'oldest':
          return a.id - b.id;
        case 'price_low':
          return a.price - b.price;
        case 'price_high':
          return b.price - a.price;
        default: // newest
          return b.id - a.id;
      }
    });

  // Wishlist handlers bbbb
  const handleToggleWishlist = useCallback((id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      const listing = listings.find(l => l.id === id);
      if (listing) {
        setPendingWishlistListing(listing);
        setWishlistAuthModalOpen(true);
      }
      return;
    }

    const isCurrentlyWishlisted = isInWishlist(id.toString());

    if (isCurrentlyWishlisted) {
      removeFromWishlist(id.toString());
    } else {
      const listing = listings.find(l => l.id === id);
      if (listing && listing.type) {
        addToWishlist(id.toString(), listing.type);
      }
    }
  }, [user, listings, isInWishlist, addToWishlist, removeFromWishlist]);

  // Navigation handler
  const handleCardClick = useCallback((listing: ListingType) => {
    const originalId = listing.originalId || listing.id;

    switch (listing.type) {
      case 'listing':
        router.push(`/listing/${originalId}`);
        break;
      case 'showcase':
        router.push(`/showcase/${originalId}`);
        break;
      case 'stud':
        router.push(`/stud/${originalId}`);
        break;
      default:
    }
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#E1E8E0]">
        <div className="container px-4 sm:px-6 py-6 md:py-10 mx-auto">
          <div className="animate-pulse">
            <div className="h-64 md:h-96 bg-gray-200 rounded-lg mb-8"></div>
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-8"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentBreed) {
    return (
      <div className="min-h-screen bg-[#E1E8E0]">
        <div className="container px-4 sm:px-6 py-6 md:py-10 mx-auto">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold text-gray-700 mb-4">Breed Not Found</h1>
            <p className="text-gray-500 mb-6">The breed you're looking for doesn't exist in this category.</p>
            <div className="flex gap-4 justify-center">
              <Button asChild variant="outline">
                <Link href="/breeds">Browse Pedigree Breeds</Link>
              </Button>
              <Button asChild>
                <Link href="/mixed-breeds">Browse Mixed Breeds</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* WishlistAuthModal */}
      <WishlistAuthModal
        open={wishlistAuthModalOpen}
        onOpenChange={setWishlistAuthModalOpen}
        itemToSave={pendingWishlistListing ? {
          id: pendingWishlistListing.id.toString(),
          type: pendingWishlistListing.type || 'listing'
        } : undefined}
      />

      <div className="min-h-screen bg-[#E1E8E0]">
        <div className="container px-4 sm:px-6 py-6 md:py-10 mx-auto">
          {/* Breed Info Tile Section */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="overflow-hidden">
              {/* Mobile Layout */}
              <div className="md:hidden">
                <div className="relative aspect-square">
                  <img
                    src={currentBreed.image_url}

                    alt={currentBreed.breed}
                    className="w-full h-full object-cover"
                  />

                  {/* Overlay pills in corners */}
                  <div className="absolute inset-0 p-4">
                    {/* Top left - Size */}
                    <Badge className="absolute top-4 left-4 bg-white/80 text-brand-dark-green hover:bg-white/90 backdrop-blur-sm">
                      {currentBreed.size}
                    </Badge>

                    {/* Top right - Grooming */}
                    <Badge className="absolute top-4 right-4 bg-white/80 text-brand-dark-green hover:bg-white/90 backdrop-blur-sm">
                      {currentBreed.grooming} Grooming
                    </Badge>

                    {/* Bottom left - Energy */}
                    <Badge className="absolute bottom-4 left-4 bg-white/80 text-brand-dark-green hover:bg-white/90 backdrop-blur-sm">
                      {currentBreed.energy} Energy
                    </Badge>

                    {/* Bottom right - Life Expectancy */}
                    <Badge className="absolute bottom-4 right-4 bg-white/80 text-brand-dark-green hover:bg-white/90 backdrop-blur-sm">
                      {currentBreed.life_expectancy}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-6">
                  <h1 className="text-3xl font-berkshire text-brand-dark-green mb-2">
                    {currentBreed.breed}
                  </h1>
                  <p className="text-lg text-gray-600">
                    {currentBreed.description}
                  </p>
                </CardContent>
              </div>

              {/* Desktop Layout - 2/3 image, 1/3 content */}
              <div className="hidden md:flex w-full">
                {/* Image section - 1/2 width (Changed from w-2/3) */}
                <div className="relative w-1/2 aspect-[4/3]">
                  <img
                    src={currentBreed.image_url}
                    alt={currentBreed.breed}
                    /* Changed object-contain to object-cover to remove white space */
                    className="w-full h-full object-cover bg-gray-50"
                  />

                  {/* Overlay pills in corners */}
                  <div className="absolute inset-0 p-4">
                    {/* Top left - Size */}
                    <Badge className="absolute top-4 left-4 bg-white/80 text-brand-dark-green hover:bg-white/90 backdrop-blur-sm">
                      {currentBreed.size}
                    </Badge>

                    {/* Top right - Grooming */}
                    <Badge className="absolute top-4 right-4 bg-white/80 text-brand-dark-green hover:bg-white/90 backdrop-blur-sm">
                      {currentBreed.grooming} Grooming
                    </Badge>

                    {/* Bottom left - Energy */}
                    <Badge className="absolute bottom-4 left-4 bg-white/80 text-brand-dark-green hover:bg-white/90 backdrop-blur-sm">
                      {currentBreed.energy} Energy
                    </Badge>

                    {/* Bottom right - Life Expectancy */}
                    <Badge className="absolute bottom-4 right-4 bg-white/80 text-brand-dark-green hover:bg-white/90 backdrop-blur-sm">
                      {currentBreed.life_expectancy}
                    </Badge>
                  </div>
                </div>

                {/* Content section - 1/2 width (Changed from w-1/3) */}
                <div className="w-1/2 p-8 flex flex-col justify-center">
                  <h1 className="text-4xl font-berkshire text-brand-dark-green mb-4">
                    {currentBreed.breed}
                  </h1>
                  <p className="text-lg text-gray-600 leading-relaxed">
                    {currentBreed.description}
                  </p>
                </div>
              </div>

            </Card>
          </motion.div>

          {/* Filters Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8"
          >
            <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search Bar - takes more space on desktop */}
                <div className="relative w-full lg:flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by title, breed, or location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full h-12 border-2 border-gray-200 focus:border-brand-soft-green"
                  />
                </div>

                <div className="flex flex-col lg:flex-row gap-4 lg:contents">
                  {/* Sort Filter */}
                  <Select value={filters.sort} onValueChange={handleSortChange}>
                    <SelectTrigger className="w-full lg:w-[180px] h-12 border-2 border-gray-200 focus:border-brand-soft-green bg-white">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="price_low">Price: Low to High</SelectItem>
                      <SelectItem value="price_high">Price: High to Low</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* County Filter */}
                  <Select value={filters.county} onValueChange={handleCountyChange}>
                    <SelectTrigger className="w-full lg:w-[180px] h-12 border-2 border-gray-200 focus:border-brand-soft-green bg-white">
                      <SelectValue placeholder="All Counties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Counties</SelectItem>
                      {irishCounties.map(county => (
                        <SelectItem key={county} value={county}>{county}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Type Filter */}
                  <Select value={filters.type} onValueChange={handleTypeChange}>
                    <SelectTrigger className="w-full lg:w-[180px] h-12 border-2 border-gray-200 focus:border-brand-soft-green bg-white">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="listing">For Sale</SelectItem>
                      <SelectItem value="stud">Stud</SelectItem>
                      <SelectItem value="showcase">Showcase</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Reset Button */}
                  <Button
                    variant="outline"
                    onClick={handleResetFilters}
                    className="w-full lg:w-auto h-12 border-2 border-gray-200 hover:border-brand-soft-green hover:bg-brand-soft-green hover:text-white transition-colors"
                  >
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Listings Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h2 className="text-2xl font-berkshire text-brand-dark-green mb-6">
              {currentBreed.breed} Listings (
              <span id="breed-listings-count" data-count={filteredListings.length}>
                {filteredListings.length}
              </span>
              )
            </h2>

            {isLoadingListings ? (
              <div className="text-center py-16">
                <div className="text-gray-500">Loading listings...</div>
              </div>
            ) : (
              <PaginatedGrid
                items={filteredListings}
                itemsPerPage={12}
                renderItem={(item) => (
                  <div key={item.id.toString()} className="w-full h-full">
                    <NewListingCard
                      listing={item}
                      isWishlisted={isInWishlist(item.id.toString())}
                      toggleWishlist={handleToggleWishlist}
                      onCardClick={handleCardClick}
                      hasReservations={false}
                    />
                  </div>
                )}
                emptyState={
                  <div className="text-center py-16 bg-gray-50 rounded-lg">
                    <h3 className="text-xl font-medium text-gray-700 mb-2">
                      No {currentBreed.breed} listings found
                    </h3>
                    <p className="text-gray-500 mb-6">
                      Try adjusting your filters or check back later for new listings.
                    </p>
                    <div className="flex justify-center space-x-4">
                      <Button asChild>
                        <Link href="/listings">Browse All Listings</Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href="/quiz">Start Your Journey</Link>
                      </Button>
                    </div>
                  </div>
                }
              />
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default BreedDetail;

