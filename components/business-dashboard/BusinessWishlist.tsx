
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWishlist } from "@/hooks/use-wishlist";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SavedQuizResults from "@/components/shared/SavedQuizResults";
import { ContactSellerModal } from "@/components/messaging/ContactSellerModal";

interface WishlistItem {
  id: string;
  title: string;
  price: string | null;
  image: string;
  breed: string;
  location: string;
  status: string;
  type: "showcase" | "listing" | "stud" | "product" | "service";
  slug?: string;
  seller_id?: string;
}

// Utility function to capitalize first letter of each word
const capitalizeWords = (text: string): string => {
  if (!text) return text;
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Utility function to capitalize breed names (handles 'x' separator for crossbreeds)
const capitalizeBreed = (breed: string): string => {
  if (!breed) return breed;
  return breed
    .split(' x ')
    .map(part => capitalizeWords(part))
    .join(' x ');
};

export const BusinessWishlist = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [activeTab, setActiveTab] = useState("wishlist");
  const [contactModal, setContactModal] = useState<{
    isOpen: boolean;
    sellerId: string;
    listingId: string;
    listingType: string;
    listingTitle: string;
  }>({
    isOpen: false,
    sellerId: '',
    listingId: '',
    listingType: '',
    listingTitle: ''
  });
  
  const { removeFromWishlist } = useWishlist({
    onWishlistChange: () => fetchWishlistItems()
  });

  const fetchWishlistItems = useCallback(async () => {
    if (!user) {
      setWishlistItems([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const { data: wishlistData, error: wishlistError } = await supabase
        .from('user_wishlists')
        .select('*')
        .eq('user_id', user.id);
      
      if (wishlistError) throw wishlistError;
      
      if (!wishlistData || wishlistData.length === 0) {
        setWishlistItems([]);
        setIsLoading(false);
        return;
      }

      const wishlistDetailsPromises = wishlistData.map(async (item) => {
        let itemDetails;
        
        if (item.item_type === 'showcase') {
          const { data } = await supabase
            .from('showcase_listings')
            .select('*')
            .eq('id', item.item_id)
            .single();
          
          if (data) {
            let image = 'https://images.unsplash.com/photo-1605897472359-85e4b94d685d';
            
            if (data.images) {
              try {
                if (Array.isArray(data.images) && data.images.length > 0) {
                  const primaryIndex = data.primary_image_index || 0;
                  if (data.images[primaryIndex]) {
                    image = String(data.images[primaryIndex]);
                  }
                } else if (typeof data.images === 'string') {
                  image = data.images;
                }
              } catch (e) {
                console.error("Error processing image:", e);
              }
            }

            return {
              id: item.item_id,
              title: data.title || 'Showcase Dog',
              price: null,
              image,
              breed: capitalizeBreed(data.breed) || 'Unknown Breed',
              location: capitalizeWords(data.location) || 'Unknown Location',
              status: data.status || 'available',
              type: 'showcase' as const,
              seller_id: data.seller_id
            };
          }
        } 
        else if (item.item_type === 'listing') {
          const { data } = await supabase
            .from('sale_listings')
            .select('*')
            .eq('id', item.item_id)
            .single();
          
          if (data) {
            let image = 'https://images.unsplash.com/photo-1605897472359-85e4b94d685d';
            
            if (data.images && Array.isArray(data.images) && data.images.length > 0) {
              try {
                const primaryIndex = data.primary_image_index || 0;
                if (data.images[primaryIndex]) {
                  image = String(data.images[primaryIndex]);
                } else {
                  image = String(data.images[0]);
                }
              } catch (e) {
                console.error("Error processing sale listing image:", e);
              }
            }

            let breedDisplay = 'Unknown Breed';
            if (data.breed_type === 'crossbreed' && data.breed_1 && data.breed_2) {
              breedDisplay = `${capitalizeWords(data.breed_1)} x ${capitalizeWords(data.breed_2)}`;
            } else if (data.breed) {
              breedDisplay = capitalizeWords(data.breed);
            } else if (data.breed_1) {
              breedDisplay = capitalizeWords(data.breed_1);
            }

            let priceDisplay = '';
            if (data.price) {
              priceDisplay = `€${Number(data.price).toFixed(2)}`;
            } else if (data.min_price && data.max_price) {
              priceDisplay = `€${Number(data.min_price).toFixed(2)} - €${Number(data.max_price).toFixed(2)}`;
            } else if (data.min_price) {
              priceDisplay = `From €${Number(data.min_price).toFixed(2)}`;
            }

            return {
              id: item.item_id,
              title: data.title || 'Dog for Sale',
              price: priceDisplay,
              image,
              breed: capitalizeBreed(breedDisplay),
              location: capitalizeWords(data.location) || 'Unknown Location',
              status: data.status || 'available',
              type: 'listing' as const,
              seller_id: data.seller_id
            };
          }
        }
        else if (item.item_type === 'stud') {
          const { data } = await supabase
            .from('stud_listings')
            .select('*')
            .eq('id', item.item_id)
            .single();
          
          if (data) {
            let image = 'https://images.unsplash.com/photo-1605897472359-85e4b94d685d';
            
            if (data.images) {
              try {
                if (Array.isArray(data.images) && data.images.length > 0) {
                  image = String(data.images[0]);
                } else if (typeof data.images === 'string') {
                  image = data.images;
                }
              } catch (e) {
                console.error("Error processing stud listing image:", e);
              }
            }

            let breedDisplay = 'Unknown Breed';
            if (data.breed_type === 'crossbreed' && data.breed1 && data.breed2) {
              breedDisplay = `${capitalizeWords(data.breed1)} x ${capitalizeWords(data.breed2)}`;
            } else if (data.breed1) {
              breedDisplay = capitalizeWords(data.breed1);
            } else if (data.crossbreed_breeds && Array.isArray(data.crossbreed_breeds) && data.crossbreed_breeds.length > 0) {
              breedDisplay = data.crossbreed_breeds.map(breed => capitalizeWords(breed)).join(' x ');
            }

            return {
              id: item.item_id,
              title: data.title || 'Stud Service',
              price: `€${Number(data.stud_fee).toFixed(2)}`,
              image,
              breed: capitalizeBreed(breedDisplay),
              location: capitalizeWords(data.location) || 'Unknown Location',
              status: 'available',
              type: 'stud' as const,
              seller_id: data.user_id
            };
          }
        }
        else if (item.item_type === 'product') {
          // First try products table (admin products)
          let { data } = await supabase
            .from('products')
            .select('*')
            .eq('id', item.item_id)
            .single();
          
          if (data) {
            return {
              id: item.item_id,
              title: data.name || 'Product',
              price: `€${Number(data.price).toFixed(2)}`,
              image: data.image_url || 'https://images.unsplash.com/photo-1605897472359-85e4b94d685d',
              breed: 'Product',
              location: 'Shop',
              status: data.in_stock ? 'available' : 'out_of_stock',
              type: 'product' as const,
              slug: data.slug
            };
          }
          
          // If not found in products, try marketplace_products table
          const { data: marketplaceData } = await supabase
            .from('marketplace_products' as any)
            .select('*')
            .eq('id', item.item_id)
            .single() as { data: any };
          
          if (marketplaceData) {
            // Handle marketplace product images (JSONB array or image_url)
            let image = 'https://images.unsplash.com/photo-1605897472359-85e4b94d685d';
            if (marketplaceData.images) {
              try {
                if (Array.isArray(marketplaceData.images) && marketplaceData.images.length > 0) {
                  image = String(marketplaceData.images[0]);
                } else if (typeof marketplaceData.images === 'string') {
                  image = marketplaceData.images;
                }
              } catch (e) {
                console.error("Error processing marketplace product image:", e);
              }
            } else if (marketplaceData.image_url) {
              image = marketplaceData.image_url;
            }
            
            // Format slug with marketplace- prefix for navigation
            const slug = marketplaceData.id ? `marketplace-${marketplaceData.id}` : undefined;
            
            // Use sale_price if available, otherwise use price
            const displayPrice = marketplaceData.sale_price || marketplaceData.price;
            
            return {
              id: item.item_id,
              title: marketplaceData.name || 'Product',
              price: `€${Number(displayPrice).toFixed(2)}`,
              image,
              breed: 'Product',
              location: 'Shop',
              status: (marketplaceData.stock_quantity || 0) > 0 ? 'available' : 'out_of_stock',
              type: 'product' as const,
              slug
            };
          }
        }
        else if (item.item_type === 'service') {
          const { data } = await supabase
            .from('business_listings')
            .select('*')
            .eq('id', item.item_id)
            .single();
          
          if (data) {
            // Use banner_image, logo_image, or default
            let image = 'https://images.unsplash.com/photo-1605897472359-85e4b94d685d';
            if (data.banner_image) {
              image = data.banner_image;
            } else if (data.logo_image) {
              image = data.logo_image;
            }
            
            return {
              id: item.item_id,
              title: data.name || 'Service',
              price: null,
              image,
              breed: capitalizeWords(data.type) || 'Service',
              location: capitalizeWords(data.county || data.address?.split(',')[0] || 'Unknown Location'),
              status: data.status || 'available',
              type: 'service' as const,
              slug: data.slug,
              seller_id: data.user_id
            };
          }
        }
        return null;
      });

      const resolvedItems = await Promise.all(wishlistDetailsPromises);
      const validItems = resolvedItems.filter(Boolean) as WishlistItem[];
      
      setWishlistItems(validItems);
    } catch (error) {
      console.error("Error fetching wishlist items:", error);
      toast({
        title: "Error fetching wishlist",
        description: "There was a problem loading your wishlist items. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchWishlistItems();
  }, [fetchWishlistItems]);

  const handleRemoveFromWishlist = async (id: string) => {
    await removeFromWishlist(id);
  };

  const viewListing = (item: WishlistItem) => {
    if (item.type === 'showcase') {
      router.push(`/showcase/${item.id}`);
    } else if (item.type === 'listing') {
      router.push(`/listing/${item.id}`);
    } else if (item.type === 'stud') {
      router.push(`/stud/${item.id}`);
    } else if (item.type === 'product') {
      if (item.slug) {
        router.push(`/shop/${item.slug}`);
      }
    } else if (item.type === 'service') {
      if (item.slug) {
        router.push(`/services/${item.slug}`);
      }
    }
  };

  const handleContactSeller = (item: WishlistItem) => {
    if (item.seller_id && item.type !== 'product') {
      setContactModal({
        isOpen: true,
        sellerId: item.seller_id,
        listingId: item.id,
        listingType: item.type,
        listingTitle: item.title
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-brand-dark-green" />
        <span className="ml-2 text-lg">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="wishlist" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="wishlist">
            My Wishlist ({wishlistItems.length})
          </TabsTrigger>
          <TabsTrigger value="quiz-results">
            Quiz Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wishlist" className="mt-0">
          {wishlistItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wishlistItems.map((item) => (
                <Card key={`${item.type}-${item.id}`} className={`overflow-hidden ${
                  item.type === 'showcase' 
                    ? 'border-pink-400 border-2' 
                    : item.type === 'stud' 
                      ? 'border-blue-400 border-2'
                      : item.type === 'listing'
                        ? 'border-brand-soft-green/60 border-2'
                        : 'border-gray-200'
                }`}>
                  <div className="aspect-square relative overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform hover:scale-105"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 bg-white/80 hover:bg-white rounded-full"
                      onClick={() => handleRemoveFromWishlist(item.id)}
                    >
                      <Heart className="h-5 w-5 text-rose-500 fill-rose-500" />
                    </Button>
                    
                    <div className="absolute top-2 left-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-md ${
                        item.type === 'listing' 
                          ? 'bg-brand-soft-green text-white' 
                          : item.type === 'showcase' 
                            ? 'bg-pink-400 text-white'
                            : item.type === 'product'
                              ? 'bg-purple-600 text-white'
                              : item.type === 'stud'
                                ? 'bg-blue-600 text-white'
                                : item.type === 'service'
                                  ? 'bg-orange-600 text-white'
                                  : 'bg-gray-600 text-white'
                      }`}>
                        {item.type === 'listing' ? 'For Sale' : item.type === 'showcase' ? 'Showcase' : item.type === 'product' ? 'Product' : item.type === 'service' ? 'Service' : 'Stud'}
                      </span>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg truncate">{item.title}</h3>
                    <div className="flex justify-between mt-1">
                      {item.price && item.type !== 'showcase' && (
                        <span className="text-lg font-semibold text-emerald-700">{item.price}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{item.location}</p>
                    <p className="text-sm text-gray-500 mt-1">{item.breed}</p>
                  </CardContent>
                  <CardFooter className="p-4 pt-0 flex justify-between">
                    <Button
                      variant="default"
                      className="bg-white border border-gray-400 text-gray-800 hover:bg-brand-soft-green hover:text-white"
                      onClick={() => viewListing(item)}
                    >
                      View Details
                    </Button>
                    {item.type !== 'product' && item.type !== 'showcase' && item.type !== 'service' && item.seller_id && (
                      <Button
                        variant="outline"
                        className="bg-white border border-gray-400 text-gray-800 hover:bg-brand-soft-green hover:text-white"
                        onClick={() => handleContactSeller(item)}
                      >
                        Contact Seller
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <Heart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Your wishlist is empty</h3>
              <p className="text-gray-500 mb-6">You haven't saved any items to your wishlist yet.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="quiz-results" className="mt-0">
          <SavedQuizResults />
        </TabsContent>
      </Tabs>

      <ContactSellerModal
        isOpen={contactModal.isOpen}
        onClose={() => setContactModal(prev => ({ ...prev, isOpen: false }))}
        sellerId={contactModal.sellerId}
        listingId={contactModal.listingId}
        listingType={contactModal.listingType}
        listingTitle={contactModal.listingTitle}
      />
    </div>
  );
};

export default BusinessWishlist;
