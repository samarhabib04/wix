'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { TagStyleBreedSelector } from './forms/TagStyleBreedSelector';
import { PuppyMicrochipDetails } from './forms/PuppyMicrochipDetails';
import { ImageUploader } from './forms/ImageUploader';
import { VideoUploader } from './forms/VideoUploader';
import { DocumentUploader } from './forms/DocumentUploader';
import { FamilyTreeInput, FamilyTreeMember } from './forms/FamilyTreeInput';
import { irishCounties } from '@/lib/utils/irish-data';
import { supabase } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

// Use the same schema as SaleListingForm for compulsory fields
const conversionFormSchema = z.object({
  title: z.string().min(10, { message: 'Title must be at least 10 characters' }).max(50, { message: 'Title must be no more than 50 characters' }),
  breedType: z.string({ message: 'Please select a breed type' }),
  breed: z.string().optional(),
  breed1: z.string().optional(),
  breed2: z.string().optional(),
  crossbreedBreeds: z.array(z.string()).optional(),
  location: z.string({ message: 'Please select a county' }),
  dob: z.date({ message: 'Please select a date of birth' }).refine((date) => {
    const today = new Date();
    const sixWeeksAgo = new Date(today.getTime() - (6 * 7 * 24 * 60 * 60 * 1000));
    return date <= sixWeeksAgo;
  }, { message: 'Puppy must be at least 6 weeks old' }),
  maleCount: z.string()
    .refine(val => val.trim() !== '', { message: 'Please enter number of males' })
    .refine(val => {
      const num = Number(val);
      return !isNaN(num) && num >= 0;
    }, { message: 'Must be a valid non-negative number' }),
  femaleCount: z.string()
    .refine(val => val.trim() !== '', { message: 'Please enter number of females' })
    .refine(val => {
      const num = Number(val);
      return !isNaN(num) && num >= 0;
    }, { message: 'Must be a valid non-negative number' }),
  description: z.string().min(100, { message: 'Description must be at least 100 characters' }).max(1000, { message: 'Description must be no more than 1000 characters' }),
  vetName: z.string().optional(),
  vetLocation: z.string().optional(),
  pricingOption: z.enum(['uniform', 'individual', 'range'], {
    message: 'Please select a pricing option'
  }),
  uniformPrice: z.string().optional().refine((val) => {
    if (!val || val.trim() === '') return true;
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, { message: 'Price cannot be negative' }),
  minPrice: z.string().optional().refine((val) => {
    if (!val || val.trim() === '') return true;
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, { message: 'Minimum price cannot be negative' }),
  maxPrice: z.string().optional().refine((val) => {
    if (!val || val.trim() === '') return true;
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, { message: 'Maximum price cannot be negative' }),
  energy: z.enum(['Low', 'Moderate', 'High', 'VeryHigh'] as [string, ...string[]]),
  size: z.enum(['Small', 'Medium', 'Large', 'ExtraLarge'] as [string, ...string[]]),
}).refine((data) => {
  const maleCount = parseInt(data.maleCount);
  const femaleCount = parseInt(data.femaleCount);
  return maleCount > 0 || femaleCount > 0;
}, {
  message: "At least one male or female puppy must be available",
  path: ["maleCount"]
}).refine((data) => {
  if (data.breedType === 'pedigree') {
    return data.breed && data.breed.trim() !== '';
  }
  if (data.breedType === 'crossbreed') {
    return data.crossbreedBreeds && data.crossbreedBreeds.length >= 2;
  }
  return true;
}, {
  message: "Please select the required breed(s)",
  path: ["breed"]
}).refine((data) => {
  if (data.pricingOption === 'uniform') {
    return data.uniformPrice && data.uniformPrice.trim() !== '';
  }
  if (data.pricingOption === 'range') {
    const hasMin = data.minPrice && data.minPrice.trim() !== '';
    const hasMax = data.maxPrice && data.maxPrice.trim() !== '';
    if (!hasMin || !hasMax) return false;

    const minVal = parseFloat(data.minPrice!);
    const maxVal = parseFloat(data.maxPrice!);
    return minVal < maxVal;
  }
  return true;
}, {
  message: "Please complete the required pricing fields",
  path: ["pricingOption"]
});

type FormValues = z.infer<typeof conversionFormSchema>;

interface ShowcaseConversionFormProps {
  showcaseData: any;
  onSubmit: (formData: FormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

interface PuppyDetails {
  id: string;
  microchipNumber: string;
  v1Code: string;
  v2Code: string;
  h1Code: string;
  sex: 'male' | 'female' | '';
  color: string;
  colourCollar: string;
  price: string;
  imageUrl: string | null;
}

export const ShowcaseConversionForm: React.FC<ShowcaseConversionFormProps> = ({
  showcaseData,
  onSubmit,
  onCancel,
  isSubmitting = false
}) => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [breedOptions, setBreedOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [dobPopoverOpen, setDobPopoverOpen] = useState(false);
  const [puppyDetails, setPuppyDetails] = useState<PuppyDetails[]>([]);
  const [puppyValidationKey, setPuppyValidationKey] = useState(0);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [listingId] = useState(() => uuidv4());
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [selectedFeatureImage, setSelectedFeatureImage] = useState<number>(0);
  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string>('');
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [familyTreeData, setFamilyTreeData] = useState<FamilyTreeMember[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch breeds from quiz_breeds table
  useEffect(() => {
    const fetchBreeds = async () => {
      try {
        const { data, error } = await supabase
          .from('quiz_breeds')
          .select('breed')
          .order('breed');

        if (error) {
          console.error('Error fetching breeds:', error);
          return;
        }

        const formattedBreeds = data.map(item => ({
          value: item.breed.toLowerCase().replace(/\s+/g, ''),
          label: item.breed
        }));

        setBreedOptions(formattedBreeds);
      } catch (error) {
        console.error('Error fetching breeds:', error);
      }
    };

    fetchBreeds();
  }, []);

  // Update puppy details when male/female counts change
  const updatePuppyDetailsFromCounts = (mCountStr: string, fCountStr: string) => {
    const maleCount = parseInt(mCountStr) || 0;
    const femaleCount = parseInt(fCountStr) || 0;

    setPuppyDetails(prevDetails => {
      const existingMales = prevDetails.filter(p => p.sex === 'male');
      const existingFemales = prevDetails.filter(p => p.sex === 'female');
      const newDetails: PuppyDetails[] = [];

      // Handle Males
      for (let i = 0; i < maleCount; i++) {
        if (i < existingMales.length) {
          newDetails.push(existingMales[i]);
        } else {
          const newMale: PuppyDetails = {
            id: uuidv4(),
            microchipNumber: '',
            v1Code: '',
            v2Code: '',
            h1Code: '',
            sex: 'male',
            color: '',
            colourCollar: '',
            price: '',
            imageUrl: null
          };
          newDetails.push(newMale);
        }
      }

      // Handle Females
      for (let i = 0; i < femaleCount; i++) {
        if (i < existingFemales.length) {
          newDetails.push(existingFemales[i]);
        } else {
          const newFemale: PuppyDetails = {
            id: uuidv4(),
            microchipNumber: '',
            v1Code: '',
            v2Code: '',
            h1Code: '',
            sex: 'female',
            color: '',
            colourCollar: '',
            price: '',
            imageUrl: null
          };
          newDetails.push(newFemale);
        }
      }

      return newDetails;
    });
  };

  // Initialize all state from showcase data only once
  useEffect(() => {
    if (showcaseData && !isInitialized) {
      // Initialize images
      const initialImages = Array.isArray(showcaseData.images) 
        ? showcaseData.images 
        : (showcaseData.images ? [showcaseData.images] : []);
      setUploadedImageUrls(initialImages);
      setSelectedFeatureImage(showcaseData.primary_image_index || 0);
      
      // Initialize video
      setUploadedVideoUrl(showcaseData.video_url || '');
      
      // Initialize puppy details
      const maleCount = showcaseData.male_count || 0;
      const femaleCount = showcaseData.female_count || 0;
      
      const newDetails: PuppyDetails[] = [];
      
      // Add males
      for (let i = 0; i < maleCount; i++) {
        newDetails.push({
          id: uuidv4(),
          microchipNumber: '',
          v1Code: '',
          v2Code: '',
          h1Code: '',
          sex: 'male',
          color: '',
          colourCollar: '',
          price: '',
          imageUrl: null
        });
      }
      
      // Add females
      for (let i = 0; i < femaleCount; i++) {
        newDetails.push({
          id: uuidv4(),
          microchipNumber: '',
          v1Code: '',
          v2Code: '',
          h1Code: '',
          sex: 'female',
          color: '',
          colourCollar: '',
          price: '',
          imageUrl: null
        });
      }
      
      setPuppyDetails(newDetails);
      setIsInitialized(true);
    }
  }, [showcaseData, isInitialized]);

  // Map showcase data to form defaults
  const getDefaultValues = (): Partial<FormValues> => {
    const dob = showcaseData.date_of_birth ? new Date(showcaseData.date_of_birth) : undefined;
    const breedType = showcaseData.breed_type || 'pedigree';
    const crossbreedBreeds = showcaseData.breed1 && showcaseData.breed2 
      ? [showcaseData.breed1.toLowerCase().replace(/\s+/g, ''), showcaseData.breed2.toLowerCase().replace(/\s+/g, '')]
      : [];

    return {
      title: showcaseData.title || '',
      breedType: breedType,
      breed: breedType === 'pedigree' ? (showcaseData.breed?.toLowerCase().replace(/\s+/g, '') || '') : '',
      breed1: breedType === 'crossbreed' ? (showcaseData.breed1?.toLowerCase().replace(/\s+/g, '') || '') : '',
      breed2: breedType === 'crossbreed' ? (showcaseData.breed2?.toLowerCase().replace(/\s+/g, '') || '') : '',
      crossbreedBreeds: crossbreedBreeds,
      location: showcaseData.location?.toLowerCase() || '',
      dob: dob,
      maleCount: (showcaseData.male_count || 0).toString(),
      femaleCount: (showcaseData.female_count || 0).toString(),
      description: showcaseData.description || '',
      vetName: showcaseData.vet_name || '',
      vetLocation: showcaseData.vet_location || '',
      pricingOption: 'uniform' as const,
      uniformPrice: '',
      minPrice: '',
      maxPrice: '',
      energy: undefined,
      size: undefined,
    };
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(conversionFormSchema),
    defaultValues: getDefaultValues(),
    mode: 'onChange',
  });

  const breedType = form.watch('breedType');
  const pricingOption = form.watch('pricingOption');

  // Handlers for images
  const handleImageUpload = (urls: string[]) => {
    setUploadedImageUrls(urls);
  };

  const handleSetAsPrimary = (index: number) => {
    setSelectedFeatureImage(index);
  };

  const handleImageDelete = (index: number) => {
    const newUrls = uploadedImageUrls.filter((_, i) => i !== index);
    setUploadedImageUrls(newUrls);
    if (selectedFeatureImage >= newUrls.length) {
      setSelectedFeatureImage(Math.max(0, newUrls.length - 1));
    }
  };

  // Handler for video
  const handleVideoChange = (url: string | null) => {
    if (url) {
      if (url.startsWith('http')) {
        form.setValue('videoUrl' as any, url);
        setUploadedVideo(null);
        setUploadedVideoUrl('');
      } else {
        setUploadedVideoUrl(url);
        form.setValue('videoUrl' as any, '');
      }
    } else {
      form.setValue('videoUrl' as any, '');
      setUploadedVideo(null);
      setUploadedVideoUrl('');
    }
  };

  const handleVideoFileChange = (file: File | null) => {
    setUploadedVideo(file);
  };

  // Handler for documents
  const handleDocumentsChange = (documents: any[]) => {
    setUploadedDocuments(documents);
  };

  // Handler for family tree
  const handleFamilyTreeChange = (familyTree: FamilyTreeMember[]) => {
    setFamilyTreeData(familyTree);
  };

  const handleDobChange = (date: Date | undefined) => {
    if (date) {
      form.setValue('dob', date);
    }
    form.trigger('dob');
  };

  const handleSubmit = (data: FormValues) => {
    setHasAttemptedSubmit(true);
    setPuppyValidationKey(prev => prev + 1);

    // Validate puppy details
    const totalPuppies = parseInt(data.maleCount) + parseInt(data.femaleCount);
    if (totalPuppies > 0 && puppyDetails.length !== totalPuppies) {
      // Ensure we have the right number of puppy details
      updatePuppyDetailsFromCounts(data.maleCount, data.femaleCount);
      // Wait a bit for state to update, then re-validate
      setTimeout(() => {
        setPuppyValidationKey(prev => prev + 1);
      }, 100);
      return;
    }

    // Validate that all puppies have required information
    if (totalPuppies > 0) {
      const incompletePuppies = puppyDetails.filter(puppy => 
        !puppy.microchipNumber.trim() && 
        !puppy.v1Code.trim() && 
        !puppy.v2Code.trim() && 
        !puppy.h1Code.trim() &&
        !puppy.color.trim() &&
        !puppy.price.trim() &&
        !puppy.imageUrl
      );

      if (incompletePuppies.length > 0) {
        // Show validation errors
        setPuppyValidationKey(prev => prev + 1);
        return;
      }

      // Validate individual pricing if selected
      if (data.pricingOption === 'individual') {
        const puppiesWithoutPrice = puppyDetails.filter(puppy => 
          puppy.sex && !puppy.price.trim()
        );
        if (puppiesWithoutPrice.length > 0) {
          setPuppyValidationKey(prev => prev + 1);
          return;
        }
      }
    }

    // Auto-populate prices for uniform pricing
    let finalPuppyDetails = [...puppyDetails];
    if (data.pricingOption === 'uniform' && data.uniformPrice) {
      finalPuppyDetails = puppyDetails.map(puppy => ({
        ...puppy,
        price: data.uniformPrice || puppy.price
      }));
    }

    // Submit with form data and all additional fields
    onSubmit({
      ...data,
      puppyDetails: finalPuppyDetails,
      images: uploadedImageUrls,
      primaryImageIndex: selectedFeatureImage,
      videoUrl: (data as any).videoUrl || uploadedVideoUrl,
      documents: uploadedDocuments,
      familyTree: familyTreeData
    } as any);
  };

  return (
    <Form {...form}>
      <form ref={formRef} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6 border border-brand-soft-green">
          <h2 className="text-xl font-semibold border-b pb-4">Listing Details</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="breedType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Breed Type *</FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value);
                    form.setValue('breed', '');
                    form.setValue('breed1', '');
                    form.setValue('breed2', '');
                    form.setValue('crossbreedBreeds', []);
                  }} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select breed type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pedigree">Pedigree/Purebred</SelectItem>
                      <SelectItem value="crossbreed">Crossbreed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {breedType === 'pedigree' && (
              <FormField
                control={form.control}
                name="breed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Breed *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a breed" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {breedOptions.map((breed) => (
                          <SelectItem key={breed.value} value={breed.value}>
                            {breed.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {breedType === 'crossbreed' && (
              <FormField
                control={form.control}
                name="crossbreedBreeds"
                render={({ field }) => (
                  <FormItem>
                    <TagStyleBreedSelector
                      breedOptions={breedOptions}
                      selectedBreeds={field.value || []}
                      onBreedsChange={(breeds) => {
                        field.onChange(breeds);
                        form.setValue('breed1', breeds[0] || '');
                        form.setValue('breed2', breeds[1] || '');
                      }}
                      label="Breeds *"
                      placeholder="Select 2 breeds for crossbreed..."
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="County" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {irishCounties.map((county) => (
                        <SelectItem key={county} value={county.toLowerCase()}>
                          {county}
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
              name="energy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Energy Level *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select energy level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Moderate">Moderate</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="VeryHigh">Very High</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Size Level *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select size level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Small">Small</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Large">Large</SelectItem>
                      <SelectItem value="ExtraLarge">Extra Large</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dob"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth *</FormLabel>
                  <Popover open={dobPopoverOpen} onOpenChange={setDobPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={4} avoidCollisions={false}>
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          handleDobChange(date);
                          setDobPopoverOpen(false);
                        }}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title * (10-50 characters)</FormLabel>
                <FormControl>
                  <Input placeholder="Beautiful Labrador Puppies" {...field} />
                </FormControl>
                <FormDescription>
                  Create a descriptive title that captures attention.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description * (100-1000 characters)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe your puppies in detail. Include information about temperament, size, parents, etc."
                    className="min-h-32"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Provide a detailed description of your puppies. Must be between 100-1000 characters.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="vetName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vet's Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Dr. Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vetLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vet's Location</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select county" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {irishCounties.map((county) => (
                        <SelectItem key={county} value={county.toLowerCase()}>
                          {county}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6 border border-brand-soft-green">
          <h2 className="text-xl font-semibold border-b pb-4">Puppy Details</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="maleCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Males *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      min="0"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        updatePuppyDetailsFromCounts(e.target.value, form.getValues('femaleCount'));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="femaleCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Females *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      min="0"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        updatePuppyDetailsFromCounts(form.getValues('maleCount'), e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Pricing Options Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Pricing Options</h3>
            <FormField
              control={form.control}
              name="pricingOption"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="space-y-3"
                    >
                      <div className="flex items-start space-x-3 p-3 border rounded-lg">
                        <RadioGroupItem value="uniform" id="uniform" />
                        <div className="flex-1">
                          <label htmlFor="uniform" className="text-sm font-medium cursor-pointer">
                            Same Price for All Puppies
                          </label>
                          <p className="text-xs text-gray-500 mt-1">
                            Set one price that applies to every puppy in the litter
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3 p-3 border rounded-lg">
                        <RadioGroupItem value="individual" id="individual" />
                        <div className="flex-1">
                          <label htmlFor="individual" className="text-sm font-medium cursor-pointer">
                            Individual Prices
                          </label>
                          <p className="text-xs text-gray-500 mt-1">
                            Set different prices for each puppy individually
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3 p-3 border rounded-lg">
                        <RadioGroupItem value="range" id="range" />
                        <div className="flex-1">
                          <label htmlFor="range" className="text-sm font-medium cursor-pointer">
                            Price Range
                          </label>
                          <p className="text-xs text-gray-500 mt-1">
                            Show a price range from minimum to maximum
                          </p>
                        </div>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Conditional pricing inputs */}
            {pricingOption === 'uniform' && (
              <FormField
                control={form.control}
                name="uniformPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price per Puppy *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="1000"
                        min="0"
                        step="0.01"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This price will apply to all puppies in the litter
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {pricingOption === 'range' && (
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="minPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Price *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="800"
                          min="0"
                          step="0.01"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Price *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="1200"
                          min="0"
                          step="0.01"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {pricingOption === 'individual' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  Individual pricing: You'll set specific prices for each puppy in the puppy details section below.
                </p>
              </div>
            )}
          </div>

          {/* Puppy Microchip Details Section */}
          <div className="mt-6">
            <PuppyMicrochipDetails
              puppies={puppyDetails}
              onPuppiesChange={setPuppyDetails}
              listingId={listingId}
              showValidationErrors={hasAttemptedSubmit}
              validationKey={puppyValidationKey}
              pricingOption={pricingOption}
            />
          </div>
        </div>

        {/* Images, Video, Documents, and Family Tree Section */}
        <div className="grid lg:grid-cols-2 gap-8 mt-6">
          <div className="space-y-8">
            {/* Images Section */}
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6 border border-brand-soft-green">
              <h2 className="text-xl font-semibold border-b pb-4">Litter Images</h2>
              <FormDescription className="mb-4">
                If you have a litter, you can upload high-quality images of your puppies (optional).
              </FormDescription>

              <ImageUploader
                value={uploadedImageUrls}
                onImagesSelected={handleImageUpload}
                onChange={handleImageUpload}
                maxImages={10}
                primaryImageIndex={selectedFeatureImage}
                onSetAsPrimary={handleSetAsPrimary}
                onImageDeleted={handleImageDelete}
                existingImages={uploadedImageUrls}
                bucketName="sale-listing-images"
                folder="listings"
                listingType="sale"
              />
            </div>

            {/* Video Section */}
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6 border border-brand-soft-green">
              <h2 className="text-xl font-semibold border-b pb-4">Video (Optional)</h2>
              <FormDescription className="mb-4">
                Upload a video or provide a YouTube/Vimeo link showcasing your puppies. This helps potential buyers get a better sense of their personalities and behavior.
              </FormDescription>

              <VideoUploader
                value={(form.watch('videoUrl' as any) as string | undefined) || uploadedVideoUrl}
                onChange={handleVideoChange}
                onFileChange={handleVideoFileChange}
                disabled={false}
              />
            </div>
          </div>

          <div className="space-y-8">
            {/* Supporting Documents Section */}
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6 border border-brand-soft-green">
              <h2 className="text-xl font-semibold border-b pb-4">Supporting Documents (Optional)</h2>
              <FormDescription className="mb-4">
                Upload health certificates, pedigree papers, or other relevant documents for your puppies.
              </FormDescription>

              <DocumentUploader
                value={uploadedDocuments}
                onChange={handleDocumentsChange}
                maxDocuments={5}
              />
            </div>
          </div>
        </div>

        {/* Family Tree Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6 border border-brand-soft-green mt-6">
          <h2 className="text-xl font-semibold border-b pb-4">Family Tree (Optional)</h2>
          <FamilyTreeInput
            familyTree={familyTreeData}
            onChange={handleFamilyTreeChange}
          />
        </div>

        {/* Buttons at bottom of form */}
        <div className="flex flex-wrap gap-4 justify-end pt-6 mt-6 border-t bg-background">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="w-full sm:w-auto min-w-[100px]">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto min-w-[150px]">
            {isSubmitting ? 'Converting...' : 'Convert to Sale Listing'}
          </Button>
        </div>
      </form>
    </Form>
  );
};
