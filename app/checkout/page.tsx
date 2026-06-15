'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { motion } from 'framer-motion';
import CheckoutForm from '@/components/checkout/CheckoutForm';
import OrderSummary from '@/components/checkout/OrderSummary';
import { useIsMobile } from '@/hooks/use-mobile';
import { CartItem } from '@/contexts/CartContext';
import { toast } from "sonner";
import { CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';

function CheckoutPageContent() {
  const { cart, updateCart } = useCart();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [checkoutAsGuest, setCheckoutAsGuest] = useState(true);
  const searchParams = useSearchParams();
  const shouldRestore = searchParams.get('restore') === 'true';
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [country, setCountry] = useState<'Republic of Ireland' | 'Northern Ireland'>('Republic of Ireland');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isPageRefresh, setIsPageRefresh] = useState(false);
  const pageLoadedRef = useRef(false);
  const cartRestoredRef = useRef(false);
  
  // Check if this is a page refresh
  useEffect(() => {
    if (pageLoadedRef.current) {
      return;
    }
    pageLoadedRef.current = true;
    
    const savedShippingInfo = localStorage.getItem('dogQuestShippingInfo');
    const savedCheckoutCart = localStorage.getItem('dogQuestCheckoutCart');
    
    if (savedShippingInfo || savedCheckoutCart) {
      setIsPageRefresh(true);
    }
    
    if (window.performance && window.performance.navigation) {
      if (window.performance.navigation.type === 1) {
        setIsPageRefresh(true);
      }
    }
    
    const isFirstLoad = sessionStorage.getItem('checkoutPageVisited');
    if (isFirstLoad) {
      setIsPageRefresh(true);
    } else {
      sessionStorage.setItem('checkoutPageVisited', 'true');
    }
  }, []);

  // Automatically set checkout mode based on authentication status
  useEffect(() => {
    if (user) {
      setCheckoutAsGuest(false);
      fetchUserProfile();
    } else {
      setCheckoutAsGuest(true);
    }
  }, [user]);
  
  // Fetch user profile data to pre-fill checkout form
  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }
      
      if (data) {
        setUserProfile(data);
        localStorage.setItem('dogQuestUserProfile', JSON.stringify(data));
        
        toast("Your information has been loaded", {
          description: "Your saved information has been pre-filled in the checkout form."
        });
      }
    } catch (err) {
      console.error('Error in profile fetch:', err);
    }
  };
  
  // Restore the cart if redirected back from Stripe
  useEffect(() => {
    if (cartRestoredRef.current) {
      return;
    }
    
    try {
      const savedCart = localStorage.getItem('dogQuestCheckoutCart');
      
      if (savedCart) {
        try {
          const cartItems: CartItem[] = JSON.parse(savedCart);
          if (cart.length === 0 || JSON.stringify(cart) !== savedCart) {
            updateCart(cartItems);
            cartRestoredRef.current = true;
          }
        } catch (parseError) {
          console.error("Error parsing saved cart:", parseError);
        }
      }
      
      const savedShippingInfo = localStorage.getItem('dogQuestShippingInfo');
      if (savedShippingInfo) {
        try {
          const shippingInfo = JSON.parse(savedShippingInfo);
          if (shippingInfo.country) {
            setCountry(shippingInfo.country as 'Republic of Ireland' | 'Northern Ireland');
          }
          
          if (shouldRestore) {
            toast("Your previous checkout information has been restored.");
          }
        } catch (parseError) {
          console.error("Error parsing saved shipping info:", parseError);
        }
      }

      setInitialLoadComplete(true);
      
    } catch (err) {
      console.error("Error restoring data from localStorage:", err);
      setInitialLoadComplete(true);
    }
  }, [updateCart, shouldRestore, cart.length]);
  
  // Handle sign in button click
  const handleSignInClick = () => {
    if (cart.length > 0) {
      localStorage.setItem('dogQuestCheckoutCart', JSON.stringify(cart));
    }
    
    const shippingInfo = localStorage.getItem('dogQuestShippingInfo');
    if (shippingInfo) {
      const currentInfo = JSON.parse(shippingInfo);
      currentInfo.country = country;
      localStorage.setItem('dogQuestShippingInfo', JSON.stringify(currentInfo));
    } else {
      localStorage.setItem('dogQuestShippingInfo', JSON.stringify({ country }));
    }
    
    router.push(`/auth/login?next=${encodeURIComponent('/checkout')}`);
    setCheckoutAsGuest(false);
  };

  // Handle country change from CheckoutForm
  const handleCountryChange = (newCountry: 'Republic of Ireland' | 'Northern Ireland') => {
    setCountry(newCountry);
  };
  
  // Handle the Place Order button click
  const handlePlaceOrder = () => {
    if (formRef.current) {
      formRef.current.requestSubmit();
    } else {
      console.error('Form reference is not available');
      const form = document.getElementById('checkout-form') as HTMLFormElement;
      if (form) {
        form.requestSubmit();
      } else {
        console.error('Checkout form not found in the DOM');
        toast.error("Unable to process your order. Please try again.");
      }
    }
  };
  
  // Steps display helper
  const CheckoutStepIndicator = ({ currentStep }: { currentStep: number }) => {
    const steps = [
      { num: 1, name: "Information" },
      { num: 2, name: "Payment" }
    ];
    
    return (
      <div className="flex justify-center mb-8">
        {steps.map((step, index) => (
          <div key={step.num} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`rounded-full w-10 h-10 flex items-center justify-center text-white mb-1
                ${currentStep >= step.num ? 'bg-brand-soft-green' : 'bg-gray-300'}`}>
                {currentStep > step.num ? <CheckCircle className="h-6 w-6" /> : step.num}
              </div>
              <span className={`text-sm ${currentStep >= step.num ? 'text-brand-dark-green font-medium' : 'text-gray-500'}`}>
                {step.name}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="w-20 h-[2px] self-center mx-2 mt-5 bg-gray-200">
                <div 
                  className="h-full bg-brand-soft-green transition-all duration-500" 
                  style={{ width: currentStep > 1 ? '100%' : '0%' }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="container mb-20 mx-auto px-4 py-8 min-h-[80vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 max-w-5xl mx-auto"
      >
        <h1 className="text-2xl md:text-3xl font-berkshire text-brand-dark-green mb-4 text-center">
          Checkout
        </h1>
        
        <CheckoutStepIndicator currentStep={checkoutStep} />
        
        {/* Authentication toggle */}
        {!user ? (
          <div className="flex flex-col sm:flex-row sm:gap-4 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200 max-w-3xl mx-auto">
            <div className="flex gap-3 sm:gap-4 mb-3 sm:mb-0">
              <button
                onClick={() => setCheckoutAsGuest(true)}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-md transition-colors ${
                  checkoutAsGuest 
                    ? 'bg-brand-soft-green text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Guest Checkout
              </button>
              <button
                onClick={handleSignInClick}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-md transition-colors ${
                  !checkoutAsGuest 
                    ? 'bg-brand-soft-green text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Sign In
              </button>
            </div>
            <p className="text-sm text-gray-600 sm:ml-auto self-center">
              {checkoutAsGuest 
                ? 'Continue as a guest or sign in to use your saved information'
                : 'Sign in to use your saved information'}
            </p>
          </div>
        ) : (
          <div className="mb-6 bg-green-50 p-4 rounded-lg border border-green-200 max-w-3xl mx-auto">
            <p className="text-sm text-green-800 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              Signed in as {user.email}. Your saved information will be used.
            </p>
          </div>
        )}
      </motion.div>
      
      <div className="max-w-7xl mx-auto">
        {(cart.length === 0 && !(typeof window !== 'undefined' && localStorage.getItem('dogQuestCheckoutCart') && localStorage.getItem('dogQuestCheckoutCart') !== '[]')) ? (
          <div className="max-w-3xl mx-auto text-center bg-gray-50 border border-gray-200 rounded-lg p-8">
            <h2 className="text-xl font-semibold text-brand-dark-green mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-4">Add items to your cart to proceed to checkout.</p>
            <Link href="/shop" className="inline-block px-4 py-2 rounded-md bg-brand-soft-green text-white">Browse Shop</Link>
          </div>
        ) : (
          <>
            <div className={`grid ${!isMobile ? 'grid-cols-3 gap-8' : 'grid-cols-1 gap-6'}`}>
              <div className={`${!isMobile ? 'col-span-2' : ''}`}>
                <CheckoutForm 
                  formRef={formRef}
                  checkoutAsGuest={checkoutAsGuest}
                  onStepChange={(step) => {
                    setCheckoutStep(step);
                    if (step === 2) {
                      setIsSubmitting(true);
                    } else {
                      setIsSubmitting(false);
                    }
                  }} 
                  userProfile={userProfile}
                  onCountryChange={handleCountryChange}
                  setIsSubmitting={setIsSubmitting}
                />
              </div>
              
              <div className="col-span-1">
                <OrderSummary 
                  isSubmitting={isSubmitting}
                  onPlaceOrder={handlePlaceOrder}
                />
              </div>
            </div>
            
            {/* Legal links section */}
            <div className="mt-8 text-xs text-center text-gray-500">
              <p>
                <Link href="/terms" className="hover:underline">Terms of Service</Link>
              </p>
              <p className="mt-2">
                &copy; {new Date().getFullYear()} Dog Quest. All rights reserved.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-16 min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-dark-green"></div>
      </div>
    }>
      <CheckoutPageContent />
    </Suspense>
  );
}

