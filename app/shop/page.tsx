'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, Check, Filter, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatPrice, convertPrice } from '@/services/currencyService';
import { motion } from 'framer-motion';
import { useIsDesktop } from '@/hooks/use-responsive';
import Link from 'next/link';
import NavigationSection from '@/components/NavigationSection';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/lib/supabase/client";
import { Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { useWishlist, type WishlistToggleResult } from '@/hooks/use-wishlist';
import WishlistAuthModal from '@/components/WishlistAuthModal';
import VariantSelectionModal from '@/components/shop/VariantSelectionModal';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

// Product type for type safety
interface Product {
  business_refund_policy?: string | null;
  shipping_cost?: number;
  shipping_required?: boolean;
  id: string;
  name: string;
  description: string;
  price: number;
  valued_at?: number;
  image_url: string | null;
  badge?: string;
  in_stock: boolean;
  slug: string;
  created_at?: string;
  updated_at?: string;
  variants?: any; // Add variants field
  free_shipping?: boolean;
  // Marketplace product fields
  is_marketplace?: boolean;
  business_id?: string;
  business_name?: string;
  business_slug?: string;
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

// Product card component
const ProductCard: React.FC<{
  product: Product;
  isInWishlist: (id: string) => boolean;
  toggleWishlist: (itemId: string, itemType: "stud" | "showcase" | "listing" | "service" | "product", e?: React.MouseEvent) => Promise<WishlistToggleResult>;
  onShowAuthModal: () => void;
}> = ({ product, isInWishlist, toggleWishlist, onShowAuthModal }) => {
  const router = useRouter();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const { currency, currencyInfo } = useCurrency();
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);

  // Parse variants from the product data
  const variants = parseVariants(product.variants);
  const hasVariants = variants && variants.length > 0;

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
      image: product.image_url || '/placeholder.svg',
      slug: product.slug,
      is_marketplace: product.is_marketplace,
      business_id: product.business_id,
      shipping_cost: product.shipping_cost,
      shipping_required: product.shipping_required,
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
        return product.image_url || '/placeholder.svg';
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
      return product.image_url || '/placeholder.svg';
    };

    // Create cart item with variant info
    const cartItem = {
      id: `${productId}-${color}`,
      title: `${product.name} (${color})`,
      price: product.price,
      image: getVariantImage(),
      slug: product.slug,
      is_marketplace: product.is_marketplace,
      business_id: product.business_id,
      shipping_cost: product.shipping_cost,
      shipping_required: product.shipping_required,
    };

    // Add items with quantity in one call
    addToCart(cartItem, quantity);

    setTimeout(() => setIsAdding(false), 1000);
  };

  const handleWaitlist = () => {
    toast({
      title: "Added to waitlist",
      description: `We'll notify you when ${product.name} is back in stock.`,
      duration: 3000,
    });
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id, 'product', e);
  };

  // Badge styles based on type
  const getBadgeStyle = (badge: string | undefined) => {
    if (!badge) return "";

    switch (badge) {
      case "Breeder Favourite":
        return "bg-purple-400 text-white";
      case "Also Available in Blue":
        return "bg-blue-400 text-white";
      case "Also Available in Pink":
        return "bg-pink-400 text-white";
      case "Essential Kit":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-brand-light-green text-brand-dark-green";
    }
  };

  const getShippingInfo = () => {
    // For marketplace products
    if (product.is_marketplace) {
      const shippingCost = product.shipping_cost || 0;
      const shippingRequired = product.shipping_required !== false;
      if (!shippingRequired || shippingCost === 0) {
        return { text: 'Free Shipping', className: "bg-green-500 text-white" };
      } else {
        return { text: `Shipping: ${formatPrice(shippingCost, currency)}`, className: "bg-gray-200 text-gray-800" };
      }
    }
    
    // For DogQuest products
    const isCollar = product.name?.toLowerCase().includes('collar') ||
      product.slug?.toLowerCase().includes('collar');

    if (product.free_shipping && !isCollar) {
      return { text: 'Free Shipping', className: "bg-green-500 text-white" };
    } else if (isCollar) {
      return { text: `Shipping: ${formatPrice(5, currency)}`, className: "bg-gray-200 text-gray-800" };
    }
    
    return null;
  };

  const shippingInfo = getShippingInfo();

  // Determine dynamic badge text for Puppy Starter Kit
  const getDisplayBadge = () => {
    if (product.slug?.includes('puppy-starter-kit') && product.image_url) {
      const imageLower = product.image_url.toLowerCase();
      if (imageLower.includes('blue')) {
        return "Also Available in Pink";
      } else if (imageLower.includes('pink')) {
        return "Also Available in Blue";
      }
    }
    return product.badge;
  };

  const displayBadge = getDisplayBadge();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="h-full overflow-hidden border-2 border-gray-100 transition-all duration-200 hover:shadow-md hover:border-brand-light-green flex flex-col">
        <Link href={`/shop/${product.slug || '#'}`} className="block flex-grow">
          <div className="relative overflow-hidden">
            {/* Product image */}
            <div className="aspect-square overflow-hidden bg-gray-100 flex items-center justify-center">
              <img
                src={product.image_url || '/placeholder.svg'}
                alt={product.name}
                className="h-full w-full object-contain transition-transform duration-300 hover:scale-105"
              />
            </div>

            <div className="absolute top-3 left-3 flex flex-col gap-2 items-start">
              {/* Marketplace badge */}
              {product.is_marketplace && product.business_name && (
                <Badge className="bg-blue-600 text-white">
                  Sold by {product.business_name}
                </Badge>
              )}

              {/* Badge (if any) */}
              {displayBadge && (
                <Badge className={`${getBadgeStyle(displayBadge)}`}>
                  {displayBadge}
                </Badge>
              )}

              {/* Shipping badge */}
              {shippingInfo && (
                <Badge className={`${shippingInfo.className}`}>
                  {shippingInfo.text}
                </Badge>
              )}

              {/* Stock status badge */}
              <Badge
                variant="outline"
                className={`${product.in_stock ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}
              >
                {product.in_stock ? 'In Stock' : 'Out of Stock'}
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
              {product.description}
            </p>

            <div className="flex justify-between items-center mb-4 flex-grow">
              <div className="flex flex-col gap-1 h-[3.5rem] justify-start">
                {/* Check if product needs original price display */}
                {(() => {
                  const isPuppyStarterKit = product.slug?.includes('puppy-starter-kit');
                  const isCollar = product.name?.toLowerCase().includes('collar') || product.slug?.toLowerCase().includes('collar');
                  const originalPrice = isPuppyStarterKit ? 129.99 : isCollar ? 15.99 : null;
                  
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

              <Button
                variant="outline"
                size="sm"
                className="text-brand-dark-green border-brand-soft-green hover:bg-brand-soft-green hover:text-white"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (product.slug) {
                    router.push(`/shop/${product.slug}`);
                  }
                }}
              >
                View Product
              </Button>
            </div>
          </CardContent>
        </Link>

        {product.in_stock ? (
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
                  {product.slug === 'puppy-starter-kit-9470' ? 'Add to Cart' : hasVariants ? 'Select Options' : 'Add to Cart'}
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
                handleWaitlist();
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
          imageUrl: product.image_url || '/placeholder.svg',
          slug: product.slug,
          variants: variants,
        }}
        onAddToCart={handleVariantAddToCart}
      />
    </motion.div>
  );
};

// Main Shop component
const Shop: React.FC = () => {
  const [priceRange, setPriceRange] = useState<number[]>([0, 1000]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortOption, setSortOption] = useState("popular");
  const [productTypeFilter, setProductTypeFilter] = useState<'all' | 'dogquest' | 'marketplace'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currency, isLoading: currencyLoading } = useCurrency();
  const isDesktop = useIsDesktop();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const {
    wishlistAuthModalOpen,
    setWishlistAuthModalOpen,
    pendingWishlistItem,
    isInWishlist,
    toggleWishlist
  } = useWishlist();

  // Fetch products from Supabase
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Fetch admin products
        const { data: adminProducts, error: adminError } = await supabase
          .from('products')
          .select('*');

        if (adminError) {
          console.error('Error fetching admin products:', adminError);
        }

        // Fetch marketplace products - only published and approved, with stock > 0
        // Fetch all marketplace products (will filter by subscription later)
        const { data: marketplaceProducts, error: marketplaceError } = await supabase
          .from('marketplace_products' as any)
          .select(`
            *,
            business_listings!business_id (
              id,
              name,
              slug,
              subscription_tier,
              user_id,
              refund_policy,
              user_profiles!user_id (
                is_suspended,
                status
              )
            )
          `)
          .eq('status', 'live')
          .eq('is_published', true)
          .eq('admin_approved', true)
          .gt('stock_quantity', 0);

        if (marketplaceError) {
          console.error('Error fetching marketplace products:', marketplaceError);
        }

        const allProducts: Product[] = [];

        // Add admin products
        if (adminProducts) {
          allProducts.push(...adminProducts.map(item => ({
            ...item,
            valued_at: item.valued_at ?? undefined,
            images: item.images ?? undefined,
            badge: item.badge ?? undefined,
            free_shipping: item.free_shipping ?? undefined,
            is_marketplace: false,
          })) as Product[]);
        }

        // Add marketplace products (convert to Product format)
        // Only include products from users with elite_marketplace subscription
        // Filter out products from suspended businesses
        if (marketplaceProducts && marketplaceProducts.length > 0) {
          // Filter out products from suspended businesses
          const filteredMarketplaceProducts = marketplaceProducts.filter((item: any) => {
            const businessListing = item.business_listings;
            if (!businessListing) return false; // If no business listing, exclude
            
            const userProfile = businessListing.user_profiles;
            if (!userProfile) return true; // If no profile, allow through
            
            // Filter out if business owner is suspended
            const isSuspended = userProfile.is_suspended === true || userProfile.status === 'suspended';
            return !isSuspended;
          });

          // Get unique user_ids from filtered marketplace products
          const userIds = [...new Set(filteredMarketplaceProducts.map((item: any) => {
            // Use user_id from marketplace_products if available, otherwise from business_listings
            return item.user_id || item.business_listings?.user_id;
          }).filter(Boolean))];
          
          // Query business_subscriptions to find users with elite_marketplace subscription
          // Only fetch active subscriptions for consistency
          const { data: eliteSubscriptions, error: subError } = await supabase
            .from('business_subscriptions' as any)
            .select('user_id, subscription_tier, status')
            .in('user_id', userIds)
            .eq('subscription_tier', 'elite_marketplace')
            .eq('status', 'active');

          if (subError) {
            console.error('Error fetching elite subscriptions:', subError);
          }

          // Create a Set of user IDs with elite_marketplace subscription
          const eliteUserIds = new Set<string>();
          
          // Add users with elite subscription from business_subscriptions
          if (eliteSubscriptions) {
            eliteSubscriptions.forEach((sub: any) => {
              eliteUserIds.add(sub.user_id);
            });
          }

          // Filter marketplace products to only include those from users with elite subscriptions
          const eliteMarketplaceProducts = filteredMarketplaceProducts.filter((item: any) => {
            const business = item.business_listings;
            if (!business) return false;

            // Get user_id from product or business listing
            const userId = item.user_id || business.user_id;
            if (!userId) return false;

            // Check subscription_tier from business_listings first (fallback)
            if (business.subscription_tier === 'elite_marketplace') {
              return true;
            }

            // Check if user_id is in elite subscriptions
            return eliteUserIds.has(userId);
          });

          allProducts.push(...eliteMarketplaceProducts.map((item: any) => ({
            id: item.id,
            name: item.name,
            description: item.full_description || item.short_description || item.description,
            price: Number(item.sale_price || item.price),
            valued_at: item.sale_price ? Number(item.price) : undefined,
            image_url: (item.images && Array.isArray(item.images) && item.images[0]) || item.image_url,
            in_stock: (item.stock_quantity || 0) > 0,
            slug: `marketplace-${item.id}`, // Use ID as slug for marketplace products
            created_at: item.created_at,
            updated_at: item.updated_at,
            is_marketplace: true,
            business_id: item.business_id,
            business_name: item.business_listings?.name,
            business_slug: item.business_listings?.slug,
            business_refund_policy: item.business_listings?.refund_policy,
            shipping_cost: item.shipping_cost || 0,
            shipping_required: item.shipping_required || false,
          })) as Product[]);
        }

        setProducts(allProducts);
      } catch (error) {
        console.error('Error in products fetch:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Set initial filter collapse state based on device type
  useEffect(() => {
    // Start with filters closed on mobile/tablet, open on desktop
    setIsFiltersOpen(isDesktop);
  }, [isDesktop]);

  // Filter products based on current filters - now with currency conversion
  useEffect(() => {
    let filtered = [...products];

    // Filter by product type
    if (productTypeFilter === 'dogquest') {
      filtered = filtered.filter(product => !product.is_marketplace);
    } else if (productTypeFilter === 'marketplace') {
      filtered = filtered.filter(product => product.is_marketplace);
    }

    // Filter by price - convert to current currency for comparison
    filtered = filtered.filter(product => {
      const convertedPrice = convertPrice(Number(product.price), currency);
      return convertedPrice >= priceRange[0] && convertedPrice <= priceRange[1];
    });

    // Filter by stock
    if (inStockOnly) {
      filtered = filtered.filter(product => product.in_stock);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(product => {
        const nameMatch = product.name?.toLowerCase().includes(query);
        const descriptionMatch = product.description?.toLowerCase().includes(query);
        return nameMatch || descriptionMatch;
      });
    }

    // Sort products
    switch (sortOption) {
      case "price-low":
        filtered.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case "price-high":
        filtered.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case "newest":
        // Sort by created_at date
        filtered.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        });
        break;
      default:
        // "popular" - No sorting needed for now
        break;
    }

    setFilteredProducts(filtered);
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [products, priceRange, inStockOnly, sortOption, productTypeFilter, searchQuery, currency]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages, filteredProducts.length]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  // Find the maximum price in the products for the price range slider - in current currency
  const maxPrice = Math.max(...products.map(p => convertPrice(Number(p.price), currency)), 1000);
  
  // Update price range when products load to include all products
  useEffect(() => {
    if (products.length > 0 && maxPrice > 0) {
      const currentMax = Math.max(priceRange[1], maxPrice);
      if (currentMax > priceRange[1]) {
        setPriceRange([0, currentMax]);
      }
    }
  }, [products.length, maxPrice]);

  // Show loading state while currency is being detected
  if (currencyLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-soft-green"></div>
      </div>
    );
  }

  return (
    <>

      {/* Wishlist Auth Modal */}
      <WishlistAuthModal
        open={wishlistAuthModalOpen}
        onOpenChange={setWishlistAuthModalOpen}
        itemToSave={pendingWishlistItem || undefined}
      />

      <section className="py-8 bg-white">
        <div className="container mx-auto px-4">
          {/* Page Title */}
          <div className="mb-4 text-center">
            <h1 className="text-3xl md:text-4xl font-berkshire text-brand-dark-green mb-2">
              Dog Quest Shop
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Hand-picked premium products for your canine companions. Quality essentials for dogs and their owners across Ireland.
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-6 max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search products by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-6 text-base border-2 border-gray-200 focus:border-brand-dark-green rounded-lg"
              />
            </div>
          </div>

          {/* Banner */}
          <div className="bg-brand-light-green/30 rounded-lg p-4 mb-6 text-center">
            <p className="text-brand-dark-green font-medium">
              Products coming soon! Check back regularly for new items.
            </p>
          </div>

          <div className="lg:flex lg:gap-8">
            {/* Filters Section - Collapsible on mobile/tablet, sidebar on desktop */}
            <div className={`${!isDesktop ? 'mb-6' : 'lg:w-1/4 lg:max-w-xs'}`}>
              {!isDesktop ? (
                <Collapsible
                  open={isFiltersOpen}
                  onOpenChange={setIsFiltersOpen}
                  className="bg-white p-4 rounded-lg border-2 border-gray-100"
                >
                  <div className={cn("flex items-center justify-between", isFiltersOpen ? "mb-4" : "mb-0")}>
                    <CollapsibleTrigger asChild>
                      <button className="flex h-12 items-center justify-between w-full text-lg font-semibold text-brand-dark-green">
                        <span className="flex items-center">
                          <Filter className="mr-2 h-5 w-5" />
                          Filters
                        </span>
                        {isFiltersOpen ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    {/* Product Type Filter */}
                    <div className="mb-4">
                      <Label htmlFor="mobile-product-type" className="text-sm font-medium mb-2 block">
                        Product Type
                      </Label>
                      <Select
                        value={productTypeFilter}
                        onValueChange={(value: any) => setProductTypeFilter(value)}
                      >
                        <SelectTrigger id="mobile-product-type" className="w-full">
                          <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Products</SelectItem>
                          <SelectItem value="dogquest">DogQuest Products</SelectItem>
                          <SelectItem value="marketplace">Marketplace</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Price Range Filter */}
                    <div className="mb-6">
                      <h3 className="text-sm font-medium mb-2">Price Range</h3>
                      <div className="space-y-4">
                        <Slider
                          defaultValue={[0, maxPrice]}
                          max={maxPrice}
                          step={1}
                          onValueChange={(value) => setPriceRange(value)}
                          className="w-full"
                        />
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>{formatPrice(priceRange[0], currency)}</span>
                          <span>{formatPrice(priceRange[1], currency)}</span>
                        </div>
                      </div>
                    </div>

                    {/* In Stock Filter */}
                    <div className="flex items-center space-x-2 mb-6">
                      <Switch
                        id="mobile-in-stock"
                        checked={inStockOnly}
                        onCheckedChange={setInStockOnly}
                      />
                      <Label htmlFor="mobile-in-stock">In Stock Only</Label>
                    </div>

                    {/* Sort Options */}
                    <div className="mb-4">
                      <Label htmlFor="mobile-sort-by" className="text-sm font-medium mb-2 block">
                        Sort By
                      </Label>
                      <Select
                        value={sortOption}
                        onValueChange={setSortOption}
                      >
                        <SelectTrigger id="mobile-sort-by" className="w-full">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="popular">Popularity</SelectItem>
                          <SelectItem value="price-low">Price: Low to High</SelectItem>
                          <SelectItem value="price-high">Price: High to Low</SelectItem>
                          <SelectItem value="newest">Newest</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <div className="bg-white p-4 rounded-lg border-2 border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-brand-dark-green flex items-center">
                      <Filter className="mr-2 h-5 w-5" />
                      Filters
                    </h2>
                  </div>

                  {/* Price Range Filter */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium mb-2">Price Range</h3>
                    <div className="space-y-4">
                      <Slider
                        defaultValue={[0, maxPrice]}
                        max={maxPrice}
                        step={1}
                        onValueChange={(value) => setPriceRange(value)}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{formatPrice(priceRange[0], currency)}</span>
                        <span>{formatPrice(priceRange[1], currency)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Product Type Filter */}
                  <div className="mb-4">
                    <Label htmlFor="product-type" className="text-sm font-medium mb-2 block">
                      Product Type
                    </Label>
                    <Select
                      value={productTypeFilter}
                      onValueChange={(value: any) => setProductTypeFilter(value)}
                    >
                      <SelectTrigger id="product-type" className="w-full">
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Products</SelectItem>
                        <SelectItem value="dogquest">DogQuest Products</SelectItem>
                        <SelectItem value="marketplace">Marketplace</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* In Stock Filter */}
                  <div className="flex items-center space-x-2 mb-6">
                    <Switch
                      id="in-stock"
                      checked={inStockOnly}
                      onCheckedChange={setInStockOnly}
                    />
                    <Label htmlFor="in-stock">In Stock Only</Label>
                  </div>

                  {/* Sort Options */}
                  <div className="mb-4">
                    <Label htmlFor="sort-by" className="text-sm font-medium mb-2 block">
                      Sort By
                    </Label>
                    <Select
                      value={sortOption}
                      onValueChange={setSortOption}
                    >
                      <SelectTrigger id="sort-by" className="w-full">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="popular">Popularity</SelectItem>
                        <SelectItem value="price-low">Price: Low to High</SelectItem>
                        <SelectItem value="price-high">Price: High to Low</SelectItem>
                        <SelectItem value="newest">Newest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Products Grid */}
            <div className="lg:flex-1">
              {/* Results Summary */}
              <div className="flex justify-between items-center mb-4">
                <p className="text-gray-600">
                  Showing {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'}
                </p>
                {filteredProducts.length > 0 && (
                  <span className="text-sm text-gray-600 font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                )}
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center h-60">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-soft-green"></div>
                </div>
              ) : filteredProducts.length > 0 ? (
                /* Use carousel for mobile and tablet, grid for desktop */
                !isDesktop ? (
                  /* Mobile/Tablet Carousel View */
                  <div className="relative">
                    <Carousel
                      opts={{
                        align: 'start',
                        loop: false,
                        dragFree: true,
                      }}
                      className="w-full mt-14"
                    >
                      {/* Navigation buttons at the top */}
                      <div className="absolute top-[-30px] right-0 flex space-x-2 z-10">
                        <CarouselPrevious className="relative static h-8 w-8" />
                        <CarouselNext className="relative static h-8 w-8" />
                      </div>

                      <CarouselContent className="-ml-4">
                        {paginatedProducts.map((product) => (
                          <CarouselItem key={product.id} className="pl-4 basis-[85%] md:basis-[80%] lg:basis-[60%]">
                            <ProductCard
                              product={product}
                              isInWishlist={isInWishlist}
                              toggleWishlist={toggleWishlist}
                              onShowAuthModal={() => setWishlistAuthModalOpen(true)}
                            />
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                    </Carousel>
                  </div>
                ) : (
                  /* Desktop Grid View */
                  <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {paginatedProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        isInWishlist={isInWishlist}
                        toggleWishlist={toggleWishlist}
                        onShowAuthModal={() => setWishlistAuthModalOpen(true)}
                      />
                    ))}
                  </div>
                )
              ) : (
                <div className="h-60 flex flex-col items-center justify-center border rounded-lg p-6 text-center">
                  <p className="text-gray-500 mb-4">No products available yet.</p>
                  <p className="text-gray-500">Check back soon for our product range!</p>
                </div>
              )}

              {/* Pagination Controls - Always show when there are products */}
              {filteredProducts.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6 pt-6 border-t-2 border-gray-300 bg-white sticky bottom-0 z-10 py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="cursor-pointer disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>

                  <div className="flex items-center gap-1 flex-wrap justify-center">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(page)}
                            className={cn(
                              "min-w-[40px] cursor-pointer",
                              currentPage === page
                                ? "bg-brand-dark-green hover:bg-brand-soft-green text-white"
                                : ""
                            )}
                          >
                            {page}
                          </Button>
                        );
                      } else if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                      ) {
                        return (
                          <span key={page} className="px-2 text-gray-500">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="cursor-pointer disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Wave Background */}
      <div className="w-full overflow-hidden rotate-180">
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="w-full h-[60px] md:h-[80px] relative block"
        >
          <path
            d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z"
            className="fill-white"
          ></path>
        </svg>
      </div>

      {/* Add the Navigation Section */}
      <NavigationSection />
    </>
  );
};

export default Shop;
