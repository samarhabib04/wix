'use client';

import { useMemo, useRef, useState, useEffect } from "react";
import { Trash2Icon, AlertCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { ImageUploader } from "@/components/seller-dashboard/forms/ImageUploader";

declare global {
  interface Window {
    google?: any;
  }
}

type PlacePrediction = {
  description: string;
  place_id: string;
};

function useGoogleMapsPlaces() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_MAP_KEY;

    if (!apiKey) {
      setLoadError("Missing NEXT_PUBLIC_MAP_KEY");
      return;
    }

    // Already loaded
    if (typeof window !== "undefined" && window.google?.maps?.places) {
      setIsLoaded(true);
      return;
    }

    const scriptId = "google-maps-js";
    const existing = typeof document !== "undefined" ? document.getElementById(scriptId) : null;

    const handleLoaded = () => {
      if (window.google?.maps?.places) {
        setIsLoaded(true);
      } else {
        setLoadError("Google Maps loaded but Places library missing");
      }
    };

    if (existing) {
      // Another component is loading it; wait for it.
      existing.addEventListener("load", handleLoaded);
      return () => existing.removeEventListener("load", handleLoaded);
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.addEventListener("load", handleLoaded);
    script.addEventListener("error", () => setLoadError("Failed to load Google Maps script"));
    document.head.appendChild(script);

    return () => {
      script.removeEventListener("load", handleLoaded);
    };
  }, []);

  return { isLoaded, loadError };
}

export default function BusinessSettingsPage() {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    dataDelete: false,
    confirmDeletion: false
  });
  
  const [geocodingStatus, setGeocodingStatus] = useState<'idle' | 'geocoding' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    businessName: "",
    address: "",
    eircode: "",
    county: "",
    website: "",
    phone: "",
    facebook: "",
    instagram: "",
    tiktok: "",
    aboutUs: "",
    newsletterOptIn: false,
  });

  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });

  const [profileImage, setProfileImage] = useState<string[]>([]);
  const [businessListingId, setBusinessListingId] = useState<string | null>(null);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  const { isLoaded: mapsLoaded, loadError: mapsLoadError } = useGoogleMapsPlaces();
  const [addressPredictions, setAddressPredictions] = useState<PlacePrediction[]>([]);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [isAddressFocused, setIsAddressFocused] = useState(false);
  const addressRequestIdRef = useRef(0);
  const hasManuallyEditedAddress = useRef(false);

  const showAddressDropdown = isAddressFocused && (addressPredictions.length > 0 || isAddressLoading);

  // Format phone number to match the format used in phone_verification_codes table
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
      const { data, error } = await supabase
        .from('phone_verification_codes')
        .select('phone_number, verified')
        .eq('verified', true);

      if (error) {
        console.error('Error checking phone verification:', error);
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
      setIsPhoneVerified(false);
    }
  };

  const mapPreviewUrl = useMemo(() => {
    if (coords.lat == null || coords.lng == null) return null;
    // Simple embed without an API key (works for display)
    return `https://www.google.com/maps?q=${coords.lat},${coords.lng}&z=15&output=embed`;
  }, [coords.lat, coords.lng]);
  
  // Load user profile data
  useEffect(() => {
    const loadProfileData = async () => {
      if (!user) return;
      
      try {
        // Get user profile data
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error loading profile:', profileError);
          return;
        }

        // Get ALL business listings for this user to pick the right one
        const { data: businessRows, error: bizError } = await supabase
          .from('business_listings')
          .select('id, name, address, eircode, county, phone, website, logo_image, banner_image, coordinates, social, opening_hours, about_us, gallery_images, description, status, admin_approved, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (bizError) {
          console.error('Error loading business listings:', bizError);
        }


        // Pick the listing that has the most data (prefer one with eircode set)
        let businessData = businessRows?.[0] ?? null;
        if (businessRows && businessRows.length > 1) {
          const withEircode = businessRows.find(b => b.eircode);
          if (withEircode) {
            businessData = withEircode;
          }
        }

        if (businessData?.id) {
          setBusinessListingId(businessData.id);
        }

        // Load profile image (logo_image from business_listings)
        if (businessData?.logo_image) {
          setProfileImage([businessData.logo_image]);
        } else {
          setProfileImage([]);
        }

        // Safely extract social media data
        const socialData = businessData?.social && typeof businessData.social === 'object' 
          ? businessData.social as Record<string, any>
          : {};

        // Get coordinates from user_profiles (latitude/longitude columns)
        let lat = typeof (profileData as any)?.["latitude"] === 'number' ? (profileData as any)["latitude"] : null;
        let lng = typeof (profileData as any)?.["longitude"] === 'number' ? (profileData as any)["longitude"] : null;

        // Also check coordinates from business_listings (coordinates JSON field)
        if ((lat == null || lng == null) && businessData?.coordinates) {
          const coords = businessData.coordinates;
          if (typeof coords === 'object' && coords !== null && 'lat' in coords && 'lng' in coords) {
            lat = typeof coords.lat === 'number' ? coords.lat : null;
            lng = typeof coords.lng === 'number' ? coords.lng : null;
          }
        }

        // Get address - prioritize business_listings address
        let addressToUse = businessData?.address || "";

        // Populate form with real data
        const phoneNumber = profileData?.phone || businessData?.phone || "";
        
        setFormData({
          businessName: profileData?.business_name || businessData?.name || "",
          address: addressToUse,
          eircode: businessData?.eircode || "",
          county: profileData?.county || businessData?.county || "",
          website: businessData?.website || "",
          phone: phoneNumber,
          facebook: socialData?.facebook || "",
          instagram: socialData?.instagram || "",
          tiktok: socialData?.tiktok || "",
          aboutUs: businessData?.about_us || "",
          newsletterOptIn: profileData?.newsletter_opt_in || false,
        });

        // Check if phone number is already verified
        if (phoneNumber) {
          await checkPhoneVerification(phoneNumber);
        }

        setCoords({
          lat,
          lng,
        });
      } catch (error) {
        console.error('Error loading profile data:', error);
        toast({
          title: "Error loading profile",
          description: "There was a problem loading your profile data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProfileData();
  }, [user, toast]);

  // Reverse geocode coordinates to get address if address is missing (only on initial load)
  useEffect(() => {
    if (
      mapsLoaded &&
      window.google?.maps &&
      (!formData.address || formData.address.trim() === "") &&
      coords.lat != null &&
      coords.lng != null &&
      !hasManuallyEditedAddress.current
    ) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode(
        { location: { lat: coords.lat, lng: coords.lng } },
        (results: any[], status: string) => {
          if (status === window.google.maps.GeocoderStatus.OK && results && results[0]) {
            setFormData((prev) => ({
              ...prev,
              address: results[0].formatted_address,
            }));
          }
        }
      );
    }
  }, [mapsLoaded, coords.lat, coords.lng]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'address') {
      hasManuallyEditedAddress.current = true;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const fetchAddressPredictions = async (input: string) => {
    if (!mapsLoaded || !window.google?.maps?.places) return;

    const trimmed = input.trim();
    if (!trimmed) {
      setAddressPredictions([]);
      return;
    }

    const requestId = ++addressRequestIdRef.current;
    setIsAddressLoading(true);

    try {
      const svc = new window.google.maps.places.AutocompleteService();
      svc.getPlacePredictions(
        {
          input: trimmed,
          // Allow addresses from anywhere in the world
        },
        (predictions: any[], status: string) => {
          if (requestId !== addressRequestIdRef.current) return;

          if (status !== window.google.maps.places.PlacesServiceStatus.OK || !predictions) {
            setAddressPredictions([]);
            setIsAddressLoading(false);
            return;
          }

          const mapped: PlacePrediction[] = predictions.map((p: any) => ({
            description: p.description,
            place_id: p.place_id,
          }));
          setAddressPredictions(mapped.slice(0, 6));
          setIsAddressLoading(false);
        }
      );
    } catch (err) {
      console.error("Error fetching address predictions:", err);
      setAddressPredictions([]);
      setIsAddressLoading(false);
    }
  };

  const selectPlace = async (prediction: PlacePrediction) => {
    if (!mapsLoaded || !window.google?.maps) return;

    try {
      setIsAddressLoading(true);
      const placesSvc = new window.google.maps.places.PlacesService(document.createElement("div"));
      placesSvc.getDetails(
        {
          placeId: prediction.place_id,
          fields: ["formatted_address", "geometry"],
        },
        (place: any, status: string) => {
          setIsAddressLoading(false);

          if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place) {
            toast({
              title: "Address selection failed",
              description: "Could not fetch place details. Please try again.",
              variant: "destructive",
            });
            return;
          }

          const formatted = place.formatted_address || prediction.description;
          const lat = place.geometry?.location?.lat?.();
          const lng = place.geometry?.location?.lng?.();

          hasManuallyEditedAddress.current = true;
          setFormData(prev => ({ ...prev, address: formatted }));
          setAddressPredictions([]);
          setIsAddressFocused(false);

          if (typeof lat === "number" && typeof lng === "number") {
            setCoords({ lat, lng });
          } else {
            setCoords({ lat: null, lng: null });
          }
        }
      );
    } catch (err) {
      console.error("Error selecting place:", err);
      setIsAddressLoading(false);
    }
  };
  
  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };
  
  const handleCheckboxChange = (field: 'dataDelete' | 'confirmDeletion', checked: boolean) => {
    setDeleteConfirmation(prev => ({
      ...prev,
      [field]: checked
    }));
  };

  const isDeleteDisabled = !deleteConfirmation.dataDelete || !deleteConfirmation.confirmDeletion;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Update user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          business_name: formData.businessName,
          county: formData.county,
          phone: formData.phone,
          newsletter_opt_in: formData.newsletterOptIn,
          latitude: coords.lat,
          longitude: coords.lng,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (profileError) {
        throw profileError;
      }

      if (businessListingId) {
        const eircodeValue = formData.eircode?.trim() || null;

        const { data: updatedBusiness, error: businessError } = await supabase
          .from('business_listings')
          .update({
            name: formData.businessName,
            address: formData.address,
            eircode: eircodeValue,
            county: formData.county,
            phone: formData.phone,
            website: formData.website,
            logo_image: profileImage.length > 0 ? profileImage[0] : null,
            coordinates: coords.lat != null && coords.lng != null 
              ? { lat: coords.lat, lng: coords.lng }
              : null,
            social: {
              facebook: formData.facebook || null,
              instagram: formData.instagram || null,
              tiktok: formData.tiktok || null
            },
            about_us: formData.aboutUs?.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', businessListingId)
          .select('id, eircode')
          .single();

        if (businessError) {
          console.error('Business update error:', businessError);
          throw businessError;
        }


        if (eircodeValue && updatedBusiness && updatedBusiness.eircode !== eircodeValue) {
        }
      } else {
      }

      toast({
        title: "Settings updated",
        description: "Your profile settings have been updated successfully.",
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error updating settings",
        description: error.message || "There was a problem updating your settings.",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteAccount = async () => {
    if (!user) return;

    setIsDeleting(true);
    try {

      // Call the edge function to delete all user data
      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) {
        console.error('Error calling delete function:', error);
        throw new Error(error.message || 'Failed to delete account');
      }

      if (data?.error) {
        console.error('Error from delete function:', data.error);
        throw new Error(data.error);
      }

      // Show success message
      toast({
        title: "Account Deleted",
        description: "Your account and all associated data have been permanently deleted.",
        variant: "default",
      });

      // Automatically sign out the user and clear session
      await signOut();

      // Navigate to home page after signing out
      router.push('/');

    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error deleting account",
        description: error.message || "There was a problem deleting your account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Profile Image */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Business Logo / Profile Image</Label>
                <p className="text-sm text-muted-foreground">
                  Upload a profile image for your business. This will appear on your business profile page.
                  You can crop and adjust the image to fit perfectly.
                </p>
                <ImageUploader
                  value={profileImage}
                  onImagesSelected={(urls) => setProfileImage(urls)}
                  onImageDeleted={() => setProfileImage([])}
                  maxImages={1}
                  bucketName="business-images"
                  folder="profiles"
                  uploaderId="business-profile-image"
                />
              </div>
            </CardContent>
          </Card>

          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                  <Label htmlFor="phone">Phone Number</Label>
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
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={isPhoneVerified}
                    required
                  />
                  {isPhoneVerified && (
                    <p className="text-xs text-gray-500">
                      Phone number has been verified and cannot be changed.
                    </p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <div className="relative">
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={(e) => {
                      handleInputChange(e);
                      fetchAddressPredictions(e.target.value);
                    }}
                    onFocus={() => {
                      setIsAddressFocused(true);
                      fetchAddressPredictions(formData.address);
                    }}
                    onBlur={() => {
                      // Delay to allow click selection
                      setTimeout(() => setIsAddressFocused(false), 150);
                    }}
                    required
                    placeholder={mapsLoadError ? "Enter address..." : "Start typing address..."}
                  />

                  {showAddressDropdown && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg">
                      {isAddressLoading && (
                        <div className="px-3 py-2 text-sm text-gray-500">Loading suggestions...</div>
                      )}
                      {!isAddressLoading && addressPredictions.length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          {mapsLoaded ? "No suggestions" : "Loading Google Maps..."}
                        </div>
                      )}
                      {!isAddressLoading &&
                        addressPredictions.map((p) => (
                          <button
                            type="button"
                            key={p.place_id}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectPlace(p)}
                          >
                            {p.description}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                {mapsLoadError && (
                  <p className="text-xs text-amber-700 mt-1">
                    Google Maps suggestions unavailable: {mapsLoadError}
                  </p>
                )}
                {formData.address && formData.address.trim() !== "" && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-md border">
                    <p className="text-sm font-medium text-gray-700 mb-1">Saved Address:</p>
                    <p className="text-sm text-gray-900">{formData.address}</p>
                  </div>
                )}
                {coords.lat != null && coords.lng != null && (
                  <p className="text-xs text-gray-500 mt-1">
                    Saved coordinates: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                  </p>
                )}
                {mapPreviewUrl && (
                  <div className="mt-3 overflow-hidden rounded-md border">
                    <iframe
                      title="Business location map"
                      src={mapPreviewUrl}
                      className="w-full h-64"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                )}
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="county">County</Label>
                  <Input
                    id="county"
                    name="county"
                    value={formData.county}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="eircode">Eircode</Label>
                  <div className="relative">
                    <Input
                      id="eircode"
                      name="eircode"
                      value={formData.eircode}
                      onChange={async (e) => {
                        handleInputChange(e);
                        // Clear any existing timeout
                        const trimmedValue = e.target.value.trim();
                        
                        if ((window as any).eircodeGeocodeTimeout) {
                          clearTimeout((window as any).eircodeGeocodeTimeout);
                        }
                        
                        // Reset status if input is too short
                        if (!trimmedValue || trimmedValue.length < 6) {
                          setGeocodingStatus('idle');
                          return;
                        }
                        
                        // Wait 500ms after user stops typing
                        (window as any).eircodeGeocodeTimeout = setTimeout(async () => {
                          const { geocodeEircode } = await import('@/lib/utils/eircode-geocoding');
                          
                          // Direct validation check (bypass potential caching issues)
                          const cleaned = trimmedValue.replace(/\s+/g, '').toUpperCase();
                          const eircodePattern = /^[ACDEFHKNPRTVWXY0-9]{3}[ACDEFHKNPRTVWXY0-9]{4}$/;
                          const isValid = cleaned.length === 7 && eircodePattern.test(cleaned);
                          
                          if (isValid) {
                            setGeocodingStatus('geocoding');
                            try {
                              const coords = await geocodeEircode(trimmedValue);
                              if (coords) {
                                setCoords({ lat: coords.lat, lng: coords.lng });
                                setGeocodingStatus('success');
                                toast({
                                  title: "Location found",
                                  description: `Successfully geocoded eircode ${trimmedValue}`,
                                });
                                setTimeout(() => setGeocodingStatus('idle'), 3000);
                              } else {
                                setGeocodingStatus('error');
                                toast({
                                  title: "Location not found",
                                  description: `Could not find location for eircode ${trimmedValue}. Please check the eircode or try entering a full address.`,
                                  variant: "destructive",
                                });
                                setTimeout(() => setGeocodingStatus('idle'), 5000);
                              }
                            } catch (error) {
                              console.error('Error geocoding eircode:', error);
                              setGeocodingStatus('error');
                              toast({
                                title: "Geocoding error",
                                description: "An error occurred while geocoding the eircode. Please try again.",
                                variant: "destructive",
                              });
                              setTimeout(() => setGeocodingStatus('idle'), 5000);
                            }
                          } else {
                            setGeocodingStatus('idle');
                          }
                        }, 500);
                      }}
                      placeholder="A65 F4E2"
                      className={geocodingStatus === 'success' ? 'border-green-500' : geocodingStatus === 'error' ? 'border-red-500' : ''}
                    />
                    {geocodingStatus === 'geocoding' && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">Geocoding...</span>
                    )}
                    {geocodingStatus === 'success' && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-green-600">✓ Location found</span>
                    )}
                    {geocodingStatus === 'error' && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-red-600">Location not found</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  placeholder="https://www.yourwebsite.com"
                />
              </div>
            </CardContent>
          </Card>
          
          {/* About Us */}
          <Card>
            <CardHeader>
              <CardTitle>About Us</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="aboutUs">About Your Business</Label>
                <p className="text-sm text-muted-foreground">
                  Tell potential customers about your business. This will appear on your public profile page.
                </p>
                <Textarea
                  id="aboutUs"
                  name="aboutUs"
                  value={formData.aboutUs}
                  onChange={handleInputChange}
                  placeholder="Tell us about your business, what services you offer, your experience, etc."
                  rows={6}
                  maxLength={5000}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {formData.aboutUs.length}/5000 characters
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Social Media */}
          <Card>
            <CardHeader>
              <CardTitle>Social Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook</Label>
                  <div className="flex">
                    <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500">
                      facebook.com/
                    </span>
                    <Input
                      id="facebook"
                      name="facebook"
                      value={formData.facebook}
                      onChange={handleInputChange}
                      className="rounded-l-none"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <div className="flex">
                    <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500">
                      @
                    </span>
                    <Input
                      id="instagram"
                      name="instagram"
                      value={formData.instagram}
                      onChange={handleInputChange}
                      className="rounded-l-none"
                    />
                  </div>
                </div>
                
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="tiktok">TikTok</Label>
                  <div className="flex">
                    <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500">
                      @
                    </span>
                    <Input
                      id="tiktok"
                      name="tiktok"
                      value={formData.tiktok}
                      onChange={handleInputChange}
                      className="rounded-l-none"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Switch
                  id="newsletterOptIn"
                  checked={formData.newsletterOptIn}
                  onCheckedChange={(checked) => handleSwitchChange("newsletterOptIn", checked)}
                />
                <Label htmlFor="newsletterOptIn">
                  Receive Dog Quest newsletter and updates
                </Label>
              </div>
            </CardContent>
          </Card>
          
          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              type="submit" 
              className="bg-brand-soft-green hover:bg-brand-dark-green"
            >
              Save Changes
            </Button>
          </div>
          
          {/* Delete Account */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold">Delete Account</h3>
                  <p className="text-sm text-muted-foreground">
                    This will permanently delete your business account and remove all your data.
                  </p>
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={isDeleting}>
                      <Trash2Icon className="mr-1 h-4 w-4" />
                      {isDeleting ? 'Deleting...' : 'Delete Account'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertCircleIcon className="h-5 w-5 text-destructive" />
                        Delete Account
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your business account, 
                        remove your listings, and remove your data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    
                    <div className="space-y-4 py-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="dataDelete"
                          checked={deleteConfirmation.dataDelete}
                          onCheckedChange={(checked) => handleCheckboxChange('dataDelete', checked as boolean)}
                        />
                        <Label htmlFor="dataDelete" className="text-sm">
                          I understand my data will be permanently deleted.
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="confirmDeletion"
                          checked={deleteConfirmation.confirmDeletion}
                          onCheckedChange={(checked) => handleCheckboxChange('confirmDeletion', checked as boolean)}
                        />
                        <Label htmlFor="confirmDeletion" className="text-sm">
                          I confirm the deletion of my account and I understand this action is irreversible.
                        </Label>
                      </div>
                    </div>
                    
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteAccount}
                        disabled={isDeleteDisabled || isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDeleting ? 'Deleting Account...' : 'Delete Account'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}

