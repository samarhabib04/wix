'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { validateIrishPhoneNumber, irishCounties } from '@/lib/utils/irish-data';
import { Loader2, Upload, X, Info, Crop, Clock } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabase/client';
import { ImageCropper } from '@/components/seller-dashboard/forms/ImageCropper';
import { FormDescription } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { ImageUploader } from '@/components/seller-dashboard/forms/ImageUploader';
import dynamic from 'next/dynamic';
import {
  getBusinessTypeSelectValues,
  normalizeStoredBusinessTypeForForm,
} from '@/lib/config/business-service-types';
import { compressImageForUpload } from '@/lib/media/compressImage';

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
  isClosed: z.boolean(),
  is24Hours: z.boolean(),
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
  name: z.string().min(2, {
    message: "Business name must be at least 2 characters.",
  }),
  type: z.string().min(1, {
    message: "Please select a business type.",
  }),
  phone: z.string().min(1, {
    message: "Please enter a phone number.",
  }).refine(validateIrishPhoneNumber, {
    message: "Please enter a valid phone number.",
  }),
  website: z.string().optional().refine((val) => {
    if (!val || val === '' || val === 'https://') return true;
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
  description: z.string().max(400, {
    message: "Description must not exceed 400 characters.",
  }).min(20, {
    message: "Description must be at least 20 characters."
  }),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  tiktok: z.string().optional(),
  openingHours: z.record(z.string(), openingHoursSchema).optional(),
  about_us: z.string().max(5000, {
    message: "About Us content must not exceed 5000 characters.",
  }).optional(),
  gallery_images: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface BusinessListingEditFormProps {
  listing: {
    id: string;
    name: string;
    type: string;
    address: string;
    county: string;
    phone: string;
    website?: string | null;
    description: string;
    social?: any;
    banner_image?: string | null;
    logo_image?: string | null;
    opening_hours?: any;
    coordinates?: any;
    eircode?: string | null;
    about_us?: string | null;
    gallery_images?: string[] | null;
  };
  onSave: (data: FormValues & { coordinates?: { lat: number | null; lng: number | null }; eircode?: string; about_us?: string; gallery_images?: string[] }) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  isAdmin?: boolean;
}

export default function BusinessListingEditForm({
  listing,
  onSave,
  onCancel,
  isSaving,
  isAdmin = false
}: BusinessListingEditFormProps) {
  const businessTypeOptions = getBusinessTypeSelectValues(listing.type || '');
  const { toast } = useToast();
  const { user } = useAuth();
  const [hasPremiumOrElite, setHasPremiumOrElite] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(listing.logo_image || null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(listing.banner_image || null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  
  // Crop dialog states
  const [logoCropOpen, setLogoCropOpen] = useState(false);
  const [logoCropSrc, setLogoCropSrc] = useState<string | null>(null);
  const [bannerCropOpen, setBannerCropOpen] = useState(false);
  const [bannerCropSrc, setBannerCropSrc] = useState<string | null>(null);

  // Google Maps autocomplete
  const { isLoaded: mapsLoaded, loadError: mapsLoadError } = useGoogleMapsPlaces();
  const [addressPredictions, setAddressPredictions] = useState<PlacePrediction[]>([]);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [isAddressFocused, setIsAddressFocused] = useState(false);
  const addressRequestIdRef = useRef(0);
  const showAddressDropdown = isAddressFocused && (addressPredictions.length > 0 || isAddressLoading);
  
  // Coordinates and eircode geocoding
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>(() => {
    if (listing.coordinates && typeof listing.coordinates === 'object' && listing.coordinates !== null) {
      const coords = listing.coordinates as any;
      return {
        lat: typeof coords.lat === 'number' ? coords.lat : null,
        lng: typeof coords.lng === 'number' ? coords.lng : null,
      };
    }
    return { lat: null, lng: null };
  });
  const [eircodeGeocodingStatus, setEircodeGeocodingStatus] = useState<'idle' | 'geocoding' | 'success' | 'error'>('idle');

  // Transform opening hours from array format to object format
  const transformOpeningHours = (hours: any[]): Record<string, any> => {
    const defaultHours = daysOfWeek.reduce((acc, day) => {
      acc[day] = {
        isClosed: false,
        is24Hours: false,
        openTime: "09:00",
        closeTime: "18:00",
      };
      return acc;
    }, {} as Record<string, any>);

    if (!hours || !Array.isArray(hours) || hours.length === 0) {
      return defaultHours;
    }

    // Convert array format to object format
    hours.forEach((schedule: any) => {
      const day = schedule.day;
      if (day && daysOfWeek.includes(day)) {
        defaultHours[day] = {
          isClosed: schedule.isClosed || false,
          is24Hours: schedule.is24Hours || false,
          openTime: schedule.openTime || "09:00",
          closeTime: schedule.closeTime || "18:00",
        };
      }
    });

    return defaultHours;
  };

  // Parse address to extract street and town if possible
  const parseAddress = (address: string) => {
    if (!address) return { streetAddress: '', townCity: '' };
    const parts = address.split(',').map(s => s.trim());
    if (parts.length >= 2) {
      return {
        streetAddress: parts[0] || '',
        townCity: parts.slice(1).join(', ') || '',
      };
    }
    return { streetAddress: address, townCity: '' };
  };

  const { streetAddress: defaultStreetAddress, townCity: defaultTownCity } = parseAddress(listing.address || '');

  // Parse gallery_images if it's a JSON string or array
  const parseGalleryImages = (): string[] => {
    if (!listing.gallery_images) return [];
    if (Array.isArray(listing.gallery_images)) return listing.gallery_images;
    if (typeof listing.gallery_images === 'string') {
      try {
        const parsed = JSON.parse(listing.gallery_images);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const defaultGalleryImages = parseGalleryImages();

  // Check subscription on mount
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user?.id) {
        setIsCheckingSubscription(false);
        setHasPremiumOrElite(false);
        return;
      }

      try {
        const { data: subscription } = await supabase
          .from('business_subscriptions' as any)
          .select('subscription_tier, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const hasPremiumOrEliteSub = (subscription as any)?.subscription_tier === 'premium' || 
                                     (subscription as any)?.subscription_tier === 'elite_marketplace';
        setHasPremiumOrElite(hasPremiumOrEliteSub);
      } catch (error) {
        console.error('Error checking subscription:', error);
        setHasPremiumOrElite(false);
      } finally {
        setIsCheckingSubscription(false);
      }
    };

    checkSubscription();
  }, [user?.id]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: listing.name || '',
      type: normalizeStoredBusinessTypeForForm(listing.type || ''),
      phone: listing.phone || '',
      website: listing.website || '',
      county: listing.county || '',
      streetAddress: defaultStreetAddress,
      townCity: defaultTownCity,
      eircode: listing.eircode || '',
      description: listing.description || '',
      facebook: listing.social?.facebook || '',
      instagram: listing.social?.instagram || '',
      tiktok: listing.social?.tiktok || '',
      openingHours: transformOpeningHours(listing.opening_hours || []),
      about_us: listing.about_us || '',
      gallery_images: defaultGalleryImages,
    },
  });

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
          const addressParts = formatted.split(',').map((s: string) => s.trim());
          const streetAddress = addressParts[0] || '';
          const townCity = addressParts.length > 1 ? addressParts.slice(1, -1).join(', ') : '';
          
          // Extract county/state from address components
          let county = form.getValues("county");
          if (place.address_components) {
            const countyComponent = place.address_components.find((comp: any) => 
              comp.types.includes('administrative_area_level_1') || 
              comp.types.includes('administrative_area_level_2')
            );
            if (countyComponent) {
              county = countyComponent.long_name;
            }
          }

          form.setValue("streetAddress", streetAddress);
          if (townCity) form.setValue("townCity", townCity);
          if (county) form.setValue("county", county);
          
          const lat = place.geometry?.location?.lat?.();
          const lng = place.geometry?.location?.lng?.();
          if (typeof lat === "number" && typeof lng === "number") {
            setCoords({ lat, lng });
          }
          
          setAddressPredictions([]);
          setIsAddressFocused(false);
        }
      );
    } catch (err) {
      console.error("Error selecting place:", err);
      setIsAddressLoading(false);
    }
  };

  // Eircode geocoding handler
  const handleEircodeChange = async (value: string) => {
    form.setValue("eircode", value);
    
    const trimmedValue = value.trim();
    
    if ((window as any).eircodeGeocodeTimeout) {
      clearTimeout((window as any).eircodeGeocodeTimeout);
    }
    
    if (!trimmedValue || trimmedValue.length < 6) {
      setEircodeGeocodingStatus('idle');
      return;
    }
    
    (window as any).eircodeGeocodeTimeout = setTimeout(async () => {
      const { isValidEircode, geocodeEircode } = await import('@/lib/utils/eircode-geocoding');
      
      const cleaned = trimmedValue.replace(/\s+/g, '').toUpperCase();
      const pattern = /^[ACDEFHKNPRTVWXY0-9]{3}[ACDEFHKNPRTVWXY0-9]{4}$/;
      const manualCheck = cleaned.length === 7 && pattern.test(cleaned);
      const isValid = isValidEircode(trimmedValue);
      
      if (isValid || manualCheck) {
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

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          setBannerCropSrc(event.target.result);
          setBannerCropOpen(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerCropComplete = (croppedBlob: Blob) => {
    const croppedFile = new File([croppedBlob], 'banner.jpg', { type: 'image/jpeg' });
    setBannerFile(croppedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && typeof event.target.result === "string") {
        setBannerPreview(event.target.result);
      }
    };
    reader.readAsDataURL(croppedBlob);
    setBannerCropOpen(false);
    setBannerCropSrc(null);
  };

  const onSubmit = async (data: FormValues) => {
    try {
      setIsUploadingImages(true);
      
      // Upload logo if new file provided
      let logoImageUrl = listing.logo_image || null;
      if (logoFile) {
        try {
          const processedLogo = await compressImageForUpload(logoFile, 'logo');
          const fileExt = processedLogo.name.includes('.')
            ? processedLogo.name.split('.').pop()
            : 'webp';
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

      // Upload banner if new file provided
      let bannerImageUrl = listing.banner_image || null;
      if (bannerFile) {
        try {
          const processedBanner = await compressImageForUpload(bannerFile, 'banner');
          const fileExt = processedBanner.name.includes('.')
            ? processedBanner.name.split('.').pop()
            : 'webp';
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

      // Transform opening hours from object format to array format
      const transformedOpeningHours = data.openingHours ? 
        Object.entries(data.openingHours).map(([day, hours]) => ({
          day,
          ...hours
        })) : [];

      // Combine streetAddress and townCity into address field for database
      const combinedAddress = `${data.streetAddress}, ${data.townCity}`.trim();

      // Include image URLs, opening hours, combined address, coordinates, eircode, about_us, and gallery_images in the data
      const dataWithImages = {
        ...data,
        address: combinedAddress, // For backward compatibility
        logo_image: logoImageUrl,
        banner_image: bannerImageUrl,
        opening_hours: transformedOpeningHours,
        coordinates: coords.lat != null && coords.lng != null 
          ? { lat: coords.lat, lng: coords.lng }
          : undefined,
        eircode: data.eircode || undefined,
        about_us: data.about_us || undefined,
        gallery_images: data.gallery_images || undefined,
      };

      await onSave(dataWithImages);
    } catch (error) {
      console.error('Error saving listing:', error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImages(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business Name *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter business name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
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
                    {businessTypeOptions.map((type) => (
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

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter phone number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://example.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
              render={({ field }) => (
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
              )}
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
                    name: form.watch("name") || "Your Business",
                    type: form.watch("type") || "Business",
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
                Select an address from the suggestions above or enter an eircode to see your business location on the map.
              </p>
              <div className="h-40 bg-gray-200 rounded flex items-center justify-center">
                <p className="text-gray-500">Map preview will appear when address is selected</p>
              </div>
            </div>
          )}
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description *</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Describe your business (20-400 characters)"
                  className="min-h-[100px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Logo Image Upload */}
        <div className="space-y-4">
          <FormLabel>Logo Image</FormLabel>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              id="logo-upload-edit"
              className="hidden"
              accept="image/*"
              onChange={handleLogoUpload}
              disabled={isUploadingImages || isSaving}
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
                    disabled={isUploadingImages || isSaving}
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
                    disabled={isUploadingImages || isSaving}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove Logo
                  </Button>
                </div>
              </div>
            ) : (
              <label htmlFor="logo-upload-edit" className="cursor-pointer">
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

        {/* Banner Image Upload */}
        <div className="space-y-4">
          <FormLabel>Banner Image</FormLabel>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              id="banner-upload-edit"
              className="hidden"
              accept="image/*"
              onChange={handleBannerUpload}
              disabled={isUploadingImages || isSaving}
            />
            
            {bannerPreview ? (
              <div className="space-y-4">
                <div className="mx-auto w-full max-w-md h-40 relative">
                  <img 
                    src={bannerPreview} 
                    alt="Banner preview" 
                    className="w-full h-full object-cover rounded-md" 
                  />
                </div>
                <div className="flex gap-2 justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setBannerCropSrc(bannerPreview);
                      setBannerCropOpen(true);
                    }}
                    disabled={isUploadingImages || isSaving}
                  >
                    <Crop className="w-4 h-4 mr-2" />
                    Crop Banner
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setBannerFile(null);
                      setBannerPreview(null);
                    }}
                    disabled={isUploadingImages || isSaving}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove Banner
                  </Button>
                </div>
              </div>
            ) : (
              <label htmlFor="banner-upload-edit" className="cursor-pointer">
                <div className="space-y-2">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="text-sm text-gray-600">
                    <span className="text-brand-dark-green font-medium">
                      Click to upload banner image
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
        {(logoPreview || bannerPreview || form.watch("name")) && (
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
                  {bannerPreview ? (
                    <img
                      src={bannerPreview}
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
                            {form.watch("name")?.charAt(0)?.toUpperCase() || "B"}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    </div>

                    <div className="pl-20 sm:pl-24">
                      <h2 className="text-xl sm:text-2xl font-berkshire text-gray-900 mb-1">
                        {form.watch("name") || "Your Business Name"}
                      </h2>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="capitalize">{form.watch("type") || "Business Type"}</span>
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

        {/* Opening Hours Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-brand-dark-green" />
            <h3 className="text-lg font-medium text-gray-900">Opening Hours</h3>
          </div>
          <p className="text-sm text-gray-600">Set your business opening hours for each day of the week.</p>
          
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
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <FormField
            control={form.control}
            name="facebook"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Facebook URL</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://facebook.com/..." />
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
                <FormLabel>Instagram URL</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://instagram.com/..." />
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
                <FormLabel>TikTok URL</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://tiktok.com/..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* About Us Section - Available to all businesses */}
        {!isCheckingSubscription && (
          <div className="space-y-6 border-t pt-6 mt-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">About Us Section</h3>
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

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-brand-soft-green hover:bg-brand-dark-green"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>

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
          hidePreview={isAdmin} // Hide preview when editing from admin dashboard
        />
      )}

      {/* Banner Crop Dialog */}
      {bannerCropSrc && (
        <ImageCropper
          imageSrc={bannerCropSrc}
          open={bannerCropOpen}
          onClose={() => {
            setBannerCropOpen(false);
            setBannerCropSrc(null);
          }}
          onCropComplete={handleBannerCropComplete}
          aspectRatio={16 / 9} // Landscape for banner
          listingType="business"
          cropType="banner"
          hidePreview={isAdmin} // Hide preview when editing from admin dashboard
        />
      )}
    </Form>
  );
}
