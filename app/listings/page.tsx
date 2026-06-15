'use client';

import { Suspense, useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FilterIcon } from 'lucide-react';
import { MobileFiltersDrawer } from '@/components/MobileFiltersDrawer';
import { ListingsBanner } from '@/components/ListingsBanner';
import { ListingPreviewModal } from '@/components/ListingPreviewModal';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import Link from 'next/link';
import { useWishlist } from '@/hooks/use-wishlist';
import WishlistAuthModal from "@/components/WishlistAuthModal";
import EmptyState from "@/components/ui/empty-state";
import { PaginatedGrid } from '@/components/PaginatedGrid';
import {
  useUnifiedListings,
  filterUnifiedListingsPreserveSaleOrder,
  UnifiedListing,
} from '@/hooks/useUnifiedListings';
import { UnifiedListingCard } from '@/components/UnifiedListingCard';
import { UnifiedFilterSidebar } from '@/components/UnifiedFilterSidebar';
import MarketplaceProductBoostCarousel from '@/components/marketplace/MarketplaceProductBoostCarousel';
import BusinessBoostCarousel from '@/components/business/BusinessBoostCarousel';

function ListingsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [filters, setFilters] = useState({
    breed: "",
    breedSearch: "",
    county: "all",
    hasGreenTick: false,
    hasGoldStar: false,
    sex: "",
    size: "",
    energy: "",
    adType: "sale" // Only show sale listings on this page
  });

  const [previewListing, setPreviewListing] = useState<UnifiedListing | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Use the wishlist hook
  const {
    isInWishlist,
    toggleWishlist,
    wishlistAuthModalOpen,
    setWishlistAuthModalOpen,
    pendingWishlistItem
  } = useWishlist();

  // Fetch unified listings data
  const { data: unifiedListings = [], isLoading, error } = useUnifiedListings();
  const [showContent, setShowContent] = useState(false);

  // Wait for listings to load before showing content (including boost carousels)
  useEffect(() => {
    if (!isLoading && unifiedListings.length >= 0) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setShowContent(true);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isLoading, unifiedListings.length]);

  // Scroll position restoration - restore scroll when returning from detail page
  useEffect(() => {
    if (showContent) {
      // Small delay to ensure DOM is fully rendered
      const timer = setTimeout(() => {
        const savedScrollPosition = sessionStorage.getItem('listingsScrollPosition');
        if (savedScrollPosition) {
          window.scrollTo({
            top: parseInt(savedScrollPosition, 10),
            behavior: 'instant' // Use 'instant' for immediate scroll, 'smooth' for animated
          });
          // Clear the saved position after restoration
          sessionStorage.removeItem('listingsScrollPosition');
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showContent]);

  // Save scroll position before navigating away
  useEffect(() => {
    const handleRouteChange = () => {
      sessionStorage.setItem('listingsScrollPosition', window.scrollY.toString());
    };

    // Save scroll position before page unload/navigation
    window.addEventListener('beforeunload', handleRouteChange);

    return () => {
      window.removeEventListener('beforeunload', handleRouteChange);
    };
  }, []);

  // Initialize filters from URL parameters
  useEffect(() => {
    const breedParam = searchParams.get('breed');
    const locationParam = searchParams.get('location');
    const adTypeParam = searchParams.get('adType');

    // Apply filters from URL params
    if (breedParam || locationParam || adTypeParam) {
      setFilters(prev => ({
        ...prev,
        breed: breedParam || "",
        county: locationParam || "all",
        adType: adTypeParam || "sale"
      }));
    } else {
      // Set default to show only sale listings on page load
      setFilters(prev => ({
        ...prev,
        adType: "sale"
      }));
    }
  }, [searchParams]);

  // Reset filters function
  const resetFilters = () => {
    setFilters({
      breed: "",
      breedSearch: "",
      county: "all",
      hasGreenTick: false,
      hasGoldStar: false,
      sex: "",
      size: "",
      energy: "",
      adType: "sale"
    });
  };

  // Apply filters to unified listings
  const filteredListings = useMemo(
    () => filterUnifiedListingsPreserveSaleOrder(unifiedListings, filters),
    [unifiedListings, filters]
  );

  // Handle card click - showcase shows preview modal, others navigate directly
  const handleCardClick = (listing: UnifiedListing) => {
    // Save scroll position before navigating
    sessionStorage.setItem('listingsScrollPosition', window.scrollY.toString());

    if (listing.type === 'showcase') {
      // Showcase listings show preview modal
      setPreviewListing(listing);
      setIsPreviewOpen(true);
    } else {
      // Sale and stud listings navigate directly to detail page
      switch (listing.type) {
        case 'sale':
          router.push(`/listing/${listing.id}`);
          break;
        case 'stud':
          router.push(`/stud/${listing.id}`);
          break;
        default:
          router.push(`/listing/${listing.id}`);
      }
    }
  };

  // Handle navigate to detail page based on listing type
  const handleViewDetails = () => {
    // Save scroll position before navigating from preview modal
    sessionStorage.setItem('listingsScrollPosition', window.scrollY.toString());

    if (previewListing) {
      switch (previewListing.type) {
        case 'sale':
          router.push(`/listing/${previewListing.id}`);
          break;
        case 'stud':
          router.push(`/stud/${previewListing.id}`);
          break;
        case 'showcase':
          router.push(`/showcase/${previewListing.id}`);
          break;
        default:
          router.push(`/listing/${previewListing.id}`);
      }
    }
  };

  // Get the appropriate wishlist type based on listing type
  const getWishlistType = (listingType: string) => {
    switch (listingType) {
      case 'stud':
        return 'stud';
      case 'showcase':
        return 'showcase';
      default:
        return 'sale';
    }
  };

  // Loading state - Single unified loader until all data is ready
  if (isLoading || !showContent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-cream via-white to-brand-light-green flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-brand-dark-green border-t-transparent mx-auto"></div>
          <p className="mt-6 text-lg font-medium text-gray-700">Loading listings...</p>
          <p className="mt-2 text-sm text-gray-500">Please wait while we fetch all available listings</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-cream via-white to-brand-light-green">
        <div className="container mx-auto px-4">
          {/* 1. Breadcrumbs - Already rendered by GlobalLayout */}

          {/* 2. Dogs for Sale Banner Card */}
          <ListingsBanner />
        </div>

        <div className="container mx-auto px-4 py-8">
          <EmptyState
            title="Unable to load listings"
            description="We're having trouble loading the listings. Please try again later."
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-brand-cream via-white to-brand-light-green">
        <div className="container mx-auto px-4">
          {/* 1. Breadcrumbs - Already rendered by GlobalLayout */}

          {/* 2. Dogs for Sale Banner Card */}
          <ListingsBanner />
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* 3. Filters and Listings */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Desktop Sidebar - Filters */}
            <aside className="hidden lg:block w-80">
              <UnifiedFilterSidebar
                filters={filters}
                setFilters={setFilters}
                resetFilters={resetFilters}
              />
            </aside>

            {/* Main Content */}
            <main className="flex-1">
              {/* Mobile Filter Bar - sticky with count + filters inline */}
              <div className="lg:hidden sticky top-0 z-20 bg-white shadow-sm rounded-md mb-4 flex items-center justify-between p-3">
                <p className="text-sm text-gray-600">
                  {filteredListings.length} {filteredListings.length === 1 ? 'listing' : 'listings'} found
                </p>
                <MobileFiltersDrawer
                  open={mobileFiltersOpen}
                  onOpenChange={setMobileFiltersOpen}
                  onReset={resetFilters}
                  trigger={
                    <Button variant="outline" className="gap-2">
                      <FilterIcon className="h-4 w-4" />
                      Filters
                    </Button>
                  }
                >
                  <UnifiedFilterSidebar
                    filters={filters}
                    setFilters={setFilters}
                    resetFilters={resetFilters}
                    embeddedInDrawer
                    className="border-0 shadow-none p-0"
                  />
                </MobileFiltersDrawer>
              </div>

              {/* Results Summary - desktop only */}
              <div className="hidden lg:block mb-4">
                <p className="text-gray-600">
                  {filteredListings.length} {filteredListings.length === 1 ? 'listing' : 'listings'} found
                  {filters.adType !== 'all' && ` • ${filters.adType} only`}
                </p>
              </div>

              {/* Listings Grid */}
              {filteredListings.length > 0 ? (
                <PaginatedGrid
                  items={filteredListings}
                  renderItem={(listing) => (
                    <UnifiedListingCard
                      key={listing.id}
                      listing={listing}
                      isWishlisted={isInWishlist(listing.id)}
                      toggleWishlist={(id, e) => {
                        const wishlistType = getWishlistType(listing.type);
                        const mappedType = wishlistType === 'sale' ? 'listing' : wishlistType;
                        toggleWishlist(id, mappedType as 'listing' | 'showcase' | 'stud' | 'service' | 'product', e);
                      }}
                      onCardClick={handleCardClick}
                    />
                  )}
                  itemsPerPage={21}
                  emptyState={
                    <EmptyState
                      title="No listings found"
                      description="Try adjusting your filters to see more results."
                    />
                  }
                />
              ) : (
                <EmptyState
                  title="No listings found"
                  description="Try adjusting your filters to see more results."
                />
              )}
            </main>
          </div>
        </div>

        {/* Preview Modal - Convert unified listing to expected format */}
        {previewListing && (
          <ListingPreviewModal
            id={parseInt(previewListing.id)}
            title={previewListing.title}
            breed={previewListing.breed}
            location={previewListing.location}
            price={previewListing.price || previewListing.studFee || 0}
            image={previewListing.images[0] || ""}
            description={previewListing.type === 'showcase' ? '' : previewListing.description}
            hasGreenTick={previewListing.hasGreenTick}
            hasGoldStar={previewListing.hasGoldStar}
            type={previewListing.type === 'sale' ? 'listing' : previewListing.type}
            dateOfBirth={previewListing.dateOfBirth}
            createdAt={previewListing.createdAt}
            open={isPreviewOpen}
            onOpenChange={setIsPreviewOpen}
          />
        )}

        {/* Wishlist Auth Modal */}
        <WishlistAuthModal
          open={wishlistAuthModalOpen}
          onOpenChange={setWishlistAuthModalOpen}
        />

        {/* Business Boost Carousel - Visual separation from dog listings */}
        <BusinessBoostCarousel title="Featured Businesses" />

        {/* Marketplace Product Boost Carousel */}
        <MarketplaceProductBoostCarousel title="Featured Products" />
      </div>
    </>
  );
}

export default function ListingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#E1E8E0]">
          <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full">
            <h1 className="text-2xl font-bold text-center mb-6">Loading listings...</h1>
            <div className="flex justify-center">
              <div className="w-12 h-12 border-4 border-brand-dark-green border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-center mt-6 text-gray-600">
              Preparing the listings page...
            </p>
          </div>
        </div>
      }
    >
      <ListingsPageInner />
    </Suspense>
  );
}