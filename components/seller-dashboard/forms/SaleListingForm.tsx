import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { InfoIcon, CalendarIcon, Save, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { useDraftSaving } from '@/hooks/useDraftSaving';

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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ImageUploader } from './ImageUploader';
import { FamilyTreeInput, FamilyTreeMember } from './FamilyTreeInput';
import { CollarSelector } from './CollarSelector';
import { PuppyMicrochipDetails } from './PuppyMicrochipDetails';
import { TagStyleBreedSelector } from './TagStyleBreedSelector';
import { irishCounties } from '@/lib/utils/irish-data';
import { VideoUploader } from './VideoUploader';
import { DocumentUploader } from './DocumentUploader';
import { sendListingSubmissionEmail, sendAdminListingNotification } from '@/lib/utils/email-utils';
import { validateMultipleCodes, type HealthCodeType } from '@/lib/utils/code-validation';

const formSchema = z.object({
  title: z.string().min(10, { message: 'Title must be at least 10 characters' }).max(50, { message: 'Title must be no more than 50 characters' }),
  breedType: z.string({ message: 'Please select a breed type' }),
  breed: z.string().optional(),
  breed1: z.string().optional(),
  breed2: z.string().optional(),
  crossbreedBreeds: z.array(z.string()).optional(),
  location: z.string({ message: 'Please select a county' }),
  dob: z.date({ message: 'Please select a date of birth' }).refine((date) => {
    const now = new Date();
    const minimumPuppyAgeDate = new Date(now.getTime() - (6 * 7 * 24 * 60 * 60 * 1000));
    minimumPuppyAgeDate.setHours(23, 59, 59, 999);
    return date <= minimumPuppyAgeDate;
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
  videoUrl: z.string().optional(),
  microchipDatabase: z.string().optional(),
  energy: z.enum(['Low', 'Moderate', 'High', 'VeryHigh'] as [string, ...string[]]),
  size: z.enum(['Small', 'Medium', 'Large', 'ExtraLarge'] as [string, ...string[]]),
  // More fields can be added as needed
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
  // Validate pricing based on selected option
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

type FormValues = z.infer<typeof formSchema>;

// Mock data for dropdowns
const breedOptions = [
  { value: 'labrador', label: 'Labrador Retriever' },
  { value: 'goldendoodle', label: 'Goldendoodle' },
  { value: 'germanshepherd', label: 'German Shepherd' },
  { value: 'frenchbulldog', label: 'French Bulldog' },
  { value: 'beagle', label: 'Beagle' },
];

// Microchip database options
const microchipDatabaseOptions = [
  { value: 'animark', label: 'Animark.ie' },
  { value: 'fido-veripet', label: 'Fido.ie - VeriPet' },
  { value: 'fido-non-veripet', label: 'Fido.ie - non VeriPet' },
  { value: 'ikc', label: 'IKC - Irish Kennel Club' },
  { value: 'icc', label: 'ICC - Irish Coursing Club / MicroDog' },
  { value: 'uk-ni-defra', label: 'UK / NI DEFRA approved database' },
];

interface FamilyMember {
  name: string;
  breed: string;
  image?: File | string;
}

interface Grandparent extends FamilyMember {
  side: "maternal" | "paternal";
  position: "grandmother" | "grandfather";
}

interface FamilyTreeData {
  mother: FamilyMember;
  father: FamilyMember;
  grandparents: Grandparent[];
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
  documents?: UploadedDocument[];
}

interface UploadedDocument {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
}

// Add interface for component props
interface SaleListingFormProps {
  initialData?: any;
  draftId?: string;
  onSubmit?: (formData: any) => Promise<void>;
  isSubmitting?: boolean;
  submitButtonText?: string;
}

const SaleListingForm = ({
  initialData,
  draftId,
  onSubmit: onSubmitProp,
  isSubmitting: isSubmittingProp = false,
  submitButtonText = "Submit Sale Listing for Review"
}: SaleListingFormProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>(initialData?.images || []);
  const [selectedFeatureImage, setSelectedFeatureImage] = useState<number>(initialData?.primary_image_index || 0);
  const [isSaving, setIsSaving] = useState(false);
  /** Prevents double-submit before React re-renders disabled state */
  const submitInFlightRef = useRef(false);
  const [useCollarCodes, setUseCollarCodes] = useState<boolean>(initialData?.use_collar_codes || false);
  const [selectedColors, setSelectedColors] = useState<string[]>(initialData?.selected_colors || []);
  const [identifiers, setIdentifiers] = useState<string>(initialData?.identifiers || '');
  const [breedOptions, setBreedOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string>(initialData?.video_url || '');
  const [puppyDetails, setPuppyDetails] = useState<PuppyDetails[]>(initialData?.puppy_details || [{
    id: uuidv4(),
    microchipNumber: '',
    v1Code: '',
    v2Code: '',
    h1Code: '',
    sex: '',
    color: '',
    colourCollar: '',
    price: '',
    imageUrl: null
  }]);
  const [dobPopoverOpen, setDobPopoverOpen] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>(initialData?.documents || []);
  const [puppyValidationKey, setPuppyValidationKey] = useState(0);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Breed type options
  const breedTypeOptions = [
    { value: 'pedigree', label: 'Pedigree/Purebred' },
    { value: 'crossbreed', label: 'Crossbreed' },
  ];

  // Family tree data state - Updated to use FamilyTreeMember[]
  const [familyTreeData, setFamilyTreeData] = useState<FamilyTreeMember[]>(initialData?.family_tree || []);

  // Generate a unique listing ID for folder structure (Moved up to avoid TDZ)
  const [listingId] = useState(() => initialData?.id || uuidv4());

  // --- MANDATORY PUPPY DETAILS LOGIC ---
  const updatePuppyDetailsFromCounts = (mCountStr: string, fCountStr: string) => {
    const maleCount = parseInt(mCountStr) || 0;
    const femaleCount = parseInt(fCountStr) || 0;

    setPuppyDetails(prevDetails => {
      // Filter out existing males and females to preserve their data
      const existingMales = prevDetails.filter(p => p.sex === 'male');
      const existingFemales = prevDetails.filter(p => p.sex === 'female');
      const newDetails: PuppyDetails[] = [];

      // Handle Males
      for (let i = 0; i < maleCount; i++) {
        if (i < existingMales.length) {
          // Keep existing male
          newDetails.push(existingMales[i]);
        } else {
          // Add newly required male
          const newMale: PuppyDetails = {
            id: uuidv4(),
            microchipNumber: '',
            v1Code: '',
            v2Code: '',
            h1Code: '',
            sex: 'male',
            color: '',
            colourCollar: '',
            price: '', // Will be auto-filled if uniform pricing
            imageUrl: null
          };
          newDetails.push(newMale);
        }
      }

      // Handle Females
      for (let i = 0; i < femaleCount; i++) {
        if (i < existingFemales.length) {
          // Keep existing female
          newDetails.push(existingFemales[i]);
        } else {
          // Add newly required female
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

  const handleMaleCountChange = (value: string) => {
    updatePuppyDetailsFromCounts(value, form.getValues('femaleCount'));
  };

  const handleFemaleCountChange = (value: string) => {
    updatePuppyDetailsFromCounts(form.getValues('maleCount'), value);
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || '',
      breedType: initialData?.breedType || initialData?.breed_type || 'pedigree',
      breed: initialData?.breed || '',
      breed1: initialData?.breed1 || initialData?.breed_1 || '',
      breed2: initialData?.breed2 || initialData?.breed_2 || '',
      crossbreedBreeds: initialData?.crossbreedBreeds || [],
      location: initialData?.location || '',
      dob: initialData?.dob ? new Date(initialData.dob) : (initialData?.date_of_birth ? new Date(initialData.date_of_birth) : undefined),
      maleCount: (initialData?.maleCount ?? initialData?.male_count)?.toString() || '0',
      femaleCount: (initialData?.femaleCount ?? initialData?.female_count)?.toString() || '0',
      description: initialData?.description || '',
      vetName: initialData?.vetName || initialData?.vet_name || '',
      vetLocation: initialData?.vetLocation || initialData?.vet_location || '',
      pricingOption: initialData?.pricingOption || (initialData?.uniform_price ? 'uniform' :
        (initialData?.min_price && initialData?.max_price) ? 'range' : 'individual'),
      uniformPrice: (initialData?.uniformPrice ?? initialData?.uniform_price)?.toString() || '',
      minPrice: (initialData?.minPrice ?? initialData?.min_price)?.toString() || '',
      maxPrice: (initialData?.maxPrice ?? initialData?.max_price)?.toString() || '',
      videoUrl: initialData?.videoUrl || initialData?.video_url || '',
      microchipDatabase: initialData?.microchipDatabase || initialData?.microchip_database || '',
    },
    mode: 'onChange', // Enable real-time validation
  });

  // Watch form values for auto-save
  const formValues = form.watch();

  // Comprehensive form data including all state
  const comprehensiveFormData = {
    ...formValues,
    uploadedImageUrls,
    selectedFeatureImage,
    useCollarCodes,
    selectedColors,
    identifiers,
    uploadedVideoUrl,
    puppyDetails,
    familyTreeData,
    uploadedDocuments,
  };

  // Initialize draft saving with draftId
  const {
    isAutoSaving,
    lastSaved,
    autoSaveDraft,
    saveDraft,
  } = useDraftSaving(
    comprehensiveFormData,
    currentUser,
    'sale',
    draftId
  );

  // Get current user on mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getCurrentUser();
  }, []);

  // Hydrate state from initialData (handles drafts with camelCase keys)
  useEffect(() => {
    if (!initialData) return;

    // Patch form fields
    const currentValues = form.getValues();
    form.reset({
      ...currentValues,
      title: initialData.title ?? currentValues.title,
      breedType: initialData.breedType ?? initialData.breed_type ?? currentValues.breedType,
      breed: initialData.breed ?? currentValues.breed,
      breed1: initialData.breed1 ?? initialData.breed_1 ?? currentValues.breed1,
      breed2: initialData.breed2 ?? initialData.breed_2 ?? currentValues.breed2,
      crossbreedBreeds: initialData.crossbreedBreeds ?? currentValues.crossbreedBreeds,
      location: initialData.location ?? currentValues.location,
      dob: initialData.dob ? new Date(initialData.dob) : (initialData.date_of_birth ? new Date(initialData.date_of_birth) : currentValues.dob),
      maleCount: (initialData.maleCount ?? initialData.male_count ?? currentValues.maleCount)?.toString(),
      femaleCount: (initialData.femaleCount ?? initialData.female_count ?? currentValues.femaleCount)?.toString(),
      description: initialData.description ?? currentValues.description,
      vetName: initialData.vetName ?? initialData.vet_name ?? currentValues.vetName,
      vetLocation: initialData.vetLocation ?? initialData.vet_location ?? currentValues.vetLocation,
      pricingOption: initialData.pricingOption ?? currentValues.pricingOption,
      uniformPrice: (initialData.uniformPrice ?? initialData.uniform_price ?? currentValues.uniformPrice)?.toString(),
      minPrice: (initialData.minPrice ?? initialData.min_price ?? currentValues.minPrice)?.toString(),
      maxPrice: (initialData.maxPrice ?? initialData.max_price ?? currentValues.maxPrice)?.toString(),
      videoUrl: initialData.videoUrl ?? initialData.video_url ?? currentValues.videoUrl,
      microchipDatabase: initialData.microchipDatabase ?? initialData.microchip_database ?? currentValues.microchipDatabase,
      energy: initialData.energy ?? currentValues.energy,
      size: initialData.size ?? currentValues.size,
    });

    // Media and structured state
    setUploadedImageUrls(initialData.uploadedImageUrls ?? initialData.images ?? []);
    setSelectedFeatureImage(initialData.selectedFeatureImage ?? initialData.primary_image_index ?? 0);
    setUploadedVideoUrl(initialData.uploadedVideoUrl ?? initialData.video_url ?? '');
    // Initialize puppy details, preserving documents if they exist
    const initialPuppyDetails = initialData.puppyDetails ?? initialData.puppy_details ?? [];
    const puppyDetailsWithDocs = initialPuppyDetails.length > 0 
      ? initialPuppyDetails.map((puppy: any) => ({
          ...puppy,
          documents: puppy.documents || []
        }))
      : [{
          id: uuidv4(),
          microchipNumber: '',
          v1Code: '',
          v2Code: '',
          h1Code: '',
          sex: '',
          color: '',
          colourCollar: '',
          price: '',
          imageUrl: null,
          documents: []
        }];
    setPuppyDetails(puppyDetailsWithDocs);
    setUseCollarCodes(initialData.useCollarCodes ?? initialData.use_collar_codes ?? false);
    setSelectedColors(initialData.selectedColors ?? initialData.selected_colors ?? []);
    setIdentifiers(initialData.identifiers ?? '');
    setUploadedDocuments(initialData.uploadedDocuments ?? initialData.documents ?? []);
    setFamilyTreeData(initialData.familyTreeData ?? initialData.family_tree ?? []);
  }, [initialData]);

  // Debounced auto-save: 5 seconds after user stops typing
  useEffect(() => {
    if (!currentUser) return;

    const hasMinimalData = (formValues.title && formValues.title.length >= 3) ||
      (formValues.description && formValues.description.length >= 20) ||
      uploadedImageUrls.length > 0 ||
      formValues.location;

    if (!hasMinimalData) return;

    const debouncedSaveTimeout = setTimeout(() => {
      autoSaveDraft();
    }, 5000); // 5 seconds after last change

    return () => clearTimeout(debouncedSaveTimeout);
  }, [comprehensiveFormData, currentUser, autoSaveDraft]);

  // Backup: Auto-save every 30 seconds when form has minimal data
  useEffect(() => {
    if (!currentUser) return;

    const autoSaveInterval = setInterval(() => {
      const hasMinimalData = (formValues.title && formValues.title.length >= 3) ||
        (formValues.description && formValues.description.length >= 20) ||
        uploadedImageUrls.length > 0 ||
        formValues.location;

      if (hasMinimalData) {
        autoSaveDraft();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [formValues, uploadedImageUrls, currentUser, autoSaveDraft]);

  // Save on unmount
  useEffect(() => {
    return () => {
      const hasMinimalData = (formValues.title && formValues.title.length >= 3) ||
        (formValues.description && formValues.description.length >= 20) ||
        uploadedImageUrls.length > 0 ||
        formValues.location;

      if (hasMinimalData && currentUser) {
        autoSaveDraft();
      }
    };
  }, []);

  // Watch breed type and pricing option to conditionally show fields
  const breedType = form.watch('breedType');
  const breed1 = form.watch('breed1');
  const pricingOption = form.watch('pricingOption');

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
          toast({
            title: "Error loading breeds",
            description: "Could not load breed options. Please try again.",
            variant: "destructive",
          });
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
  }, [toast]);

  // Upload file to Supabase Storage
  const uploadFileToSupabase = async (file: File, bucket: string, folder: string): Promise<string> => {
    const { compressImageForUpload } = await import("@/lib/media/compressImage");
    const processed = await compressImageForUpload(file, "listing");
    const fileExt = processed.name.includes(".")
      ? processed.name.split(".").pop()
      : "webp";
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, processed, { contentType: processed.type });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  };

  // Upload family tree images before saving
  const uploadFamilyTreeImages = async (familyTree: FamilyTreeMember[], listingId: string): Promise<FamilyTreeMember[]> => {
    const bucket = 'family-tree-images';
    const folder = `family-tree/${listingId}`;

    const updatedTree = await Promise.all(
      familyTree.map(async (member) => {
        if (member.image instanceof File) {
          try {

            const url = await uploadFileToSupabase(member.image, bucket, folder);

            return { ...member, image: url };
          } catch (err) {
            console.error(`❌ Failed to upload image for ${member.relationship}:`, err);
            return { ...member, image: undefined };
          }
        }
        return member;
      })
    );

    return updatedTree;
  };

  // Helper function to extract family tree data into individual fields
  const extractFamilyTreeData = (familyTree: FamilyTreeMember[]) => {
    const familyData: any = {};

    familyTree.forEach((member) => {
      const relationship = member.relationship;
      const name = member.name || '';
      const breed = member.breed || '';
      const dob = member.dateOfBirth ? new Date(member.dateOfBirth).toISOString().split('T')[0] : null;
      const image = member.image || null;

      switch (relationship) {
        case 'mother':
          familyData.mother_name = name;
          familyData.mother_breed = breed;
          familyData.mother_dob = dob;
          familyData.mother_image = image;
          break;
        case 'father':
          familyData.father_name = name;
          familyData.father_breed = breed;
          familyData.father_dob = dob;
          familyData.father_image = image;
          break;
        case 'maternal-grandmother':
          familyData.maternal_grandmother_name = name;
          familyData.maternal_grandmother_breed = breed;
          familyData.maternal_grandmother_dob = dob;
          familyData.maternal_grandmother_image = image;
          break;
        case 'maternal-grandfather':
          familyData.maternal_grandfather_name = name;
          familyData.maternal_grandfather_breed = breed;
          familyData.maternal_grandfather_dob = dob;
          familyData.maternal_grandfather_image = image;
          break;
        case 'paternal-grandmother':
          familyData.paternal_grandmother_name = name;
          familyData.paternal_grandmother_breed = breed;
          familyData.paternal_grandmother_dob = dob;
          familyData.paternal_grandmother_image = image;
          break;
        case 'paternal-grandfather':
          familyData.paternal_grandfather_name = name;
          familyData.paternal_grandfather_breed = breed;
          familyData.paternal_grandfather_dob = dob;
          familyData.paternal_grandfather_image = image;
          break;
      }
    });

    return familyData;
  };

  // Handle DOB change with immediate validation
  const handleDobChange = (date: Date | undefined) => {
    if (date) {
      form.setValue('dob', date);
    }
    // Trigger validation immediately
    form.trigger('dob');
  };

  const onSubmit = async (data: FormValues) => {
    setHasAttemptedSubmit(true);
    setPuppyValidationKey(prev => prev + 1); // this will re-render PuppyMicrochipDetails

    // If we have a custom onSubmit prop (editing mode), use that instead
    if (onSubmitProp) {
      if (submitInFlightRef.current) return;
      submitInFlightRef.current = true;
      try {
        const completeFormData = {
          ...data,
          uploadedImageUrls,
          selectedFeatureImage,
          useCollarCodes,
          selectedColors,
          identifiers,
          uploadedVideoUrl,
          puppyDetails,
          family_tree: familyTreeData,
          uploadedDocuments,
        };
        await onSubmitProp(completeFormData);
      } finally {
        submitInFlightRef.current = false;
      }
      return;
    }

    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setIsSaving(true);

    try {
    // Original submit logic for creating new listings

    // Images are now optional - sellers can submit without images
    if (uploadedImageUrls.length === 0) {

    }

    // Optional puppy details validation - allow partial details
    // Users can submit without complete puppy information initially
    const totalPuppies = parseInt(data.maleCount) + parseInt(data.femaleCount);
    
    // Validate that all puppies have required microchip numbers
    const puppiesWithMicrochip = puppyDetails.filter(puppy => 
      puppy.microchipNumber && puppy.microchipNumber.trim().length === 15 && /^\d{15}$/.test(puppy.microchipNumber.trim())
    );
    
    if (puppyDetails.length > 0 && puppiesWithMicrochip.length !== puppyDetails.length) {
      toast({
        title: "Microchip Number Required",
        description: "All puppies must have a valid 15-digit microchip number.",
        variant: "destructive",
      });
      setPuppyValidationKey(prev => prev + 1);
      return;
    }
    
    const puppyDetailsWithData = puppyDetails.filter(puppy =>
      puppy.microchipNumber.trim() !== '' ||
      puppy.v1Code.trim() !== '' ||
      puppy.v2Code.trim() !== '' ||
      puppy.h1Code.trim() !== '' ||
      puppy.sex !== '' ||
      puppy.color.trim() !== '' ||
      puppy.price.trim() !== '' ||
      puppy.imageUrl !== null
    );

    // Removed strict puppy count validation - allow partial submission

    // Relaxed validation - only check price requirements for individual pricing
    for (let i = 0; i < puppyDetailsWithData.length; i++) {
      const puppy = puppyDetailsWithData[i];

      // Only validate individual pricing if that option is selected
      if (data.pricingOption === 'individual' && puppy.sex && !puppy.price.trim()) {

        toast({
          title: "Missing puppy prices",
          description: "Puppies with details must have individual prices when using individual pricing option.",
          variant: "destructive",
        });
        return;
      }
    }

    // Validate health codes (H1, V1, V2) against database
    const codesToValidate: { code: string; type: HealthCodeType }[] = [];
    
    // Collect all codes from puppyDetails
    puppyDetails.forEach((puppy) => {
      if (puppy.v1Code && puppy.v1Code.trim()) {
        codesToValidate.push({ code: puppy.v1Code, type: 'V1' });
      }
      if (puppy.v2Code && puppy.v2Code.trim()) {
        codesToValidate.push({ code: puppy.v2Code, type: 'V2' });
      }
      if (puppy.h1Code && puppy.h1Code.trim()) {
        codesToValidate.push({ code: puppy.h1Code, type: 'H1' });
      }
    });

    // Validate all codes
    if (codesToValidate.length > 0) {
      const codeContext = initialData?.id
        ? { excludeListingId: initialData.id as string, excludeListingType: 'sale' as const }
        : undefined;
      const validationResult = await validateMultipleCodes(codesToValidate, codeContext);

      if (!validationResult.valid) {
        if (validationResult.reusedCodes.length > 0) {
          const reusedList = validationResult.reusedCodes
            .map((c) => `${c.code} (${c.type})`)
            .join(', ');
          toast({
            title: 'Health code already used',
            description: `These codes are already locked to another live ad: ${reusedList}. Each code can only be used once.`,
            variant: 'destructive',
          });
          return;
        }
        const invalidCodesList = validationResult.invalidCodes
          .map((c) => `${c.code} (${c.type})`)
          .join(', ');

        toast({
          title: 'Invalid health codes',
          description: `The following codes are not valid or not found in the system: ${invalidCodesList}. Please check with your vet or contact support.`,
          variant: 'destructive',
        });
        return;
      }
    }

    // First create the listing, then show pricing modal
    await handleActualSubmit(data);
    } finally {
      submitInFlightRef.current = false;
      setIsSaving(false);
    }
  };

  // Function to handle actual submission after payment
  const handleActualSubmit = async (data: FormValues) => {
    try {

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("❌ Authentication error:", userError);
        toast({
          title: "Authentication error",
          description: "You must be logged in to create a listing",
          variant: "destructive",
        });
        return;
      }

      // Upload video if one was selected
      let finalVideoUrl = data.videoUrl || '';
      if (uploadedVideo) {
        try {
          finalVideoUrl = await uploadFileToSupabase(uploadedVideo, 'sale-listing-videos', 'listings');

        } catch (error) {
          console.error("❌ Video upload failed:", error);
          toast({
            title: "Video upload failed",
            description: "Failed to upload video. Continuing without video.",
            variant: "destructive",
          });
        }
      }

      // Upload family tree images first

      const uploadedFamilyTree = await uploadFamilyTreeImages(familyTreeData, listingId);

      // Update state with uploaded family tree data
      setFamilyTreeData(uploadedFamilyTree);

      // Extract family tree data into individual fields (now with uploaded URLs)
      const familyTreeFields = extractFamilyTreeData(uploadedFamilyTree);

      // Auto-populate puppy prices for uniform pricing
      let finalPuppyDetails = [...puppyDetails];
      if (data.pricingOption === 'uniform' && data.uniformPrice) {
        finalPuppyDetails = puppyDetails.map(puppy => ({
          ...puppy,
          price: data.uniformPrice || puppy.price
        }));
      }

      // Prepare the listing data with Supabase Storage URLs

      const listingData = {
        seller_id: user.id,
        title: data.title,
        breed_type: data.breedType,
        breed: data.breedType === 'pedigree' ? data.breed : (data.breed1 && data.breed2 ? `${data.breed1}-${data.breed2}` : 'crossbreed'),
        breed_1: data.breedType === 'crossbreed' ? data.breed1 : (data.breedType === 'pedigree' ? data.breed : null),
        breed_2: data.breedType === 'crossbreed' ? data.breed2 : null,
        location: data.location,
        date_of_birth: data.dob.toISOString().split('T')[0],
        male_count: parseInt(data.maleCount),
        female_count: parseInt(data.femaleCount),
        description: data.description,
        vet_name: data.vetName,
        vet_location: data.vetLocation,
        same_pricing: data.pricingOption === 'uniform' ? 'yes' : 'no',
        uniform_price: data.pricingOption === 'uniform' ? parseFloat(data.uniformPrice || '0') : null,
        min_price: data.pricingOption === 'range' ? parseFloat(data.minPrice || '0') : null,
        max_price: data.pricingOption === 'range' ? parseFloat(data.maxPrice || '0') : null,
        energy: data.energy,
        size: data.size,
        images: uploadedImageUrls,
        primary_image_index: selectedFeatureImage,
        video_url: finalVideoUrl || null,
        microchip_database: data.microchipDatabase || null,
        puppy_details: finalPuppyDetails as any,
        use_collar_codes: useCollarCodes,
        selected_colors: selectedColors as any,
        identifiers: identifiers || null,
        documents: uploadedDocuments.map(doc => ({
          id: doc.id,
          name: doc.name,
          url: doc.url,
          size: doc.size
        })) as any,
        status: 'pending_review',
        payment_status: 'paid',
        is_paid: true,
        // expires_at set on admin approval (28 days from go-live)
        // Spread the individual family tree fields
        ...familyTreeFields
      };

      const { data: insertedListing, error: insertError } = await supabase
        .from('sale_listings')
        .insert(listingData)
        .select()
        .single();

      if (insertError) {
        console.error("❌ Database insert error:", insertError);
        toast({
          title: "Error creating listing",
          description: "There was a problem saving your listing. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Auto-verify health codes
      try {
        const { extractCodesFromPuppyDetails, verifyListingCodes } = await import('@/lib/utils/code-verification');
        const codes = extractCodesFromPuppyDetails(finalPuppyDetails);
        if (codes.length > 0) {
          await verifyListingCodes(insertedListing.id, 'sale', codes);
        }
      } catch (verifyError) {
        console.error("Error verifying codes:", verifyError);
        // Don't block submission if verification fails
      }

      // If this listing was created from a saved draft, remove the draft to prevent duplicate ads.
      if (draftId) {
        const { error: draftCleanupError } = await supabase
          .from('sale_listing_drafts')
          .delete()
          .eq('id', draftId);

        if (draftCleanupError) {
          // Non-blocking: listing is already created, but log for investigation.
          console.error('Failed to remove sale listing draft after publish:', draftCleanupError);
        }
      }

      // Get user profile for email
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      // Send confirmation emails
      try {
        await sendListingSubmissionEmail({
          email: user.email || '',
          firstName: profile?.first_name ?? undefined,
          listingTitle: data.title,
          listingType: 'puppy',
          listingId: insertedListing.id
        });

        await sendAdminListingNotification({
          listingTitle: data.title,
          listingType: 'puppy',
          listingId: insertedListing.id,
          sellerEmail: user.email || '',
          sellerName: profile ? `${profile.first_name} ${profile.last_name}` : undefined
        });
      } catch (emailError) {
        console.error("Email notification error:", emailError);
      }

      toast({
        title: "Listing submitted successfully!",
        description: "Your listing has been submitted for review.",
      });

      // Redirect to seller dashboard
      router.push('/my-seller-dashboard/listings');
    } catch (error) {
      console.error("💥 Unexpected error during submission:", error);
      toast({
        title: "Error creating listing",
        description: "There was a problem creating your listing. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = (urls: string[]) => {

    setUploadedImageUrls(urls);
    if (urls.length > 0 && selectedFeatureImage >= urls.length) {
      setSelectedFeatureImage(0);
    }

  };

  const handleSaveAsDraft = async () => {
    if (!currentUser) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to save a draft",
        variant: "destructive",
      });
      return;
    }

    const formData = form.getValues();

    // Generate a descriptive draft name
    const draftName = formData.title
      ? `${formData.title.substring(0, 30)}${formData.title.length > 30 ? '...' : ''}`
      : 'Manual Draft';

    await saveDraft(draftName);
    router.push("/my-seller-dashboard/listings");
  };

  const handleVideoUpload = async (file: File | null) => {
    if (file) {
      // Clear video URL when uploading a file
      form.setValue('videoUrl', '');
      setUploadedVideo(file);
    }
  };

  const handleVideoDelete = () => {
    setUploadedVideo(null);
    setUploadedVideoUrl('');
  };

  const handleVideoUrlChange = (value: string) => {
    if (value.trim()) {
      // Clear uploaded video when entering a URL
      setUploadedVideo(null);
    }
  };

  // Handle family tree data change - Updated to work with FamilyTreeMember[]
  const handleFamilyTreeChange = (updatedTree: FamilyTreeMember[]) => {
    setFamilyTreeData(updatedTree);
  };

  // Mock data for counties
  const countyOptions = [
    'Antrim', 'Armagh', 'Carlow', 'Cavan', 'Clare', 'Cork', 'Derry',
    'Donegal', 'Down', 'Dublin', 'Fermanagh', 'Galway', 'Kerry', 'Kildare',
    'Kilkenny', 'Laois', 'Leitrim', 'Limerick', 'Longford', 'Louth',
    'Mayo', 'Meath', 'Monaghan', 'Offaly', 'Roscommon', 'Sligo', 'Tipperary',
    'Tyrone', 'Waterford', 'Westmeath', 'Wexford', 'Wicklow'
  ].sort();

  const handleImageDelete = (index: number) => {
    // Create a new array without the deleted image
    const updatedUrls = [...uploadedImageUrls];
    updatedUrls.splice(index, 1);
    setUploadedImageUrls(updatedUrls);

    // Update primary image index if needed
    if (selectedFeatureImage >= index && selectedFeatureImage > 0) {
      setSelectedFeatureImage(selectedFeatureImage - 1);
    }
  };

  const handleSetAsPrimary = (index: number) => {
    setSelectedFeatureImage(index);
  };

  // Determine if we're in editing mode and what loading state to show
  const isEditMode = !!initialData;
  const isLoading = isEditMode ? isSubmittingProp : isSaving;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Auto-save indicator */}
        {currentUser && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              {isAutoSaving ? (
                <>
                  <Save className="h-4 w-4 animate-pulse" />
                  <span>Saving draft...</span>
                </>
              ) : lastSaved ? (
                <>
                  <Clock className="h-4 w-4" />
                  <span>Last saved: {format(lastSaved, 'HH:mm:ss')}</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Changes will be auto-saved</span>
                </>
              )}
            </div>
            <span className="text-xs text-blue-600">Your progress is automatically saved every 30 seconds</span>
          </div>
        )}

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
                      {breedTypeOptions.map((breedType) => (
                        <SelectItem key={breedType.value} value={breedType.value}>
                          {breedType.label}
                        </SelectItem>
                      ))}
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
                        <SelectTrigger className={hasAttemptedSubmit && !field.value ? 'border-red-500' : ''}>
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
                    {hasAttemptedSubmit && !field.value && (
                      <p className="text-red-500 text-sm mt-1">Breed is required</p>
                    )}
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
                    {hasAttemptedSubmit && (!field.value || field.value.length < 2) && (
                      <p className="text-red-500 text-sm mt-1">Please select 2 breeds for crossbreed</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Show breed field when no breed type is selected or when pedigree is selected but no specific field is showing */}
            {!breedType && (
              <FormField
                control={form.control}
                name="breed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Breed *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className={hasAttemptedSubmit && !field.value ? 'border-red-500' : ''}>
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
                    {hasAttemptedSubmit && !field.value && (
                      <p className="text-red-500 text-sm mt-1">Breed is required</p>
                    )}
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
                      <SelectTrigger className={hasAttemptedSubmit && !field.value ? 'border-red-500' : ''}>
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
                  {hasAttemptedSubmit && !field.value && (
                    <p className="text-red-500 text-sm mt-1">Location is required</p>
                  )}
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className={hasAttemptedSubmit && !field.value ? 'border-red-500' : ''}>
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
                  {hasAttemptedSubmit && !field.value && (
                    <p className="text-red-500 text-sm mt-1">Energy level is required</p>
                  )}
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className={hasAttemptedSubmit && !field.value ? 'border-red-500' : ''}>
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
                  {hasAttemptedSubmit && !field.value && (
                    <p className="text-red-500 text-sm mt-1">Size level is required</p>
                  )}
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
                          if (date) {
                            handleDobChange(date);
                            // Small delay to ensure date is set before closing
                            setTimeout(() => setDobPopoverOpen(false), 100);
                          }
                        }}
                        disabled={(date) => {
                          const now = new Date();
                          const minimumPuppyAgeDate = new Date(now.getTime() - (6 * 7 * 24 * 60 * 60 * 1000));
                          minimumPuppyAgeDate.setHours(23, 59, 59, 999);
                          return date > minimumPuppyAgeDate || date < new Date("1900-01-01");
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Puppies must be at least 6 weeks old.
                  </FormDescription>
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

          {/* Seller Information Link */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 mb-2">
              <strong>Need help understanding seller categories?</strong>
            </p>
            <p className="text-sm text-blue-600 mb-3">
              Learn about the different types of sellers (Private, Registered, DBE) and their obligations.
            </p>
            <a
              href="/sellers/info"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 underline font-medium"
            >
              Learn about seller categories →
            </a>
          </div>

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
                        handleMaleCountChange(e.target.value);
                        field.onChange(e);
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
                        handleFemaleCountChange(e.target.value);
                        field.onChange(e);
                        // Trigger auto-update of puppy details
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

          <div style={{ display: 'none' }}>
            <FormField
              control={form.control}
              name="microchipDatabase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Database your dog(s) is (are) registered with:</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a database" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {microchipDatabaseOptions.map((database) => (
                        <SelectItem key={database.value} value={database.value}>
                          {database.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="bg-emerald-50 p-4 rounded-md">
            <div className="flex flex-col md:flex-row md:justify-around items-start max-w-4xl mx-auto space-y-4 md:space-y-0 md:space-x-16 px-6">

              {/* Gold Star Section */}
              <div className="flex items-start">
                <div className="bg-white rounded-full p-3 mr-6 flex items-center justify-center">
                  <img
                    src="/badges/goldernstart.jpeg"
                    alt="Gold Star Badge"
                    className="h-16 w-16 object-contain"
                  />
                </div>
                <div>
                  <p className="text-xl font-berkshire text-emerald-800 mt-2">Gold Star</p>
                  <p className="text-sm text-emerald-700">Shown when H1 document is approved</p>
                </div>
              </div>

              {/* Green Tick Section */}
              <div className="flex items-start">
                <div className="bg-white rounded-full p-3 mr-4 flex items-center justify-center">
                  <img
                    src="/badges/greentick.jpeg"
                    alt="Green Tick Badge"
                    className="h-16 w-16 object-contain"
                  />
                </div>
                <div>
                  <p className="text-xl font-berkshire text-emerald-800 mt-2">Green Tick</p>
                  <p className="text-sm text-emerald-700">
                    Shown when V1 is approved and when V2 is approved by week 12
                  </p>
                </div>
              </div>

            </div>
          </div>

          <PuppyMicrochipDetails
            puppies={puppyDetails}
            onPuppiesChange={setPuppyDetails}
            listingId={listingId}
            excludeListingId={initialData?.id}
            showValidationErrors={hasAttemptedSubmit}
            validationKey={puppyValidationKey}
            pricingOption={pricingOption}
          />

        </div>

        <div className="grid lg:grid-cols-2 gap-8">
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
                existingImages={[]}
                bucketName="sale-listing-images"
                folder="listings"
                listingType="sale"
              />
            </div>

            {/* Documents Section */}
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6 border border-brand-soft-green">
              <h2 className="text-xl font-semibold border-b pb-4">Supporting Documents (Optional)</h2>
              <FormDescription className="mb-4">
                Upload any supporting documents such as vet forms, health certificates, pedigree papers, or other documentation that may help with the approval of your listing.
              </FormDescription>

              <DocumentUploader
                value={uploadedDocuments}
                onChange={setUploadedDocuments}
                disabled={isLoading}
                maxDocuments={5}
              />
            </div>
          </div>

          {/* Video Section */}
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-6 border border-brand-soft-green">
            <h2 className="text-xl font-semibold border-b pb-4">Video (Optional)</h2>
            <FormDescription className="mb-4">
              Upload a video or provide a YouTube/Vimeo link showcasing your puppies. This helps potential buyers get a better sense of their personalities and behavior.
            </FormDescription>

            <VideoUploader
              value={form.watch('videoUrl') || uploadedVideoUrl}
              onChange={(url) => {
                if (url) {
                  if (url.startsWith('http')) {
                    // External URL
                    form.setValue('videoUrl', url);
                    setUploadedVideo(null);
                    setUploadedVideoUrl('');
                  } else {
                    // Uploaded file URL
                    setUploadedVideoUrl(url);
                    form.setValue('videoUrl', '');
                  }
                } else {
                  // Cleared
                  form.setValue('videoUrl', '');
                  setUploadedVideo(null);
                  setUploadedVideoUrl('');
                }
              }}
              onFileChange={(file) => {
                setUploadedVideo(file);
              }}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6 border border-brand-soft-green">
          <h2 className="text-xl font-semibold border-b pb-4">Family Tree (Optional)</h2>
          <FamilyTreeInput
            familyTree={familyTreeData}
            onChange={handleFamilyTreeChange}
          />
        </div>

        <div className="flex flex-wrap gap-4 justify-between">
          <Button type="button" variant="outline" onClick={() => router.push("/my-seller-dashboard/listings")}>
            Cancel
          </Button>

          <div className="flex gap-3">
            {!isEditMode && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveAsDraft}
                disabled={isLoading}
              >
                {isLoading ? "Saving..." : "Save as Draft"}
              </Button>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              onClick={() => {
              }}
            >
              {isLoading ? "Saving..." : submitButtonText}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
};

export default SaleListingForm;
