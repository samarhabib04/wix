import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Save, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import { ImageUploader } from './ImageUploader';
import { FamilyTreeInput } from './FamilyTreeInput';
import { DocumentUploader } from './DocumentUploader';
import { VideoUploader } from './VideoUploader';
import { HealthLabel } from './HealthLabel';
import { HealthCodeInput } from './HealthCodeInput';
import { irishCounties } from '@/lib/utils/irish-data';
import { TagStyleBreedSelector } from './TagStyleBreedSelector';
import { useToast } from '@/hooks/use-toast';
import { useDraftSaving } from '@/hooks/useDraftSaving';
import { useRouter } from 'next/navigation';
import { ListingPricingModal } from '@/components/ListingPricingModal';
import { sendListingSubmissionEmail, sendAdminListingNotification } from '@/lib/utils/email-utils';
import { validateMultipleCodes, type HealthCodeType } from '@/lib/utils/code-validation';
import { STUD_LISTING_SEX, normalizeStudListingSex, studListingSexSchema } from '@/lib/utils/stud-listing-sex';

const studListingSchema = z.object({
  title: z.string().min(10, { message: 'Title must be at least 10 characters' }).max(50, { message: 'Title must be no more than 50 characters' }),
  breedType: z.string({ message: 'Please select a breed type' }),
  breed: z.string().optional(),
  customBreed: z.string().optional(),
  breed1: z.string().optional(),
  breed2: z.string().optional(),
  crossbreedBreeds: z.array(z.string()).optional(),
  description: z.string().min(100, { message: 'Description must be at least 100 characters' }).max(1000, { message: 'Description must be no more than 1000 characters' }),
  location: z.string().min(1, 'Location is required'),
  dob: z.date({ message: 'Please select a date of birth' }).refine((date) => {
    const today = new Date();
    const minDate = new Date('1900-01-01');
    return date <= today && date >= minDate;
  }, {
    message: 'Date of birth must be in the past and after 1900'
  }).refine((date) => {
    const minimumStudAgeDate = new Date();
    minimumStudAgeDate.setFullYear(minimumStudAgeDate.getFullYear() - 1);
    return date <= minimumStudAgeDate;
  }, {
    message: 'Stud must be at least 12 months old (Dog Quest recommendation)'
  }),
  stud_fee: z.coerce.number().min(0, 'Stud fee must be a positive number').optional(),
  sex: studListingSexSchema,
  colour: z.string().min(1, 'Colour is required'),
  microchip_number: z.string().regex(/^\d{15}$/, 'Microchip number must be exactly 15 digits').min(1, 'Microchip number is required'),
  vet_name: z.string().optional(),
  vet_location: z.string().optional(),
  images: z.array(z.string()).min(1, 'At least one image is required'),
  video_url: z.string().optional(),
  v1_cert: z.string().optional().refine(
    (val) => !val || /^[A-Z0-9]{12}$/.test(val),
    { message: 'V1 code must be exactly 12 characters (e.g., RDS1V1123456)' }
  ),
  v2_cert: z.string().optional().refine(
    (val) => !val || /^[A-Z0-9]{12}$/.test(val),
    { message: 'V2 code must be exactly 12 characters (e.g., RDS1V2123456)' }
  ),
  h1_cert: z.string().optional().refine(
    (val) => !val || /^[A-Z0-9]{12}$/.test(val),
    { message: 'H1 code must be exactly 12 characters (e.g., RDS1H1123456)' }
  ),
  family_tree: z.any().optional(),
  pick_of_litter: z.boolean(),
}).refine((data) => {
  if (data.breedType === 'pedigree') {
    // Allow "Other" with a custom input
    if (data.breed === '__other__') {
      return data.customBreed && data.customBreed.trim().length >= 2;
    }
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
  // Either stud_fee must be greater than 0 OR pick_of_litter must be true
  const hasStudFee = data.stud_fee && data.stud_fee > 0;
  const hasPickOfLitter = data.pick_of_litter === true;
  return hasStudFee || hasPickOfLitter;
}, {
  message: "Please enter a stud fee OR check 'Pick of the Litter available'",
  path: ["stud_fee"]
});

type StudListingFormData = z.infer<typeof studListingSchema>;

interface StudListingFormProps {
  initialData?: Partial<StudListingFormData>;
}

// Helper function to upload image files to Supabase storage
const uploadFamilyTreeImage = async (imageFile: File): Promise<string | null> => {
  try {
    const { compressImageForUpload } = await import("@/lib/media/compressImage");
    const processed = await compressImageForUpload(imageFile, "familyTree");
    const fileExt = processed.name.includes(".")
      ? processed.name.split(".").pop()
      : "webp";
    const fileName = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}.${fileExt}`;
    const filePath = `family-tree/${fileName}`;

    const { data, error } = await supabase.storage
      .from('family-tree-images')
      .upload(filePath, processed, {
        cacheControl: '3600',
        upsert: true,
        contentType: processed.type,
      });

    if (error) {
      console.error('Error uploading family tree image:', error);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('family-tree-images')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error uploading family tree image:', error);
    return null;
  }
};

// Helper function to flatten family tree data from array format to individual columns
const flattenFamilyTreeData = async (familyTreeArray: any[]) => {

  if (!familyTreeArray || !Array.isArray(familyTreeArray)) {

    return {};
  }
  
  const result: any = {};
  
  for (const member of familyTreeArray) {

    if (!member || !member.relationship) {

      continue;
    }
    
    let imageUrl = null;
    
    // Handle image upload if it's a File object
    if (member.image instanceof File) {

      imageUrl = await uploadFamilyTreeImage(member.image);
    } else if (typeof member.image === 'string' && member.image.startsWith('http')) {
      // Already a URL
      imageUrl = member.image;

    }
    
    // Map relationships to database columns
    const relationship = member.relationship.toLowerCase();

    switch (relationship) {
      case 'mother':
        result.mother_name = member.name || null;
        result.mother_breed = member.breed || null;
        result.mother_image = imageUrl;
        break;
      case 'father':
        result.father_name = member.name || null;
        result.father_breed = member.breed || null;
        result.father_image = imageUrl;
        break;
      case 'maternal-grandmother':
      case 'maternal_grandmother':
        result.maternal_grandmother_name = member.name || null;
        result.maternal_grandmother_breed = member.breed || null;
        result.maternal_grandmother_image = imageUrl;
        break;
      case 'maternal-grandfather':
      case 'maternal_grandfather':
        result.maternal_grandfather_name = member.name || null;
        result.maternal_grandfather_breed = member.breed || null;
        result.maternal_grandfather_image = imageUrl;
        break;
      case 'paternal-grandmother':
      case 'paternal_grandmother':
        result.paternal_grandmother_name = member.name || null;
        result.paternal_grandmother_breed = member.breed || null;
        result.paternal_grandmother_image = imageUrl;
        break;
      case 'paternal-grandfather':
      case 'paternal_grandfather':
        result.paternal_grandfather_name = member.name || null;
        result.paternal_grandfather_breed = member.breed || null;
        result.paternal_grandfather_image = imageUrl;
        break;
      default:

    }
  }

  return result;
};

const StudListingForm: React.FC<StudListingFormProps> = ({
  initialData,
}) => {
  const { toast } = useToast();
  const router = useRouter();
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [familyTree, setFamilyTree] = useState(initialData?.family_tree || []);
  const [breedOptions, setBreedOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitInFlightRef = useRef(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pendingListingData, setPendingListingData] = useState<any>(null);
  const [dobPopoverOpen, setDobPopoverOpen] = useState(false);
  const lastAutoSaveAtRef = useRef<number>(0);

  const form = useForm<StudListingFormData>({
    resolver: zodResolver(studListingSchema) as any,
    defaultValues: {
      title: initialData?.title || '',
      breedType: (initialData as any)?.breed_type || initialData?.breedType || 'pedigree',
      breed: initialData?.breed1 || initialData?.breed || '',
      customBreed: (initialData as any)?.customBreed || '',
      breed1: initialData?.breed1 || '',
      breed2: initialData?.breed2 || '',
      crossbreedBreeds: (initialData as any)?.crossbreed_breeds || initialData?.crossbreedBreeds || [],
      description: initialData?.description || '',
      location: initialData?.location || '',
      dob: initialData?.dob ? new Date(initialData.dob) : undefined,
      stud_fee: initialData?.stud_fee || 0,
      sex: normalizeStudListingSex(initialData?.sex),
      colour: initialData?.colour || '',
      microchip_number: initialData?.microchip_number || '',
      vet_name: initialData?.vet_name || '',
      vet_location: initialData?.vet_location || '',
      images: initialData?.images || [],
      video_url: initialData?.video_url || '',
      v1_cert: initialData?.v1_cert || '',
      v2_cert: initialData?.v2_cert || '',
      h1_cert: initialData?.h1_cert || '',
      family_tree: initialData?.family_tree || [],
      pick_of_litter: initialData?.pick_of_litter || false,
    },
  });

  useEffect(() => {
    form.setValue('sex', STUD_LISTING_SEX);
  }, [form]);

  // Get current user for draft saving
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getCurrentUser();
  }, []);

  // Watch form values for draft saving
  const formValues = form.watch();
  const formValuesWithImages = useMemo(() => {
    return {
      ...formValues,
      images,
      family_tree: familyTree,
    };
    // formValues changes when RHF fields change; memo prevents creating a new object
    // on unrelated re-renders (like draft save UI state changes)
  }, [formValues, images, familyTree]);

  // Initialize draft saving hook
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
  } = useDraftSaving(formValuesWithImages, currentUser, 'stud');

  // Debounced auto-save: 5 seconds after user stops typing
  useEffect(() => {
    if (!currentUser) return;
    
    const hasMinimalData = (formValues.title && formValues.title.length >= 3) || 
                           (formValues.description && formValues.description.length >= 20) || 
                           images.length > 0 ||
                           formValues.location;
    
    if (!hasMinimalData) return;
    
    const debouncedSaveTimeout = setTimeout(() => {
      const now = Date.now();
      if (now - lastAutoSaveAtRef.current < 15000) return; // hard throttle: 15s
      lastAutoSaveAtRef.current = now;
      autoSaveDraft();
    }, 5000); // 5 seconds after last change

    return () => clearTimeout(debouncedSaveTimeout);
  }, [formValuesWithImages, currentUser, autoSaveDraft]);

  // Backup: Auto-save every 30 seconds when form has minimal data
  useEffect(() => {
    if (!currentUser) return;
    
    const autoSaveInterval = setInterval(() => {
      const hasMinimalData = (formValues.title && formValues.title.length >= 3) || 
                             (formValues.description && formValues.description.length >= 20) || 
                             images.length > 0 ||
                             formValues.location;
      
      if (hasMinimalData) {
        const now = Date.now();
        if (now - lastAutoSaveAtRef.current < 15000) return;
        lastAutoSaveAtRef.current = now;
        autoSaveDraft();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [formValues, images, currentUser, autoSaveDraft]);

  // Save on unmount
  useEffect(() => {
    return () => {
      const hasMinimalData = (formValues.title && formValues.title.length >= 3) || 
                             (formValues.description && formValues.description.length >= 20) || 
                             images.length > 0 ||
                             formValues.location;
      
      if (hasMinimalData && currentUser) {
        // Best-effort save on unmount; don't spam if we just saved.
        const now = Date.now();
        if (now - lastAutoSaveAtRef.current < 5000) return;
        lastAutoSaveAtRef.current = now;
        autoSaveDraft();
      }
    };
  }, [formValues, images, currentUser, autoSaveDraft]);

  // Watch breed type to conditionally show breed fields
  const breedType = form.watch('breedType');

  // Breed type options
  const breedTypeOptions = [
    { value: 'pedigree', label: 'Pedigree/Purebred' },
    { value: 'crossbreed', label: 'Crossbreed' },
  ];

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
        
        const formattedBreeds = (data || [])
          .map(item => item.breed)
          .filter(Boolean)
          .map(breed => ({
            value: breed,
            label: breed
          }));
        
        setBreedOptions(formattedBreeds);
      } catch (error) {
        console.error('Error fetching breeds:', error);
      }
    };
    
    fetchBreeds();
  }, [toast]);

  // Update form when initialData is available and breedOptions are loaded
  useEffect(() => {
    if (initialData && breedOptions.length > 0) {
      const breedValue = initialData.breed1 || initialData.breed || '';
      const breedTypeValue = (initialData as any).breed_type || initialData.breedType || 'pedigree';
      
      // Check if breed exists in options, if not, it might be a custom breed
      const breedExists = breedOptions.some(opt => opt.value === breedValue);
      
      // If breed doesn't exist in options and it's not empty, it's likely a custom breed
      if (breedValue && !breedExists && breedValue !== '__other__') {
        // Set to __other__ and populate customBreed
        form.setValue('breed', '__other__');
        form.setValue('customBreed', breedValue);
      } else if (breedValue && breedExists) {
        // Breed exists in options, set it directly
        form.setValue('breed', breedValue);
      }
      
      // Update breedType if needed
      if (breedTypeValue && form.getValues('breedType') !== breedTypeValue) {
        form.setValue('breedType', breedTypeValue);
      }
    }
  }, [initialData, breedOptions, form]);

  const handleSubmit = async (data: StudListingFormData) => {
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setIsSubmitting(true);
    try {

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to create a listing.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      data.images = images;
      data.family_tree = familyTree;
      
      // Validate health codes (H1, V1, V2) against database
      const codesToValidate: { code: string; type: HealthCodeType }[] = [];
      
      if (data.v1_cert && data.v1_cert.trim()) {
        codesToValidate.push({ code: data.v1_cert, type: 'V1' });
      }
      if (data.v2_cert && data.v2_cert.trim()) {
        codesToValidate.push({ code: data.v2_cert, type: 'V2' });
      }
      if (data.h1_cert && data.h1_cert.trim()) {
        codesToValidate.push({ code: data.h1_cert, type: 'H1' });
      }

      // Validate all codes
      if (codesToValidate.length > 0) {
        const studListingId = (initialData as { id?: string } | undefined)?.id;
        const codeContext = studListingId
          ? { excludeListingId: studListingId, excludeListingType: 'stud' as const }
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
            setIsSubmitting(false);
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
          setIsSubmitting(false);
          return;
        }
      }

      // Flatten family tree data and upload images
      const familyTreeData = await flattenFamilyTreeData(familyTree);

      // Prepare the data for insertion with proper breed mapping
      const resolvedPedigreeBreed =
        data.breed === '__other__' ? (data.customBreed || '').trim() : (data.breed || '').trim();

      const listingData = {
        user_id: user.id,
        title: data.title,
        breed_type: data.breedType,
        // Map breed data based on breed type
        breed1: data.breedType === 'pedigree' ? resolvedPedigreeBreed : data.breed1,
        breed2: data.breed2,
        crossbreed_breeds: data.crossbreedBreeds,
        location: data.location,
        dob: data.dob.toISOString().split('T')[0], // Format date as YYYY-MM-DD
        description: data.description,
        vet_name: data.vet_name,
        vet_location: data.vet_location,
        stud_fee: data.stud_fee,
        sex: normalizeStudListingSex(data.sex),
        colour: data.colour,
        microchip_number: data.microchip_number,
        pick_of_litter: data.pick_of_litter || false,
        images: data.images,
        video_url: data.video_url,
        v1_cert: data.v1_cert,
        v2_cert: data.v2_cert,
        h1_cert: data.h1_cert,
        family_tree: data.family_tree,
        ...familyTreeData,
        // Documents will be set separately below to ensure it's not overwritten
        is_published: false,
        admin_approved: false,
        payment_status: 'paid', // TEMPORARY: Stud listings are currently free
        is_paid: true, // TEMPORARY: Stud listings are currently free
      };

      // Debug: Check uploadedDocuments state

      // Ensure documents is properly formatted as JSON
      // Always include documents, even if empty array
      // IMPORTANT: Remove 'file' property as it's a File object and cannot be serialized to JSON
      const documentsData = (uploadedDocuments && uploadedDocuments.length > 0)
        ? uploadedDocuments.map((doc, index) => {

            // Extract only serializable fields - exclude 'file' property
            const serializableDoc = {
              id: doc.id || `${Date.now()}-${index}`,
              name: doc.name || 'Unknown',
              url: doc.url || '',
              size: doc.size || 0
            };
            
            // Ensure all required fields are present
            if (!serializableDoc.id || !serializableDoc.name || !serializableDoc.url) {
            }

            return serializableDoc;
          })
        : [];
      // Create final listing data with documents explicitly set
      // Remove any existing documents from listingData to avoid conflicts
      const { documents: _, ...listingDataWithoutDocs } = listingData as any;
      
      // Always include documents as an array (never null) for JSONB column
      const finalListingData: any = {
        ...listingDataWithoutDocs,
        documents: documentsData, // Always an array, even if empty
      };
      
      // Final validation: ensure documents is always an array
      if (!Array.isArray(finalListingData.documents)) {
        finalListingData.documents = [];
      }
      // Verify documents are in finalListingData before insert

      // Double-check documents are included before insert
      if (!('documents' in finalListingData)) {
        console.error('❌ CRITICAL: documents field missing from finalListingData!');
        finalListingData.documents = documentsData.length > 0 ? documentsData : [];
      }
      
      // Final verification - ensure documents is a valid array
      if (!Array.isArray(finalListingData.documents)) {
        console.error('❌ CRITICAL: documents is not an array!', typeof finalListingData.documents);
        finalListingData.documents = [];
      }
      
      // Log the exact data structure being sent
      const { data: insertedData, error } = await supabase
        .from('stud_listings')
        .insert(finalListingData as any)
        .select('id, title, documents')
        .single();

      if (error) {
        console.error('❌ Error creating stud listing:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        console.error('❌ Error code:', error.code);
        console.error('❌ Error hint:', error.hint);
        console.error('❌ Error details:', error.details);
        console.error('❌ Data that failed to insert:', JSON.stringify(finalListingData, null, 2));
        console.error('❌ Documents in failed data:', finalListingData.documents);
        toast({
          title: "Error",
          description: error.message || "Failed to create listing. Please try again.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      // Verify documents were actually saved by fetching the record again
      if (insertedData?.id) {

        const { data: verifyData, error: verifyError } = await supabase
          .from('stud_listings')
          .select('id, title, documents')
          .eq('id', insertedData.id)
          .single();
        
        if (verifyError) {
          console.error('❌ Verification fetch failed:', verifyError);
        } else {
          // Compare sent vs saved
          if (documentsData.length > 0) {
            if (!verifyData?.documents || (Array.isArray(verifyData.documents) && verifyData.documents.length === 0)) {
              console.error('❌ CRITICAL: Documents were sent but NOT saved to database!');
              console.error('❌ Sent:', documentsData);
              console.error('❌ Saved:', verifyData?.documents);
              toast({
                title: "Warning",
                description: "Listing created but documents may not have been saved. Please check and re-upload if needed.",
                variant: "default",
              });
            } else {

            }
          }
        }
      }

      // Auto-verify health codes
      try {
        const { extractCodesFromStudListing, verifyListingCodes } = await import('@/lib/utils/code-verification');
        const codes = extractCodesFromStudListing({
          v1_cert: data.v1_cert,
          v2_cert: data.v2_cert,
          h1_cert: data.h1_cert,
        });
        if (codes.length > 0) {
          await verifyListingCodes(insertedData.id, 'stud', codes);
        }
      } catch (verifyError) {
        console.error("Error verifying codes:", verifyError);
        // Don't block submission if verification fails
      }

      // TEMPORARY: Skip pricing modal - stud listings are currently free
      toast({
        title: "Success!",
        description: "Your stud listing has been submitted for review.",
      });
      router.push("/my-seller-dashboard/listings");

      // Send confirmation email to seller
      try {
        await sendListingSubmissionEmail({
          email: user.email!,
          firstName: user.user_metadata?.first_name,
          listingTitle: data.title,
          listingType: 'stud',
          listingId: insertedData.id,
        });
      } catch (emailError) {
        console.error('Error sending seller confirmation email:', emailError);
      }

      // Send notification email to admin
      try {
        await sendAdminListingNotification({
          listingTitle: data.title,
          listingId: insertedData.id,
          listingType: 'stud',
          sellerName: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim(),
          sellerEmail: user.email!,
        });
      } catch (emailError) {
        console.error('Error sending admin notification email:', emailError);
      }

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      submitInFlightRef.current = false;
    }
  };

  const handleSaveDraft = async () => {
    const draftName = `Stud Listing - ${formValues.title || 'Untitled'} - ${new Date().toLocaleDateString()}`;
    await saveDraft(draftName);
  };

  const handleCancel = () => {
    router.push('/my-seller-dashboard');
  };

  const handleImagesChange = (newImages: string[]) => {
    setImages(newImages);
    form.setValue('images', newImages);
  };

  const handleImageDeleted = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    form.setValue('images', newImages);
  };

  const handleFamilyTreeChange = (newFamilyTree: any) => {

    setFamilyTree(newFamilyTree);
    form.setValue('family_tree', newFamilyTree);
  };

  const handleDocumentsChange = (documents: any[]) => {

    setUploadedDocuments(documents);
  };

  // Debug: Track uploadedDocuments state changes
  useEffect(() => {

  }, [uploadedDocuments]);

  const handleVideoChange = (url: string | null) => {
    form.setValue('video_url', url || '');
  };

  const handleVideoFileChange = (file: File | null) => {
    setVideoFile(file);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
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
        
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6 border border-blue-600">
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
                  }} value={field.value || ""}>
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
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a breed" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__other__">Other (type your breed)</SelectItem>
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

            {breedType === 'pedigree' && form.watch('breed') === '__other__' && (
              <FormField
                control={form.control}
                name="customBreed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Other Breed *</FormLabel>
                    <FormControl>
                      <Input placeholder="Type breed name..." {...field} />
                    </FormControl>
                    <FormDescription>
                      If your breed isn’t in the list, type it here.
                    </FormDescription>
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
                      allowCustom={true}
                      label="Breeds *"
                      placeholder="Select 2 breeds for crossbreed..."
                    />
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
                            field.onChange(date);
                            // Small delay to ensure date is set before closing
                            setTimeout(() => setDobPopoverOpen(false), 100);
                          }
                        }}
                        disabled={(date) =>
                          date > (() => {
                            const minimumStudAgeDate = new Date();
                            minimumStudAgeDate.setFullYear(minimumStudAgeDate.getFullYear() - 1);
                            return minimumStudAgeDate;
                          })() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Stud dogs must be 12 months old or older.
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
                  <Input placeholder="Beautiful Labrador Stud" {...field} />
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
                    placeholder="Describe your stud in detail. Include information about temperament, size, breeding history, etc." 
                    className="min-h-32"
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  Provide a detailed description of your stud. Must be between 100-1000 characters. Stud dogs must be 12 months old or older.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="vet_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vet's Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Dr. Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="vet_location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vet's Location (Optional)</FormLabel>
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

        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6 border border-blue-600">
          <h2 className="text-xl font-semibold border-b pb-4">Stud Details</h2>
          
          <div className="bg-blue-50 p-4 rounded-md">
            <p className="text-sm text-blue-800 leading-relaxed">
              Each microchip registry has its own procedures for transferring ownership. By law, a dog must be fully registered in a database before it can be advertised for sale. Please note that it may take a few days after the microchip is implanted for the registration to be processed.
            </p>
            <p className="text-sm text-blue-800 leading-relaxed mt-2">
             If you're unsure which database your dog's microchip is registered with, you can search using the 15-digit microchip number at{' '}
              <a href="https://www.europetnet.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                www.europetnet.com.
              </a>{' '}
            The name of the registry can also be found on your microchip certificate.
            </p>
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

          <div className="grid md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="microchip_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Microchip Number *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter 15-digit microchip number" 
                      maxLength={15}
                      pattern="\d{15}"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Must be exactly 15 digits
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sex *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={STUD_LISTING_SEX}
                      readOnly
                      disabled
                      className="bg-muted cursor-not-allowed"
                    />
                  </FormControl>
                  <FormDescription>
                    Stud listings must be male. Female is not available for stud ads.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="colour"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Colour of Dog *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Black, Golden, Brindle" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="stud_fee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stud Fee</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Stud Fee" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="pick_of_litter"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 rounded-md border px-3 py-2 shadow-sm">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Pick of the Litter available
                  </FormLabel>
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="v1_cert"
              render={({ field }) => (
                <FormItem>
                  <HealthLabel 
                    htmlFor="v1_cert"
                    tooltip="Vaccination stage 1 – first round of core puppy vaccinations with a Dog Quest affiliated vet."
                  >
                    V1 Code
                  </HealthLabel>
                  <FormControl>
                    <HealthCodeInput
                      id="v1_cert"
                      value={field.value}
                      onChange={field.onChange}
                      codeType="V1"
                      placeholder="Enter V1 code (e.g., RDS1V1123456)"
                      excludeListingId={(initialData as { id?: string })?.id}
                      excludeListingType="stud"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="v2_cert"
              render={({ field }) => (
                <FormItem>
                  <HealthLabel 
                    htmlFor="v2_cert"
                    tooltip="Vaccination stage 2 – booster shots for full protection with a Dog Quest affiliated vet."
                  >
                    V2 Code
                  </HealthLabel>
                  <FormControl>
                    <HealthCodeInput
                      id="v2_cert"
                      value={field.value}
                      onChange={field.onChange}
                      codeType="V2"
                      placeholder="Enter V2 code (e.g., RDS1V2123456)"
                      excludeListingId={(initialData as { id?: string })?.id}
                      excludeListingType="stud"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="h1_cert"
              render={({ field }) => (
                <FormItem>
                  <HealthLabel 
                    htmlFor="h1_cert"
                    tooltip="Health Check - Standard vet Health Check of puppy with a Dog Quest affiliated vet."
                  >
                    H1 Code
                  </HealthLabel>
                  <FormControl>
                    <HealthCodeInput
                      id="h1_cert"
                      value={field.value}
                      onChange={field.onChange}
                      codeType="H1"
                      placeholder="Enter H1 code (e.g., RDS1H1123456)"
                      excludeListingId={(initialData as { id?: string })?.id}
                      excludeListingType="stud"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="images"
            render={() => (
              <FormItem>
                <FormLabel>Stud Images</FormLabel>
                <FormControl>
                  <ImageUploader 
                    value={images}
                    onImagesSelected={handleImagesChange}
                    onChange={handleImagesChange}
                    onImageDeleted={handleImageDeleted}
                    bucketName="sale-listing-images"
                    folder="listings"
                    listingType="stud"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-6 border border-blue-600">
            <h2 className="text-xl font-semibold border-b pb-4">Supporting Documents</h2>
            <p className="text-gray-600 text-sm">
              Upload health certificates, pedigree papers, or other relevant documents for your stud.
            </p>
            <DocumentUploader
              value={uploadedDocuments}
              onChange={handleDocumentsChange}
              maxDocuments={5}
            />
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 space-y-6 border border-blue-600">
            <h2 className="text-xl font-semibold border-b pb-4">Video</h2>
            <p className="text-gray-600 text-sm">
              Add a video to showcase your stud. You can upload a video file or provide a link to an external video.
            </p>
            <VideoUploader
              value={form.watch('video_url')}
              onChange={handleVideoChange}
              onFileChange={handleVideoFileChange}
            />
          </div>
        </div>
        
 <div className="bg-white rounded-lg shadow-sm p-6 space-y-6 border border-blue-600">
        <FormField
          control={form.control}
          name="family_tree"
          render={() => (
            <FormItem>
              <FormLabel>Family Tree</FormLabel>
              <FormControl>
                <FamilyTreeInput 
                  familyTree={familyTree} 
                  onChange={handleFamilyTreeChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
 </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSaveDraft}
              disabled={isAutoSaving}
              className="w-full sm:w-auto"
            >
              {isAutoSaving ? 'Saving...' : 'Save as Draft'}
            </Button>
          </div>
          
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Stud Listing for Review'}
          </Button>
        </div>
      </form>

      {/* Pricing Modal */}
      {showPricingModal && pendingListingData && (
        <ListingPricingModal
          isOpen={showPricingModal}
          onClose={() => {
            setShowPricingModal(false);
            setPendingListingData(null);
            // Navigate to dashboard after closing modal
            router.push("/my-seller-dashboard/listings");
          }}
          listingId={pendingListingData.listingId}
          listingType="stud"
          listingTitle={pendingListingData.title}
        />
      )}
    </Form>
  );
};

export default StudListingForm;
