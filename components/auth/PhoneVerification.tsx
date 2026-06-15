
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";
import { Loader2, Phone, Shield, AlertCircle, Clock, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface PhoneVerificationProps {
  phone: string;
  onVerified: (verified: boolean) => void;
  isRequired?: boolean;
}

// Format phone number to match the format used in SMS verification
const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  let formattedPhone = phone.replace(/\s+/g, '');
  if (formattedPhone.startsWith('0')) {
    // Irish number - replace 0 with +353
    formattedPhone = '+353' + formattedPhone.substring(1);
  } else if (!formattedPhone.startsWith('+')) {
    // Assume Irish if no country code
    formattedPhone = '+353' + formattedPhone;
  }
  return formattedPhone;
};

export default function PhoneVerification({ phone, onVerified, isRequired = true }: PhoneVerificationProps) {
  const [step, setStep] = useState<'send' | 'verify'>('send');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);

  // Check if phone number is already verified when phone changes
  useEffect(() => {
    const checkExistingVerification = async () => {
      if (!phone || phone.trim() === '') {
        setIsVerified(false);
        onVerified(false);
        return;
      }

      try {
        setCheckingVerification(true);
        const formattedPhone = formatPhoneNumber(phone);
        
        // Check if phone number is already verified
        const { data, error } = await supabase
          .from('phone_verification_codes')
          .select('verified')
          .eq('phone_number', formattedPhone)
          .eq('verified', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error checking phone verification:', error);
          // Don't set verified state on error, let user verify manually
          return;
        }

        if (data && data.verified === true) {
          setIsVerified(true);
          onVerified(true);
        } else {
          setIsVerified(false);
          onVerified(false);
        }
      } catch (error) {
        console.error('Exception checking phone verification:', error);
        // Don't set verified state on error
      } finally {
        setCheckingVerification(false);
      }
    };

    checkExistingVerification();
  }, [phone, onVerified]);

  const startResendCountdown = () => {
    setCanResend(false);
    setResendCountdown(60);
    
    const interval = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendVerificationCode = async () => {
    if (!phone || phone.trim() === '') {
      toast({
        variant: "destructive",
        title: "Phone Required",
        description: "Please enter your phone number first"
      });
      return;
    }

    try {
      setIsLoading(true);
      setDeliveryError(null);
      
      const { data, error } = await supabase.functions.invoke('sms-verification', {
        body: { phone },
        method: 'POST',
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Code Sent",
          description: "We've sent a verification code to your phone"
        });
        setStep('verify');
        setCodeSent(true);
        startResendCountdown();
      } else {
        // Handle specific error types
        if (data?.rateLimited) {
          toast({
            variant: "destructive",
            title: "Too Many Requests",
            description: data.message || "Please wait 5 minutes before requesting another code"
          });
          setCanResend(false);
          setResendCountdown(300); // 5 minutes
          
          const interval = setInterval(() => {
            setResendCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(interval);
                setCanResend(true);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else if (data?.deliveryFailed) {
          setDeliveryError(data.message || 'SMS delivery failed');
          toast({
            variant: "destructive",
            title: "Delivery Failed",
            description: data.message || "Failed to deliver SMS. Please check your phone number."
          });
        } else {
          throw new Error(data?.message || 'Failed to send verification code');
        }
      }
    } catch (error: any) {
      console.error('Send SMS error:', error);
      
      setDeliveryError(error.message || 'Failed to send verification code');
      toast({
        variant: "destructive",
        title: "Failed to Send Code",
        description: error.message || "Please try again"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!code || code.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid Code",
        description: "Please enter the 6-digit code"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('sms-verification', {
        body: { phone, code },
        method: 'POST',
      });

      if (error) throw error;

      if (data?.verified) {
        setIsVerified(true);
        onVerified(true);
        toast({
          title: "Phone Verified",
          description: "Your phone number has been successfully verified"
        });
      } else {
        toast({
          variant: "destructive",
          title: "Invalid Code",
          description: data?.message || "The verification code is incorrect"
        });
      }
    } catch (error: any) {
      console.error('Verify SMS error:', error);
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: error.message || "Please try again"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking verification
  if (checkingVerification) {
    return (
      <div className="flex items-center space-x-2 text-gray-600 bg-gray-50 p-3 rounded-lg">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm font-medium">Checking verification status...</span>
      </div>
    );
  }

  if (isVerified) {
    return (
      <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
        <Shield className="h-5 w-5" />
        <span className="text-sm font-medium">Phone number verified ✓</span>
      </div>
    );
  }

  if (step === 'send') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Phone Verification</label>
          {isRequired && <span className="text-xs text-red-500">Required</span>}
        </div>
        <p className="text-xs text-gray-600">
          We'll send a verification code to your phone number
        </p>
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-xs text-blue-900">
            <strong>Phone Format:</strong> Make sure your number includes the country code prefix.
            <br />
            <span className="mt-1 block">
              <strong>Ireland:</strong> +353 87 123 4567 (drop the first 0) | <strong>UK:</strong> +44 7XXX XXX XXX
            </span>
          </AlertDescription>
        </Alert>
        
        {deliveryError && (
          <div className="flex items-start space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              <p className="font-medium">SMS Delivery Issue</p>
              <p>{deliveryError}</p>
              <p className="mt-1">Please check your phone number and try again, or contact support if this persists.</p>
            </div>
          </div>
        )}
        
        {!canResend && resendCountdown > 0 && (
          <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 p-2 rounded-md">
            <Clock className="h-4 w-4" />
            <span className="text-xs">
              {resendCountdown > 60 
                ? `Please wait ${Math.ceil(resendCountdown / 60)} minutes before requesting another code`
                : `Please wait ${resendCountdown} seconds before requesting another code`
              }
            </span>
          </div>
        )}
        
        <Button
          type="button"
          variant="outline"
          onClick={sendVerificationCode}
          disabled={isLoading || !phone || !canResend}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending code...
            </>
          ) : (
            <>
              <Phone className="mr-2 h-4 w-4" />
              {canResend ? 'Send verification code' : 
                resendCountdown > 60 
                  ? `Wait ${Math.ceil(resendCountdown / 60)}m` 
                  : `Wait ${resendCountdown}s`
              }
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-sm font-medium">Enter Verification Code</h3>
        <p className="text-xs text-gray-600 mt-1">
          We sent a 6-digit code to {phone}
        </p>
      </div>
      
      <Alert className="bg-amber-50 border-amber-200">
        <Info className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-xs text-amber-900">
          <strong>Can't find the code?</strong> If you don't see the verification code in your messages inbox, please check your spam/junk folder.
        </AlertDescription>
      </Alert>
      
      <div className="flex justify-center">
        <InputOTP maxLength={6} value={code} onChange={setCode}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      <div className="flex space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setStep('send');
            setCode('');
            setDeliveryError(null);
          }}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={verifyCode}
          disabled={isLoading || code.length !== 6}
          className="flex-1 bg-brand-dark-green hover:bg-brand-dark-green/90"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify"
          )}
        </Button>
      </div>
      
      <Button
        type="button"
        variant="link"
        onClick={sendVerificationCode}
        disabled={isLoading || !canResend}
        className="w-full text-xs"
      >
        {canResend 
          ? "Didn't receive the code? Send again"
          : resendCountdown > 60
            ? `Resend available in ${Math.ceil(resendCountdown / 60)} minutes`
            : `Resend available in ${resendCountdown}s`
        }
      </Button>
    </div>
  );
}
