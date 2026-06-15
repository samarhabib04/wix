import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Euro, TrendingUp, Star, Crown, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { redirectToStripeCheckout } from '@/lib/utils/stripe-checkout';
import {
  countBoostsInActivationWindow,
  formatBoostScheduleMessage,
} from '@/lib/utils/boost-activation-window';

interface BoostModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingType: 'sale' | 'stud';
  listingTitle: string;
}

const BOOST_OPTIONS = {
  standard: {
    price: 5,
    title: 'Standard Boost',
    duration: 'Until bumped',
    description: 'Top of breed & sale pages',
    icon: <TrendingUp className="h-5 w-5" />,
    features: ['Top placement on breed pages', 'Top placement on sale/stud pages', 'Gets bumped down by new boosts', 'No time limit'],
    color: 'bg-orange-50 border-orange-200',
    maxSlots: null // No limit
  },
  premium: {
    price: 10,
    title: 'Premium Boost',
    duration: '24 hours',
    description: 'Premium placement + carousel',
    icon: <Star className="h-5 w-5" />,
    features: ['Enhanced visibility', '24-hour guaranteed placement', 'Premium home page carousel', 'Max 40 listings at once'],
    color: 'bg-blue-50 border-blue-200',
    maxSlots: 40
  },
  elite: {
    price: 12.50,
    title: 'Elite Boost',
    duration: '24 hours',
    description: 'Above Premium + Elite Carousel',
    icon: <Crown className="h-5 w-5" />,
    features: ['Above Premium boosts', '24-hour guaranteed placement', 'Elite home page carousel', 'Max 20 listings at once'],
    color: 'bg-purple-50 border-purple-200',
    maxSlots: 20
  },
  gold: {
    price: 20,
    title: 'Gold Boost',
    duration: '4 hours each evening (7:00 PM-11:00 PM)',
    description: 'Highest priority + Gold Carousel',
    icon: <Zap className="h-5 w-5" />,
    features: ['Highest priority placement', '4-hour evening visibility window (7:00 PM-11:00 PM)', 'Gold carousel during the evening window', 'Max 5 listings at once'],
    color: 'bg-amber-50 border-amber-200',
    maxSlots: 5
  }
};

export const BoostModal = ({ 
  isOpen, 
  onClose, 
  listingId, 
  listingType, 
  listingTitle 
}: BoostModalProps) => {
  const [selectedBoost, setSelectedBoost] = useState<keyof typeof BOOST_OPTIONS | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeBoostCounts, setActiveBoostCounts] = useState<Record<string, number>>({});
  const { toast } = useToast();
  
  // Add authentication guard for boost purchase
  const { checkAuth } = useAuthGuard({
    message: "Please log in to boost your listing."
  });

  // Fetch active boost counts on modal open
  useEffect(() => {
    if (isOpen) {
      fetchActiveBoostCounts();
    }
  }, [isOpen]);

  const fetchActiveBoostCounts = async () => {
    try {
      const now = new Date();
      const { data, error } = await supabase
        .from('boosts')
        .select('boost_type, boost_start_time, boost_end_time')
        .eq('is_active', true)
        .eq('payment_status', 'paid');

      if (error) throw error;

      const counts: Record<string, number> = {
        standard: 0,
        premium: 0,
        elite: 0,
        gold: 0,
      };

      (['gold', 'elite', 'premium'] as const).forEach((tier) => {
        counts[tier] = countBoostsInActivationWindow(data || [], tier, now);
      });

      setActiveBoostCounts(counts);
    } catch (error) {
      console.error('Error fetching boost counts:', error);
    }
  };

  const handleBoostPurchase = async () => {
    // Check authentication before proceeding
    if (!checkAuth()) return;
    
    if (!selectedBoost) return;

    try {
      setIsProcessing(true);

      const { data, error } = await supabase.functions.invoke('create-boost-payment', {
        body: {
          listing_id: listingId,
          listing_type: listingType,
          boost_type: selectedBoost,
          currency: 'EUR'
        }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.message || data.error);
      }

      if (data?.url) {
        onClose();
        redirectToStripeCheckout(data.url);
        return;
      }

      throw new Error('No checkout URL received');

    } catch (error) {
      console.error('Boost purchase error:', error);
      toast({
        title: 'Boost Purchase Error',
        description: error instanceof Error ? error.message : 'Failed to create boost payment session. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Boost Your Listing
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 p-3 rounded-lg">
            <h4 className="font-medium text-sm text-muted-foreground mb-1">Boosting Listing</h4>
            <p className="font-medium">{listingTitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(BOOST_OPTIONS).map(([key, boost]) => {
              const boostKey = key as keyof typeof BOOST_OPTIONS;
              const currentCount = activeBoostCounts[key] || 0;
              const maxSlots = boost.maxSlots;
              const isFull = maxSlots !== null && currentCount >= maxSlots;
              const slotsRemaining = maxSlots !== null ? maxSlots - currentCount : null;

              return (
                <Card 
                  key={key}
                  className={`transition-all duration-200 ${
                    isFull 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'cursor-pointer hover:shadow-md'
                  } ${
                    selectedBoost === key 
                      ? 'ring-2 ring-primary shadow-md' 
                      : ''
                  } ${boost.color}`}
                  onClick={() => !isFull && setSelectedBoost(boostKey)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {boost.icon}
                        <CardTitle className="text-lg">{boost.title}</CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-lg font-bold">
                        €{boost.price}
                      </Badge>
                    </div>
                    <CardDescription>
                      {boost.description}
                      {isFull && <span className="block text-red-600 font-semibold mt-1">SOLD OUT</span>}
                      {!isFull && slotsRemaining !== null && (
                        <span className="block text-muted-foreground text-xs mt-1">
                          {slotsRemaining} slot{slotsRemaining !== 1 ? 's' : ''} remaining
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Duration: {boost.duration}</span>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Features:</h4>
                    <ul className="space-y-1">
                      {boost.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {selectedBoost && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between text-sm mb-4">
                <span>Selected: {BOOST_OPTIONS[selectedBoost].title}</span>
                <span className="text-lg font-bold">€{BOOST_OPTIONS[selectedBoost].price}</span>
              </div>

              <p className="text-sm text-muted-foreground mb-4 rounded-lg bg-muted/50 p-3">
                {formatBoostScheduleMessage(selectedBoost)}
              </p>
              
              <Button 
                onClick={handleBoostPurchase}
                disabled={isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? 'Processing...' : `Purchase ${BOOST_OPTIONS[selectedBoost].title}`}
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            {selectedBoost
              ? formatBoostScheduleMessage(selectedBoost)
              : 'Gold boosts run 7:00 PM–11:00 PM Irish time. Other tiers activate immediately after payment.'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
