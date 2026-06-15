'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, MapPin, Check, MessageCircle, Dog, Calendar, UserRound, Info, PawPrint, ArrowLeft, Mail, Handshake, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IconTooltip } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import ListingCarouselSection from '@/components/listings/ListingCarouselSection';
import FamilyTreeSection from '@/components/listings/FamilyTreeSection';
import ContinueSearchSection from '@/components/listings/ContinueSearchSection';
import PulseImageButton, { PulsePawButton } from '@/components/PulseButton';
import { useListingDetail } from '@/hooks/use-listing-detail';
import { useBreedInfo } from '@/hooks/use-breed-info';
import { useConversations } from '@/hooks/use-conversations';
import { useReservations } from '@/hooks/use-reservations';
import { useListingAvailability } from '@/hooks/use-listing-availability';
import { ReservationModal } from '@/components/listings/ReservationModal';
import { Skeleton } from '@/components/ui/skeleton';
import ListingFeaturesModal from '@/components/ListingFeaturesModal';
import { ContactSellerModal } from '@/components/messaging/ContactSellerModal';
import { ContactChoiceModal } from '@/components/messaging/ContactChoiceModal';
import { formatBreedName, capitalizeFirstLetter, capitalizeWords, resolveBreedForQuizLookup } from '@/lib/utils/breed-utils';
import { saleListingNotExpiredOrFilter } from '@/lib/listings/public-marketplace-sale-status';
import {
  formatPostedOnDate,
  formatPuppyAgeInWeeks,
} from '@/lib/utils/sale-listing-age';
import { resolveSellerLinkLabel } from '@/lib/utils/seller-display';
import { cn } from '@/lib/utils';
import { useCrossbreedInfo } from '@/hooks/use-crossbreed-info';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useWishlist } from '@/hooks/use-wishlist';
import WishlistAuthModal from '@/components/WishlistAuthModal';
import { useQuery } from '@tanstack/react-query';
import BusinessBoostCarousel from '@/components/business/BusinessBoostCarousel';
import MarketplaceProductBoostCarousel from '@/components/marketplace/MarketplaceProductBoostCarousel';

// Custom image URLs
const GREEN_TICK_URL = "/badges/greentick.jpeg";
const GOLD_STAR_URL = "/badges/goldernstart.jpeg";

// Removed mock data - now fetching real listings

const ListingDetail: React.FC = () => {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { data: listing, isLoading, error } = useListingDetail(id || '');

  // Fetch random similar listings - only from sale_listings for For Sale listings
  const { data: similarListings = [] } = useQuery({
    queryKey: ['similar-listings', id],
    queryFn: async () => {
      // Fetch only from sale_listings (For Sale category)
      const { data: saleData } = await supabase
        .from('sale_listings')
        .select('id, title, location, images, breed, gold_star, green_tick, puppy_details, primary_image_index')
        .eq('admin_approved', true)
        .eq('is_published', true)
        .neq('id', id)
        .or(saleListingNotExpiredOrFilter())
        .limit(10);

      const allListings = (saleData || []).map(item => {
        // Extract image with priority: puppy_details imageUrl > primary_image_index > first image > fallback
        let imageUrl = '';
        
        // First priority: Use first puppy's imageUrl if available
        if (item.puppy_details && Array.isArray(item.puppy_details) && item.puppy_details.length > 0) {
          const firstPuppy = item.puppy_details[0] as any;
          if (firstPuppy && typeof firstPuppy === 'object' && (firstPuppy.imageUrl || firstPuppy.image_url)) {
            imageUrl = firstPuppy.imageUrl || firstPuppy.image_url;
          }
        }
        
        // Second priority: Use primary_image_index if set and imageUrl not found
        if (!imageUrl && item.images) {
          const imagesArray = Array.isArray(item.images) ? item.images : [];
          if (imagesArray.length > 0) {
            const primaryIndex = item.primary_image_index != null && 
                                 item.primary_image_index !== undefined && 
                                 item.primary_image_index >= 0 && 
                                 item.primary_image_index < imagesArray.length
              ? item.primary_image_index
              : 0;
            imageUrl = imagesArray[primaryIndex] || imagesArray[0] || '';
          }
        }
        
        // Third priority: Try to extract from images if not already set
        if (!imageUrl) {
          if (Array.isArray(item.images) && item.images.length > 0) {
            imageUrl = item.images[0];
          } else if (item.images && typeof item.images === 'object' && (item.images as any)?.[0]) {
            imageUrl = (item.images as any)[0];
          }
        }

        return {
          id: item.id,
          title: item.title,
          location: item.location,
          image: imageUrl || '', // Will be handled by fallback in ContinueSearchSection
          breed: formatBreedName(item.breed || 'Mixed Breed'),
          verified: item.gold_star || item.green_tick,
          type: 'sale' as const
        };
      });

      // Randomize and return 4 listings
      return allListings.sort(() => Math.random() - 0.5).slice(0, 4);
    },
    enabled: !!id,
  });

  // Determine listing type more robustly
  const isCrossbreed = useMemo(() => {
    return listing?.breed_type === 'crossbreed' ||
      (listing?.breed_1 && listing?.breed_2 && listing?.breed_1 !== listing?.breed_2);
  }, [listing]);

  // For pedigree breeds, determine which breed to fetch quiz_breeds for (title + breed — they often disagree)
  const primaryBreed = useMemo(() => {
    if (isCrossbreed) return undefined;
    if (!listing) return undefined;
    const resolved = resolveBreedForQuizLookup({
      breed: listing.breed,
      title: listing.title,
    });
    return resolved || listing.breed || listing.breed_1 || '';
  }, [listing, isCrossbreed]);

  const { data: breedInfo, isLoading: breedInfoLoading } = useBreedInfo(primaryBreed || '');

  /** Label for pedigree modal + copy — uses title-resolved breed when it differs from `listing.breed` */
  const pedigreeDisplayBreedName = useMemo(() => {
    if (!listing || isCrossbreed) return '';
    const base = primaryBreed || listing.breed || '';
    return base ? formatBreedName(base) : '';
  }, [listing, isCrossbreed, primaryBreed]);

  // Fetch crossbreed information for parent breeds
  const { data: crossbreedInfo, isLoading: crossbreedInfoLoading } = useCrossbreedInfo(
    isCrossbreed ? listing?.breed_1 : undefined,
    isCrossbreed ? listing?.breed_2 : undefined
  );
  const { createConversation } = useConversations();
  const { data: reservations, isLoading: reservationsLoading } = useReservations(listing?.id || '');
  const { data: availability, isLoading: availabilityLoading } = useListingAvailability(listing?.id);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const {
    toggleWishlist,
    isInWishlist,
    wishlistAuthModalOpen,
    setWishlistAuthModalOpen,
    pendingWishlistItem,
  } = useWishlist();

  // Track seller payment setup status
  const [sellerPaymentSetup, setSellerPaymentSetup] = useState<boolean | null>(null);
  const [checkingSellerPayment, setCheckingSellerPayment] = useState(false);

  // Add authentication guards
  const { checkAuth: checkReserveAuth } = useAuthGuard({
    message: "Please log in to reserve a puppy."
  });
  const { checkAuth: checkOfferAuth } = useAuthGuard({
    message: "Please log in to make an offer on this puppy."
  });
  const { checkAuth: checkContactAuth } = useAuthGuard({
    message: "Please log in to send messages to breeders."
  });

  const [contactChoiceModalOpen, setContactChoiceModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [reserveModalOpen, setReserveModalOpen] = useState(false);
  const [selectedCollarColor, setSelectedCollarColor] = useState<string>('');
  const [reservationMessage, setReservationMessage] = useState<string>('');
  const [isProcessingReservation, setIsProcessingReservation] = useState(false);
  const [growIntoModalOpen, setGrowIntoModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [featuresModalOpen, setFeaturesModalOpen] = useState(false);
  const [reservationBlockedModalOpen, setReservationBlockedModalOpen] = useState(false);

  // Offer form state
  const [offerAmount, setOfferAmount] = useState<string>('');
  const [offerMessage, setOfferMessage] = useState<string>('');
  const [offerCollarColors, setOfferCollarColors] = useState<string[]>([]);
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);

  // Available collar colors (same as Contact modal)
  const collarColors = [
    'Light Grey',
    'Dark Grey',
    'Orange',
    'Brown',
    'Black',
    'Yellow',
    'Gold',
    'Wine',
    'Purple',
    'Dark Blue',
    'Light Blue',
    'Green',
    'Other'
  ];

  // Check seller payment setup status
  useEffect(() => {
    const checkSellerPaymentSetup = async () => {
      if (!listing?.seller_id) {
        setSellerPaymentSetup(false);
        return;
      }

      try {
        setCheckingSellerPayment(true);
        
        // Do not read seller user_profiles from the client: RLS only allows own row (buyers get no data).
        // SECURITY DEFINER RPC returns only a boolean — see is_seller_stripe_ready_for_reservations.
        const { data: ready, error } = await supabase.rpc(
          'is_seller_stripe_ready_for_reservations',
          { p_seller_id: listing.seller_id }
        );

        if (error) {
          console.error('Error checking seller payment setup (RPC):', error);
          setSellerPaymentSetup(false);
          return;
        }

        setSellerPaymentSetup(!!ready);
      } catch (error) {
        console.error('Exception checking seller payment setup:', error);
        setSellerPaymentSetup(false);
      } finally {
        setCheckingSellerPayment(false);
      }
    };

    if (listing?.seller_id) {
      checkSellerPaymentSetup();
    } else {
      setSellerPaymentSetup(false);
    }
  }, [listing?.seller_id]);

  // Show features modal on first visit
  useEffect(() => {
    const hasSeenFeaturesModal = localStorage.getItem('hasSeenListingFeaturesModal');
    if (!hasSeenFeaturesModal && !isLoading && listing) {
      setFeaturesModalOpen(true);
    }
  }, [isLoading, listing]);

  const handleFeaturesModalClose = (open: boolean) => {
    setFeaturesModalOpen(open);
    if (!open) {
      localStorage.setItem('hasSeenListingFeaturesModal', 'true');
    }
  };

  // Calculate puppy age in weeks from date of birth
  const puppyAgeLabel = listing?.date_of_birth
    ? formatPuppyAgeInWeeks(listing.date_of_birth)
    : null;
  const postedOnLabel = listing?.created_at ? formatPostedOnDate(listing.created_at) : null;

  // Default placeholder image URL
  const DEFAULT_IMAGE_URL = "https://images.unsplash.com/photo-1605897472359-85e4b94d685d?q=80&w=800";

  // Create mixed media array: images + video + puppy images
  const mixedMediaItems = useMemo(() => {
    if (!listing) return [];

    const mediaItems = [];

    // First: Add first puppy image if available (highest priority)
    if (listing.puppy_details && Array.isArray(listing.puppy_details) && listing.puppy_details.length > 0) {
      const firstPuppy = listing.puppy_details[0] as any;
      if (firstPuppy && typeof firstPuppy === 'object' && firstPuppy.imageUrl && firstPuppy.imageUrl !== null) {
        mediaItems.push({
          type: 'image' as const,
          src: firstPuppy.imageUrl,
          isGeneralImage: false,
          puppyIndex: 0,
          puppyData: {
            sex: firstPuppy.sex,
            color: firstPuppy.color,
            price: firstPuppy.price,
            collar_code: firstPuppy.colourCollar, // Map colourCollar to collar_code
            microchip_number: firstPuppy.microchipNumber,
            weight: firstPuppy.weight,
            notes: firstPuppy.notes
          }
        });
      }
    }

    // Second: Add general listing images, reordered so primary image is first
    if (listing.images && listing.images.length > 0) {
      let orderedImages = [...listing.images];

      // If primary_image_index is set and valid, move that image to the front
      if (listing.primary_image_index !== undefined &&
        listing.primary_image_index >= 0 &&
        listing.primary_image_index < listing.images.length) {
        const primaryImage = orderedImages[listing.primary_image_index];
        orderedImages.splice(listing.primary_image_index, 1);
        orderedImages.unshift(primaryImage);
      }

      orderedImages.forEach((image) => {
        mediaItems.push({
          type: 'image' as const,
          src: image,
          isGeneralImage: true
        });
      });
    }

    // Third: Add video if exists
    if (listing.video_url) {
      mediaItems.push({
        type: 'video' as const,
        src: listing.video_url,
        isGeneralImage: true
      });
    }

    // Fourth: Add remaining puppy images (skip first one as it's already added)
    if (listing.puppy_details && Array.isArray(listing.puppy_details) && listing.puppy_details.length > 1) {
      listing.puppy_details.slice(1).forEach((puppy: any, index) => {
        // Check for imageUrl (not image) and ensure it's not null
        if (puppy && typeof puppy === 'object' && puppy.imageUrl && puppy.imageUrl !== null) {
          mediaItems.push({
            type: 'image' as const,
            src: puppy.imageUrl,
            isGeneralImage: false,
            puppyIndex: index + 1,
            puppyData: {
              sex: puppy.sex,
              color: puppy.color,
              price: puppy.price,
              collar_code: puppy.colourCollar, // Map colourCollar to collar_code
              microchip_number: puppy.microchipNumber,
              weight: puppy.weight,
              notes: puppy.notes
            }
          });
        }
      });
    }

    // If no media items at all, add a default placeholder image
    if (mediaItems.length === 0) {
      mediaItems.push({
        type: 'image' as const,
        src: DEFAULT_IMAGE_URL,
        isGeneralImage: true
      });
    }

    return mediaItems;
  }, [listing]);

  // Get current puppy details based on active image index
  const getCurrentPuppyDetails = () => {
    if (!mixedMediaItems[currentImageIndex]) return null;

    const currentItem = mixedMediaItems[currentImageIndex];
    if (currentItem.isGeneralImage) return null;

    return (currentItem as any).puppyData || null;
  };

  // Calculate price range from puppy details
  const getPriceRange = () => {
    if (!listing?.puppy_details || !Array.isArray(listing.puppy_details)) {
      return listing?.price || 0;
    }

    const puppyPrices = listing.puppy_details
      .filter((puppy: any) => puppy && typeof puppy === 'object' && puppy.price)
      .map((puppy: any) => puppy.price);

    if (puppyPrices.length === 0) {
      return listing?.price || 0;
    }

    const minPrice = Math.min(...puppyPrices);
    const maxPrice = Math.max(...puppyPrices);

    if (minPrice === maxPrice) {
      return `€${minPrice}`;
    }

    return `€${minPrice} - €${maxPrice}`;
  };

  // Check if a specific collar color is already reserved
  const isCollarColorReserved = (collarColor: string) => {
    if (!reservations || !Array.isArray(reservations)) return false;

    return reservations.some(reservation =>
      reservation.puppy_collar_color === collarColor &&
      ['pending', 'confirmed', 'completed'].includes(reservation.status)
    );
  };

  // Check if the currently selected collar color is reserved
  const isSelectedCollarReserved = useMemo(() => {
    return selectedCollarColor ? isCollarColorReserved(selectedCollarColor) : false;
  }, [selectedCollarColor, reservations]);

  // Handle carousel image change
  const handleImageChange = (index: number) => {
    setCurrentImageIndex(index);
  };

  // Create family tree data from individual fields - FIXED
  const familyTreeData = useMemo(() => {
    if (!listing) return null;

    // Always construct a family tree object even if fields are missing
    return {
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
  }, [listing]);

  // Helper function to get primary puppy image from listing
  const getPrimaryPuppyImage = useMemo(() => {
    if (!listing) return null;

    // First priority: Use first puppy's imageUrl if available
    if (listing.puppy_details && Array.isArray(listing.puppy_details) && listing.puppy_details.length > 0) {
      const firstPuppy = listing.puppy_details[0] as any;
      if (firstPuppy && typeof firstPuppy === 'object' && (firstPuppy.imageUrl || firstPuppy.image_url)) {
        return firstPuppy.imageUrl || firstPuppy.image_url;
      }
    }

    // Second priority: Use primary_image_index if set
    if (listing.images) {
      const imagesArray = Array.isArray(listing.images) ? listing.images : [];
      if (imagesArray.length > 0) {
        const primaryIndex = listing.primary_image_index != null && 
                             listing.primary_image_index !== undefined && 
                             listing.primary_image_index >= 0 && 
                             listing.primary_image_index < imagesArray.length
          ? listing.primary_image_index
          : 0;
        return imagesArray[primaryIndex] || imagesArray[0] || null;
      }
    }

    // Third priority: Try to extract from images if not already set
    if (listing.images) {
      if (Array.isArray(listing.images) && listing.images.length > 0) {
        return listing.images[0];
      } else if (listing.images && typeof listing.images === 'object' && (listing.images as any)?.[0]) {
        return (listing.images as any)[0];
      }
    }

    return null;
  }, [listing]);

  const GROW_INTO_FALLBACK_ADULT =
    'https://images.unsplash.com/photo-1561495376-dc9c7c5b8726?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80';
  const GROW_INTO_FALLBACK_B1 =
    'https://images.unsplash.com/photo-1552053831-71594a27632d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80';
  const GROW_INTO_FALLBACK_B2 =
    'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80';

  const pickImageUrl = (url: string | null | undefined, fallback: string) => {
    const s = url?.trim();
    return s ? s : fallback;
  };

  // "Who Will I Grow Into" — use quiz_breeds via hooks; crossbreed parents use crossbreedInfo
  const breedInfoForModal = useMemo(() => {
    const puppyImage = getPrimaryPuppyImage;

    if (!listing) {
      return null;
    }

    if (isCrossbreed) {
      const breed1Name = listing.breed_1 ? formatBreedName(listing.breed_1) : 'First breed';
      const breed2Name = listing.breed_2 ? formatBreedName(listing.breed_2) : 'Second breed';
      const b1 = crossbreedInfo?.breed1;
      const b2 = crossbreedInfo?.breed2;

      return {
        isCrossbreed: true as const,
        adultImage: pickImageUrl(puppyImage, GROW_INTO_FALLBACK_ADULT),
        breed1Image: pickImageUrl(b1?.image_url, pickImageUrl(puppyImage, GROW_INTO_FALLBACK_B1)),
        breed2Image: pickImageUrl(b2?.image_url, pickImageUrl(puppyImage, GROW_INTO_FALLBACK_B2)),
        breed1Name,
        breed2Name,
        breed1Info: b1
          ? {
              size: b1.size,
              energy: b1.energy,
              grooming: b1.grooming,
            }
          : undefined,
        breed2Info: b2
          ? {
              size: b2.size,
              energy: b2.energy,
              grooming: b2.grooming,
            }
          : undefined,
        description: `This ${breed1Name} x ${breed2Name} crossbreed combines the best traits of both parent breeds. Crossbreeds often exhibit hybrid vigor, potentially having fewer health issues than purebreds. Their appearance and temperament can vary, inheriting characteristics from either parent breed in unique combinations.`,
        infoBadges: [
          { label: 'Grooming', value: 'Varies', color: 'bg-pink-500' },
          { label: 'Energy', value: 'Variable', color: 'bg-orange-500' },
          { label: 'Size', value: 'Mixed', color: 'bg-purple-500' },
          { label: 'Lifespan', value: '12-15 years', color: 'bg-green-500' },
        ],
        temperamentTags: ['unique', 'adaptable', 'intelligent', 'loyal', 'family-friendly', 'vigorous'],
      };
    }

    if (!breedInfo) {
      const breedName = primaryBreed
        ? formatBreedName(primaryBreed)
        : listing.breed
          ? formatBreedName(listing.breed)
          : 'This breed';
      return {
        isCrossbreed: false as const,
        adultImage: pickImageUrl(puppyImage, GROW_INTO_FALLBACK_ADULT),
        description: `${breedName} typically grows to be a wonderful adult dog. Known for their friendly, reliable, and trustworthy nature, they are intelligent and eager to please. They make excellent family dogs and are great with children and other pets.`,
        infoBadges: [
          { label: 'Grooming', value: 'Moderate', color: 'bg-pink-500' },
          { label: 'Energy', value: 'High', color: 'bg-orange-500' },
          { label: 'Size', value: 'Medium', color: 'bg-purple-500' },
          { label: 'Lifespan', value: '10-13 years', color: 'bg-green-500' },
        ],
        temperamentTags: ['intelligent', 'brave', 'energetic', 'playful', 'loyal', 'protective'],
        breed1Name: undefined,
        breed2Name: undefined,
        breed1Image: undefined,
        breed2Image: undefined,
        breed1Info: undefined,
        breed2Info: undefined,
      };
    }

    return {
      isCrossbreed: false as const,
      adultImage: pickImageUrl(breedInfo.image_url, pickImageUrl(puppyImage, GROW_INTO_FALLBACK_ADULT)),
      description:
        breedInfo.description ||
        `${primaryBreed ? formatBreedName(primaryBreed) : formatBreedName(listing.breed || '')} is a wonderful breed with great characteristics.`,
      infoBadges: [
        { label: 'Grooming', value: breedInfo.grooming || 'Moderate', color: 'bg-pink-500' },
        { label: 'Energy', value: breedInfo.energy || 'Medium', color: 'bg-orange-500' },
        { label: 'Size', value: breedInfo.size || 'Medium', color: 'bg-purple-500' },
        { label: 'Lifespan', value: breedInfo.life_expectancy || '10-15 years', color: 'bg-green-500' },
      ],
      temperamentTags:
        breedInfo.temperament && breedInfo.temperament.length > 0
          ? breedInfo.temperament
          : ['friendly', 'loyal', 'intelligent', 'active'],
      breed1Name: undefined,
      breed2Name: undefined,
      breed1Image: undefined,
      breed2Image: undefined,
      breed1Info: undefined,
      breed2Info: undefined,
    };
  }, [listing, breedInfo, crossbreedInfo, getPrimaryPuppyImage, isCrossbreed, primaryBreed]);

  const handleWishlistToggle = useCallback(() => {
    if (!listing?.id) return;
    void toggleWishlist(listing.id, 'listing');
  }, [listing?.id, toggleWishlist]);

  const handleContactSeller = () => {
    // Check authentication before showing contact choice modal
    if (!checkContactAuth()) return;
    setContactChoiceModalOpen(true);
  };

  const handleMessageChosen = () => {
    setContactChoiceModalOpen(false);
    setContactModalOpen(true);
  };

  const handleMakeOffer = () => {
    // Check authentication before showing offer modal
    if (!checkOfferAuth()) return;
    setOfferModalOpen(true);
  };

  const handleReservePuppy = async () => {
    // Check authentication before showing reserve modal  
    if (!checkReserveAuth()) return;

    // Check for existing reservations for this listing before opening the modal
    try {
      const listingId = listing?.id || id;

      const { data: existingReservations, error } = await supabase
        .from('reservations')
        .select('seller_confirmed, dispute_status, puppy_id, status')
        .eq('listing_id', listingId);

      if (error) {
        console.error('[RESERVATION] Error checking reservations:', error);
        // On error, we default to allowing the flow (or you could block)
        setReserveModalOpen(true);
        return;
      }

      // CRITICAL: Check if there are ANY available puppies (isReserved: false)
      const puppyDetails = listing?.puppy_details && Array.isArray(listing.puppy_details) 
        ? listing.puppy_details 
        : [];
      
      const availablePuppies = puppyDetails.filter((p: any) => 
        p && p.id && p.isReserved !== true
      );

      // Only block if ALL puppies are reserved (no available puppies)
      if (puppyDetails.length > 0 && availablePuppies.length === 0) {
        setReservationBlockedModalOpen(true);
        return;
      }

      // If no puppy_details exist, check old logic as fallback
      if (puppyDetails.length === 0 && existingReservations && existingReservations.length > 0) {
        // Only block if there's a specific conflict (seller denied dispute)
        const hasConflict = existingReservations.some((res: any) => {
          return res.seller_confirmed === false && res.dispute_status === 'seller_denied';
        });

        if (hasConflict) {
          setReservationBlockedModalOpen(true);
          return;
        }
      }

      // If we have available puppies, proceed
      setReserveModalOpen(true);
    } catch (err) {
      console.error('[RESERVATION] Unexpected error in handleReservePuppy', err);
      setReserveModalOpen(true);
    }
  };

  // Handle collar color selection for offers
  const handleOfferCollarColorChange = (color: string, checked: boolean) => {
    if (checked) {
      setOfferCollarColors([...offerCollarColors, color]);
    } else {
      setOfferCollarColors(offerCollarColors.filter(c => c !== color));
    }
  };

  const handleSubmitOffer = async () => {
    if (!listing) return;

    // Validate form
    const amount = parseFloat(offerAmount);
    if (!offerAmount || isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid offer amount",
        description: "Please enter a valid offer amount.",
        variant: "destructive"
      });
      return;
    }

    if (!offerMessage.trim()) {
      toast({
        title: "Message required",
        description: "Please include a message with your offer.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmittingOffer(true);

    try {
      const subject = `Offer for ${listing.title}`;
      let fullMessage = `I would like to make an offer of €${amount} for ${listing.title}.\n\n${offerMessage.trim()}`;

      // Include collar colors in message if any are selected
      if (offerCollarColors.length > 0) {
        fullMessage += `\n\nPuppy collar colors of interest: ${offerCollarColors.join(', ')}`;
      }

      const conversationId = await createConversation(
        listing.seller_id,
        listing.id,
        'sale',
        subject,
        fullMessage,
        'offer',
        amount,
        'EUR'
      );

      if (conversationId) {
        setOfferModalOpen(false);
        setOfferAmount('');
        setOfferMessage('');
        setOfferCollarColors([]); // Reset collar colors
      }
    } catch (error) {
      console.error('Error submitting offer:', error);
      toast({
        title: "Failed to submit offer",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const handleSubmitReservation = async (reservationData: any) => {
    if (!listing) {
      toast({
        title: "Error",
        description: "Listing information is not available.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessingReservation(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-reservation-payment', {
        body: {
          listingId: listing.id,
          ...reservationData
        }
      });

      // Handle edge function errors (non-2xx responses)
      if (error) {
        console.error('Supabase function error:', error);

        let responseData = data;

        // If data is null but we have an error with context (Response), try to parse the body
        if (!responseData && error.context && typeof error.context.json === 'function') {
          try {
            // Clone in case it was used, though usually context is the raw response
            responseData = await error.context.clone().json();
          } catch (e) {
            console.error('Failed to parse error context json:', e);
          }
        }

        // If data contains error information, use it
        if (responseData?.error || responseData?.requiresPaymentSetup) {
          const errorTitle = responseData.error === 'Seller payment setup required'
            ? 'Seller payment setup required'
            : 'Reservation Failed';

          toast({
            title: errorTitle,
            description: responseData.message || "Unable to process reservation. Please try again.",
            variant: "destructive"
          });
          setIsProcessingReservation(false);
          return;
        }

        // Otherwise throw to be caught below
        throw error;
      }

      // Check if seller payment setup is required (for successful responses with this flag)
      if (data?.requiresPaymentSetup || data?.error === 'Seller payment setup required') {
        toast({
          title: "Seller payment setup required",
          description: data.message || "The seller must set up payment details before reservations can be made. Please contact the seller or try another listing.",
          variant: "destructive"
        });
        setIsProcessingReservation(false);
        return;
      }

      // Redirect to Stripe checkout - open in new tab
      if (data?.url) {
        window.open(data.url, '_blank');

        toast({
          title: "Redirecting to payment",
          description: "Opening Stripe checkout in a new tab...",
        });

        // Keep the processing state for a moment so user sees feedback
        setTimeout(() => {
          setIsProcessingReservation(false);
          setReserveModalOpen(false); // Close modal on success
        }, 1500);
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Error creating reservation:', error);
      setIsProcessingReservation(false);

      // Generic error fallback
      toast({
        title: "Reservation Failed",
        description: error.message || "Unable to process reservation. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-6">
            <Skeleton className="w-full aspect-square rounded-lg" />
            <Skeleton className="w-full h-48 rounded-lg" />
          </div>
          <div className="space-y-6">
            <Skeleton className="w-3/4 h-8" />
            <Skeleton className="w-1/2 h-6" />
            <Skeleton className="w-full h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Listing Not Found</h1>
          <p className="text-gray-600 mb-4">The listing you're looking for could not be found.</p>
          <Link href="/listings" className="text-blue-600 hover:underline">
            ← Back to all listings
          </Link>
        </div>
      </div>
    );
  }

  const currentPuppy = getCurrentPuppyDetails();
  const priceRange = getPriceRange();
  const selectedPuppyPrice = currentPuppy?.price ? `€${currentPuppy.price}` : null;
  const fallbackPriceDisplay = typeof priceRange === 'number' ? `€${priceRange}` : priceRange;

  const isWishListed = isInWishlist(listing.id);

  return (
    <>
      <WishlistAuthModal
        open={wishlistAuthModalOpen}
        onOpenChange={setWishlistAuthModalOpen}
        itemToSave={pendingWishlistItem || undefined}
      />
      {/* Features Modal */}
      <ListingFeaturesModal
        open={featuresModalOpen}
        onOpenChange={handleFeaturesModalClose}
      />

      {/* Reservation Blocked Modal */}
      <Dialog open={reservationBlockedModalOpen} onOpenChange={setReservationBlockedModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Reservation Unavailable
            </DialogTitle>
            <DialogDescription className="text-base text-gray-700 pt-2">
              This puppy is already reserved by someone!
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button
              onClick={() => setReservationBlockedModalOpen(false)}
              className="bg-brand-dark-green text-white hover:bg-brand-soft-green"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Two column layout for medium screens and up */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Left column - Image carousel and seller info */}
          <div className="space-y-6">
            {/* Image carousel with wishlist button */}
            <div className="relative">
              <ListingCarouselSection
                title={listing.title}
                images={mixedMediaItems}
                video={listing.video_url}
                isWishListed={isWishListed}
                onWishlistToggle={handleWishlistToggle}
                onImageChange={handleImageChange}
                listingId={listing.id}
                suppressWishlistAuthModal
                badge={
                  <Badge className="bg-brand-dark-green text-white px-3 py-1.5 rounded-tl-lg rounded-br-none">For Sale</Badge>
                }
              />
            </div>

            {!isMobile && (
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
                            href={`/users/${listing.seller_id}`}
                            className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {resolveSellerLinkLabel(
                              listing.seller_name,
                              listing.seller_id
                            )}
                          </Link>
                        </div>
                        {listing.location?.trim() ? (
                          <p className="text-gray-600 mb-2">
                            County: {capitalizeWords(listing.location)}
                          </p>
                        ) : null}
                      </div>

                      {(listing.vet_name?.trim() || listing.vet_location?.trim()) && (
                        <div>
                          {listing.vet_name?.trim() ? (
                            <p className="mb-2">
                              <span className="font-semibold">Vet:</span>{' '}
                              {capitalizeWords(listing.vet_name)}
                            </p>
                          ) : null}
                          {listing.vet_location?.trim() ? (
                            <p className="mb-2">
                              <span className="font-semibold">Vet Location:</span>{' '}
                              {capitalizeWords(listing.vet_location)}
                            </p>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}
          </div>

          {/* Right column - Listing details */}
          <div className="space-y-6 relative">
            {/* Title section - Inline layout */}
            <section>
              <div className="flex flex-col md:flex-col md:items-start md:justify-between gap-2">
                {/* Title */}
                <h1 className="text-3xl font-berkshire break-words">
                  {listing.title.length > 43 ? (
                    <>
                      {/* Desktop: insert line break at char 43 */}
                      <span className="hidden md:inline">
                        {listing.title.slice(0, 43)}<br />{listing.title.slice(43)}
                      </span>
                      {/* Mobile: full title in one line */}
                      <span className="inline md:hidden">{listing.title}</span>
                    </>
                  ) : (
                    listing.title
                  )}
                </h1>
                {/* Who Will I Grow Into button - inline on desktop */}
                <div className="hidden md:block flex-shrink-0">
                  <PulsePawButton onClick={() => setGrowIntoModalOpen(true)}>
                    Who Will I Grow Into?
                  </PulsePawButton>
                </div>
              </div>
              {/* Mobile version - below title */}
              <div className="md:hidden mt-2">
                <PulsePawButton onClick={() => setGrowIntoModalOpen(true)}>
                  Who Will I Grow Into?
                </PulsePawButton>
              </div>
            </section>

            {/* Listing information */}
            <section>
              <div className="space-y-2 text-gray-700">

                {/* Updated Badges Section with Symbols instead of Pills */}
                <div className="w-full flex flex-wrap gap-2 mt-4 mb-4  text-start">
                  {listing.gold_star && (
                    <IconTooltip content="This listing has been verified with a health check" contentClassName="bg-white text-gray-800">
                      <div className="w-12 h-12 flex items-center justify-center cursor-pointer">
                        <img src={GOLD_STAR_URL} alt="Health Checked" className="w-full h-full object-contain" />
                      </div>
                    </IconTooltip>
                  )}
                  {listing.green_tick && (
                    <IconTooltip content="This listing has been verified with vaccinations" contentClassName="bg-white text-gray-800">
                      <div className="w-12 h-12 flex items-center justify-center cursor-pointer">
                        <img src={GREEN_TICK_URL} alt="Vaccinated" className="w-full h-full object-contain" />
                      </div>
                    </IconTooltip>
                  )}
                </div>

                {/* Price Range Display */}
                <div className="flex items-center gap-4 mt-8">
                  <div className="bg-[#E1E8E0] p-3 rounded-lg">
                    <h3 className="text-2xl font-bold text-brand-dark-green">{selectedPuppyPrice || fallbackPriceDisplay}</h3>
                  </div>
                  {currentPuppy?.sex && (
                    <div className="bg-[#E1E8E0] p-3 rounded-lg">
                      <h3 className="text-2xl font-bold text-brand-dark-green">
                        {capitalizeFirstLetter(currentPuppy.sex)}
                      </h3>
                    </div>
                  )}
                </div>


                

                {/* Breed - With icon - UPDATED to use formatBreedName */}
                <div className="flex items-center">
                  <IconTooltip content="Breed" className="mr-1">
                    <Dog className="w-4 h-4 text-brand-soft-green" />
                  </IconTooltip>
                  <span className="font-medium text-brand-soft-green">Breed:</span>
                  <span className="ml-2">{formatBreedName(listing.breed)}</span>
                </div>

                {/* Location - With icon */}
                <div className="flex items-center">
                  <IconTooltip content="Location" className="mr-1">
                    <MapPin className="w-4 h-4 text-brand-soft-green" />
                  </IconTooltip>
                  <span className="font-medium text-brand-soft-green">Location:</span>
                  <span className="ml-2">{capitalizeWords(listing.location)}</span>
                </div>

                {/* Puppy age - With icon */}
                {puppyAgeLabel && (
                  <div className="flex items-center">
                    <IconTooltip content="Puppy age" className="mr-1">
                      <Calendar className="w-4 h-4 text-brand-soft-green" />
                    </IconTooltip>
                    <span className="font-medium text-brand-soft-green">Puppy age:</span>
                    <span className="ml-2">{puppyAgeLabel}</span>
                  </div>
                )}

                {/* Posted on - With icon */}
                {postedOnLabel && (
                  <div className="flex items-center">
                    <IconTooltip content="When this ad was published" className="mr-1">
                      <Calendar className="w-4 h-4 text-brand-soft-green" />
                    </IconTooltip>
                    <span className="font-medium text-brand-soft-green">Posted on:</span>
                    <span className="ml-2">{postedOnLabel}</span>
                  </div>
                )}
              </div>
            </section>

            <section className="w-full">
              <h2 className="text-2xl font-berkshire mb-6 text-foreground">Get in Touch</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
                {/* Contact Button */}
                <div className="group relative overflow-hidden">
                  {user ? (
                    <Button
                      onClick={handleContactSeller}
                      className="w-full h-36 lg:h-44 flex flex-col items-center justify-center bg-brand-soft-green hover:bg-brand-soft-green/90 text-white rounded-2xl transition-all duration-500 transform hover:scale-[1.02] border-0 relative"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="relative z-10 flex flex-col items-center justify-center">
                        <Mail className="h-7 w-7 lg:h-9 lg:w-9" />
                        <div className="text-center mt-1">
                          <span className="text-xl lg:text-2xl font-bold block tracking-wide">Contact</span>
                          <span className="text-sm lg:text-base opacity-95 font-medium">Message Seller</span>
                        </div>
                      </div>
                    </Button>
                  ) : (
                    <Button
                      onClick={() => router.push('/auth/login')}
                      className="w-full h-36 lg:h-44 flex flex-col items-center justify-center bg-brand-soft-green hover:bg-brand-soft-green/90 text-white rounded-2xl transition-all duration-500 transform hover:scale-[1.02] border-0 relative"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="relative z-10 flex flex-col items-center justify-cente">
                        <Mail className="h-7 w-7 lg:h-9 lg:w-9" />
                        <div className="text-center mt-1">
                          <span className="text-xl lg:text-2xl font-bold block tracking-wide">Login</span>
                          <span className="text-sm lg:text-base opacity-95 font-medium">to Continue</span>
                        </div>
                      </div>
                    </Button>
                  )}
                  <div className="absolute top-3 right-3 z-20">
                    <IconTooltip content="Send a message to the seller to inquire about this puppy">
                      <div className="p-1.5 bg-black/15 rounded-full hover:bg-black/25 transition-colors backdrop-blur-sm">
                        <Info className="h-4 w-4 text-white" />
                      </div>
                    </IconTooltip>
                  </div>
                </div>

                {/* Offer Button */}
                <div className="group relative overflow-hidden">
                  {user ? (
                    <Button
                      onClick={handleMakeOffer}
                      className="w-full h-36 lg:h-44 flex flex-col items-center justify-center bg-orange-500 hover:bg-orange-600 text-white rounded-2xl transition-all duration-500 transform hover:scale-[1.02] border-0 relative"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="relative z-10 flex flex-col items-center justify-cente">
                        <Handshake className="h-7 w-7 lg:h-9 lg:w-9" />
                        <div className="text-center mt-1">
                          <span className="text-xl lg:text-2xl font-bold block tracking-wide">Offer</span>
                          <span className="text-sm lg:text-base opacity-95 font-medium">Make an Offer</span>
                        </div>
                      </div>
                    </Button>
                  ) : (
                    <Button
                      onClick={() => router.push('/auth/login')}
                      className="w-full h-36 lg:h-44 flex flex-col items-center justify-center bg-orange-500 hover:bg-orange-600 text-white rounded-2xl transition-all duration-500 transform hover:scale-[1.02] border-0 relative"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="relative z-10 flex flex-col items-center justify-cente">
                        <Handshake className="h-7 w-7 lg:h-9 lg:w-9" />
                        <div className="text-center mt-1">
                          <span className="text-xl lg:text-2xl font-bold block tracking-wide">Login</span>
                          <span className="text-sm lg:text-base opacity-95 font-medium">to Continue</span>
                        </div>
                      </div>
                    </Button>
                  )}
                  <div className="absolute top-3 right-3 z-20">
                    <IconTooltip content="Submit a price offer for this puppy">
                      <div className="p-1.5 bg-black/15 rounded-full hover:bg-black/25 transition-colors backdrop-blur-sm">
                        <Info className="h-4 w-4 text-white" />
                      </div>
                    </IconTooltip>
                  </div>
                </div>

                {/* Reserve Button - Always show for sale listings, but disable when seller doesn't have payment setup */}
                {listing && (
                <div className="group relative overflow-hidden">
                  {user ? (
                    <Button
                      onClick={handleReservePuppy}
                      disabled={availability?.isSoldOut || checkingSellerPayment || sellerPaymentSetup === false}
                      className={cn(
                        "w-full h-36 lg:h-44 flex flex-col items-center justify-center text-white rounded-2xl transition-all duration-500 transform border-0 relative",
                        availability?.isSoldOut || sellerPaymentSetup === false
                          ? "bg-gray-400 cursor-not-allowed hover:bg-gray-400"
                          : "bg-brand-dark-green hover:bg-brand-dark-green/90 hover:scale-[1.02]"
                      )}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="relative z-10 flex flex-col items-center justify-cente">
                        <Shield className="h-7 w-7 lg:h-9 lg:w-9" />
                        <div className="text-center mt-1">
                          <span className="text-xl lg:text-2xl font-bold block tracking-wide">
                            Reserve
                          </span>
                          <span className="text-sm lg:text-base opacity-95 font-medium">
                            {availability?.isSoldOut 
                              ? "All Puppies Reserved" 
                              : sellerPaymentSetup === false 
                              ? "Unavailable" 
                              : "Reserve Puppy"}
                          </span>
                        </div>
                      </div>
                    </Button>
                  ) : (
                    <Button
                      onClick={() => router.push('/auth/login')}
                      disabled={availability?.isSoldOut || checkingSellerPayment || sellerPaymentSetup === false}
                      className={cn(
                        "w-full h-36 lg:h-44 flex flex-col items-center justify-center text-white rounded-2xl transition-all duration-500 transform border-0 relative",
                        availability?.isSoldOut || sellerPaymentSetup === false
                          ? "bg-gray-400 cursor-not-allowed hover:bg-gray-400"
                          : "bg-brand-dark-green hover:bg-brand-dark-green/90 hover:scale-[1.02]"
                      )}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="relative z-10 flex flex-col items-center justify-cente">
                        <Shield className="h-7 w-7 lg:h-9 lg:w-9" />
                        <div className="text-center mt-1">
                          <span className="text-xl lg:text-2xl font-bold block tracking-wide">
                            {availability?.isSoldOut ? "Sold Out" : sellerPaymentSetup === false ? "Unavailable" : "Login"}
                          </span>
                          <span className="text-sm lg:text-base opacity-95 font-medium">
                            {availability?.isSoldOut 
                              ? "All Puppies Reserved" 
                              : sellerPaymentSetup === false 
                              ? "Payment Setup Required" 
                              : "to Continue"}
                          </span>
                        </div>
                      </div>
                    </Button>
                  )}
                  {/* Tooltip always shown to explain */}
                  <div className="absolute top-3 right-3 z-20">
                    <IconTooltip content={
                      availability?.isSoldOut 
                        ? "All puppies in this listing have been reserved" 
                        : sellerPaymentSetup === false
                        ? "Reservations are temporarily unavailable. The seller needs to complete their payment setup to accept reservations."
                        : "Reserve this puppy with a deposit"
                    }>
                      <div className="p-1.5 bg-black/15 rounded-full hover:bg-black/25 transition-colors backdrop-blur-sm">
                        <Info className="h-4 w-4 text-white" />
                      </div>
                    </IconTooltip>
                  </div>
                </div>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-berkshire mb-4">Description</h2>
              <div className="whitespace-pre-line bg-white pt-2 pb-6 rounded-lg shadow-sm">
                {listing.description}
              </div>
            </section>

            {/* Puppy Details Section */}
            {listing.puppy_details && Array.isArray(listing.puppy_details) && listing.puppy_details.length > 0 && (
              <section>
                <h2 className="text-2xl font-berkshire mb-4">Puppy Details</h2>
                <div className="space-y-4">
                  {listing.puppy_details.map((puppy, index) => (
                    puppy && typeof puppy === 'object' && (
                      <div key={index} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-brand-dark-green mb-2">Puppy {index + 1}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          {puppy.sex && (
                            <p><span className="font-medium">Sex:</span> {capitalizeFirstLetter(puppy.sex)}</p>
                          )}
                          {puppy.color && (
                            <p><span className="font-medium">Color:</span> {puppy.color}</p>
                          )}
                          {puppy.colourCollar && (
                            <p><span className="font-medium">Collar:</span> {capitalizeWords(puppy.colourCollar)}</p>
                          )}
                          {puppy.microchipNumber && (
                            <p><span className="font-medium">Microchip:</span> {puppy.microchipNumber}</p>
                          )}
                          {puppy.weight && (
                            <p><span className="font-medium">Weight:</span> {puppy.weight}</p>
                          )}
                          {puppy.price && (
                            <p><span className="font-medium">Price:</span> €{puppy.price}</p>
                          )}
                        </div>
                        {puppy.notes && (
                          <p className="mt-2"><span className="font-medium">Notes:</span> {puppy.notes}</p>
                        )}
                      </div>
                    )
                  ))}
                </div>
              </section>
            )}

            {isMobile && (
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
                            href={`/users/${listing.seller_id}`}
                            className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {resolveSellerLinkLabel(
                              listing.seller_name,
                              listing.seller_id
                            )}
                          </Link>
                        </div>
                        {listing.location?.trim() ? (
                          <p className="text-gray-600 mb-2">
                            County: {capitalizeWords(listing.location)}
                          </p>
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
                              <span className="font-semibold">Vet Location:</span> {listing.vet_location}
                            </p>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}
          </div>
        </div>

        {familyTreeData && (
          <FamilyTreeSection
            puppy={{
              title: listing.title,
              breed: formatBreedName(listing.breed),
              image: listing.images?.[0] || null
            }}
            familyTree={familyTreeData}
            backgroundColor="#E1E8E0"
            className="mb-8"
          />
        )}

        <ContactChoiceModal
          isOpen={contactChoiceModalOpen}
          onClose={() => setContactChoiceModalOpen(false)}
          sellerPhone={listing.seller_phone}
          onMessageChosen={handleMessageChosen}
        />

        <ContactSellerModal
          isOpen={contactModalOpen}
          onClose={() => setContactModalOpen(false)}
          sellerId={listing.seller_id}
          listingId={listing.id}
          listingType="listing"
          listingTitle={listing.title}
          contactOnly={true}
        />

        <Dialog open={offerModalOpen} onOpenChange={setOfferModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Make an Offer</DialogTitle>
              <DialogDescription>Submit your offer for this puppy.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label htmlFor="offer-amount" className="block text-sm font-medium mb-1">Offer Amount (€)</label>
                <Input
                  id="offer-amount"
                  type="number"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder="Enter your offer amount"
                  min="1"
                  step="1"
                />
              </div>
              <div>
                <label htmlFor="offer-message" className="block text-sm font-medium mb-1">Message</label>
                <Textarea
                  id="offer-message"
                  rows={3}
                  value={offerMessage}
                  onChange={(e) => setOfferMessage(e.target.value)}
                  placeholder="Additional message to the seller..."
                />
              </div>

              {/* Collar Color Selection for Offers */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Puppy Collar Colors (Optional)
                </label>
                <p className="text-xs text-muted-foreground mb-3">
                  Select the collar colors of puppies you're interested in making an offer for.
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                  {collarColors.map((color) => (
                    <div key={color} className="flex items-center space-x-2">
                      <Checkbox
                        id={`offer-${color}`}
                        checked={offerCollarColors.includes(color)}
                        onCheckedChange={(checked) => handleOfferCollarColorChange(color, checked as boolean)}
                      />
                      <label
                        htmlFor={`offer-${color}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {color}
                      </label>
                    </div>
                  ))}
                </div>
                {offerCollarColors.length > 0 && (
                  <p className="text-xs text-blue-600 mt-2">
                    Selected: {offerCollarColors.join(', ')}
                  </p>
                )}
              </div>
              <Button
                onClick={handleSubmitOffer}
                className="w-full bg-orange-500 hover:bg-orange-600"
                disabled={isSubmittingOffer}
              >
                {isSubmittingOffer ? "Submitting..." : "Submit Offer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <ReservationModal
          open={reserveModalOpen}
          onOpenChange={setReserveModalOpen}
          listing={listing}
          availability={availability || {
            availableMales: 0,
            availableFemales: 0,
            availableIndividualPuppies: [],
            totalAvailable: 0,
            isSoldOut: false,
            reservedMales: 0,
            reservedFemales: 0,
            reservedPuppyIds: []
          }}
          onSubmit={handleSubmitReservation}
          isProcessing={isProcessingReservation}
        />

        <Dialog open={growIntoModalOpen} onOpenChange={setGrowIntoModalOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader className="text-center pb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <DialogTitle className="font-berkshire text-3xl">
                  Who Will I Grow Into?
                </DialogTitle>
                {breedInfoForModal?.isCrossbreed && (
                  <Badge variant="secondary" className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-800 border-purple-200 text-xs font-medium px-2 py-1">
                    Crossbreed
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-gray-600">
                {breedInfoForModal?.isCrossbreed
                  ? `Discover the unique characteristics this ${breedInfoForModal.breed1Name} x ${breedInfoForModal.breed2Name} crossbreed puppy may develop.`
                  : `Discover what this adorable puppy will look like as a full-grown adult and learn about their breed characteristics.`
                }
              </DialogDescription>
              {breedInfoForModal?.isCrossbreed && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium text-center">
                    Crossbreed puppies may inherit traits from both parents - here's what to expect.
                  </p>
                </div>
              )}
            </DialogHeader>

            <div className="space-y-4">
              {breedInfoForModal?.isCrossbreed ? (
                <>
                  {/* Split Card Layout for Crossbreed Parent Breeds */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Parent Breed 1 Card */}
                    <div className="bg-white rounded-lg border-2 border-gray-100 overflow-hidden shadow-sm">
                      <div className="relative">
                        <AspectRatio ratio={4 / 3} className="bg-muted">
                          {breedInfoLoading || crossbreedInfoLoading ? (
                            <Skeleton className="w-full h-full" />
                          ) : (
                            <img
                              src={breedInfoForModal.breed1Image}
                              alt={`${breedInfoForModal.breed1Name}`}
                              className="h-full w-full object-cover object-center"
                              onError={(e) => {
                                e.currentTarget.src = GROW_INTO_FALLBACK_B1;
                              }}
                            />
                          )}
                        </AspectRatio>
                        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-1 shadow-sm">
                          <span className="text-sm font-semibold text-gray-800">Parent Breed 1</span>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="font-semibold text-lg text-gray-800">{breedInfoForModal.breed1Name}</h3>
                          <IconTooltip content="Your puppy may inherit some or all traits from this parent breed">
                            <Info className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                          </IconTooltip>
                        </div>
                        {breedInfoForModal.breed1Info && (
                          <div className="space-y-2 text-sm">
                            {(breedInfoForModal.breed1Info as any)?.size && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Size:</span>
                                <span className="font-medium">{(breedInfoForModal.breed1Info as any).size}</span>
                              </div>
                            )}
                            {(breedInfoForModal.breed1Info as any)?.energy && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Energy:</span>
                                <span className="font-medium">{(breedInfoForModal.breed1Info as any).energy}</span>
                              </div>
                            )}
                            {(breedInfoForModal.breed1Info as any)?.grooming && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Grooming:</span>
                                <span className="font-medium">{(breedInfoForModal.breed1Info as any).grooming}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Parent Breed 2 Card */}
                    <div className="bg-white rounded-lg border-2 border-gray-100 overflow-hidden shadow-sm">
                      <div className="relative">
                        <AspectRatio ratio={4 / 3} className="bg-muted">
                          {breedInfoLoading || crossbreedInfoLoading ? (
                            <Skeleton className="w-full h-full" />
                          ) : (
                            <img
                              src={breedInfoForModal.breed2Image}
                              alt={`${breedInfoForModal.breed2Name}`}
                              className="h-full w-full object-cover object-center"
                              onError={(e) => {
                                e.currentTarget.src = GROW_INTO_FALLBACK_B2;
                              }}
                            />
                          )}
                        </AspectRatio>
                        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-1 shadow-sm">
                          <span className="text-sm font-semibold text-gray-800">Parent Breed 2</span>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="font-semibold text-lg text-gray-800">{breedInfoForModal.breed2Name}</h3>
                          <IconTooltip content="Your puppy may inherit some or all traits from this parent breed">
                            <Info className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                          </IconTooltip>
                        </div>
                        {breedInfoForModal.breed2Info && (
                          <div className="space-y-2 text-sm">
                            {(breedInfoForModal.breed2Info as any)?.size && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Size:</span>
                                <span className="font-medium">{(breedInfoForModal.breed2Info as any).size}</span>
                              </div>
                            )}
                            {(breedInfoForModal.breed2Info as any)?.energy && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Energy:</span>
                                <span className="font-medium">{(breedInfoForModal.breed2Info as any).energy}</span>
                              </div>
                            )}
                            {(breedInfoForModal.breed2Info as any)?.grooming && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Grooming:</span>
                                <span className="font-medium">{(breedInfoForModal.breed2Info as any).grooming}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Crossbreed Mix Indicator with Tooltip */}
                  <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                    <div className="text-3xl mb-2">✨</div>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg text-gray-800">Your Unique Crossbreed</h3>
                      <IconTooltip content="Crossbreed puppies are unique! Each one may inherit different combinations of traits from their parents, creating a one-of-a-kind personality and appearance.">
                        <Info className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                      </IconTooltip>
                    </div>
                    <p className="text-sm text-gray-600">
                      This puppy combines traits from both parent breeds, creating a truly one-of-a-kind companion with unique characteristics!
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Pedigree adult image — object-cover fills frame (may crop edges if aspect ratios differ) */}
                  <div className="relative w-full">
                    <AspectRatio ratio={4 / 3} className="bg-muted rounded-lg overflow-hidden">
                      {breedInfoLoading ? (
                        <Skeleton className="h-full w-full" />
                      ) : (
                        <img
                          src={breedInfoForModal?.adultImage || GROW_INTO_FALLBACK_ADULT}
                          alt={`Adult ${pedigreeDisplayBreedName || formatBreedName(listing?.breed || '')}`}
                          className="h-full w-full object-cover object-center"
                          onError={(e) => {
                            e.currentTarget.src = GROW_INTO_FALLBACK_ADULT;
                          }}
                        />
                      )}
                    </AspectRatio>
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1">
                      <span className="text-xs font-medium text-gray-700">Adult {pedigreeDisplayBreedName || formatBreedName(listing?.breed || '')}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Info Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {breedInfoForModal?.infoBadges?.map((badge, index) => (
                  <div key={index} className={`${badge.color} text-white rounded-full px-4 py-2 text-center`}>
                    <div className="font-semibold text-xs">{badge.label}: {badge.value}</div>
                  </div>
                ))}
              </div>

              {/* Description */}
              <div className="text-center text-gray-700 leading-relaxed text-sm">
                {breedInfoLoading || crossbreedInfoLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  breedInfoForModal?.description
                )}
              </div>

              {/* Temperament Section */}
              <div className="text-center">
                <h3 className="font-semibold text-lg mb-3 text-gray-800">Temperament</h3>
                {breedInfoLoading || crossbreedInfoLoading ? (
                  <div className="flex flex-wrap justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-6 w-16 rounded-full" />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap justify-center gap-2">
                    {breedInfoForModal?.temperamentTags?.map((trait, index) => (
                      <div key={index} className="bg-gray-200 text-gray-700 rounded-full px-3 py-1 text-xs font-medium">
                        {trait}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <section className="bg-white py-12 px-4">
        <ContinueSearchSection
          title="Looking for something else?"
          listings={similarListings}
          goldStarUrl={GOLD_STAR_URL}
          hideLinks={true}
          backgroundColor="bg-white"
        />
      </section>

      {/* Business Boost Carousel */}
      <BusinessBoostCarousel title="Featured Businesses" />

      {/* Marketplace Product Boost Carousel */}
      <MarketplaceProductBoostCarousel title="Featured Products" />

      <section className="w-screen relative left-1/2 right-1/2 -mx-[50vw] bg-[#E1E8E0] py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Link href="/listings">
              <div className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-shadow duration-300 h-full flex flex-col items-center justify-center">
                <div className="bg-brand-light-green rounded-full p-4 mb-3">
                  <ArrowLeft className="w-6 h-6 text-brand-dark-green" />
                </div>
                <h3 className="font-semibold text-lg mb-2">View All Puppies for Sale</h3>
                <p className="text-gray-600">Browse all available puppies</p>
              </div>
            </Link>

            <Link href="/stud">
              <div className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-shadow duration-300 h-full flex flex-col items-center justify-center">
                <div className="bg-[#F0EDFF] rounded-full p-4 mb-3">
                  <PawPrint className="w-6 h-6 text-[#9b87f5]" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Looking for Stud Services?</h3>
                <p className="text-gray-600">View stud dogs available for breeding</p>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default ListingDetail;
