import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Euro, Calendar, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ListingPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingType: 'sale' | 'stud' | 'showcase';
  listingTitle: string;
}

const PRICING = {
  sale: {
    price: 20,
    duration: '2 months',
    description: 'List your puppies for sale with full visibility',
    features: ['Full listing details', 'Contact from buyers', 'Admin approval', 'Auto-renewal option']
  },
  stud: {
    price: 20,
    duration: '2 months', 
    description: 'Advertise your stud dog for breeding',
    features: ['Stud service details', 'Contact from breeders', 'Admin approval', 'Auto-renewal option']
  },
  showcase: {
    price: 5,
    duration: 'Until 6 weeks old',
    description: 'Showcase your newborn puppies',
    features: ['Early visibility', 'Convert to sale listing', 'Admin approval', 'No renewal needed']
  }
};

export const ListingPricingModal = ({ 
  isOpen, 
  onClose, 
  listingId, 
  listingType, 
  listingTitle 
}: ListingPricingModalProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const pricing = PRICING[listingType];

  const handlePayment = async () => {
    try {
      setIsProcessing(true);

      const { data, error } = await supabase.functions.invoke('create-listing-payment', {
        body: {
          listing_id: listingId,
          listing_type: listingType,
          currency: 'EUR'
        }
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
        onClose();
      } else {
        throw new Error('No checkout URL received');
      }

    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Error',
        description: 'Failed to create payment session. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Euro className="h-5 w-5 text-primary" />
            Complete Your Listing
          </DialogTitle>
        </DialogHeader>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {listingType.charAt(0).toUpperCase() + listingType.slice(1)} Listing
              </CardTitle>
              <Badge variant="secondary" className="text-lg font-bold">
                €{pricing.price}
              </Badge>
            </div>
            <CardDescription>{pricing.description}</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-3 rounded-lg">
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Your Listing</h4>
              <p className="font-medium">{listingTitle}</p>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Valid for {pricing.duration}</span>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">What's included:</h4>
              <ul className="space-y-1">
                {pricing.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between text-sm mb-4">
                <span>Total</span>
                <span className="text-lg font-bold">€{pricing.price}</span>
              </div>
              
              <Button 
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? 'Processing...' : 'Continue to Payment'}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Your listing will be submitted for admin review after successful payment.
            </p>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};
