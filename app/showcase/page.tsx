'use client';

import React, { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MobileFiltersDrawer } from '@/components/MobileFiltersDrawer';
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, FilterIcon, Star, Check as CheckIcon, Worm, Home, ArrowRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Heart, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShowcasePageBanner } from "@/components/ShowcasePageBanner";
import { PaginatedGrid } from '@/components/PaginatedGrid';
import { DOG_BREEDS } from '@/data/dog-breeds';
import { supabase } from '@/lib/supabase/client';
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ShowcaseListing } from '@/types/blog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useWishlist } from "@/hooks/use-wishlist";
import { useAuth } from "@/contexts/AuthContext";
import WishlistAuthModal from "@/components/WishlistAuthModal";
import ShowcaseEmailModal from "@/components/ShowcaseEmailModal";
import { isShowcaseListingExpired } from '@/lib/utils/showcase-age';

import { useDebounce } from '@/hooks/useDebounce';

const isLoadingBreeds = false;

interface ListingCardProps {
  listing: ShowcaseListing;
  isWishlisted: boolean;
  toggleWishlist: (id: string, e: React.MouseEvent) => void;
  onCardClick: (listing: ShowcaseListing) => void;
}

// Updated the ListingCard component to fix the hover shadow border radius
const ListingCard: React.FC<ListingCardProps> = ({ listing, isWishlisted, toggleWishlist, onCardClick }) => {
  // Ensure we have a proper image source by checking if images is an array and has items
  const image = listing.images && Array.isArray(listing.images) && listing.images.length > 0
    ? listing.images[listing.primary_image_index || 0]
    : "https://images.unsplash.com/photo-1605897472359-85e4b94d685d?q=80&w=800";

  // Get boost glow styling based on boost type
  const getBoostGlow = () => {
    if (!listing.boostType) return '';

    switch (listing.boostType) {
      case 'standard':
        return 'shadow-boost-bronze';
      case 'premium':
        return 'shadow-boost-silver';
      case 'elite':
      case 'gold':
        return 'shadow-boost-gold';
      default:
        return '';
    }
  };

  const boostGlow = getBoostGlow();

  return (
    <div
      className="h-full transition-all duration-150 hover:shadow-lg hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft-green focus-visible:ring-offset-2 rounded-xl"
      tabIndex={0}
      role="button"
      aria-label={`View details for ${listing.title}`}
      onClick={() => onCardClick(listing)}
    >
      <div className={cn("rounded-xl overflow-hidden shadow-sm border-2 border-pink-200 h-full bg-white", boostGlow)}>
        <div className="relative">
          <div className="aspect-square overflow-hidden">
            <img
              src={image}
              alt={`${listing.breed} showcase listing preview`}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>

          <button
            className="absolute top-2 right-2 bg-white/70 p-1.5 rounded-full hover:bg-white/90 transition-colors"
            onClick={(e) => toggleWishlist(listing.id, e)}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart
              className={cn("w-5 h-5", isWishlisted ? "fill-red-500 stroke-red-500" : "stroke-gray-600")}
            />
          </button>

          {/* Showcase badge */}
          <div className="absolute top-2 left-2">
            <span className="px-2 py-1 bg-[#FFDEE2] text-gray-800 text-xs font-medium rounded-md">
              Showcase
            </span>
          </div>
        </div>

        <div className="p-3">
          <div className="space-y-2">
            <h3 className="font-medium text-base line-clamp-1">
              {listing.title}
            </h3>
            <p className="text-sm text-gray-600">{listing.breed}</p>
            <div className="flex justify-between items-center mt-1">
              <div className="flex items-center text-xs text-gray-500 gap-0.5">
                <MapPin className="h-3 w-3" />
                <span>{listing.location}</span>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Loading skeleton for showcase listings
const ShowcaseListingSkeleton = () => (
  <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100 h-full bg-white">
    <div className="relative">
      <Skeleton className="aspect-square w-full" />
    </div>
    <div className="p-3">
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex justify-between items-center mt-1">
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    </div>
  </div>
);

// Filter sidebar component
const FilterSidebar: React.FC<{
  filters: any;
  setFilters: React.Dispatch<React.SetStateAction<any>>;
  resetFilters: () => void;
  className?: string;
  embeddedInDrawer?: boolean;
}> = ({ filters, setFilters, resetFilters, className, embeddedInDrawer = false }) => {
  const [breedSearchTerm, setBreedSearchTerm] = useState("");

  // Filter breeds based on search term for the dropdown (use static list for performance)
  const filteredBreeds = DOG_BREEDS.filter(breed =>
    breed.toLowerCase().includes(breedSearchTerm.toLowerCase())
  );

  // Handle breed search - this will filter the listings by breed name
  const handleBreedSearch = useCallback((searchTerm: string) => {
    setBreedSearchTerm(searchTerm);
    // Set the breed filter to match the search term
    if (searchTerm.trim()) {
      // Find exact or partial matches in the breed list
      const matchingBreed = DOG_BREEDS.find(breed =>
        breed.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (matchingBreed) {
        setFilters((prev: any) => ({ ...prev, breed: matchingBreed, breedSearch: searchTerm }));
      } else {
        // If no exact match, use the search term for partial matching
        setFilters((prev: any) => ({ ...prev, breed: "", breedSearch: searchTerm }));
      }
    } else {
      // Clear the breed filter if search is empty
      setFilters((prev: any) => ({ ...prev, breed: "", breedSearch: "" }));
    }
  }, []);

  return (
    <div className={cn("bg-white rounded-lg p-4 space-y-6", className)}>
      <div>
        {!embeddedInDrawer && (
          <h2 className="text-xl font-berkshire text-brand-dark-green mb-4">Filters</h2>
        )}

        {/* Breed Filter - Fixed dropdown visibility */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-base font-medium">Breed</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-gray-400 cursor-help text-xs">(?)</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-[180px] text-sm">Search or select your preferred dog breed</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search breeds..."
              className="pl-8"
              value={breedSearchTerm}
              onChange={(e) => handleBreedSearch(e.target.value)}
            />
          </div>
          <div className="mt-2">
            <Select
              value={filters.breed || (filters.breedSearch ? "other" : "all-breeds")}
              onValueChange={(value) => {
                if (value === "all-breeds") {
                  setFilters((prev: any) => ({ ...prev, breed: "", breedSearch: "" }));
                  setBreedSearchTerm("");
                } else if (value === "other") {
                  // Use the search box above for custom breeds
                  setFilters((prev: any) => ({ ...prev, breed: "", breedSearch: breedSearchTerm }));
                } else {
                  setFilters((prev: any) => ({ ...prev, breed: value, breedSearch: "" }));
                  setBreedSearchTerm("");
                }
              }}
            >
              <SelectTrigger className="bg-white border-gray-300">
                <SelectValue placeholder="Select breed" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg z-[9999] max-h-60 overflow-y-auto">
                <SelectItem value="all-breeds" className="bg-white hover:bg-gray-100">All Breeds</SelectItem>
                <SelectItem value="other" className="bg-white hover:bg-gray-100">Other / Custom (use search)</SelectItem>
                {filteredBreeds.map((breed) => (
                  <SelectItem key={breed} value={breed} className="bg-white hover:bg-gray-100">
                    {breed}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* County Filter - Fixed dropdown visibility */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-base font-medium">County</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-gray-400 cursor-help text-xs">(?)</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-[180px] text-sm">Filter by county</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select
            value={filters.county || "all"}
            onValueChange={(value) => setFilters((prev: any) => ({ ...prev, county: value }))}
          >
            <SelectTrigger className="bg-white border-gray-300">
              <SelectValue placeholder="Select county" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg z-[9999] max-h-60 overflow-y-auto">
              <SelectItem value="all" className="bg-white hover:bg-gray-100">All Counties</SelectItem>
              <SelectItem value="antrim" className="bg-white hover:bg-gray-100">Antrim</SelectItem>
              <SelectItem value="armagh" className="bg-white hover:bg-gray-100">Armagh</SelectItem>
              <SelectItem value="carlow" className="bg-white hover:bg-gray-100">Carlow</SelectItem>
              <SelectItem value="cavan" className="bg-white hover:bg-gray-100">Cavan</SelectItem>
              <SelectItem value="clare" className="bg-white hover:bg-gray-100">Clare</SelectItem>
              <SelectItem value="cork" className="bg-white hover:bg-gray-100">Cork</SelectItem>
              <SelectItem value="derry" className="bg-white hover:bg-gray-100">Derry</SelectItem>
              <SelectItem value="donegal" className="bg-white hover:bg-gray-100">Donegal</SelectItem>
              <SelectItem value="down" className="bg-white hover:bg-gray-100">Down</SelectItem>
              <SelectItem value="dublin" className="bg-white hover:bg-gray-100">Dublin</SelectItem>
              <SelectItem value="fermanagh" className="bg-white hover:bg-gray-100">Fermanagh</SelectItem>
              <SelectItem value="galway" className="bg-white hover:bg-gray-100">Galway</SelectItem>
              <SelectItem value="kerry" className="bg-white hover:bg-gray-100">Kerry</SelectItem>
              <SelectItem value="kildare" className="bg-white hover:bg-gray-100">Kildare</SelectItem>
              <SelectItem value="kilkenny" className="bg-white hover:bg-gray-100">Kilkenny</SelectItem>
              <SelectItem value="laois" className="bg-white hover:bg-gray-100">Laois</SelectItem>
              <SelectItem value="leitrim" className="bg-white hover:bg-gray-100">Leitrim</SelectItem>
              <SelectItem value="limerick" className="bg-white hover:bg-gray-100">Limerick</SelectItem>
              <SelectItem value="longford" className="bg-white hover:bg-gray-100">Longford</SelectItem>
              <SelectItem value="louth" className="bg-white hover:bg-gray-100">Louth</SelectItem>
              <SelectItem value="mayo" className="bg-white hover:bg-gray-100">Mayo</SelectItem>
              <SelectItem value="meath" className="bg-white hover:bg-gray-100">Meath</SelectItem>
              <SelectItem value="monaghan" className="bg-white hover:bg-gray-100">Monaghan</SelectItem>
              <SelectItem value="offaly" className="bg-white hover:bg-gray-100">Offaly</SelectItem>
              <SelectItem value="roscommon" className="bg-white hover:bg-gray-100">Roscommon</SelectItem>
              <SelectItem value="sligo" className="bg-white hover:bg-gray-100">Sligo</SelectItem>
              <SelectItem value="tipperary" className="bg-white hover:bg-gray-100">Tipperary</SelectItem>
              <SelectItem value="tyrone" className="bg-white hover:bg-gray-100">Tyrone</SelectItem>
              <SelectItem value="waterford" className="bg-white hover:bg-gray-100">Waterford</SelectItem>
              <SelectItem value="westmeath" className="bg-white hover:bg-gray-100">Westmeath</SelectItem>
              <SelectItem value="wexford" className="bg-white hover:bg-gray-100">Wexford</SelectItem>
              <SelectItem value="wicklow" className="bg-white hover:bg-gray-100">Wicklow</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sex Filter */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-base font-medium">Sex</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-gray-400 cursor-help text-xs">(?)</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-[180px] text-sm">Filter by male or female</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select
            value={filters.sex || "all"}
            onValueChange={(value) => setFilters((prev: any) => ({ ...prev, sex: value === "all" ? "" : value }))}
          >
            <SelectTrigger className="bg-white border-gray-300">
              <SelectValue placeholder="Select sex" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg z-[9999]">
              <SelectItem value="all" className="bg-white hover:bg-gray-100">All</SelectItem>
              <SelectItem value="Male" className="bg-white hover:bg-gray-100">Male</SelectItem>
              <SelectItem value="Female" className="bg-white hover:bg-gray-100">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Size Filter */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-base font-medium">Size</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-gray-400 cursor-help text-xs">(?)</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-[180px] text-sm">Size of the dog</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select
            value={filters.size || "all"}
            onValueChange={(value) => setFilters((prev: any) => ({ ...prev, size: value === "all" ? "" : value }))}
          >
            <SelectTrigger className="bg-white border-gray-300">
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg z-[9999]">
              <SelectItem value="all" className="bg-white hover:bg-gray-100">All</SelectItem>
              <SelectItem value="Small" className="bg-white hover:bg-gray-100">Small</SelectItem>
              <SelectItem value="Medium" className="bg-white hover:bg-gray-100">Medium</SelectItem>
              <SelectItem value="Large" className="bg-white hover:bg-gray-100">Large</SelectItem>
              <SelectItem value="ExtraLarge" className="bg-white hover:bg-gray-100">Extra Large</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Energy Filter */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-base font-medium">Energy Level</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-gray-400 cursor-help text-xs">(?)</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-[180px] text-sm">Energy level of the dog</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select
            value={filters.energy || "all"}
            onValueChange={(value) => setFilters((prev: any) => ({ ...prev, energy: value === "all" ? "" : value }))}
          >
            <SelectTrigger className="bg-white border-gray-300">
              <SelectValue placeholder="Select energy level" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg z-[9999]">
              <SelectItem value="all" className="bg-white hover:bg-gray-100">All</SelectItem>
              <SelectItem value="Low" className="bg-white hover:bg-gray-100">Low</SelectItem>
              <SelectItem value="Moderate" className="bg-white hover:bg-gray-100">Moderate</SelectItem>
              <SelectItem value="High" className="bg-white hover:bg-gray-100">High</SelectItem>
              <SelectItem value="VeryHigh" className="bg-white hover:bg-gray-100">Very High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!embeddedInDrawer && (
        <Button
          onClick={resetFilters}
          className="w-full bg-brand-soft-green hover:bg-brand-dark-green transition-all"
        >
          Reset filters
        </Button>
      )}
    </div>
  );
};

// Main Listings component
const ShowcaseListings: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState({
    breed: "",
    sex: "",
    size: "",
    energy: "",
    county: "",
    breedSearch: "" // Add breed search to filters
  });

  // Initialize filters from URL parameters
  useEffect(() => {
    const breedParam = searchParams?.get('breed');
    const locationParam = searchParams?.get('location');

    if (breedParam) {
      setFilters((prev: any) => ({ ...prev, breed: breedParam }));
    }
    if (locationParam) {
      setFilters((prev: any) => ({ ...prev, county: locationParam.toLowerCase() }));
    }
  }, [searchParams]);

  // Use the wishlist hook to manage wishlist state
  const {
    isInWishlist,
    toggleWishlist,
    wishlistAuthModalOpen,
    setWishlistAuthModalOpen,
    pendingWishlistItem
  } = useWishlist();

  const { user } = useAuth();
  const [showcaseEmailModalOpen, setShowcaseEmailModalOpen] = useState(false);
  const [selectedShowcaseId, setSelectedShowcaseId] = useState<string>("");
  const [selectedShowcaseTitle, setSelectedShowcaseTitle] = useState<string>("");

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showcaseListings, setShowcaseListings] = useState<ShowcaseListing[]>([]);
  const isMobile = useIsMobile();
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch showcase listings from Supabase
  useEffect(() => {
    const fetchShowcaseListings = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {

        if (typeof window !== 'undefined') {

        }

        const { data, error } = await supabase
          .from('showcase_listings')
          .select('*')
          .eq('admin_approved', true) // Only approved listings
          .eq('is_published', true); // Only published listings

        if (error) {
          console.error("Error fetching showcase listings:", error);
          setFetchError(error.message);
          throw error;
        }

        if (data && data.length > 0) {
          // Get unique seller IDs
          const sellerIds = [...new Set(data.map((listing: any) => listing.seller_id).filter(Boolean))];
          
          // Fetch user profiles for sellers
          let suspendedSellerIds = new Set<string>();
          if (sellerIds.length > 0) {
            const { data: userProfiles, error: profilesError } = await supabase
              .from('user_profiles')
              .select('id, is_suspended, status')
              .in('id', sellerIds);
            
            if (!profilesError && userProfiles) {
              // Find suspended sellers
              userProfiles.forEach((profile: any) => {
                const isSuspended = profile.is_suspended === true || profile.status === 'suspended';
                if (isSuspended) {
                  suspendedSellerIds.add(profile.id);
                }
              });
            }
          }

          // Filter out suspended sellers and expired showcases (DB flag + 4–6 week window)
          const filteredData = data
            .filter((listing: any) => {
              if (!listing.seller_id) return true;
              return !suspendedSellerIds.has(listing.seller_id);
            })
            .filter((listing: any) => !isShowcaseListingExpired(listing));

          // Process the data to ensure images is treated as string[] not Json
          const processedData = filteredData.map(listing => {

            return {
              ...listing,
              // Ensure images is always a string array, handling possible JSON formats
              images: Array.isArray(listing.images)
                ? listing.images.map(img => String(img))
                : typeof listing.images === 'string'
                  ? [String(listing.images)]
                  : []
            };
          }) as ShowcaseListing[];

          setShowcaseListings(processedData);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error in showcase listings:', errorMessage);
        setFetchError(errorMessage);
        toast({
          title: 'Error Loading Data',
          description: 'Failed to load showcase listings. Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchShowcaseListings();
  }, [isMobile, toast]);

  // Scroll position restoration - restore scroll when returning from detail page
  useEffect(() => {
    // Small delay to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      const savedScrollPosition = sessionStorage.getItem('showcaseScrollPosition');
      if (savedScrollPosition) {
        window.scrollTo({
          top: parseInt(savedScrollPosition, 10),
          behavior: 'instant'
        });
        // Clear the saved position after restoration
        sessionStorage.removeItem('showcaseScrollPosition');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Save scroll position before navigating away
  useEffect(() => {
    const handleRouteChange = () => {
      sessionStorage.setItem('showcaseScrollPosition', window.scrollY.toString());
    };

    window.addEventListener('beforeunload', handleRouteChange);

    return () => {
      window.removeEventListener('beforeunload', handleRouteChange);
    };
  }, []);

  const resetFilters = () => {
    setFilters({
      breed: "",
      sex: "",
      size: "",
      energy: "",
      county: "",
      breedSearch: ""
    });
  };

  // Correctly handle wishlist toggling with the proper listing type
  const handleToggleWishlist = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If user is not logged in, show showcase email modal instead of generic auth modal
    if (!user) {
      const listing = showcaseListings.find(l => l.id === id);
      setSelectedShowcaseId(id);
      setSelectedShowcaseTitle(listing?.title || "");
      setShowcaseEmailModalOpen(true);
      return;
    }

    // If user is logged in, use the standard wishlist toggle
    toggleWishlist(id, "showcase", e);
  };

  const handleCardClick = (listing: ShowcaseListing) => {
    // Save scroll position before navigating
    sessionStorage.setItem('showcaseScrollPosition', window.scrollY.toString());
    const slug = createSlug(listing.title);
    router.push(`/showcase/${listing.id}-${slug}`);
  };

  // Debounce filters to prevent rapid updates
  const debouncedFilters = useDebounce(filters, 300);

  // Filter listings based on selected filters - memoized for performance
  const filteredListings = useMemo(() => {

    return showcaseListings.filter(listing => {
      // Normalize breed names for comparison (remove spaces, lowercase)
      const normalizeBreed = (breed: string) => breed.toLowerCase().replace(/\s+/g, '');

      // Check breed (normalized comparison)
      if (debouncedFilters.breed && debouncedFilters.breed !== "all-breeds") {
        const normalizedFilterBreed = normalizeBreed(debouncedFilters.breed);
        const normalizedListingBreed = normalizeBreed(listing.breed);

        if (normalizedListingBreed !== normalizedFilterBreed) return false;
      }

      // Check breed search (partial match)
      if (debouncedFilters.breedSearch && !listing.breed.toLowerCase().includes(debouncedFilters.breedSearch.toLowerCase())) return false;

      // Check sex (case-insensitive)
      if (debouncedFilters.sex && listing.sex && listing.sex.toLowerCase() !== debouncedFilters.sex.toLowerCase()) return false;

      // Check size (case-insensitive)
      if (debouncedFilters.size && listing.size && listing.size.toLowerCase() !== debouncedFilters.size.toLowerCase()) return false;

      // Check energy (case-insensitive)
      if (debouncedFilters.energy && listing.energy && listing.energy.toLowerCase() !== debouncedFilters.energy.toLowerCase()) return false;

      // Check county (normalized comparison)
      if (debouncedFilters.county && debouncedFilters.county !== "all") {
        const countyMatches = listing.location &&
          listing.location.toLowerCase() === debouncedFilters.county.toLowerCase();

        if (!countyMatches) return false;
      }

      return true;
    });
  }, [showcaseListings, debouncedFilters]);

  // EmptyState component for when no listings are found
  const EmptyState = (
    <div className="w-full">
      <div className="bg-white rounded-lg p-8 text-center shadow-sm max-w-md mx-auto">
        {fetchError ? (
          <>
            <h3 className="text-xl font-medium text-red-600 mb-2">Error Loading Data</h3>
            <p className="text-gray-500 mb-4">{fetchError}</p>
          </>
        ) : (
          <>
            <h3 className="text-xl font-medium text-gray-700 mb-2">No showcase listings found</h3>
            <p className="text-gray-500 mb-4">Try adjusting your filter options to see more results.</p>
          </>
        )}
        <Button
          onClick={resetFilters}
          className="bg-brand-dark-green hover:bg-brand-soft-green transition-all"
        >
          Reset Filters
        </Button>
      </div>
    </div>
  );

  // Loading state for showcase listings
  const LoadingState = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <ShowcaseListingSkeleton key={i} />
      ))}
    </div>
  );

  // Add a helper function to create URL-friendly slugs
  const createSlug = (text: string): string => {
    return text
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  return (
    <div className="bg-white min-h-screen flex flex-col">

      {/* Add the WishlistAuthModal component */}
      <WishlistAuthModal
        open={wishlistAuthModalOpen}
        onOpenChange={setWishlistAuthModalOpen}
        itemToSave={pendingWishlistItem || undefined}
      />

      {/* Add the ShowcaseEmailModal component */}
      <ShowcaseEmailModal
        open={showcaseEmailModalOpen}
        onOpenChange={setShowcaseEmailModalOpen}
        showcaseId={selectedShowcaseId}
        showcaseTitle={selectedShowcaseTitle}
      />

      <div className="container mx-auto px-4 flex-1">

        {/* Updated to use ShowcasePageBanner */}
        <ShowcasePageBanner />

        {/* Mobile Filter Button - Fixed z-index and visibility */}
        <div className="lg:hidden sticky top-0 z-30 bg-gray-50 shadow-sm rounded-md mb-4 flex items-center justify-between p-3">
          <p className="text-sm text-gray-600">
            {isLoading ? 'Loading...' : `${filteredListings.length} ${filteredListings.length === 1 ? 'listing' : 'listings'} found`}
          </p>

          <MobileFiltersDrawer
            open={mobileFiltersOpen}
            onOpenChange={setMobileFiltersOpen}
            onReset={resetFilters}
            trigger={
              <Button
                variant="outline"
                className="gap-2 text-gray-900 bg-white border-gray-300 hover:bg-gray-50 z-10"
                aria-haspopup="dialog"
                aria-expanded={mobileFiltersOpen}
              >
                <FilterIcon className="h-4 w-4" />
                Filters
              </Button>
            }
          >
            <FilterSidebar
              filters={filters}
              setFilters={setFilters}
              resetFilters={resetFilters}
              embeddedInDrawer
              className="border-none shadow-none rounded-none p-0 bg-white"
            />
          </MobileFiltersDrawer>
        </div>

        <div className="flex gap-6">
          {/* Desktop Filter Sidebar - Hidden on mobile */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-6">
              <FilterSidebar
                filters={filters}
                setFilters={setFilters}
                resetFilters={resetFilters}
                className="shadow-md"
              />
            </div>
          </div>

          {/* Listings Grid with Pagination - Fixed width container */}
          <div className="flex-1 mb-20 min-h-[600px] w-full">
            {isLoading ? (
              LoadingState
            ) : (
              <>
                {filteredListings.length === 0 ? (
                  <div className="min-h-[400px] flex items-center justify-center w-full">
                    {EmptyState}
                  </div>
                ) : (
                  <PaginatedGrid
                    items={filteredListings}
                    renderItem={(listing) => (
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                        isWishlisted={isInWishlist(listing.id)}
                        toggleWishlist={handleToggleWishlist}
                        onCardClick={handleCardClick}
                      />
                    )}
                    emptyState={EmptyState}
                    itemsPerPage={6}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Section */}
      <section className="w-full bg-[#E1E8E0] py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h2 className="text-2xl sm:text-3xl font-berkshire text-brand-dark-green mb-3">
                Continue Your Journey
              </h2>
              <p className="text-gray-700 mb-6 max-w-xl">
                Discover more ways to find your perfect dog companion or learn about our services.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild className="bg-brand-dark-green hover:bg-brand-soft-green px-6">
                <Link href="/" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Return Home
                </Link>
              </Button>
              <Button
                onClick={() => router.push('/quiz')}
                className="bg-brand-soft-green hover:bg-brand-dark-green px-6 flex items-center gap-2"
              >
                Take the Quiz
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default function ShowcasePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#E1E8E0]">
          <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full">
            <h1 className="text-2xl font-bold text-center mb-6">Loading showcase...</h1>
            <div className="flex justify-center">
              <div className="w-12 h-12 border-4 border-brand-dark-green border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-center mt-6 text-gray-600">
              Preparing the showcase page...
            </p>
          </div>
        </div>
      }
    >
      <ShowcaseListings />
    </Suspense>
  );
}
