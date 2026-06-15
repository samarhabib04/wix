'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Move, ZoomIn } from 'lucide-react';
import { getCroppedImg, getCroppedPreviewUrl } from '@/lib/utils/image-crop-utils';
import { CropPreviewCard } from './CropPreviewCard';

interface ImageCropperProps {
  imageSrc: string;
  open: boolean;
  onClose: () => void;
  onCropComplete: (croppedImageBlob: Blob) => void;
  aspectRatio?: number;
  listingType?: 'sale' | 'showcase' | 'stud' | 'marketplace' | 'business' | null;
  cropType?: 'logo' | 'banner' | null; // For business listings, specify if cropping logo or banner
  hidePreview?: boolean; // Hide the preview panel
}

export const ImageCropper: React.FC<ImageCropperProps> = ({
  imageSrc,
  open,
  onClose,
  onCropComplete,
  aspectRatio = 4 / 3,
  listingType = null,
  cropType = null,
  hidePreview = false,
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropping, setCropping] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const croppedAreaPixelsRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const previewUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updatePreview = useCallback(async (pixelCrop: { x: number; y: number; width: number; height: number }) => {
    try {
      const previewUrl = await getCroppedPreviewUrl(imageSrc, pixelCrop);
      setPreviewImage(previewUrl);
    } catch (error) {
      console.error('Error generating preview:', error);
    }
  }, [imageSrc]);

  const onCropCompleteCallback = useCallback(
    async (croppedArea: { x: number; y: number; width: number; height: number }, croppedAreaPixels: { x: number; y: number; width: number; height: number }) => {
      croppedAreaPixelsRef.current = croppedAreaPixels;
      
      // Generate preview immediately (no debounce for better UX)
      updatePreview(croppedAreaPixels);
    },
    [updatePreview]
  );

  // Generate initial preview when dialog opens
  useEffect(() => {
    if (open && imageSrc) {
      // Reset preview when dialog opens
      setPreviewImage(null);
      croppedAreaPixelsRef.current = null;
      
      // Generate initial preview after a short delay to allow cropper to calculate initial crop area
      const timer = setTimeout(() => {
        if (croppedAreaPixelsRef.current) {
          updatePreview(croppedAreaPixelsRef.current);
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [open, imageSrc, updatePreview]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (previewUpdateTimeoutRef.current) {
        clearTimeout(previewUpdateTimeoutRef.current);
      }
    };
  }, []);

  const handleCrop = async () => {
    if (!croppedAreaPixelsRef.current) {
      console.error('Crop area not initialized');
      return;
    }

    setCropping(true);
    try {
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixelsRef.current);
      onCropComplete(croppedImageBlob);
      handleClose();
    } catch (error) {
      console.error('Error cropping image:', error);
      setCropping(false);
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setPreviewImage(null);
    croppedAreaPixelsRef.current = null;
    if (previewUpdateTimeoutRef.current) {
      clearTimeout(previewUpdateTimeoutRef.current);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl w-full">
        <DialogHeader>
          <DialogTitle>Crop Image</DialogTitle>
          <DialogDescription>
            {hidePreview 
              ? "Drag to reposition, use zoom to adjust framing."
              : "Drag to reposition, use zoom to adjust framing. See how it will look in your listing card on the right."
            }
          </DialogDescription>
        </DialogHeader>
        <div className={hidePreview ? "grid grid-cols-1 gap-6" : "grid grid-cols-1 lg:grid-cols-2 gap-6"}>
          {/* Crop Area - Left Side */}
          <div className="space-y-4">
        <div className="relative w-full h-[400px] bg-gray-900 rounded-lg overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropCompleteCallback}
            cropShape="rect"
            showGrid={true}
            style={{
              containerStyle: {
                width: '100%',
                height: '100%',
                position: 'relative',
              },
            }}
          />
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <ZoomIn className="w-4 h-4" />
                Zoom
              </label>
              <span className="text-sm text-muted-foreground">{zoom.toFixed(1)}x</span>
            </div>
            <Slider
              value={[zoom]}
              min={0.5}
              max={3}
              step={0.1}
              onValueChange={(value) => setZoom(value[0])}
              className="w-full"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Move className="w-4 h-4" />
            <span>Drag the image to reposition</span>
          </div>
          
          {/* Action Buttons - Show here when preview is hidden */}
          {hidePreview && (
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={handleClose} disabled={cropping}>
                Cancel
              </Button>
              <Button onClick={handleCrop} disabled={cropping}>
                {cropping ? 'Cropping...' : 'Apply Crop'}
              </Button>
            </div>
          )}
            </div>
          </div>

          {/* Preview Card - Right Side */}
          {!hidePreview && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center h-[400px] lg:h-auto lg:min-h-[400px]">
                <div className="mb-2">
                  <p className="text-sm font-medium text-center text-gray-700">Preview</p>
                  <p className="text-xs text-center text-gray-500">How it will appear in your listing</p>
                </div>
                <CropPreviewCard 
                  listingType={listingType} 
                  previewImage={previewImage}
                  cropType={cropType}
                />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={handleClose} disabled={cropping}>
                  Cancel
                </Button>
                <Button onClick={handleCrop} disabled={cropping}>
                  {cropping ? 'Cropping...' : 'Apply Crop'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
