'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Upload, Clock, Home, Building, Crop } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ImageCropper } from "@/components/seller-dashboard/forms/ImageCropper";
import { ImageUploader } from "@/components/seller-dashboard/forms/ImageUploader";
import { validateIrishPhoneNumber, irishCounties } from "@/lib/utils/irish-data";
import { useDraftSaving } from "@/hooks/useDraftSaving";
import DraftManager from "@/components/DraftManager";
import { useAuth } from "@/contexts/AuthContext";
import NavigationSection from "@/components/NavigationSection";
import dynamic from "next/dynamic";
import { BUSINESS_SERVICE_TYPE_VALUES } from '@/lib/config/business-service-types';
import { compressImageForUpload } from "@/lib/media/compressImage";

// Dynamically import ServicesMap with SSR disabled
const ServicesMap = dynamic(() => import('@/components/services/ServicesMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center bg-gray-100">Loading map...</div>
});

declare global {
  interface Window {
    google?: any;
  }
}

type PlacePrediction = {
  description: string;
  place_id: string;
};

const businessTypes = BUSINESS_SERVICE_TYPE_VALUES;

const daysOfWeek = [
  "Monday",
  "Tuesday", 
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

const timeSlots = [
  "00:00", "00:30", "01:00", "01:30", "02:00", "02:30", "03:00", "03:30",
  "04:00", "04:30", "05:00", "05:30", "06:00", "06:30", "07:00", "07:30",
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
  "20:00", "20:30", "21:00", "21:30", "22:00", "22:30", "23:00", "23:30"
];

const openingHoursSchema = z.object({
  isClosed: z.boolean().default(false),
  is24Hours: z.boolean().default(false),
  openTime: z.string().optional(),
  closeTime: z.string().optional(),
}).refine((data) => {
  if (!data.isClosed && !data.is24Hours) {
    return data.openTime && data.closeTime;
  }
  return true;
}, {
  message: "Open and close times are required when not closed or 24 hours",
});

const formSchema = z.object({
  businessName: z.string().min(2, {
    message: "Business name must be at least 2 characters.",
  }),
  businessType: z.string().min(1, {
    message: "Please select a business type.",
  }),
  otherBusinessType: z.string().optional(),
  contactEmail: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phoneNumber: z.string().min(1, {
    message: "Please enter a phone number.",
  }).refine(validateIrishPhoneNumber, {
    message: "Please enter a valid phone number (South Africa, USA, Ireland, or Canada).",
  }),
  websiteUrl: z.string().optional().refine((val) => {
    if (!val || val.trim() === '' || val === 'https://') return true;
    try {
      new URL(val);
      return true;
    } catch {
      return false;
    }
  }, {
    message: "Please enter a valid URL including http:// or https://",
  }),
  eircode: z.string().optional(),
  county: z.string().min(1, {
    message: "Please enter a county, state, or province.",
  }),
  streetAddress: z.string().min(5, {
    message: "Please enter your street address.",
  }),
  townCity: z.string().min(2, {
    message: "Please enter your town or city.",
  }),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  tiktok: z.string().optional(),
  description: z.string().max(400, {
    message: "Description must not exceed 400 characters.",
  }).min(20, {
    message: "Description must be at least 20 characters."
  }),
  openingHours: z.record(z.string(), openingHoursSchema).refine((hours) => {
    const hasAtLeastOneOpenDay = Object.values(hours).some(day => !day.isClosed);
    return hasAtLeastOneOpenDay;
  }, {
    message: "At least one day must be open for business. Please set opening hours for at least one day.",
    path: ["root"]
  }),
  about_us: z.string().max(5000, {
    message: "About Us content must not exceed 5000 characters.",
  }).optional(),
  gallery_images: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ExtendedFormValues extends FormValues {
  logoPreview?: string | null;
  coverPreview?: string | null;
  coords?: { lat: number | null; lng: number | null };
}

export default function ServiceSubmissionForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const submitInFlightRef = React.useRef(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  
  // Crop dialog states
  const [logoCropOpen, setLogoCropOpen] = useState(false);
  const [logoCropSrc, setLogoCropSrc] = useState<string | null>(null);
  const [coverCropOpen, setCoverCropOpen] = useState(false);
  const [coverCropSrc, setCoverCropSrc] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });
  const [eircodeGeocodingStatus, setEircodeGeocodingStatus] = useState<'idle' | 'geocoding' | 'success' | 'error'>('idle');
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [addressPredictions, setAddressPredictions] = useState<PlacePrediction[]>([]);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [isAddressFocused, setIsAddressFocused] = useState(false);
  const addressRequestIdRef = React.useRef(0);
  const hasManuallyEditedAddress = React.useRef(false);
  const hasLoadedFromSettings = React.useRef(false);
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      businessName: "",
      businessType: "",
      otherBusinessType: "",
      contactEmail: "",
      phoneNumber: "",
      websiteUrl: "https://",
      eircode: "",
      county: "",
      streetAddress: "",
      townCity: "",
      facebook: "",
      instagram: "",
      tiktok: "",
      description: "",
      openingHours: daysOfWeek.reduce((acc, day) => {
        acc[day] = {
          isClosed: false,
          is24Hours: false,
          openTime: "09:00",
          closeTime: "18:00",
        };
        return acc;
      }, {} as Record<string, z.infer<typeof openingHoursSchema>>),
      about_us: "",
      gallery_images: [],
    },
  });

  // Load Google Maps
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_MAP_KEY;
    if (!apiKey) return;

    if (typeof window !== "undefined" && window.google?.maps?.places) {
      setMapsLoaded(true);
      return;
    }

    const scriptId = "google-maps-js";
    const existing = document.getElementById(scriptId);

    const handleLoaded = () => {
      if (window.google?.maps?.places) {
        setMapsLoaded(true);
      }
    };

    if (existing) {
      existing.addEventListener("load", handleLoaded);
      return () => existing.removeEventListener("load", handleLoaded);
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.addEventListener("load", handleLoaded);
    document.head.appendChild(script);

    return () => {
      script.removeEventListener("load", handleLoaded);
    };
  }, []);

  // Check if user has an active subscription
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setIsCheckingSubscription(false);
        setHasSubscription(false);
        return;
      }

      try {
        // First, try to get user's business listing
        const { data: businessListing, error: businessError } = await supabase
          .from('business_listings')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (businessError && businessError.code !== 'PGRST116') {
          console.error('Error fetching business listing for subscription check:', businessError);
          setIsCheckingSubscription(false);
          setHasSubscription(false);
          return;
        }

        let hasActiveSubscription = false;

        // Check business_subscriptions table by user_id (preferred method)
        const { data: subscription, error: subError } = await supabase
          .from('business_subscriptions' as any)
          .select('subscription_tier, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!subError && subscription) {
          const tier = (subscription as any).subscription_tier;
          // Only premium or elite_marketplace have About Us feature
          hasActiveSubscription = tier === 'premium' || tier === 'elite_marketplace';
        }

        setHasSubscription(hasActiveSubscription);
      } catch (error) {
        console.error('Error checking subscription:', error);
        setHasSubscription(false);
      } finally {
        setIsCheckingSubscription(false);
      }
    };

    checkSubscription();
  }, [user]);

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
          // No country restriction - allow global locations
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
          fields: ["formatted_address", "geometry", "address_components"],
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

          // Parse address components
          const addressComponents = place.address_components || [];
          let streetNumber = "";
          let route = "";
          let townCity = "";
          let county = "";

          addressComponents.forEach((component: any) => {
            const types = component.types;
            if (types.includes("street_number")) {
              streetNumber = component.long_name;
            }
            if (types.includes("route")) {
              route = component.long_name;
            }
            if (types.includes("locality") || types.includes("postal_town") || types.includes("sublocality")) {
              if (!townCity) {
              townCity = component.long_name;
            }
            }
            // Get county/state/province from various address component types
            if (types.includes("administrative_area_level_1")) {
              county = component.long_name;
            } else if (types.includes("administrative_area_level_2") && !county) {
              county = component.long_name;
            }
          });

          // Update form fields
          const fullStreetAddress = [streetNumber, route].filter(Boolean).join(" ");
          if (fullStreetAddress) {
            form.setValue("streetAddress", fullStreetAddress);
          } else {
            // Fallback: use first part of formatted address
            const parts = formatted.split(",");
            if (parts.length > 0) {
              form.setValue("streetAddress", parts[0].trim());
            }
          }
          
          if (townCity) {
            form.setValue("townCity", townCity);
          } else {
            // Try to extract from formatted address
            const parts = formatted.split(",");
            if (parts.length > 1) {
              form.setValue("townCity", parts[1].trim());
            }
          }
          
          // Set county/state/province for any location
          if (county) {
            form.setValue("county", county);
          }

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

  const showAddressDropdown = isAddressFocused && (addressPredictions.length > 0 || isAddressLoading);

  const formValues = form.watch();

  // Reverse geocode coordinates to get address if address is missing
  useEffect(() => {
    const streetAddress = formValues.streetAddress;
    if (
      mapsLoaded &&
      window.google?.maps &&
      (!streetAddress || streetAddress.trim() === "") &&
      coords.lat != null &&
      coords.lng != null &&
      !hasManuallyEditedAddress.current
    ) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode(
        { location: { lat: coords.lat, lng: coords.lng } },
        (results: any[], status: string) => {
          if (status === window.google.maps.GeocoderStatus.OK && results && results[0]) {
            const formatted = results[0].formatted_address;
            
            // Parse address components
            const addressComponents = results[0].address_components || [];
            let streetNumber = "";
            let route = "";
            let townCity = "";
            let county = "";

            addressComponents.forEach((component: any) => {
              const types = component.types;
              if (types.includes("street_number")) {
                streetNumber = component.long_name;
              }
              if (types.includes("route")) {
                route = component.long_name;
              }
              if (types.includes("locality") || types.includes("postal_town") || types.includes("sublocality")) {
                if (!townCity) {
                townCity = component.long_name;
              }
              }
              // Get county/state/province from various address component types
              if (types.includes("administrative_area_level_1")) {
                county = component.long_name;
              } else if (types.includes("administrative_area_level_2") && !county) {
                county = component.long_name;
              }
            });

            // Update form fields
            const fullStreetAddress = [streetNumber, route].filter(Boolean).join(" ");
            if (fullStreetAddress) {
              form.setValue("streetAddress", fullStreetAddress);
            } else {
              // Fallback: use first part of formatted address
              const parts = formatted.split(",");
              if (parts.length > 0) {
                form.setValue("streetAddress", parts[0].trim());
              }
            }
            
            if (townCity) {
              form.setValue("townCity", townCity);
            } else {
              // Try to extract from formatted address
              const parts = formatted.split(",");
              if (parts.length > 1) {
                form.setValue("townCity", parts[1].trim());
              }
            }
            
            // Set county/state/province for any location
            if (county) {
              form.setValue("county", county);
            }
          }
        }
      );
    }
  }, [mapsLoaded, coords.lat, coords.lng, formValues.streetAddress, form]);
  const extendedFormValues: ExtendedFormValues = {
    ...formValues,
    logoPreview,
    coverPreview,
    coords,
  };

  const {
    drafts,
    currentDraftId,
    isAutoSaving,
    lastSaved,
    autoSaveDraft,
    saveDraft,
    loadDraft,
    deleteDraft,
    createNewDraft,
  } = useDraftSaving(extendedFormValues, currentUser, 'business');

  const businessType = form.watch("businessType");

  useEffect(() => {
    if (!currentUser || !formValues) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const hasData = Object.values(formValues).some(value => {
        if (typeof value === 'string') return value.trim() !== '' && value !== 'https://';
        if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
        return false;
      });

      const hasImages = logoPreview || coverPreview;

      if (hasData || hasImages) {
        autoSaveDraft();
        event.preventDefault();
        event.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [formValues, currentUser, autoSaveDraft, logoPreview, coverPreview]);

  useEffect(() => {
    const checkAuth = async () => {
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to submit a business listing.",
          variant: "destructive",
        });
        router.push("/auth/login");
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setCurrentUser(user);

      if (profile) {
        form.setValue('contactEmail', profile.email || user.email || '');
        form.setValue('phoneNumber', profile.phone || '');
        if (profile.business_name) {
          form.setValue('businessName', profile.business_name);
        }
      }

      // Fetch address and county from settings (user_profiles and business_listings)
      try {
        // Get business listing data if it exists
        const { data: businessData } = await supabase
          .from('business_listings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        // Get address - prioritize business_listings address
        let addressToUse = businessData?.address || "";
        let countyToUse = profile?.county || businessData?.county || "";

        // Get coordinates from user_profiles (latitude/longitude columns)
        let lat = typeof (profile as any)?.["latitude"] === 'number' ? (profile as any)["latitude"] : null;
        let lng = typeof (profile as any)?.["longitude"] === 'number' ? (profile as any)["longitude"] : null;

        // Also check coordinates from business_listings (coordinates JSON field)
        if ((lat == null || lng == null) && businessData?.coordinates) {
          const coords = businessData.coordinates;
          if (typeof coords === 'object' && coords !== null && 'lat' in coords && 'lng' in coords) {
            lat = typeof coords.lat === 'number' ? coords.lat : null;
            lng = typeof coords.lng === 'number' ? coords.lng : null;
          }
        }

        // If we have address, parse it into streetAddress and townCity
        if (addressToUse && addressToUse.trim() !== "") {
          const addressParts = addressToUse.split(',').map((part: string) => part.trim());
          if (addressParts.length >= 2) {
            form.setValue('streetAddress', addressParts[0]);
            form.setValue('townCity', addressParts.slice(1).join(', '));
          } else {
            form.setValue('streetAddress', addressToUse);
          }
        }

        // Set county if available
        if (countyToUse && countyToUse.trim() !== "") {
          form.setValue('county', countyToUse);
        }

        // Set coordinates
        if (lat != null && lng != null) {
          setCoords({ lat, lng });
        }

        hasLoadedFromSettings.current = true;
      } catch (error) {
        console.error('Error loading location data from settings:', error);
      }
    };

    checkAuth();
  }, [user, router, toast, form]);

  const handleLoadDraft = (draft: any) => {
    const draftData = loadDraft(draft);
    if (draftData) {
      const { logoPreview: savedLogoPreview, coverPreview: savedCoverPreview, coords: savedCoords, ...formData } = draftData;
      form.reset(formData);
      
      if (savedLogoPreview) {
        setLogoPreview(savedLogoPreview);
      }
      if (savedCoverPreview) {
        setCoverPreview(savedCoverPreview);
      }
      
      // Restore coordinates from draft
      if (savedCoords && savedCoords.lat != null && savedCoords.lng != null) {
        setCoords({ lat: savedCoords.lat, lng: savedCoords.lng });
        // Reset the manual edit flag so reverse geocoding can work if address is missing
        hasManuallyEditedAddress.current = false;
      }
      
      setTimeout(() => {
        Object.keys(formData).forEach(key => {
          if (formData[key] !== undefined && formData[key] !== null) {
            form.setValue(key as any, formData[key]);
          }
        });
        form.trigger();
      }, 100);
      
      toast({
        title: "Draft loaded",
        description: `"${draft.draft_name}" has been loaded successfully.`,
      });
    }
  };

  const handleCreateNew = () => {
    createNewDraft();
    
    const defaultValues = {
      businessName: "",
      businessType: "",
      otherBusinessType: "",
      contactEmail: currentUser?.email || "",
      phoneNumber: "",
      websiteUrl: "https://",
      eircode: "",
      county: "",
      streetAddress: "",
      townCity: "",
      facebook: "",
      instagram: "",
      tiktok: "",
      description: "",
      openingHours: daysOfWeek.reduce((acc, day) => {
        acc[day] = {
          isClosed: false,
          is24Hours: false,
          openTime: "09:00",
          closeTime: "18:00",
        };
        return acc;
      }, {} as Record<string, { isClosed: boolean; is24Hours?: boolean; openTime?: string; closeTime?: string; }>),
    };
    
    form.reset(defaultValues);
    
    setTimeout(() => {
      form.setValue('businessType', '');
      form.setValue('county', '');
      form.setValue('contactEmail', currentUser?.email || '');
      form.trigger();
    }, 0);
    
    setLogoFile(null);
    setLogoPreview(null);
    setCoverFile(null);
    setCoverPreview(null);
    
    const logoInput = document.getElementById('logo-upload') as HTMLInputElement;
    const coverInput = document.getElementById('cover-upload') as HTMLInputElement;
    if (logoInput) logoInput.value = '';
    if (coverInput) coverInput.value = '';
    
    toast({
      title: "New draft created",
      description: "Started a new business listing draft.",
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Logo image must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === "string") {
          setLogoCropSrc(event.target.result);
          setLogoCropOpen(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoCropComplete = (croppedBlob: Blob) => {
    const croppedFile = new File([croppedBlob], 'logo.jpg', { type: 'image/jpeg' });
    setLogoFile(croppedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && typeof event.target.result === "string") {
        setLogoPreview(event.target.result);
      }
    };
    reader.readAsDataURL(croppedBlob);
    setLogoCropOpen(false);
    setLogoCropSrc(null);
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Banner image must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === "string") {
          setCoverCropSrc(event.target.result);
          setCoverCropOpen(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverCropComplete = (croppedBlob: Blob) => {
    const croppedFile = new File([croppedBlob], 'banner.jpg', { type: 'image/jpeg' });
    setCoverFile(croppedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && typeof event.target.result === "string") {
        setCoverPreview(event.target.result);
      }
    };
    reader.readAsDataURL(croppedBlob);
    setCoverCropOpen(false);
    setCoverCropSrc(null);
  };

  const generateUniqueSlug = async (name: string): Promise<string> => {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '-');
    
    let slug = baseSlug;
    let counter = 1;
    
    while (true) {
      const { data, error } = await supabase
        .from('business_listings')
        .select('id')
        .eq('slug', slug)
        .single();
      
      if (error && error.code === 'PGRST116') {
        return slug;
      }
      
      if (data) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      } else if (error) {
        return `${baseSlug}-${Date.now()}`;
      }
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (submitInFlightRef.current) return;
    if (!currentUser) {
      toast({
        title: "Authentication required",
        description: "Please log in to submit a business listing.",
        variant: "destructive",
      });
      return;
    }

    submitInFlightRef.current = true;
    setIsLoading(true);

    try {
      // Upload logo image if provided
      let logoImageUrl: string | null = null;
      if (logoFile) {
        try {
          const processedLogo = await compressImageForUpload(logoFile, "logo");
          const fileExt = processedLogo.name.includes(".")
            ? processedLogo.name.split(".").pop()
            : "webp";
          const fileName = `business-logos/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          
          const { data: logoData, error: logoError } = await supabase.storage
            .from('sale-listing-images')
            .upload(fileName, processedLogo, {
              cacheControl: '3600',
              upsert: false,
            });

          if (logoError) {
            console.error('Error uploading logo:', logoError);
            toast({
              title: "Logo upload failed",
              description: "Failed to upload logo image. Please try again.",
              variant: "destructive",
            });
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('sale-listing-images')
              .getPublicUrl(fileName);
            logoImageUrl = publicUrl;
          }
        } catch (error) {
          console.error('Error uploading logo:', error);
        }
      }

      // Upload banner/cover image if provided
      let bannerImageUrl: string | null = null;
      if (coverFile) {
        try {
          const processedBanner = await compressImageForUpload(coverFile, "banner");
          const fileExt = processedBanner.name.includes(".")
            ? processedBanner.name.split(".").pop()
            : "webp";
          const fileName = `business-banners/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          
          const { data: bannerData, error: bannerError } = await supabase.storage
            .from('sale-listing-images')
            .upload(fileName, processedBanner, {
              cacheControl: '3600',
              upsert: false,
            });

          if (bannerError) {
            console.error('Error uploading banner:', bannerError);
            toast({
              title: "Banner upload failed",
              description: "Failed to upload banner image. Please try again.",
              variant: "destructive",
            });
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('sale-listing-images')
              .getPublicUrl(fileName);
            bannerImageUrl = publicUrl;
          }
        } catch (error) {
          console.error('Error uploading banner:', error);
        }
      }

      const transformedOpeningHours = values.openingHours ? 
        Object.entries(values.openingHours).map(([day, hours]) => ({
          day,
          ...hours
        })) : [];

      const socialData = {
        facebook: values.facebook || null,
        instagram: values.instagram || null,
        tiktok: values.tiktok || null
      };

      const slug = await generateUniqueSlug(values.businessName);

      const businessData = {
        user_id: currentUser.id,
        name: values.businessName,
        type: values.businessType,
        address: `${values.streetAddress}, ${values.townCity}`,
        county: values.county,
        phone: values.phoneNumber,
        website: values.websiteUrl && values.websiteUrl.trim() && values.websiteUrl !== 'https://' 
          ? values.websiteUrl.trim() 
          : null,
        description: values.description,
        opening_hours: transformedOpeningHours,
        social: socialData,
        coordinates: coords.lat != null && coords.lng != null 
          ? { lat: coords.lat, lng: coords.lng }
          : { lat: 53.3498, lng: -6.2603 }, // Default to Dublin if no coordinates
        partner: false,
        rating: 0.0,
        reviews: 0,
        reviews_list: [],
        banner_image: bannerImageUrl,
        logo_image: logoImageUrl,
        status: 'draft',
        admin_approved: false,
        slug: slug,
        eircode: values.eircode || null,
        about_us: values.about_us || null,
        gallery_images: values.gallery_images || [],
      };

      const { data, error } = await supabase
        .from('business_listings')
        .insert(businessData)
        .select()
        .single();

      if (error) {
        console.error('Error inserting business listing:', error);
        throw error;
      }

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pendingBusinessListingId', data.id);
      }

      // If user has subscription, redirect to dashboard listing page
      // Otherwise, redirect to subscription page for payment
      if (hasSubscription) {
        toast({
          title: "Listing created!",
          description: "Your listing has been saved and will be reviewed by admin.",
        });
        
        setTimeout(() => {
          router.push("/my-business-dashboard/listing");
        }, 1500);
      } else {
        toast({
          title: "Listing created!",
          description: "Please complete payment to submit your listing for review.",
        });
        
        setTimeout(() => {
          router.push("/services/subscribe");
        }, 1500);
      }

    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Submission failed",
        description: "There was a problem creating your listing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      submitInFlightRef.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-brand-soft-green/10 -mt-0 pb-12">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-3xl font-berkshire text-brand-dark-green mb-6">Submit Your Business Listing</h1>
          {!hasSubscription && (
            <Alert className="mb-6 bg-amber-50 border-amber-200">
              <Info className="h-4 w-4" />
              <AlertTitle>Payment Required</AlertTitle>
              <AlertDescription>
                After completing this form, you'll be prompted to select a subscription plan and complete payment before your listing is submitted for admin review.
              </AlertDescription>
            </Alert>
          )}
          {hasSubscription && (
            <Alert className="mb-6 bg-blue-50 border-blue-200">
              <Info className="h-4 w-4" />
              <AlertTitle>Active Subscription</AlertTitle>
              <AlertDescription>
                You have an active subscription. Your listing will be saved and submitted for admin review without requiring payment.
              </AlertDescription>
            </Alert>
          )}

          <DraftManager
            drafts={drafts}
            currentDraftId={currentDraftId}
            isAutoSaving={isAutoSaving}
            lastSaved={lastSaved}
            onSaveDraft={saveDraft}
            onLoadDraft={handleLoadDraft}
            onDeleteDraft={deleteDraft}
            onCreateNew={handleCreateNew}
          />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Business Details Section */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-brand-dark-green">Business Details</h2>
                
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Your Business Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="businessType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select business type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {businessTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {businessType === "Other" && (
                  <FormField
                    control={form.control}
                    name="otherBusinessType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Specify Business Type</FormLabel>
                        <FormControl>
                          <Input placeholder="Specify your business type" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email *</FormLabel>
                        <FormControl>
                          <Input placeholder="contact@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Phone Number *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Your Business Phone Number" 
                            {...field}
                            maxLength={20}
                            onChange={(e) => {
                              let value = e.target.value.replace(/[^0-9\s\-()+ ]/g, '');
                              if (value.length > 20) {
                                value = value.substring(0, 20);
                              }
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Irish or UK phone numbers only (digits only, no letters)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Location Details */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-brand-dark-green">Location Details</h2>
                
                <FormField
                  control={form.control}
                  name="streetAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            placeholder={mapsLoaded ? "Start typing address..." : "Enter street address"}
                            maxLength={100}
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              hasManuallyEditedAddress.current = true;
                              fetchAddressPredictions(e.target.value);
                            }}
                            onFocus={() => {
                              setIsAddressFocused(true);
                              fetchAddressPredictions(field.value);
                            }}
                            onBlur={() => {
                              setTimeout(() => setIsAddressFocused(false), 150);
                            }}
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
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="townCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Town/City *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Dublin"
                          maxLength={50}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="county"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>County/State/Province *</FormLabel>
                          <FormControl>
                          <Input 
                            placeholder="Enter county, state, or province"
                            maxLength={100}
                            {...field} 
                          />
                          </FormControl>
                        <FormDescription>
                          County, state, province, or region
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="eircode"
                    render={({ field }) => {
                      // Handle eircode geocoding when value changes
                      const handleEircodeChange = async (value: string) => {
                        field.onChange(value);
                        
                        // Debounce: only geocode if user stops typing for 500ms
                        const trimmedValue = value.trim();
                        
                        // Clear any existing timeout
                        if ((window as any).eircodeGeocodeTimeout) {
                          clearTimeout((window as any).eircodeGeocodeTimeout);
                        }
                        
                        // Reset status if input is too short
                        if (!trimmedValue || trimmedValue.length < 6) {
                          setEircodeGeocodingStatus('idle');
                          return;
                        }
                        
                        // Wait 500ms after user stops typing
                        (window as any).eircodeGeocodeTimeout = setTimeout(async () => {
                          const { isValidEircode, geocodeEircode } = await import('@/lib/utils/eircode-geocoding');

                          // Test the validation directly with detailed logging
                          const cleaned = trimmedValue.replace(/\s+/g, '').toUpperCase();

                          // Manual validation check for debugging
                          const pattern = /^[ACDEFHKNPRTVWXY0-9]{3}[ACDEFHKNPRTVWXY0-9]{4}$/;
                          const manualCheck = cleaned.length === 7 && pattern.test(cleaned);

                          
                          const isValid = isValidEircode(trimmedValue);

                          if (isValid || manualCheck) {
                            // Use manual check as fallback if function has caching issues
                            if (!isValid && manualCheck) {
                            }

                            setEircodeGeocodingStatus('geocoding');
                            try {
                              const coords = await geocodeEircode(trimmedValue);

                              if (coords) {

                                setCoords({ lat: coords.lat, lng: coords.lng });
                                setEircodeGeocodingStatus('success');
                                toast({
                                  title: "Location found",
                                  description: `Successfully geocoded eircode ${trimmedValue}`,
                                });
                                // Clear success message after 3 seconds
                                setTimeout(() => setEircodeGeocodingStatus('idle'), 3000);
                              } else {
                                setEircodeGeocodingStatus('error');
                                toast({
                                  title: "Location not found",
                                  description: `Could not find location for eircode ${trimmedValue}. Please check the eircode or try entering a full address.`,
                                  variant: "destructive",
                                });
                                setTimeout(() => setEircodeGeocodingStatus('idle'), 5000);
                              }
                            } catch (error) {
                              console.error('Error geocoding eircode:', error);
                              setEircodeGeocodingStatus('error');
                              toast({
                                title: "Geocoding error",
                                description: "An error occurred while geocoding the eircode. Please try again.",
                                variant: "destructive",
                              });
                              setTimeout(() => setEircodeGeocodingStatus('idle'), 5000);
                            }
                          } else {

                            setEircodeGeocodingStatus('idle');
                          }
                        }, 500);
                      };

                      return (
                      <FormItem>
                        <FormLabel>Postal Code (Optional but preferred)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              onChange={(e) => handleEircodeChange(e.target.value)}
                              placeholder="Postal/ZIP code (e.g., A65 F4E2)"
                              maxLength={20}
                              className={eircodeGeocodingStatus === 'success' ? 'border-green-500' : eircodeGeocodingStatus === 'error' ? 'border-red-500' : ''}
                            />
                            {eircodeGeocodingStatus === 'geocoding' && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">Geocoding...</span>
                            )}
                            {eircodeGeocodingStatus === 'success' && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-green-600">✓ Location found</span>
                            )}
                            {eircodeGeocodingStatus === 'error' && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-red-600">Location not found</span>
                            )}
                          </div>
                        </FormControl>
                        <FormDescription>
                            Helps us accurately place your business on the map. For Irish addresses, enter your eircode.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                      );
                    }}
                  />
                </div>

                {coords.lat != null && coords.lng != null && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      📍 Location: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                    </p>
                    <div className="h-64 rounded-md border overflow-hidden">
                      <ServicesMap
                        businesses={[{
                          id: 1,
                          name: form.watch("businessName") || "Your Business",
                          type: form.watch("businessType") || "Business",
                          coordinates: { lat: coords.lat!, lng: coords.lng! },
                          partner: false,
                          address: `${form.watch("streetAddress")}, ${form.watch("townCity")}`,
                          county: form.watch("county") || "",
                          slug: ""
                        }]}
                        hoveredBusinessId={null}
                        setHoveredBusiness={() => {}}
                        userLocation={null}
                      />
                    </div>
                  </div>
                )}
                {coords.lat == null && coords.lng == null && (
                  <div className="rounded-md border border-dashed p-6 bg-gray-50">
                    <p className="text-sm text-gray-500 mb-3">
                      Select an address from the suggestions above to see your business location on the map.
                    </p>
                    <div className="h-40 bg-gray-200 rounded flex items-center justify-center">
                      <p className="text-gray-500">Map preview will appear when address is selected</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Business Description */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-brand-dark-green">Business Description</h2>
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short description of your business *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell pet owners about your services..."
                          className="min-h-[120px]" 
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum 400 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Opening Hours Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-brand-dark-green" />
                    <h3 className="text-lg font-medium text-gray-900">Opening Hours *</h3>
                  </div>
                  <p className="text-sm text-gray-600">Set your business opening hours for each day of the week. At least one day must be open for business.</p>
                  
                  <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
                    {daysOfWeek.map((day) => (
                      <div key={day} className="py-3 border-b border-gray-200 last:border-b-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="font-medium text-gray-900 min-w-[100px]">{day}</div>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                            <FormField
                              control={form.control}
                              name={`openingHours.${day}.is24Hours` as any}
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      disabled={form.watch(`openingHours.${day}.isClosed` as any)}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal flex items-center -pt-6">24 Hours</FormLabel>
                                </FormItem>
                              )}
                            />
                            
                            {!form.watch(`openingHours.${day}.isClosed` as any) && !form.watch(`openingHours.${day}.is24Hours` as any) && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <FormField
                                  control={form.control}
                                  name={`openingHours.${day}.openTime` as any}
                                  render={({ field }) => (
                                    <FormItem className="flex-1 min-w-[80px]">
                                      <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                          <SelectTrigger className="w-full sm:w-20">
                                            <SelectValue />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {timeSlots.map((time) => (
                                            <SelectItem key={time} value={time}>
                                              {time}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </FormItem>
                                  )}
                                />
                                
                                <span className="text-gray-500 text-sm">to</span>
                                
                                <FormField
                                  control={form.control}
                                  name={`openingHours.${day}.closeTime` as any}
                                  render={({ field }) => (
                                    <FormItem className="flex-1 min-w-[80px]">
                                      <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                          <SelectTrigger className="w-full sm:w-20">
                                            <SelectValue />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {timeSlots.map((time) => (
                                            <SelectItem key={time} value={time}>
                                              {time}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            )}
                            
                            <FormField
                              control={form.control}
                              name={`openingHours.${day}.isClosed` as any}
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal flex items-center -mt-2">Closed</FormLabel>
                                </FormItem>
                              )}
                            />
                            
                            {form.watch(`openingHours.${day}.isClosed` as any) && (
                              <span className="text-red-500 font-medium text-sm">Closed</span>
                            )}
                            
                            {form.watch(`openingHours.${day}.is24Hours` as any) && !form.watch(`openingHours.${day}.isClosed` as any) && (
                              <span className="text-green-600 font-medium text-sm">24 Hours</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {form.formState.errors.openingHours?.root?.message && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-2">
                      <p className="text-sm text-red-600 font-medium">
                        {form.formState.errors.openingHours.root.message}
                      </p>
                    </div>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="websiteUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Website (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://www.yourbusiness.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Social Media Links */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-brand-dark-green">Social Media Links (Optional)</h2>
                
                <div className="grid gap-6 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="facebook"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facebook</FormLabel>
                        <FormControl>
                          <Input placeholder="https://facebook.com/yourbusiness" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="instagram"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instagram</FormLabel>
                        <FormControl>
                          <Input placeholder="https://instagram.com/yourbusiness" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tiktok"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>TikTok</FormLabel>
                        <FormControl>
                          <Input placeholder="https://tiktok.com/@yourbusiness" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Images Upload Section */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-brand-dark-green">Business Images</h2>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Logo (Optional)</h3>
                  <p className="text-sm text-gray-600">Upload your business logo. This will appear as your profile image on the listing.</p>
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      id="logo-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={handleLogoUpload}
                    />
                    
                    {logoPreview ? (
                      <div className="space-y-4">
                        <div className="mx-auto w-32 h-32 relative">
                          <img 
                            src={logoPreview} 
                            alt="Logo preview" 
                            className="w-full h-full object-cover rounded-full border-4 border-white shadow-lg" 
                          />
                        </div>
                        <div className="flex gap-2 justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setLogoCropSrc(logoPreview);
                              setLogoCropOpen(true);
                            }}
                          >
                            <Crop className="w-4 h-4 mr-2" />
                            Crop Logo
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setLogoFile(null);
                              setLogoPreview(null);
                            }}
                          >
                            Remove Logo
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <label htmlFor="logo-upload" className="cursor-pointer">
                        <div className="space-y-2">
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="text-sm text-gray-600">
                            <span className="text-brand-dark-green font-medium">
                              Click to upload logo
                            </span>{" "}
                            or drag and drop
                          </div>
                          <p className="text-xs text-gray-500">
                            PNG, JPG, GIF up to 5MB (Square format recommended)
                          </p>
                        </div>
                      </label>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Cover Image (Optional)</h3>
                  <p className="text-sm text-gray-600">Upload a cover image that represents your business. This will be displayed as the banner on your listing page.</p>
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      id="cover-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={handleCoverUpload}
                    />
                    
                    {coverPreview ? (
                      <div className="space-y-4">
                        <div className="mx-auto w-full max-w-md h-40 relative">
                          <img 
                            src={coverPreview} 
                            alt="Cover preview" 
                            className="w-full h-full object-cover rounded-md" 
                          />
                        </div>
                        <div className="flex gap-2 justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setCoverCropSrc(coverPreview);
                              setCoverCropOpen(true);
                            }}
                          >
                            <Crop className="w-4 h-4 mr-2" />
                            Crop Banner
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setCoverFile(null);
                              setCoverPreview(null);
                            }}
                          >
                            Remove Cover Image
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <label htmlFor="cover-upload" className="cursor-pointer">
                        <div className="space-y-2">
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="text-sm text-gray-600">
                            <span className="text-brand-dark-green font-medium">
                              Click to upload cover image
                            </span>{" "}
                            or drag and drop
                          </div>
                          <p className="text-xs text-gray-500">
                            PNG, JPG, GIF up to 5MB (Landscape format recommended - 16:9 ratio)
                          </p>
                        </div>
                      </label>
                    )}
                  </div>
                </div>

                {/* Profile Preview Section */}
                {(logoPreview || coverPreview || form.watch("businessName")) && (
                  <div className="space-y-4 mt-8">
                    <div className="flex items-center gap-2">
                      <Info className="h-5 w-5 text-brand-dark-green" />
                      <h3 className="text-lg font-medium text-gray-900">Profile Preview</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      See how your business profile will look to customers. Adjust your banner and logo to ensure they display correctly.
                    </p>
                    <Card className="overflow-hidden border-2 border-brand-soft-green">
                      <section className="w-full">
                        <div className="relative w-full h-48 sm:h-56 bg-gray-200">
                        {coverPreview ? (
                            <img 
                              src={coverPreview} 
                              alt="Banner preview"
                              className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-r from-brand-dark-green to-brand-soft-green"></div>
                        )}
                        </div>
                        
                        <div className="bg-white border-t border-gray-100">
                          <div className="relative px-4 pt-10 sm:pt-12 pb-4">
                            <div className="absolute left-4 top-0 -translate-y-1/2">
                              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-4 border-white shadow-md bg-white">
                                {logoPreview ? (
                                  <AvatarImage src={logoPreview} alt="Logo preview" className="object-cover" />
                                ) : (
                                  <AvatarFallback className="bg-brand-soft-green text-white text-lg sm:text-xl">
                                    {form.watch("businessName")?.charAt(0)?.toUpperCase() || "B"}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                            </div>
                              
                            <div className="pl-20 sm:pl-24">
                              <h2 className="text-xl sm:text-2xl font-berkshire text-gray-900 mb-1">
                                  {form.watch("businessName") || "Your Business Name"}
                                </h2>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <span className="capitalize">{form.watch("businessType") || "Business Type"}</span>
                                  {form.watch("county") && (
                                    <>
                                    <span className="text-gray-400">•</span>
                                      <span>{form.watch("county")}</span>
                                    </>
                                  )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </section>
                    </Card>
                  </div>
                )}
              </div>

              {/* About Us Section - Available to all businesses */}
              {!isCheckingSubscription && (
                <div className="space-y-6 border-t pt-6 mt-6">
                  <div>
                    <h2 className="text-xl font-semibold text-brand-dark-green mb-2">About Us Section</h2>
                    <p className="text-sm text-gray-600 mb-4">
                      Add detailed information about your business, team, and establishment.
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="about_us"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>About Us Content</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Tell customers about your business, team, history, and what makes you special..."
                            rows={10}
                            className="resize-none"
                          />
                        </FormControl>
                        <FormDescription>
                          {field.value?.length || 0} / 5000 characters
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gallery_images"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gallery Images</FormLabel>
                        <FormDescription className="mb-2">
                          Upload images of your team, establishment, facilities, etc. (up to 15 images)
                        </FormDescription>
                        <FormControl>
                          <ImageUploader
                            value={field.value || []}
                            onChange={(urls) => field.onChange(urls)}
                            onImagesSelected={(urls) => field.onChange(urls)}
                            onImageDeleted={(index) => {
                              const newUrls = [...(field.value || [])];
                              newUrls.splice(index, 1);
                              field.onChange(newUrls);
                            }}
                            maxImages={15}
                            bucketName="sale-listing-images"
                            folder="business-gallery"
                            listingType="business"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <div className="pt-6 border-t border-gray-200">
                <Button 
                  type="submit" 
                  className="w-full md:w-auto bg-brand-dark-green hover:bg-brand-dark-green/90"
                  disabled={isLoading || isCheckingSubscription}
                >
                  {isLoading 
                    ? "Creating Listing..." 
                    : hasSubscription 
                      ? "Save Listing" 
                      : "Continue to Payment"}
                </Button>
                <p className="mt-2 text-sm text-gray-500">
                  {hasSubscription 
                    ? "Your listing will be saved and submitted for admin review."
                    : "After creating your listing, you'll select a subscription plan and complete payment."}
                </p>
              </div>
            </form>
          </Form>
        </div>
      </div>
      
      <NavigationSection />

      {/* Logo Crop Dialog */}
      {logoCropSrc && (
        <ImageCropper
          imageSrc={logoCropSrc}
          open={logoCropOpen}
          onClose={() => {
            setLogoCropOpen(false);
            setLogoCropSrc(null);
          }}
          onCropComplete={handleLogoCropComplete}
          aspectRatio={1} // Square for logo
          listingType="business"
          cropType="logo"
        />
      )}

      {/* Cover/Banner Crop Dialog */}
      {coverCropSrc && (
        <ImageCropper
          imageSrc={coverCropSrc}
          open={coverCropOpen}
          onClose={() => {
            setCoverCropOpen(false);
            setCoverCropSrc(null);
          }}
          onCropComplete={handleCoverCropComplete}
          aspectRatio={16 / 9} // Landscape for banner
          listingType="business"
          cropType="banner"
        />
      )}
    </div>
  );
}

