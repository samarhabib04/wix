'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Crown, Shield, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface VetPartner {
  id: string; // user_profiles.id (owner profile id)
  business_id?: string; // Optional, not used for display
  name: string;
  type: string;
  address: string;
  county: string;
  phone: string;
  description: string;
  rating: number;
  reviews: number;
  tier: 'free' | 'paid';
  logo_image?: string;
  slug?: string;
}

interface VetPartnerCarouselProps {
  title: string;
  maxItems?: number;
  showSeeAll?: boolean;
  paidFirst?: boolean;
}

export default function VetPartnerCarousel({
  title,
  maxItems = 10,
  showSeeAll = true,
  paidFirst = true,
}: VetPartnerCarouselProps) {
  const router = useRouter();

  const { data: vetPartners = [], isLoading, error } = useQuery({
    queryKey: ['vet-partners-carousel', paidFirst],
    queryFn: async (): Promise<VetPartner[]> => {
      // Step 1: Get user_ids from DogQuest partner businesses only
      const { data: businessRows, error: businessError } = await supabase
        .from('business_listings')
        .select('user_id')
        .eq('partner', true) // Only DogQuest partners
        .eq('admin_approved', true)
        .eq('status', 'approved')
        .not('user_id', 'is', null);

      if (businessError) {
        console.error('VetPartnerCarousel: Error fetching partner user ids', businessError);
        throw businessError;
      }

      // Extract all user_ids (may have duplicates if user has multiple businesses)
      const allUserIds = (businessRows || []).map((r: { user_id: string }) => r.user_id).filter(Boolean);
      
      // Deduplicate: ensure each user appears only once
      const userIds = [...new Set(allUserIds)];

      if (userIds.length === 0) return [];

      // Step 2: Match business_listings.user_id to user_profiles.id and fetch basic profile fields
      // Only fetch profiles where profile_complete = TRUE
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, county, business_name, avatar_url')
        .in('id', userIds)
        .eq('profile_complete', true);

      if (profileError) {
        console.error('VetPartnerCarousel: Error fetching user_profiles', profileError);
        throw profileError;
      }

      if (!profiles || profiles.length === 0) return [];

      // Step 3: Get subscription tiers for paid partners
      const { data: subscriptions } = await supabase
        .from('business_subscriptions' as any)
        .select('user_id, subscription_tier, status')
        .in('user_id', profiles.map((p: any) => p.id))
        .eq('status', 'active');

      const tierByUser = new Map<string, 'free' | 'paid'>();
      (subscriptions || []).forEach((sub: any) => {
        if (tierByUser.has(sub.user_id)) return;
        if (sub.subscription_tier === 'premium' || sub.subscription_tier === 'elite_marketplace') {
          tierByUser.set(sub.user_id, 'paid');
        }
      });

      // Step 4: Map owner profiles to VetPartner format
      // Additional deduplication by id (just in case)
      const seenIds = new Set<string>();
      let partners: VetPartner[] = profiles
        .filter((p: any) => {
          if (seenIds.has(p.id)) {
            return false;
          }
          seenIds.add(p.id);
          return true;
        })
        .map((p: any) => {
          const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
          const name = p.business_name?.trim() || fullName || 'Vet Partner';
          const tier = tierByUser.get(p.id) || 'free';
          
          return {
            id: p.id, // Owner profile id (matched from business_listings.user_id)
            name,
            type: 'Vet Partner',
            address: p.county || '',
            county: p.county || '',
            phone: '', // Not fetched
            description: '',
            rating: 0,
            reviews: 0,
            tier,
            logo_image: p.avatar_url || null,
          };
        });

      // Filter by paidFirst if needed
      if (paidFirst) {
        // Sort: paid first, then by rating/reviews
        partners.sort((a, b) => {
          if (a.tier === 'paid' && b.tier !== 'paid') return -1;
          if (a.tier !== 'paid' && b.tier === 'paid') return 1;
          if (b.rating !== a.rating) return b.rating - a.rating;
          return b.reviews - a.reviews;
        });
        // Show paid partners first, but if no paid partners exist, show free partners
        const paidPartners = partners.filter(p => p.tier === 'paid');
        if (paidPartners.length > 0) {
          partners = paidPartners;
        } else {
          // If no paid partners, keep all partners (they're already sorted)
          // This ensures we show free partners if no paid exist
        }
      } else {
        // Sort by rating/reviews
        partners.sort((a, b) => {
          if (b.rating !== a.rating) return b.rating - a.rating;
          return b.reviews - a.reviews;
        });
      }

      const result = partners.slice(0, maxItems);
      return result;
    },
  });

  if (isLoading) {
    return (
      <div className="py-8">
        {title && <h2 className="text-3xl md:text-4xl font-berkshire text-brand-dark-green mb-6">{title}</h2>}
        <div className="text-center py-8 text-muted-foreground">Loading vet partners...</div>
      </div>
    );
  }

  if (error) {
    console.error('Error loading vet partners:', error);
    return null;
  }

  if (vetPartners.length === 0) {
    // Don't show carousel if there are no partners at all
    return null;
  }

  const displayedPartners = vetPartners.slice(0, maxItems);

  return (
    <div className="py-8">
      {title && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl md:text-4xl font-berkshire text-brand-dark-green">{title}</h2>
          {showSeeAll && (
            <Button
              variant="outline"
              onClick={() => router.push('/vet-partners')}
            >
              See All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      {!title && showSeeAll && (
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            onClick={() => router.push('/vet-partners')}
          >
            See All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedPartners.map((vp) => (
          <Card key={vp.id} className="hover:shadow-lg transition-shadow bg-brand-dark-green border-brand-dark-green flex flex-col h-full">
            <CardContent className="p-6 flex flex-col flex-1">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {vp.logo_image && (
                    <img
                      src={vp.logo_image}
                      alt={vp.name}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-lg text-white truncate">{vp.name}</h3>
                    <p className="text-sm text-white/80">{vp.type}</p>
                  </div>
                </div>
                <Badge variant={vp.tier === 'paid' ? 'default' : 'secondary'} className="bg-white text-brand-dark-green flex-shrink-0 ml-2">
                  {vp.tier === 'paid' ? (
                    <>
                      <Crown className="mr-1 h-3 w-3" />
                      Paid Partner
                    </>
                  ) : (
                    <>
                      <Shield className="mr-1 h-3 w-3" />
                      Vet Partner
                    </>
                  )}
                </Badge>
              </div>
              {vp.county && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <MapPin className="h-4 w-4 text-white flex-shrink-0" />
                    <span className="truncate">{vp.county}</span>
                  </div>
                </div>
              )}
              <div className="mt-auto pt-2">
                <Link href={`/users/${vp.id}`}>
                  <Button variant="outline" className="w-full bg-white text-brand-dark-green hover:bg-white/90 border-white">
                    View Profile
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {showSeeAll && displayedPartners.length >= maxItems && (
        <div className="mt-6 text-center">
          <Button
            variant="outline"
            onClick={() => router.push('/vet-partners')}
            className="w-full md:w-auto"
          >
            See All Vet Partners
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
