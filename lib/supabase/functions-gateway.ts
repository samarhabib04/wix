/**
 * Helpers for calling Supabase Edge Functions (e.g. send-email).
 * No `use client` — safe from Route Handlers and client bundles.
 */

export function getSupabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://sehzakutrlropprdcewu.supabase.co"
  ).replace(/\/$/, "");
}

/** Must match `lib/supabase/client.ts` — empty key breaks function calls. */
export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlaHpha3V0cmxyb3BwcmRjZXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5MjA4OTEsImV4cCI6MjA2MTQ5Njg5MX0.Ufbtalt1Uw_YRbeev_3KKQ8AuxNCrmzuMPOQC9hko6Q"
  );
}

/**
 * Supabase’s Functions gateway requires `apikey` (anon) and `Authorization`
 * (user JWT or anon key). Raw fetch without `apikey` returns 401.
 */
export function sendEmailHeaders(
  accessToken?: string | null,
): Record<string, string> {
  const anon = getSupabaseAnonKey();
  const token = accessToken ?? anon;
  return {
    "Content-Type": "application/json",
    apikey: anon,
    Authorization: `Bearer ${token}`,
  };
}

/** Server-side forward to send-email (contact_form). */
export async function forwardContactFormToSendEmail(values: {
  email: string;
  fullName: string;
  phone?: string;
  subject: string;
  message: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(
      `${getSupabaseUrl()}/functions/v1/send-email`,
      {
        method: "POST",
        headers: sendEmailHeaders(),
        body: JSON.stringify({
          type: "contact_form",
          email: values.email,
          fullName: values.fullName,
          phone: values.phone,
          subject: values.subject,
          message: values.message,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("📧 Contact form email API error response:", errorText);
      return {
        success: false,
        message: `Failed to send email: ${response.statusText} - ${errorText}`,
      };
    }

    await response.json();
    return {
      success: true,
      message: "Contact form email sent successfully",
    };
  } catch (error) {
    console.error("❌ Error sending contact form email:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}
