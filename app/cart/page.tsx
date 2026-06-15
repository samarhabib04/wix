'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, ShoppingCart, Plus, Minus, ArrowLeft, Tag, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/contexts/CartContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatPrice } from '@/services/currencyService';
import { motion } from 'framer-motion';
import NavigationSection from '@/components/NavigationSection';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import DiscountCode from '@/components/checkout/DiscountCode';
import { useAuth } from '@/contexts/AuthContext';

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, getCartTotal, getCartCount, discount } = useCart();
  const { currency } = useCurrency();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { dismiss } = useToast();
  const { user } = useAuth();
  
  // Dismiss toast when cart page loads
  useEffect(() => {
    dismiss("cart-toast");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  // Calculate subtotal and discount
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
    <>
      <div className="container mx-auto px-4 py-10 min-h-[70vh]">
        <div className="flex items-center mb-6">
          <Button 
            type="button"
            onClick={() => router.back()}
            variant="link"
            className="pl-0 text-brand-dark-green hover:text-brand-soft-green font-medium"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Shopping
          </Button>
        </div>

        <motion.div 
          className="mb-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h1 
            className="text-2xl md:text-3xl font-berkshire text-brand-dark-green"
            variants={itemVariants}
          >
            Your Cart
          </motion.h1>
          <motion.p 
            className="text-gray-600 mt-1"
            variants={itemVariants}
          >
            {getCartCount() === 0 
              ? "Your cart is currently empty" 
              : `You have ${getCartCount()} item${getCartCount() > 1 ? 's' : ''} in your cart`}
          </motion.p>
        </motion.div>
        
        {cart.length === 0 ? (
          <motion.div 
            className="text-center py-12 bg-gray-50 rounded-lg"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div 
              className="mx-auto w-24 h-24 mb-4 text-gray-300"
              variants={itemVariants}
            >
              <ShoppingCart size={96} />
            </motion.div>
            <motion.h2 
              className="text-xl font-semibold mb-2 text-gray-700"
              variants={itemVariants}
            >
              Your cart is empty
            </motion.h2>
            <motion.p 
              className="text-gray-600 mb-6"
              variants={itemVariants}
            >
              Looks like you haven't added any products to your cart yet.
            </motion.p>
            <motion.div variants={itemVariants}>
              <Button asChild variant="default" className="bg-brand-soft-green hover:bg-brand-dark-green text-white">
                <Link href="/shop">Browse Products</Link>
              </Button>
            </motion.div>
          </motion.div>
        ) : (
          <div className={`grid ${!isMobile ? 'grid-cols-3 gap-8' : 'grid-cols-1 gap-6'}`}>
            {/* Cart Items Section */}
            <motion.div 
              className={`${!isMobile ? 'col-span-2' : ''} space-y-4`}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {cart.map((item) => {
                // Use slug if available, otherwise fall back to ID
                const productUrl = `/shop/${item.slug || item.id}`;
                
                return (
                  <motion.div 
                    key={item.id} 
                    className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100"
                    variants={itemVariants}
                  >
                    <Link 
                      href={productUrl} 
                      className="h-24 w-24 flex-shrink-0 bg-gray-100 rounded overflow-hidden hover:opacity-80 transition-opacity"
                    >
                      <img 
                        src={item.image} 
                        alt={item.title} 
                        className="h-full w-full object-cover"
                      />
                    </Link>
                    
                    <div className="flex-1 min-w-0 w-full sm:w-auto flex flex-col">
                      <Link 
                        href={productUrl}
                        className="hover:text-brand-soft-green transition-colors"
                      >
                        <h3 className="font-medium text-md line-clamp-2">{item.title}</h3>
                      </Link>
                      <p className="text-brand-dark-green font-medium mt-1">{formatPrice(item.price, currency)}</p>
                      
                      <div className="flex items-center mt-auto pt-3 justify-between">
                        <div className="flex items-center space-x-2 border rounded-md">
                          <Button 
                            type="button"
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 rounded-l-md rounded-r-none" 
                            onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                            disabled={item.quantity <= 1}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          
                          <span className="w-8 text-center">{item.quantity}</span>
                          
                          <Button 
                            type="button"
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 rounded-r-md rounded-l-none" 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <Button 
                          type="button"
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-gray-400 hover:text-red-500" 
                          onClick={() => removeFromCart(item.id)}
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
            
            {/* Order Summary Section */}
            <motion.div 
              className="col-span-1 h-fit"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div 
                className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 relative z-10"
                variants={itemVariants}
              >
                <h2 className="text-lg font-semibold text-brand-dark-green mb-4">Order Summary</h2>
                
                {/* Discount Code Section */}
                <div className="mb-4">
                  <DiscountCode className="mb-4" />
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{formatPrice(subtotal, currency)}</span>
                  </div>
                  
                  {discount && (
                    <div className="flex justify-between text-brand-soft-green">
                      <div className="flex items-center">
                        <Tag className="h-4 w-4 mr-1" />
                        <span>Discount (10%)</span>
                      </div>
                      <span>-{formatPrice(discountAmount, currency)}</span>
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
                  
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-lg">{formatPrice(total, currency)}</span>
                  </div>
                </div>
                
                  <Button 
                    id="cart-proceed-btn"
                    type="button"
                    className="w-full mt-6 bg-brand-soft-green hover:bg-brand-dark-green text-white"
                    onClick={() => {
                      if (cart.length > 0) {
                        try {
                          localStorage.setItem('dogQuestCheckoutCart', JSON.stringify(cart));
                          // Use hard navigation for maximum reliability
                          window.location.assign('/checkout');
                        } catch (e) {
                          console.error('Failed to persist cart to localStorage, forcing navigation anyway', e);
                          window.location.assign('/checkout');
                        }
                      } else {
                      }
                    }}
                  >
                    Proceed to Checkout
                  </Button>
                
                <p className="text-xs text-gray-500 text-center mt-3">
                  {shippingCost > 0 ? `Shipping: ${formatPrice(shippingCost, currency)}` : 'Free shipping on all orders'}
                </p>
              </motion.div>
            </motion.div>
          </div>
        )}
      </div>
      
      <NavigationSection variant="shop" />
    </>
  );
}
