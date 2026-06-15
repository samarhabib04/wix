import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, AlertCircle, InfoIcon, Upload, X, Save, Clock } from "lucide-react";
import {
  format,
  isValid,
  parse,
  startOfDay,
  subDays,
  startOfMonth,
  isAfter,
  isBefore,
} from "date-fns";
import { cn, logSupabaseOperation } from "@/lib/utils";
import { isShowcasePuppyAgeInWindow } from "@/lib/utils/showcase-age";
import { useDraftSaving } from "@/hooks/useDraftSaving";
import { ImageUploader } from "./ImageUploader";
import { FamilyTreeInput, FamilyTreeMember } from "./FamilyTreeInput";
import { TagStyleBreedSelector } from "./TagStyleBreedSelector";
import { supabase } from "@/lib/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { sendListingSubmissionEmail, sendAdminListingNotification } from "@/lib/utils/email-utils";
import { compressVideoForUpload } from "@/lib/media/compressVideo";
import { compressImageForUpload } from "@/lib/media/compressImage";

/** Month to show first when opening the DOB picker (avoids landing on “today” with no selectable days). */
function getShowcaseDobPickerDefaultMonth(selected: Date | null | undefined): Date {
  if (selected && isShowcasePuppyAgeInWindow(selected)) {
    return new Date(selected.getFullYear(), selected.getMonth(), selected.getDate());
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 35);
}

// Form schema validation
const showcaseFormSchema = z.object({
  breedType: z.string().min(1, {
    message: "Please select a breed type."
  }),
  breed: z.string().min(2, {
    message: "Please select a breed."
  }),
  customBreed: z.string().optional(),
  breed1: z.string().optional(),
  breed2: z.string().optional(),
  location: z.string().min(2, {
    message: "Location is required."
  }),
  dateOfBirth: z.date().nullable(),
  maleCount: z.number().min(0, {
    message: "Number of males must be 0 or greater."
  }).max(20, {
    message: "Number of males cannot exceed 20."
  }),
  femaleCount: z.number().min(0, {
    message: "Number of females must be 0 or greater."
  }).max(20, {
    message: "Number of females cannot exceed 20."
  }),
  title: z.string().min(10, {
    message: "Title must be at least 10 characters.",
  }).max(50, {
    message: "Title cannot exceed 50 characters."
  }),

  videoUrl: z.string().url({
    message: "Please enter a valid URL."
  }).optional().or(z.literal('')),
  energy: z.enum(['Low', 'Moderate', 'High', 'VeryHigh'] as [string, ...string[]]),
  size: z.enum(['Small', 'Medium', 'Large', 'ExtraLarge'] as [string, ...string[]]),
}).superRefine((data, ctx) => {
  if (data.dateOfBirth === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Date of birth is required.",
      path: ["dateOfBirth"],
    });
    return;
  }
  if (!isShowcasePuppyAgeInWindow(data.dateOfBirth)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Showcase is only for puppies between 4 and 6 weeks old. Pick a date of birth in that range.",
      path: ["dateOfBirth"],
    });
  }
}).refine(
  (data) => data.maleCount + data.femaleCount > 0,
  {
    message: "Total number of puppies must be at least 1.",
    path: ["maleCount"],
  }
).refine(
  (data) => {
    if (data.breedType === 'crossbreed') {
      return data.breed1 && data.breed2;
    }
    return true;
  },
  {
    message: "Please select both breeds for crossbreed.",
    path: ["breed1"],
  }
).refine(
  (data) => {
    if (data.breedType === 'pedigree' && data.breed === '__other__') {
      return !!data.customBreed && data.customBreed.trim().length >= 2;
    }
    return true;
  },
  {
    message: "Please enter the breed name.",
    path: ["customBreed"],
  }
);

type ShowcaseFormValues = z.infer<typeof showcaseFormSchema>;

// Irish counties for location dropdown
const irishCounties = [
  "Antrim",
  "Armagh",
  "Carlow",
  "Cavan",
  "Clare",
  "Cork",
  "Derry",
  "Donegal",
  "Down",
  "Dublin",
  "Fermanagh",
  "Galway",
  "Kerry",
  "Kildare",
  "Kilkenny",
  "Laois",
  "Leitrim",
  "Limerick",
  "Longford",
  "Louth",
  "Mayo",
  "Meath",
  "Monaghan",
  "Offaly",
  "Roscommon",
  "Sligo",
  "Tipperary",
  "Tyrone",
  "Waterford",
  "Westmeath",
  "Wexford",
  "Wicklow"
];

interface ShowcaseListingFormProps {
  editMode?: boolean;
  existingListing?: any;
  isAdminEdit?: boolean;
}

const ShowcaseListingForm = ({ editMode = false, existingListing, isAdminEdit = false }: ShowcaseListingFormProps) => {
  const router = useRouter();
  const { toast } = useToast();

  // Form state
  const form = useForm<ShowcaseFormValues>({
    resolver: zodResolver(showcaseFormSchema),
    defaultValues: {
      breedType: "",
      breed: "",
      customBreed: "",
      breed1: "",
      breed2: "",
      location: "",
      dateOfBirth: null,
      maleCount: 0,
      femaleCount: 0,
      title: "",
      videoUrl: "",
      energy: undefined,
      size: undefined
    },
  });

  // Media state - changed to work with URLs
  const [newImageUrls, setNewImageUrls] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState<number>(0);
  const [familyTree, setFamilyTree] = useState<FamilyTreeMember[]>([]);

  // Video upload state
  const [uploadedVideoFile, setUploadedVideoFile] = useState<File | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string>("");
  const [videoUploadError, setVideoUploadError] = useState<string>("");
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const submitInFlightRef = useRef(false);
  const [hasPendingEdit, setHasPendingEdit] = useState<boolean>(false);

  // Image validation state
  const [imageError, setImageError] = useState<string | null>(null);

  // Breeds state
  const [dogBreeds, setDogBreeds] = useState<string[]>([]);
  const [breedsLoading, setBreedsLoading] = useState<boolean>(true);

  // DOB calendar bounds must use “today” on every render — useMemo([]) froze the date and let Apr 29+ look selectable after Apr 28.
  const todayNav = startOfDay(new Date());
  const oldestDobNav = subDays(todayNav, 42);
  const showcaseDobNav = {
    today: todayNav,
    oldestDob: oldestDobNav,
    startMonth: startOfMonth(oldestDobNav),
    endMonth: startOfMonth(todayNav),
    captionMinYear: oldestDobNav.getFullYear(),
    captionMaxYear: todayNav.getFullYear(),
  };

  // DOB calendar state
  const [dobCalendarOpen, setDobCalendarOpen] = useState<boolean>(false);
  const [dobPickerMonth, setDobPickerMonth] = useState<Date>(() => getShowcaseDobPickerDefaultMonth(null));

  // Current user state for draft saving
  const [currentUser, setCurrentUser] = useState<any>(null);
  const lastAutoSaveAtRef = useRef<number>(0);

  // Get current user for draft saving
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getCurrentUser();
  }, []);

  // Watch form values for comprehensive tracking
  const formValues = form.watch();
  const allImages = useMemo(() => [...existingImages, ...newImageUrls], [existingImages, newImageUrls]);
  const comprehensiveFormData = useMemo(() => {
    return {
      ...formValues,
      images: allImages,
      uploadedImageUrls: allImages,
      primaryImageIndex,
      familyTree,
      uploadedVideoUrl,
    };
    // Prevent a new object identity on unrelated re-renders (e.g. draft-save UI updates)
  }, [formValues, allImages, primaryImageIndex, familyTree, uploadedVideoUrl]);

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
  } = useDraftSaving(comprehensiveFormData, currentUser, 'showcase');

  // Debounced auto-save: 5 seconds after user stops typing
  useEffect(() => {
    if (!currentUser) return;

    const hasMinimalData = (formValues.title && formValues.title.length >= 3) ||
      allImages.length > 0 ||
      formValues.location;

    if (!hasMinimalData) return;

    const debouncedSaveTimeout = setTimeout(() => {
      const now = Date.now();
      if (now - lastAutoSaveAtRef.current < 15000) return; // hard throttle: 15s
      lastAutoSaveAtRef.current = now;
      autoSaveDraft();
    }, 5000); // 5 seconds after last change

    return () => clearTimeout(debouncedSaveTimeout);
  }, [comprehensiveFormData, currentUser, autoSaveDraft]);

  // Backup: Auto-save every 30 seconds when form has minimal data
  useEffect(() => {
    if (!currentUser) return;

    const autoSaveInterval = setInterval(() => {
      const hasMinimalData = (formValues.title && formValues.title.length >= 3) ||
        allImages.length > 0 ||
        formValues.location;

      if (hasMinimalData) {
        const now = Date.now();
        if (now - lastAutoSaveAtRef.current < 15000) return;
        lastAutoSaveAtRef.current = now;
        autoSaveDraft();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [formValues, allImages, currentUser, autoSaveDraft]);

  // Save on unmount
  useEffect(() => {
    return () => {
      const hasMinimalData = (formValues.title && formValues.title.length >= 3) ||
        allImages.length > 0 ||
        formValues.location;

      if (hasMinimalData && currentUser) {
        const now = Date.now();
        if (now - lastAutoSaveAtRef.current < 5000) return;
        lastAutoSaveAtRef.current = now;
        autoSaveDraft();
      }
    };
  }, [formValues, allImages, currentUser, autoSaveDraft]);

  // Fetch ALL breeds from quiz_breeds table (both Pedigree and Crossbreed types)
  useEffect(() => {
    const fetchBreeds = async () => {
      setBreedsLoading(true);
      try {
        // Fetch all breeds without filtering by breed_type to include both Pedigree and Crossbreeds
        const { data, error } = await supabase
          .from('quiz_breeds')
          .select('breed, breed_type')
          .order('breed');

        if (error) {
          console.error('Error fetching breeds:', error);
          toast({
            title: "Error",
            description: "Failed to load breeds. Using default list.",
            variant: "destructive",
          });
          // Fallback to default breeds if fetch fails
          setDogBreeds([
            "Labrador Retriever",
            "German Shepherd",
            "Golden Retriever",
            "French Bulldog",
            "Bulldog",
            "Poodle",
            "Beagle",
            "Rottweiler",
            "German Shorthaired Pointer",
            "Dachshund",
            "Pembroke Welsh Corgi",
            "Australian Shepherd",
            "Yorkshire Terrier",
            "Boxer",
            "Great Dane",
            "Siberian Husky",
            "Cavalier King Charles Spaniel",
            "Doberman Pinscher",
            "Miniature Schnauzer",
            "Shih Tzu",
          ]);
        } else {
          // Extract breed names from the data
          const breeds = data.map(item => item.breed).filter(Boolean);
          setDogBreeds(breeds);
        }
      } catch (error) {
        console.error('Error fetching breeds:', error);
        toast({
          title: "Error",
          description: "Failed to load breeds. Using default list.",
          variant: "destructive",
        });
        // Fallback to default breeds
        setDogBreeds([
          "Labrador Retriever",
          "German Shepherd",
          "Golden Retriever",
          "French Bulldog",
          "Bulldog",
          "Poodle",
          "Beagle",
          "Rottweiler",
          "German Shorthaired Pointer",
          "Dachshund",
          "Pembroke Welsh Corgi",
          "Australian Shepherd",
          "Yorkshire Terrier",
          "Boxer",
          "Great Dane",
          "Siberian Husky",
          "Cavalier King Charles Spaniel",
          "Doberman Pinscher",
          "Miniature Schnauzer",
          "Shih Tzu",
        ]);
      } finally {
        setBreedsLoading(false);
      }
    };

    fetchBreeds();
  }, [toast]);

  // Initialize form with existing listing data if in edit mode
  useEffect(() => {
    if (editMode && existingListing) {
      const parsedDob = parse(existingListing.date_of_birth, 'yyyy-MM-dd', new Date());
      const dobForForm =
        isValid(parsedDob) && isShowcasePuppyAgeInWindow(parsedDob) ? parsedDob : null;
      if (existingListing.date_of_birth && dobForForm === null) {
        toast({
          title: "Date of birth update needed",
          description:
            "The saved date is outside the current Showcase window (4–6 weeks old). Please pick a new date of birth.",
        });
      }
      form.reset({
        breedType: existingListing.breed_type || "",
        breed: existingListing.breed,
        breed1: existingListing.breed1 || "",
        breed2: existingListing.breed2 || "",
        location: existingListing.location,
        dateOfBirth: dobForForm,
        maleCount: existingListing.male_count || 0,
        femaleCount: existingListing.female_count || 0,
        title: existingListing.title,
        videoUrl: existingListing.video_url || "",
        energy: existingListing.energy || undefined,
        size: existingListing.size || undefined,
      });
      setDobPickerMonth(getShowcaseDobPickerDefaultMonth(dobForForm));

      // Set existing images
      if (existingListing.images && existingListing.images.length > 0) {
        setExistingImages(existingListing.images);
        setPrimaryImageIndex(existingListing.primary_image_index || 0);
      }

      // Set family tree from individual columns
      const reconstructedFamilyTree: FamilyTreeMember[] = [];

      // Add mother if exists
      if (existingListing.mother_name) {
        reconstructedFamilyTree.push({
          id: 'mother',
          name: existingListing.mother_name,
          breed: existingListing.mother_breed || '',
          image: existingListing.mother_image || null,
          relationship: 'mother',
          linkToListing: '',
        });
      }

      // Add father if exists
      if (existingListing.father_name) {
        reconstructedFamilyTree.push({
          id: 'father',
          name: existingListing.father_name,
          breed: existingListing.father_breed || '',
          image: existingListing.father_image || null,
          relationship: 'father',
          linkToListing: '',
        });
      }

      // Add maternal grandmother if exists
      if (existingListing.maternal_grandmother_name) {
        reconstructedFamilyTree.push({
          id: 'maternal_grandmother',
          name: existingListing.maternal_grandmother_name,
          breed: existingListing.maternal_grandmother_breed || '',
          image: existingListing.maternal_grandmother_image || null,
          relationship: 'maternal_grandmother',
          linkToListing: '',
        });
      }

      // Add maternal grandfather if exists
      if (existingListing.maternal_grandfather_name) {
        reconstructedFamilyTree.push({
          id: 'maternal_grandfather',
          name: existingListing.maternal_grandfather_name,
          breed: existingListing.maternal_grandfather_breed || '',
          image: existingListing.maternal_grandfather_image || null,
          relationship: 'maternal_grandfather',
          linkToListing: '',
        });
      }

      // Add paternal grandmother if exists
      if (existingListing.paternal_grandmother_name) {
        reconstructedFamilyTree.push({
          id: 'paternal_grandmother',
          name: existingListing.paternal_grandmother_name,
          breed: existingListing.paternal_grandmother_breed || '',
          image: existingListing.paternal_grandmother_image || null,
          relationship: 'paternal_grandmother',
          linkToListing: '',
        });
      }

      // Add paternal grandfather if exists
      if (existingListing.paternal_grandfather_name) {
        reconstructedFamilyTree.push({
          id: 'paternal_grandfather',
          name: existingListing.paternal_grandfather_name,
          breed: existingListing.paternal_grandfather_breed || '',
          image: existingListing.paternal_grandfather_image || null,
          relationship: 'paternal_grandfather',
          linkToListing: '',
        });
      }

      setFamilyTree(reconstructedFamilyTree);

      // Check if this listing already has a pending edit
      if (existingListing.pending_edit_id) {
        setHasPendingEdit(true);

        // Fetch the pending edit details to show a notification
        fetchPendingEdit(existingListing.pending_edit_id);
      }
    }
  }, [editMode, existingListing, form, toast]);

  // Fetch pending edit details
  const fetchPendingEdit = async (editId: string) => {
    try {
      const { data, error } = await supabase
        .from('showcase_listing_edits')
        .select('*')
        .eq('id', editId)
        .single();

      if (error) throw error;

      if (data && data.status === 'pending') {
        setHasPendingEdit(true);
      }
    } catch (error) {
      console.error("Error fetching pending edit:", error);
    }
  };

  // Handle image selection - now works with URLs
  const handleImageSelected = (selectedImageUrls: string[]) => {
    setNewImageUrls(prev => {
      // Check if this is a replacement (from cropping) or addition (new upload)
      // Replacement: array length matches prev length (cropping replaces at same index)
      // Addition: array length is greater than prev length (new images added)
      const isReplacement = selectedImageUrls.length === prev.length;

      if (isReplacement) {
        // This is a replacement (e.g., from cropping) - replace the entire array
        return selectedImageUrls;
      } else {
        // This is an addition - add new images to existing
        // Only add URLs that aren't already in the array (avoid duplicates)
        const newUrlsToAdd = selectedImageUrls.filter(url => !prev.includes(url));
        const updatedImages = [...prev, ...newUrlsToAdd];

        // If this is the first image being added, clear any error
        if (prev.length === 0 && selectedImageUrls.length > 0 && existingImages.length === 0) {
          setImageError(null);
        }
        return updatedImages;
      }
    });
  };

  // Handle image deletion
  const handleImageDeleted = (index: number) => {
    // Check if we're deleting an existing image or a new one
    if (index < existingImages.length) {
      setExistingImages(prev => {
        const newImages = [...prev];
        newImages.splice(index, 1);

        // Update primary image index if needed
        if (primaryImageIndex === index) {
          setPrimaryImageIndex(0); // Reset to first image
        } else if (primaryImageIndex > index) {
          setPrimaryImageIndex(primaryImageIndex - 1); // Adjust index
        }

        // If no images left, show error
        if (newImages.length === 0 && newImageUrls.length === 0) {
          setImageError("At least one image is required.");
        }

        return newImages;
      });
    } else {
      // Adjust index for new images array
      const newImageIndex = index - existingImages.length;

      setNewImageUrls(prev => {
        const newImages = [...prev];
        newImages.splice(newImageIndex, 1);

        // If no images left, show error
        if (newImages.length === 0 && existingImages.length === 0) {
          setImageError("At least one image is required.");
        }

        return newImages;
      });
    }
  };

  // Handle setting primary image
  const handleSetAsPrimary = (index: number) => {
    setPrimaryImageIndex(index);
  };

  const handleExistingImageUpdated = (index: number, newUrl: string) => {
    setExistingImages(prev => {
      const updated = [...prev];
      updated[index] = newUrl;
      return updated;
    });
  };

  // Handle family tree updates using the updated type
  const handleFamilyTreeUpdate = (updatedTree: FamilyTreeMember[]) => {
    setFamilyTree(updatedTree);
  };

  // Handle DOB selection with auto-close
  const handleDobSelect = (date: Date | undefined) => {
    if (date) {
      form.setValue('dateOfBirth', date);
      setDobCalendarOpen(false); // Auto-close the calendar
    }
  };

  // Handle video file upload
  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setVideoUploadError("Please select a valid video file.");
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB in bytes

    // Clear video URL if user uploads a file
    if (form.getValues('videoUrl')) {
      form.setValue('videoUrl', '');
    }

    setIsUploadingVideo(true);
    setVideoUploadError("");

    try {
      const optimized = await compressVideoForUpload(file);
      if (optimized.size > maxSize) {
        setVideoUploadError(
          "Video is still larger than 5MB after optimization. Try a shorter or lower-resolution clip."
        );
        return;
      }

      const fileExt = optimized.name.split(".").pop() || "mp4";
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `showcase/${fileName}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('sale-listing-images')
        .upload(filePath, optimized);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('sale-listing-images')
        .getPublicUrl(filePath);

      setUploadedVideoFile(optimized);
      setUploadedVideoUrl(publicUrl);

      toast({
        title: "Video uploaded successfully",
        description: "Your video has been uploaded.",
      });
    } catch (error: any) {
      console.error("Error uploading video:", error);
      setVideoUploadError("Failed to upload video. Please try again.");
      toast({
        title: "Upload failed",
        description: "Failed to upload video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingVideo(false);
    }
  };

  // Handle removing uploaded video
  const handleRemoveUploadedVideo = async () => {
    if (uploadedVideoUrl) {
      try {
        // Extract file path from URL for deletion
        const urlParts = uploadedVideoUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `showcase/${fileName}`;

        // Delete from storage
        await supabase.storage
          .from('sale-listing-images')
          .remove([filePath]);
      } catch (error) {
        console.error("Error deleting video:", error);
      }
    }

    setUploadedVideoFile(null);
    setUploadedVideoUrl("");
    setVideoUploadError("");
  };

  // Handle video URL change
  const handleVideoUrlChange = (value: string) => {
    if (value && uploadedVideoFile) {
      // Remove uploaded video if user enters a URL
      handleRemoveUploadedVideo();
    }
    form.setValue('videoUrl', value);
  };

  // Add form validation debugging
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Helper function to upload family tree images (same as sale listings)
  const uploadFamilyTreeImage = async (file: File): Promise<string> => {
    try {
      const processed = await compressImageForUpload(file, "familyTree");
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
        console.error("Storage upload error:", error);
        throw error;
      }

      const { data: publicUrlData } = supabase.storage
        .from('family-tree-images')
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Error uploading family tree image:', error);
      throw error;
    }
  };

  // Helper function to flatten family tree data with proper image handling (same as sale listings)
  const flattenFamilyTreeData = async (familyTreeData: FamilyTreeMember[]) => {
    const result: any = {
      mother_name: null,
      mother_breed: null,
      mother_image: null,
      mother_dob: null,
      father_name: null,
      father_breed: null,
      father_image: null,
      father_dob: null,
      maternal_grandmother_name: null,
      maternal_grandmother_breed: null,
      maternal_grandmother_image: null,
      maternal_grandmother_dob: null,
      maternal_grandfather_name: null,
      maternal_grandfather_breed: null,
      maternal_grandfather_image: null,
      maternal_grandfather_dob: null,
      paternal_grandmother_name: null,
      paternal_grandmother_breed: null,
      paternal_grandmother_image: null,
      paternal_grandmother_dob: null,
      paternal_grandfather_name: null,
      paternal_grandfather_breed: null,
      paternal_grandfather_image: null,
      paternal_grandfather_dob: null,
    };

    for (const member of familyTreeData) {
      const relationship = member.relationship.replace('-', '_');
      let imageUrl = null;

      // Handle image upload if it's a File object
      if (member.image instanceof File) {

        imageUrl = await uploadFamilyTreeImage(member.image);
      } else if (typeof member.image === 'string' && member.image.startsWith('http')) {
        // Already a URL
        imageUrl = member.image;

      }

      const dobString = member.dateOfBirth ? format(member.dateOfBirth, 'yyyy-MM-dd') : null;

      switch (relationship) {
        case 'mother':
          result.mother_name = member.name || null;
          result.mother_breed = member.breed || null;
          result.mother_image = imageUrl;
          result.mother_dob = dobString;
          break;
        case 'father':
          result.father_name = member.name || null;
          result.father_breed = member.breed || null;
          result.father_image = imageUrl;
          result.father_dob = dobString;
          break;
        case 'maternal_grandmother':
          result.maternal_grandmother_name = member.name || null;
          result.maternal_grandmother_breed = member.breed || null;
          result.maternal_grandmother_image = imageUrl;
          result.maternal_grandmother_dob = dobString;
          break;
        case 'maternal_grandfather':
          result.maternal_grandfather_name = member.name || null;
          result.maternal_grandfather_breed = member.breed || null;
          result.maternal_grandfather_image = imageUrl;
          result.maternal_grandfather_dob = dobString;
          break;
        case 'paternal_grandmother':
          result.paternal_grandmother_name = member.name || null;
          result.paternal_grandmother_breed = member.breed || null;
          result.paternal_grandmother_image = imageUrl;
          result.paternal_grandmother_dob = dobString;
          break;
        case 'paternal_grandfather':
          result.paternal_grandfather_name = member.name || null;
          result.paternal_grandfather_breed = member.breed || null;
          result.paternal_grandfather_image = imageUrl;
          result.paternal_grandfather_dob = dobString;
          break;
      }
    }

    return result;
  };

  // Handle form submission
  const onSubmit = async (data: ShowcaseFormValues) => {
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setIsSubmitting(true);

    // Clear previous errors
    setFormErrors([]);
    setImageError(null);

    // Collect all validation errors
    const errors: string[] = [];

    // Validate images more thoroughly
    const totalImages = newImageUrls.length + existingImages.length;
    if (totalImages === 0) {
      errors.push("At least one image is required.");
      setImageError("At least one image is required.");
    }

    // Validate form data explicitly
    try {
      showcaseFormSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.issues.forEach(err => {
          errors.push(`${err.path.join('.')}: ${err.message}`);
        });
      }
    }

    // Show all validation errors if any exist
    if (errors.length > 0) {
      setFormErrors(errors);
      toast({
        title: "Validation Errors",
        description: `Please fix the following issues: ${errors.join(', ')}`,
        variant: "destructive",
      });
      console.error("Validation errors:", errors);
      window.scrollTo(0, 0);
      setIsSubmitting(false);
      submitInFlightRef.current = false;
      return;
    }

    try {
      // Prepare the data to save to Supabase
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      if (!userId) {
        toast({
          title: "Authentication error",
          description: "Please log in to submit your listing.",
          variant: "destructive",
        });
        return;
      }

      // Determine if this is a new listing or an update to an existing one
      const isNewListing = !editMode;

      // Prepare images - combine existing + new URLs
      let finalImages = [...existingImages, ...newImageUrls];

      // Determine final video URL - prioritize uploaded video over URL
      let finalVideoUrl = uploadedVideoUrl || data.videoUrl || null;

      // Process family tree data with proper image handling
      const familyTreeData = await flattenFamilyTreeData(familyTree);

      const resolvedBreed =
        data.breedType === 'pedigree' && data.breed === '__other__'
          ? (data.customBreed || '').trim()
          : data.breed;

      // Prepare common listing data
      const listingData = {
        seller_id: userId,
        breed_type: data.breedType,
        breed: resolvedBreed,
        breed1: data.breed1,
        breed2: data.breed2,
        location: data.location,
        date_of_birth: format(data.dateOfBirth as Date, 'yyyy-MM-dd'),
        male_count: data.maleCount,
        female_count: data.femaleCount,
        title: data.title,
        description: "",
        video_url: finalVideoUrl,
        images: finalImages,
        primary_image_index: primaryImageIndex,
        energy: data.energy,
        size: data.size,
        // Include the flattened family tree data
        ...familyTreeData,
      };
      let result;

      if (isNewListing) {
        // For new listings, create them with 'pending' status for admin approval
        const newListingData = {
          ...listingData,
          status: 'pending',
          admin_approved: false,
          is_published: false,
        };

        // Create showcase listing record
        result = await supabase
          .from('showcase_listings')
          .insert(newListingData)
          .select();

        const { data: insertedData, error } = result;
        await logSupabaseOperation('insert new showcase listing', insertedData, error);

        if (error) {
          console.error("Database insert error:", error);
          throw error;
        }

        // Log the inserted data to verify family tree columns were saved
        // Send confirmation email to seller
        try {
          await sendListingSubmissionEmail({
            email: user.email!,
            firstName: user.user_metadata?.first_name,
            listingTitle: data.title,
            listingType: 'showcase',
            listingId: insertedData[0].id,
          });

        } catch (emailError) {
          console.error('Error sending seller confirmation email:', emailError);
        }

        // Send notification email to admin
        try {
          await sendAdminListingNotification({
            listingTitle: data.title,
            listingId: insertedData[0].id,
            listingType: 'showcase',
            sellerName: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim(),
            sellerEmail: user.email!,
          });

        } catch (emailError) {
          console.error('Error sending admin notification email:', emailError);
        }

        // Success message for new listing
        toast({
          title: "Showcase listing submitted",
          description: "Your showcase listing is pending review by our admin team."
        });

      } else {
        if (isAdminEdit) {
          // For admin edits, update the listing directly without creating an edit record
          // IMPORTANT: Preserve admin_approved and is_published - do not change them
          const updatedListingData: any = {
            ...listingData,
            updated_at: new Date().toISOString()
          };
          
          // Explicitly exclude admin_approved and is_published from update
          // These fields should only be changed through approval/rejection actions, not through editing
          delete updatedListingData.admin_approved;
          delete updatedListingData.is_published;
          // Ad Editing: Never update created_at or expires_at - edited ads must keep
          // original lifecycle (don't reappear as "new", don't restart duration)
          delete updatedListingData.created_at;
          delete updatedListingData.expires_at;

          const { error: updateError } = await supabase
            .from('showcase_listings')
            .update(updatedListingData)
            .eq('id', existingListing.id);

          await logSupabaseOperation('admin update showcase listing',
            { listing_id: existingListing.id },
            updateError);

          if (updateError) throw updateError;

          // Clear any pending edit reference
          const { error: clearEditError } = await supabase
            .from('showcase_listings')
            .update({ pending_edit_id: null })
            .eq('id', existingListing.id);

          if (clearEditError) {
          }

          toast({
            title: "Listing updated successfully",
            description: "The showcase listing has been updated and is now live."
          });
        } else {
          // For edits to existing listings, create a draft edit
          const editData = {
            ...listingData,
            listing_id: existingListing.id,
            status: 'pending'
          };

          // First check if there's already a pending edit
          if (hasPendingEdit) {
            toast({
              title: "Pending edit exists",
              description: "There is already a pending edit for this listing. Please wait for admin approval.",
              variant: "destructive",
            });
            return;
          }

          // Create a record in the edits table
          const { data: editRecord, error: editError } = await supabase
            .from('showcase_listing_edits')
            .insert(editData)
            .select();

          await logSupabaseOperation('insert showcase_listing_edit', editRecord, editError);

          if (editError) throw editError;

          if (!editRecord || editRecord.length === 0) {
            throw new Error("Failed to create edit record");
          }

          // Reference pending edit only — keep listing live with same approval/publish state
          const { error: updateError } = await supabase
            .from('showcase_listings')
            .update({
              pending_edit_id: editRecord[0].id,
              current_boost_id: existingListing.current_boost_id || null,
            })
            .eq('id', existingListing.id);

          await logSupabaseOperation('update showcase listing with pending_edit_id',
            { listing_id: existingListing.id, pending_edit_id: editRecord[0].id },
            updateError);

          if (updateError) throw updateError;

          // Success message for edit
          toast({
            title: "Edit submitted for review",
            description: "Your changes have been submitted and are pending review by our admin team. The current version will remain live until approved."
          });
        }
      }

      // Navigate back to appropriate dashboard
      if (isAdminEdit) {
        router.replace("/admin-dashboard/listings");
      } else {
        router.replace("/my-seller-dashboard/listings");
      }
      window.scrollTo(0, 0);

    } catch (error: any) {
      console.error("Error with showcase listing:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit. Please try again.",
        variant: "destructive",
      });
      window.scrollTo(0, 0); // Also scroll to top on error to show the toast message
    } finally {
      setIsSubmitting(false);
      submitInFlightRef.current = false;
    }
  };

  // Watch breed type to show/hide crossbreed selectors
  const watchedBreedType = form.watch("breedType");
  const isCrossbreed = watchedBreedType === 'crossbreed';

  // Crossbreed state
  const [selectedBreeds, setSelectedBreeds] = useState<string[]>([]);

  // Handle crossbreed selection
  const handleCrossbreedChange = (breeds: string[]) => {
    setSelectedBreeds(breeds);
    form.setValue('breed1', breeds[0] || '');
    form.setValue('breed2', breeds[1] || '');

    // Also set the main breed field for validation
    if (breeds.length > 0) {
      const combinedBreed = breeds.length === 2
        ? `${breeds[0]} x ${breeds[1]}`
        : breeds[0];
      form.setValue('breed', combinedBreed);
    } else {
      form.setValue('breed', '');
    }
  };

  // Watch video URL to disable upload section
  const watchedVideoUrl = form.watch("videoUrl");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

        {/* Show validation errors at the top */}
        {formErrors.length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-2">Please fix these issues:</div>
              <ul className="list-disc list-inside space-y-1">
                {formErrors.map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {editMode && hasPendingEdit && !isAdminEdit && (
          <Alert variant="destructive" className="bg-amber-50 border-amber-300 mb-6">
            <InfoIcon className="h-4 w-4" />
            <AlertDescription className="text-amber-800">
              This listing has pending changes awaiting admin approval. Any additional changes will replace your pending submission.
            </AlertDescription>
          </Alert>
        )}

        {isAdminEdit && (
          <Alert className="bg-blue-50 border-blue-300 mb-6">
            <InfoIcon className="h-4 w-4" />
            <AlertDescription className="text-blue-800">
              You are editing this listing as an administrator. Changes will be applied immediately and the listing will be published.
            </AlertDescription>
          </Alert>
        )}

        {/* Auto-save indicator */}
        {currentUser && !editMode && (
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

        {!editMode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 text-sm mb-3">
              <strong>Note:</strong> Showcase listings are for puppies between 4-6 weeks old and will automatically expire when the puppies reach 6 weeks.
              You'll then be able to convert this listing to a sale listing with all the details pre-filled.
            </p>
            <p className="text-blue-800 text-sm">
              <strong>💡 Hearts & wishlist:</strong> Buyers can save your Showcase quietly; you will not see who
              liked it until you convert this to a For Sale listing. Logged-in buyers who saved it can then be emailed
              when the sale listing goes live (see conversion flow).
            </p>
          </div>
        )}

        {/* Basic Information Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-pink-400">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    setSelectedBreeds([]);
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

            {!isCrossbreed ? (
              <FormField
                control={form.control}
                name="breed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Breed *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={breedsLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={breedsLoading ? "Loading breeds..." : "Select a breed"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__other__">Other (type your breed)</SelectItem>
                        {dogBreeds.map((breed) => (
                          <SelectItem key={breed} value={breed}>
                            {breed}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="breed1"
                render={({ field }) => (
                  <FormItem>
                    <TagStyleBreedSelector
                      breedOptions={dogBreeds.map(breed => ({ value: breed, label: breed }))}
                      selectedBreeds={selectedBreeds}
                      onBreedsChange={handleCrossbreedChange}
                      allowCustom={true}
                      label="Breeds *"
                      placeholder="Select 2 breeds for crossbreed..."
                    />
                    {form.formState.errors.breed1 && (
                      <p className="text-sm font-medium text-destructive">
                        {form.formState.errors.breed1.message}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {!isCrossbreed && form.watch('breed') === '__other__' && (
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
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date of Birth <span className="text-red-500">*</span></FormLabel>
                  <Popover
                    open={dobCalendarOpen}
                    onOpenChange={(open) => {
                      setDobCalendarOpen(open);
                      if (open) {
                        let nav = getShowcaseDobPickerDefaultMonth(form.getValues('dateOfBirth'));
                        nav = new Date(nav.getFullYear(), nav.getMonth(), 1);
                        if (nav.getTime() < showcaseDobNav.startMonth.getTime()) {
                          nav = showcaseDobNav.startMonth;
                        }
                        if (nav.getTime() > showcaseDobNav.endMonth.getTime()) {
                          nav = showcaseDobNav.endMonth;
                        }
                        setDobPickerMonth(nav);
                      }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
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
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        month={dobPickerMonth}
                        onMonthChange={(m) => {
                          let next = new Date(m.getFullYear(), m.getMonth(), 1);
                          if (next.getTime() < showcaseDobNav.startMonth.getTime()) {
                            next = showcaseDobNav.startMonth;
                          }
                          if (next.getTime() > showcaseDobNav.endMonth.getTime()) {
                            next = showcaseDobNav.endMonth;
                          }
                          setDobPickerMonth(next);
                        }}
                        startMonth={showcaseDobNav.startMonth}
                        endMonth={showcaseDobNav.endMonth}
                        captionMinYear={showcaseDobNav.captionMinYear}
                        captionMaxYear={showcaseDobNav.captionMaxYear}
                        selected={field.value ?? undefined}
                        onSelect={(date) => {
                          if (!date) return;
                          const today = startOfDay(new Date());
                          const picked = startOfDay(date);
                          if (isAfter(picked, today)) return;
                          if (isBefore(picked, startOfDay(subDays(today, 42)))) return;
                          if (!isShowcasePuppyAgeInWindow(date, today)) return;
                          form.setValue('dateOfBirth', date);
                          setDobPickerMonth(
                            new Date(date.getFullYear(), date.getMonth(), date.getDate())
                          );
                          setTimeout(() => setDobCalendarOpen(false), 100);
                        }}
                        disabled={(date) => {
                          const today = startOfDay(new Date());
                          const d = startOfDay(date);
                          const oldest = startOfDay(subDays(today, 42));
                          if (isAfter(d, today)) return true;
                          if (isBefore(d, oldest)) return true;
                          return !isShowcasePuppyAgeInWindow(date, today);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Puppies must be between 4 and 6 weeks old. You cannot pick a future date of birth, or a date
                    more than 6 weeks ago — other days appear greyed out. Only valid ages (4–6 weeks) can be selected.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maleCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Males <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="20"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the number of male puppies (0-20).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="femaleCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Females <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="20"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the number of female puppies (0-20).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Title <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="E.g., Champion Bloodline Golden Retriever"
                      maxLength={50}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Create a compelling title for your showcase listing (10-50 characters).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="energy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Energy Level <span className="text-red-500">*</span></FormLabel>
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
                  <FormLabel>Size Level <span className="text-red-500">*</span></FormLabel>
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

          </div>
        </div>

        {/* Images and Video Section - Now in a row on desktop, stacked on mobile */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-pink-400">
          <h2 className="text-xl font-semibold mb-4">Images & Video</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Images Section */}
            <div className="space-y-4">
              <div>
                <FormLabel>Upload Images <span className="text-red-500">*</span></FormLabel>
                <FormDescription className="mb-4">
                  Upload high-quality images. The first image will be the main image.
                </FormDescription>
                <ImageUploader
                  value={newImageUrls}
                  onImagesSelected={handleImageSelected}
                  onChange={handleImageSelected}
                  onImageDeleted={handleImageDeleted}
                  onSetAsPrimary={handleSetAsPrimary}
                  primaryImageIndex={primaryImageIndex}
                  maxImages={6}
                  existingImages={existingImages}
                  bucketName="sale-listing-images"
                  folder="showcase"
                  onExistingImageUpdated={handleExistingImageUpdated}
                  listingType="showcase"
                />
                {imageError && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle size={16} />
                    <AlertDescription>{imageError}</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>

            {/* Video Section */}
            <div className="space-y-4">
              <div>
                <FormLabel>Video (Optional)</FormLabel>
                <FormDescription className="mb-4">
                  Upload a video file (max 5MB) OR enter a YouTube/Vimeo URL.
                </FormDescription>

                {/* Video Upload */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Upload Video File</label>
                    <div className={cn(
                      "border-2 border-dashed rounded-lg p-4",
                      watchedVideoUrl ? "border-gray-200 bg-gray-50" : "border-gray-300"
                    )}>
                      {uploadedVideoFile ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            <span className="text-sm">{uploadedVideoFile.name}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveUploadedVideo}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <label
                            htmlFor="video-upload"
                            className={cn(
                              "cursor-pointer",
                              watchedVideoUrl && "cursor-not-allowed"
                            )}
                          >
                            <Upload className={cn(
                              "mx-auto h-8 w-8 cursor-pointer",
                              watchedVideoUrl ? "text-gray-300" : "text-gray-400"
                            )} />
                            <div className="mt-2">
                              <span className={cn(
                                "text-sm",
                                watchedVideoUrl ? "text-gray-400" : "text-gray-600"
                              )}>
                                {watchedVideoUrl ? "Video URL provided" : "Click to upload or drag and drop"}
                              </span>
                            </div>
                          </label>
                          <input
                            id="video-upload"
                            type="file"
                            accept="video/*"
                            onChange={handleVideoUpload}
                            disabled={isUploadingVideo || !!watchedVideoUrl}
                            className="hidden"
                          />
                          <p className={cn(
                            "text-xs mt-1",
                            watchedVideoUrl ? "text-gray-400" : "text-gray-500"
                          )}>
                            Max file size: 5MB
                          </p>
                        </div>
                      )}
                      {isUploadingVideo && (
                        <div className="text-center text-sm text-gray-600">
                          Uploading video...
                        </div>
                      )}
                    </div>
                    {videoUploadError && (
                      <div className="text-red-500 flex items-center gap-2 mt-2">
                        <AlertCircle size={16} />
                        <span className="text-sm">{videoUploadError}</span>
                      </div>
                    )}
                  </div>

                  {/* OR Divider */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-gray-300"></div>
                    <span className="text-sm text-gray-500 font-medium">OR</span>
                    <div className="flex-1 h-px bg-gray-300"></div>
                  </div>

                  {/* Video URL */}
                  <FormField
                    control={form.control}
                    name="videoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Video URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="E.g., https://www.youtube.com/watch?v=..."
                            {...field}
                            disabled={!!uploadedVideoFile}
                            onChange={(e) => handleVideoUrlChange(e.target.value)}
                          />
                        </FormControl>
                        <FormDescription>
                          Add a YouTube or Vimeo video URL showcasing your dog.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Family Tree Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-pink-400">
          <h2 className="text-xl font-semibold mb-4">Family Tree (Optional)</h2>
          <FormDescription className="mb-4">
            Add family members to showcase your dog's lineage.
          </FormDescription>
          <FamilyTreeInput
            familyTree={familyTree}
            onChange={handleFamilyTreeUpdate}
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(isAdminEdit ? "/admin-dashboard/listings" : "/my-seller-dashboard/listings")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || (hasPendingEdit && !isAdminEdit)}
            onClick={() => {
              // Force form validation and show errors immediately

            }}
          >
            {isSubmitting ?
              "Submitting..." :
              isAdminEdit ?
                "Update Listing" :
                editMode ?
                  "Submit Changes for Review" :
                  "Submit for Review"
            }
          </Button>
        </div>

        {editMode && !isAdminEdit && (
          <p className="text-sm text-gray-500 text-center mt-2">
            Changes to your listing will be reviewed by an admin before being published.
            The current version will remain visible until your changes are approved.
          </p>
        )}
      </form>
    </Form>
  );
};

export default ShowcaseListingForm;
