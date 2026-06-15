'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Heart, MapPin, Check, MessageCircle, Dog, Calendar, UserRound, Info, PawPrint, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { IconTooltip } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import ListingCarouselSection, { MediaItem } from '@/components/listings/ListingCarouselSection';
import FamilyTreeSection from '@/components/listings/FamilyTreeSection';
import ContinueSearchSection from '@/components/listings/ContinueSearchSection';
import PulseImageButton, { PulsePawButton } from '@/components/PulseButton';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase/client';
import { findMatchingBreedForFilter, formatBreedName } from '@/lib/utils/breed-utils';
import type { ShowcaseListing } from '@/types/blog';
import type { Json } from '@/lib/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/hooks/use-wishlist';
import { isShowcaseListingExpired } from '@/lib/utils/showcase-age';
import {
  isLegacyShowcaseSlugRoute,
  resolveShowcaseCanonicalId,
} from '@/lib/utils/showcase-route';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Placeholder image URL to use if no video is provided
const PLACEHOLDER_IMAGE_URL = "https://images.unsplash.com/photo-1591160690555-5debfba289f0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80";

// Gold star URL for verified listings
const GOLD_STAR_URL = "https://img.icons8.com/fluency/48/star.png";

interface EnhancedShowcaseListing extends ShowcaseListing {
  breedInfo?: {
    adultImage: string;
    description: string;
    grooming?: string;
    energy?: string;
    size?: string;
    life_expectancy?: string;
    temperament?: any;
    /** Crossbreed parent images from quiz_breeds */
    parent1Image?: string;
    parent2Image?: string;
  };
  familyTree?: {
    mother?: {
      name: string;
      breed: string;
      image: string;
    };
    father?: {
      name: string;
      breed: string;
      image: string;
    };
    grandparents?: {
      maternalGrandmother?: {
        name: string;
        breed: string;
        image: string;
      };
      maternalGrandfather?: {
        name: string;
        breed: string;
        image: string;
      };
      paternalGrandmother?: {
        name: string;
        breed: string;
        image: string;
      };
      paternalGrandfather?: {
        name: string;
        breed: string;
        image: string;
      };
    };
  };
  video?: string;
}

// Interface for listings to display in ContinueSearchSection
interface ShowcaseCardListing {
  id: string;
  title: string;
  location: string;
  image: string;
  breed: string;
  verified: boolean;
  type: 'showcase';
}

// Interface matching the FamilyTreeSection component requirements
interface ProcessedFamilyTreeData {
  mother: { name: string; breed: string; image: string };
  father: { name: string; breed: string; image: string };
  grandparents: {
    maternalGrandmother: { name: string; breed: string; image: string };
    maternalGrandfather: { name: string; breed: string; image: string };
    paternalGrandmother: { name: string; breed: string; image: string };
    paternalGrandfather: { name: string; breed: string; image: string };
  };
}

const ShowcaseDetail: React.FC = () => {
  const params = useParams();
  const id = params?.id as string;
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { toggleWishlist, isInWishlist } = useWishlist();
  
  /** Filled heart after guest submits email (not in user_wishlists). */
  const [emailCaptureHeart, setEmailCaptureHeart] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [growIntoModalOpen, setGrowIntoModalOpen] = useState(false);
  const [listing, setListing] = useState<EnhancedShowcaseListing | null>(null);
  const [listingExpired, setListingExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [similarListings, setSimilarListings] = useState<ShowcaseCardListing[]>([]);
  const [likeEmailModalOpen, setLikeEmailModalOpen] = useState(false);
  const [likeEmail, setLikeEmail] = useState('');
  
  // Fetch the showcase listing data from Supabase
  useEffect(() => {
    let cancelled = false;

    const applyIfActive = (fn: () => void) => {
      if (!cancelled) fn();
    };

    const buildMinimalListing = (data: any): EnhancedShowcaseListing => ({
      ...data,
      images: Array.isArray(data.images)
        ? data.images.map((img: any) => String(img))
        : [],
      breedInfo: {
        adultImage:
          'https://images.unsplash.com/photo-1561495376-dc9c7c5b8726?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
        description: `${data.breed || 'This breed'} is a wonderful family pet.`,
      },
      familyTree: {
        mother: { name: data.mother_name || '', breed: data.mother_breed || '', image: data.mother_image || '' },
        father: { name: data.father_name || '', breed: data.father_breed || '', image: data.father_image || '' },
        grandparents: {
          maternalGrandmother: { name: '', breed: '', image: '' },
          maternalGrandfather: { name: '', breed: '', image: '' },
          paternalGrandmother: { name: '', breed: '', image: '' },
          paternalGrandfather: { name: '', breed: '', image: '' },
        },
      },
      video: data.video_url || undefined,
    });

    const processListing = async (data: any) => {
      try {
        if (isShowcaseListingExpired(data)) {
          applyIfActive(() => {
            setListing(null);
            setListingExpired(true);
          });
          return;
        }

        // Fetch breed info from quiz_breeds table with all the new fields
        let breedDescription = `${data.breed}s are wonderful family pets known for their loyal and friendly disposition.`;
        let breedImageUrl = "https://images.unsplash.com/photo-1561495376-dc9c7c5b8726?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80";
        let grooming = "";
        let energy = "";
        let size = "";
        let life_expectancy = "";
        let temperament = null;
        
        // Match quiz_breeds by breed name (exact ilike first, then partial — same idea as useBreedInfo)
        let breedData: any = null;
        if (data.breed?.trim()) {
          const rawBreed = data.breed.trim();
          const breedLookup = findMatchingBreedForFilter(rawBreed) || formatBreedName(rawBreed);
          let { data: row, error: breedError } = await supabase
            .from("quiz_breeds")
            .select("description, image_url, grooming, energy, size, life_expectancy, temperament")
            .ilike("breed", breedLookup)
            .maybeSingle();

          if (breedError) {
            console.error("quiz_breeds lookup:", breedError);
          }
          if (!row) {
            const { data: partial } = await supabase
              .from("quiz_breeds")
              .select("description, image_url, grooming, energy, size, life_expectancy, temperament")
              .ilike("breed", `%${breedLookup}%`)
              .limit(1)
              .maybeSingle();
            row = partial;
          }
          breedData = row;
        }

        if (breedData) {
          breedDescription = breedData.description || breedDescription;
          breedImageUrl = breedData.image_url || breedImageUrl;
          grooming = breedData.grooming || "";
          energy = breedData.energy || "";
          size = breedData.size || "";
          life_expectancy = breedData.life_expectancy || "";
          temperament = breedData.temperament;
        }

        let parent1Image: string | undefined;
        let parent2Image: string | undefined;
        if (data.breed_type === "crossbreed" && data.breed_1 && data.breed_2) {
          const fetchParent = async (name: string) => {
            const t = String(name).trim();
            if (!t) return null;
            const lookup = findMatchingBreedForFilter(t) || formatBreedName(t);
            if (!lookup.trim()) return null;
            let { data: p } = await supabase
              .from("quiz_breeds")
              .select("image_url")
              .ilike("breed", lookup)
              .maybeSingle();
            if (!p) {
              const { data: partial } = await supabase
                .from("quiz_breeds")
                .select("image_url")
                .ilike("breed", `%${lookup}%`)
                .limit(1)
                .maybeSingle();
              p = partial;
            }
            return p?.image_url || null;
          };
          const [img1, img2] = await Promise.all([fetchParent(data.breed_1), fetchParent(data.breed_2)]);
          parent1Image = img1 || undefined;
          parent2Image = img2 || undefined;
        }

        // Process family tree data from individual columns instead of JSONB
        let familyTreeData = {
          mother: { 
            name: data.mother_name || '', 
            breed: data.mother_breed || '', 
            image: data.mother_image || '' 
          },
          father: { 
            name: data.father_name || '', 
            breed: data.father_breed || '', 
            image: data.father_image || '' 
          },
          grandparents: {
            maternalGrandmother: { 
              name: data.maternal_grandmother_name || '', 
              breed: data.maternal_grandmother_breed || '', 
              image: data.maternal_grandmother_image || '' 
            },
            maternalGrandfather: { 
              name: data.maternal_grandfather_name || '', 
              breed: data.maternal_grandfather_breed || '', 
              image: data.maternal_grandfather_image || '' 
            },
            paternalGrandmother: { 
              name: data.paternal_grandmother_name || '', 
              breed: data.paternal_grandmother_breed || '', 
              image: data.paternal_grandmother_image || '' 
            },
            paternalGrandfather: { 
              name: data.paternal_grandfather_name || '', 
              breed: data.paternal_grandfather_breed || '', 
              image: data.paternal_grandfather_image || '' 
            }
          }
        };

        // Process the listing data
        const processed: EnhancedShowcaseListing = {
          ...data,
          // Ensure images is string array
          images: Array.isArray(data.images) 
            ? data.images.map((img: any) => String(img)) 
            : [],
          // Add breed info with all data from quiz_breeds
          breedInfo: {
            adultImage: breedImageUrl,
            description: breedDescription,
            grooming,
            energy,
            size,
            life_expectancy,
            temperament,
            ...(parent1Image || parent2Image
              ? { parent1Image, parent2Image }
              : {}),
          },
          // Use the processed family tree data from individual columns
          familyTree: familyTreeData,
          // Use video_url from database if available
          video: data.video_url || undefined
        };

        applyIfActive(() => setListing(processed));
      } catch (err) {
        console.error("Error processing listing data:", err);
        applyIfActive(() => setListing(buildMinimalListing(data)));
      }
    };

    const fetchPublishedListingById = async (listingId: string) => {
      const { data, error } = await supabase
        .from('showcase_listings')
        .select('*')
        .eq('admin_approved', true)
        .eq('is_published', true)
        .eq('id', listingId)
        .maybeSingle();
      if (error) {
        console.error('Error fetching showcase listing:', error);
        return null;
      }
      return data;
    };

    const fetchListing = async () => {
      applyIfActive(() => {
        setLoading(true);
        setListingExpired(false);
      });

      try {
        if (!id) {
          applyIfActive(() => setListing(null));
          return;
        }

        const canonicalId = resolveShowcaseCanonicalId(id);
        if (canonicalId) {
          const row = await fetchPublishedListingById(canonicalId);
          if (row) {
            await processListing(row);
            return;
          }
        }

        // Legacy slug: "{last4uuidhex}-{title-slug}" (no full UUID in path)
        if (isLegacyShowcaseSlugRoute(id)) {
          const lastFourChars = id.split('-')[0];
          const { data: idList, error: idListError } = await supabase
            .from('showcase_listings')
            .select('id')
            .eq('admin_approved', true)
            .eq('is_published', true);

          if (idListError) {
            console.error('Error fetching showcase listing IDs:', idListError);
            applyIfActive(() => setListing(null));
            return;
          }

          const matchingId = idList?.find((item) =>
            String(item.id).endsWith(lastFourChars)
          )?.id;

          if (matchingId) {
            const row = await fetchPublishedListingById(matchingId);
            if (row) {
              await processListing(row);
              return;
            }
          }
        }

        // Legacy numeric showcase URLs
        if (!Number.isNaN(Number(id))) {
          const { data: idList, error: idListError } = await supabase
            .from('showcase_listings')
            .select('id')
            .eq('admin_approved', true)
            .eq('is_published', true);

          if (!idListError && idList?.length) {
            const numericId = Number(id);
            const matchingListingId = idList.find((listing) => {
              const calculatedId =
                parseInt(listing.id.replace(/-/g, '').substring(0, 9), 16) % 100000;
              return calculatedId === numericId;
            })?.id;

            if (matchingListingId) {
              const row = await fetchPublishedListingById(matchingListingId);
              if (row) {
                await processListing(row);
                return;
              }
            }
          }
        }

        console.error('No showcase listing found with ID:', id);
        applyIfActive(() => setListing(null));
      } catch (err) {
        console.error('Unexpected error fetching showcase listing:', err);
        applyIfActive(() => setListing(null));
      } finally {
        applyIfActive(() => setLoading(false));
      }
    };

    if (id) {
      fetchListing();
    }

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Fetch similar listings based on breed or just get recent listings
  useEffect(() => {
    const fetchSimilarListings = async () => {
      try {
        const routeId = id ?? '';
        const uuidFromRoute = resolveShowcaseCanonicalId(routeId);
        const currentListingId = listing?.id ?? uuidFromRoute ?? routeId;

        const isCurrentListing = (itemId: string) => {
          if (!routeId && !currentListingId) return false;
          if (itemId === currentListingId || itemId === routeId) return true;
          if (uuidFromRoute && itemId === uuidFromRoute) return true;

          const numId = Number(routeId);
          if (!isNaN(numId)) {
            const calculatedId =
              parseInt(itemId.replace(/-/g, '').substring(0, 9), 16) % 100000;
            if (calculatedId === numId) return true;
          }

          if (!uuidFromRoute && routeId.includes('-')) {
            const lastFourChars = routeId.split('-')[0];
            if (itemId.endsWith(lastFourChars)) return true;
          }

          return false;
        };

        // Active showcases only — same rules as /showcase index and detail page
        const { data: allListings, error: allListingsError } = await supabase
          .from("showcase_listings")
          .select(
            "id, title, breed, location, images, admin_approved, date_of_birth, created_at, is_expired"
          )
          .eq("admin_approved", true)
          .eq("is_published", true);

        if (allListingsError) {
          console.error("Error fetching all showcase listings:", allListingsError);
          setSimilarListings([]);
          return;
        }

        const activeListings = (allListings ?? []).filter(
          (item) => !isShowcaseListingExpired(item)
        );

        if (activeListings.length > 0) {
          const otherListings = activeListings.filter(
            (item) => item.id && !isCurrentListing(item.id)
          );

          // Prefer same breed when available
          let filteredListings = otherListings;
          if (listing?.breed) {
            const breedSpecificListings = otherListings.filter(
              (item) => item.breed === listing.breed
            );
            if (breedSpecificListings.length > 0) {
              filteredListings = breedSpecificListings;
            }
          }

          formatAndSetListings(filteredListings.slice(0, 4));
        } else {
          setSimilarListings([]);
        }
      } catch (err) {
        console.error("Error in similar listings fetch:", err);
        setSimilarListings([]);
      }
    };

    // Helper function to format and set listings
    const formatAndSetListings = (data: any[]) => {
      // Format the data to match the expected format for ContinueSearchSection
      const formatted: ShowcaseCardListing[] = data.map(item => ({
        id: item.id,
        title: item.title,
        location: item.location,
        image: Array.isArray(item.images) && item.images.length > 0 
          ? String(item.images[0]) 
          : PLACEHOLDER_IMAGE_URL,
        breed: item.breed,
        verified: item.admin_approved === true, // Show verification badge if admin approved
        type: 'showcase' as const
      }));
      
      setSimilarListings(formatted);
    };

    if (id) {
      fetchSimilarListings();
    }
  }, [id, listing?.id, listing?.breed]);
  
  const handleWishlistToggle = useCallback(() => {
    if (!user) {
      setLikeEmailModalOpen(true);
      return;
    }
    if (!listing?.id) return;
    void toggleWishlist(listing.id, 'showcase');
  }, [user, listing?.id, toggleWishlist]);

  const handleLikeEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!likeEmail || !likeEmail.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    
    if (!id) {
      toast({
        title: "Error",
        description: "Showcase ID is missing.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Call edge function to save email and add to MailerLite
      const { data, error } = await supabase.functions.invoke('showcase-email-notification', {
        body: {
          email: likeEmail.trim(),
          showcase_id: id,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Thank you!",
          description: "You'll be notified when this listing becomes active.",
        });
        setLikeEmail('');
        setLikeEmailModalOpen(false);
        setEmailCaptureHeart(true);
      } else {
        throw new Error(data?.error || "Failed to register email");
      }
    } catch (err: any) {
      console.error('Error in email submission:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to register email. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Prepare carousel items with video in second position or placeholder if no video
  const prepareCarouselMedia = (): MediaItem[] => {
    if (!listing || !listing.images) return [];
    
    const media: MediaItem[] = listing.images.map((img) => ({ type: 'image', src: img }));
    
    // If video exists, insert it after the first image
    if (listing.video) {
      media.splice(1, 0, { type: 'video', src: listing.video });
    }
    
    return media;
  };

  const processFamilyTree = (): ProcessedFamilyTreeData | undefined => {
    if (!listing) return undefined;
    
    const family: any = listing.familyTree || {};
    
    // Create a properly structured family tree using available data or defaults
    return {
      mother: {
        name: family.mother?.name || '',
        breed: family.mother?.breed || '',
        image: family.mother?.image || ''
      },
      father: {
        name: family.father?.name || '',
        breed: family.father?.breed || '',
        image: family.father?.image || ''
      },
      grandparents: {
        maternalGrandmother: {
          name: family.grandparents?.maternalGrandmother?.name || '',
          breed: family.grandparents?.maternalGrandmother?.breed || '',
          image: family.grandparents?.maternalGrandmother?.image || ''
        },
        maternalGrandfather: {
          name: family.grandparents?.maternalGrandfather?.name || '',
          breed: family.grandparents?.maternalGrandfather?.breed || '',
          image: family.grandparents?.maternalGrandfather?.image || ''
        },
        paternalGrandmother: {
          name: family.grandparents?.paternalGrandmother?.name || '',
          breed: family.grandparents?.paternalGrandmother?.breed || '',
          image: family.grandparents?.paternalGrandmother?.image || ''
        },
        paternalGrandfather: {
          name: family.grandparents?.paternalGrandfather?.name || '',
          breed: family.grandparents?.paternalGrandfather?.breed || '',
          image: family.grandparents?.paternalGrandfather?.image || ''
        }
      }
    };
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Skeleton className="h-[400px] w-full rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-berkshire mb-4">
          {listingExpired ? 'This showcase has ended' : 'Showcase Listing Not Found'}
        </h2>
        <p className="mb-8 text-muted-foreground max-w-md mx-auto">
          {listingExpired
            ? 'This litter preview is no longer in the active showcase window (typically 4–6 weeks old). Browse current upcoming litters instead.'
            : "The listing you're looking for doesn't exist or may have been removed."}
        </p>
        <Link href="/showcase">
          <Button>View All Showcases</Button>
        </Link>
      </div>
    );
  }

  const processedFamilyTree = processFamilyTree();
  const isWishListed = isInWishlist(listing.id) || emailCaptureHeart;

  return (
    <>
      {/* Email Prompt Modal for Like (when not logged in) */}
      <Dialog open={likeEmailModalOpen} onOpenChange={setLikeEmailModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Get Notified When This Listing Goes Live</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll notify you when this showcase listing becomes active and available for sale.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLikeEmailSubmit} className="space-y-4">
            <div>
              <Label htmlFor="like-email">Email Address</Label>
              <Input
                id="like-email"
                type="email"
                placeholder="your@email.com"
                value={likeEmail}
                onChange={(e) => setLikeEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setLikeEmailModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Notify Me
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto px-4 py-8">
        {/* Two column layout for medium screens and up */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Left column - Image carousel and seller info */}
          <div className="space-y-6">
            {/* Image carousel with wishlist button */}
            <div className="relative">
              {/* Showcase badge - positioned absolutely at top left of carousel */}
              <div className="absolute top-3 left-3 z-10">
                <Badge className="bg-[#FFDEE2] text-gray-800 px-3 py-1.5">Showcase</Badge>
              </div>
              
              <ListingCarouselSection 
                title={listing.title}
                images={prepareCarouselMedia()}
                video={listing.video}
                isWishListed={isWishListed}
                onWishlistToggle={handleWishlistToggle}
                itemType="showcase"
                listingId={listing.id}
                suppressWishlistAuthModal
              />
            </div>
          </div>

          {/* Right column - Listing details */}
          <div className="space-y-6 relative">
            {/* Who Will I Grow Into button - Updated to use PulsePawButton */}
            <div className="absolute right-0 top-4 md:top-0 z-10">
              <PulsePawButton onClick={() => setGrowIntoModalOpen(true)}>
                Who Will I Grow Into?
              </PulsePawButton>
            </div>
            
            {/* Listing information */}
            <section>
              <div className="space-y-2 text-gray-700">
                {/* Title */}
                <h1 className="text-3xl font-berkshire mb-10 max-w-[12ch] md:max-w-[30ch] break-words">
                  {listing.title}
                </h1>
                
                {/* Breed - With icon */}
                <div className="flex items-center">
                  <IconTooltip content="Breed" className="mr-1">
                    <Dog className="w-4 h-4 text-pink-400" />
                  </IconTooltip>
                  <span className="font-medium text-pink-400">Breed:</span>
                  <span className="ml-2">{listing.breed}</span>
                </div>

                {/* Location - With icon */}
                <div className="flex items-center">
                  <IconTooltip content="Location" className="mr-1">
                    <MapPin className="w-4 h-4 text-pink-400" />
                  </IconTooltip>
                  <span className="font-medium text-pink-400">Location:</span>
                  <span className="ml-2">{listing.location}</span>
                </div>

                {/* Date of Birth - With icon - Updated tooltip text */}
                <div className="flex items-center">
                  <IconTooltip content="Date of Birth" className="mr-1">
                    <Calendar className="w-4 h-4 text-pink-400" />
                  </IconTooltip>
                  <span className="font-medium text-pink-400">Date of birth:</span>
                  <span className="ml-2">{new Date(listing.date_of_birth).toLocaleDateString()}</span>
                </div>
              </div>
            </section>

            {/* Description removed for showcase listings to comply with legal requirements */}
          </div>
        </div>

        {/* Family tree section - full width */}
        {processedFamilyTree && (
          <FamilyTreeSection 
            puppy={{
              title: listing.title,
              breed: listing.breed,
              image: listing.images[0]
            }}
            familyTree={processedFamilyTree}
            backgroundColor="#FFF5F6"
            className="mb-8"
          />
        )}

        {/* Who Will I Grow Into Modal - Enhanced with crossbreed handling */}
        <Dialog open={growIntoModalOpen} onOpenChange={setGrowIntoModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-berkshire text-2xl mb-2">Who Will I Grow Into?</DialogTitle>
              <p className="text-sm text-gray-600">
                {listing.breed_type === 'crossbreed' 
                  ? `This unique crossbreed combines traits from both parent breeds`
                  : `Discover the characteristics of this wonderful breed`
                }
              </p>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4">
              {listing.breed_type === 'crossbreed' ? (
                <>
                  {/* Crossbreed Parent Display */}
                  <div className="w-full grid grid-cols-2 gap-3 mb-4">
                    <div className="text-center">
                      <div className="w-full h-24 rounded-lg overflow-hidden bg-muted mb-2">
                        <img
                          src={listing.breedInfo?.parent1Image || PLACEHOLDER_IMAGE_URL}
                          alt={listing.breed_1 || 'Parent breed 1'}
                          className="h-full w-full object-cover object-center"
                          onError={(e) => {
                            e.currentTarget.src = PLACEHOLDER_IMAGE_URL;
                          }}
                        />
                      </div>
                      <p className="text-xs font-medium text-gray-700">{listing.breed_1 || 'Parent Breed 1'}</p>
                    </div>
                    <div className="text-center">
                      <div className="w-full h-24 rounded-lg overflow-hidden bg-muted mb-2">
                        <img
                          src={listing.breedInfo?.parent2Image || PLACEHOLDER_IMAGE_URL}
                          alt={listing.breed_2 || 'Parent breed 2'}
                          className="h-full w-full object-cover object-center"
                          onError={(e) => {
                            e.currentTarget.src = PLACEHOLDER_IMAGE_URL;
                          }}
                        />
                      </div>
                      <p className="text-xs font-medium text-gray-700">{listing.breed_2 || 'Parent Breed 2'}</p>
                    </div>
                  </div>
                  
                  {/* Crossbreed Result */}
                  <div className="w-full p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border mb-4">
                    <div className="text-center">
                      <div className="text-3xl mb-2">✨</div>
                      <h3 className="font-semibold text-base text-gray-800 mb-2">Your Unique Crossbreed</h3>
                      <p className="text-xs text-gray-600">
                        This special puppy may inherit the best traits from both parents, creating a truly one-of-a-kind companion with hybrid vigor!
                      </p>
                    </div>
                  </div>
                  
                  {/* Crossbreed characteristics */}
                  <div className="w-full grid grid-cols-2 gap-3">
                    <Badge className="w-full justify-center py-2.5 px-3 bg-indigo-500 hover:bg-indigo-600 text-white border-0 rounded-lg text-xs font-medium min-h-[2.5rem] flex items-center">
                      Type: Crossbreed
                    </Badge>
                    <Badge className="w-full justify-center py-2.5 px-3 bg-green-500 hover:bg-green-600 text-white border-0 rounded-lg text-xs font-medium min-h-[2.5rem] flex items-center">
                      Health: Hybrid Vigor
                    </Badge>
                    <Badge className="w-full justify-center py-2.5 px-3 bg-orange-500 hover:bg-orange-600 text-white border-0 rounded-lg text-xs font-medium min-h-[2.5rem] flex items-center">
                      Traits: Variable
                    </Badge>
                    <Badge className="w-full justify-center py-2.5 px-3 bg-purple-500 hover:bg-purple-600 text-white border-0 rounded-lg text-xs font-medium min-h-[2.5rem] flex items-center">
                      Size: Mixed Range
                    </Badge>
                  </div>
                  
                  {/* Crossbreed temperament */}
                  <div className="w-full">
                    <h4 className="font-medium text-sm mb-2 text-center">Expected Traits</h4>
                    <div className="flex flex-wrap justify-center gap-2">
                      {['Unique', 'Adaptable', 'Intelligent', 'Loyal', 'Family-friendly', 'Vigorous'].map((trait, index) => (
                        <Badge key={index} variant="outline" className="text-xs px-3 py-1.5 rounded-full">
                          {trait}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Pedigree breed display */}
                  <div className="w-full mb-4">
                    <AspectRatio ratio={4/3} className="bg-muted rounded-lg overflow-hidden">
                      <img 
                        src={listing.breedInfo?.adultImage || PLACEHOLDER_IMAGE_URL} 
                        alt={`Adult ${listing.breed}`}
                        className="h-full w-full object-cover object-center"
                        onError={(e) => {
                          e.currentTarget.src = PLACEHOLDER_IMAGE_URL;
                        }}
                      />
                    </AspectRatio>
                  </div>
                  
                  {/* Pedigree breed characteristic pills */}
                  <div className="w-full grid grid-cols-2 gap-3">
                    {listing.breedInfo?.grooming && (
                      <Badge className="w-full justify-center py-2.5 px-3 bg-pink-500 hover:bg-pink-600 text-white border-0 rounded-lg text-xs font-medium min-h-[2.5rem] flex items-center">
                        Grooming: {listing.breedInfo.grooming}
                      </Badge>
                    )}
                    {listing.breedInfo?.energy && (
                      <Badge className="w-full justify-center py-2.5 px-3 bg-orange-500 hover:bg-orange-600 text-white border-0 rounded-lg text-xs font-medium min-h-[2.5rem] flex items-center">
                        Energy: {listing.breedInfo.energy}
                      </Badge>
                    )}
                    {listing.breedInfo?.size && (
                      <Badge className="w-full justify-center py-2.5 px-3 bg-purple-500 hover:bg-purple-600 text-white border-0 rounded-lg text-xs font-medium min-h-[2.5rem] flex items-center">
                        Size: {listing.breedInfo.size}
                      </Badge>
                    )}
                    {listing.breedInfo?.life_expectancy && (
                      <Badge className="w-full justify-center py-2.5 px-3 bg-green-500 hover:bg-green-600 text-white border-0 rounded-lg text-xs font-medium min-h-[2.5rem] flex items-center">
                        Lifespan: {listing.breedInfo.life_expectancy}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Pedigree description */}
                  <p className="text-center text-sm leading-relaxed">{listing.breedInfo?.description}</p>
                  
                  {/* Pedigree temperament */}
                  {listing.breedInfo?.temperament && (
                    <div className="w-full">
                      <h4 className="font-medium text-sm mb-2 text-center">Temperament</h4>
                       <div className="flex flex-wrap justify-center gap-2">
                         {Array.isArray(listing.breedInfo.temperament) ? (
                           listing.breedInfo.temperament.map((trait: string, index: number) => (
                             <Badge key={index} variant="outline" className="text-xs px-3 py-1.5 rounded-full">
                               {trait}
                             </Badge>
                           ))
                         ) : (
                           <p className="text-sm text-gray-600 text-center">{listing.breedInfo.temperament}</p>
                         )}
                       </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
     {similarListings.length > 0 && (
       <section className="bg-white py-12 px-4">
         <ContinueSearchSection
           title="Discover More Upcoming Litters"
           listings={similarListings}
           goldStarUrl={GOLD_STAR_URL}
           hideLinks={true}
           backgroundColor="bg-white"
         />
       </section>
     )}

     {/* Section 2: CTA Links - Green Background */}
     <section className="bg-[#E1E8E0] py-12 px-4">
       <div className="max-w-7xl mx-auto">
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
           {/* View All Upcoming Litters */}
           <Link href="/showcase">
             <div className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-shadow duration-300 h-full flex flex-col items-center justify-center">
               <div className="bg-[#FFDEE2] rounded-full p-4 mb-3">
                 <ArrowLeft className="w-6 h-6 text-gray-700" />
               </div>
               <h3 className="font-semibold text-lg mb-2">View All Upcoming Litters</h3>
               <p className="text-gray-600">Browse all showcased future litters</p>
             </div>
           </Link>

           {/* View Available Puppies */}
           <Link href="/listings">
             <div className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-shadow duration-300 h-full flex flex-col items-center justify-center">
               <div className="bg-brand-soft-green rounded-full p-4 mb-3">
                 <PawPrint className="w-6 h-6 text-white" />
               </div>
               <h3 className="font-semibold text-lg mb-2">Ready to Buy Now?</h3>
               <p className="text-gray-600">View puppies currently available for sale</p>
             </div>
           </Link>
         </div>
       </div>
     </section>
    </>
  );
};

export default ShowcaseDetail;
