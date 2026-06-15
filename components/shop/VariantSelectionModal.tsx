
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus, Minus } from 'lucide-react';

interface Variant {
  color: string;
  stock: number;
}

interface VariantSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
    slug?: string;
    variants?: Variant[];
  };
  onAddToCart: (productId: string, color: string, quantity: number) => void;
}

const VariantSelectionModal: React.FC<VariantSelectionModalProps> = ({
  open,
  onOpenChange,
  product,
  onAddToCart,
}) => {
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  // Reset state when modal opens
  React.useEffect(() => {
    if (open && product.variants && product.variants.length > 0) {
      const firstAvailableVariant = product.variants.find(v => v.stock > 0);
      if (firstAvailableVariant) {
        setSelectedColor(firstAvailableVariant.color);
      } else {
        setSelectedColor(product.variants[0].color);
      }
      setQuantity(1);
    }
  }, [open, product.variants]);

  const selectedVariant = product.variants?.find(v => v.color === selectedColor);
  const maxStock = selectedVariant ? selectedVariant.stock : 0;
  const isInStock = selectedVariant ? selectedVariant.stock > 0 : false;

  // Get variant-specific image URL based on selected color
  const getVariantImageUrl = (): string => {
    if (!selectedColor) {
      return product.imageUrl;
    }
    
    // For Puppy Starter Kit, use specific variant image URLs
    if (product.slug?.includes('puppy-starter-kit') || product.name?.toLowerCase().includes('puppy starter kit')) {
      if (selectedColor.toLowerCase() === 'pink') {
        return "https://sehzakutrlropprdcewu.supabase.co/storage/v1/object/public/dog-quest-shop/Puppy Starter Kit Pink/puppy_starter_kit_pink.png";
      } else if (selectedColor.toLowerCase() === 'blue') {
        return "https://sehzakutrlropprdcewu.supabase.co/storage/v1/object/public/dog-quest-shop/Puppy Starter Kit Blue/puppy_starter_kit_blue.png";
      }
    }
    
    // Fallback to default image
    return product.imageUrl;
  };

  const getColorClasses = (color: string) => {
    switch (color.toLowerCase()) {
      case 'pink':
        return 'bg-pink-200 border-pink-300 hover:bg-pink-300';
      case 'blue':
        return 'bg-blue-200 border-blue-300 hover:bg-blue-300';
      default:
        return 'bg-gray-200 border-gray-300 hover:bg-gray-300';
    }
  };

  const getSelectedClasses = (color: string) => {
    switch (color.toLowerCase()) {
      case 'pink':
        return 'ring-2 ring-pink-500 ring-offset-2';
      case 'blue':
        return 'ring-2 ring-blue-500 ring-offset-2';
      default:
        return 'ring-2 ring-gray-500 ring-offset-2';
    }
  };

  const handleAddToCart = () => {
    if (selectedColor && quantity > 0) {
      onAddToCart(product.id, selectedColor, quantity);
      onOpenChange(false);
    }
  };

  const handleDecrease = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleIncrease = () => {
    if (quantity < maxStock) {
      setQuantity(quantity + 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Options</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Product Info */}
          <div className="flex gap-4">
            <img 
              src={getVariantImageUrl()} 
              alt={product.name}
              className="w-20 h-20 object-cover rounded-lg transition-all duration-300"
            />
            <div>
              <h3 className="font-semibold text-brand-dark-green">{product.name}</h3>
              <p className="text-lg font-medium">€{product.price.toFixed(2)}</p>
            </div>
          </div>

          {/* Color Selection */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900">Color</h4>
            <div className="flex gap-3">
              {product.variants?.map((variant) => {
                const isSelected = selectedColor === variant.color;
                const isOutOfStock = variant.stock === 0;
                
                return (
                  <div key={variant.color} className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`
                        h-12 w-16 p-0 border-2 transition-all duration-200
                        ${getColorClasses(variant.color)}
                        ${isSelected ? getSelectedClasses(variant.color) : ''}
                        ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                      onClick={() => !isOutOfStock && setSelectedColor(variant.color)}
                      disabled={isOutOfStock}
                    >
                      <span className="text-xs font-medium capitalize text-gray-700">
                        {variant.color}
                      </span>
                    </Button>
                    
                    {isOutOfStock && (
                      <Badge 
                        variant="outline" 
                        className="absolute -top-2 -right-2 bg-red-50 text-red-600 border-red-200 text-xs"
                      >
                        Out
                      </Badge>
                    )}
                    
                    {!isOutOfStock && (
                      <div className="absolute -bottom-1 -right-1">
                        <Badge 
                          variant="outline" 
                          className="bg-white text-gray-600 border-gray-200 text-xs"
                        >
                          {variant.stock}
                        </Badge>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quantity Selection */}
          {isInStock && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900">Quantity</h4>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={handleDecrease}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center justify-center min-w-[3rem]">
                  <span className="text-lg font-medium">{quantity}</span>
                </div>
                
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={handleIncrease}
                  disabled={quantity >= maxStock}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {maxStock > 0 && (
                <p className="text-sm text-gray-500">
                  {maxStock} available in stock
                </p>
              )}
            </div>
          )}

          {/* Add to Cart Button */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddToCart}
              disabled={!isInStock || !selectedColor}
              className="flex-1 bg-brand-soft-green hover:bg-brand-dark-green text-white"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Add to Cart
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VariantSelectionModal;
