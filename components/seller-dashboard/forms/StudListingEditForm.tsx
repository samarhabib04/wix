import { useState, useEffect } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { DocumentUploader } from "./DocumentUploader";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, AlertCircle, InfoIcon } from "lucide-react";
import { format, parse } from "date-fns";
import { cn, logSupabaseOperation } from "@/lib/utils";
import { ImageUploader } from "./ImageUploader";
import { FamilyTreeInput, FamilyTreeMember } from "./FamilyTreeInput";
import { supabase } from "@/lib/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  listingRequiresEditApproval,
  submitListingPendingEdit,
} from "@/lib/utils/listing-edit-approval";
import { validateMultipleCodes, type HealthCodeType } from "@/lib/utils/code-validation";
import {
  STUD_LISTING_SEX,
  normalizeStudListingSex,
  studListingSexSchema,
} from "@/lib/utils/stud-listing-sex";

const studFormSchema = z.object({
  title: z.string().min(5, {
    message: "Title must be at least 5 characters.",
  }).max(100, {
    message: "Title cannot exceed 100 characters."
  }),
  breed: z.string().min(2, {
    message: "Please select a breed."
  }),
  dateOfBirth: z.date({
    message: "Date of birth is required."
  }).refine((date) => {
    const minimumStudAgeDate = new Date();
    minimumStudAgeDate.setFullYear(minimumStudAgeDate.getFullYear() - 1);
    return date <= minimumStudAgeDate;
  }, {
    message: "Stud must be at least 12 months old (Dog Quest recommendation)."
  }),
  location: z.string().min(2, {
    message: "Location is required."
  }),
  description: z.string().min(50, {
    message: "Description must be at least 50 characters."
  }).max(2000, {
    message: "Description cannot exceed 2000 characters."
  }),
  vetName: z.string().optional(),
  vetLocation: z.string().optional(),
  studFee: z.number().min(0, {
    message: "Stud fee must be a positive number."
  }),
  pickOfLitter: z.boolean().optional(),
  sex: studListingSexSchema,
  videoUrl: z.string().url({
    message: "Please enter a valid URL."
  }).optional().or(z.literal(''))
});

type StudFormValues = z.infer<typeof studFormSchema>;

const dogBreeds = [
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
];

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

interface StudListingEditFormProps {
  editMode?: boolean;
  existingListing?: any;
  isAdminEdit?: boolean;
}

const StudListingEditForm = ({ editMode = false, existingListing, isAdminEdit = false }: StudListingEditFormProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  // Extract id from pathname if needed (e.g., /edit-stud-listing/[id])
  const id = pathname?.split('/').pop() || existingListing?.id;

  const form = useForm<StudFormValues>({
    resolver: zodResolver(studFormSchema),
    defaultValues: {
      title: "",
      breed: "",
      location: "",
      description: "",
      vetName: "",
      vetLocation: "",
      studFee: 0,
      pickOfLitter: false,
      sex: STUD_LISTING_SEX,
      videoUrl: ""
    },
  });

  const [newImageUrls, setNewImageUrls] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState<number>(0);
  const [familyTree, setFamilyTree] = useState<FamilyTreeMember[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<{ v1?: string; v2?: string; h1?: string }>({});
  const [supportingDocuments, setSupportingDocuments] = useState<any[]>([]);

  useEffect(() => {
    if (editMode && existingListing) {

      // Normalize location - find case-insensitive match in irishCounties
      let normalizedLocation = "";
      if (existingListing.location) {
        const locationLower = existingListing.location.toLowerCase().trim();
        const matchedCounty = irishCounties.find(
          county => county.toLowerCase() === locationLower
        );
        normalizedLocation = matchedCounty || existingListing.location;
      }
      
      // Ensure studFee is a number
      const studFee = typeof existingListing.stud_fee === 'number' 
        ? existingListing.stud_fee 
        : typeof existingListing.stud_fee === 'string' 
          ? parseFloat(existingListing.stud_fee) || 0
          : 0;

      form.reset({
        title: existingListing.title || "",
        breed: existingListing.breed1 || existingListing.breed || "",
        dateOfBirth: existingListing.dob ? parse(existingListing.dob, 'yyyy-MM-dd', new Date()) : new Date(),
        location: normalizedLocation,
        description: existingListing.description || "",
        vetName: existingListing.vet_name || "",
        vetLocation: existingListing.vet_location || "",
        studFee: studFee,
        pickOfLitter: existingListing.pick_of_litter || false,
        sex: normalizeStudListingSex(existingListing.sex),
        videoUrl: existingListing.video_url || ""
      }, {
        keepDefaultValues: false // Ensure all values are reset
      });

      if (existingListing.images && existingListing.images.length > 0) {
        setExistingImages(existingListing.images);
        setPrimaryImageIndex(0);
      }

      if (existingListing.family_tree && existingListing.family_tree.length > 0) {
        setFamilyTree(existingListing.family_tree);
      }

      if (existingListing.v1_cert) {
        setUploadedDocuments(prev => ({ ...prev, v1: existingListing.v1_cert }));
      }
      if (existingListing.v2_cert) {
        setUploadedDocuments(prev => ({ ...prev, v2: existingListing.v2_cert }));
      }
      if (existingListing.h1_cert) {
        setUploadedDocuments(prev => ({ ...prev, h1: existingListing.h1_cert }));
      }

      // Load supporting documents if they exist
      if (existingListing.documents) {
        let docsArray: any[] = [];
        if (Array.isArray(existingListing.documents)) {
          docsArray = existingListing.documents;
        } else if (typeof existingListing.documents === 'string') {
          try {
            docsArray = JSON.parse(existingListing.documents);
          } catch (e) {
            console.error('Failed to parse documents JSON:', e);
            docsArray = [];
          }
        }
        setSupportingDocuments(docsArray);
      }
    }
  }, [editMode, existingListing, form]);

  const handleImageSelected = (selectedImageUrls: string[]) => {
    // ImageUploader passes the full array (prev + new), so just set it directly
    // This is only called when onChange is not provided (fallback)
    setNewImageUrls(selectedImageUrls);
    // Clear error if we have any images (existing + new)
    const totalImages = existingImages.length + selectedImageUrls.length;
    if (totalImages > 0) {
      setImageError(null);
    }
  };

  // Handler for direct state updates (used by ImageUploader onChange for replacements)
  const handleImageChange = (imageUrls: string[]) => {
    setNewImageUrls(imageUrls);
    // Clear error if we have any images (existing + new)
    const totalImages = existingImages.length + imageUrls.length;
    if (totalImages > 0) {
        setImageError(null);
      }
  };

  const handleImageDeleted = async (index: number) => {
    // ImageUploader calls onImageDeleted with different indices:
    // - For existing images: index is the index in existingImages array (0, 1, 2...)
    // - For new images: index is the index in value array (0, 1, 2...)
    // We need to check which array the image belongs to by checking the URL
    
    // First, check if it's an existing image by checking if index is valid in existingImages
    // and the URL at that index matches an existing image
    if (index < existingImages.length) {
      // Delete from existing images
      const imageToDelete = existingImages[index];
      
      // Try to delete from storage (optional - don't fail if it doesn't work)
      if (imageToDelete) {
        try {
          const marker = '/storage/v1/object/public/sale-listing-images/';
          const markerIndex = imageToDelete.indexOf(marker);
          const filePath =
            markerIndex >= 0
              ? decodeURIComponent(imageToDelete.substring(markerIndex + marker.length))
              : (() => {
                  const url = new URL(imageToDelete);
                  const fileName = url.pathname.split('/').pop() || '';
                  return fileName ? `stud/${fileName}` : '';
                })();

          if (filePath) {
            await supabase.storage.from('sale-listing-images').remove([filePath]);
          }
        } catch (error) {
          console.error('Error deleting existing image from storage:', error);
          // Continue with UI update even if storage deletion fails
        }
      }
      
      setExistingImages(prev => {
        const updated = [...prev];
        updated.splice(index, 1);
        // Check both existing and new images after deletion
        const totalImages = updated.length + newImageUrls.length;
        if (totalImages === 0) {
          setImageError("At least one image is required.");
        } else {
          setImageError(null);
        }
        return updated;
      });
    } else {
      // Delete from new images - index is already the correct index in newImageUrls
      // (ImageUploader passes the index from the value array directly)
    setNewImageUrls(prev => {
      const newImages = [...prev];
        // Check if index is valid
        if (index >= 0 && index < newImages.length) {
      newImages.splice(index, 1);
        }
        // Check both existing and new images
        const totalImages = existingImages.length + newImages.length;
        if (totalImages === 0) {
        setImageError("At least one image is required.");
        } else {
          setImageError(null);
      }
      return newImages;
    });
    }
  };

  const handleExistingImageUpdated = (index: number, newUrl: string) => {
    setExistingImages(prev => {
      const updated = [...prev];
      updated[index] = newUrl;
      // Clear error since we have images (existing + new)
      const totalImages = updated.length + newImageUrls.length;
      if (totalImages > 0) {
        setImageError(null);
      }
      return updated;
    });
  };

  const handleSetAsPrimary = (index: number) => {
    setPrimaryImageIndex(index);
  };

  const handleFamilyTreeUpdate = (updatedTree: FamilyTreeMember[]) => {
    setFamilyTree(updatedTree);
  };

  const onSubmit = async (data: StudFormValues) => {
    // Combine existing images and new images for validation
    const allImages = [...existingImages, ...newImageUrls];
    
    if (allImages.length === 0) {
      setImageError("At least one image is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      if (!userId) {
        toast({
          title: "Authentication error",
          description: "Please log in to submit your listing.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const processedFamilyTree = await Promise.all(
        familyTree.map(async (member) => {
          let processedMember = { ...member };

          if (member.image && member.image instanceof File) {
            const reader = new FileReader();
            const imagePromise = new Promise<string>((resolve) => {
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(member.image as File);
            });
            processedMember.image = await imagePromise;
          }

          return {
            id: processedMember.id,
            name: processedMember.name,
            breed: processedMember.breed || "",
            image: typeof processedMember.image === 'string' ? processedMember.image : null,
            relationship: processedMember.relationship,
            linkToListing: processedMember.linkToListing || "",
          };
        })
      );

      // Debug: Check supportingDocuments state

      // Prepare documents data separately to ensure it's properly formatted
      const documentsData = supportingDocuments && supportingDocuments.length > 0
        ? supportingDocuments.map(doc => {

            return {
              id: doc.id,
              name: doc.name,
              url: doc.url,
              size: doc.size
            };
          })
        : [];

      const listingData: any = {
        user_id: userId,
        title: data.title,
        breed1: data.breed, // Map to breed1 field in database
        location: data.location,
        dob: format(data.dateOfBirth, 'yyyy-MM-dd'),
        description: data.description,
        vet_name: data.vetName || undefined,
        vet_location: data.vetLocation || undefined,
        stud_fee: data.studFee,
        pick_of_litter: data.pickOfLitter || false,
        sex: normalizeStudListingSex(data.sex),
        images: [...existingImages, ...newImageUrls], // Combine existing and new images
        video_url: data.videoUrl || undefined,
        v1_cert: uploadedDocuments.v1 || undefined,
        v2_cert: uploadedDocuments.v2 || undefined,
        h1_cert: uploadedDocuments.h1 || undefined,
        family_tree: processedFamilyTree.length > 0 ? processedFamilyTree : undefined,
      };

      const codesToValidate: { code: string; type: HealthCodeType }[] = [];
      if (listingData.v1_cert?.trim()) codesToValidate.push({ code: listingData.v1_cert, type: 'V1' });
      if (listingData.v2_cert?.trim()) codesToValidate.push({ code: listingData.v2_cert, type: 'V2' });
      if (listingData.h1_cert?.trim()) codesToValidate.push({ code: listingData.h1_cert, type: 'H1' });

      if (codesToValidate.length > 0 && editMode && existingListing) {
        const validationResult = await validateMultipleCodes(codesToValidate, {
          excludeListingId: existingListing.id,
          excludeListingType: 'stud',
        });
        if (!validationResult.valid) {
          if (validationResult.reusedCodes.length > 0) {
            toast({
              title: 'Health code already used',
              description: `These codes are locked to another ad: ${validationResult.reusedCodes.map((c) => c.code).join(', ')}`,
              variant: 'destructive',
            });
            return;
          }
          toast({
            title: 'Invalid health codes',
            description: 'One or more codes are invalid. Please check with your vet.',
            variant: 'destructive',
          });
          return;
        }
      }

      let response: any;
      if (editMode && existingListing) {
        const requiresReview =
          !isAdminEdit &&
          listingRequiresEditApproval(
            existingListing as {
              admin_approved?: boolean | null;
              is_published?: boolean | null;
              status?: string | null;
            },
            'stud',
          );

        if (requiresReview) {
          const { documents: _d, user_id: _u, ...editPayload } = listingData as Record<string, unknown>;
          await submitListingPendingEdit({
            listingId: existingListing.id,
            listingType: 'stud',
            sellerId: userId,
            editData: {
              ...editPayload,
              breed: data.breed,
              breed1: data.breed,
            },
            title: data.title,
          });

          toast({
            title: "Edit submitted for review",
            description:
              "Your changes are pending admin approval. The current listing stays live until approved.",
          });
          router.replace("/my-seller-dashboard/listings");
          return;
        }

        // Remove documents from listingData to avoid conflicts, then explicitly set it
        const { documents: _, ...listingDataWithoutDocs } = listingData as any;
        const updateData: any = {
          ...listingDataWithoutDocs,
          // Explicitly include documents after spread to ensure it's not overwritten
          documents: documentsData.length > 0 ? documentsData : [],
          // Preserve these fields
          payment_status: existingListing.payment_status || 'paid',
          is_paid: existingListing.is_paid ?? true,
          current_boost_id: existingListing.current_boost_id || null,
          updated_at: new Date().toISOString(),
          // Convert null to undefined for optional fields to match database types
          vet_name: listingData.vet_name || undefined,
          vet_location: listingData.vet_location || undefined,
          sex: normalizeStudListingSex(listingData.sex),
          video_url: listingData.video_url || undefined,
          v1_cert: listingData.v1_cert || undefined,
          v2_cert: listingData.v2_cert || undefined,
          h1_cert: listingData.h1_cert || undefined,
        };
        // Content-only edit: never change approval or publish state
        delete updateData.admin_approved;
        delete updateData.is_published;
        // Ad Editing: Never update created_at or expires_at - edited ads must keep
        // original lifecycle (don't reappear as "new", don't restart duration)
        delete updateData.created_at;
        delete updateData.expires_at;
        // Build the query - for admin edits, don't check user_id
        let updateQuery = supabase
          .from('stud_listings')
          .update(updateData)
          .eq('id', existingListing.id);
        
        // Only add user_id check for non-admin edits (seller edits)
        if (!isAdminEdit) {
          updateQuery = updateQuery.eq('user_id', userId);
        }
        
        response = await updateQuery
          .select('id, title, documents')
          .single();
      } else {
        // For insert, ensure documents are included
        const insertData = {
          ...listingData,
          documents: documentsData,
          is_published: false,
          admin_approved: false,
        };
        response = await supabase
          .from('stud_listings')
          .insert(insertData)
          .select('id, title, documents')
          .single();
      }

      if (response.error) {
        console.error('❌ Error updating stud listing:', response.error);
        console.error('❌ Error details:', JSON.stringify(response.error, null, 2));
        console.error('❌ isAdminEdit:', isAdminEdit);
        console.error('❌ Listing data sent:', listingData);
        console.error('❌ Response:', response);
        
        // Show user-friendly error message
        const errorMessage = response.error.message || 'Failed to update listing';
        toast({
          title: "Error",
          description: errorMessage + (isAdminEdit ? ' (Admin edit)' : ''),
          variant: "destructive",
        });
        
        throw response.error;
      }

      // Verify the update actually saved the data
      if (editMode && existingListing) {

        const { data: verifyData, error: verifyError } = await supabase
          .from('stud_listings')
          .select('id, title, documents, updated_at')
          .eq('id', existingListing.id)
          .single();
        
        if (verifyError) {
          console.error('❌ Verification failed:', verifyError);
        } else {

        }
      }

      // Auto-verify health codes
      const existingId = editMode && existingListing ? (existingListing as { id?: string }).id : undefined;
      const listingId = existingId || response.data?.[0]?.id || response.data?.id;
      if (listingId) {
        try {
          const { extractCodesFromStudListing, verifyListingCodes } = await import('@/lib/utils/code-verification');
          const codes = extractCodesFromStudListing({
            v1_cert: listingData.v1_cert,
            v2_cert: listingData.v2_cert,
            h1_cert: listingData.h1_cert,
          });
          if (codes.length > 0) {
            await verifyListingCodes(listingId, 'stud', codes);
          }
        } catch (verifyError) {
          console.error("Error verifying codes:", verifyError);
          // Don't block submission if verification fails
        }
      }

      // Different messages and redirects for admin vs seller edits
      if (isAdminEdit && editMode) {
        toast({
          title: "Stud Listing Updated",
          description: "The stud listing has been successfully updated.",
        });
        // For admin edits, redirect to admin dashboard
        router.replace("/admin-dashboard/listings");
      } else {
        toast({
          title: editMode ? "Stud Listing Updated" : "Stud Listing Created",
          description: editMode
            ? "Your stud listing has been updated. It stays live with the same listing period."
            : "Your stud listing has been created and is pending approval.",
        });
        // For seller edits, redirect to seller dashboard
        router.replace("/my-seller-dashboard/listings");
      }
    } catch (error: any) {
      console.error("Error submitting stud listing:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {editMode && (
          <Alert className="bg-blue-50 border-blue-300 mb-6">
            <InfoIcon className="h-4 w-4" />
            <AlertDescription className="text-blue-800">
              You are editing this stud listing. Changes will be saved upon submission.
            </AlertDescription>
          </Alert>
        )}

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Champion Bloodline Stud" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="breed"
              render={({ field }) => {
                // Get available breeds including the existing breed if it's not in the standard list
                const getAvailableBreeds = () => {
                  const breeds = [...dogBreeds];
                  if (editMode && existingListing) {
                    const existingBreed = existingListing.breed1 || existingListing.breed;
                    if (existingBreed && !breeds.includes(existingBreed)) {
                      breeds.unshift(existingBreed); // Add at the beginning
                    }
                  }
                  return breeds;
                };

                return (
                <FormItem>
                  <FormLabel>Breed <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <select
                      className="w-full p-2 border border-gray-300 rounded"
                      {...field}
                        value={field.value || ""}
                    >
                      <option value="">Select a breed</option>
                        {getAvailableBreeds().map((breed) => (
                        <option key={breed} value={breed}>
                          {breed}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
                );
              }}
            />
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date of Birth <span className="text-red-500">*</span></FormLabel>
                  <Popover>
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
                        selected={field.value}
                        onSelect={(date) => {
                          if (date) {
                            field.onChange(date);
                          }
                        }}
                        disabled={(date) => {
                          const minimumStudAgeDate = new Date();
                          minimumStudAgeDate.setFullYear(minimumStudAgeDate.getFullYear() - 1);
                          return date > minimumStudAgeDate;
                        }}
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
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <select
                      className="w-full p-2 border border-gray-300 rounded"
                      value={field.value || ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    >
                      <option value="">Select a county</option>
                      {irishCounties.map((county) => (
                        <option key={county} value={county}>
                          {county}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Description</h2>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Describe your stud's qualities, achievements, and temperament..." 
                    className="min-h-[200px]"
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  Stud dogs must be 12 months old or older.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Veterinary Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="vetName"
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
              name="vetLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vet's Location (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Vet's location (optional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Stud Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="studFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stud Fee (€) <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={0} 
                      step={0.01} 
                      placeholder="0.00" 
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const value = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
                        field.onChange(value);
                      }}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pickOfLitter"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  <FormLabel>Pick of Litter</FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sex</FormLabel>
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
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Images</h2>
          <div>
            <FormLabel>Upload Images <span className="text-red-500">*</span></FormLabel>
            <FormDescription className="mb-4">
              Upload high-quality images of your stud. The first image will be the main image.
            </FormDescription>
            <ImageUploader
              value={newImageUrls}
              onImagesSelected={handleImageSelected}
              onChange={handleImageChange}
              onImageDeleted={handleImageDeleted}
              onSetAsPrimary={handleSetAsPrimary}
              primaryImageIndex={primaryImageIndex}
              maxImages={6}
              existingImages={existingImages}
              bucketName="sale-listing-images"
              folder="listings"
              onExistingImageUpdated={handleExistingImageUpdated}
              listingType="stud"
            />
            {imageError && (
              <div className="text-red-500 flex items-center gap-2 mt-2">
                <AlertCircle size={16} />
                <span>{imageError}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Family Tree (Optional)</h2>
          <FormDescription className="mb-4">
            Add family members to showcase your stud's lineage.
          </FormDescription>
          <FamilyTreeInput 
            familyTree={familyTree} 
            onChange={handleFamilyTreeUpdate} 
          />
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Video (Optional)</h2>
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
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Supporting Documents (Optional)</h2>
          <FormDescription className="mb-4">
            Upload health certificates, pedigree papers, or other relevant documents for your stud.
          </FormDescription>
          <DocumentUploader
            value={supportingDocuments}
            onChange={setSupportingDocuments}
            maxDocuments={5}
          />
        </div>

        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.push("/my-seller-dashboard/listings")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : editMode ? "Update Listing" : "Create Listing"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default StudListingEditForm;
