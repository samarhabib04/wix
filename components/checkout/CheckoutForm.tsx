import React, { useEffect, useState, useCallback, useRef } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { useCart } from '@/contexts/CartContext';
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, User, MapPin, Mail, Phone, Loader2 } from "lucide-react";
import { irishCounties, validateIrishPhoneNumber } from '@/lib/utils/irish-data';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/types/auth';
import { toast } from "sonner";
import { supabase } from '@/lib/supabase/client';

// Define props interface with formRef
interface CheckoutFormProps {
  checkoutAsGuest: boolean;
  onStepChange?: (step: number) => void;
  userProfile?: UserProfile | null;
  onCountryChange?: (country: 'Republic of Ireland' | 'Northern Ireland') => void;
  setIsSubmitting?: (isSubmitting: boolean) => void;
  formRef?: React.RefObject<HTMLFormElement | null>;
}

// Simple debounce function implementation
const debounce = <F extends (...args: any[]) => any>(func: F, wait: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function executedFunction(...args: Parameters<F>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
};

// Phone number input handler to restrict input to valid characters and length
const handlePhoneInput = (value: string): string => {
  // Remove any characters that are not digits, spaces, dashes, parentheses, or plus sign
  let cleaned = value.replace(/[^\d\s\-()+ ]/g, '');
  
  // Limit length to prevent infinite digits (max 15 digits for international format)
  const digitsOnly = cleaned.replace(/[^\d]/g, '');
  if (digitsOnly.length > 15) {
    // Keep only the first 15 digits while preserving formatting characters
    let digitCount = 0;
    cleaned = cleaned.split('').filter(char => {
      if (/\d/.test(char)) {
        digitCount++;
        return digitCount <= 15;
      }
      return true; // Keep non-digit characters (spaces, dashes, etc.)
    }).join('');
  }
  
  return cleaned;
};

const CheckoutForm: React.FC<CheckoutFormProps> = ({ 
  checkoutAsGuest, 
  onStepChange, 
  userProfile,
  onCountryChange,
  setIsSubmitting,
  formRef
}) => {

  const { user } = useAuth();
  const { cart, discount, cartLoaded } = useCart();

  // CRITICAL FIX: Check cartLoaded BEFORE calling any hooks
  if (!cartLoaded) {

    return null; // Or return a loading spinner component
  }

  const [isSubmittingLocal, setIsSubmittingLocal] = useState(false);
  const [country, setCountry] = useState<'Republic of Ireland' | 'Northern Ireland'>('Republic of Ireland');
  const [formDataLoaded, setFormDataLoaded] = useState(false);
  const isResetting = useRef(false);
  const shouldSaveChanges = useRef(false);

  // Create the form schema based on the country state
  const formSchema = z.object({
    email: z.string().email("Please enter a valid email address."),
    firstName: z.string().min(2, "First name must be at least 2 characters."),
    lastName: z.string().min(2, "Last name must be at least 2 characters."),
    phone: z.string()
      .min(1, "Phone number is required.")
      .refine(validateIrishPhoneNumber, {
        message: "Please enter a valid phone number (South Africa, USA, Ireland, or Canada)."
      }),
    addressLine1: z.string().min(5, "Address must be at least 5 characters."),
    addressLine2: z.string().optional(),
    county: z.string().min(2, "Please select a county."),
    eircode: country === 'Republic of Ireland' 
      ? z.string().min(1, "Eircode is required for Republic of Ireland.") 
      : z.string().min(1, "Postcode is required for Northern Ireland."),
  });

  // Initialize form with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      county: "",
      eircode: "",
    },
  });

  // Use useWatch to efficiently track form values - ONLY after form data has loaded
  const watchedFormValues = useWatch({ control: form.control });
  
  // Create a memoized debounced save function
  const saveFormData = useCallback(
    debounce((data: any, currentCountry: string) => {
      if (isResetting.current || !shouldSaveChanges.current) {
        return; // Skip saving if we're in the middle of a form reset or shouldn't save
      }
      
      // Only save if we have some data entered and the form has been loaded
      if (formDataLoaded) {
        const formData = {
          ...data,
          country: currentCountry
        };
        localStorage.setItem('dogQuestShippingInfo', JSON.stringify(formData));
      }
    }, 500), // 500ms debounce
    [formDataLoaded]
  );

  // Update onStepChange when we validate steps
  useEffect(() => {
    if (onStepChange) {
      onStepChange(1);
    }
  }, [onStepChange]);

  // Effect to save form data when it changes
  useEffect(() => {
    // Only run this effect after form data is loaded and saving is enabled
    if (!formDataLoaded || isResetting.current) return;
    
    saveFormData(watchedFormValues, country);
    
    // Cleanup function to cancel debounce on unmount
    return () => {
      // Typescript type assertion for the cancel method
      if ((saveFormData as any).cancel) {
        (saveFormData as any).cancel();
      }
    };
  }, [watchedFormValues, country, formDataLoaded, saveFormData]);

  // MAIN DATA LOADING EFFECT - handles both saved data and user profile data
  useEffect(() => {
    const loadFormData = async () => {
      try {
        isResetting.current = true;
        shouldSaveChanges.current = false;

        // Step 1: Load saved shipping info from localStorage first
        const savedShippingInfo = localStorage.getItem('dogQuestShippingInfo');
        let savedData: any = {};
        
        if (savedShippingInfo) {
          try {
            savedData = JSON.parse(savedShippingInfo);

            // Update country selection from saved data
            if (savedData.country) {
              setCountry(savedData.country as 'Republic of Ireland' | 'Northern Ireland');
              if (onCountryChange) {
                onCountryChange(savedData.country as 'Republic of Ireland' | 'Northern Ireland');
              }
            }
          } catch (err) {
            console.error("Error parsing saved shipping info:", err);
          }
        }
        
        // Step 2: Prepare user data if not checking out as guest
        let userData: any = {};
        if (!checkoutAsGuest && (user || userProfile)) {

          // Determine country from user profile county if available
          if (userProfile?.county && !savedData.country) {
            const northernIrelandCounties = ['Antrim', 'Armagh', 'Down', 'Fermanagh', 'Derry', 'Tyrone'];
            const profileCountry = northernIrelandCounties.includes(userProfile.county) ? 'Northern Ireland' : 'Republic of Ireland';
            setCountry(profileCountry);
            if (onCountryChange) {
              onCountryChange(profileCountry);
            }
          }
          
          // Prepare user data with priority: user.email > saved data > user profile data
          userData = {
            email: user?.email || savedData.email || "",
            firstName: savedData.firstName || userProfile?.first_name || "",
            lastName: savedData.lastName || userProfile?.last_name || "",
            phone: savedData.phone || userProfile?.phone || "",
            county: savedData.county || userProfile?.county || "",
          };
        }
        
        // Step 3: Merge saved data with user data, prioritizing saved form data for address fields
        const finalFormData = {
          email: !checkoutAsGuest && user?.email ? user.email : (savedData.email || userData.email || ""),
          firstName: savedData.firstName || userData.firstName || "",
          lastName: savedData.lastName || userData.lastName || "",
          phone: savedData.phone || userData.phone || "",
          addressLine1: savedData.addressLine1 || "",
          addressLine2: savedData.addressLine2 || "",
          county: savedData.county || userData.county || "",
          eircode: savedData.eircode || "",
        };

        // Step 4: Reset form with final data
        await form.reset(finalFormData);
        
        // Step 5: Mark form as loaded and enable saving
        setTimeout(() => {
          setFormDataLoaded(true);
          isResetting.current = false;
          setTimeout(() => {
            shouldSaveChanges.current = true;
          }, 200);
        }, 100);

      } catch (err) {
        console.error("Error loading form data:", err);
        isResetting.current = false;
        setFormDataLoaded(true);
        shouldSaveChanges.current = true;
      }
    };
    
    loadFormData();
  }, [form, onCountryChange, user, userProfile, checkoutAsGuest]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {

    if (cart.length === 0) {
      toast.error("Your cart is empty. Please add items before checkout.");
      return;
    }

    try {

      // CRITICAL: Set loading state IMMEDIATELY and synchronously before any async operations
      // This ensures both buttons show loading state right away
      setIsSubmittingLocal(true);
      
      // Update parent component's submitting state if the prop is provided
      if (setIsSubmitting) {
        setIsSubmitting(true);
      }
      
      // Force a microtask to ensure React processes the state update before continuing
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Update step to payment
      if (onStepChange) {
        onStepChange(2);
      }
      
      // Store shipping information in localStorage with firstName and lastName
      const shippingInfo = {
        ...data,
        country: country
      };
      
      // Map to API schema: address, city, postalCode
      const apiShippingInfo = {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        address: [data.addressLine1, data.addressLine2].filter(Boolean).join(', '),
        city: data.county, // map county -> city for Stripe schema
        postalCode: (data.eircode || '').trim().toUpperCase(),
        country: country,
      };
      
      localStorage.setItem('dogQuestShippingInfo', JSON.stringify(shippingInfo));
      localStorage.setItem('dogQuestCheckoutCart', JSON.stringify(cart));

      // Get the current session token properly
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken && !checkoutAsGuest) {
        throw new Error('Authentication required. Please sign in to continue.');
      }

      // Get the absolute Supabase URL from environment
      const supabaseUrl = 'https://sehzakutrlropprdcewu.supabase.co'; // Your actual Supabase URL
      try {
        // Transform cart items to ensure IDs are valid UUIDs
        // If ID contains variant info (e.g., "uuid-color"), extract just the UUID part
        const transformedCartItems = await Promise.all(cart.map(async (item) => {
          // UUID regex pattern: 8-4-4-4-12 hexadecimal characters
          const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          
          // If ID is already a valid UUID, use it as-is
          if (uuidPattern.test(item.id)) {
            return {
              id: item.id,
              title: item.title,
              price: item.price,
              quantity: item.quantity,
              image: item.image,
              slug: item.slug, // Include slug for shipping calculation
              is_marketplace: item.is_marketplace,
              business_id: item.business_id,
              shipping_cost: item.shipping_cost,
              shipping_required: item.shipping_required,
            };
          }
          
          // If ID contains a variant suffix (e.g., "uuid-color"), extract the UUID part
          // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars)
          const uuidMatch = item.id.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
          if (uuidMatch && uuidMatch[1]) {
            return {
              id: uuidMatch[1], // Use only the UUID part
              title: item.title,
              price: item.price,
              quantity: item.quantity,
              image: item.image,
              slug: item.slug, // Include slug for shipping calculation
              is_marketplace: item.is_marketplace,
              business_id: item.business_id,
              shipping_cost: item.shipping_cost,
              shipping_required: item.shipping_required,
            };
          }
          
          // If ID might be a slug, try to fetch the UUID from the database
          if (item.slug) {
            try {
              const { data, error } = await supabase
                .from('products')
                .select('id')
                .eq('slug', item.slug)
                .single();
              
              if (!error && data && data.id) {
                return {
                  id: data.id, // Use the UUID from database
                  title: item.title,
                  price: item.price,
                  quantity: item.quantity,
                  image: item.image,
                  slug: item.slug, // Include slug for shipping calculation
                  is_marketplace: item.is_marketplace,
                  business_id: item.business_id,
                  shipping_cost: item.shipping_cost,
                  shipping_required: item.shipping_required,
                };
              }
            } catch (fetchError) {
              console.error('Error fetching product UUID for slug:', item.slug, fetchError);
            }
          }
          
          // Last resort: try to fetch by ID (in case it's a slug stored as ID)
          try {
            const { data, error } = await supabase
              .from('products')
              .select('id')
              .eq('slug', item.id)
              .single();
            
            if (!error && data && data.id) {
              return {
                id: data.id, // Use the UUID from database
                title: item.title,
                price: item.price,
                quantity: item.quantity,
                image: item.image,
                slug: item.slug || item.id, // Include slug for shipping calculation
                is_marketplace: item.is_marketplace,
                business_id: item.business_id,
                shipping_cost: item.shipping_cost,
                shipping_required: item.shipping_required,
              };
            }
          } catch (fetchError) {
            console.error('Error fetching product UUID for ID:', item.id, fetchError);
          }
          
          // If we can't extract or fetch a UUID, log a warning
          // Still return the item - let the edge function handle the validation error
          return {
            id: item.id,
            title: item.title,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
            slug: item.slug, // Include slug for shipping calculation
            is_marketplace: item.is_marketplace,
            business_id: item.business_id,
            shipping_cost: item.shipping_cost,
            shipping_required: item.shipping_required,
          };
        }));

        // Create request headers
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        // Only add authorization header if we have a token (for logged-in users)
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }

        // Create Stripe checkout session with proper error handling

        // Ensure loading state is active before making the API call
        // This guarantees both buttons show loading state during the API call
        if (!isSubmittingLocal) {
          setIsSubmittingLocal(true);
        }
        if (setIsSubmitting) {
          setIsSubmitting(true);
        }
        
        const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            cartItems: transformedCartItems,
            shippingInfo: apiShippingInfo,
            currency: country === 'Republic of Ireland' ? 'EUR' : 'GBP',
            discount: discount
          }),
        });

        if (!response.ok) {
          let errorMessage = `Server returned ${response.status}: ${response.statusText}`;
          
          // Try to parse error response for more details
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (parseError) {
            console.error('Failed to parse error response:', await response.text());
          }
          
          console.error('API Error:', errorMessage);
          throw new Error(errorMessage);
        }

        const responseData = await response.json();

        if (responseData?.url) {

          window.location.href = responseData.url;
          
          // Fallback: If the first method doesn't work, try opening in the same tab
          setTimeout(() => {
            if (document.hidden) return; // Don't execute if page has already navigated away
            window.open(responseData.url, '_self');
          }, 1000);
          
          return; // Important: stop execution here
        }
        
        // If we reach this point, no URL was returned
        throw new Error('No checkout URL returned from server');
        
      } catch (apiError) {
        console.error('API request failed:', apiError);
        throw apiError; // Re-throw to be handled by outer catch
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setIsSubmittingLocal(false);
      
      // Reset parent component's submitting state if the prop is provided
      if (setIsSubmitting) {
        setIsSubmitting(false);
      }
      
      // Reset step if there's an error
      if (onStepChange) {
        onStepChange(1);
      }
      
      toast.error(error instanceof Error ? error.message : "Failed to process checkout. Please try again.");
    }
  };

  const onInvalid = (errors: any) => {
    const firstField = Object.keys(errors)[0];
    if (firstField) {
      const el = document.querySelector(`[name="${firstField}"]`) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (el as HTMLElement).focus();
      }
    }
    // Show more detailed error message to help debug
    const errorMessages = Object.values(errors).map((err: any) => err?.message || 'Invalid field').join(', ');
    toast.error(`Please fix the highlighted fields: ${errorMessages}`);
  };

  // Function to determine country based on county selection
  const getCountryFromCounty = (countyName: string): 'Republic of Ireland' | 'Northern Ireland' => {
    const northernIrelandCounties = ['Antrim', 'Armagh', 'Down', 'Fermanagh', 'Derry', 'Tyrone'];
    return northernIrelandCounties.includes(countyName) ? 'Northern Ireland' : 'Republic of Ireland';
  };

  // Handle county change and automatically set country - FIXED VERSION
  const handleCountyChange = (selectedCounty: string) => {
    // Update the form field immediately
    form.setValue('county', selectedCounty);
    
    // Determine country based on selected county
    const newCountry = getCountryFromCounty(selectedCounty);
    
    // Update country state immediately
    setCountry(newCountry);
    
    // Notify parent component of country change immediately
    if (onCountryChange) {
      onCountryChange(newCountry);
    }
    
    // Save updated data
    if (shouldSaveChanges.current && formDataLoaded) {
      const currentFormValues = form.getValues();
      saveFormData({ ...currentFormValues, county: selectedCounty }, newCountry);
    }
  };

  return (
    <Form {...form}>
      <form 
        id="checkout-form" 
        ref={formRef}
        onSubmit={form.handleSubmit(onSubmit, onInvalid)} 
        className="space-y-6"
      >
        <Card className="overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <Mail className="h-5 w-5 text-brand-soft-green mr-2" />
              <h2 className="text-lg font-semibold text-brand-dark-green">Contact Information</h2>
              {!checkoutAsGuest && user && (
                <span className="text-sm text-brand-soft-green ml-auto">
                  Using your saved information
                </span>
              )}
            </div>
          </div>
          
          <CardContent className="p-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Email Address <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="your.email@example.com" {...field} className="focus:border-brand-soft-green" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={country === 'Republic of Ireland' ? '087 1234567' : '028 1234 5678'} 
                      {...field}
                      onChange={(e) => {
                        const filteredValue = handlePhoneInput(e.target.value);
                        field.onChange(filteredValue);
                      }}
                      className="focus:border-brand-soft-green" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <User className="h-5 w-5 text-brand-soft-green mr-2" />
              <h2 className="text-lg font-semibold text-brand-dark-green">Customer Information</h2>
            </div>
          </div>
          
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} className="focus:border-brand-soft-green" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} className="focus:border-brand-soft-green" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <MapPin className="h-5 w-5 text-brand-soft-green mr-2" />
              <h2 className="text-lg font-semibold text-brand-dark-green">Shipping Address</h2>
            </div>
          </div>
          
          <CardContent className="p-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="addressLine1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 1 <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="123 Main St" 
                        {...field} 
                        className="focus:border-brand-soft-green" 
                        maxLength={100}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="addressLine2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 2 (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Apartment, suite, etc." {...field} className="focus:border-brand-soft-green" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="county"
                  render={({ field }) => (
                    <FormItem>
                    <FormLabel>County <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <div className="relative">
                          <select
                            id="county"
                            className="block w-full px-4 py-2 pr-8 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-soft-green focus:border-brand-soft-green appearance-none bg-white"
                            value={field.value}
                            onChange={(e) => {
                              handleCountyChange(e.target.value);
                            }}
                          >
                            <option value="" disabled>Select a county</option>
                            {irishCounties.map((county) => (
                              <option key={county} value={county}>{county}</option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="eircode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {country === 'Republic of Ireland' ? 'Eircode' : 'Postcode'} <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={country === 'Republic of Ireland' ? 'A12 BC34' : 'BT1 1AA'} 
                          {...field}
                          className="focus:border-brand-soft-green"
                          maxLength={10}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Mobile-only submit button - for desktop the button is in OrderSummary */}
        <div className="md:hidden">
          <Button 
            type="submit"
            disabled={isSubmittingLocal}
            className="w-full py-6 bg-brand-soft-green hover:bg-brand-dark-green text-white font-medium text-base disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmittingLocal ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating Payment Session...
              </>
            ) : (
              <>
                Continue to Payment <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CheckoutForm;
