
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, User, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import { compressImageForUpload } from "@/lib/media/compressImage";

interface AvatarUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
  userId: string;
  size?: "sm" | "md" | "lg";
  onImmediateUpdate?: (url: string | null) => Promise<void>;
}

export const AvatarUploader = ({
  value,
  onChange,
  userId,
  size = "md",
  onImmediateUpdate
}: AvatarUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-24 w-24", 
    lg: "h-32 w-32"
  };

  // Helper function to add cache-busting parameter to URL
  const addCacheBusting = (url: string | null) => {
    if (!url) return null;
    const timestamp = Date.now();
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}cb=${timestamp}`;
  };

  // Update preview URL when value changes
  useEffect(() => {
    setPreviewUrl(addCacheBusting(value));
  }, [value]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {

    const file = e.target.files?.[0];

    if (!file) {

      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image size must be less than 5MB. Your file is " + (file.size / (1024 * 1024)).toFixed(1) + "MB.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUploading(true);

      const processed = await compressImageForUpload(file, "avatar");
      const fileExt = processed.name.includes(".")
        ? processed.name.split(".").pop()
        : "webp";
      const fileName = `${userId}/avatar.${fileExt}`;

      // Create object URL for immediate preview
      const objectUrl = URL.createObjectURL(processed);
      setPreviewUrl(objectUrl);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('user-avatars')
        .upload(fileName, processed, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        console.error("Storage upload error:", error);
        
        // Check if it's a format-related error
        if (error.message && error.message.includes('mime type') && error.message.includes('not supported')) {
          const formatMatch = error.message.match(/mime type ([^\s]+) is not supported/);
          const unsupportedFormat = formatMatch ? formatMatch[1] : file.type;
          
          toast({
            title: "Unsupported image format",
            description: `The ${unsupportedFormat.replace('image/', '').toUpperCase()} format is not supported. Please use JPG, PNG, or GIF instead.`,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Upload failed",
            description: "Failed to upload avatar. Please try again.",
            variant: "destructive"
          });
        }
        
        setPreviewUrl(addCacheBusting(value)); // Restore previous preview
        return;
      }

      // Get the public URL (without cache busting for database storage)
      const { data: publicUrlData } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(fileName);

      // Update form with the clean public URL (for database storage)
      onChange(publicUrlData.publicUrl);
      
      // Set preview URL with cache busting for immediate display
      const cacheBustedUrl = addCacheBusting(publicUrlData.publicUrl);
      setPreviewUrl(cacheBustedUrl);
      
      // If immediate update function is provided, call it
      if (onImmediateUpdate) {
        try {
          await onImmediateUpdate(publicUrlData.publicUrl);
          toast({
            title: "Avatar updated successfully",
            description: "Your profile picture has been saved"
          });
        } catch (updateError) {
          console.error('Error in immediate update:', updateError);
          toast({
            title: "Avatar uploaded but not saved",
            description: "Please click 'Save Changes' to persist your avatar",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Avatar uploaded successfully",
          description: "Your profile picture has been updated"
        });
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload avatar. Please try again.",
        variant: "destructive"
      });
      setPreviewUrl(addCacheBusting(value)); // Restore previous preview
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (value && userId) {
      try {
        // Extract filename from URL for deletion
        const urlParts = value.split('/');
        const fileName = `${userId}/${urlParts[urlParts.length - 1]}`;
        
        await supabase.storage
          .from('user-avatars')
          .remove([fileName]);
      } catch (error) {
        console.error('Error removing avatar:', error);
      }
    }
    
    onChange(null);
    setPreviewUrl(null);
    
    // If immediate update function is provided, call it
    if (onImmediateUpdate) {
      try {
        await onImmediateUpdate(null);
        toast({
          title: "Avatar removed and saved",
          description: "Your profile picture has been removed"
        });
      } catch (updateError) {
        console.error('Error in immediate update:', updateError);
        toast({
          title: "Avatar removed but not saved",
          description: "Please click 'Save Changes' to persist this change",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Avatar removed",
        description: "Your profile picture has been removed"
      });
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className={`${sizeClasses[size]} rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center overflow-hidden relative`}>
        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt="Avatar preview"
              className="w-full h-full object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-6 h-6 w-6 p-0 rounded-full shadow-lg border-2 border-white bg-red-500 hover:bg-red-600"
              onClick={handleRemove}
              style={{ zIndex: 9999 }}
            >
              <X className="h-3 w-3" />
            </Button>
          </>
        ) : (
          <User className="h-8 w-8 text-gray-400" />
        )}
      </div>
      
      <div className="flex flex-col items-center space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {

            if (fileInputRef.current) {

              fileInputRef.current.click();
            } else {
              console.error('File input ref is null');
            }
          }}
          disabled={isUploading}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {isUploading ? "Uploading..." : previewUrl ? "Change Avatar" : "Upload Avatar"}
        </Button>
        
        <p className="text-xs text-gray-500 text-center">
          JPG, PNG, GIF up to 5MB
        </p>
      </div>
    </div>
  );
};
