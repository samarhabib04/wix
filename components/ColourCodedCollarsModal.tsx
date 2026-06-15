'use client';

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Palette, Tag, Star } from "lucide-react";
import Link from "next/link";

interface ColourCodedCollarsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ColourCodedCollarsModal = ({ isOpen, onClose }: ColourCodedCollarsModalProps) => {
  const handleClose = () => {
    // Mark modal as seen so it doesn't show again
    localStorage.setItem('colourCodedCollarsModalSeen', 'true');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
     <DialogContent className="max-w-md mx-4 rounded-lg p-0 overflow-hidden [&>button[data-state]]:hidden">
        {/* Header with close button */}
        <div className="relative bg-gradient-to-r from-brand-dark-green to-brand-soft-green p-4">
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 text-white hover:bg-white/20 rounded-full p-1 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="text-center text-white">
            <div className="mb-2">
              <Palette className="h-8 w-8 mx-auto mb-2" />
            </div>
            <DialogTitle className="text-3xl font-berkshire mb-1">
              Welcome to Dog Quest! 🌈
            </DialogTitle>
            <p className="text-sm opacity-90">
              Ready to showcase your beautiful litters?
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Organize Your Litters with Style
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Our Colour-Coded Collars make it easy to identify and track each puppy in your litter.
            </p>
          </div>

          {/* Product Image */}
          <div className="flex justify-center mb-4">
            <div className="w-full h-auto rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm">
              <img
                src="https://sehzakutrlropprdcewu.supabase.co/storage/v1/object/public/product-images/products/aw3khwm5fxn-1749573414859.png"
                alt="Colour-Coded Collars for puppy identification in multiple colors"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to placeholder if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.className = "w-32 h-32 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center";
                    parent.innerHTML = `
                      <div class="text-center">
                        <svg class="h-8 w-8 text-brand-dark-green mx-auto mb-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                        </svg>
                        <p class="text-xs text-gray-500 font-medium">Colour-Coded Collars</p>
                      </div>
                    `;
                  }
                }}
              />
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Tag className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Easy Identification</p>
                <p className="text-xs text-gray-600">Track each puppy's progress individually</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Palette className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Multiple Colors</p>
                <p className="text-xs text-gray-600">Perfect for large litters up to 12 puppies</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Star className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Professional Appeal</p>
                <p className="text-xs text-gray-600">Shows buyers your attention to detail</p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="pt-4 space-y-3">
            <Button asChild className="w-full bg-brand-dark-green hover:bg-brand-soft-green text-white">
              <Link href="/shop/colour-coded-collars-6491" onClick={handleClose}>
                Shop Colour-Coded Collars
              </Link>
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={handleClose}
              className="w-full text-gray-600 hover:bg-gray-50"
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
