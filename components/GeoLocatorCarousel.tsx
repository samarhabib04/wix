'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Crown, Shield, ArrowRight, Navigation } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { calculateDistance } from '@/lib/utils/geo-location';

interface BusinessItem {
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
  slug: string;
  subscription_tier?: 'standard' | 'premium' | 'elite_marketplace' | null;
  is_vet_partner?: boolean;
  vet_partner_tier?: 'free' | 'paid' | null;
  distance?: number | null;
  coordinates?: { lat: number; lng: number } | null;
}

interface GeoLocatorCarouselProps {
  title?: string;
  maxItems?: number;
  maxDistanceKm?: number; // Maximum distance in kilometers
  showSeeAll?: boolean;
}

export default function GeoLocatorCarousel({
  title = 'Businesses & Vet Partners Near You',
  maxItems = 10,
  maxDistanceKm = 50, // Default 50km radius
  showSeeAll = true,
}: GeoLocatorCarouselProps) {
  const router = useRouter();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationError('Unable to get your location');
          // Fallback: Use Dublin coordinates as default
          setUserLocation({ lat: 53.3498, lng: -6.2603 });
        }
      );
    } else {
      // Fallback: Use Dublin coordinates
      setUserLocation({ lat: 53.3498, lng: -6.2603 });
    }
  }, []);

  // Fetch Premium businesses and all Vet Partners
  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['geo-locator-businesses', userLocation],
    queryFn: async (): Promise<BusinessItem[]> => {
      if (!userLocation) return [];

      // Fetch Premium businesses (exclude Standard)
      const { data: premiumBusinesses, error: premiumError } = await supabase
        .from('business_listings')
        .select('*')
        .eq('admin_approved', true)
        .in('subscription_tier', ['premium', 'elite_marketplace']);

      if (premiumError) {
        console.error('Error fetching premium businesses:', premiumError);
      }

      // Fetch all Vet Partners (free and paid)
      const { data: vetPartners, error: vetError } = await supabase
        .from('vet_partners' as any)
        .select(`
          *,
          business_listings!inner (
            *
          )
        `)
        .eq('status', 'active');

      if (vetError) {
        console.error('Error fetching vet partners:', vetError);
      }

      const allItems: BusinessItem[] = [];

      // Add Premium businesses
      if (premiumBusinesses) {
        allItems.push(...premiumBusinesses.map((b: any) => ({
          id: b.id,
          name: b.name,
          type: b.type,
          address: b.address,
          county: b.county,
          phone: b.phone,
          description: b.description,
          rating: parseFloat(b.rating?.toString() || '0'),
          reviews: b.reviews || 0,
          logo_image: b.logo_image,
          slug: b.slug,
          subscription_tier: b.subscription_tier,
          is_vet_partner: b.is_vet_partner || false,
          vet_partner_tier: b.vet_partner_tier || null,
          coordinates: b.coordinates || null,
          distance: null,
        })));
      }

      // Add Vet Partners (all - free and paid)
      if (vetPartners) {
        allItems.push(...vetPartners.map((vp: any) => ({
          id: vp.business_listings.id,
          name: vp.business_listings.name,
          type: vp.business_listings.type,
          address: vp.business_listings.address,
          county: vp.business_listings.county,
          phone: vp.business_listings.phone,
          description: vp.business_listings.description,
          rating: parseFloat(vp.business_listings.rating?.toString() || '0'),
          reviews: vp.business_listings.reviews || 0,
          logo_image: vp.business_listings.logo_image,
          slug: vp.business_listings.slug,
          subscription_tier: vp.business_listings.subscription_tier,
          is_vet_partner: true,
          vet_partner_tier: vp.tier,
          coordinates: vp.business_listings.coordinates || null,
          distance: null,
        })));
      }

      // Calculate distances
      const itemsWithDistance = allItems.map((item) => {
        const coords = item.coordinates || { lat: 53.3498, lng: -6.2603 };
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          coords.lat,
          coords.lng
        );
        return { ...item, distance };
      });

      // Filter by distance
      const filtered = itemsWithDistance.filter(
        (item) => item.distance !== null && item.distance <= maxDistanceKm
      );

      // Sort by distance (closest first)
      filtered.sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });

      // Remove duplicates (if business is both Premium and Vet Partner, keep one)
      const uniqueItems = filtered.filter(
        (item, index, self) => index === self.findIndex((t) => t.id === item.id)
      );

      return uniqueItems.slice(0, maxItems);
    },
    enabled: !!userLocation,
  });

  if (isLoading) {
    return (
      <div className="py-8">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <div className="text-center py-8 text-muted-foreground">Loading businesses near you...</div>
      </div>
    );
  }

  if (businesses.length === 0) {
    return null;
  }

  return (
    <div className="py-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          {locationError && (
            <p className="text-sm text-muted-foreground mt-1">
              Showing results near Dublin (location access denied)
            </p>
          )}
        </div>
        {showSeeAll && (
          <Button
            variant="outline"
            onClick={() => router.push('/services')}
          >
            See All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <Carousel className="w-full">
        <CarouselContent>
          {businesses.map((business) => (
            <CarouselItem key={business.id} className="md:basis-1/2 lg:basis-1/3">
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      {business.logo_image && (
                        <img
                          src={business.logo_image}
                          alt={business.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{business.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">{business.type}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 ml-2">
                      {business.subscription_tier === 'premium' || business.subscription_tier === 'elite_marketplace' ? (
                        <Badge variant="default" className="bg-purple-600 text-xs">
                          Featured
                        </Badge>
                      ) : null}
                      {business.is_vet_partner && (
                        <Badge variant={business.vet_partner_tier === 'paid' ? 'default' : 'secondary'} className="text-xs">
                          {business.vet_partner_tier === 'paid' ? (
                            <>
                              <Crown className="h-3 w-3 mr-1" />
                              Vet Partner
                            </>
                          ) : (
                            <>
                              <Shield className="h-3 w-3 mr-1" />
                              Vet Partner
                            </>
                          )}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {business.description}
                  </p>
                  <div className="space-y-1 mb-3">
                    {business.distance !== null && business.distance !== undefined && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Navigation className="h-3 w-3" />
                        <span>{business.distance.toFixed(1)} km away</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{business.county}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{business.phone}</span>
                    </div>
                  </div>
                  <Link href={`/services/${business.slug}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      View Profile
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
          {showSeeAll && businesses.length >= maxItems && (
            <CarouselItem className="md:basis-1/2 lg:basis-1/3">
              <Card className="h-full border-dashed">
                <CardContent className="p-4 flex flex-col items-center justify-center h-full min-h-[200px]">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/services')}
                    className="w-full"
                  >
                    See All Businesses
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </CarouselItem>
          )}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}
