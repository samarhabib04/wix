'use client';

import { useQuery } from '@tanstack/react-query';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, ArrowRight, ShoppingBag } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

interface BoostedProduct {
  id: string;
  product_id: string;
  boost_start_time: string;
  marketplace_products: {
    id: string;
    name: string;
    description?: string;
    short_description?: string;
    price: number;
    sale_price?: number | null;
    image_url?: string | null;
    images?: string[] | null;
    category?: string | null;
    stock_quantity: number;
    business_id: string;
    business_listings?: {
      id: string;
      name: string;
      slug?: string;
    };
  };
}

interface MarketplaceProductBoostCarouselProps {
  maxItems?: number;
  title?: string;
}

export default function MarketplaceProductBoostCarousel({
  maxItems = 40,
  title = 'Featured Products',
}: MarketplaceProductBoostCarouselProps) {
  const { data: boostedProducts = [], isLoading } = useQuery({
    queryKey: ['marketplace-product-boosts-carousel'],
    queryFn: async (): Promise<BoostedProduct[]> => {
      const { data, error } = await supabase
        .from('marketplace_product_boosts' as any)
        .select(`
          id,
          product_id,
          boost_start_time,
          marketplace_products!inner (
            id,
            name,
            description,
            short_description,
            price,
            sale_price,
            image_url,
            images,
            category,
            stock_quantity,
            business_id,
            status,
            admin_approved,
            is_published,
            is_active,
            business_listings (
              id,
              name,
              slug
            )
          )
        `)
        .eq('is_active', true)
        .eq('payment_status', 'paid')
        .order('boost_start_time', { ascending: false })
        .limit(maxItems);

      if (error) {
        console.error('Error fetching boosted products:', error);
        throw error;
      }

      // Filter out products that don't have marketplace_products data and ensure they're live/approved and in stock
      return ((data as any) || [])
        .filter((bp: any) => {
          const product = bp.marketplace_products;
          return product && 
                 product.status === 'live' && 
                 product.admin_approved === true && 
                 product.is_published === true && 
                 product.is_active === true &&
                 (product.stock_quantity || 0) > 0;
        })
        .map((bp: any) => ({
          id: bp.id,
          product_id: bp.product_id,
          boost_start_time: bp.boost_start_time,
          marketplace_products: bp.marketplace_products,
        }));
    },
  });

  if (isLoading) {
    return (
      <div className="py-8">
        <h2 className="text-3xl md:text-4xl font-berkshire text-brand-dark-green mb-4 text-center">{title}</h2>
        <div className="text-center py-8 text-muted-foreground">Loading featured products...</div>
      </div>
    );
  }

  if (boostedProducts.length === 0) {
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
            {boostedProducts.map((bp) => {
              const product = bp.marketplace_products;
              const mainImage = (product.images && Array.isArray(product.images) && product.images[0]) || product.image_url;
              const displayPrice = product.sale_price ? product.sale_price : product.price;
              const originalPrice = product.sale_price ? product.price : null;
              const productSlug = `marketplace-${product.id}`;
              
              return (
                <CarouselItem key={bp.id} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                  <Link href={`/shop/${productSlug}`} className="block h-full">
                    <Card className="h-full hover:shadow-lg transition-shadow border-brand-soft-green/20 flex flex-col cursor-pointer">
                      {/* Product Image */}
                      {mainImage ? (
                        <div className="relative w-full h-48 overflow-hidden rounded-t-lg">
                          <img
                            src={mainImage}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 left-2">
                            <Badge variant="default" className="bg-yellow-500">
                              <Zap className="h-3 w-3 mr-1" />
                              Boosted
                            </Badge>
                          </div>
                          {product.category && (
                            <div className="absolute top-2 right-2">
                              <Badge variant="outline" className="bg-white/90 text-xs">
                                {product.category}
                              </Badge>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-48 bg-gray-200 flex items-center justify-center rounded-t-lg">
                          <ShoppingBag className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                      
                      <CardContent className="p-4 flex-1 flex flex-col">
                        {/* Product Name */}
                        <h3 className="font-semibold text-base mb-2 line-clamp-2 min-h-[3rem]">
                          {product.name}
                        </h3>
                        
                        {/* Description */}
                        {(product.short_description || product.description) && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2 flex-1">
                            {product.short_description || product.description}
                          </p>
                        )}
                        
                        {/* Price */}
                        <div className="mb-3">
                          <div className="flex items-center gap-2">
                            {originalPrice && (
                              <span className="text-sm text-muted-foreground line-through">
                                €{originalPrice.toFixed(2)}
                              </span>
                            )}
                            <p className="text-xl font-bold">€{displayPrice.toFixed(2)}</p>
                          </div>
                          {product.stock_quantity !== undefined && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {product.stock_quantity > 0 ? `In Stock (${product.stock_quantity})` : 'Out of Stock'}
                            </p>
                          )}
                        </div>
                        
                        {/* Business Name */}
                        {product.business_listings && (
                          <p className="text-xs text-muted-foreground mb-3">
                            By {product.business_listings.name}
                          </p>
                        )}
                        
                        {/* View Product Button */}
                        <div className="mt-auto">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                          >
                            View Product
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
