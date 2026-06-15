'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useWishlist } from '@/hooks/use-wishlist';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import ShowcaseEmailModal from '@/components/ShowcaseEmailModal';
import { isShowcaseListingExpired } from '@/lib/utils/showcase-age';

interface ShowcaseListing {
  id: string;
  title: string;
  breed: string;
  location: string;
  images: any; // JSON type from Supabase
  primary_image_index: number;
  date_of_birth: string;
  created_at: string;
  seller_id: string;
  is_expired: boolean;
  converted_to_sale_id: string | null;
  boostType?: 'standard' | 'premium' | 'elite' | 'gold' | null;
}

const ShowcaseCard = React.memo(({ listing, isWishlisted, toggleWishlist, onCardClick }: {
  listing: ShowcaseListing;
  isWishlisted: boolean;
  toggleWishlist: (id: string, e: React.MouseEvent) => void;
  onCardClick: (listing: ShowcaseListing) => void;
}) => {
  const primaryImage = Array.isArray(listing.images) && listing.images.length > 0
    ? listing.images[listing.primary_image_index] || listing.images[0]
    : null;

  // Expired when DB says so or puppy is outside the 4–6 week Showcase window
  const isExpired = isShowcaseListingExpired(listing);

  const now = new Date();
  // Calculate age in weeks from date_of_birth
  const ageInWeeks = listing.date_of_birth
    ? Math.floor((now.getTime() - new Date(listing.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 7))
    : 0;

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
    <Card
      className={cn(
        "group cursor-pointer transition-all duration-300 hover:shadow-lg border-2",
        isExpired ? "border-orange-200 bg-orange-50/30" : "border-primary/20 hover:border-primary/40",
        boostGlow
      )}
      onClick={() => onCardClick(listing)}
    >
      <CardContent className="p-0">
        <div className="relative">
          {primaryImage ? (
            <div className="relative w-full aspect-square">
              <Image
                src={primaryImage}
                alt={listing.title}
                fill
                className="object-cover rounded-t-lg media-scroll-fix"
                loading="lazy"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                quality={55}
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwABmQAAX/2Q=="
              />
            </div>
          ) : (
            <div className="w-full aspect-square bg-muted rounded-t-lg flex items-center justify-center">
              <span className="text-muted-foreground">No image available</span>
            </div>
          )}

          {/* Age Badge */}
          <Badge
            variant={isExpired ? "destructive" : "secondary"}
            className="absolute top-2 left-2"
          >
            <Clock className="w-3 h-3 mr-1" />
            {ageInWeeks} weeks old
          </Badge>

          {/* Showcase Badge */}
          <Badge
            variant="outline"
            className="absolute top-2 right-2 bg-white/90 text-primary border-primary"
          >
            Showcase
          </Badge>

          {/* Wishlist Button */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "absolute bottom-2 right-2 p-2 rounded-full transition-colors",
              "bg-white/80 hover:bg-white shadow-sm",
              isWishlisted ? "text-red-500 hover:text-red-600" : "text-gray-400 hover:text-red-500"
            )}
            onClick={(e) => toggleWishlist(listing.id, e)}
          >
            <Heart className={cn("h-4 w-4", isWishlisted && "fill-current")} />
          </Button>

          {isExpired && (
            <div className="absolute inset-0 bg-black/20 rounded-t-lg flex items-center justify-center">
              <Badge variant="destructive" className="text-sm px-3 py-1">
                EXPIRED - Convert to Sale
              </Badge>
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {listing.title}
          </h3>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>Breed:</strong> {listing.breed}
            </p>

            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">{listing.location}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

ShowcaseCard.displayName = 'ShowcaseCard';

const ShowcaseSection = () => {
  const [showcaseListings, setShowcaseListings] = useState<ShowcaseListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showcaseEmailModalOpen, setShowcaseEmailModalOpen] = useState(false);
  const [selectedShowcaseId, setSelectedShowcaseId] = useState<string>("");
  const [selectedShowcaseTitle, setSelectedShowcaseTitle] = useState<string>("");
  const router = useRouter();
  const { user } = useAuth();
  const { isInWishlist, toggleWishlist } = useWishlist();

  useEffect(() => {
    fetchShowcaseListings();
  }, []);

  const fetchShowcaseListings = async () => {
    try {
      const { data, error } = await supabase
        .from('showcase_listings')
        .select('*')
        .eq('is_published', true)
        .eq('admin_approved', true)
        .order('created_at', { ascending: false })
        .limit(8);  // Reduced from 12 to 8 for better performance

      if (error) throw error;

      const inWindow = (data || []).filter((item) => !isShowcaseListingExpired(item));

      const normalized = inWindow.map(item => ({
        ...item,
        is_expired: item.is_expired ?? false,
        converted_to_sale_id: item.converted_to_sale_id ?? null,
      }));
      setShowcaseListings(normalized);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load showcase listings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWishlist = async (id: string, e: React.MouseEvent) => {
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
    await toggleWishlist(id, 'showcase', e);
  };

  const handleCardClick = (listing: ShowcaseListing) => {
    router.push(`/showcase/${listing.id}`);
  };

  if (loading) {
    return (
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-berkshire text-center mb-8 text-primary">
            Puppy Showcase - Coming Soon!
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted h-48 rounded-t-lg"></div>
                <div className="p-4 space-y-2">
                  <div className="bg-muted h-4 rounded"></div>
                  <div className="bg-muted h-3 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (showcaseListings.length === 0) {
    return (
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-berkshire mb-4 text-primary">
            Puppy Showcase - Coming Soon!
          </h2>
          <p className="text-muted-foreground mb-6">
            Get early previews of adorable puppies between 4-6 weeks old, before they're available for sale.
          </p>
          <Button onClick={() => router.push('/showcase')}>
            View All Showcases
          </Button>
        </div>
      </section>
    );
  }

  return (
    <>
      <ShowcaseEmailModal
        open={showcaseEmailModalOpen}
        onOpenChange={setShowcaseEmailModalOpen}
        showcaseId={selectedShowcaseId}
        showcaseTitle={selectedShowcaseTitle}
      />
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-berkshire mb-4 text-primary">
              Puppy Showcase
            </h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Get early previews of adorable puppies between 4-6 weeks old. Add them to your wishlist
              and we'll notify you when they become available for sale!
            </p>
          </div>

          <Carousel className="w-full">
            <CarouselContent className="-ml-2 md:-ml-4">
              {showcaseListings.map((listing) => (
                <CarouselItem key={listing.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                  <ShowcaseCard
                    listing={listing}
                    isWishlisted={isInWishlist(listing.id)}
                    toggleWishlist={handleToggleWishlist}
                    onCardClick={handleCardClick}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>

          <div className="text-center mt-8">
            <Button variant="outline" onClick={() => router.push('/showcase')}>
              View All Showcases
            </Button>
          </div>
        </div>
      </section>

    </>
  );
};

export default ShowcaseSection;
