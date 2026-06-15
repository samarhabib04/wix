import { useState, useEffect, useCallback } from "react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

interface UseWishlistOptions {
  onWishlistChange?: () => void;
}

export type WishlistToggleResult =
  | 'added'
  | 'removed'
  | 'auth_required'
  | 'blocked'
  | 'failed'
  | 'noop';

// Helper function to validate ID format (both UUID and numeric)
const isValidId = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const numericRegex = /^\d+$/;
  return uuidRegex.test(id) || numericRegex.test(id);
};

function serializeErrorForLog(error: unknown): Record<string, unknown> {
  if (error && typeof error === "object") {
    const o = error as Record<string, unknown>;
    return {
      message: o.message,
      code: o.code,
      details: o.details,
      hint: o.hint,
    };
  }
  return { value: String(error) };
}

function formatWishlistErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    const o = error as Record<string, unknown>;
    if (typeof o.message === "string" && o.message) return o.message;
    if (typeof o.details === "string" && o.details) return o.details;
    if (typeof o.hint === "string" && o.hint) return o.hint;
    if (typeof o.code === "string") return `Database error (${o.code})`;
  }
  return "";
}

export const useWishlist = (options?: UseWishlistOptions) => {
  const [wishlistedItems, setWishlistedItems] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [wishlistAuthModalOpen, setWishlistAuthModalOpen] = useState(false);
  const [pendingWishlistItem, setPendingWishlistItem] = useState<{id: string; type: "listing" | "showcase" | "stud" | "service" | "product"} | null>(null);
  
  // Safely get auth context, fallback to no user if not available
  let user = null;
  let role = null;
  
  try {
    const authContext = useAuth();
    user = authContext?.user || null;
    role = authContext?.role || null;
  } catch (error) {
    // AuthProvider not available, continue with null user
  }
  
  // Fetch user's wishlist from Supabase
  const fetchWishlist = useCallback(async () => {
    if (!user) {
      setWishlistedItems({});
      return;
    }

    // If user is an admin, don't fetch wishlist
    if (role === "admin") {
      setWishlistedItems({});
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('user_wishlists')
        .select('item_id, item_type')
        .eq('user_id', user.id);
      
      if (error) throw error;

      const wishlistMap: Record<string, boolean> = {};
      data?.forEach(item => {
        // Accept both UUID and numeric ID formats
        if (isValidId(item.item_id)) {
          wishlistMap[item.item_id] = true;
        } else {
        }
      });

      setWishlistedItems(wishlistMap);
    } catch (error: any) {
      console.error("Error fetching wishlist:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, role]);

  // Check for pending wishlist item from previous session
  useEffect(() => {
    if (user) {
      const pendingItemJson = sessionStorage.getItem('pendingWishlistItem');
      if (pendingItemJson) {
        try {
          const pendingItem = JSON.parse(pendingItemJson);
          if (pendingItem && pendingItem.id && pendingItem.type) {
            // Clear it immediately to prevent multiple additions
            sessionStorage.removeItem('pendingWishlistItem');
            // Add the pending item to wishlist
            addToWishlist(pendingItem.id, pendingItem.type as "listing" | "showcase" | "stud" | "service" | "product");
          }
        } catch (err) {
          console.error("Error processing pending wishlist item:", err);
          sessionStorage.removeItem('pendingWishlistItem');
        }
      }
    }
  }, [user]); // Runs when user changes (signs in)

  // Add item to wishlist
  const addToWishlist = useCallback(async (itemId: string, itemType: "listing" | "showcase" | "stud" | "service" | "product") => {

    if (!user) {
      // User is not logged in - store pending item and show auth modal
      setPendingWishlistItem({id: itemId, type: itemType});
      setWishlistAuthModalOpen(true);
      return false;
    }

    // Check if user is an admin - prevent adding to wishlist
    if (role === "admin") {
      toast({
        title: "Admin Action Not Allowed",
        description: "Admins do not have a wishlist.",
        variant: "destructive",
        duration: 3000,
      });
      return false;
    }

    try {
      // Check if the item is already in the wishlist
      if (wishlistedItems[itemId]) {

        return true;
      }

      const { data, error } = await supabase
        .from('user_wishlists')
        .insert([
          { user_id: user.id, item_id: itemId, item_type: itemType }
        ])
        .select();

      if (error) {
        if (error.code === '23505') { // Unique violation
          // Item already in wishlist - silently handle this
        } else {
          console.error("Wishlist insert failed:", error.code, error.message, error.details, error.hint);
          throw error;
        }
      }
      
      // Update local state immediately
      setWishlistedItems(prev => ({
        ...prev,
        [itemId]: true
      }));

      // Determine the correct wishlist path based on user role
      let wishlistPath = "/";
      if (role === "seller") {
        wishlistPath = "/my-seller-dashboard/wishlist";
      } else if (role === "buyer") {
        wishlistPath = "/my-buyer-dashboard/wishlist";
      } else if (role === "business") {
        wishlistPath = "/my-business-dashboard/wishlist";
      }
      
      // Enhanced toast with See My Wishlist button that links to the correct dashboard
      // For showcase listings, show specific notification message
      const isShowcase = itemType === "showcase";
      toast({
        title: "Added to wishlist",
        description: isShowcase 
          ? "You'll be notified when this listing becomes active."
          : "Item has been added to your wishlist.",
        action: isShowcase ? undefined : (
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-brand-soft-green text-white hover:bg-brand-dark-green hover:text-white border-none"
            onClick={() => {
              // Use window.location for direct navigation from toast
              window.location.href = wishlistPath;
            }}
          >
            See My Wishlist
          </Button>
        ),
      });
      
      if (options?.onWishlistChange) {
        options.onWishlistChange();
      }
      
      return true;
    } catch (error: unknown) {
      const msg = formatWishlistErrorMessage(error);
      console.error("Error adding to wishlist:", msg, serializeErrorForLog(error));
      toast({
        title: "Error",
        description: msg || "Failed to add item to wishlist. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [user, options, wishlistedItems, role]);

  // Remove item from wishlist
  const removeFromWishlist = useCallback(async (itemId: string) => {
    if (!user) {
      // Show auth modal if user tries to interact with wishlist while logged out
      setWishlistAuthModalOpen(true);
      return false;
    }

    // Check if user is an admin - prevent wishlist actions
    if (role === "admin") {
      toast({
        title: "Admin Action Not Allowed",
        description: "Admins do not have a wishlist.",
        variant: "destructive",
        duration: 3000,
      });
      return false;
    }

    try {
      // Check if the item is not in the wishlist
      if (!wishlistedItems[itemId]) {
        return true;
      }
      
      const { error } = await supabase
        .from('user_wishlists')
        .delete()
        .eq('user_id', user.id)
        .eq('item_id', itemId);
      
      if (error) throw error;
      
      // Update local state
      setWishlistedItems(prev => {
        const newState = { ...prev };
        delete newState[itemId];
        return newState;
      });
      
      toast({
        title: "Removed from wishlist",
        description: "Item has been removed from your wishlist.",
      });
      
      if (options?.onWishlistChange) {
        options.onWishlistChange();
      }
      
      return true;
    } catch (error: any) {
      console.error("Error removing from wishlist:", error);
      toast({
        title: "Error",
        description: "Failed to remove item from wishlist. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [user, options, wishlistedItems, role]);

  // Toggle wishlist status
  const toggleWishlist = useCallback(async (
    itemId: string,
    itemType: "listing" | "showcase" | "stud" | "service" | "product",
    e?: React.MouseEvent
  ): Promise<WishlistToggleResult> => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!user) {
      // Show auth modal if user tries to interact with wishlist while logged out
      setPendingWishlistItem({id: itemId, type: itemType});
      setWishlistAuthModalOpen(true);
      return 'auth_required';
    }

    // Check if user is an admin - prevent wishlist actions
    if (role === "admin") {
      toast({
        title: "Admin Action Not Allowed",
        description: "Admins do not have a wishlist.",
        variant: "destructive",
        duration: 3000,
      });
      return 'blocked';
    }

    const isWishlisted = wishlistedItems[itemId];
    
    if (isWishlisted) {
      const removed = await removeFromWishlist(itemId);
      return removed ? 'removed' : 'failed';
    }

    const added = await addToWishlist(itemId, itemType);
    if (added) return 'added';
    return 'failed';
  }, [user, wishlistedItems, addToWishlist, removeFromWishlist, role]);

  // Check if an item is in the wishlist
  const isInWishlist = useCallback((itemId: string) => {
    return Boolean(wishlistedItems[itemId]);
  }, [wishlistedItems]);

  // Fetch wishlist only once when user changes
  useEffect(() => {
    if (user) {
      fetchWishlist();
    } else {
      setWishlistedItems({});
    }
  }, [fetchWishlist, user]);

  return {
    wishlistedItems,
    isLoading,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    isInWishlist,
    fetchWishlist,
    wishlistAuthModalOpen,
    setWishlistAuthModalOpen,
    pendingWishlistItem
  };
};
