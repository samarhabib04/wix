'use client';

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ShowcaseEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showcaseId: string;
  showcaseTitle?: string;
}

const ShowcaseEmailModal = ({ 
  open, 
  onOpenChange,
  showcaseId,
  showcaseTitle
}: ShowcaseEmailModalProps) => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('showcase-email-notification', {
        body: {
          email: email.trim(),
          showcase_id: showcaseId,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Thank you!",
          description: "You'll be notified when this listing becomes active.",
        });
        setEmail("");
        onOpenChange(false);
      } else {
        throw new Error(data?.error || "Failed to register email");
      }
    } catch (err: any) {
      console.error('Error submitting email:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to register email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex flex-col items-center text-center gap-2">
            <Heart className="h-6 w-6 text-rose-500" />
            <p>Get Notified When This Listing Goes Live</p>
          </DialogTitle>
          <DialogDescription className="text-center">
            Enter your email address and we'll notify you when this showcase listing becomes active and available for sale.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="showcase-email">Email Address</Label>
            <Input
              id="showcase-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between mt-5">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="sm:order-1"
            >
              Cancel
            </Button>
            
            <Button 
              type="submit"
              disabled={isSubmitting}
              className="bg-brand-soft-green hover:bg-brand-dark-green"
            >
              {isSubmitting ? "Submitting..." : "Notify Me"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ShowcaseEmailModal;
