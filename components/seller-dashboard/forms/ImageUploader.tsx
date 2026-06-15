import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, ImagePlus, X, Star, Crop } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ImageCropper } from "./ImageCropper";
import { compressCroppedImageBlob, compressImageForUpload } from "@/lib/media/compressImage";

interface ImageUploaderProps {
  value: string[]; // Changed from File[] to string[] for URLs
  onImagesSelected: (urls: string[]) => void; // Changed from files to URLs
  onImageDeleted: (index: number) => void;
  onSetAsPrimary?: (index: number) => void;
  primaryImageIndex?: number;
  existingImages?: string[];
  maxImages?: number;
  onChange?: (urls: string[]) => void; // Changed from files to URLs
  primaryIndex?: number;
  setPrimary?: React.Dispatch<React.SetStateAction<number>>;
  bucketName?: string; // New prop for bucket name
  folder?: string; // New prop for folder path
  uploaderId?: string; // New prop for unique input ID
  onExistingImageUpdated?: (index: number, newUrl: string) => void; // Callback when existing image is cropped/updated
  listingType?: 'sale' | 'showcase' | 'stud' | 'marketplace' | 'business' | null; // Type of listing for crop preview
}

export const ImageUploader = ({
  value,
  onImagesSelected,
  onImageDeleted,
  onSetAsPrimary,
  primaryImageIndex = 0,
  existingImages = [],
  maxImages = 6,
  onChange,
  primaryIndex,
  setPrimary,
  bucketName = 'sale-listing-images',
  folder = 'listings',
  uploaderId,
  onExistingImageUpdated,
  listingType = null
}: ImageUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cropImageIndex, setCropImageIndex] = useState<number | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [isCroppingExistingImage, setIsCroppingExistingImage] = useState(false);
  const { toast } = useToast();
  
  // Generate unique input ID
  const inputId = uploaderId || `file-upload-${Math.random().toString(36).substring(2)}`;
  
  const uploadFilesToSupabase = async (files: File[]): Promise<string[]> => {
    const uploadPromises = files.map(async (file) => {
      const processed = await compressImageForUpload(file, "listing");
      const fileExt = processed.name.includes(".")
        ? processed.name.split(".").pop()
        : "webp";
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, processed, { contentType: processed.type });
      
      if (error) {
        console.error('Upload error:', error);
        throw error;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);
      
      return publicUrl;
    });
    
    return Promise.all(uploadPromises);
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;
    
    // For single image components (maxImages = 1), always allow one file
    if (maxImages === 1) {
      if (files.length > 1) {
        toast({
          title: "Too many images",
          description: `You can only upload 1 image per puppy`,
          variant: "destructive",
        });
        return;
      }
    } else {
      // Multi-image mode - check total count
      const currentImagesCount = value.length;
      if (currentImagesCount + files.length > maxImages) {
        toast({
          title: "Too many images",
          description: `You can only upload a maximum of ${maxImages} image${maxImages > 1 ? 's' : ''} per puppy`,
          variant: "destructive",
        });
        return;
      }
    }
    
    // Validate file types
    const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file type",
        description: "Please select only image files",
        variant: "destructive",
      });
      return;
    }
    
    // Validate file sizes (max 5MB each)
    const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: "File too large",
        description: "Image size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
    try {

      const uploadedUrls = await uploadFilesToSupabase(files);

      // For single image mode, replace the existing image completely
      // For multi-image mode, add to existing images
      const newUrls = maxImages === 1 ? uploadedUrls : [...value, ...uploadedUrls];

      // Call onChange FIRST with the new URLs (critical for React Hook Form)
      if (onChange) {

        onChange(newUrls);
      }
      
      // Then call onImagesSelected

      onImagesSelected(newUrls);
      
      toast({
        title: "Images uploaded successfully",
        description: `${files.length} image(s) uploaded and ready to submit`,
      });
      
    } catch (error) {
      console.error('❌ Error uploading files:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Clear the input
      e.target.value = '';
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    
    if (files.length === 0) return;
    
    // For single image components (maxImages = 1), always allow one file
    if (maxImages === 1) {
      if (files.length > 1) {
        toast({
          title: "Too many images",
          description: `You can only upload 1 image per puppy`,
          variant: "destructive",
        });
        return;
      }
    } else {
      // Multi-image mode - check total count
      const currentImagesCount = value.length;
      if (currentImagesCount + files.length > maxImages) {
        toast({
          title: "Too many images",
          description: `You can only upload a maximum of ${maxImages} image${maxImages > 1 ? 's' : ''} per puppy`,
          variant: "destructive",
        });
        return;
      }
    }
    
    // Validate file types
    const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file type",
        description: "Please select only image files",
        variant: "destructive",
      });
      return;
    }
    
    // Validate file sizes (max 5MB each)
    const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: "File too large",
        description: "Image size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      const uploadedUrls = await uploadFilesToSupabase(files);
      
      // For single image mode, replace the existing image completely
      // For multi-image mode, add to existing images
      const newUrls = maxImages === 1 ? uploadedUrls : [...value, ...uploadedUrls];
      
      // If onChange is provided, use it (for direct state updates/replacements)
      // Otherwise, use onImagesSelected (for additive updates)
      if (onChange) {
        onChange(newUrls);
      } else {
        // Only call onImagesSelected if onChange is not provided
        onImagesSelected(newUrls);
      }
      
      toast({
        title: "Images uploaded",
        description: `${files.length} image(s) uploaded successfully`,
      });
      
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (index: number) => {
    const imageUrl = value[index];
    
    // Extract the file path from the URL to delete from storage
    try {
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const filePath = `${folder}/${fileName}`;
      
      // Delete from Supabase Storage
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);
      
      if (error) {
        console.error('Error deleting file from storage:', error);
        // Continue with UI update even if storage deletion fails
      }
    } catch (error) {
      console.error('Error parsing URL for deletion:', error);
    }
    
    // Call the parent's delete handler
    onImageDeleted(index);
  };

  const handleCropClick = (index: number, imageUrl: string, isExisting: boolean = false) => {
    setCropImageIndex(index);
    setCropImageSrc(imageUrl);
    setIsCroppingExistingImage(isExisting);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (cropImageIndex === null || cropImageSrc === null) return;

    try {
      setIsUploading(true);
      
      const processed = await compressCroppedImageBlob(croppedBlob, "listing");
      const fileExt = processed.name.includes(".")
        ? processed.name.split(".").pop()
        : "webp";
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, processed, {
          contentType: processed.type,
        });
      
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);
      
      // Delete old image from storage
      try {
        const oldUrl = new URL(cropImageSrc);
        const pathParts = oldUrl.pathname.split('/');
        const oldFileName = pathParts[pathParts.length - 1];
        const oldFilePath = `${folder}/${oldFileName}`;
        await supabase.storage.from(bucketName).remove([oldFilePath]);
      } catch (err) {
        console.error('Error deleting old image:', err);
      }
      
      // Handle both existing images and new images
      if (isCroppingExistingImage) {
        // If cropping an existing image, notify parent to update existingImages
        if (onExistingImageUpdated) {

          onExistingImageUpdated(cropImageIndex, publicUrl);
        } else {
          // Fallback: if no callback, move cropped image to new images array
          const updatedUrls = [...value, publicUrl];
          if (onChange) {
            onChange(updatedUrls);
          }
          onImagesSelected(updatedUrls);
        }
      } else {
        // If cropping a new image, replace at the same index (don't add new image)
        const newUrls = [...value];
        
        // Ensure we're replacing at the correct index
        if (cropImageIndex >= 0 && cropImageIndex < newUrls.length) {
          // Replace the image at the same index - this replaces, not adds
          newUrls[cropImageIndex] = publicUrl;

          // When cropping, we're REPLACING an image at the same index, NOT adding a new one
          // ONLY call onChange - this ensures the image is replaced, not duplicated
          // onChange is the direct state update mechanism and handles replacements correctly
          if (onChange) {
            onChange(newUrls);
          } else if (onImagesSelected) {
            // Fallback: if onChange not provided, use onImagesSelected
            // But this should be avoided - forms should provide onChange
            onImagesSelected(newUrls);
          } else {
            console.error('❌ No callback provided for image update');
          }
        } else {
          // If index is out of bounds, this shouldn't happen, but handle gracefully
          toast({
            title: "Crop error",
            description: "Unable to replace image. Please try again.",
            variant: "destructive",
          });
        }
      }
      
      toast({
        title: "Image cropped",
        description: "The image has been cropped and updated.",
      });
      
    } catch (error) {
      console.error('Error uploading cropped image:', error);
      toast({
        title: "Crop failed",
        description: "Failed to save cropped image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setCropImageIndex(null);
      setCropImageSrc(null);
      setIsCroppingExistingImage(false);
    }
  };

  // Calculate current images count for THIS component instance only
  const currentImagesCount = value.length;
  const canAddMoreImages = (maxImages === 1 || currentImagesCount < maxImages) && !isUploading;

  // Use primaryImageIndex (the existing prop) as the single source of truth
  // This helps prevent confusion between primaryImageIndex and primaryIndex
  const effectivePrimaryIndex = primaryIndex !== undefined ? primaryIndex : primaryImageIndex;

  return (
    <div className="space-y-4">
      {/* Primary image selection helper text */}
      {(existingImages.length > 0 || value.length > 0) && maxImages > 1 && (
        <div className="bg-blue-50 p-3 rounded-md">
          <p className="text-sm text-blue-800">
            <Star className="inline h-4 w-4 mr-1" />
            Click the star button on any image to set it as your primary (main) image. This will be the first image buyers see.
          </p>
        </div>
      )}

      {/* Existing and new image previews */}
      {(existingImages.length > 0 || value.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Render existing images */}
          {existingImages.map((imageUrl, index) => (
            <div key={`existing-${index}`} className="relative group border-2 rounded-lg overflow-hidden aspect-square">
              <img
                src={imageUrl}
                alt={`Product image ${index + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* Primary image badge - positioned at top left */}
              {maxImages > 1 && effectivePrimaryIndex === index && (
                <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs py-1 px-2 rounded-md font-medium shadow-lg z-20 flex items-center">
                  <Star className="h-3 w-3 mr-1 fill-white" />
                  Primary
                </div>
              )}

              {/* Star button - positioned at top right */}
              {maxImages > 1 && (
                <div className="absolute top-2 right-2 z-20">
                  {onSetAsPrimary && (
                    <Button
                      type="button"
                      variant={effectivePrimaryIndex === index ? "default" : "secondary"}
                      size="sm"
                      className={cn(
                        "h-8 w-8 p-0 shadow-lg backdrop-blur-sm border-2",
                        effectivePrimaryIndex === index 
                          ? "bg-yellow-500 hover:bg-yellow-600 text-white border-white" 
                          : "bg-white/95 hover:bg-gray-100 text-gray-700 border-gray-300"
                      )}
                      onClick={() => {
                        onSetAsPrimary(index);
                        if (setPrimary) setPrimary(index);
                      }}
                      title={effectivePrimaryIndex === index ? "Current Primary Image" : "Set as Primary"}
                    >
                      <Star className={cn("h-4 w-4", effectivePrimaryIndex === index ? "fill-white text-white" : "text-gray-600")} />
                    </Button>
                  )}
                </div>
              )}

              {/* Action buttons - positioned at bottom */}
              <div className="absolute bottom-2 right-2 z-20 flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 w-8 p-0 shadow-lg backdrop-blur-sm bg-blue-500/95 hover:bg-blue-600 text-white border-2 border-white"
                  onClick={() => handleCropClick(index, imageUrl, true)}
                  title="Crop Image"
                >
                  <Crop className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="h-8 w-8 p-0 shadow-lg backdrop-blur-sm bg-red-500/95 hover:bg-red-600 text-white border-2 border-white"
                  onClick={() => onImageDeleted(index)}
                  title="Remove Image"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Overlay for better button visibility */}
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </div>
          ))}
          
          {/* Render new uploaded image URLs */}
          {value.map((imageUrl, index) => {
            const adjustedIndex = index + existingImages.length;
            
            return (
              <div key={`new-${index}`} className="relative group border-2 rounded-lg overflow-hidden aspect-square">
                <img
                  src={imageUrl}
                  alt={`New product image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                
                {/* Primary image badge - positioned at top left */}
                {maxImages > 1 && effectivePrimaryIndex === adjustedIndex && (
                  <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs py-1 px-2 rounded-md font-medium shadow-lg z-20 flex items-center">
                    <Star className="h-3 w-3 mr-1 fill-white" />
                    Primary
                  </div>
                )}

                {/* Star button - positioned at top right */}
                {maxImages > 1 && (
                  <div className="absolute top-2 right-2 z-20">
                    {onSetAsPrimary && (
                      <Button
                        type="button"
                        variant={effectivePrimaryIndex === adjustedIndex ? "default" : "secondary"}
                        size="sm"
                        className={cn(
                          "h-8 w-8 p-0 shadow-lg backdrop-blur-sm border-2",
                          effectivePrimaryIndex === adjustedIndex 
                            ? "bg-yellow-500 hover:bg-yellow-600 text-white border-white" 
                            : "bg-white/95 hover:bg-gray-100 text-gray-700 border-gray-300"
                        )}
                        onClick={() => {
                          onSetAsPrimary(adjustedIndex);
                          if (setPrimary) setPrimary(adjustedIndex);
                        }}
                        title={effectivePrimaryIndex === adjustedIndex ? "Current Primary Image" : "Set as Primary"}
                      >
                        <Star className={cn("h-4 w-4", effectivePrimaryIndex === adjustedIndex ? "fill-white text-white" : "text-gray-600")} />
                      </Button>
                    )}
                  </div>
                )}

                {/* Action buttons - positioned at bottom */}
                <div className="absolute bottom-2 right-2 z-20 flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 w-8 p-0 shadow-lg backdrop-blur-sm bg-blue-500/95 hover:bg-blue-600 text-white border-2 border-white"
                    onClick={() => handleCropClick(index, imageUrl)}
                    title="Crop Image"
                  >
                    <Crop className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="h-8 w-8 p-0 shadow-lg backdrop-blur-sm bg-red-500/95 hover:bg-red-600 text-white border-2 border-white"
                    onClick={() => onImageDeleted(index)}
                    title="Remove Image"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Overlay for better button visibility */}
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Upload area */}
      {canAddMoreImages && (
        <label
          htmlFor={inputId}
          className={cn(
            "border-2 border-dashed rounded-md p-8 flex flex-col items-center justify-center text-gray-500 cursor-pointer transition-colors min-h-[200px]",
            isDragging ? "border-brand-soft-green bg-green-50" : "border-gray-300",
            isUploading && "opacity-50 cursor-not-allowed"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isUploading ? (
            <>
              <Upload className="h-12 w-12 mb-4 animate-spin" />
              <p className="text-base mb-2 font-medium">Uploading images...</p>
            </>
          ) : (
            <>
              <ImagePlus className="h-16 w-16 mb-4 text-gray-400" />
              <p className="text-base mb-3 font-medium text-center">
                {maxImages === 1 && currentImagesCount > 0 ? "Click to replace image" : "Click to upload or drag and drop"}
              </p>
              <p className="text-sm text-center text-gray-500 leading-relaxed">
                SVG, PNG, JPG or GIF (max 5MB)
                <br />
                {currentImagesCount > 0 && (
                  <span className="text-brand-soft-green font-medium">
                    {maxImages === 1 ? "1 image added" : `${currentImagesCount} of ${maxImages} images added`}
                  </span>
                )}
              </p>
            </>
          )}
        </label>
      )}

      {/* Image Cropper Modal */}
      {cropImageSrc && (
        <ImageCropper
          imageSrc={cropImageSrc}
          open={cropImageIndex !== null}
          onClose={() => {
            setCropImageIndex(null);
            setCropImageSrc(null);
            setIsCroppingExistingImage(false);
          }}
          onCropComplete={handleCropComplete}
          aspectRatio={
            listingType === 'sale' || listingType === 'showcase' || listingType === 'stud' || listingType === 'marketplace'
              ? 1 // Square (1:1) for most listings
              : 4 / 3 // Default for business or null
          }
          listingType={listingType}
          hidePreview={folder === 'business-gallery'} // Hide preview for gallery images
        />
      )}

      <input
        id={inputId}
        type="file"
        accept="image/*"
        {...(maxImages > 1 && { multiple: true })}
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading}
      />
    </div>
  );
};
