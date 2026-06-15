'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Dog, Building2, ShoppingBag, Loader2, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { sanitizeSearchTermForIlike } from '@/lib/search/sanitizeSearchTerm';
import { isShowcasePuppyAgeExpired } from '@/lib/utils/showcase-age';
import { PUBLIC_MARKETPLACE_SALE_STATUSES, saleListingNotExpiredOrFilter } from '@/lib/listings/public-marketplace-sale-status';

interface SearchResult {
  id: string;
  type: 'listing' | 'business' | 'product' | 'breed' | 'blog';
  title: string;
  subtitle?: string;
  route: string;
  icon: React.ReactNode;
}

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isMobile = useIsMobile();
  const query = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(query);

  useEffect(() => {
    setSearchQuery(query);
  }, [query]);

  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ['search-results', query],
    queryFn: async (): Promise<SearchResult[]> => {
      const q = sanitizeSearchTermForIlike(query);
      if (!q || q.length < 2) return [];

      const like = `%${q}%`;
      const results: SearchResult[] = [];

      try {
        const [saleListings, studListings, showcaseListings] = await Promise.all([
          supabase
            .from('sale_listings')
            .select('id, title, breed, location')
            .or(
              `title.ilike.${like},breed.ilike.${like},breed_1.ilike.${like},breed_2.ilike.${like},location.ilike.${like},description.ilike.${like}`
            )
            .eq('admin_approved', true)
            .eq('is_published', true)
            .eq('is_deleted', false)
            .eq('is_paused', false)
            .in('status', [...PUBLIC_MARKETPLACE_SALE_STATUSES])
            .or(saleListingNotExpiredOrFilter())
            .limit(10),
          supabase
            .from('stud_listings')
            .select('id, title, breed1, breed2, crossbreed_breeds, location')
            .or(
              `title.ilike.${like},breed1.ilike.${like},breed2.ilike.${like},location.ilike.${like},description.ilike.${like}`
            )
            .eq('admin_approved', true)
            .eq('is_published', true)
            .eq('is_deleted', false)
            .eq('is_paused', false)
            .limit(10),
          supabase
            .from('showcase_listings')
            .select('id, title, breed, location, date_of_birth, created_at')
            .or(`title.ilike.${like},breed.ilike.${like},location.ilike.${like},description.ilike.${like}`)
            .eq('admin_approved', true)
            .eq('is_published', true)
            .eq('is_deleted', false)
            .eq('is_paused', false)
            .limit(10),
        ]);

        // Add sale listings
        if (saleListings.data) {
          saleListings.data.forEach((listing: any) => {
            results.push({
              id: listing.id,
              type: 'listing',
              title: listing.title,
              subtitle: `${listing.breed || 'Dog'} • ${listing.location || ''} • For sale`,
              route: `/listing/${listing.id}`,
              icon: <Dog className="h-4 w-4" />,
            });
          });
        }

        // Add stud listings
        if (studListings.data) {
          studListings.data.forEach((listing: any) => {
            let breedDisplay = 'Dog';
            if (listing.breed1 && listing.breed2) {
              breedDisplay = `${listing.breed1} × ${listing.breed2}`;
            } else if (listing.breed1) {
              breedDisplay = listing.breed1;
            } else if (listing.crossbreed_breeds?.length) {
              breedDisplay = listing.crossbreed_breeds.join(' × ');
            }
            results.push({
              id: listing.id,
              type: 'listing',
              title: listing.title,
              subtitle: `${breedDisplay} • ${listing.location || ''} • Stud`,
              route: `/stud/${listing.id}`,
              icon: <Dog className="h-4 w-4" />,
            });
          });
        }

        // Add showcase listings
        if (showcaseListings.data) {
          showcaseListings.data.forEach((listing: any) => {
            if (isShowcasePuppyAgeExpired(listing.date_of_birth, listing.created_at)) return;
            results.push({
              id: listing.id,
              type: 'listing',
              title: listing.title,
              subtitle: `${listing.breed || 'Dog'} • ${listing.location || ''} • Showcase`,
              route: `/showcase/${listing.id}`,
              icon: <Dog className="h-4 w-4" />,
            });
          });
        }

        const isVetQuery = /\bvet\b|veterinary|veterinarian/i.test(query);
        const businessOrConditions = [
          `name.ilike.${like}`,
          `type.ilike.${like}`,
          `description.ilike.${like}`,
          `about_us.ilike.${like}`,
        ];
        if (isVetQuery) {
          businessOrConditions.push('is_vet_partner.eq.true');
        }
        const { data: businesses } = await supabase
          .from('business_listings')
          .select('id, name, type, county, slug')
          .or(businessOrConditions.join(','))
          .eq('status', 'approved')
          .eq('admin_approved', true)
          .limit(10);

        if (businesses) {
          const seenIds = new Set<string>();
          businesses.forEach((business: any) => {
            if (seenIds.has(business.id)) return;
            seenIds.add(business.id);
            results.push({
              id: business.id,
              type: 'business',
              title: business.name,
              subtitle: `${business.type || 'Business'} • ${business.county || ''}`,
              route: business.slug ? `/services/${business.slug}` : `/services/${business.id}`,
              icon: <Building2 className="h-4 w-4" />,
            });
          });
        }

        // Search products - marketplace (status live) and admin products
        const [marketplaceProducts, adminProducts] = await Promise.all([
          supabase
            .from('marketplace_products' as any)
            .select('id, name, description')
            .or(`name.ilike.${like},description.ilike.${like},short_description.ilike.${like},full_description.ilike.${like}`)
            .eq('admin_approved', true)
            .eq('status', 'live')
            .eq('is_published', true)
            .gt('stock_quantity', 0)
            .limit(10),
          supabase
            .from('products')
            .select('id, name, description, slug')
            .or(`name.ilike.${like},description.ilike.${like}`)
            .limit(10),
        ]);

        const seenProductIds = new Set<string>();
        if (marketplaceProducts.data) {
          marketplaceProducts.data.forEach((product: any) => {
            if (seenProductIds.has(product.id)) return;
            seenProductIds.add(product.id);
            results.push({
              id: product.id,
              type: 'product',
              title: product.name,
              subtitle: product.description?.substring(0, 50) || 'Product',
              route: `/shop/marketplace-${product.id}`,
              icon: <ShoppingBag className="h-4 w-4" />,
            });
          });
        }
        if (adminProducts.data) {
          adminProducts.data.forEach((product: any) => {
            if (seenProductIds.has(product.id)) return;
            seenProductIds.add(product.id);
            results.push({
              id: product.id,
              type: 'product',
              title: product.name,
              subtitle: product.description?.substring(0, 50) || 'Product',
              route: product.slug ? `/shop/${product.slug}` : `/shop/${product.id}`,
              icon: <ShoppingBag className="h-4 w-4" />,
            });
          });
        }

        // Search breeds
        const { data: breeds } = await supabase
          .from('quiz_breeds')
          .select('breed, breed_type')
          .ilike('breed', like)
          .limit(10);

        if (breeds) {
          breeds.forEach((breed: any) => {
            const breedSlug = breed.breed.toLowerCase().replace(/\s+/g, '-');
            const isPedigree = breed.breed_type?.includes('Pedigree') || !breed.breed_type?.includes('Mixed');
            const route = isPedigree ? `/breeds/${breedSlug}` : `/mixed-breeds/${breedSlug}`;
            results.push({
              id: breed.breed,
              type: 'breed',
              title: breed.breed,
              subtitle: isPedigree ? 'Pedigree Breed' : 'Mixed Breed',
              route,
              icon: <Dog className="h-4 w-4" />,
            });
          });
        }

        const { data: blogPosts } = await supabase
          .from('blog_posts')
          .select('id, title, description, slug')
          .or(`title.ilike.${like},description.ilike.${like}`)
          .eq('status', 'published')
          .limit(10);

        if (blogPosts) {
          blogPosts.forEach((post: any) => {
            results.push({
              id: post.id,
              type: 'blog',
              title: post.title,
              subtitle: post.description?.substring(0, 100) || 'Blog post',
              route: `/blog/${post.slug}`,
              icon: <BookOpen className="h-4 w-4" />,
            });
          });
        }

      } catch (error) {
        console.error('Error searching:', error);
      }

      return results;
    },
    enabled: query.trim().length >= 2,
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Group results by type
  const groupedResults = searchResults.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const typeLabels: Record<string, string> = {
    listing: 'Listings',
    business: 'Services',
    product: 'Shop',
    breed: 'Breeds',
    blog: 'Blog',
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Search Results</h1>
        
        {/* Search Bar */}
        <div className="mb-8">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Try a breed, county, listing title, service, shop product, or blog topic…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch}>Search</Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
          Searches <strong>for-sale litters</strong>, <strong>studs</strong>, <strong>showcase</strong> (title, breed, location, description),{' '}
          <strong>dog services / vets</strong> (name, type, description; typing “vet” also surfaces vet partners),{' '}
          <strong>shop</strong> (Dog Quest products and live marketplace items), <strong>breed guides</strong>, and <strong>published blog</strong> posts.
        </p>

        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Searching...</p>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-2">No results found</p>
            <p className="text-gray-400 text-sm">Try a different search term</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedResults).map(([type, results]) => (
              <div key={type}>
                <h2 className="text-xl font-semibold mb-4">{typeLabels[type] || type}</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {results.map((result) => (
                    <Link key={`${result.type}-${result.id}`} href={result.route}>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 text-brand-dark-green">
                              {result.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 mb-1">
                                {result.title}
                              </h3>
                              {result.subtitle && (
                                <p className="text-sm text-gray-500">
                                  {result.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchResultsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Search Results</h1>
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <SearchResultsContent />
    </Suspense>
  );
}
