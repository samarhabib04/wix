'use client';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';


import Link from 'next/link';
import { supabase } from "@/lib/supabase/client";
import { Heart, ShoppingCart, Check } from 'lucide-react';
import { useWishlist, type WishlistToggleResult } from '@/hooks/use-wishlist';
import { useCart } from '@/contexts/CartContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatPrice } from '@/services/currencyService';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import VariantSelectionModal from '@/components/shop/VariantSelectionModal';
import WishlistAuthModal from '@/components/WishlistAuthModal';
import { useAuth } from '@/contexts/AuthContext';

interface Product {
  id: string;
  name: string;
  price: number;
  valuedAt?: number;
  originalPrice?: number;
  imageUrl: string;
  inStock: boolean;
  isEssentialKit?: boolean;
  isBreederFavourite?: boolean;
  color?: string;
  hoverImageUrl?: string;
  slug?: string;
  badge?: string;
  description?: string;
  variants?: Array<{ color: string; stock: number }>;
  free_shipping?: boolean;
}

// Helper function to safely parse variants from Supabase Json type
const parseVariants = (variants: any): Array<{ color: string; stock: number }> => {
  if (!variants) return [];

  // If it's already an array, return it
  if (Array.isArray(variants)) {
    return variants.filter(variant =>
      variant &&
      typeof variant === 'object' &&
      typeof variant.color === 'string' &&
      typeof variant.stock === 'number'
    );
  }

  // If it's a string, try to parse it as JSON
  if (typeof variants === 'string') {
    try {
      const parsed = JSON.parse(variants);
      if (Array.isArray(parsed)) {
        return parsed.filter(variant =>
          variant &&
          typeof variant === 'object' &&
          typeof variant.color === 'string' &&
          typeof variant.stock === 'number'
        );
      }
    } catch (error) {
      console.error('Error parsing variants JSON:', error);
    }
  }

  return [];
};

const ProductCard = ({
  product,
  isInWishlist,
  toggleWishlist,
  onShowAuthModal
}: {
  product: Product;
  isInWishlist: (id: string) => boolean;
  toggleWishlist: (itemId: string, itemType: "listing" | "showcase" | "stud" | "service" | "product", e?: React.MouseEvent) => Promise<WishlistToggleResult>;
  onShowAuthModal: () => void;
}) => {
  const { toast } = useToast();
  const { addToCart } = useCart();
  const { currency } = useCurrency();
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);

  // Check if product has variants
  const hasVariants = product.variants && product.variants.length > 0;

  // Determine badge display based on product data
  const getBadgeInfo = () => {
    // Dynamic badge logic for Puppy Starter Kit
    if (product.slug?.includes('puppy-starter-kit')) {
      const imageLower = product.imageUrl?.toLowerCase() || '';
      if (imageLower.includes('blue')) {
        return { text: 'Also Available in Pink', className: "bg-pink-400 text-white" };
      } else if (imageLower.includes('pink')) {
        return { text: 'Also Available in Blue', className: "bg-blue-400 text-white" };
      }
    }

    if (product.badge) {
      switch (product.badge.toLowerCase()) {
        case 'essential kit':
          return { text: 'Essential Kit', className: "bg-amber-100 text-amber-800" };
        case 'breeder favourite':
          return { text: 'Breeder Favourite', className: "bg-purple-400 text-white" };
        case 'also available in blue':
          return { text: 'Also Available in Blue', className: "bg-blue-400 text-white" };
        case 'also available in pink':
          return { text: 'Also Available in Pink', className: "bg-pink-400 text-white" };
        default:
          return { text: product.badge, className: "bg-brand-light-green text-brand-dark-green" };
      }
    }

    // Fallback to legacy boolean properties
    if (product.isEssentialKit) {
      return { text: 'Essential Kit', className: "bg-amber-100 text-amber-800" };
    }
    if (product.isBreederFavourite) {
      return { text: 'Breeder Favourite', className: "bg-purple-400 text-white" };
    }

    return null;
  };

  const getFreeShippingBadge = () => {
    // Don't show free shipping for collars (they have €5 shipping)
    const isCollar = product.name?.toLowerCase().includes('collar') ||
      product.slug?.toLowerCase().includes('collar');

    if (product.free_shipping && !isCollar) {
      return { text: 'Free Shipping', className: "bg-green-500 text-white" };
    }
    return null;
  };

  const badgeInfo = getBadgeInfo();
  const freeShippingBadge = getFreeShippingBadge();

  const handleAddToCart = () => {
    // Check if user is logged in
    if (!user) {
      onShowAuthModal();
      return;
    }

    // If product has variants, show modal for selection
    if (hasVariants) {
      setShowVariantModal(true);
      return;
    }

    // Original add to cart logic for products without variants
    setIsAdding(true);

    addToCart({
      id: product.id,
      title: product.name,
      price: product.price,
      image: product.imageUrl || '/placeholder.svg',
      slug: product.slug, // Add slug to cart item
    });

    setTimeout(() => setIsAdding(false), 1000);
  };

  const handleVariantAddToCart = (productId: string, color: string, quantity: number) => {
    // Check if user is logged in
    if (!user) {
      onShowAuthModal();
      return;
    }

    setIsAdding(true);

    // Get variant-specific image URL
    const getVariantImage = (): string => {
      if (!color) {
        return product.imageUrl || '/placeholder.svg';
      }

      // For Puppy Starter Kit, use specific variant image URLs
      if (product.slug?.includes('puppy-starter-kit')) {
        if (color.toLowerCase() === 'pink') {
          return "https://sehzakutrlropprdcewu.supabase.co/storage/v1/object/public/dog-quest-shop/Puppy Starter Kit Pink/puppy_starter_kit_pink.png";
        } else if (color.toLowerCase() === 'blue') {
          return "https://sehzakutrlropprdcewu.supabase.co/storage/v1/object/public/dog-quest-shop/Puppy Starter Kit Blue/puppy_starter_kit_blue.png";
        }
      }

      // Fallback to default image
      return product.imageUrl || '/placeholder.svg';
    };

    // Create cart item with variant info
    const cartItem = {
      id: `${productId}-${color}`,
      title: `${product.name} (${color})`,
      price: product.price,
      image: getVariantImage(),
      slug: product.slug, // Add slug to cart item
    };

    // Add items with quantity in one call
    addToCart(cartItem, quantity);

    setTimeout(() => setIsAdding(false), 1000);
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id, 'product', e);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="h-full overflow-hidden border-2 border-gray-100 transition-all duration-200 hover:shadow-md hover:border-brand-light-green flex flex-col">
        <Link href={`/shop/${product.slug || `product-${product.id}`}`} className="block flex-grow">
          <div className="relative overflow-hidden">
            {/* Product image */}
            <div className="aspect-square overflow-hidden bg-gray-100">
              <div className="relative w-full h-full">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className={cn(
                    "w-full h-full object-cover transition-opacity duration-300",
                    product.hoverImageUrl ? "opacity-100 group-hover:opacity-0" : "opacity-100"
                  )}
                />
                {product.hoverImageUrl && (
                  <img
                    src={product.hoverImageUrl}
                    alt={`${product.name} alternate`}
                    className="w-full h-full object-cover absolute inset-0 transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                  />
                )}
              </div>
            </div>

            {/* Badges stacked at top-left */}
            <div className="absolute top-3 left-3 flex flex-col gap-2 items-start">
              {/* Badge (if any) */}
              {badgeInfo && (
                <Badge className={`${badgeInfo.className}`}>
                  {badgeInfo.text}
                </Badge>
              )}

              {/* Free shipping badge */}
              {freeShippingBadge && (
                <Badge className={`${freeShippingBadge.className}`}>
                  {freeShippingBadge.text}
                </Badge>
              )}

              {/* Stock status badge */}
              <Badge
                variant="outline"
                className={`${product.inStock ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}
              >
                {product.inStock ? 'In Stock' : 'Out of Stock'}
              </Badge>
            </div>

            {/* Wishlist button at top-right */}
            <button
              className="absolute top-3 right-3 bg-white/80 p-1.5 rounded-full hover:bg-white transition-colors shadow-sm"
              onClick={handleWishlistToggle}
              aria-label={isInWishlist(product.id) ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart
                className={`w-4 h-4 ${isInWishlist(product.id) ? "fill-red-500 stroke-red-500" : "stroke-gray-600"}`}
              />
            </button>

          </div>

          <CardContent className="p-4 flex-grow flex flex-col">
            <h3 className="text-lg font-semibold font-berkshire text-brand-dark-green mb-1 line-clamp-2 h-[3.2rem]">
              {product.name}
            </h3>

            <p className="text-gray-600 text-sm mb-3 line-clamp-2 h-10">
              {product.description || 'Premium quality product for your canine companion'}
            </p>

            <div className="flex justify-between items-center mb-4 flex-grow">
              <div className="flex flex-col gap-1 h-[3.5rem] justify-start">
                {/* Check if product needs original price display */}
                {(() => {
                  const isPuppyStarterKit = product.slug?.includes('puppy-starter-kit');
                  const isCollar = product.name?.toLowerCase().includes('collar') || product.slug?.toLowerCase().includes('collar');
                  const originalPrice = isPuppyStarterKit ? 129.99 : isCollar ? 15.99 : product.originalPrice;
                  
                  if (originalPrice) {
                    return (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-medium text-brand-dark-green">
                          {formatPrice(product.price, currency)}
                        </span>
                        <span className="text-sm text-pink-500 line-through">
                          {formatPrice(originalPrice, currency)}
                        </span>
                      </div>
                    );
                  }
                  
                  return (
                    <span className="text-lg font-medium text-brand-dark-green">
                      {formatPrice(product.price, currency)}
                    </span>
                  );
                })()}
              </div>

              <Link href={`/shop/${product.slug || `product-${product.id}`}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-brand-dark-green border-brand-soft-green hover:bg-brand-soft-green hover:text-white"
                >
                  View Product
                </Button>
              </Link>
            </div>
          </CardContent>
        </Link>

        {product.inStock ? (
          <div className="px-4 pb-4">
            <Button
              className={`w-full bg-brand-soft-green hover:bg-brand-dark-green text-white transition-all duration-300 ${isAdding ? 'bg-green-600' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleAddToCart();
              }}
              disabled={isAdding}
              aria-label={`Add ${product.name} to cart`}
            >
              {isAdding ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Added!
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {hasVariants ? 'Select Options' : 'Add to Cart'}
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="px-4 pb-4">
            <Button
              variant="outline"
              className="w-full border-brand-soft-green text-brand-dark-green hover:bg-brand-light-green"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                toast({
                  title: "Added to waitlist",
                  description: `We'll notify you when ${product.name} is back in stock.`,
                  duration: 3000,
                });
              }}
              aria-label={`Get notified when ${product.name} is back in stock`}
            >
              Notify Me When Restocked
            </Button>
          </div>
        )}
      </Card>

      {/* Variant Selection Modal */}
      <VariantSelectionModal
        open={showVariantModal}
        onOpenChange={setShowVariantModal}
        product={{
          id: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          slug: product.slug,
          variants: product.variants,
        }}
        onAddToCart={handleVariantAddToCart}
      />
    </motion.div>
  );
};

const ShopSection: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [emblaApi, setEmblaApi] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { wishlistAuthModalOpen, setWishlistAuthModalOpen, pendingWishlistItem, isInWishlist, toggleWishlist } = useWishlist();

  // Fetch products from Supabase
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .limit(6);

        if (error) {
          console.error('Error fetching products:', error);
          return;
        }

        if (data && data.length > 0) {
          // Transform data to match our Product interface
          const transformedProducts: Product[] = data.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: Number(item.price),
            valuedAt: item.valued_at ? Number(item.valued_at) : undefined,
            imageUrl: item.image_url || '/placeholder.svg',
            inStock: item.in_stock,
            slug: item.slug,
            badge: item.badge ?? undefined,
            variants: parseVariants(item.variants),
            isBreederFavourite: item.badge === 'Breeder Favourite',
            isEssentialKit: item.badge === 'Essential Kit',
            free_shipping: item.free_shipping ?? undefined
          }));

          setProducts(transformedProducts);
        }
      } catch (error) {
        console.error('Error in products fetch:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const pagesCount = useMemo(() => {
    return Math.ceil(products.length / 4);
  }, [products.length]);

  const handleScroll = useCallback((api: any) => {
    if (!api) return;
    const slideIndex = api.selectedScrollSnap() || 0;
    setCurrentSlide(slideIndex);
  }, []);

  const goToSlide = useCallback((index: number) => {
    if (emblaApi) {
      emblaApi.scrollTo(index);
      setCurrentSlide(index);
    }
  }, [emblaApi]);

  // Determine if we should show carousel or grid based on product count
  const shouldShowCarousel = products.length > 3;

  return (
    <>
      {/* WishlistAuthModal */}
      <WishlistAuthModal
        open={wishlistAuthModalOpen}
        onOpenChange={setWishlistAuthModalOpen}
        itemToSave={pendingWishlistItem || undefined}
      />

      {/* Top Wave */}
      <div className="w-full overflow-hidden">
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="w-full h-[60px] md:h-[80px] relative block"
        >
          <path
            d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z"
            className="fill-[#f5faf7]"
          ></path>
        </svg>
      </div>

      <section className="py-16 px-4 bg-[#f5faf7]">
        <div className="container mx-auto max-w-7xl">
          {/* Header Section */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-berkshire text-brand-dark-green mb-4">
              Dog Quest Shop
            </h2>
            <p className="text-gray-600 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
              Must-haves for your puppy's journey - handpicked by trusted breeders.
            </p>
          </div>

          {/* Products Section */}
          <div className="relative">
            {isLoading ? (
              <div className="flex justify-center items-center h-80">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-brand-soft-green"></div>
              </div>
            ) : products.length > 0 ? (
              <div className="space-y-8">
                {shouldShowCarousel ? (
                  // Carousel for 4+ products
                  <>
                    <Carousel
                      opts={{
                        align: 'start',
                        loop: false,
                        dragFree: true,
                        containScroll: 'trimSnaps',
                        inViewThreshold: 0.6,
                        duration: 25,
                      }}
                      className="w-full"
                      setApi={(api) => {
                        if (api) {
                          setEmblaApi(api);
                          api.on('select', () => handleScroll(api));
                          api.on('reInit', () => handleScroll(api));
                        }
                      }}
                    >
                      <CarouselContent className="-ml-4">
                        {products.map(product => (
                          <CarouselItem
                            key={product.id}
                            className="pl-4 basis-[85%] sm:basis-[45%] md:basis-[33%] lg:basis-[25%]"
                          >
                            <div className="h-full">
                              <ProductCard
                                product={product}
                                isInWishlist={isInWishlist}
                                toggleWishlist={toggleWishlist}
                                onShowAuthModal={() => setWishlistAuthModalOpen(true)}
                              />
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>

                      {/* Navigation Controls */}
                      <div className="flex justify-end gap-3 mt-6">
                        <CarouselPrevious
                          className="relative static h-10 w-10 rounded-full border-2 border-brand-dark-green bg-white text-brand-dark-green hover:bg-brand-dark-green hover:text-white transition-colors duration-200"
                        />
                        <CarouselNext
                          className="relative static h-10 w-10 rounded-full border-2 border-brand-dark-green bg-white text-brand-dark-green hover:bg-brand-dark-green hover:text-white transition-colors duration-200"
                        />
                      </div>
                    </Carousel>

                    {/* Pagination Dots */}
                    {products.length > 4 && (
                      <div className="flex justify-center gap-2 mt-6">
                        {Array.from({ length: pagesCount }).map((_, index) => (
                          <button
                            key={index}
                            onClick={(e) => {
                              e.preventDefault();
                              goToSlide(index);
                            }}
                            className={`h-3 w-3 rounded-full transition-all duration-200 ${currentSlide === index
                              ? 'bg-brand-dark-green scale-110'
                              : 'bg-gray-300 hover:bg-gray-400'
                              }`}
                            aria-label={`Go to page ${index + 1}`}
                            aria-current={currentSlide === index ? "true" : "false"}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  // Simple grid for 1-3 products - better UX for small counts
                  <div className={cn(
                    "grid gap-6 justify-center",
                    products.length === 1 && "grid-cols-1 max-w-sm mx-auto",
                    products.length === 2 && "grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto",
                    products.length === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto"
                  )}>
                    {products.map(product => (
                      <div key={product.id} className="w-full max-w-sm mx-auto">
                        <ProductCard
                          product={product}
                          isInWishlist={isInWishlist}
                          toggleWishlist={toggleWishlist}
                          onShowAuthModal={() => setWishlistAuthModalOpen(true)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="w-16 h-16 bg-brand-light-green/20 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-brand-dark-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Products Coming Soon!</h3>
                  <p className="text-gray-600">We're working hard to bring you the best products for your furry friends.</p>
                </div>
              </div>
            )}

            {/* CTA Button */}
            <div className="text-center mt-12">
              <Button
                id="browse-dog-quest-shop-btn"
                data-restore-target
                className="bg-brand-soft-green hover:bg-brand-dark-green text-white px-8 py-4 text-lg font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
                onClick={() => window.location.href = "/shop"}
              >
                Browse Dog Quest Shop
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Wave */}
      <div className="w-full overflow-hidden">
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="w-full h-[60px] md:h-[80px] relative block"
        >
          <path
            d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
            className="fill-[#f5faf7]"
          ></path>
        </svg>
      </div>
    </>
  );
};

export default ShopSection;
