
'use client';

import React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

interface WishlistAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemToSave?: {
    id: string;
    type: "listing" | "showcase" | "stud" | "service" | "product";
  };
}

const WishlistAuthModal = ({ 
  open, 
  onOpenChange,
  itemToSave
}: WishlistAuthModalProps) => {
  const router = useRouter();

  // Get the appropriate item type text for modal content
  const getItemTypeText = () => {
    switch(itemToSave?.type) {
      case 'service':
        return 'services';
      case 'showcase':
        return 'litters';
      case 'stud':
        return 'stud listings';
      case 'product':
        return 'products';
      case 'listing':
      default:
        return 'listings';
    }
  };

  // Handle navigating to login page with redirect info
  const handleLogin = () => {
    if (itemToSave) {
      // Store the pending wishlist item in session storage to retrieve after login
      sessionStorage.setItem('pendingWishlistItem', JSON.stringify(itemToSave));
    }
    
    // Close modal before navigation
    onOpenChange(false);
    
    // Navigate to login page
    router.push("/auth/login");
  };
  
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex flex-col items-center text-center gap-2">
            <Heart className="h-6 w-6 text-rose-500" />
            <p>Create an account to save {getItemTypeText()} you love!</p>
          </DialogTitle>
          <DialogDescription className="text-center">
            {itemToSave?.type === 'service' 
              ? 'Your wishlist will help you keep track of pet services you\'re interested in.'
              : itemToSave?.type === 'product'
                ? 'Your wishlist will help you keep track of products you\'re interested in.'
                : 'Your wishlist will help you keep track of puppies and breeders you\'re interested in.'}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between mt-5">
          <Button
            variant="outline"
            onClick={handleClose}
            className="sm:order-1"
          >
            Maybe later
          </Button>
          
          <Button 
            onClick={handleLogin}
            className="bg-brand-soft-green hover:bg-brand-dark-green"
          >
            Sign up / Log in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WishlistAuthModal;
