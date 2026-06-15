// @ts-ignore - Deno runtime types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno runtime types
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// @ts-ignore - Deno global
const MAILERLITE_API_KEY = Deno.env.get("MAILERLITE_API_KEY");
// @ts-ignore - Deno global
const SELLER_LIVE_LISTING_GROUP_ID = Deno.env.get("SELLER_LIVE_LISTING_GROUP_ID") || "";

interface WebhookPayload {
  type: string;
  table: string;
  record: {
    id?: string;
    user_id?: string;
    admin_approved?: boolean;
    is_published?: boolean;
    old_record?: {
      admin_approved?: boolean;
      is_published?: boolean;
    };
  };
}

serve(async (req: Request) => {
  try {
    // Log that function was called

    const payload: WebhookPayload = await req.json();
    
    // Only handle UPDATE on stud_listings when going live
    // Check for truthy values (handles boolean true)
    const adminApproved = payload.record?.admin_approved;
    const isPublished = payload.record?.is_published;
    const isAdminApproved = !!adminApproved; // Convert to boolean
    const isPublishedValue = !!isPublished; // Convert to boolean
    
    if (
      payload.table !== "stud_listings" ||
      payload.type !== "UPDATE" ||
      !isAdminApproved ||
      !isPublishedValue
    ) {

      return new Response(JSON.stringify({ message: "Skipped: Not a stud listing going live event" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if it was already live
    // Supabase webhooks send old_record at the top level, not inside record
    const oldRecord = (payload as any).old_record;
    const oldAdminApproved = !!oldRecord?.admin_approved;
    const oldIsPublished = !!oldRecord?.is_published;
    const wasLiveBefore = oldAdminApproved && oldIsPublished;

    if (wasLiveBefore) {

      return new Response(JSON.stringify({ message: "Skipped: Stud listing was already live" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!MAILERLITE_API_KEY || !SELLER_LIVE_LISTING_GROUP_ID) {
      console.error("❌ Missing configuration:", {
        hasMailerLiteKey: !!MAILERLITE_API_KEY,
        hasGroupId: !!SELLER_LIVE_LISTING_GROUP_ID,
        groupId: SELLER_LIVE_LISTING_GROUP_ID,
      });
      return new Response(JSON.stringify({ error: "Missing configuration" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userId = payload.record.user_id;
    if (!userId) {

      return new Response(JSON.stringify({ message: "Skipped: No user_id in record" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client
    // @ts-ignore - Deno global
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    // @ts-ignore - Deno global
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: sellerProfile, error: sellerError } = await supabase
      .from("user_profiles")
      .select("email, first_name, last_name")
      .eq("id", userId)
      .single();

    if (sellerError || !sellerProfile?.email) {
      console.error("❌ Error fetching seller profile:", sellerError, { userId, sellerProfile });
      return new Response(JSON.stringify({ error: "Failed to fetch seller profile", details: sellerError }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const email = sellerProfile.email;
    const name = `${sellerProfile.first_name || ""} ${sellerProfile.last_name || ""}`.trim() || email;

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

    // ALWAYS remove from group first to ensure automation triggers every time
    // This ensures email is sent for EVERY listing that goes live, even for the same user
    if (subscriberId) {

      const removeResponse = await fetch(
        `https://connect.mailerlite.com/api/subscribers/${subscriberId}/groups/${SELLER_LIVE_LISTING_GROUP_ID}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${MAILERLITE_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      if (removeResponse.ok || removeResponse.status === 404) {
        // 404 is okay - means they weren't in the group
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        console.warn(`⚠️ Failed to remove from group, continuing anyway...`);
      }
    }

    // Add to group
    // Use POST method (upsert) - MailerLite API doesn't support PUT on /api/subscribers
    const groupsToAdd = [SELLER_LIVE_LISTING_GROUP_ID];
    const subscriberResponse = await fetch(
      "https://connect.mailerlite.com/api/subscribers",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${MAILERLITE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          fields: { name: name },
          groups: groupsToAdd,
        }),
      }
    );

    const subscriberData = await subscriberResponse.json();

    if (!subscriberResponse.ok) {
      console.error("❌ MailerLite API error:", subscriberData);
      return new Response(JSON.stringify({ error: "Failed to add subscriber", details: subscriberData }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      message: "Stud Live Flow triggered", 
      email: email,
      groupId: SELLER_LIVE_LISTING_GROUP_ID 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Error processing stud live webhook:", error);
    return new Response(JSON.stringify({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error) 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

