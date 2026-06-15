'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Dog, Building2, ShoppingBag, BookOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { sanitizeSearchTermForIlike } from '@/lib/search/sanitizeSearchTerm';
import { PUBLIC_MARKETPLACE_SALE_STATUSES, saleListingNotExpiredOrFilter } from '@/lib/listings/public-marketplace-sale-status';
import { isShowcasePuppyAgeExpired } from '@/lib/utils/showcase-age';

interface SearchResult {
  id: string;
  type: 'listing' | 'business' | 'product' | 'breed' | 'blog';
  title: string;
  subtitle?: string;
  route: string;
  icon: React.ReactNode;
}

interface GlobalSearchBarProps {
  onExpandChange?: (expanded: boolean) => void;
}

export default function GlobalSearchBar({ onExpandChange }: GlobalSearchBarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
        setIsExpanded(false);
        onExpandChange?.(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onExpandChange]);

  // Search across all content types
  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ['global-search', searchQuery],
    queryFn: async (): Promise<SearchResult[]> => {
      const q = sanitizeSearchTermForIlike(searchQuery);
      if (!q || q.length < 2) return [];

      const results: SearchResult[] = [];

      try {
        const like = `%${q}%`;
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
            .limit(8),
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
            .limit(8),
          supabase
            .from('showcase_listings')
            .select('id, title, breed, location, date_of_birth, created_at')
            .or(`title.ilike.${like},breed.ilike.${like},location.ilike.${like},description.ilike.${like}`)
            .eq('admin_approved', true)
            .eq('is_published', true)
            .eq('is_deleted', false)
            .eq('is_paused', false)
            .limit(8),
        ]);

        // Add sale listings
        if (saleListings.error) {
          console.error('Error fetching sale listings:', saleListings.error);
        }
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
        if (studListings.error) {
          console.error('Error fetching stud listings:', studListings.error);
        }
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

        if (studListings.data) {
          studListings.data.forEach((listing: any) => {
            // Format breed display for stud listings (breed1, breed2, or crossbreed_breeds)
            let breedDisplay = 'Dog';
            if (listing.breed1 && listing.breed2) {
              breedDisplay = `${listing.breed1} × ${listing.breed2}`;
            } else if (listing.breed1) {
              breedDisplay = listing.breed1;
            } else if (listing.crossbreed_breeds && Array.isArray(listing.crossbreed_breeds) && listing.crossbreed_breeds.length > 0) {
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

        // Search businesses - name, type, description, about_us
        // When query contains "vet", also include vet partners (is_vet_partner = true)
        const isVetQuery = /\bvet\b|veterinary|veterinarian/i.test(searchQuery);
        const businessOrConditions = [
          `name.ilike.${like}`,
          `type.ilike.${like}`,
          `description.ilike.${like}`,
          `about_us.ilike.${like}`,
        ];
        if (isVetQuery) {
          businessOrConditions.push('is_vet_partner.eq.true');
        }

        const { data: businesses, error: businessesError } = await supabase
          .from('business_listings')
          .select('id, name, type, county, slug')
          .or(businessOrConditions.join(','))
          .eq('status', 'approved')
          .eq('admin_approved', true)
          .limit(isVetQuery ? 10 : 5);

        if (businessesError) {
          console.error('Error fetching businesses:', businessesError);
        }
        const seenBusinessIds = new Set<string>();
        if (businesses) {
          businesses.forEach((business: any) => {
            if (seenBusinessIds.has(business.id)) return;
            seenBusinessIds.add(business.id);
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

        // Search marketplace products (shop) - search in name and description
        // Match exact filters used on /shop page (including stock_quantity > 0, elite_marketplace subscription, and suspended business filtering)
        const { data: marketplaceProducts, error: marketplaceError } = await supabase
          .from('marketplace_products' as any)
          .select(`
            id,
            name,
            description,
            short_description,
            full_description,
            user_id,
            business_id,
            business_listings!business_id (
              id,
              name,
              slug,
              subscription_tier,
              user_id,
              user_profiles!user_id (
                is_suspended,
                status
              )
            )
          `)
          .or(`name.ilike.${like},description.ilike.${like},short_description.ilike.${like},full_description.ilike.${like}`)
          .eq('admin_approved', true)
          .eq('status', 'live')
          .eq('is_published', true)
          .gt('stock_quantity', 0);

        if (marketplaceError) {
          console.error('Error fetching marketplace products:', marketplaceError);
        }

        if (marketplaceProducts && marketplaceProducts.length > 0) {
          // Filter out products from suspended businesses
          const filteredMarketplaceProducts = marketplaceProducts.filter((item: any) => {
            const businessListing = item.business_listings;
            if (!businessListing) {

              return false; // If no business listing, exclude
            }
            
            const userProfile = businessListing.user_profiles;
            if (!userProfile) {

              return true; // If no profile, allow through
            }
            
            // Filter out if business owner is suspended
            const isSuspended = userProfile.is_suspended === true || userProfile.status === 'suspended';
            if (isSuspended) {

            }
            return !isSuspended;
          });

          // Get unique user_ids from filtered marketplace products
          const userIds = [...new Set(filteredMarketplaceProducts.map((item: any) => {
            // Use user_id from marketplace_products if available, otherwise from business_listings
            return item.user_id || item.business_listings?.user_id;
          }).filter(Boolean))];

          // Query business_subscriptions to find users with elite_marketplace subscription
          let eliteUserIds = new Set<string>();
          if (userIds.length > 0) {
            const { data: eliteSubscriptions, error: subError } = await supabase
              .from('business_subscriptions' as any)
              .select('user_id, subscription_tier, status')
              .in('user_id', userIds)
              .eq('subscription_tier', 'elite_marketplace')
              .eq('status', 'active');

            if (subError) {
              console.error('Error fetching elite subscriptions:', subError);
            } else if (eliteSubscriptions) {

              eliteSubscriptions.forEach((sub: any) => {
                eliteUserIds.add(sub.user_id);
              });
            }
          }

          // Filter marketplace products to only include those from users with elite subscriptions
          const eliteMarketplaceProducts = filteredMarketplaceProducts.filter((item: any) => {
            const business = item.business_listings;
            if (!business) {

              return false;
            }

            // Get user_id from product or business listing
            const userId = item.user_id || business.user_id;
            if (!userId) {

              return false;
            }

            // Check subscription_tier from business_listings first (fallback)
            if (business.subscription_tier === 'elite_marketplace') {

              return true;
            }

            // Check if user_id is in elite subscriptions
            const hasEliteSubscription = eliteUserIds.has(userId);
            if (!hasEliteSubscription) {

            }
            return hasEliteSubscription;
          });

          eliteMarketplaceProducts.slice(0, 8).forEach((product: any) => {
            const description = product.short_description || product.full_description || product.description || '';

            // Marketplace products use marketplace-{id} as slug format
            results.push({
              id: product.id,
              type: 'product',
              title: product.name,
              subtitle: description.substring(0, 50) || 'Product',
              route: `/shop/marketplace-${product.id}`,
              icon: <ShoppingBag className="h-4 w-4" />,
            });
          });
        } else {

        }

        // Search admin products (shop) - search in name and description
        const { data: adminProducts, error: adminProductsError } = await supabase
          .from('products')
          .select('id, name, description, slug')
          .or(`name.ilike.${like},description.ilike.${like}`)
          .limit(8);

        if (adminProductsError) {
          console.error('Error fetching admin products:', adminProductsError);
        }
        if (adminProducts) {

          adminProducts.forEach((product: any) => {

            results.push({
              id: product.id,
              type: 'product',
              title: product.name,
              subtitle: product.description?.substring(0, 50) || 'Product',
              route: product.slug ? `/shop/${product.slug}` : `/shop/${product.id}`,
              icon: <ShoppingBag className="h-4 w-4" />,
            });
          });
        } else {

        }

        // Search breeds from quiz_breeds table
        const { data: breeds, error: breedsError } = await supabase
          .from('quiz_breeds')
          .select('breed, breed_type')
          .ilike('breed', like)
          .limit(8);

        if (breedsError) {
          console.error('Error fetching breeds:', breedsError);
        }
        if (breeds) {
          breeds.forEach((breed: any) => {
            const breedSlug = breed.breed.toLowerCase().replace(/\s+/g, '-');
            const isPedigree = breed.breed_type?.includes('Pedigree') || (!breed.breed_type?.includes('Mixed'));
            const route = isPedigree ? `/breeds/${breedSlug}` : `/mixed-breeds/${breedSlug}`;
            results.push({
              id: breed.breed,
              type: 'breed',
              title: breed.breed,
              subtitle: `${isPedigree ? 'Pedigree' : 'Mixed'} Breed`,
              route: route,
              icon: <Dog className="h-4 w-4" />,
            });
          });
        }

        const { data: blogPosts, error: blogError } = await supabase
          .from('blog_posts')
          .select('id, title, description, slug')
          .or(`title.ilike.${like},description.ilike.${like}`)
          .eq('status', 'published')
          .limit(8);

        if (blogError) {
          console.error('Error fetching blog posts:', blogError);
        }
        if (blogPosts) {
          blogPosts.forEach((post: any) => {
            results.push({
              id: post.id,
              type: 'blog',
              title: post.title,
              subtitle: post.description?.substring(0, 80) || 'Blog post',
              route: `/blog/${post.slug}`,
              icon: <BookOpen className="h-4 w-4" />,
            });
          });
        }

      } catch (error) {
        console.error('Error searching:', error);
      }

      const sortedResults = results.sort((a, b) => {
        const order: Record<SearchResult['type'], number> = {
          listing: 1,
          business: 2,
          product: 3,
          breed: 4,
          blog: 5,
        };
        return (order[a.type] ?? 99) - (order[b.type] ?? 99);
      });

      return sortedResults.slice(0, 18);
    },
    enabled: searchQuery.trim().length >= 2,
    staleTime: 300,
  });

  // Show dropdown when has query (even if no results yet, show loading)
  const showDropdown = searchQuery.trim().length >= 2;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    // Keep dropdown open if query is long enough, even if not focused
    if (value.trim().length >= 2) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    setIsExpanded(true);
    onExpandChange?.(true);
    if (searchQuery.trim().length >= 2) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = () => {
    // Delay to allow click on results
    setTimeout(() => {
      setIsFocused(false);
      setIsExpanded(false);
      setIsOpen(false);
      onExpandChange?.(false);
    }, 200);
  };

  const handleResultClick = (route: string) => {
    router.push(route);
    setSearchQuery('');
    setIsOpen(false);
    setIsFocused(false);
    setIsExpanded(false);
    onExpandChange?.(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      // Navigate to search results page
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsOpen(false);
      setIsFocused(false);
      setIsExpanded(false);
      onExpandChange?.(false);
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setIsFocused(false);
      setIsExpanded(false);
      onExpandChange?.(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={searchRef} className="relative w-full">
      <div className="relative">
        <Search 
          className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 transition-all duration-300 ${
            isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`} 
        />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Listings, showcase, breeds, services, shop, blog…"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          className={`h-11 text-base w-full transition-all duration-300 ${
            isExpanded ? 'pl-4 pr-10' : 'pl-12 pr-10'
          }`}
        />
        {isLoading && (
          <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 animate-spin" />
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[11000] max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              <p className="text-sm">Searching...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="py-2">
              {/* Group results by type */}
              {(() => {
                const grouped: Record<string, SearchResult[]> = {};
                searchResults.forEach(result => {
                  if (!grouped[result.type]) grouped[result.type] = [];
                  grouped[result.type].push(result);
                });
                return Object.entries(grouped).map(([type, results]) => (
                  <div key={type}>
                    {type === 'listing' && (
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                        Listings
                      </div>
                    )}
                    {type === 'business' && (
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                        Services
                      </div>
                    )}
                    {type === 'product' && (
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                        Shop
                      </div>
                    )}
                    {type === 'breed' && (
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                        Breeds
                      </div>
                    )}
                    {type === 'blog' && (
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                        Blog
                      </div>
                    )}
                    {results.map((result) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleResultClick(result.route)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-start gap-3 group"
                      >
                        <div className="mt-0.5 text-gray-400 group-hover:text-brand-dark-green transition-colors">
                          {result.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 group-hover:text-brand-dark-green transition-colors truncate">
                            {result.title}
                          </p>
                          {result.subtitle && (
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {result.subtitle}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ));
              })()}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">No results found</p>
            </div>
          )}
          {searchResults.length > 0 && (
            <div className="border-t border-gray-200 px-4 py-2">
              <button
                onClick={() => handleResultClick(`/search?q=${encodeURIComponent(searchQuery.trim())}`)}
                className="text-sm text-brand-dark-green hover:text-brand-soft-green font-medium w-full text-left"
              >
                View all results for "{searchQuery}"
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
