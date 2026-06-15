'use client';

import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { Heart, MapPin, Phone, Store, PawPrint, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useWishlist } from '@/hooks/use-wishlist';
import WishlistAuthModal from '@/components/WishlistAuthModal';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import PartnerBadge from '@/components/ui/partner-badge';
import { calculateDistance, formatDistance, DISTANCE_FILTERS, DistanceFilter } from '@/lib/utils/geo-location';
import {
  BUSINESS_SERVICE_TYPE_OPTIONS,
  businessMatchesServiceFilter,
  getBusinessServiceTypeLabel,
} from '@/lib/config/business-service-types';
import { IRISH_COUNTY_FILTER_OPTIONS, resolveCountyQueryParam } from '@/lib/config/irish-counties';

const SERVICE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Services' },
  ...BUSINESS_SERVICE_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
  { value: 'Dog Products', label: 'Dog Products' },
  { value: 'Other', label: 'Other' },
];

// Custom TikTok icon component with proper proportions
const TikTokIcon = () => (
  <svg width="20" height="20" viewBox="0 0 448 512" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M448 209.91a210.06 210.06 0 0 1-122.77-39.25V349.38A162.55 162.55 0 1 1 185 188.31V278.2a74.62 74.62 0 1 0 52.23 71.18V0l88 0a121.18 121.18 0 0 0 1.86 22.17h0A122.18 122.18 0 0 0 381 102.39a121.43 121.43 0 0 0 67 20.14Z" fill="#000000"/>
  </svg>
);

// Custom Instagram icon component with gradient
const InstagramIcon = () => {
  const gradientId = useMemo(
    () => `instagram-gradient-${Math.random().toString(36).substring(2, 9)}`,
    []
  );

  return (
    <svg width="22" height="22" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="50%" stopColor="#fd5949" />
          <stop offset="100%" stopColor="#d6249f" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradientId})`}
        d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"
      />
    </svg>
  );
};

// Custom Facebook icon component  
const FacebookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
  </svg>
);

function ServicesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // State for filters
  const [serviceType, setServiceType] = useState<string>('all');
  const [county, setCounty] = useState<string>('All Counties');
  const [partnerOnly, setPartnerOnly] = useState<boolean>(false);
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>('all');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [userLocationName, setUserLocationName] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const servicesPerPage = 4;

  useEffect(() => {
    setCurrentPage(1);
  }, [serviceType, county, partnerOnly, distanceFilter]);

  const countyParam = searchParams.get('county');
  const typeParam = searchParams.get('type');
  useEffect(() => {
    const resolved = resolveCountyQueryParam(countyParam);
    if (resolved !== null) setCounty(resolved);
    if (typeParam && SERVICE_FILTER_OPTIONS.some((o) => o.value === typeParam)) {
      setServiceType(typeParam);
    }
    if (
      resolved !== null ||
      (typeParam && SERVICE_FILTER_OPTIONS.some((o) => o.value === typeParam))
    ) {
      setShowFilters(true);
    }
  }, [countyParam, typeParam]);

  const { toast } = useToast();
  
  // Add useWishlist hook
  const { 
    isInWishlist, 
    toggleWishlist, 
    wishlistAuthModalOpen, 
    setWishlistAuthModalOpen,
    pendingWishlistItem 
  } = useWishlist();

  // Fetch businesses from Supabase
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const { data, error } = await supabase
          .from('business_listings')
          .select(`
            *,
            subscription_tier,
            is_vet_partner,
            user_id,
            user_profiles!user_id (
              is_suspended,
              status,
              avatar_url
            )
          `)
          .eq('admin_approved', true)
          .eq('status', 'approved');

        if (error) {
          console.error('Error fetching businesses:', error);
          toast({
            title: "Error loading services",
            description: "Unable to load business listings. Please try again.",
            variant: "destructive",
          });
          return;
        }

        // Filter out suspended businesses
        const filteredBusinesses = (data || []).filter((business: any) => {
          const userProfile = business.user_profiles;
          if (!userProfile) return true; // If no profile, allow through
          
          // Filter out if business owner is suspended
          const isSuspended = userProfile.is_suspended === true || userProfile.status === 'suspended';
          return !isSuspended;
        });

        // Fetch all unique user_ids to get their subscriptions
        const allUserIds = filteredBusinesses.map((b: any) => b.user_id).filter((id: any) => Boolean(id));
        const uniqueUserIds = Array.from(new Set(allUserIds)) as string[];
        
        // Fetch subscriptions for all users
        const userSubscriptionsMap: Record<string, string> = {};
        if (uniqueUserIds.length > 0) {
          const { data: subscriptions, error: subError } = await supabase
            .from('business_subscriptions' as any)
            .select('user_id, subscription_tier, status')
            .in('user_id', uniqueUserIds)
            .eq('status', 'active')
            .order('created_at', { ascending: false });

          if (!subError && subscriptions) {
            // Create a map of user_id -> subscription_tier (get the latest active subscription per user)
            subscriptions.forEach((sub: any) => {
              if (!userSubscriptionsMap[sub.user_id]) {
                userSubscriptionsMap[sub.user_id] = sub.subscription_tier;
              }
            });
          }
        }

        // Fetch marketplace products for businesses that have them
        // Use user_id to fetch products for consistency
        let businessesWithMarketplace: any[] = [];
        if (filteredBusinesses && Array.isArray(filteredBusinesses)) {
          // Get unique user_ids from businesses
          const userIds = [...new Set(filteredBusinesses.map((b: any) => b.user_id).filter(Boolean))];
          
          // Fetch marketplace products by user_id
          const { data: marketplaceProducts } = await supabase
            .from('marketplace_products' as any)
            .select('user_id, business_id')
            .in('user_id', userIds)
            .eq('admin_approved', true)
            .eq('is_published', true)
            .eq('status', 'live');

          // Create a map of user_id -> has products
          const userHasProductsMap: Record<string, boolean> = {};
          if (marketplaceProducts) {
            marketplaceProducts.forEach((mp: any) => {
              if (mp.user_id) {
                userHasProductsMap[mp.user_id] = true;
              }
            });
          }

          // Transform data to match UI expectations and add marketplace flag
          businessesWithMarketplace = filteredBusinesses.map((business: any) => {
            // Get subscription tier from user-level subscription (match user_id)
            // All listings from the same user should show the same subscription tier
            const userId = business.user_id;
            const subscriptionTier = (userId && userSubscriptionsMap[userId]) || business.subscription_tier || 'standard';
            
            // Check if user has marketplace products
            const hasMarketplaceProducts = userId ? !!userHasProductsMap[userId] : false;
            
            // Console log listing with user_id and plan

            return {
              id: business.id,
              name: business.name,
              type: business.type,
              address: business.address,
              county: business.county,
              phone: business.phone,
              website: business.website,
              partner: business.partner,
              rating: parseFloat(business.rating?.toString() || '0'),
              reviews: business.reviews || 0,
              description: business.description,
              social: business.social || {},
              coordinates: business.coordinates || { lat: 53.3498, lng: -6.2603 }, // Default to Dublin
              slug: business.slug,
              banner_image: business.banner_image,
              logo_image: business.logo_image,
              avatar_url: business.user_profiles?.avatar_url || null,
              opening_hours: business.opening_hours,
              reviews_list: business.reviews_list || [],
              subscription_tier: subscriptionTier, // Use user-level subscription tier
              is_vet_partner: business.is_vet_partner,
              has_marketplace_products: hasMarketplaceProducts,
            };
          });
        }

        // Console log summary of all listings with user_id and plan

        businessesWithMarketplace.forEach((business, index) => {
          const originalBusiness = filteredBusinesses[index] as any;
          const userId = originalBusiness?.user_id || 'N/A';

        });

        setBusinesses(businessesWithMarketplace);
      } catch (error) {
        console.error('Error fetching businesses:', error);
        toast({
          title: "Error loading services",
          description: "Unable to load business listings. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBusinesses();
  }, [toast]);
  
  // Calculate distances and filter businesses
  const businessesWithDistance = useMemo(() => {
    if (!userLocation) {
      return businesses.map(business => ({ ...business, distance: null }));
    }

    return businesses.map(business => {
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        business.coordinates?.lat || 0,
        business.coordinates?.lng || 0
      );
      return { ...business, distance };
    });
  }, [businesses, userLocation]);

  // Filtered businesses based on selected filters
  const filteredBusinesses = useMemo(() => {
    let filtered = businessesWithDistance.filter(business => {
      const typeMatch = businessMatchesServiceFilter(
        serviceType,
        business.type,
        business.has_marketplace_products
      );
      
      // Case-insensitive county match
      const countyMatch = county === 'All Counties' || 
        business.county?.toLowerCase() === county.toLowerCase();
      
      const partnerMatch = partnerOnly ? business.partner : true;
      
      // Distance filter
      let distanceMatch = true;
      if (distanceFilter !== 'all' && userLocation && business.distance !== null) {
        const maxDistance = parseInt(distanceFilter);
        distanceMatch = business.distance <= maxDistance;
      }
      
      return typeMatch && countyMatch && partnerMatch && distanceMatch;
    });

    // Priority ordering: Premium → Vet Partners → Standard
      filtered = filtered.sort((a, b) => {
      // Premium businesses first
      const aIsPremium = a.subscription_tier === 'premium' || a.subscription_tier === 'elite_marketplace';
      const bIsPremium = b.subscription_tier === 'premium' || b.subscription_tier === 'elite_marketplace';
      if (aIsPremium && !bIsPremium) return -1;
      if (!aIsPremium && bIsPremium) return 1;
      
      // Vet Partners second
      if (a.is_vet_partner && !b.is_vet_partner) return -1;
      if (!a.is_vet_partner && b.is_vet_partner) return 1;
      
      // Then maintain existing sorting (distance, etc.)
      if (userLocation) {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
    }
      
      return 0;
    });

    return filtered;
  }, [businessesWithDistance, serviceType, county, partnerOnly, distanceFilter, userLocation]);
  
  // Pagination calculations
  const totalPages = Math.ceil(filteredBusinesses.length / servicesPerPage);
  const startIndex = (currentPage - 1) * servicesPerPage;
  const endIndex = startIndex + servicesPerPage;
  const paginatedBusinesses = filteredBusinesses.slice(startIndex, endIndex);
  
  // Debug logging

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);
  
  // Pagination handlers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll to top of services list
      const servicesList = document.getElementById('services-list');
      if (servicesList) {
        servicesList.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };
  
  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);
  
  // Reverse geocoding function to get location name
  const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`,
        {
          headers: {
            'User-Agent': 'DogQuest/1.0'
          }
        }
      );
      const data = await response.json();
      
      if (data && data.address) {
        // Try to get city, town, or village name
        const locationName = 
          data.address.city || 
          data.address.town || 
          data.address.village || 
          data.address.county ||
          data.address.state ||
          data.address.country;
        
        return locationName || null;
      }
      return null;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return null;
    }
  };
  
  // Get user location on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          
          // Get location name via reverse geocoding
          const locationName = await reverseGeocode(location.lat, location.lng);
          if (locationName) {
            setUserLocationName(locationName);
          }
        },
        (error) => {
          // Silently handle geolocation errors (user denied, unavailable, etc.)
          // This is expected behavior and doesn't need to be logged
          // Permission denied (code 1) is the most common and expected case
          if (error.code === 1) {
            // User denied permission - this is expected, don't log
            return;
          }
          // Only log other errors (timeout, position unavailable) for debugging
          if (process.env.NODE_ENV === 'development') {
          }
        }
      );
    }
  }, []);
  
  // Reset filters
  const resetFilters = () => {
    setServiceType('all');
    setCounty('All Counties');
    setPartnerOnly(false);
    setDistanceFilter('all');
  };
  
  // Function to handle wishlist toggle
  const handleToggleWishlist = (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when clicking heart
    toggleWishlist(id.toString(), "service", e);
  };

  // Function to handle card click navigation
  const handleCardClick = (slug: string) => {
    router.push(`/services/${slug}`);
  };
  
  // Function to handle partner badge click
  const handlePartnerBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    // Navigate to partner page (to be created later)
    router.push('/partners');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <p className="text-lg">Loading services...</p>
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
        itemToSave={pendingWishlistItem || undefined}
      />
      
      <div className="container mx-auto px-4 pb-8 overflow-x-hidden">
        {/* Hero Section — mb-6 matches ShowcasePageBanner / ListingsBanner */}
        <section className="bg-[#E1E8E0] rounded-lg border border-[#A2BF9E] p-4 sm:p-6 md:p-8 relative mb-6 min-h-[180px] sm:min-h-[200px] overflow-hidden">
          <div className="text-left max-w-2xl pr-16 sm:pr-20 md:pr-24 relative z-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-berkshire text-brand-dark-green mb-2">
              Find services near you
            </h2>
            <p className="text-gray-700 text-xs sm:text-sm md:text-base leading-relaxed">
              Find trusted pet services sorted by distance from your location.
            </p>
            {(county !== 'All Counties' || userLocation) && (
              <Badge className="mt-3 bg-brand-soft-green/20 text-brand-dark-green hover:bg-brand-soft-green/30">
                <MapPin className="w-4 h-4 mr-1" />
                {county !== 'All Counties'
                  ? `Showing services in ${county}`
                  : userLocationName
                    ? `Showing services near ${userLocationName}`
                    : 'Showing services near your location'
                }
              </Badge>
            )}
          </div>
          <div className="absolute inset-y-0 right-4 sm:right-6 md:right-8 flex items-center z-0">
            <PawPrint className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 text-brand-dark-green opacity-40 sm:opacity-60" />
          </div>
        </section>

        {/* Filters — sits directly under title card like showcase mobile filter bar */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md lg:sticky lg:top-6 z-10 mb-8 sm:mb-6">
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <h2 className="text-xl font-bold text-brand-dark-green">Filter Services</h2>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="cursor-pointer shrink-0">
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </Button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent className="space-y-4 max-h-[70vh] overflow-y-auto overflow-x-hidden">
                  <div className="space-y-4 pr-2 min-w-0">
                    <div>
                      <label className="block text-sm font-medium mb-1">Service Type</label>
                      <Select 
                        value={serviceType} 
                        onValueChange={setServiceType}
                      >
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue placeholder="Select service type" />
                        </SelectTrigger>
                        <SelectContent>
                          {SERVICE_FILTER_OPTIONS.map(type => (
                            <SelectItem key={type.value} value={type.value} className="cursor-pointer">
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">County</label>
                      <Select 
                        value={county} 
                        onValueChange={setCounty}
                      >
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue placeholder="Select county" />
                        </SelectTrigger>
                        <SelectContent>
                          {IRISH_COUNTY_FILTER_OPTIONS.map((c) => (
                            <SelectItem key={c} value={c} className="cursor-pointer">
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {userLocation && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Distance</label>
                        <Select 
                          value={distanceFilter} 
                          onValueChange={(value) => setDistanceFilter(value as DistanceFilter)}
                        >
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue placeholder="Select distance" />
                          </SelectTrigger>
                          <SelectContent>
                            {DISTANCE_FILTERS.map(filter => (
                              <SelectItem key={filter.value} value={filter.value} className="cursor-pointer">
                                {filter.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="partner-filter" 
                        checked={partnerOnly}
                        onCheckedChange={setPartnerOnly}
                        className="cursor-pointer"
                      />
                      <label htmlFor="partner-filter" className="text-sm font-medium cursor-pointer">
                        Dog Quest Partners Only
                      </label>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      onClick={resetFilters}
                      className="w-full cursor-pointer hover:bg-gray-50"
                    >
                      🔁 Reset Filters
                    </Button>
                  </div>
                </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Services List */}
        <div id="services-list" className="space-y-4 mb-8">
          <div className="flex flex-wrap justify-between items-center gap-2 sticky top-0 bg-white pb-2 z-5">
              <h2 className="text-lg font-semibold text-brand-dark-green">
                {filteredBusinesses.length} Services Found
              </h2>
                {filteredBusinesses.length > 0 && (
                  <span className="text-sm text-gray-600 font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                )}
              </div>
              
              {filteredBusinesses.length > 0 ? (
                <div className="space-y-4">
                  {paginatedBusinesses.map(business => (
                    <Card 
                      key={business.id} 
                      id={`business-${business.id}`}
                      className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer min-w-0"
                      onClick={() => handleCardClick(business.slug)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              {/* Logo Image - show logo_image if available, otherwise show avatar_url */}
                              {(business.logo_image || business.avatar_url) && (
                                <div className="flex-shrink-0">
                                  <img 
                                    src={business.logo_image || business.avatar_url} 
                                    alt={business.name}
                                    className="h-12 w-12 rounded-lg object-cover border-2 border-gray-200"
                                    onError={(e) => {
                                      // Fallback to avatar_url if logo_image fails to load
                                      if (business.logo_image && business.avatar_url && e.currentTarget.src !== business.avatar_url) {
                                        e.currentTarget.src = business.avatar_url;
                                      } else {
                                        e.currentTarget.style.display = 'none';
                                      }
                                    }}
                                  />
                                </div>
                              )}
                              <h3 className="font-bold text-lg break-words">{business.name}</h3>
                              {business.partner && (
                                <div onClick={handlePartnerBadgeClick} className="cursor-pointer">
                                  <PartnerBadge />
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mb-2">
                              {getBusinessServiceTypeLabel(business.type)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "rounded-full cursor-pointer",
                              isInWishlist(business.id.toString()) ? "text-red-500" : "text-gray-400"
                            )}
                            onClick={(e) => handleToggleWishlist(business.id, e)}
                            aria-label={isInWishlist(business.id.toString()) ? "Remove from wishlist" : "Add to wishlist"}
                          >
                            <Heart className={isInWishlist(business.id.toString()) ? "fill-red-500" : ""} />
                          </Button>
                        </div>
                        
                        <div className="mt-3 space-y-2">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm text-gray-600">
                                {business.address}, {business.county}
                              </p>
                              {business.distance !== null && userLocation && (
                                <p className="text-xs text-brand-dark-green font-medium mt-1">
                                  📍 {formatDistance(business.distance)} away
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {business.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-500" />
                              <p className="text-sm text-gray-600">{business.phone}</p>
                            </div>
                          )}
                          
                          <div className="flex justify-between items-center mt-4">
                            <div className="flex items-center gap-3">
                              {business.social?.facebook && (
                                <a 
                                  href={business.social.facebook} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-gray-600 hover:text-brand-soft-green transition-colors cursor-pointer"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <FacebookIcon />
                                </a>
                              )}
                              {business.social?.instagram && (
                                <a 
                                  href={business.social.instagram} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-gray-600 hover:text-brand-soft-green transition-colors cursor-pointer"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <InstagramIcon />
                                </a>
                              )}
                              {business.social?.tiktok && (
                                <a 
                                  href={business.social.tiktok} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-gray-600 hover:text-brand-soft-green transition-colors cursor-pointer"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <TikTokIcon />
                                </a>
                              )}
                              <div className="ml-1 flex items-center">
                                <span className="text-amber-500">★</span>
                                <span className="text-sm font-medium ml-1">{business.rating}</span>
                                <span className="text-xs text-gray-500 ml-1">({business.reviews})</span>
                              </div>
                            </div>
                            
                            <Link href={`/services/${business.slug || '#'}`}>
                              <Button 
                                className="bg-brand-dark-green hover:bg-brand-soft-green cursor-pointer" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                More Info
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No services found matching your filters.</p>
                  <Button variant="link" onClick={resetFilters} className="mt-2 cursor-pointer">
                    Reset all filters
                  </Button>
                </div>
              )}
              
              {/* Pagination Controls - Always show when there are services */}
              {filteredBusinesses.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6 pt-6 border-t-2 border-gray-300 bg-white sticky bottom-0 z-10 py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="cursor-pointer disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1 flex-wrap justify-center">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
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
                            onClick={() => goToPage(page)}
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
                    onClick={goToNextPage}
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

      {/* Business Owner Call-to-Action Section */}
      <section className="bg-[#E1E8E0] py-16 mt-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12">
            {/* For Business Owners */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-brand-dark-green p-3 rounded-full">
                  <Store className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl md:text-3xl font-berkshire text-brand-dark-green">Are You a Pet Business?</h2>
              </div>
              
              <p className="text-gray-600 mb-6">
                Reach thousands of pet owners across Ireland by listing your veterinary practice, 
                grooming salon, or pet store on Dog Quest. Boost your visibility and grow your client base.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="bg-brand-soft-green/20 p-1 rounded-full mt-1">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13.3334 4L6.00008 11.3333L2.66675 8" stroke="#344C3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600">Connect with pet owners actively searching for your services</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-brand-soft-green/20 p-1 rounded-full mt-1">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13.3334 4L6.00008 11.3333L2.66675 8" stroke="#344C3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600">Get featured in our partner highlights and newsletters</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-brand-soft-green/20 p-1 rounded-full mt-1">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13.3334 4L6.00008 11.3333L2.66675 8" stroke="#344C3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600">Manage your listing, showcase your expertise, and respond to reviews</p>
                </div>
              </div>
              
              <Link href="/auth/register?role=business">
                <Button className="w-full bg-brand-dark-green hover:bg-brand-soft-green text-white cursor-pointer">
                  Add Your Business <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            
            {/* For Dog Owners */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-brand-soft-green p-3 rounded-full">
                  <PawPrint className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl md:text-3xl font-berkshire text-brand-dark-green">Visit Our Shop</h2>
              </div>
              
              <p className="text-gray-600 mb-6">
                Discover premium products for your beloved pet in the Dog Quest Shop. 
                From nutritious treats to engaging toys, we've curated everything your dog needs.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="bg-brand-soft-green/20 p-1 rounded-full mt-1">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13.3334 4L6.00008 11.3333L2.66675 8" stroke="#344C3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600">Quality-tested products from trusted brands</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-brand-soft-green/20 p-1 rounded-full mt-1">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13.3334 4L6.00008 11.3333L2.66675 8" stroke="#344C3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600">Expert recommendations for your dog's specific needs</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-brand-soft-green/20 p-1 rounded-full mt-1">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13.3334 4L6.00008 11.3333L2.66675 8" stroke="#344C3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600">Fast delivery across Ireland</p>
                </div>
              </div>
              
              <Link href="/shop">
                <Button className="w-full bg-brand-soft-green hover:bg-brand-dark-green text-white cursor-pointer">
                  Shop Now <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default function ServicesPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <p className="text-lg text-muted-foreground">Loading services…</p>
          </div>
        </div>
      }
    >
      <ServicesPageContent />
    </Suspense>
  );
}
