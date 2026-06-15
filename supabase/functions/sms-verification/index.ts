import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeadersForRequest } from '../_shared/cors-headers.ts';

interface SendSMSRequest {
  phone: string;
}

interface VerifySMSRequest {
  phone: string;
  code: string;
}

/** Required in Supabase Edge Function secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER */
const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
  console.error('❌ Missing Twilio credentials - SMS functionality will not work');
}

// Clean up expired verification codes
const cleanupExpiredCodes = async () => {
  try {
    const { error } = await supabase
      .from('phone_verification_codes')
      .delete()
      .lt('expires_at', new Date().toISOString());
    
    if (error) {
      console.error('Error cleaning up expired codes:', error);
    }
  } catch (error) {
    console.error('Error in cleanup:', error);
  }
};

// Format phone number to international format
const formatPhoneNumber = (phone: string): string => {
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

/** Clear branding + purpose helps carrier filters; keep under typical SMS segment limits. */
function otpMessageBody(code: string): string {
  return `Dog Quest: your verification code is ${code}. It expires in 10 minutes. Do not share this code.`;
}

async function twilioPostMessage(
  formBody: URLSearchParams,
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const url =
    `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody.toString(),
  });
  const data = await response.json() as Record<string, unknown>;
  console.log(`Twilio response [${response.status}]:`, JSON.stringify(data));
  return { ok: response.ok, status: response.status, data };
}

/** Throw an Error with Twilio metadata attached for richer upstream logging. */
function twilioError(msg: string, code?: number, twilioMessage?: unknown): Error {
  const err = new Error(msg) as any;
  err.twilioCode = code;
  err.twilioMessage = twilioMessage;
  return err;
}

const sendSMS = async (phone: string, code: string) => {
  const bodyText = otpMessageBody(code);

  // IE/UK: try branded alphanumeric sender first; fall back to phone number on any rejection.
  let fromValue = twilioPhoneNumber!;
  if (phone.startsWith('+353') || phone.startsWith('+44')) {
    fromValue = 'DogQuest';
  }

  const body = new URLSearchParams({
    To: phone,
    From: fromValue,
    Body: bodyText,
  });

  try {
    const { ok, data: responseData } = await twilioPostMessage(body);

    if (!ok) {
      console.error('❌ Twilio API error:', { error: responseData });

      const twilioErr = responseData.code as number | undefined;

      // If we used an alphanumeric sender and Twilio rejected it for any sender-related
      // reason, fall back to the registered Twilio phone number automatically.
      const alphanumericSenderErrors = [21212, 21408, 30007, 30008, 21211, 21215, 21610];
      if (fromValue === 'DogQuest' && (alphanumericSenderErrors.includes(twilioErr as number) || !twilioErr)) {
        console.warn(`⚠️ Alphanumeric sender failed (code ${twilioErr}), falling back to Twilio phone number`);
        return await sendSMSWithPhoneNumber(phone, code);
      }

      if (twilioErr === 21614) {
        throw twilioError('Invalid phone number format. Please check your phone number and try again.', twilioErr, responseData.message);
      } else if (twilioErr === 21408) {
        throw twilioError('Permission denied for this phone number. Please contact support.', twilioErr, responseData.message);
      } else if (twilioErr === 30007) {
        throw twilioError('Message delivery failed. Please check your phone number and try again.', twilioErr, responseData.message);
      } else {
        throw twilioError(`SMS delivery failed: ${responseData.message || 'Unknown error'}`, twilioErr, responseData.message);
      }
    }

    return {
      success: true,
      sid: responseData.sid as string,
      status: responseData.status as string | undefined,
    };
  } catch (error) {
    console.error('❌ SMS sending failed:', error);
    throw error;
  }
};

// Fallback: send from Twilio phone number if alphanumeric sender fails
const sendSMSWithPhoneNumber = async (phone: string, code: string) => {
  const body = new URLSearchParams({
    To: phone,
    From: twilioPhoneNumber!,
    Body: otpMessageBody(code),
  });

  try {
    const { ok, data: responseData } = await twilioPostMessage(body);

    if (!ok) {
      console.error('❌ Twilio API error (fallback):', { error: responseData });

      const twilioErr = responseData.code as number | undefined;
      if (twilioErr === 21614) {
        throw twilioError('Invalid phone number format. Please check your phone number and try again.', twilioErr, responseData.message);
      } else if (twilioErr === 21408) {
        throw twilioError('Permission denied for this phone number. Please contact support.', twilioErr, responseData.message);
      } else if (twilioErr === 30007) {
        throw twilioError('Message delivery failed. Please check your phone number and try again.', twilioErr, responseData.message);
      } else {
        throw twilioError(`SMS delivery failed: ${responseData.message || 'Unknown error'}`, twilioErr, responseData.message);
      }
    }

    return {
      success: true,
      sid: responseData.sid as string,
      status: responseData.status as string | undefined,
    };
  } catch (error) {
    console.error('❌ SMS sending failed (fallback):', error);
    throw error;
  }
};

serve(async (req: Request) => {
  const corsHeaders = corsHeadersForRequest(req, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Clean up expired codes on each request
    await cleanupExpiredCodes();
    
    const requestBody = await req.json();

    // Determine action based on request body
    const action = requestBody.code ? 'verify' : 'send';

    if (action === 'send') {
      const { phone }: SendSMSRequest = requestBody;
      
      if (!phone) {
        throw new Error('Phone number is required');
      }
      
      const formattedPhone = formatPhoneNumber(phone);

      // Check for recent successful SMS deliveries (not just database entries)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentSuccessfulAttempts, error: recentError } = await supabase
        .from('phone_verification_codes')
        .select('id, created_at')
        .eq('phone_number', formattedPhone)
        .gte('created_at', fiveMinutesAgo)
        .not('verification_code', 'is', null); // Only count actual code generations

      if (recentError) {
        console.error('Error checking recent attempts:', recentError);
      } else if (recentSuccessfulAttempts && recentSuccessfulAttempts.length >= 2) {

        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Too many verification requests. Please wait 5 minutes before requesting another code.',
          rateLimited: true
        }), {
          status: 429,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      try {
        // Send SMS first - only store in database if SMS delivery succeeds
        const smsResult = await sendSMS(formattedPhone, code);
        
        if (smsResult.success) {
          // Store verification code in database only after successful SMS delivery
          const expirationTime = new Date(Date.now() + (10 * 60 * 1000));
          const { data: insertData, error: insertError } = await supabase
            .from('phone_verification_codes')
            .insert({
              phone_number: formattedPhone,
              verification_code: code,
              expires_at: expirationTime.toISOString(),
              verified: false
            })
            .select()
            .single();

          if (insertError) {
            console.error('❌ Error storing verification code:', insertError);
            // SMS was sent but we couldn't store the code - this is a problem
            return new Response(JSON.stringify({ 
              success: false, 
              message: 'Verification code was sent but there was an issue storing it. Please contact support if this persists.'
            }), {
              status: 500,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
          }

          return new Response(JSON.stringify({ 
            success: true, 
            message: 'Verification code sent successfully'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }
      } catch (smsError: any) {
        console.error('❌ SMS delivery failed:', smsError);
        
        // Return specific error message based on the type of failure
        let errorMessage = 'Failed to send verification code. ';
        
        if (smsError.message.includes('Invalid phone number')) {
          errorMessage += 'Please check your phone number format.';
        } else if (smsError.message.includes('Permission denied')) {
          errorMessage += 'This phone number cannot receive messages.';
        } else if (smsError.message.includes('delivery failed')) {
          errorMessage += 'Message could not be delivered. Please try again or contact support.';
        } else {
          errorMessage += 'Please try again in a few moments.';
        }

        // Include raw Twilio error detail to aid debugging (safe – no credentials exposed)
        const twilioDetail = smsError.twilioCode
          ? `Twilio error ${smsError.twilioCode}: ${smsError.twilioMessage}`
          : smsError.message;
        
        return new Response(JSON.stringify({ 
          success: false, 
          message: errorMessage,
          deliveryFailed: true,
          debug: twilioDetail,
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

    } else if (action === 'verify') {
      const { phone, code }: VerifySMSRequest = requestBody;
      
      if (!phone || !code) {
        throw new Error('Phone number and code are required');
      }
      
      const formattedPhone = formatPhoneNumber(phone);

      // Get the most recent non-expired, non-verified code for this phone number
      const { data: codeData, error: fetchError } = await supabase
        .from('phone_verification_codes')
        .select('*')
        .eq('phone_number', formattedPhone)
        .eq('verified', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !codeData) {

        return new Response(JSON.stringify({ 
          success: false, 
          verified: false,
          message: 'No valid verification code found. Please request a new code.'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      
      // Verify the code
      if (codeData.verification_code === code) {

        // Mark the code as verified
        const { error: updateError } = await supabase
          .from('phone_verification_codes')
          .update({ 
            verified: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', codeData.id);

        if (updateError) {
          console.error('Error updating verification status:', updateError);
        }

        return new Response(JSON.stringify({ 
          success: true, 
          verified: true,
          message: 'Phone number verified successfully'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      } else {

        return new Response(JSON.stringify({ 
          success: false, 
          verified: false,
          message: 'Invalid verification code'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('❌ SMS verification error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
