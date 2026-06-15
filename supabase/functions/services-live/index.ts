// @ts-ignore - Deno runtime types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno runtime types
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// @ts-ignore - Deno global
const MAILERLITE_API_KEY = Deno.env.get("MAILERLITE_API_KEY");
// @ts-ignore - Deno global
const SERVICES_LIVE_FLOW_GROUP_ID = Deno.env.get("SERVICES_LIVE_FLOW_GROUP_ID") || "174765813178303657";
// @ts-ignore - Deno global
const BUSINESS_WELCOME_ID = Deno.env.get("BUSINESS_WELCOME_ID") || "174470751482545271";

interface WebhookPayload {
  type: string;
  table: string;
  record: {
    id?: string;
    user_id?: string;
    admin_approved?: boolean;
    status?: string;
    old_record?: {
      admin_approved?: boolean;
      status?: string;
    };
  };
}

serve(async (req: Request) => {
  try {
    const payload: WebhookPayload = await req.json();

    // Only handle UPDATE on business_listings when going live
    if (
      payload.table !== "business_listings" ||
      payload.type !== "UPDATE" ||
      payload.record?.admin_approved !== true ||
      payload.record?.status !== "approved"
    ) {
      return new Response(JSON.stringify({ message: "Skipped: Not a services listing going live event" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if it was already live
    const oldRecord = (payload as any).old_record || payload.record.old_record;
    const wasLiveBefore = oldRecord?.admin_approved === true && oldRecord?.status === "approved";
    
    if (wasLiveBefore) {
      return new Response(JSON.stringify({ message: "Skipped: Services listing was already live" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!MAILERLITE_API_KEY || !SERVICES_LIVE_FLOW_GROUP_ID) {
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

    const { data: userProfile, error: userError } = await supabase
      .from("user_profiles")
      .select("email, first_name, last_name")
      .eq("id", userId)
      .single();

    if (userError || !userProfile?.email) {
      console.error("❌ Error fetching user profile:", userError);
      return new Response(JSON.stringify({ error: "Failed to fetch user profile" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const email = userProfile.email;
    const name = `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim() || email;

    // Check if already in group
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

    // ALWAYS remove from group first (even if not in group) to ensure automation triggers every time
    // This ensures email is sent for EVERY listing that goes live, even for the same user
    if (subscriberId) {

      const removeResponse = await fetch(
        `https://connect.mailerlite.com/api/subscribers/${subscriberId}/groups/${SERVICES_LIVE_FLOW_GROUP_ID}`,
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

    // Add to groups
    // Use POST method (upsert) - MailerLite API doesn't support PUT on /api/subscribers
    const groupsToAdd = [SERVICES_LIVE_FLOW_GROUP_ID, BUSINESS_WELCOME_ID];
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
      message: "Services Live Flow triggered", 
      email: email,
      groupId: SERVICES_LIVE_FLOW_GROUP_ID 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Error processing services live webhook:", error);
    return new Response(JSON.stringify({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error) 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

