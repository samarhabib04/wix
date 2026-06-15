
import React, { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tag, X } from 'lucide-react';

interface DiscountCodeProps {
  variant?: 'default' | 'compact';
  className?: string;
}

const DiscountCode: React.FC<DiscountCodeProps> = ({ 
  variant = 'default',
  className = ''
}) => {
  const { applyDiscount, removeDiscount, discount } = useCart();
  const [code, setCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const handleApplyDiscount = async () => {
    if (!code.trim()) return;

    setIsApplying(true);
    
    // Handle the different return types of applyDiscount
    const result = applyDiscount(code);
    let success = false;
    
    if (result instanceof Promise) {
      success = await result;
    } else {
      success = true; // For the simple boolean case
    }
    
    if (success) setCode('');
    setIsApplying(false);
  };

  const isCompact = variant === 'compact';

  // Check if discount is applied (either boolean true or discount object)
  if (discount !== false) {
    return (
      <div className={`flex items-center justify-between ${className}`}>
        <div className="flex items-center">
          <Tag className="h-4 w-4 mr-2 text-brand-soft-green" />
          <div>
            <p className="text-sm font-medium">
              {isCompact ? 'Discount applied' : 'Discount code applied'}
            </p>
            {!isCompact && typeof discount === 'object' && (
              <p className="text-xs text-gray-500">"{discount.code}" - {discount.percentOff}% off</p>
            )}
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={removeDiscount}
          className="h-8 text-gray-500 hover:text-red-500"
        >
          <X className="h-4 w-4" />
          {!isCompact && <span className="ml-1">Remove</span>}
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      {!isCompact && (
        <p className="text-sm font-medium mb-2">
          <Tag className="h-4 w-4 inline mr-2 text-gray-500" />
          Have a discount code?
        </p>
      )}
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder={isCompact ? "Discount code" : "Enter your code"}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="focus:border-brand-soft-green"
        />
        <Button 
          onClick={handleApplyDiscount}
          disabled={!code.trim() || isApplying}
          className="bg-brand-soft-green hover:bg-brand-dark-green text-white"
        >
          Apply
        </Button>
      </div>
    </div>
  );
};

export default DiscountCode;
