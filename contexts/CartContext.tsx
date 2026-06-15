
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

export interface CartItem {
  id: string;
  title: string;
  price: number;
  image: string;
  quantity: number;
  slug?: string; // Add slug to cart item interface
  // Marketplace product fields
  is_marketplace?: boolean;
  business_id?: string;
  shipping_cost?: number;
  shipping_required?: boolean;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number, suppressToast?: boolean) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateCart: (items: CartItem[]) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
  discount: boolean | { code: string; percentOff: number };
  applyDiscount: (code?: string) => Promise<boolean> | void;
  removeDiscount: () => void;
  cartLoaded: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<boolean | { code: string; percentOff: number }>(false);
  const [cartLoaded, setCartLoaded] = useState(false);
  const { toast } = useToast();

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    const savedDiscount = localStorage.getItem('discount');
    
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error parsing saved cart:', error);
      }
    }
    
    if (savedDiscount === 'true') {
      setDiscount(true);
    }
    
    setCartLoaded(true);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cartLoaded) {
      localStorage.setItem('cart', JSON.stringify(cart));
    }
  }, [cart, cartLoaded]);

  // Save discount to localStorage whenever it changes
  useEffect(() => {
    if (cartLoaded) {
      localStorage.setItem('discount', discount === true ? 'true' : 'false');
    }
  }, [discount, cartLoaded]);

  const addToCart = (item: Omit<CartItem, 'quantity'>, quantity: number = 1, suppressToast: boolean = false) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === item.id);
      
      if (existingItem) {
        const updatedCart = prevCart.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + quantity }
            : cartItem
        );
        
        if (!suppressToast) {
          toast({
            id: "cart-toast",
            title: "Item added to cart",
            description: quantity > 1 
              ? `${quantity}x ${item.title} added to your cart.`
              : `${item.title} quantity updated in your cart.`,
            duration: 3000,
            action: (
              <ToastAction altText="View Cart" onClick={() => window.location.href = '/cart'}>
                View Cart
              </ToastAction>
            ),
          });
        }
        
        return updatedCart;
      } else {
        const newCart = [...prevCart, { ...item, quantity }];
        
        if (!suppressToast) {
          toast({
            id: "cart-toast",
            title: "Item added to cart",
            description: quantity > 1 
              ? `${quantity}x ${item.title} has been added to your cart.`
              : `${item.title} has been added to your cart.`,
            duration: 3000,
            action: (
              <ToastAction altText="View Cart" onClick={() => window.location.href = '/cart'}>
                View Cart
              </ToastAction>
            ),
          });
        }
        
        return newCart;
      }
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prevCart => {
      const item = prevCart.find(cartItem => cartItem.id === id);
      const newCart = prevCart.filter(cartItem => cartItem.id !== id);
      
      if (item) {
        toast({
          title: "Item removed",
          description: `${item.title} has been removed from your cart.`,
          duration: 3000,
        });
      }
      
      return newCart;
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const updateCart = (items: CartItem[]) => {
    setCart(items);
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('cart');
  };

  const getCartTotal = () => {
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    let discountAmount = 0;
    
    if (discount === true) {
      discountAmount = subtotal * 0.1;
    } else if (typeof discount === 'object' && discount.percentOff) {
      discountAmount = subtotal * (discount.percentOff / 100);
    }
    
    return subtotal - discountAmount;
  };

  const getCartCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const applyDiscount = (code?: string) => {
    if (code) {
      // For future implementation of dynamic discount codes
      // For now, just apply a 10% discount
      if (code.toLowerCase() === 'welcome10') {
        setDiscount({ code: 'WELCOME10', percentOff: 10 });
        return Promise.resolve(true);
      }
      return Promise.resolve(false);
    } else {
      // Simple boolean discount for backward compatibility
      setDiscount(true);
    }
  };

  const removeDiscount = () => {
    setDiscount(false);
  };

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      updateCart,
      clearCart,
      getCartTotal,
      getCartCount,
      discount,
      applyDiscount,
      removeDiscount,
      cartLoaded
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
