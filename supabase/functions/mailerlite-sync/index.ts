// @ts-ignore - Deno runtime types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// @ts-ignore - Deno global
const MAILERLITE_API_KEY = Deno.env.get("MAILERLITE_API_KEY");
// @ts-ignore - Deno global
const SELLER_GROUP_ID = Deno.env.get("SELLER_GROUP_ID");
// @ts-ignore - Deno global
const BUYER_WELCOME_ID = Deno.env.get("BUYER_WELCOME_ID");
// @ts-ignore - Deno global
const BUSINESS_WELCOME_ID = Deno.env.get("BUSINESS_WELCOME_ID");

// Map roles to their corresponding MailerLite group IDs
const ROLE_GROUP_MAP: Record<string, string> = {
  buyer: BUYER_WELCOME_ID,
  business: BUSINESS_WELCOME_ID,
  seller: SELLER_GROUP_ID,
};

interface WebhookPayload {
  type: string;
  table: string;
  record: {
    id?: string;
    email?: string;
    role?: string;
    full_name?: string;
    name?: string;
  };
}

serve(async (req: Request) => {
  try {
    // Parse the webhook payload
    const payload: WebhookPayload = await req.json();

    // -----------------------------------------------------------
    // Handle INSERT events for buyer, business, and seller roles
    // -----------------------------------------------------------
    const userRole = payload.record?.role;
    const supportedRoles = ["buyer", "business", "seller"];
    
    if (
      payload.table === "user_profiles" && 
      payload.type === "INSERT" &&
      userRole &&
      supportedRoles.includes(userRole)
    ) {
      const email = payload.record.email;
      const fullName = payload.record.full_name || payload.record.name || "";

      if (!email) {
        console.warn(`⚠️ ${userRole} record missing email, skipping MailerLite sync`);
        return new Response(
          JSON.stringify({ message: "Skipped: No email in record" }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (!MAILERLITE_API_KEY) {
        console.error("❌ MAILERLITE_API_KEY is not configured");
        return new Response(
          JSON.stringify({ error: "MailerLite API key not configured" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const groupId = ROLE_GROUP_MAP[userRole];
      
      if (!groupId) {
        console.error(`❌ No group ID configured for role: ${userRole}`);
        return new Response(
          JSON.stringify({ error: `No MailerLite group ID configured for role: ${userRole}` }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }


      // Call MailerLite API to add subscriber to the appropriate group
      try {
        const mailerliteResponse = await fetch(
          "https://connect.mailerlite.com/api/subscribers",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${MAILERLITE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: email,
              fields: {
                name: fullName,
              },
              groups: [groupId],
            }),
          }
        );

        const mailerliteData = await mailerliteResponse.json();

        if (!mailerliteResponse.ok) {
          console.error("❌ MailerLite API error:", mailerliteData);
          return new Response(
            JSON.stringify({
              error: "Failed to add subscriber to MailerLite",
              details: mailerliteData,
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        return new Response(
          JSON.stringify({
            message: `Successfully added ${userRole} to MailerLite group`,
            email,
            role: userRole,
            groupId: groupId,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      } catch (fetchError) {
        console.error("❌ Error calling MailerLite API:", fetchError);
        const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
        return new Response(
          JSON.stringify({
            error: "Failed to call MailerLite API",
            details: errorMessage,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    } else {
      // Not a supported role INSERT, skip silently to prevent webhook retries

      return new Response(
        JSON.stringify({ message: "Skipped: Not a supported role INSERT event" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("❌ Error processing webhook:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});