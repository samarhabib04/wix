// @ts-ignore - Deno runtime types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno runtime types
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersForRequest } from "../_shared/cors-headers.ts";

// @ts-ignore - Deno global
const MAILERLITE_API_KEY = Deno.env.get("MAILERLITE_API_KEY");
// @ts-ignore - Deno global
const SHOWCASE_WISHLIST_NOTIFICATION_GROUP_ID = Deno.env.get("SHOWCASE_WISHLIST_NOTIFICATION_GROUP_ID") || "178467872657376265";
/** Must match MailerLite custom field key for {$listing_url} — confirm via GET https://connect.mailerlite.com/api/fields */
const LISTING_URL_FIELD_KEY = Deno.env.get("MAILERLITE_LISTING_URL_FIELD_KEY") || "listing_url";

function saleListingPublicUrl(saleListingId: string): string {
  const base = (Deno.env.get("PUBLIC_SITE_URL") || "https://dogquest.ie").replace(/\/$/, "");
  return `${base}/listing/${saleListingId}`;
}

interface ConversionNotificationRequest {
  showcaseId: string;
  saleListingId: string;
  convertedBy: string;
}

serve(async (req: Request) => {
  const corsHeaders = corsHeadersForRequest(req, "POST, OPTIONS");
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { showcaseId, saleListingId, convertedBy }: ConversionNotificationRequest = await req.json();

    // Validate input
    if (!showcaseId || !saleListingId || !convertedBy) {
      return new Response(
        JSON.stringify({ error: "showcaseId, saleListingId, and convertedBy are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if MailerLite is configured
    if (!MAILERLITE_API_KEY || !SHOWCASE_WISHLIST_NOTIFICATION_GROUP_ID) {
      console.warn("⚠️ MailerLite API key or group ID not configured, skipping notifications");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "MailerLite not configured",
          skipped: true 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch all logged-in users who wishlisted this showcase
    const { data: wishlistUsers, error: wishlistError } = await supabase
      .from("user_wishlists")
      .select("user_id")
      .eq("item_id", showcaseId)
      .eq("item_type", "showcase");

    if (wishlistError) {
      console.error("❌ Error fetching wishlist users:", wishlistError);
    }

    // Fetch all non-logged-in email subscribers
    const { data: emailNotifications, error: emailNotificationsError } = await supabase
      .from("showcase_email_notifications")
      .select("email")
      .eq("showcase_id", showcaseId);

    if (emailNotificationsError) {
      console.error("❌ Error fetching email notifications:", emailNotificationsError);
    }

    // Collect all emails to notify
    const emailsToNotify: Array<{ email: string; name?: string }> = [];

    // Add logged-in wishlist users
    if (wishlistUsers && wishlistUsers.length > 0) {
      const uniqueUserIds = [...new Set(wishlistUsers.map((w: any) => w.user_id))];
      
      const { data: wishlistUserProfiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("id, email, first_name, last_name")
        .in("id", uniqueUserIds);

      if (profilesError) {
        console.error("❌ Error fetching wishlist user profiles:", profilesError);
      } else if (wishlistUserProfiles && wishlistUserProfiles.length > 0) {
        wishlistUserProfiles.forEach((userProfile: any) => {
          if (userProfile.email) {
            const name = `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim() || undefined;
            emailsToNotify.push({ email: userProfile.email, name });
          }
        });
      }
    }

    // Add non-logged-in email subscribers
    if (emailNotifications && emailNotifications.length > 0) {
      emailNotifications.forEach((notification: any) => {
        if (notification.email) {
          emailsToNotify.push({ email: notification.email });
        }
      });
    }

    if (emailsToNotify.length === 0) {

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No users to notify",
          notified: 0 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }


    const listingUrl = saleListingPublicUrl(saleListingId);

    // Send MailerLite notifications to all users
    const notificationPromises = emailsToNotify.map(async ({ email, name }) => {
      try {
        // Check if subscriber exists
        const checkResponse = await fetch(
          `https://connect.mailerlite.com/api/subscribers?email=${encodeURIComponent(email)}`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${MAILERLITE_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        let subscriberId: string | null = null;

        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          if (checkData.data && checkData.data.length > 0) {
            subscriberId = checkData.data[0].id;
          }
        }

        // Remove from group first to retrigger automation
        const fields: Record<string, string> = {
          [LISTING_URL_FIELD_KEY]: listingUrl,
          ...(name ? { name } : {}),
        };

        if (subscriberId) {
          const putRes = await fetch(
            `https://connect.mailerlite.com/api/subscribers/${subscriberId}`,
            {
              method: "PUT",
              headers: {
                "Authorization": `Bearer ${MAILERLITE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ fields }),
            },
          );
          if (!putRes.ok) {
            const errText = await putRes.text();
            console.warn(
              `MailerLite PUT listing_url for ${email}: ${putRes.status} ${errText.slice(0, 300)}`,
            );
          }
          await new Promise((resolve) => setTimeout(resolve, 600));
        }

        if (subscriberId) {
          await fetch(
            `https://connect.mailerlite.com/api/subscribers/${subscriberId}/groups/${SHOWCASE_WISHLIST_NOTIFICATION_GROUP_ID}`,
            {
              method: "DELETE",
              headers: {
                "Authorization": `Bearer ${MAILERLITE_API_KEY}`,
                "Content-Type": "application/json",
              },
            }
          );
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Add to wishlist notification group (this will trigger MailerLite automation)
        const subscriberResponse = await fetch(
          "https://connect.mailerlite.com/api/subscribers",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${MAILERLITE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: email.toLowerCase().trim(),
              fields,
              groups: [SHOWCASE_WISHLIST_NOTIFICATION_GROUP_ID],
            }),
          }
        );

        if (!subscriberResponse.ok) {
          const errorData = await subscriberResponse.json();
          console.error(`❌ Failed to add ${email} to MailerLite group:`, errorData);
          return { success: false, email, reason: "mailerlite_error" };
        }

        return { success: true, email };
      } catch (error) {
        console.error(`❌ Error processing notification for ${email}:`, error);
        return { success: false, email, reason: "exception" };
      }
    });

    const notificationResults = await Promise.all(notificationPromises);
    const successCount = notificationResults.filter((r: any) => r.success).length;
    const failureCount = notificationResults.filter((r: any) => !r.success).length;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notifications sent",
        notified: successCount,
        failed: failureCount,
        total: emailsToNotify.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ Error in showcase-conversion-notification:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to send notifications",
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
