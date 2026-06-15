
import React from 'react';
import { useCart } from '@/contexts/CartContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatPrice } from '@/services/currencyService';
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, CreditCard, Truck, Tag, ExternalLink, Loader2 } from 'lucide-react';
import DiscountCode from './DiscountCode';

interface OrderSummaryProps {
  isSubmitting?: boolean;
  onPlaceOrder?: () => void;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({ isSubmitting = false, onPlaceOrder }) => {
  const { cart, discount } = useCart();
  const { currency, currencyInfo } = useCurrency();

  const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const discountAmount = discount ? subtotal * 0.1 : 0;
  const discountedSubtotal = subtotal - discountAmount;
  
  // Calculate shipping cost
  // For marketplace products: Use shipping_cost from product
  // For DogQuest products: €5 for collars, free otherwise
  const businessShipping = new Map<string, number>();
  let dogQuestShipping = 0;
  
  cart.forEach((item) => {
    // Check if it's a marketplace product
    if (item.is_marketplace && item.business_id) {
      const shipping = item.shipping_cost || 0;
      const shippingRequired = item.shipping_required !== false;
      
      if (shippingRequired && shipping > 0) {
        // Use highest shipping cost if multiple products from same business
        if (!businessShipping.has(item.business_id)) {
          businessShipping.set(item.business_id, shipping);
        } else {
          const current = businessShipping.get(item.business_id) || 0;
          businessShipping.set(item.business_id, Math.max(current, shipping));
        }
      }
    } else {
      // DogQuest product - check for collars
      const isCollar = item.title?.toLowerCase().includes('collar') || 
                      (item.slug && item.slug.toLowerCase().includes('collar'));
      if (isCollar) {
        dogQuestShipping = 5; // €5 for collars
      }
    }
  });
  
  // Sum all business shipping costs
  let totalBusinessShipping = 0;
  businessShipping.forEach(cost => totalBusinessShipping += cost);
  
  const shippingCost = totalBusinessShipping + dogQuestShipping;
  // Ensure total always includes shipping cost
  const total = discountedSubtotal + shippingCost;
  
  // Debug logging to verify calculations

  const handlePlaceOrder = () => {

    if (onPlaceOrder) {
      onPlaceOrder();
    } else {
      console.error('onPlaceOrder is not defined');
      // Fallback direct form submission using requestSubmit
      const checkoutForm = document.getElementById('checkout-form') as HTMLFormElement;
      if (checkoutForm) {

        try {
          checkoutForm.requestSubmit();
        } catch (e) {
          console.error('Error submitting form:', e);
          // Last resort fallback for older browsers
          const submitBtn = checkoutForm.querySelector('button[type="submit"]') as HTMLButtonElement;
          if (submitBtn) {
            submitBtn.click();
          } else {
            console.error('Unable to find submit button');
          }
        }
      } else {
        console.error('Checkout form not found');
      }
    }
  };

  return (
    <Card className="sticky top-6 bg-white border-gray-200 shadow-md overflow-hidden">
      <CardHeader className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <CardTitle className="flex items-center text-brand-dark-green">
          <ShoppingBag className="mr-2 h-5 w-5" />
          Order Summary
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <div className="max-h-[300px] overflow-y-auto">
          {cart.map((item) => (
            <div key={item.id} className="flex items-start gap-3 px-6 py-4 border-b border-gray-100">
              <div className="h-16 w-16 flex-shrink-0 bg-gray-50 rounded-md overflow-hidden border border-gray-100">
                <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm line-clamp-2">{item.title}</h4>
                <p className="text-sm text-gray-600 mt-1">Qty: {item.quantity}</p>
                <p className="text-brand-dark-green font-semibold mt-1">
                  {formatPrice(item.price * item.quantity, currency)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 space-y-4 bg-white">
          <div className="mb-4">
            <DiscountCode className="mb-4" />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">{formatPrice(subtotal, currency)}</span>
            </div>

            {discount && (
              <div className="flex justify-between text-sm text-brand-soft-green">
                <div className="flex items-center">
                  <Tag className="h-4 w-4 mr-1" />
                  <span>Discount (10%)</span>
                </div>
                <span className="font-medium">-{formatPrice(discountAmount, currency)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <div className="flex items-center text-gray-600">
                <Truck className="h-4 w-4 mr-1" />
                <span>Shipping</span>
              </div>
              <span className="font-medium text-brand-soft-green">
                {shippingCost > 0 ? formatPrice(shippingCost, currency) : 'Free Shipping'}
              </span>
            </div>

            <Separator className="my-3" />

            <div className="flex justify-between font-bold">
              <span>Total{shippingCost > 0 ? ' (includes shipping)' : ''}</span>
              <span className="text-xl text-brand-dark-green">{formatPrice(total, currency)}</span>
            </div>
            
            {shippingCost > 0 && (
              <p className="text-xs text-gray-500 text-center mt-2">
                Total includes {formatPrice(shippingCost, currency)} shipping
              </p>
            )}
          </div>

          <div className="bg-gray-50 p-3 rounded-md border border-gray-100 flex items-start text-xs text-gray-600">
            <CreditCard className="h-4 w-4 mr-2 mt-0.5 text-gray-500" />
            <div>
              <p className="font-medium text-gray-700 mb-1">Secure Payment</p>
              <p>Your payment information is processed securely. We do not store credit card details.</p>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
            <p className="text-sm text-center text-gray-700">
              <ExternalLink className="h-4 w-4 inline-block mr-1 text-brand-soft-green" />
              You will be directed to Stripe to complete your purchase securely
            </p>
          </div>

          <Button
            type="button"
            onClick={handlePlaceOrder}
            disabled={isSubmitting}
            className="w-full py-6 mt-2 bg-brand-soft-green hover:bg-brand-dark-green text-white font-medium text-base disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating Payment Session...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-5 w-5" />
                Place Order
              </>
            )}
          </Button>

          <p className="text-xs text-center text-gray-500 mt-3">
            By placing your order, you agree to our <a href="/terms" className="underline hover:text-brand-soft-green">Terms of Service</a> and <a href="/privacy-policy" className="underline hover:text-brand-soft-green">Privacy Policy</a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderSummary;
