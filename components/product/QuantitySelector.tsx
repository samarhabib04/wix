
import React from 'react';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';

interface QuantitySelectorProps {
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  maxQuantity: number;
  disabled?: boolean;
}

const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  quantity,
  onQuantityChange,
  maxQuantity,
  disabled = false,
}) => {
  const handleDecrease = () => {
    if (quantity > 1) {
      onQuantityChange(quantity - 1);
    }
  };

  const handleIncrease = () => {
    if (quantity < maxQuantity) {
      onQuantityChange(quantity + 1);
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-900">Quantity</h4>
      <div className="flex items-center space-x-3">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={handleDecrease}
          disabled={disabled || quantity <= 1}
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
          disabled={disabled || quantity >= maxQuantity}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      {maxQuantity > 0 && (
        <p className="text-sm text-gray-500">
          {maxQuantity} available in stock
        </p>
      )}
    </div>
  );
};

export default QuantitySelector;
