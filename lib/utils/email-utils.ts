/**
 * Email utility functions using Resend via Supabase Edge Functions
 */

import { supabase } from "@/lib/supabase/client";
import type { ContactFormValues } from "@/lib/contact-form-schema";
import { getSupabaseUrl, sendEmailHeaders } from "@/lib/supabase/functions-gateway";

const SUPABASE_URL = getSupabaseUrl();

interface CartItem {
  id: string;
  title: string;
  quantity: number;
  price: number;
  image?: string;
}

interface ShippingInfo {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  county: string;
  eircode?: string;
  country: string;
}

/**
 * Send order confirmation email via Resend
 */
export const sendConfirmationEmail = async ({
  email,
  orderNumber,
  cartItems,
  shippingInfo,
  totalPrice,
  currency,
}: {
  email: string;
  orderNumber: string;
  cartItems: CartItem[];
  shippingInfo: ShippingInfo;
  totalPrice: number;
  currency: string;
}) => {
  try {
    // Get the current session to get the proper auth token
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: sendEmailHeaders(session?.access_token),
      body: JSON.stringify({
        type: 'order_confirmation',
        email,
        orderNumber,
        cartItems,
        shippingInfo,
        totalPrice,
        currency,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('📧 Email API error response:', errorText);
      throw new Error(`Failed to send email: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    return {
      success: true,
      message: 'Order confirmation email sent successfully'
    };
  } catch (error) {
    console.error('❌ Error sending order confirmation email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
};

/**
 * Send admin order notification email
 */
export const sendAdminOrderNotification = async ({
  orderNumber,
  customerEmail,
  cartItems,
  shippingInfo,
  totalPrice,
  currency,
}: {
  orderNumber: string;
  customerEmail: string;
  cartItems: CartItem[];
  shippingInfo: ShippingInfo;
  totalPrice: number;
  currency: string;
}) => {
  try {
    // Get the current session to get the proper auth token
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: sendEmailHeaders(session?.access_token),
      body: JSON.stringify({
        type: 'admin_order_notification',
        orderNumber,
        customerEmail,
        cartItems,
        shippingInfo,
        totalPrice,
        currency,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('📧 Admin email API error response:', errorText);
      throw new Error(`Failed to send admin email: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    return {
      success: true,
      message: 'Admin order notification sent successfully'
    };
  } catch (error) {
    console.error('❌ Error sending admin order notification:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send admin email'
    };
  }
};

/**
 * Send contact form confirmation email via Resend
 */
export const sendBusinessEnquiryEmail = async (values: {
  businessName: string;
  businessId: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  listingType?: string;
}) => {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: sendEmailHeaders(),
      body: JSON.stringify({
        type: "business_enquiry",
        ...values,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("📧 Business enquiry email error:", errorText);
      return { success: false, message: errorText };
    }

    return { success: true, message: "Enquiry notification sent" };
  } catch (error) {
    console.error("❌ Error sending business enquiry email:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to send email",
    };
  }
};

export const sendContactFormEmail = async (values: ContactFormValues) => {
  try {
    // Same-origin API avoids browser CORS to *.supabase.co (e.g. www vs apex mismatch).
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    if (!response.ok) {
      const msg =
        typeof payload.error === "string"
          ? payload.error
          : "Failed to send message. Please try again.";
      console.error("📧 Contact API error:", response.status, payload);
      return { success: false, message: msg };
    }

    return {
      success: true,
      message: "Contact form email sent successfully",
    };
  } catch (error) {
    console.error("❌ Error submitting contact form:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to send email",
    };
  }
};

/**
 * Send showcase approval email via Resend
 */
export const sendShowcaseApprovalEmail = async ({
  email,
  listingTitle,
  listingId,
  isEdit = false,
}: {
  email: string;
  listingTitle: string;
  listingId: string;
  isEdit?: boolean;
}) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: sendEmailHeaders(session?.access_token),
      body: JSON.stringify({
        type: 'showcase_approval',
        email,
        listingTitle,
        listingId,
        isEdit,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.statusText}`);
    }

    const result = await response.json();

    return {
      success: true,
      message: 'Showcase approval email sent successfully'
    };
  } catch (error) {
    console.error('❌ Error sending showcase approval email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
};

/**
 * Send business listing rejection email via Resend
 */
export const sendBusinessRejectionEmail = async ({
  email,
  businessName,
  rejectionReason,
  listingId,
}: {
  email: string;
  businessName: string;
  rejectionReason?: string;
  listingId: string;
}) => {
  try {
    // Get the current session to get the proper auth token
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('No authenticated session found');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: sendEmailHeaders(session.access_token),
      body: JSON.stringify({
        type: 'business_rejection',
        email,
        businessName,
        rejectionReason,
        listingId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Email API response error:', errorText);
      throw new Error(`Failed to send email: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    return {
      success: true,
      message: 'Business rejection email sent successfully'
    };
  } catch (error) {
    console.error('❌ Error sending business rejection email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
};

/**
 * Send order shipped notification email via Resend
 */
export const sendOrderShippedEmail = async ({
  email,
  orderNumber,
  cartItems,
  shippingInfo,
  totalPrice,
  currency,
}: {
  email: string;
  orderNumber: string;
  cartItems: CartItem[];
  shippingInfo: ShippingInfo;
  totalPrice: number;
  currency: string;
}) => {
  try {
    // Get the current session to get the proper auth token
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: sendEmailHeaders(session?.access_token),
      body: JSON.stringify({
        type: 'order_shipped',
        email,
        orderNumber,
        cartItems,
        shippingInfo,
        totalPrice,
        currency,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('📧 Order shipped email API error response:', errorText);
      throw new Error(`Failed to send shipped email: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    return {
      success: true,
      message: 'Order shipped email sent successfully'
    };
  } catch (error) {
    console.error('❌ Error sending order shipped email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send shipped email'
    };
  }
};

/**
 * Send password reset email via Resend
 */
export const sendPasswordResetEmail = async ({
  email,
  firstName,
  lastName,
  resetUrl,
}: {
  email: string;
  firstName?: string;
  lastName?: string;
  resetUrl: string;
}) => {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: sendEmailHeaders(),
      body: JSON.stringify({
        type: 'password_reset',
        email,
        firstName,
        lastName,
        resetUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('📧 Password reset email API error response:', errorText);
      throw new Error(`Failed to send password reset email: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    return {
      success: true,
      message: 'Password reset email sent successfully'
    };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send password reset email'
    };
  }
};

/**
 * Send signup confirmation email via Resend
 */
export const sendSignupConfirmationEmail = async ({
  email,
  firstName,
  lastName,
  businessName,
  role,
  confirmationUrl,
}: {
  email: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  role: string;
  confirmationUrl: string;
}) => {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: sendEmailHeaders(),
      body: JSON.stringify({
        type: 'signup_confirmation',
        email,
        firstName,
        lastName,
        businessName,
        role,
        confirmationUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('📧 Signup confirmation email API error response:', errorText);
      throw new Error(`Failed to send signup confirmation email: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    return {
      success: true,
      message: 'Signup confirmation email sent successfully'
    };
  } catch (error) {
    console.error('❌ Error sending signup confirmation email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send signup confirmation email'
    };
  }
};

/**
 * Send listing submission confirmation email via Resend
 */
export const sendListingSubmissionEmail = async ({
  email,
  firstName,
  listingTitle,
  listingType,
  listingId,
}: {
  email: string;
  firstName?: string;
  listingTitle: string;
  listingType: 'puppy' | 'stud' | 'showcase';
  listingId: string;
}) => {
  try {
    // Get the current session to get the proper auth token
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: sendEmailHeaders(session?.access_token),
      body: JSON.stringify({
        type: 'listing_submission',
        email,
        firstName,
        listingTitle,
        listingType,
        listingId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('📧 Listing submission email API error response:', errorText);
      throw new Error(`Failed to send listing submission email: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    return {
      success: true,
      message: 'Listing submission email sent successfully'
    };
  } catch (error) {
    console.error('❌ Error sending listing submission email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send listing submission email'
    };
  }
};

/**
 * Send listing approval email via Resend
 */
export const sendListingApprovalEmail = async ({
  email,
  firstName,
  listingTitle,
  listingType,
  listingId,
}: {
  email: string;
  firstName?: string;
  listingTitle: string;
  listingType: 'puppy' | 'stud' | 'showcase';
  listingId: string;
}) => {
  try {
    // Get the current session to get the proper auth token
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: sendEmailHeaders(session?.access_token),
      body: JSON.stringify({
        type: 'listing_approval',
        email,
        firstName,
        listingTitle,
        listingType,
        listingId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('📧 Listing approval email API error response:', errorText);
      throw new Error(`Failed to send listing approval email: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    return {
      success: true,
      message: 'Listing approval email sent successfully'
    };
  } catch (error) {
    console.error('❌ Error sending listing approval email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send listing approval email'
    };
  }
};

/**
 * Send listing rejection email via Resend
 */
export const sendListingRejectionEmail = async ({
  email,
  firstName,
  listingTitle,
  listingType,
  listingId,
  rejectionReason,
}: {
  email: string;
  firstName?: string;
  listingTitle: string;
  listingType: 'puppy' | 'stud' | 'showcase';
  listingId: string;
  rejectionReason?: string;
}) => {
  try {
    // Get the current session to get the proper auth token
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: sendEmailHeaders(session?.access_token),
      body: JSON.stringify({
        type: 'listing_rejection',
        email,
        firstName,
        listingTitle,
        listingType,
        listingId,
        rejectionReason,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('📧 Listing rejection email API error response:', errorText);
      throw new Error(`Failed to send listing rejection email: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    return {
      success: true,
      message: 'Listing rejection email sent successfully'
    };
  } catch (error) {
    console.error('❌ Error sending listing rejection email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send listing rejection email'
    };
  }
};

/**
 * Send admin notification when a new listing is submitted for review
 */
export const sendAdminListingNotification = async ({
  listingTitle,
  listingType,
  listingId,
  sellerEmail,
  sellerName,
}: {
  listingTitle: string;
  listingType: 'puppy' | 'stud' | 'showcase';
  listingId: string;
  sellerEmail: string;
  sellerName?: string;
}) => {
  try {
    // Get the current session to get the proper auth token
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: sendEmailHeaders(session?.access_token),
      body: JSON.stringify({
        type: 'admin_listing_notification',
        listingTitle,
        listingType,
        listingId,
        sellerEmail,
        sellerName,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('📧 Admin listing notification API error response:', errorText);
      throw new Error(`Failed to send admin listing notification: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    return {
      success: true,
      message: 'Admin listing notification sent successfully'
    };
  } catch (error) {
    console.error('❌ Error sending admin listing notification:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send admin listing notification'
    };
  }
};
