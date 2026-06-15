
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Variant {
  color: string;
  stock: number;
}

interface ColorSelectorProps {
  variants: Variant[];
  selectedColor: string;
  onColorChange: (color: string) => void;
}

const ColorSelector: React.FC<ColorSelectorProps> = ({
  variants,
  selectedColor,
  onColorChange,
}) => {
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

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-900">Color</h4>
      <div className="flex gap-3">
        {variants.map((variant) => {
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
                onClick={() => !isOutOfStock && onColorChange(variant.color)}
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
  );
};

export default ColorSelector;
