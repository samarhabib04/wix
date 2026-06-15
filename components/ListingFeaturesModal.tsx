
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle, UserRound, Heart, X } from 'lucide-react';

interface ListingFeaturesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ListingFeaturesModal: React.FC<ListingFeaturesModalProps> = ({
  open,
  onOpenChange,
}) => {
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-w-[95vw] mx-auto p-4 sm:p-6">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl sm:text-2xl font-berkshire text-brand-dark-green mb-4">
            How to Connect with Sellers
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 sm:space-y-6">
          {/* Contact Feature */}
          <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-soft-green rounded-lg flex items-center justify-center flex-shrink-0">
              <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-brand-dark-green text-sm sm:text-base mb-1">
                Contact
              </h3>
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                Send a direct message to ask questions about the puppy, schedule a visit, or get more details.
              </p>
            </div>
          </div>

          {/* Offer Feature */}
          <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <UserRound className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-brand-dark-green text-sm sm:text-base mb-1">
                Make Offer
              </h3>
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                Submit a price offer if you'd like to negotiate. The seller can accept, decline, or counter your offer.
              </p>
            </div>
          </div>

          {/* Reserve Feature */}
          <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-dark-green rounded-lg flex items-center justify-center flex-shrink-0">
              <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-brand-dark-green text-sm sm:text-base mb-1">
                Reserve
              </h3>
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                Secure your puppy with a deposit. This shows serious intent and helps guarantee your purchase.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Button 
            onClick={handleClose}
            className="w-full bg-brand-soft-green hover:bg-brand-dark-green text-white py-3 text-sm sm:text-base"
          >
            Got It!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ListingFeaturesModal;
