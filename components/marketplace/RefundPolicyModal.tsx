'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

interface RefundPolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  currentPolicy?: string | null;
}

export const RefundPolicyModal: React.FC<RefundPolicyModalProps> = ({
  open,
  onOpenChange,
  businessId,
  currentPolicy,
}) => {
  const [policy, setPolicy] = useState(currentPolicy || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Update policy when currentPolicy changes
  useEffect(() => {
    setPolicy(currentPolicy || '');
  }, [currentPolicy]);

  const handleSave = async () => {
    if (!businessId) {
      toast({
        title: "Error",
        description: "Business ID is required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('business_listings')
        .update({ refund_policy: policy.trim() || null } as any)
        .eq('id', businessId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Refund policy updated successfully",
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving refund policy:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save refund policy",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Refund Policy</DialogTitle>
          <DialogDescription>
            Set your refund policy for all marketplace products. This policy will be displayed to customers on product pages.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="refund-policy">Refund Policy Text</Label>
            <Textarea
              id="refund-policy"
              value={policy}
              onChange={(e) => setPolicy(e.target.value)}
              placeholder="Enter your refund policy here. For example: 'We offer a 30-day return policy for unused items in original packaging. Contact us to initiate a return. Refunds are processed within 5-7 business days after we receive the returned item.'"
              rows={8}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This policy will apply to all your marketplace products.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-brand-dark-green hover:bg-brand-soft-green"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Policy'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
