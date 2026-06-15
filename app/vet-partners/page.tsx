'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Phone, Mail, Globe, Shield, Crown, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase/client";
import { irishCounties } from "@/lib/utils/irish-data";
import Link from "next/link";

interface VetPartner {
  id: string; // user_profiles.id (owner profile id)
  business_id?: string; // Optional, not used for display
  name: string;
  type: string;
  address: string;
  county: string;
  phone: string;
  email?: string;
  website?: string;
  description: string;
  rating: number;
  reviews: number;
  tier: 'free' | 'paid';
  coordinates?: { lat: number; lng: number };
  logo_image?: string;
  slug?: string;
}

export default function VetPartnersPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [countyFilter, setCountyFilter] = useState<string>("all");
  const [vetPartners, setVetPartners] = useState<VetPartner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchVetPartners();
  }, []);

  const fetchVetPartners = async () => {
    try {
      setIsLoading(true);

      // Step 1: Get user_ids from DogQuest partner businesses only
      const { data: businessRows, error: businessError } = await supabase
        .from('business_listings')
        .select('user_id')
        .eq('partner', true) // Only DogQuest partners
        .eq('admin_approved', true)
        .eq('status', 'approved')
        .not('user_id', 'is', null);

      if (businessError) throw businessError;

      // Extract all user_ids (may have duplicates if user has multiple businesses)
      const allUserIds = (businessRows || []).map((r: { user_id: string }) => r.user_id).filter(Boolean);
      // Deduplicate: ensure each user appears only once
      const userIds = [...new Set(allUserIds)];

      if (userIds.length === 0) {

        setVetPartners([]);
        return;
      }

      // Step 2: Match business_listings.user_id to user_profiles.id and fetch basic profile fields
      // Only fetch profiles where profile_complete = TRUE

      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, county, business_name, avatar_url, profile_complete')
        .in('id', userIds)
        .eq('profile_complete', true);
      
      if (profileError) {
        console.error('❌ [Vet Partners Page] Error fetching user_profiles:', {
          error: profileError,
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          userIds: userIds
        });
        throw profileError;
      }
      if (!profiles || profiles.length === 0) {

        setVetPartners([]);
        return;
      }

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
      const partners: VetPartner[] = profiles
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
            email: undefined,
            website: undefined,
            description: '',
            rating: 0,
            reviews: 0,
            tier,
            coordinates: undefined,
            logo_image: p.avatar_url || null,
          };
        });

      // Sort: paid first, then by rating/reviews
      partners.sort((a, b) => {
        // First sort by tier (paid first)
        if (a.tier === 'paid' && b.tier !== 'paid') return -1;
        if (a.tier !== 'paid' && b.tier === 'paid') return 1;
        
        // Then sort by rating
        if (b.rating !== a.rating) return b.rating - a.rating;
        
        // Then sort by reviews
        return b.reviews - a.reviews;
      });
      setVetPartners(partners);
    } catch (error: any) {
      console.error('Error fetching vet partners:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPartners = vetPartners.filter(vp => {
    const matchesSearch =
      vp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vp.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vp.county.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCounty = countyFilter === 'all' || vp.county === countyFilter;

    return matchesSearch && matchesCounty;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-berkshire text-brand-dark-green mb-4">
          DogQuest Vet Partners
        </h1>
        <p className="text-lg text-muted-foreground">
          Trusted veterinary professionals across Ireland
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vet partners..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={countyFilter} onValueChange={setCountyFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by county" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Counties</SelectItem>
            {irishCounties.filter(c => c !== 'All Counties').map((county) => (
              <SelectItem key={county} value={county}>
                {county}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Vet Partners Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading vet partners...</p>
        </div>
      ) : filteredPartners.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No vet partners found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPartners.map((vp) => (
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
                  <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                    <Badge variant={vp.tier === 'paid' ? 'default' : 'secondary'} className="bg-white text-brand-dark-green">
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
                </div>

                {vp.description && (
                  <p className="text-sm text-white/90 mb-3 line-clamp-2">
                    {vp.description}
                  </p>
                )}

                <div className="space-y-2 mb-4">
                  {vp.county && (
                    <div className="flex items-center gap-2 text-sm text-white/80">
                      <MapPin className="h-4 w-4 text-white flex-shrink-0" />
                      <span className="truncate">{vp.county}</span>
                    </div>
                  )}
                  {vp.phone && (
                    <div className="flex items-center gap-2 text-sm text-white/80">
                      <Phone className="h-4 w-4 text-white flex-shrink-0" />
                      <span className="truncate">{vp.phone}</span>
                    </div>
                  )}
                  {vp.email && (
                    <div className="flex items-center gap-2 text-sm text-white/80">
                      <Mail className="h-4 w-4 text-white flex-shrink-0" />
                      <span className="truncate">{vp.email}</span>
                    </div>
                  )}
                  {vp.website && (
                    <div className="flex items-center gap-2 text-sm text-white/80">
                      <Globe className="h-4 w-4 text-white flex-shrink-0" />
                      <a
                        href={vp.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:underline truncate"
                      >
                        Visit Website
                      </a>
                    </div>
                  )}
                </div>

                {vp.rating > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                    <span className="font-medium text-white">{vp.rating.toFixed(1)}</span>
                    <span className="text-sm text-white/80">
                      ({vp.reviews} {vp.reviews === 1 ? 'review' : 'reviews'})
                    </span>
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
      )}
    </div>
  );
}
