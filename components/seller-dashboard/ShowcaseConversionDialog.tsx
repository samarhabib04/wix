'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ShowcaseConversionForm } from './ShowcaseConversionForm';
import { useShowcaseConversion } from '@/hooks/useShowcaseConversion';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ShowcaseConversionDialogProps {
  showcaseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const ShowcaseConversionDialog: React.FC<ShowcaseConversionDialogProps> = ({
  showcaseId,
  open,
  onOpenChange,
  onSuccess
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { convertToSaleListing, isConverting } = useShowcaseConversion();
  const [showcaseData, setShowcaseData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch showcase data when dialog opens - only fetch once when dialog opens
  useEffect(() => {
    if (open && showcaseId && user && !showcaseData) {
      const fetchShowcaseData = async () => {
        setIsLoading(true);
        try {
          const { data, error } = await supabase
            .from('showcase_listings')
            .select('*')
            .eq('id', showcaseId)
            .eq('seller_id', user.id)
            .single();

          if (error || !data) {
            toast({
              title: "Error",
              description: "Failed to load showcase listing data.",
              variant: "destructive",
            });
            onOpenChange(false);
            return;
          }

          setShowcaseData(data);
        } catch (error) {
          console.error('Error fetching showcase data:', error);
          toast({
            title: "Error",
            description: "Failed to load showcase listing data.",
            variant: "destructive",
          });
          onOpenChange(false);
        } finally {
          setIsLoading(false);
        }
      };

      fetchShowcaseData();
    }
  }, [open, showcaseId, user]); // Removed showcaseData and onOpenChange from dependencies

  // Reset showcase data when dialog closes
  useEffect(() => {
    if (!open) {
      setShowcaseData(null);
    }
  }, [open]);

  const handleFormSubmit = async (data: any) => {
    if (!showcaseData) return;

    try {
      // Call conversion with form data
      await convertToSaleListing(showcaseId, data);
      
      // Only close dialog on successful conversion
      onOpenChange(false);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      // Error handling is done in the hook, but don't close dialog
      console.error('Conversion error in dialog:', error);
      // Modal stays open so user can fix errors and try again
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl w-full h-[95vh] sm:h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 flex-shrink-0 border-b">
          <DialogTitle className="text-lg sm:text-xl">Convert Showcase to Sale Listing</DialogTitle>
          <DialogDescription className="text-sm">
            Please fill in all required fields to convert your showcase listing to a sale listing.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 px-4 sm:px-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading showcase data...</p>
              </div>
            </div>
          ) : showcaseData ? (
            <ShowcaseConversionForm
              showcaseData={showcaseData}
              onSubmit={handleFormSubmit}
              onCancel={handleCancel}
              isSubmitting={isConverting}
            />
          ) : (
            <div className="text-center py-8 px-4 sm:px-6">
              <p className="text-muted-foreground">No showcase data available.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
