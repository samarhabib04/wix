
'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import { 
  Drawer, 
  DrawerClose, 
  DrawerContent, 
  DrawerDescription, 
  DrawerFooter, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerTrigger 
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { X, Minus, Plus, ShoppingCart } from 'lucide-react';
import { CartItem, useCart } from '@/contexts/CartContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatPrice } from '@/services/currencyService';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { Separator } from '@/components/ui/separator';
import DiscountCode from '@/components/checkout/DiscountCode';

interface CartDrawerProps {
  children: React.ReactNode;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ children }) => {
  const { cart, removeFromCart, updateQuantity, getCartTotal, getCartCount, discount } = useCart();
  const { currency } = useCurrency();
  const isMobile = useIsMobile();
  const router = useRouter();
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  
  // Function to close the drawer
  const closeDrawer = () => {
    if (drawerCloseRef.current) {
      drawerCloseRef.current.click();
    }
  };

  // Calculate discounted amount if applicable
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
  const total = discountedSubtotal + shippingCost;
  
  return (
    <Drawer>
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent className="h-screen max-h-screen overflow-y-auto">
        <div className="mx-auto w-full max-w-md px-4 h-full flex flex-col">
          <DrawerHeader className="pt-6 pb-2 flex-shrink-0">
            <DrawerTitle className="flex items-center justify-between">
              <span className="text-xl font-berkshire text-brand-dark-green">Your Cart</span>
              <DrawerClose ref={drawerCloseRef} className="rounded-full p-1.5 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </DrawerClose>
            </DrawerTitle>
            <DrawerDescription className="mt-1">
              {getCartCount() === 0 ? 
                "Your cart is empty" : 
                `You have ${getCartCount()} item${getCartCount() > 1 ? 's' : ''} in your cart`}
            </DrawerDescription>
          </DrawerHeader>
          
          {cart.length > 0 ? (
            <>
              <div className="py-2 space-y-4 flex-1 overflow-y-auto">
                {cart.map((item) => (
                  <CartItemRow key={item.id} item={item} 
                    onRemove={removeFromCart} 
                    onUpdateQuantity={updateQuantity}
                    onCloseDrawer={closeDrawer}
                  />
                ))}
              </div>
              
              <div className="p-4 border-t mt-2 flex-shrink-0">
                {/* Discount Code Component */}
                <div className="mb-4">
                  <DiscountCode variant="compact" />
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{formatPrice(subtotal, currency)}</span>
                  </div>
                  
                  {discount && (
                    <div className="flex justify-between items-center text-brand-soft-green">
                      <span>Discount (10%)</span>
                      <span>-{formatPrice(discountAmount, currency)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium text-brand-soft-green">
                      {shippingCost > 0 ? formatPrice(shippingCost, currency) : 'Free Shipping'}
                    </span>
                  </div>
                  
                  <Separator className="my-2" />
                  
                  <div className="flex justify-between items-center font-semibold">
                    <span>Total</span>
                    <span className="text-xl">{formatPrice(total, currency)}</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-brand-soft-green hover:bg-brand-dark-green text-white mb-3"
                  onClick={() => {
                    try {
                      localStorage.setItem('dogQuestCheckoutCart', JSON.stringify(cart));

                    } catch (e) {
                    }
                    closeDrawer();
                    setTimeout(() => {
                    router.push('/checkout');
                    }, 50);
                  }}
                >
                  Proceed to Checkout
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full mb-3"
                  onClick={() => {
                    closeDrawer();
                    setTimeout(() => {
                    router.push('/cart');
                    }, 50);
                  }}
                >
                  View Cart
                </Button>
                
                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => {
                    closeDrawer();
                    setTimeout(() => {
                    router.push('/shop');
                    }, 50);
                  }}
                >
                  Continue Shopping
                </Button>
              </div>
            </>
          ) : (
            <div className="p-6 text-center flex-1 flex flex-col justify-center">
              <div className="mx-auto w-16 h-16 mb-4 text-gray-300 flex items-center justify-center">
                <ShoppingCart size={64} />
              </div>
              <p className="mb-4 text-gray-500">Your shopping cart is empty.</p>
              <DrawerClose asChild>
                <Button variant="outline" className="mt-2" asChild>
                  <Link href="/shop">Browse Products</Link>
                </Button>
              </DrawerClose>
            </div>
          )}
          
          <DrawerFooter className="border-t pt-4 pb-6 flex-shrink-0">
            <p className="text-xs text-gray-500 text-center">
              {shippingCost > 0 ? `Shipping: ${formatPrice(shippingCost, currency)}` : 'Free shipping on all orders'}
            </p>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

interface CartItemRowProps {
  item: CartItem;
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onCloseDrawer: () => void;
}

const CartItemRow: React.FC<CartItemRowProps> = ({ item, onRemove, onUpdateQuantity, onCloseDrawer }) => {
  const { currency } = useCurrency();
  const isMobile = useIsMobile();
  
  // Use slug if available, otherwise fall back to ID
  const productUrl = `/shop/${item.slug || item.id}`;
  
  return (
    <div className="flex flex-col gap-3 py-3 border-b">
      <div className="flex items-center gap-3">
        <Link 
          href={productUrl}
          onClick={onCloseDrawer}
          className="relative h-16 w-16 flex-shrink-0 bg-gray-100 rounded overflow-hidden hover:opacity-80 transition-opacity"
        >
          <Image 
            src={item.image} 
            alt={item.title} 
            fill
            className="object-cover"
            sizes="64px"
            loading="lazy"
            quality={60}
          />
        </Link>
        
        <div className="flex-1 min-w-0 pr-2">
          <Link 
            href={productUrl}
            onClick={onCloseDrawer}
            className="hover:text-brand-soft-green transition-colors"
          >
            <h4 className="font-medium text-sm line-clamp-2 mb-1">{item.title}</h4>
          </Link>
          <p className="text-brand-dark-green font-medium">{formatPrice(item.price, currency)}</p>
        </div>
        
        <Button 
          type="button"
          size="icon" 
          variant="ghost" 
          className="h-8 w-8 rounded-full text-gray-400 hover:text-red-500 flex-shrink-0" 
          onClick={() => onRemove(item.id)}
          aria-label="Remove item"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex justify-center">
        <div className="flex items-center space-x-2 border rounded-md">
          <Button 
            type="button"
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 rounded-l-md rounded-r-none" 
            onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
            disabled={item.quantity <= 1}
            aria-label="Decrease quantity"
          >
            <Minus className="h-3 w-3" />
          </Button>
          
          <span className="w-8 text-center font-medium">{item.quantity}</span>
          
          <Button 
            type="button"
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 rounded-r-md rounded-l-none" 
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            aria-label="Increase quantity"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CartDrawer;
