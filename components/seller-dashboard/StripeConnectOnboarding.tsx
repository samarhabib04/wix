import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock, ExternalLink, CreditCard, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { redirectToStripeCheckout } from '@/lib/utils/stripe-checkout';
import {
  isStripeConnectReadyFromCheckStatus,
  STRIPE_CONNECT_RETURN_PATHS,
} from '@/lib/utils/stripe-connect';

interface StripeAccount {
  status: 'no_account' | 'exists';
  account_id?: string;
  onboarding_completed: boolean;
  payout_enabled: boolean;
  charges_enabled?: boolean;
  connect_ready_for_payments?: boolean;
  requirements?: string[];
}

interface StripeConnectOnboardingProps {
  onSetupComplete?: () => void;
}

export const StripeConnectOnboarding: React.FC<StripeConnectOnboardingProps> = ({ 
  onSetupComplete 
}) => {
  const [stripeAccount, setStripeAccount] = useState<StripeAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();

  const checkStripeStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-stripe-account', {
        body: { action: 'check_status' }
      });

      if (error) throw error;
      setStripeAccount(data);
    } catch (error) {
      console.error('Error checking Stripe status:', error);
      toast({
        title: "Error",
        description: "Failed to check Stripe account status.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStripeStatus();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const onboarding = params.get('onboarding');
    if (onboarding !== 'complete' && onboarding !== 'refresh') {
      return;
    }

    void (async () => {
      await checkStripeStatus();
      if (onboarding === 'complete') {
        toast({
          title: 'Payment setup updated',
          description: 'Your Stripe account status has been refreshed.',
        });
      }
      window.history.replaceState({}, '', window.location.pathname);
    })();
  }, [toast]);

  // Call callback when setup is complete
  useEffect(() => {
    const ready =
      stripeAccount?.status === 'exists' &&
      isStripeConnectReadyFromCheckStatus(stripeAccount);
    if (ready && onSetupComplete) {
      onSetupComplete();
    }
  }, [stripeAccount, onSetupComplete]);

  const createStripeAccount = async () => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-stripe-account', {
        body: { action: 'create_account' }
      });

      if (error) throw error;
      
      toast({
        title: "Stripe Account Created",
        description: "Your Stripe account has been created. Complete the onboarding to start receiving payments."
      });
      
      checkStripeStatus();
    } catch (error) {
      console.error('Error creating Stripe account:', error);
      toast({
        title: "Error",
        description: "Failed to create Stripe account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const startOnboarding = async () => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-stripe-account', {
        body: {
          action: 'create_onboarding_link',
          return_path: STRIPE_CONNECT_RETURN_PATHS.seller,
        },
      });

      if (error) throw error;
      
      if (data?.url) {
        redirectToStripeCheckout(data.url);
      }
    } catch (error) {
      console.error('Error starting onboarding:', error);
      toast({
        title: "Error",
        description: "Failed to start onboarding. Please try again.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openStripeDashboard = async () => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-stripe-account', {
        body: { action: 'create_login_link' }
      });

      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening Stripe dashboard:', error);
      toast({
        title: "Error",
        description: "Failed to open Stripe dashboard. Please try again.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const connectReady = isStripeConnectReadyFromCheckStatus(stripeAccount);
  const needsSetupAction =
    stripeAccount?.status === 'exists' && !connectReady;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Payment Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stripeAccount?.status === 'no_account' && (
          <>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Set up your Stripe account to receive payments from puppy reservations and sales.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Connect your bank account to receive payments securely through Stripe.
              </p>
              <Button 
                onClick={createStripeAccount} 
                disabled={actionLoading}
                className="w-full"
              >
                {actionLoading ? "Creating..." : "Create Stripe Account"}
              </Button>
            </div>
          </>
        )}

        {stripeAccount?.status === 'exists' && (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Account Status</span>
                <Badge variant={stripeAccount.onboarding_completed ? "default" : "secondary"}>
                  {stripeAccount.onboarding_completed ? (
                    <CheckCircle className="w-3 h-3 mr-1" />
                  ) : (
                    <Clock className="w-3 h-3 mr-1" />
                  )}
                  {stripeAccount.onboarding_completed ? "Complete" : "Pending"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Payout Status</span>
                <Badge variant={stripeAccount.payout_enabled ? "default" : "destructive"}>
                  {stripeAccount.payout_enabled ? (
                    <CheckCircle className="w-3 h-3 mr-1" />
                  ) : (
                    <XCircle className="w-3 h-3 mr-1" />
                  )}
                  {stripeAccount.payout_enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Charges</span>
                <Badge variant={stripeAccount.charges_enabled ? "default" : "secondary"}>
                  {stripeAccount.charges_enabled ? (
                    <CheckCircle className="w-3 h-3 mr-1" />
                  ) : (
                    <Clock className="w-3 h-3 mr-1" />
                  )}
                  {stripeAccount.charges_enabled ? "Enabled" : "Pending"}
                </Badge>
              </div>

              {stripeAccount.requirements && stripeAccount.requirements.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Complete required information: {stripeAccount.requirements.join(', ')}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {needsSetupAction && (
                <Button 
                  onClick={startOnboarding} 
                  disabled={actionLoading}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  {actionLoading ? "Loading..." : "Complete Setup"}
                </Button>
              )}
              
              {connectReady && (
                <Button 
                  variant="outline"
                  onClick={openStripeDashboard} 
                  disabled={actionLoading}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  {actionLoading ? "Loading..." : "Stripe Dashboard"}
                </Button>
              )}
              
              <Button 
                variant="outline"
                onClick={checkStripeStatus} 
                disabled={actionLoading}
              >
                Refresh Status
              </Button>
            </div>

            {(connectReady || stripeAccount.payout_enabled || stripeAccount.charges_enabled) && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  ✅ You can accept reservation payments on Dog Quest. Payouts to your bank follow Stripe&apos;s verification (€40 to seller, €10 platform fee).
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
