import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, MessageSquare, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ContactChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerPhone?: string;
  onMessageChosen: () => void;
}

export const ContactChoiceModal = ({
  isOpen,
  onClose,
  sellerPhone,
  onMessageChosen,
}: ContactChoiceModalProps) => {
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [phoneCopied, setPhoneCopied] = useState(false);
  const { toast } = useToast();

  const handlePhoneChosen = () => {
    if (!sellerPhone) {
      toast({
        title: "Phone number not available",
        description: "The seller's phone number is not available at this time.",
        variant: "destructive"
      });
      return;
    }
    setPhoneRevealed(true);
  };

  const handleCopyPhone = async () => {
    if (!sellerPhone) return;
    
    try {
      await navigator.clipboard.writeText(sellerPhone);
      setPhoneCopied(true);
      toast({
        title: "Phone number copied",
        description: "The phone number has been copied to your clipboard.",
      });
      setTimeout(() => setPhoneCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy phone number:', error);
      toast({
        title: "Copy failed",
        description: "Could not copy phone number. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleMessageChosen = () => {
    onMessageChosen();
    // Reset state when closing
    setPhoneRevealed(false);
  };

  const handleClose = () => {
    setPhoneRevealed(false);
    setPhoneCopied(false);
    onClose();
  };

  const hasPhone = sellerPhone && sellerPhone.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Contact Seller</DialogTitle>
        </DialogHeader>
        
        {!phoneRevealed ? (
          // Initial choice screen
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              How would you like to contact the seller?
            </p>

            <div className="space-y-3">
              {/* Phone Number Option */}
              {hasPhone ? (
                <Button
                  onClick={handlePhoneChosen}
                  variant="outline"
                  className="w-full h-auto py-4 flex items-center justify-start gap-3 border-2 hover:border-brand-soft-green hover:bg-brand-soft-green/5"
                >
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Phone className="h-5 w-5 text-gray-700" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-semibold text-base">Get Phone Number</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Contact the seller directly
                    </div>
                  </div>
                </Button>
              ) : (
                <Button
                  disabled
                  variant="outline"
                  className="w-full h-auto py-4 flex items-center justify-start gap-3 border-2 opacity-50 cursor-not-allowed"
                >
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-semibold text-base">Get Phone Number</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Phone number not available
                    </div>
                  </div>
                </Button>
              )}

              {/* Message Option */}
              <Button
                onClick={handleMessageChosen}
                className="w-full h-auto py-4 flex items-center justify-start gap-3 bg-brand-soft-green hover:bg-brand-soft-green/90 text-white border-2 border-brand-soft-green"
              >
                <div className="p-2 bg-white/20 rounded-lg">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-base">Message Seller</div>
                  <div className="text-xs text-white/90 mt-0.5">
                    Start a conversation here
                  </div>
                </div>
              </Button>
            </div>

            {/* Recommendation Text */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-900 leading-relaxed">
                <strong>We recommend messaging the seller first</strong> so communication is transparent and we can assist if there's a dispute.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          // Phone revealed screen
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              The seller's phone number:
            </p>

            {/* Phone Number Display */}
            <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Phone className="h-5 w-5 text-gray-600 flex-shrink-0" />
                  <span className="text-lg font-semibold text-gray-900 truncate">
                    {sellerPhone}
                  </span>
                </div>
                <Button
                  onClick={handleCopyPhone}
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0"
                >
                  {phoneCopied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Message Seller Button */}
            <Button
              onClick={handleMessageChosen}
              className="w-full bg-brand-soft-green hover:bg-brand-soft-green/90 text-white"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Message Seller
            </Button>

            <div className="flex justify-end pt-2">
              <Button variant="ghost" onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
