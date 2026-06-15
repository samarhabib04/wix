
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, ImagePlus, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "@/components/ui/sonner";
import { compressImageForUpload } from "@/lib/media/compressImage";

interface ImageUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
  bucketName?: string;
  required?: boolean;
}

export const ImageUploader = ({
  value,
  onChange,
  bucketName = "blog-images",
  required = false
}: ImageUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value);

  // Sync previewUrl with value prop (important for edit mode)
  useEffect(() => {
    setPreviewUrl(value);
  }, [value]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setIsUploading(true);

      // Ensure we're using the correct bucket name (force to "breeds" if it's for breeds)
      const actualBucketName = bucketName || "blog-images";

      const imagePreset =
        actualBucketName === "family-tree-images" ? "familyTree" : "blog";
      const processed = await compressImageForUpload(file, imagePreset);

      // Create a unique file name with proper folder structure for family tree images
      const fileExt = processed.name.includes(".")
        ? processed.name.split(".").pop()
        : "webp";
      const fileName = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}.${fileExt}`;
      
      // Use folder structure for family tree images
      const filePath = actualBucketName === 'family-tree-images' 
        ? `family-tree/${fileName}` 
        : fileName;

      // Create object URL for preview
      const objectUrl = URL.createObjectURL(processed);
      setPreviewUrl(objectUrl);

      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('You need to be logged in to upload images');
        setIsUploading(false);
        setPreviewUrl(value); // Restore previous preview
        return;
      }

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(actualBucketName)
        .upload(filePath, processed, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        console.error("Storage upload error:", error);
        console.error("Attempted bucket name:", actualBucketName);
        // Provide more helpful error message
        if (error.message?.includes('Bucket not found') || error.message?.includes('not found')) {
          throw new Error(`Bucket "${actualBucketName}" not found. Please check: 1) The bucket exists in Supabase Storage, 2) The bucket name is spelled correctly, 3) The bucket is accessible.`);
        }
        throw error;
      }

      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from(actualBucketName)
        .getPublicUrl(filePath);

      // Update form with the public URL
      onChange(publicUrlData.publicUrl);
      toast.success(`Image uploaded successfully to ${actualBucketName}`);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image. Please try again.');
      setPreviewUrl(value); // Restore previous preview
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    onChange(null);
    setPreviewUrl(null);
  };

  return (
    <div className="space-y-4">
      {previewUrl ? (
        <div className="relative">
          <img
            src={previewUrl}
            alt="Preview"
            className="max-h-56 rounded-md object-contain border border-gray-200"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2 h-8 w-8 p-0"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Remove image</span>
          </Button>
        </div>
      ) : (
        <div 
          className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center text-gray-500 cursor-pointer"
          onClick={() => document.getElementById('file-upload-' + bucketName)?.click()}
        >
          <ImagePlus className="h-12 w-12 mb-2" />
          <p className="text-sm mb-2">Click to upload or drag and drop{required && " *"}</p>
          <p className="text-xs">SVG, PNG, JPG or GIF (max 5MB)</p>
          {bucketName === 'family-tree-images' && (
            <p className="text-xs text-blue-600 mt-1">Family tree images</p>
          )}
        </div>
      )}
      
      <input
        id={'file-upload-' + bucketName}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading}
        required={required}
      />
      
      <div className="flex items-center">
        {previewUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('file-upload-' + bucketName)?.click()}
            disabled={isUploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            Choose another image
          </Button>
        )}
        {isUploading && <span className="ml-2 text-sm text-gray-500">Uploading...</span>}
      </div>
    </div>
  );
};
