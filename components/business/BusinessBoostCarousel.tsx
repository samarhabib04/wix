'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, Zap, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface BoostedBusiness {
  id: string;
  business_id: string;
  boost_start_time: string;
  business_listings: {
    id: string;
    name: string;
    type: string;
    address: string;
    county: string;
    phone: string;
    description: string;
    rating: number;
    reviews: number;
    logo_image?: string;
    slug?: string;
    subscription_tier?: string;
    is_vet_partner?: boolean;
  };
}

interface BusinessBoostCarouselProps {
  maxItems?: number;
  title?: string;
}

export default function BusinessBoostCarousel({
  maxItems = 40,
  title = 'Featured Businesses',
}: BusinessBoostCarouselProps) {
  const router = useRouter();

  const { data: boostedBusinesses = [], isLoading, error: queryError } = useQuery({
    queryKey: ['business-boosts-carousel'],
    queryFn: async (): Promise<BoostedBusiness[]> => {
      try {
      const { data, error } = await supabase
        .from('business_boosts' as any)
        .select(`
          id,
          business_id,
          boost_start_time,
            business_listings!business_boosts_business_id_fkey (
            id,
            name,
            type,
            address,
            county,
            phone,
            description,
            rating,
            reviews,
            logo_image,
            slug,
            subscription_tier,
              is_vet_partner,
              admin_approved,
              status
          )
        `)
        .eq('is_active', true)
          .eq('payment_status', 'paid')
        .order('boost_start_time', { ascending: false })
        .limit(maxItems);

      if (error) {
        console.error('Error fetching boosted businesses:', error);
          console.error('Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
        throw error;
      }

        // Filter out businesses that aren't approved or don't have business_listings data
        const filtered = ((data as any) || [])
          .filter((bb: any) => {
            const business = bb.business_listings;
            const isValid = business && 
                           business.admin_approved === true && 
                           business.status === 'approved';
            if (!isValid && business) {

            }
            return isValid;
          })
          .map((bb: any) => ({
        id: bb.id,
        business_id: bb.business_id,
        boost_start_time: bb.boost_start_time,
        business_listings: bb.business_listings,
      }));

        return filtered;
      } catch (err) {
        console.error('Exception in queryFn:', err);
        throw err;
      }
    },
    retry: 2,
    staleTime: 60000, // Cache for 1 minute
  });

  if (isLoading) {
    return (
      <div className="py-8">
        <h2 className="text-3xl md:text-4xl font-berkshire text-brand-dark-green mb-4 text-center">{title}</h2>
        <div className="text-center py-8 text-muted-foreground">Loading featured businesses...</div>
      </div>
    );
  }

  if (queryError) {
    console.error('Query error in BusinessBoostCarousel:', queryError);
    // Don't show error to users, just don't render the carousel
    return null;
  }

  if (boostedBusinesses.length === 0) {
    // Don't render if no boosted businesses
    return null;
  }

  return (
    <section className="w-full py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-500" />
            <h2 className="text-3xl md:text-4xl font-berkshire text-brand-dark-green">{title}</h2>
          </div>
        </div>
        
        <Carousel 
          className="w-full"
          opts={{
            align: "start",
            loop: true,
          }}
        >
         <CarouselContent>
            {boostedBusinesses.map((bb) => {
              const business = bb.business_listings;
              const businessSlug = business.slug || business.id;
              
              return (
                <CarouselItem key={bb.id} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                  <Link href={`/services/${businessSlug}`} className="block h-full">
                    <Card className="h-full hover:shadow-lg transition-shadow border-brand-soft-green/20 cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {business.logo_image && (
                              <img
                                src={business.logo_image}
                                alt={business.name}
                                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold truncate text-sm">{business.name}</h3>
                              <p className="text-xs text-muted-foreground truncate">{business.type}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Featured Badge */}
                        <div className="mb-3">
                          <Badge className="bg-yellow-500 text-white text-xs px-2 py-1">
                            <Zap className="h-3 w-3 mr-1" />
                            Featured
                          </Badge>
                        </div>
                        
                        {business.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {business.description}
                          </p>
                        )}
                        
                        <div className="space-y-1 mb-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{business.county}</span>
                          </div>
                          {business.phone && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3 flex-shrink-0" />
                              <span>{business.phone}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="w-full">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                          >
                            View Profile
                            <ArrowRight className="ml-2 h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </section>
  ); 
}
