'use client';

import React, { Suspense, useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MobileFiltersDrawer } from '@/components/MobileFiltersDrawer';
import { MapPin, Dog, Heart, Home, ArrowRight, Search, FilterIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { StudBanner } from '@/components/StudBanner';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { DOG_BREEDS } from '@/data/dog-breeds';
import { IconTooltip } from '@/components/ui/tooltip';
import { formatBreedName } from '@/lib/utils/breed-utils';
import Link from 'next/link';
import { useWishlist } from '@/hooks/use-wishlist';
import WishlistAuthModal from "@/components/WishlistAuthModal";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import NavigationSection from '@/components/NavigationSection';
import MarketplaceProductBoostCarousel from '@/components/marketplace/MarketplaceProductBoostCarousel';
import BusinessBoostCarousel from '@/components/business/BusinessBoostCarousel';
import { useBoostConfig } from '@/hooks/useBoostConfig';
import { isBoostLiveNow } from '@/lib/utils/boost-activation-window';

interface StudListing {
  id: string;
  title: string;
  breed_type: string | null;
  breed1: string | null;
  breed2: string | null;
  crossbreed_breeds: string[] | null;
  location: string;
  stud_fee: number;
  images: any;
  gold_star: boolean;
  green_tick: boolean;
  pick_of_litter: boolean | null;
  sex: string | null;
  description: string;
  created_at: string;
  admin_approved: boolean;
  is_published: boolean;
  current_boost_id: string | null;
  boostType: string | null;
}

// FilterSidebar component
const FilterSidebar: React.FC<{
  filters: any;
  setFilters: React.Dispatch<React.SetStateAction<any>>;
  resetFilters: () => void;
  className?: string;
  embeddedInDrawer?: boolean;
}> = ({ filters, setFilters, resetFilters, className, embeddedInDrawer = false }) => {
  const [breedSearchTerm, setBreedSearchTerm] = useState("");

  const filteredBreeds = DOG_BREEDS.filter(breed =>
    breed.toLowerCase().includes(breedSearchTerm.toLowerCase())
  );

  const handleBreedSearch = (searchTerm: string) => {
    setBreedSearchTerm(searchTerm);
    if (searchTerm.trim()) {
      const matchingBreed = DOG_BREEDS.find(breed =>
        breed.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (matchingBreed) {
        setFilters({ ...filters, breed: matchingBreed, breedSearch: searchTerm });
      } else {
        setFilters({ ...filters, breed: "", breedSearch: searchTerm });
      }
    } else {
      setFilters({ ...filters, breed: "", breedSearch: "" });
    }
  };

  return (
    <div className={cn("bg-white rounded-lg p-4 space-y-6", className)}>
      <div>
        {!embeddedInDrawer && (
          <h2 className="text-xl font-berkshire text-brand-dark-green mb-4">Filters</h2>
        )}

        {/* Breed Filter */}
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
                  setFilters({ ...filters, breed: "", breedSearch: "" });
                  setBreedSearchTerm("");
                } else if (value === "other") {
                  // Use the search box above for custom breeds
                  setFilters({ ...filters, breed: "", breedSearch: breedSearchTerm });
                } else {
                  setFilters({ ...filters, breed: value, breedSearch: "" });
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

        {/* County Filter */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-base font-medium">County</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-gray-400 cursor-help text-xs">(?)</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-[180px] text-sm">Filter by county location</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select
            value={filters.county || "all-counties"}
            onValueChange={(value) => {
              if (value === "all-counties") {
                setFilters({ ...filters, county: "" });
              } else {
                setFilters({ ...filters, county: value });
              }
            }}
          >
            <SelectTrigger className="bg-white border-gray-300">
              <SelectValue placeholder="Select county" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg z-[9999] max-h-60 overflow-y-auto">
              <SelectItem value="all-counties" className="bg-white hover:bg-gray-100">All Counties</SelectItem>
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

        {/* Certification Filters */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-base font-medium">Certification</Label>
          </div>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="greenTick"
                checked={filters.hasGreenTick || false}
                onCheckedChange={(checked) =>
                  setFilters({ ...filters, hasGreenTick: !!checked })
                }
              />
              <div className="flex items-center gap-2">
                <img
                  src="/badges/greentick.jpeg"
                  alt="Green Tick"
                  className="h-5 w-5"
                />
                <Label htmlFor="greenTick" className="text-sm">Vaccinated</Label>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-gray-400 cursor-help text-xs ml-auto">(?)</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-[180px] text-sm">Dog has received all required vaccinations</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="goldStar"
                checked={filters.hasGoldStar || false}
                onCheckedChange={(checked) =>
                  setFilters({ ...filters, hasGoldStar: !!checked })
                }
              />
              <div className="flex items-center gap-2">
                <img
                  src="/badges/goldernstart.jpeg"
                  alt="Gold Star"
                  className="h-5 w-5"
                />
                <Label htmlFor="goldStar" className="text-sm">Health Checked</Label>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-gray-400 cursor-help text-xs ml-auto">(?)</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-[180px] text-sm">Dog has passed a full health check by a veterinarian</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>

      {!embeddedInDrawer && (
        <Button
          onClick={resetFilters}
          className="w-full bg-brand-dark-green hover:bg-brand-soft-green transition-all"
        >
          Reset filters
        </Button>
      )}
    </div>
  );
};

const StudListings: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const boostNames = useBoostConfig();
  const [selectedFilters, setSelectedFilters] = useState({
    breed: "",
    county: "",
    hasGreenTick: false,
    hasGoldStar: false,
    breedSearch: ""
  });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Initialize filters from URL parameters
  useEffect(() => {
    const breedParam = searchParams.get('breed');
    const locationParam = searchParams.get('location');

    if (breedParam) {
      setSelectedFilters(prev => ({ ...prev, breed: breedParam }));
    }
    if (locationParam) {
      setSelectedFilters(prev => ({ ...prev, county: locationParam.toLowerCase() }));
    }
  }, [searchParams]);

  // Scroll position restoration - restore scroll when returning from detail page
  useEffect(() => {
    // Small delay to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      const savedScrollPosition = sessionStorage.getItem('studScrollPosition');
      if (savedScrollPosition) {
        window.scrollTo({
          top: parseInt(savedScrollPosition, 10),
          behavior: 'instant'
        });
        // Clear the saved position after restoration
        sessionStorage.removeItem('studScrollPosition');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Save scroll position before navigating away
  useEffect(() => {
    const handleRouteChange = () => {
      sessionStorage.setItem('studScrollPosition', window.scrollY.toString());
    };

    window.addEventListener('beforeunload', handleRouteChange);

    return () => {
      window.removeEventListener('beforeunload', handleRouteChange);
    };
  }, []);

  const { toast } = useToast();

  const {
    isInWishlist,
    toggleWishlist,
    wishlistAuthModalOpen,
    setWishlistAuthModalOpen,
    pendingWishlistItem
  } = useWishlist();

  const isMobile = useIsMobile();

  // Fetch stud listings with boost data
  const { data: studListings = [], isLoading } = useQuery({
    queryKey: ['stud-listings'],
    queryFn: async () => {

      const { data: listings, error: listingsError } = await supabase
        .from('stud_listings')
        .select('*')
        .eq('admin_approved', true)
        .eq('is_published', true);

      if (listingsError) {
        console.error('Error fetching stud listings:', listingsError);
        throw listingsError;
      }

      const nowISO = new Date().toISOString();
      const now = new Date();
      const { data: boosts, error: boostsError } = await supabase
        .from('boosts')
        .select('listing_id, boost_type, boost_start_time, boost_end_time')
        .eq('listing_type', 'stud')
        .eq('is_active', true)
        .lte('boost_start_time', nowISO)
        .or(`boost_end_time.gt.${nowISO},boost_end_time.is.null`);

      if (boostsError) {
        console.error('Error fetching boosts:', boostsError);
      }

      const boostMap = new Map<string, string>();
      boosts?.forEach((boost) => {
        if (!isBoostLiveNow(boost.boost_type, boost.boost_start_time, boost.boost_end_time, now)) {
          return;
        }
        boostMap.set(boost.listing_id, boost.boost_type);
      });

      const enrichedListings = listings.map(listing => ({
        ...listing,
        boostType: boostMap.get(listing.id) || null,
        current_boost_id: boostMap.get(listing.id) ? listing.id : null
      }));

      const boostPriority: Record<string, number> = {
        'gold': 4,
        'elite': 3,
        'premium': 2,
        'standard': 1
      };

      enrichedListings.sort((a, b) => {
        const aPriority = (a.boostType && boostPriority[a.boostType]) || 0;
        const bPriority = (b.boostType && boostPriority[b.boostType]) || 0;

        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      return enrichedListings as StudListing[];
    },
  });

  const getBreedDisplayName = (breed1: string | null, breed2: string | null, breed_type: string | null) => {
    if (breed_type === 'crossbreed' && breed1 && breed2) {
      return `${formatBreedName(breed1)} - ${formatBreedName(breed2)}`;
    }

    if (breed1) {
      return formatBreedName(breed1);
    }

    return 'Mixed Breed';
  };

  const filteredListings = useMemo(() => {
    let filtered = studListings.filter(listing => {
      if (selectedFilters.breedSearch) {
        const term = selectedFilters.breedSearch.toLowerCase().trim();
        if (term) {
          const candidates = [
            listing.breed1 || '',
            listing.breed2 || '',
            ...(listing.crossbreed_breeds || [])
          ].map(b => b.toLowerCase());
          const matches = candidates.some(b => b.includes(term));
          if (!matches) return false;
        }
      }

      if (selectedFilters.breed) {
        const normalizeBreed = (breed: string) => breed.toLowerCase().replace(/\s+/g, '');
        const normalizedFilterBreed = normalizeBreed(selectedFilters.breed);

        const breed1Matches = listing.breed1 && normalizeBreed(listing.breed1) === normalizedFilterBreed;
        const breed2Matches = listing.breed2 && normalizeBreed(listing.breed2) === normalizedFilterBreed;
        const crossbreedMatches = listing.crossbreed_breeds?.some(
          breed => normalizeBreed(breed) === normalizedFilterBreed
        );

        const breedMatches = breed1Matches || breed2Matches || crossbreedMatches;

        if (!breedMatches) return false;
      }

      if (selectedFilters.county && selectedFilters.county !== 'all') {
        const countyMatches = listing.location.toLowerCase() === selectedFilters.county.toLowerCase();
        if (!countyMatches) return false;
      }

      if (selectedFilters.hasGreenTick && !listing.green_tick) {
        return false;
      }

      if (selectedFilters.hasGoldStar && !listing.gold_star) {
        return false;
      }

      return true;
    });

    return filtered;
  }, [studListings, selectedFilters]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFilters]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredListings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedListings = filteredListings.slice(startIndex, endIndex);

  const handleCardClick = (listing: StudListing) => {
    // Save scroll position before navigating
    sessionStorage.setItem('studScrollPosition', window.scrollY.toString());
    router.push(`/stud/${listing.id}`);
  };

  const handleToggleWishlist = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(id, "stud", e);
  };

  const resetFilters = () => {
    setSelectedFilters({
      breed: "",
      county: "",
      hasGreenTick: false,
      hasGoldStar: false,
      breedSearch: ""
    });
  };

  const capitalizeLocation = (location: string) => {
    if (!location) return '';
    return location.charAt(0).toUpperCase() + location.slice(1);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading stud listings...</div>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4">
        <StudBanner />
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-6">
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-0 z-10 bg-white pb-4">
              <FilterSidebar
                filters={selectedFilters}
                setFilters={setSelectedFilters}
                resetFilters={resetFilters}
                className="shadow-md"
              />
            </div>
          </div>

          <div className="flex-1">
            {/* Results Summary + Mobile Filters */}
            <div className="sticky top-0 z-20 lg:relative bg-white shadow-sm lg:shadow-none rounded-md lg:rounded-none flex w-auto items-center justify-between p-3 lg:p-0 mb-4">
              <p className="text-sm lg:text-base text-gray-600">
                {filteredListings.length} {filteredListings.length === 1 ? 'listing' : 'listings'} found
              </p>

              {filteredListings.length > 0 && (
                <span className="hidden lg:inline text-sm text-gray-600 font-medium">
                  Page {currentPage} of {totalPages}
                </span>
              )}

              <MobileFiltersDrawer
                open={mobileFiltersOpen}
                onOpenChange={setMobileFiltersOpen}
                onReset={resetFilters}
                trigger={
                  <Button variant="outline" className="gap-2 lg:hidden">
                    <FilterIcon className="h-4 w-4" />
                    Filters
                  </Button>
                }
              >
                <FilterSidebar
                  filters={selectedFilters}
                  setFilters={setSelectedFilters}
                  resetFilters={resetFilters}
                  embeddedInDrawer
                  className="border-none shadow-none rounded-none p-0"
                />
              </MobileFiltersDrawer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedListings.map((listing) => {
                const boostBorder = listing.boostType === 'gold' ? 'border-yellow-400 border-[3px] shadow-[0_0_15px_rgba(250,204,21,0.4)]' :
                  listing.boostType === 'elite' ? 'border-purple-400 border-[3px] shadow-[0_0_15px_rgba(192,132,252,0.4)]' :
                  listing.boostType === 'premium' ? 'border-blue-400 border-[3px] shadow-[0_0_15px_rgba(96,165,250,0.4)]' :
                  listing.boostType === 'standard' ? 'border-orange-400 border-[3px] shadow-[0_0_15px_rgba(251,146,60,0.3)]' : '';

                return (
                  <div
                    key={listing.id}
                    className={cn(
                      "h-full group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2",
                      "transition-all duration-700 ease-out",
                      listing.boostType && "hover:-translate-y-2"
                    )}
                    tabIndex={0}
                    role="button"
                    aria-label={`View details for ${listing.title}`}
                    onClick={() => handleCardClick(listing)}
                  >
                    <Card className={cn(
                      "rounded-3xl overflow-hidden h-full p-0 bg-white relative",
                      listing.boostType
                        ? `${boostBorder} shadow-xl shadow-gray-900/5`
                        : "border border-gray-100 shadow-sm",
                      "transition-all duration-700 ease-out"
                    )}>
                      <div className="relative">
                        <div className="aspect-square overflow-hidden">
                          {listing.images && listing.images.length > 0 ? (
                            <img
                              src={Array.isArray(listing.images) ? listing.images[0] : listing.images}
                              alt={listing.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-200">
                              <Dog className="h-12 w-12" />
                            </div>
                          )}
                        </div>

                        {/* Badges - top left, auto width */}
                        <div className="absolute top-2 left-2 flex gap-1 flex-col items-start">
                          <Badge className="bg-green-100 text-green-800 w-auto">Stud</Badge>
                          {listing.boostType && (() => {
                            const label =
                              listing.boostType === 'gold'
                                ? boostNames.gold
                                : listing.boostType === 'elite'
                                  ? boostNames.elite
                                  : listing.boostType === 'premium'
                                    ? boostNames.premium
                                    : boostNames.standard;
                            if (listing.boostType === 'standard' && !label.trim()) return null;
                            return (
                              <Badge
                                className={cn(
                                  'w-auto',
                                  listing.boostType === 'gold'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : listing.boostType === 'elite'
                                      ? 'bg-purple-100 text-purple-800'
                                      : listing.boostType === 'premium'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-orange-100 text-orange-800'
                                )}
                              >
                                {label}
                              </Badge>
                            );
                          })()}
                        </div>

                        {/* Wishlist button */}
                        <button
                          className="absolute top-2 right-2 bg-white/70 p-1.5 rounded-full hover:bg-white/90 transition-colors"
                          onClick={(e) => handleToggleWishlist(listing.id, e)}
                          aria-label={isInWishlist(listing.id) ? "Remove from wishlist" : "Add to wishlist"}
                        >
                          <Heart
                            className={cn("w-5 h-5", isInWishlist(listing.id) ? "fill-red-500 stroke-red-500" : "stroke-gray-600")}
                          />
                        </button>

                        {/* Verification badges - top right */}
                        <div className="absolute top-2 right-12 flex gap-1.5">
                          {listing.gold_star && (
                            <IconTooltip content="This dog has been health checked by a licensed vet.">
                              <div className="inline-flex items-center justify-center bg-white rounded-full p-1.5 shadow-lg">
                                <img
                                  src="/badges/goldernstart.jpeg"
                                  alt="Gold Star"
                                  className="h-6 w-6"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </IconTooltip>
                          )}
                          {listing.green_tick && (
                            <IconTooltip content="This dog has received its vaccinations from a licensed vet.">
                              <div className="inline-flex items-center justify-center bg-white rounded-full p-1.5 shadow-lg">
                                <img
                                  src="/badges/greentick.jpeg"
                                  alt="Green Tick"
                                  className="h-6 w-6"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </IconTooltip>
                          )}
                        </div>
                      </div>

                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <h3 className="font-medium text-base line-clamp-1">{listing.title}</h3>
                          <p className="text-sm text-gray-600">{getBreedDisplayName(listing.breed1, listing.breed2, listing.breed_type)}</p>

                          <div className="flex justify-between items-center">
                            <div className="flex items-center text-xs text-gray-500 gap-0.5">
                              <MapPin className="h-3 w-3" />
                              <span>{capitalizeLocation(listing.location)}</span>
                            </div>
                            <div className="text-sm font-medium text-brand-dark-green">
                              {listing.pick_of_litter ? 'Pick of the Litter' : `€ ${listing.stud_fee.toLocaleString()}`}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>

            {filteredListings.length === 0 && (
              <div className="text-center py-12">
                <Dog className="h-24 w-24 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No stud services found</h3>
                <p className="text-gray-500">Try adjusting your filters to see more results.</p>
              </div>
            )}

            {/* Pagination Controls - Always show when there are listings */}
            {filteredListings.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6 pt-6 border-t-2 border-gray-300 bg-white sticky bottom-0 z-10 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="cursor-pointer disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>

                <div className="flex items-center gap-1 flex-wrap justify-center">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "min-w-[40px] cursor-pointer",
                            currentPage === page
                              ? "bg-brand-dark-green hover:bg-brand-soft-green text-white"
                              : ""
                          )}
                        >
                          {page}
                        </Button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <span key={page} className="px-2 text-gray-500">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="cursor-pointer disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Business Boost Carousel - Visual separation from dog listings */}
      <BusinessBoostCarousel title="Featured Businesses" />

      {/* Marketplace Product Boost Carousel */}
      <MarketplaceProductBoostCarousel title="Featured Products" />

      <NavigationSection />

      <WishlistAuthModal
        open={wishlistAuthModalOpen}
        onOpenChange={setWishlistAuthModalOpen}
        itemToSave={pendingWishlistItem ?? undefined}
      />
    </>
  );
};

export default function StudPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#E1E8E0]">
          <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full">
            <h1 className="text-2xl font-bold text-center mb-6">Loading stud listings...</h1>
            <div className="flex justify-center">
              <div className="w-12 h-12 border-4 border-brand-dark-green border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-center mt-6 text-gray-600">
              Preparing the stud listings page...
            </p>
          </div>
        </div>
      }
    >
      <StudListings />
    </Suspense>
  );
}

