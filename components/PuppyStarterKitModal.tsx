'use client';

import { useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Heart, Shield, Sparkles } from "lucide-react";
import Link from "next/link";

interface PuppyStarterKitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PuppyStarterKitModal = ({ isOpen, onClose }: PuppyStarterKitModalProps) => {
  const handleClose = () => {
    // Mark modal as seen so it doesn't show again
    localStorage.setItem('puppyStarterKitModalSeen', 'true');
    onClose();
  };

  const [variant, setVariant] = useState<'blue' | 'pink'>('blue');

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-md mx-auto rounded-lg p-0 [&>button[data-state]]:hidden bg-white shadow-lg">
        {/* Header with close button */}
        <div className="relative bg-gradient-to-r from-brand-soft-green to-brand-soft-green/40 p-4 sm:p-6">
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 text-white hover:bg-white/20 rounded-full p-2 transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center z-10"
            aria-label="Close modal"
          >
            <X className="h-6 w-6" />
          </button>
          
          <div className="text-center text-white pr-12">
            <div className="mb-2">
              <Sparkles className="h-8 w-8 mx-auto mb-2" />
            </div>
            <DialogTitle className="text-2xl sm:text-3xl font-berkshire mb-1">
              Welcome to Dog Quest! 🐾
            </DialogTitle>
            <p className="text-sm opacity-90">
              Congratulations on your new journey!
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[60vh] overflow-y-auto overscroll-contain pb-4">
          <div className="text-center">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
              Get Your Puppy Started Right
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Our Puppy Starter Kit has everything you need for your new companion's first days at home.
            </p>
          </div>

          {/* Variant Selector */}
          <div className="flex justify-center gap-2 mb-2">
            <Button variant={variant === 'blue' ? 'default' : 'outline'} size="sm" onClick={() => setVariant('blue')} aria-pressed={variant === 'blue'}>
              Blue
            </Button>
            <Button variant={variant === 'pink' ? 'default' : 'outline'} size="sm" onClick={() => setVariant('pink')} aria-pressed={variant === 'pink'}>
              Pink
            </Button>
          </div>

          {/* Product Image */}
          <div className="flex justify-center mb-4">
            <div className="relative w-full max-w-xs aspect-square rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm">
              <Image
                src={variant === 'blue' 
                  ? "https://sehzakutrlropprdcewu.supabase.co/storage/v1/object/public/dog-quest-shop/Puppy Starter Kit Blue/puppy_starter_kit_blue.png"
                  : "https://sehzakutrlropprdcewu.supabase.co/storage/v1/object/public/dog-quest-shop/Puppy Starter Kit Pink/puppy_starter_kit_pink.png"}
                alt={`Puppy Starter Kit (${variant} variant) with food bowls, toys, and accessories`}
                fill
                className="object-cover"
                loading="lazy"
                quality={85}
                sizes="(max-width: 768px) 100vw, 320px"
              />
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50">
              <Heart className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Essential Care Items</p>
                <p className="text-xs text-gray-600">Food bowls, toys, and comfort items</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50">
              <Shield className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Health & Safety</p>
                <p className="text-xs text-gray-600">Training pads and safety essentials</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50">
              <Sparkles className="h-5 w-5 text-purple-500 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Expert Curated</p>
                <p className="text-xs text-gray-600">Handpicked by veterinary professionals</p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="pt-4 space-y-3">
            <Button 
              asChild 
              className="w-full bg-brand-dark-green hover:bg-brand-soft-green text-white min-h-[48px] text-base font-medium touch-manipulation"
            >
              <Link href="/shop/puppy-starter-kit-9470" onClick={handleClose}>
                Shop Puppy Starter Kit
              </Link>
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={handleClose}
              className="w-full text-gray-600 hover:bg-gray-50 min-h-[48px] text-base touch-manipulation"
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
