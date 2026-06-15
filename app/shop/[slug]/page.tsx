'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  Mail,
  ArrowLeft,
  ArrowRight,
  Check,
  ShoppingBag,
  Plus,
  Heart
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import NavigationSection from '@/components/NavigationSection';
import { supabase } from "@/lib/supabase/client";
import ListingCarouselSection, { MediaItem } from '@/components/listings/ListingCarouselSection';
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/hooks/use-wishlist";
import { useCart } from "@/contexts/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatPrice } from "@/services/currencyService";
import WishlistAuthModal from '@/components/WishlistAuthModal';
import ColorSelector from '@/components/product/ColorSelector';
import QuantitySelector from '@/components/product/QuantitySelector';

// Product type for type safety
interface Variant {
  color: string;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  valued_at?: number;
  image_url: string | null;
  images?: string[];
  badge?: string;
  in_stock: boolean;
  variants?: Variant[];
  created_at?: string;
  updated_at?: string;
  free_shipping?: boolean;
  // Marketplace product fields
  business_refund_policy?: string | null;
  shipping_cost?: number;
  shipping_required?: boolean;
  stock_quantity?: number;
  is_marketplace?: boolean;
  business_id?: string;
  business_name?: string;
  business_slug?: string;
}

interface SuggestedProduct {
  id: string;
  name: string;
  price: number;
  valued_at?: number;
  originalPrice?: number;
  image_url: string | null;
  slug: string;
  badge?: string;
  in_stock: boolean;
}

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
    case "New Arrival":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-brand-light-green text-brand-dark-green";
  }
};

// Helper function to safely parse variants from Supabase Json type
const parseVariants = (variants: any): Variant[] => {
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

// ProductDetail component
const ProductDetail: React.FC = () => {
  const params = useParams();
  const slug = params?.slug as string;
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const router = useRouter();
  const { user, role } = useAuth();
  const { addToCart } = useCart();
  const { currency } = useCurrency();

  const [isAdding, setIsAdding] = useState(false);
  const [showViewCart, setShowViewCart] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [suggestedProducts, setSuggestedProducts] = useState<SuggestedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New state for variants
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  // Get wishlist functionality from our hook
  const {
    isInWishlist,
    toggleWishlist,
    wishlistAuthModalOpen,
    setWishlistAuthModalOpen,
    pendingWishlistItem
  } = useWishlist();

  const isWishlisted = product ? isInWishlist(product.id) : false;

  // Check if product has variants
  const hasVariants = product?.variants && product.variants.length > 0;

  // Get selected variant
  const selectedVariant = hasVariants
    ? product?.variants?.find(v => v.color === selectedColor)
    : null;

  // Get max available stock for selected variant or product
  const maxStock = selectedVariant 
    ? selectedVariant.stock 
    : hasVariants 
      ? 0 
      : (product?.is_marketplace && product?.stock_quantity !== undefined)
        ? product.stock_quantity
        : 999;

  // Check if product is in stock (considering variants)
  const isInStock = hasVariants
    ? selectedVariant ? selectedVariant.stock > 0 : false
    : product?.is_marketplace
      ? (product?.stock_quantity || 0) > 0
      : product?.in_stock || false;

  // Fetch product data from Supabase
  useEffect(() => {
    const fetchProduct = async () => {
      setIsLoading(true);
      try {
        if (!slug) return;

        // Check if this is a marketplace product (slug format: marketplace-{id})
        const isMarketplace = slug.startsWith('marketplace-');
        let productData: Product | null = null;

        if (isMarketplace) {
          // Fetch marketplace product
          const marketplaceId = slug.replace('marketplace-', '');
          const { data, error } = await supabase
            .from('marketplace_products' as any)
            .select(`
              *,
              business_listings!inner (
                id,
                name,
                slug,
                refund_policy
              )
            `)
            .eq('id', marketplaceId)
            .gt('stock_quantity', 0)
            .single() as { data: Product | null; error: any };

          if (error || !data) {
            console.error('Error fetching marketplace product:', error);
            toast({
              title: "Product Not Available",
              description: "This product is currently out of stock or no longer available.",
              variant: "destructive",
            });
            return;
          }
          
          // Double check stock
          if ((data.stock_quantity || 0) === 0) {
            toast({
              title: "Product Out of Stock",
              description: "This product is currently out of stock.",
              variant: "destructive",
            });
            return;
          }

          const product = data as any;
          productData = {
            id: product.id,
            name: product.name,
            slug: slug,
            description: product.full_description || product.short_description || product.description || '',
            price: Number(product.sale_price || product.price),
            valued_at: product.sale_price ? Number(product.price) : undefined,
            image_url: (product.images && Array.isArray(product.images) && product.images[0]) || product.image_url,
            images: product.images && Array.isArray(product.images) ? product.images : (product.image_url ? [product.image_url] : []),
            in_stock: (product.stock_quantity || 0) > 0,
            is_marketplace: true,
            business_id: product.business_id,
            business_name: product.business_listings?.name,
            business_slug: product.business_listings?.slug,
            business_refund_policy: product.business_listings?.refund_policy,
            shipping_cost: product.shipping_cost || 0,
            shipping_required: product.shipping_required || false,
            stock_quantity: product.stock_quantity || 0,
            created_at: product.created_at,
            updated_at: product.updated_at,
          };
        } else {
          // Fetch admin product
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('slug', slug)
            .single();

          if (error) {
            console.error('Error fetching product:', error);
            return;
          }

          // Parse the variants and create the product object with proper typing
          const parsedVariants = parseVariants(data.variants);
          productData = {
            ...data,
            variants: parsedVariants,
            valued_at: data.valued_at ?? undefined,
            images: data.images ?? undefined,
            badge: data.badge ?? undefined,
            free_shipping: data.free_shipping ?? undefined,
            is_marketplace: false,
          };

          // Set default color if product has variants
          if (parsedVariants && parsedVariants.length > 0) {
            const firstAvailableVariant = parsedVariants.find((v: Variant) => v.stock > 0);
            if (firstAvailableVariant) {
              setSelectedColor(firstAvailableVariant.color);
            } else {
              setSelectedColor(parsedVariants[0].color);
            }
          }
        }

        if (productData) {
          setProduct(productData);

          // Fetch suggested products (excluding current product)
          // Fetch both admin and marketplace products
          const { data: adminProducts } = await supabase
            .from('products')
            .select('*')
            .neq('id', productData.id)
            .limit(3);

          const { data: marketplaceProducts } = await supabase
            .from('marketplace_products' as any)
            .select(`
              *,
              business_listings!inner (
                id,
                name,
                slug
              )
            `)
            .eq('admin_approved', true)
            .eq('is_active', true)
            .gt('stock_quantity', 0)
            .neq('id', productData.is_marketplace ? productData.id : '')
            .limit(3);

          const suggested: SuggestedProduct[] = [];

          if (adminProducts) {
            suggested.push(...adminProducts.map(item => ({
              id: item.id,
              name: item.name,
              price: Number(item.price),
              valued_at: item.valued_at ?? undefined,
              image_url: item.image_url,
              slug: item.slug,
              badge: item.badge ?? undefined,
              in_stock: item.in_stock,
            })));
          }

          if (marketplaceProducts) {
            suggested.push(...marketplaceProducts.map((item: any) => ({
              id: item.id,
              name: item.name,
              price: Number(item.price),
              image_url: item.image_url,
              slug: `marketplace-${item.id}`,
              in_stock: true,
            })));
          }

          setSuggestedProducts(suggested.slice(0, 3));
        }
      } catch (error) {
        console.error('Error in product fetch:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  // Reset quantity and selected image when color changes
  useEffect(() => {
    setQuantity(1);
    setSelectedImage(0); // Reset to first image when color changes
  }, [selectedColor]);

  const handleAddToCart = () => {
    if (!product) return;

    // Check if user is logged in
    if (!user) {
      setWishlistAuthModalOpen(true);
      return;
    }

    if (hasVariants && !selectedColor) {
      toast({
        title: "Please select a color",
        description: "Choose a color variant before adding to cart.",
        variant: "destructive",
      });
      return;
    }

    // Validate quantity doesn't exceed available stock
    if (quantity > maxStock) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${maxStock} items available in stock.`,
        variant: "destructive",
      });
      setQuantity(maxStock);
      return;
    }

    setIsAdding(true);

    // Get variant-specific image URL
    const getVariantImage = (): string => {
      if (!hasVariants || !selectedColor) {
        return product.image_url || '/placeholder.svg';
      }

      // For Puppy Starter Kit, use specific variant image URLs
      if (product.slug?.includes('puppy-starter-kit')) {
        if (selectedColor.toLowerCase() === 'pink') {
          return "https://sehzakutrlropprdcewu.supabase.co/storage/v1/object/public/dog-quest-shop/Puppy Starter Kit Pink/puppy_starter_kit_pink.png";
        } else if (selectedColor.toLowerCase() === 'blue') {
          return "https://sehzakutrlropprdcewu.supabase.co/storage/v1/object/public/dog-quest-shop/Puppy Starter Kit Blue/puppy_starter_kit_blue.png";
        }
      }

      // Fallback to default image
      return product.image_url || '/placeholder.svg';
    };

    // Create cart item with variant info
    const cartItem = {
      id: hasVariants ? `${product.id}-${selectedColor}` : product.id,
      title: hasVariants ? `${product.name} (${selectedColor})` : product.name,
      price: product.price,
      image: getVariantImage(),
      slug: product.slug,
      // Include marketplace fields if applicable
      is_marketplace: product.is_marketplace,
      business_id: product.business_id,
      shipping_cost: product.shipping_cost,
      shipping_required: product.shipping_required,
    };

    // Add items with quantity in one call - this will show only one toast
    addToCart(cartItem, quantity);

    // Show the view cart button
    setShowViewCart(true);

    // Reset button state after animation
    setTimeout(() => setIsAdding(false), 1500);
  };

  const handleWaitlist = (e: React.FormEvent) => {
    e.preventDefault();

    if (!notifyEmail) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    const itemName = hasVariants && selectedColor
      ? `${product?.name} (${selectedColor})`
      : product?.name;

    toast({
      title: "Added to waitlist",
      description: `We'll notify you when ${itemName} is back in stock.`,
      duration: 3000,
    });

    setNotifyEmail('');
  };

  // Create an array of MediaItem from product.images or fallback to product.image_url
  // Filter images when color variant is selected
  const productImages: MediaItem[] = React.useMemo(() => {
    if (!product) return ['/placeholder.svg' as MediaItem];

    // If product has variants and a color is selected, use color-specific images
    const hasVariants = product?.variants && product.variants.length > 0;
    if (hasVariants && selectedColor && product.slug?.includes('puppy-starter-kit')) {
      const colorLower = selectedColor.toLowerCase();
      const baseUrl = "https://sehzakutrlropprdcewu.supabase.co/storage/v1/object/public/dog-quest-shop";
      
      if (colorLower === 'pink') {
        // Return all pink images
        const pinkImages = [
          `${baseUrl}/Puppy Starter Kit Pink/puppy_starter_kit_pink.png`,
          `${baseUrl}/Puppy Starter Kit Pink/Pink Ball.jpg`,
          `${baseUrl}/Puppy Starter Kit Pink/Pink Blanket.jpg`,
          `${baseUrl}/Puppy Starter Kit Pink/Pink Bow Tie.jpg`,
          `${baseUrl}/Puppy Starter Kit Pink/Pink Bowl.jpg`,
          `${baseUrl}/Puppy Starter Kit Pink/Pink Capsul.jpg`,
          `${baseUrl}/Puppy Starter Kit Pink/Pink Flat.jpg`,
          `${baseUrl}/Puppy Starter Kit Pink/Pink Glove.jpg`,
          `${baseUrl}/Puppy Starter Kit Pink/Pink Manicure.jpg`,
          `${baseUrl}/Puppy Starter Kit Pink/Pink Rope.jpg`,
          `${baseUrl}/Puppy Starter Kit Pink/Pink Teddy.jpg`,
        ];
        return pinkImages.map(img => img as MediaItem);
      } else if (colorLower === 'blue') {
        // Return all blue images
        const blueImages = [
          `${baseUrl}/Puppy Starter Kit Blue/puppy_starter_kit_blue.png`,
          `${baseUrl}/Puppy Starter Kit Blue/Blue Ball.jpg`,
          `${baseUrl}/Puppy Starter Kit Blue/Blue Blanket.jpg`,
          `${baseUrl}/Puppy Starter Kit Blue/Blue Bow Tie.jpg`,
          `${baseUrl}/Puppy Starter Kit Blue/Blue Bowl.jpg`,
          `${baseUrl}/Puppy Starter Kit Blue/Blue Capsul.jpg`,
          `${baseUrl}/Puppy Starter Kit Blue/Blue Flat.jpg`,
          `${baseUrl}/Puppy Starter Kit Blue/Blue Glove.jpg`,
          `${baseUrl}/Puppy Starter Kit Blue/Blue Manicure.jpg`,
          `${baseUrl}/Puppy Starter Kit Blue/Blue Rope.jpg`,
          `${baseUrl}/Puppy Starter Kit Blue/Blue Teddy.jpg`,
        ];
        return blueImages.map(img => img as MediaItem);
      }
    }

    // Get all available images from product
    let allImages: string[] = [];
    if (product.images?.length) {
      allImages = product.images;
    } else if (product.image_url) {
      allImages = [product.image_url];
    } else {
      return ['/placeholder.svg' as MediaItem];
    }

    // Return all images
    return allImages.map(img => img as MediaItem);
  }, [product, selectedColor]);

  // Determine dynamic badge text
  const displayBadge = React.useMemo(() => {
    if (product?.slug?.includes('puppy-starter-kit') && selectedColor) {
      const colorLower = selectedColor.toLowerCase();
      if (colorLower === 'blue') {
        return "Also Available in Pink";
      } else if (colorLower === 'pink') {
        return "Also Available in Blue";
      }
    }
    return product?.badge;
  }, [product, selectedColor]);

  const handleWishlistToggle = () => {
    if (!product) return;

    // Use the toggleWishlist function with the correct 'product' type for shop items
    toggleWishlist(product.id, 'product');
  };

  // Framer Motion animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      }
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-20 px-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-soft-green"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto py-20 px-4 text-center">
        <h1 className="text-3xl font-berkshire text-brand-dark-green mb-4">Product Not Found</h1>
        <p className="mb-8">We couldn't find the product you're looking for.</p>
        <Button
          onClick={() => router.push("/shop")}
          variant="outline"
          className="border-brand-soft-green text-brand-dark-green hover:bg-brand-light-green"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Shop
        </Button>
      </div>
    );
  }

  // Component for suggested product cards
  const SuggestedProductCard = ({ product }: { product: SuggestedProduct }) => {
    // Determine dynamic badge for Puppy Starter Kit based on image URL
    const getDynamicBadge = () => {
      if (product.slug?.includes('puppy-starter-kit') && product.image_url) {
        const imageLower = product.image_url.toLowerCase();
        if (imageLower.includes('pink')) {
          return "Also Available in Blue";
        } else if (imageLower.includes('blue')) {
          return "Also Available in Pink";
        }
      }
      return product.badge;
    };

    const displayBadge = getDynamicBadge();

    return (
      <Card className="h-full overflow-hidden border border-gray-100 transition-all duration-200 hover:shadow-md hover:border-brand-light-green">
        <div className="relative overflow-hidden">
          {/* Product image */}
          <div className="aspect-square overflow-hidden bg-gray-100">
            <img
              src={product.image_url || '/placeholder.svg'}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            />
          </div>

          {/* Badge (if any) */}
          {displayBadge && (
            <Badge className={`absolute top-3 left-3 ${getBadgeStyle(displayBadge)}`}>
              {displayBadge}
            </Badge>
          )}

          {/* Stock status badge */}
          <Badge
            variant="outline"
            className={`absolute top-3 right-3 ${product.in_stock ? 'bg-green-700 text-white border-green-200' : 'bg-red-600 text-white border-red-200'}`}
          >
            {product.in_stock ? 'In Stock' : 'Out of Stock'}
          </Badge>
        </div>

        <CardContent className="p-4">
          <h3 className="text-base font-semibold text-brand-dark-green mb-1 line-clamp-2 h-12">
            {product.name}
          </h3>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {(() => {
              const isPuppyStarterKit = product.slug?.includes('puppy-starter-kit');
              const isCollar = product.name?.toLowerCase().includes('collar') || product.slug?.toLowerCase().includes('collar');
              const originalPrice = isPuppyStarterKit ? 129.99 : isCollar ? 15.99 : product.originalPrice;
              
              if (originalPrice) {
                return (
                  <>
                    <span className="text-lg font-semibold text-brand-dark-green">
                      {formatPrice(Number(product.price), currency)}
                    </span>
                    <span className="text-sm text-pink-500 line-through">
                      {formatPrice(originalPrice, currency)}
                    </span>
                  </>
                );
              }
              
              return (
                <span className="text-lg font-semibold text-brand-dark-green">
                  {formatPrice(Number(product.price), currency)}
                </span>
              );
            })()}
          </div>

          <Button
            className="w-full mt-3 bg-brand-soft-green hover:bg-brand-dark-green text-white transition-all duration-300"
            variant="default"
            size="sm"
            onClick={() => router.push(`/shop/${product.slug}`)}
          >
            View Product
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <>

      {/* Include WishlistAuthModal component */}
      <WishlistAuthModal
        open={wishlistAuthModalOpen}
        onOpenChange={setWishlistAuthModalOpen}
        itemToSave={pendingWishlistItem ?? undefined}
      />

      <section className="py-8 md:py-12 bg-white overflow-x-hidden">
        <div className="container mx-auto px-4 max-w-full">
          {/* Breadcrumb-like Back button */}
          <div className="mb-6">
            <Button
              onClick={() => router.push("/shop")}
              variant="link"
              className="pl-0 text-brand-dark-green hover:text-brand-soft-green font-medium"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Shop
            </Button>
          </div>

          <motion.div
            className="grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Left Column - Image Gallery */}
            <motion.div variants={itemVariants} className="relative w-full max-w-full overflow-hidden">
              {/* Custom responsive slider for Puppy Starter Kit */}
              {product?.slug?.includes('puppy-starter-kit') && hasVariants && selectedColor ? (
                <div className="space-y-3 sm:space-y-4 w-full max-w-full">
                  {/* Main image slider - Full carousel on mobile, single image on desktop */}
                  <div className="relative w-full max-w-full">
                    {/* Mobile: Full carousel slider */}
                    <div className="sm:hidden w-full max-w-full overflow-hidden">
                      <Carousel
                        opts={{
                          align: 'start',
                          loop: true,
                          dragFree: false,
                          skipSnaps: false,
                        }}
                        className="w-full max-w-full"
                        setApi={(api) => {
                          if (api) {
                            api.on('select', () => {
                              setSelectedImage(api.selectedScrollSnap());
                            });
                            // Set initial slide
                            api.scrollTo(selectedImage);
                          }
                        }}
                      >
                        <CarouselContent className="-ml-0">
                          {productImages.map((img, index) => (
                            <CarouselItem key={index} className="pl-0 basis-full">
                              <div className="relative w-full rounded-xl overflow-hidden bg-gray-100 border-2 border-gray-200 shadow-lg" style={{ aspectRatio: '1/1' }}>
                                <img
                                  src={img as string}
                                  alt={`${product.name} - ${selectedColor} - Image ${index + 1}`}
                                  className="w-full h-full object-contain select-none bg-white"
                                  draggable={false}
                                  loading={index === 0 ? 'eager' : 'lazy'}
                                />
                                  
                                  {/* Badge */}
                                  {displayBadge && (
                                    <Badge className={`absolute top-2 left-2 z-10 text-xs px-2 py-0.5 ${getBadgeStyle(displayBadge)}`}>
                                      {displayBadge}
                                    </Badge>
                                  )}
                                  
                                  {/* Wishlist button */}
                                  <button
                                    onClick={handleWishlistToggle}
                                    className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/95 hover:bg-white shadow-lg transition-all duration-200 active:scale-95"
                                    aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                                  >
                                    <Heart
                                      className={`h-4 w-4 transition-colors ${
                                        isWishlisted ? "fill-red-500 text-red-500" : "text-gray-600"
                                      }`}
                                    />
                                  </button>

                                  {/* Image counter */}
                                  <div className="absolute bottom-2 right-2 z-10 px-2 py-0.5 rounded-full bg-black/60 text-white text-xs font-medium">
                                    {index + 1} / {productImages.length}
                                  </div>
                              </div>
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        <CarouselPrevious className="left-1 h-7 w-7 bg-white/90 hover:bg-white" />
                        <CarouselNext className="right-1 h-7 w-7 bg-white/90 hover:bg-white" />
                      </Carousel>
                    </div>

                    {/* Desktop: Single image with navigation */}
                    <div className="hidden sm:block">
                      <div
                        className="relative w-full rounded-xl overflow-hidden bg-gray-100 border-2 border-gray-200 shadow-lg group"
                        style={{ aspectRatio: '1/1' }}
                      >
                        <img
                          src={productImages[selectedImage] as string}
                          alt={`${product.name} - ${selectedColor} - Image ${selectedImage + 1}`}
                          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105 select-none block bg-white"
                          draggable={false}
                        />
                        
                        {/* Badge */}
                        {displayBadge && (
                          <Badge className={`absolute top-4 left-4 z-10 text-sm px-3 py-1 ${getBadgeStyle(displayBadge)}`}>
                            {displayBadge}
                          </Badge>
                        )}
                        
                        {/* Wishlist button */}
                        <button
                          onClick={handleWishlistToggle}
                          className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-white/95 hover:bg-white shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
                          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                        >
                          <Heart
                            className={`h-5 w-5 transition-colors ${
                              isWishlisted ? "fill-red-500 text-red-500" : "text-gray-600"
                            }`}
                          />
                        </button>

                        {/* Navigation arrows */}
                        {productImages.length > 1 && (
                          <>
                            <button
                              onClick={() => setSelectedImage((prev) => (prev === 0 ? productImages.length - 1 : prev - 1))}
                              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/95 hover:bg-white shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
                              aria-label="Previous image"
                            >
                              <ArrowLeft className="h-5 w-5 text-gray-700" />
                            </button>
                            <button
                              onClick={() => setSelectedImage((prev) => (prev === productImages.length - 1 ? 0 : prev + 1))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/95 hover:bg-white shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
                              aria-label="Next image"
                            >
                              <ArrowLeft className="h-5 w-5 text-gray-700 rotate-180" />
                            </button>
                          </>
                        )}

                        {/* Image counter */}
                        {productImages.length > 1 && (
                          <div className="absolute bottom-4 right-4 z-10 px-3 py-1 rounded-full bg-black/50 text-white text-sm font-medium">
                            {selectedImage + 1} / {productImages.length}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Thumbnail slider - Responsive grid */}
                  <div className="relative w-full">
                    <div className="flex gap-1.5 sm:gap-2 md:gap-3 overflow-x-auto overflow-y-visible scrollbar-hide pt-1 sm:pt-2 pb-2 snap-x snap-mandatory scroll-smooth -mx-1 sm:mx-0 px-1 sm:px-0">
                      {productImages.map((img, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setSelectedImage(index);
                            // Scroll thumbnail into view on mobile
                            if (typeof window !== 'undefined' && window.innerWidth < 640) {
                              const element = document.getElementById(`thumb-${index}`);
                              element?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                            }
                          }}
                          id={`thumb-${index}`}
                          className={`flex-shrink-0 relative rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                            selectedImage === index
                              ? 'border-brand-soft-green ring-2 ring-inset ring-brand-soft-green'
                              : 'border-gray-200 active:border-brand-light-green opacity-70 active:opacity-100'
                          }`}
                          style={{ 
                            width: 'calc(20% - 4px)', 
                            minWidth: '55px',
                            maxWidth: '75px',
                            aspectRatio: '1/1'
                          }}
                        >
                          <img
                            src={img as string}
                            alt={`${product.name} - ${selectedColor} - Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                            draggable={false}
                            loading="lazy"
                          />
                          {selectedImage === index && (
                            <div className="absolute inset-0 bg-brand-soft-green/30" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <ListingCarouselSection
                    title={product?.name || ''}
                    images={productImages}
                    isWishListed={isWishlisted}
                    onWishlistToggle={handleWishlistToggle}
                    itemType="showcase"
                  />
                  {/* Badge (if any) */}
                  {displayBadge && (
                    <Badge className={`absolute top-4 left-4 ${getBadgeStyle(displayBadge)}`}>
                      {displayBadge}
                    </Badge>
                  )}
                </>
              )}
            </motion.div>

            {/* Right Column - Product Details */}
            <motion.div variants={itemVariants} className="flex flex-col">
              {/* Stock status and badges */}
              <div className="mb-2 flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className={`${isInStock ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}
                >
                  {isInStock ? 'In Stock' : 'Out of Stock'}
                </Badge>

                {/* Shipping badge - Show business shipping or DogQuest free shipping */}
                {(() => {
                  if (product?.is_marketplace) {
                    const shippingCost = product.shipping_cost || 0;
                    const shippingRequired = product.shipping_required !== false;
                    if (!shippingRequired || shippingCost === 0) {
                      return (
                        <Badge className="bg-green-500 text-white">
                          Free Shipping
                        </Badge>
                      );
                    } else {
                      // Show shipping cost badge
                      return (
                        <Badge className="bg-gray-200 text-gray-800">
                          Shipping: {formatPrice(shippingCost, currency)}
                        </Badge>
                      );
                    }
                  } else {
                    // DogQuest products
                    const isCollar = product?.name?.toLowerCase().includes('collar') || product?.slug?.toLowerCase().includes('collar');
                    if (product?.free_shipping && !isCollar) {
                      return (
                        <Badge className="bg-green-500 text-white">
                          Free Shipping
                        </Badge>
                      );
                    } else if (isCollar) {
                      return (
                        <Badge className="bg-gray-200 text-gray-800">
                          Shipping: {formatPrice(5, currency)}
                        </Badge>
                      );
                    }
                  }
                  return null;
                })()}
              </div>

              {/* Product name - Smaller on mobile */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-berkshire text-brand-soft-green mb-2">
                {product?.name || 'Loading...'}
              </h1>

              {/* Product By section */}
              <div className="flex items-center gap-2 mb-4">
                <p className="text-sm text-muted-foreground">
                  {product?.is_marketplace 
                    ? `By ${product.business_name || 'Business'}` 
                    : 'Product By DogQuest'}
                </p>
                {product?.is_marketplace && product.business_slug && (
                  <Link
                    href={`/services/${product.business_slug}`}
                    className="flex items-center gap-1 text-sm text-brand-dark-green hover:text-brand-soft-green transition-colors"
                  >
                    <span>Show Store</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>

              {/* Price */}
              <div className="flex items-end gap-2 mb-4 flex-wrap">
                {(() => {
                  const isPuppyStarterKit = product?.slug?.includes('puppy-starter-kit');
                  const isCollar = product?.name?.toLowerCase().includes('collar') || product?.slug?.toLowerCase().includes('collar');
                  const originalPrice = isPuppyStarterKit ? 129.99 : isCollar ? 15.99 : null;
                  
                  if (originalPrice && product) {
                    return (
                      <>
                        <span className="text-2xl sm:text-3xl font-semibold text-brand-dark-green">
                          {formatPrice(Number(product.price), currency)}
                        </span>
                        <span className="text-xl sm:text-2xl text-pink-500 line-through">
                          {formatPrice(originalPrice, currency)}
                        </span>
                      </>
                    );
                  }
                  
                  return (
                    <span className="text-2xl sm:text-3xl font-semibold text-brand-dark-green">
                      {product ? formatPrice(Number(product.price), currency) : formatPrice(0, currency)}
                    </span>
                  );
                })()}
              </div>

              {/* Color Selection - Only show if product has variants */}
              {hasVariants && product.variants && (
                <div className="mb-6">
                  <ColorSelector
                    variants={product.variants}
                    selectedColor={selectedColor}
                    onColorChange={setSelectedColor}
                  />
                </div>
              )}

              {/* Quantity Selection - Only show if product is in stock */}
              {isInStock && (
                <div className="mb-6">
                  <QuantitySelector
                    quantity={quantity}
                    onQuantityChange={setQuantity}
                    maxQuantity={maxStock}
                    disabled={!isInStock}
                  />
                </div>
              )}

              {/* Add to Cart / Waitlist */}
              {isInStock ? (
                <div className="space-y-4">
                  <motion.div
                    initial={{ scale: 1 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative"
                  >
                    <Button
                      className={`
                        w-full h-14 px-8 
                        bg-gradient-to-r from-brand-soft-green to-brand-dark-green 
                        hover:from-brand-dark-green hover:to-brand-soft-green 
                        text-white text-lg font-semibold
                        rounded-xl shadow-lg hover:shadow-xl
                        transition-all duration-300 ease-out
                        transform hover:-translate-y-0.5
                        border-0 relative overflow-hidden
                        ${isAdding ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : ''}
                      `}
                      onClick={handleAddToCart}
                      disabled={isAdding || !isInStock || (hasVariants && !selectedColor) || (product?.stock_quantity !== undefined && product.stock_quantity <= 0)}
                    >
                      <div className="flex items-center justify-center gap-3">
                        {isAdding ? (
                          <>
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Check className="h-6 w-6" />
                            </motion.div>
                            <motion.span
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.2 }}
                            >
                              Added to Cart!
                            </motion.span>
                          </>
                        ) : !isInStock || (product?.stock_quantity !== undefined && product.stock_quantity <= 0) ? (
                          <span>Out of Stock</span>
                        ) : (
                          <>
                            <Plus className="h-6 w-6 transition-transform group-hover:rotate-90 duration-300" />
                            <span>Add to Cart</span>
                            <ShoppingCart className="h-5 w-5" />
                          </>
                        )}
                      </div>

                      {/* Animated background effect */}
                      {!isAdding && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
                      )}
                    </Button>
                  </motion.div>

                  {showViewCart && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Button
                        variant="outline"
                        className="w-full h-12 border-2 border-brand-soft-green text-brand-dark-green hover:bg-brand-light-green hover:border-brand-dark-green font-medium rounded-xl transition-all duration-300"
                        onClick={() => router.push('/cart')}
                      >
                        <ShoppingBag className="mr-2 h-5 w-5" />
                        View Cart & Checkout
                      </Button>
                    </motion.div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleWaitlist} className="p-4 bg-[#E1E8E0] space-y-3 w-full">
                  <p className="text-gray-600 italic text-xs sm:text-sm">
                    This item is currently out of stock. Enter your email to be notified when it's available.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <Input
                      type="email"
                      placeholder="Your email address"
                      value={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.value)}
                      className="flex-grow"
                      aria-label="Email for waitlist notification"
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      className="border-brand-soft-green text-brand-dark-green hover:bg-brand-light-green sm:whitespace-nowrap"
                    >
                      <Mail className="mr-2 h-5 w-5" />
                      Notify Me
                    </Button>
                  </div>
                </form>
              )}

              {/* Description - Render with paragraph breaks */}
              <div className="mt-6 text-gray-700 mb-6 text-sm sm:text-base">
                {product.description && product.description.split('\n').map((paragraph, index) => (
                  paragraph.trim() ? (
                    <p key={index} className="mb-2">{paragraph}</p>
                  ) : (
                    <br key={index} />
                  )
                ))}
              </div>

              {/* Delivery & Returns Accordion */}
              <div className="mt-8 sm:mt-12">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="shipping" className="border-t border-b">
                    <AccordionTrigger className="text-brand-dark-green hover:text-brand-soft-green text-sm sm:text-base py-3">
                      Shipping Information
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-gray-600 text-xs sm:text-sm">
                        {(() => {
                          // For marketplace products, use business shipping
                          if (product?.is_marketplace) {
                            const shippingCost = product.shipping_cost || 0;
                            const shippingRequired = product.shipping_required !== false;
                            if (!shippingRequired || shippingCost === 0) {
                              return "FREE SHIPPING! Orders are typically shipped within 1-2 business days. Standard delivery within Ireland takes 2-3 business days.";
                            } else {
                              return `${formatPrice(shippingCost, currency)} shipping fee applies. Orders are typically shipped within 1-2 business days. Standard delivery within Ireland takes 2-3 business days.`;
                            }
                          }
                          // For DogQuest products, use existing logic
                          const isCollar = product?.name?.toLowerCase().includes('collar') || product?.slug?.toLowerCase().includes('collar');
                          if (isCollar) {
                            return `${formatPrice(5, currency)} shipping fee applies. Orders are typically shipped within 1-2 business days. Standard delivery within Ireland takes 2-3 business days.`;
                          } else if (product?.free_shipping) {
                            return "FREE SHIPPING! Orders are typically shipped within 1-2 business days. Standard delivery within Ireland takes 2-3 business days.";
                          } else {
                            return "Orders are typically shipped within 1-2 business days. Standard delivery within Ireland takes 2-3 business days.";
                          }
                        })()}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  {/* Only show Returns & Refunds if there's a refund policy (marketplace) or always for DogQuest */}
                  {(() => {
                    // For marketplace products, only show if there's a non-empty refund policy
                    if (product?.is_marketplace) {
                      const refundPolicy = product?.business_refund_policy;
                      return refundPolicy && typeof refundPolicy === 'string' && refundPolicy.trim().length > 0;
                    }
                    // For DogQuest products, always show
                    return true;
                  })() && (
                    <AccordionItem value="returns" className="border-b">
                      <AccordionTrigger className="text-brand-dark-green hover:text-brand-soft-green text-sm sm:text-base py-3">
                        Returns & Refunds
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-gray-600 text-xs sm:text-sm">
                          {product?.is_marketplace && product?.business_refund_policy
                            ? product.business_refund_policy
                            : "We offer a 30-day return policy for unused items in original packaging. Contact our customer service team to initiate a return. Refunds are typically processed within 5-7 business days after we receive the returned item."}
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </div>
            </motion.div>
          </motion.div>

          {/* Suggested Products Section */}
          {suggestedProducts.length > 0 && (
            <motion.div
              className="mt-12 sm:mt-16"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.h2
                variants={itemVariants}
                className="text-xl sm:text-2xl md:text-3xl font-berkshire text-brand-dark-green mb-4 sm:mb-6 text-center"
              >
                You Might Also Like
              </motion.h2>

              {isMobile ? (
                <Carousel
                  opts={{
                    align: 'start',
                    loop: true,
                    dragFree: true,
                  }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-4">
                    {suggestedProducts.map(product => (
                      <CarouselItem key={product.id} className="pl-4 basis-[85%] sm:basis-[70%] md:basis-[40%]">
                        <motion.div variants={itemVariants}>
                          <SuggestedProductCard product={product} />
                        </motion.div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <div className="flex justify-center gap-2 mt-4">
                    <CarouselPrevious className="relative static" />
                    <CarouselNext className="relative static" />
                  </div>
                </Carousel>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                  {suggestedProducts.map(product => (
                    <motion.div key={product.id} variants={itemVariants}>
                      <SuggestedProductCard product={product} />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </section>

      {/* Add the Navigation Section with shop variant */}
      <NavigationSection variant="shop" />
    </>
  );
};

export default ProductDetail;
