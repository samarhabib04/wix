'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { AvatarUploader } from "@/components/ui/avatar-uploader";
import AuthLayout from "@/components/auth/AuthLayout";
import { User, Phone, MapPin, Building, FileText, Loader2, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { irishCounties, validateIrishPhoneNumber } from "@/lib/utils/irish-data";
import PhoneVerification from "@/components/auth/PhoneVerification";
import { supabase } from "@/lib/supabase/client";
import { sanitizeRegistrationRole } from "@/types/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PuppyStarterKitModal } from "@/components/PuppyStarterKitModal";
import { ColourCodedCollarsModal } from "@/components/ColourCodedCollarsModal";

const phoneSchema = z.string()
  .refine((value) => {
    if (!value || value.trim() === '') {
      return true; // Allow empty values
    }
    return validateIrishPhoneNumber(value);
  }, {
    message: "Please enter a valid phone number (South Africa, USA, Ireland, or Canada)",
  });

const onboardingSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  role: z.enum(["buyer", "seller", "business"]),
  county: z.string().min(1, { message: "County is required" }),
  phone: phoneSchema.optional(),
  businessName: z.string().optional(),
  sellerId: z.string().max(30, { message: "Seller ID must be 30 characters or less" }).transform((val) => val === "" ? undefined : val).optional(),
  dbeId: z.string().max(30, { message: "DBE ID must be 30 characters or less" }).transform((val) => val === "" ? undefined : val).optional(),
  newsletterOptIn: z.boolean(),
  avatarUrl: z.string().optional(),
}).refine((data) => {
  if (data.role === "seller" || data.role === "business") {
    return data.phone && data.phone.trim().length > 0;
  }
  return true;
}, {
  message: "Phone number is required for sellers and businesses",
  path: ["phone"],
}).refine((data) => {
  if (data.role === "business") {
    return data.businessName && data.businessName.length > 0;
  }
  return true;
}, {
  message: "Business name is required for business accounts",
  path: ["businessName"],
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

export default function Onboarding() {
  const { user, session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [existingRole, setExistingRole] = useState<string | null>(null);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [showPuppyKitModal, setShowPuppyKitModal] = useState(false);
  const [showCollarsModal, setShowCollarsModal] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const router = useRouter();

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      role: "buyer",
      county: "",
      phone: "",
      businessName: "",
      sellerId: "",
      dbeId: "",
      newsletterOptIn: true,
      avatarUrl: "",
    },
  });

  const selectedRole = form.watch("role");
  const watchedPhone = form.watch("phone");

  // Check phone verification when phone number changes
  useEffect(() => {
    if (watchedPhone && watchedPhone.trim() !== '' && (selectedRole === "seller" || selectedRole === "business")) {
      checkPhoneVerification(watchedPhone);
    } else if (!watchedPhone || watchedPhone.trim() === '') {
      setIsPhoneVerified(false);
    }
  }, [watchedPhone, selectedRole]);

  const handlePuppyKitModalClose = () => {
    setShowPuppyKitModal(false);
    localStorage.setItem('puppyStarterKitModalSeen', 'true');
    // Navigate to buyer dashboard after modal is closed
    router.push('/my-buyer-dashboard');
  };

  const handleCollarsModalClose = () => {
    setShowCollarsModal(false);
    localStorage.setItem('colourCodedCollarsModalSeen', 'true');
    // Navigate to seller dashboard after modal is closed
    router.push('/my-seller-dashboard');
  };

  // Format phone number to match the format used in phone_verification_codes table
  // Remove all spaces and keep the original format if it already has a country code
  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    
    // Remove all spaces, dashes, and parentheses
    let formattedPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // If it already starts with +, keep it as is (already has country code)
    if (formattedPhone.startsWith('+')) {
      return formattedPhone;
    }
    
    // If it starts with 0, replace 0 with +353 (Irish number)
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+353' + formattedPhone.substring(1);
    } else {
      // If no country code, assume Irish
      formattedPhone = '+353' + formattedPhone;
    }
    
    return formattedPhone;
  };

  // Check if phone number is already verified
  const checkPhoneVerification = async (phoneNumber: string) => {
    if (!phoneNumber || phoneNumber.trim() === '') {
      setIsPhoneVerified(false);
      return;
    }

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      // Use a simpler query - get all verified records and check client-side
      // This helps bypass potential RLS issues with complex queries
      const { data, error } = await supabase
        .from('phone_verification_codes')
        .select('phone_number, verified')
        .eq('verified', true);

      if (error) {
        console.error('Error checking phone verification:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        setIsPhoneVerified(false);
        return;
      }

      if (data && Array.isArray(data)) {
        // Normalize both the formatted phone and database phones for comparison
        const normalizedFormatted = formattedPhone.replace(/[\s\-\(\)]/g, '').toLowerCase();
        
        const match = data.find(record => {
          if (!record.phone_number) return false;
          const normalizedRecord = record.phone_number.replace(/[\s\-\(\)]/g, '').toLowerCase();
          return normalizedRecord === normalizedFormatted;
        });

        if (match && match.verified === true) {
          setIsPhoneVerified(true);
          return;
        }
      }

      setIsPhoneVerified(false);
    } catch (error) {
      console.error('Exception checking phone verification:', error);
      console.error('Exception details:', JSON.stringify(error, null, 2));
      setIsPhoneVerified(false);
    }
  };

  // Fetch existing user profile data on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) {
        setIsLoadingProfile(false);
        return;
      }

      try {
        const { data: profileData, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error("❌ Error fetching profile:", error);
          // If no profile exists, show role selection
          setShowRoleSelection(true);
          setIsProfileComplete(false);
        } else if (profileData) {
          // Set existing role and profile completion status
          setExistingRole(profileData.role);
          setIsProfileComplete(profileData.profile_complete || false);
          
          // Only show role selection if the user doesn't have a role yet
          setShowRoleSelection(!profileData.role || profileData.role === '');

          // Pre-populate form with existing data
          const validRole = (profileData.role === "buyer" || profileData.role === "seller" || profileData.role === "business") 
            ? profileData.role 
            : "buyer";

          const phoneNumber = profileData.phone || "";

          form.reset({
            firstName: profileData.first_name || user.user_metadata?.first_name || "",
            lastName: profileData.last_name || user.user_metadata?.last_name || "",
            role: validRole,
            county: profileData.county || "",
            phone: phoneNumber,
            businessName: profileData.business_name || "",
            sellerId: profileData.seller_id || "",
            dbeId: profileData.dbe_id || "",
            newsletterOptIn: profileData.newsletter_opt_in || false,
            avatarUrl: profileData.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || "",
          });

          // Check if phone number is already verified (after form reset to ensure phone is set)
          if (phoneNumber && (validRole === "seller" || validRole === "business")) {
            await checkPhoneVerification(phoneNumber);
          } else {
            setIsPhoneVerified(false);
          }
        }
      } catch (error) {
        console.error("❌ Error in fetchUserProfile:", error);
        setShowRoleSelection(true);
        setIsProfileComplete(false);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, [user, form]);

  const validateForm = () => {
    const formData = form.getValues();
    const result = onboardingSchema.safeParse(formData);
    
    if (!result.success) {
      const errors = result.error.issues.map(err => `${err.path.join('.')}: ${err.message}`);
      setValidationErrors(errors);
      
      form.trigger();
      return false;
    }
    
    setValidationErrors([]);
    return true;
  };

  const updateProfileDirectly = async (data: OnboardingFormData) => {
    if (!user?.id) {
      throw new Error('No user ID available');
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone || "",
        county: data.county,
        role: data.role,
        newsletter_opt_in: data.newsletterOptIn,
        business_name: data.businessName || "",
        seller_id: data.sellerId || "",
        dbe_id: data.dbeId || "",
        avatar_url: data.avatarUrl || "",
        profile_complete: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) {
      console.error('❌ Direct profile update failed:', error);
      throw error;
    }
  };

  const onSubmit = async (data: OnboardingFormData) => {
    if (!user) {
      console.error("❌ No user found");
      const error = "Authentication error: Please log in again";
      setSubmitError(error);
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: error,
      });
      return;
    }

    // Check phone verification for seller and business roles
    if ((data.role === "seller" || data.role === "business") && !isPhoneVerified) {
      toast({
        variant: "destructive",
        title: "Phone Verification Required",
        description: "Please verify your phone number before completing registration"
      });
      return;
    }

    setSubmitError(null);
    setValidationErrors([]);

    try {
      setIsLoading(true);
      
      // Direct profile update without complex session validation
      await updateProfileDirectly(data);

      // CRITICAL: Upsert role into user_roles table (single source of truth)
      try {
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert(
            { user_id: user.id, role: sanitizeRegistrationRole(data.role) },
            { onConflict: 'user_id,role' }
          );
        
        if (roleError) {
          console.error('❌ Failed to update user_roles:', roleError);
          // Don't block onboarding if role table update fails
        }
      } catch (roleUpdateError) {
        console.error('❌ Error updating user_roles:', roleUpdateError);
      }

      
      // After successful profile update, check if we should show modals
      const shouldShowPuppyKitModal = (
        data.role === "buyer" && 
        !localStorage.getItem('puppyStarterKitModalSeen') &&
        !isProfileComplete // Only for users completing profile for first time
      );

      const shouldShowCollarsModal = (
        (data.role === "seller" || data.role === "business") && 
        !localStorage.getItem('colourCodedCollarsModalSeen') &&
        !isProfileComplete // Only for users completing profile for first time
      );

      toast({
        title: `Welcome to Dog Quest, ${data.firstName}!`,
        description: "Your profile has been completed successfully.",
      });

      // Show puppy kit modal for new buyers, otherwise redirect immediately
      if (shouldShowPuppyKitModal) {
        setShowPuppyKitModal(true);
        // Don't navigate yet - let the modal handle the next step
      } else {
        // Redirect based on role
        if (data.role === "seller") {
          router.push('/my-seller-dashboard');
        } else if (data.role === "business") {
          router.push('/my-business-dashboard');
        } else {
          router.push('/my-buyer-dashboard');
        }
      }

    } catch (error: any) {
      console.error("❌ Onboarding error:", error);
      let errorMessage = error?.message || "Failed to update profile. Please try again.";
      
      if (error.message?.includes('permission denied')) {
        errorMessage = "Database permission error. Please contact support if this persists.";
      }
      
      setSubmitError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please check the form for errors and try again.",
      });
      return;
    }

    form.handleSubmit(onSubmit)(e);
  };

  // Show loading while fetching profile
  if (isLoadingProfile) {
    return (
      <AuthLayout 
        title="Loading your profile..." 
        description="Please wait while we fetch your information"
      >
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AuthLayout>
    );
  }

  // Show puppy kit modal when needed
  if (showPuppyKitModal) {
    return (
      <PuppyStarterKitModal 
        isOpen={showPuppyKitModal} 
        onClose={handlePuppyKitModalClose} 
      />
    );
  }

  // Show collars modal when needed
  if (showCollarsModal) {
    return (
      <ColourCodedCollarsModal 
        isOpen={showCollarsModal} 
        onClose={handleCollarsModalClose} 
      />
    );
  }

  return (
    <AuthLayout 
      title="Complete your profile" 
      description="Help us personalize your Dog Quest experience"
    >
      <Form {...form}>
        <form onSubmit={handleFormSubmit} className="space-y-6">
          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Please fix the following errors:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <FormField
            control={form.control}
            name="avatarUrl"
            render={({ field }) => (
              <FormItem className="flex flex-col items-center">
                <FormLabel>Profile Picture (Optional)</FormLabel>
                <FormControl>
                  <AvatarUploader
                    value={field.value || null}
                    onChange={(url) => field.onChange(url)}
                    userId={user?.id || ""}
                    size="lg"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input placeholder="John" className="pl-10" {...field} />
                    </div>
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
                  <FormLabel>Last Name *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input placeholder="Doe" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Only show role selection if needed */}
          {showRoleSelection && (
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>What brings you to Dog Quest? *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="buyer" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          I'm a Buyer - Looking for a dog companion
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="seller" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          I'm a Seller (Breeder) - Breeding and selling dogs
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="business" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          I'm a Business - Vet, groomer, pet store, or other pet service
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Show current role if not showing selection */}
          {!showRoleSelection && existingRole && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Your Role:</strong> {existingRole === 'buyer' ? 'Buyer - Looking for a dog companion' : 
                                           existingRole === 'seller' ? 'Seller (Breeder) - Breeding and selling dogs' : 
                                           'Business - Pet services'}
              </p>
            </div>
          )}

          {selectedRole === "business" && (
            <FormField
              control={form.control}
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Name *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input placeholder="ABC Veterinary Clinic" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="county"
            render={({ field }) => (
              <FormItem>
                <FormLabel>County *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="pl-10">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
                      <SelectValue placeholder="Select a county" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg z-[9999] max-h-60 overflow-y-auto">
                    {irishCounties.map((county) => (
                      <SelectItem key={county} value={county} className="hover:bg-gray-100 cursor-pointer">
                        {county}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {(selectedRole === "seller" || selectedRole === "business") && (
            <>
              {/* <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-900">
                  <strong>Important:</strong> Please include your country code prefix when entering your phone number.
                  <ul className="mt-2 ml-4 list-disc space-y-1">
                    <li><strong>Ireland:</strong> Use +353 and drop the first 0 (e.g., 087 123 4567 → +353 87 123 4567)</li>
                    <li><strong>UK/NI:</strong> Use +44 and drop the first 0 (e.g., 07123 456789 → +44 7123 456789)</li>
                    <li><strong>Other countries:</strong> Include country code with + prefix</li>
                  </ul>
                </AlertDescription>
              </Alert> */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                    <FormLabel>Phone Number *</FormLabel>
                      {isPhoneVerified && (
                        <span className="text-xs flex items-center text-emerald-600">
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            viewBox="0 0 24 24" 
                            fill="currentColor" 
                            className="w-4 h-4 mr-1"
                          >
                            <path 
                              fillRule="evenodd" 
                              d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" 
                              clipRule="evenodd" 
                            />
                          </svg>
                          Verified
                        </span>
                      )}
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input 
                          placeholder="+353 87 123 4567" 
                          className="pl-10" 
                          {...field}
                          maxLength={20}
                          disabled={isPhoneVerified}
                          onInput={(e) => {
                            if (!isPhoneVerified) {
                            const target = e.target as HTMLInputElement;
                            target.value = target.value.replace(/[^0-9\s\-\+\(\)]/g, '');
                            }
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      For Ireland: Enter as +353 87 123 4567 (drop the first 0). For UK: +44 7XXX XXX XXX. Include country code for other countries.
                    </FormDescription>
                    {isPhoneVerified && (
                      <p className="text-xs text-gray-500 mt-1">
                        Phone number has been verified and cannot be changed.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {(selectedRole === "seller" || selectedRole === "business") && watchedPhone && validateIrishPhoneNumber(watchedPhone) && !isPhoneVerified && (
            <PhoneVerification
              phone={watchedPhone}
              onVerified={setIsPhoneVerified}
              isRequired={true}
            />
          )}

          {selectedRole === "seller" && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="sellerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seller ID (optional)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input placeholder="SEL12345" className="pl-10" maxLength={30} {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dbeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DBE ID (optional)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input placeholder="DBE12345" className="pl-10" maxLength={30} {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </>
          )}

          <FormField
            control={form.control}
            name="newsletterOptIn"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-sm">
                    Subscribe to our newsletter for updates and tips
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />

          <Button 
            type="submit" 
            className="w-full bg-brand-dark-green hover:bg-brand-dark-green/90"
            disabled={isLoading || ((selectedRole === "seller" || selectedRole === "business") && !isPhoneVerified)}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Completing profile...
              </>
            ) : (
              "Complete profile"
            )}
          </Button>
        </form>
      </Form>
    </AuthLayout>
  );
}
