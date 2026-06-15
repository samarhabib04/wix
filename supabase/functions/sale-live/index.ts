// @ts-ignore - Deno runtime types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno runtime types
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notifyPreferredBreedBuyersForSaleListing } from "../_shared/notify-preferred-breed-buyers.ts";
import { notifyShowcaseWatchersForLiveSale } from "../_shared/notify-showcase-watchers.ts";

// @ts-ignore - Deno global
const MAILERLITE_API_KEY = Deno.env.get("MAILERLITE_API_KEY");
// @ts-ignore - Deno global
const SELLER_LIVE_LISTING_GROUP_ID = Deno.env.get("SELLER_LIVE_LISTING_GROUP_ID") || "";

interface WebhookPayload {
  type: string;
  table: string;
  record: {
    id?: string;
    seller_id?: string;
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
    const payload: WebhookPayload = await req.json();

    // sale_listings going live: INSERT (already approved+published) OR UPDATE (transition to live)
    const adminApproved = payload.record?.admin_approved;
    const isPublished = payload.record?.is_published;
    const isAdminApproved = !!adminApproved;
    const isPublishedValue = !!isPublished;

    const eventType = payload.type;
    const isInsert = eventType === "INSERT";
    const isUpdate = eventType === "UPDATE";

    if (
      payload.table !== "sale_listings" ||
      (!isInsert && !isUpdate) ||
      !isAdminApproved ||
      !isPublishedValue
    ) {
      return new Response(
        JSON.stringify({
          message: "Skipped: Not a sale listing going live event",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // INSERT: first row is already live → run. UPDATE: skip if already was live (no duplicate alerts)
    if (isUpdate) {
      const oldRecord = (payload as any).old_record || payload.record.old_record;
      const oldAdminApproved = !!oldRecord?.admin_approved;
      const oldIsPublished = !!oldRecord?.is_published;
      const wasLiveBefore = oldAdminApproved && oldIsPublished;

      if (wasLiveBefore) {
        return new Response(
          JSON.stringify({
            message: "Skipped: Sale listing was already live",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    }

    // @ts-ignore - Deno global
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    // @ts-ignore - Deno global
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase configuration" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const listingId = payload.record?.id;

    let breedBuyersNotified = 0;
    const breedNotifyErrors: string[] = [];
    let showcaseDashboardNotified = 0;
    let showcaseEmailNotified = 0;
    const showcaseNotifyErrors: string[] = [];
    if (listingId) {
      try {
        const br = await notifyPreferredBreedBuyersForSaleListing(supabase, listingId);
        breedBuyersNotified = br.notified;
        breedNotifyErrors.push(...br.errors);
        if (br.errors.length) {
          console.warn("sale-live breed alerts:", br.errors.join("; "));
        }
      } catch (e) {
        console.error("sale-live breed alerts exception:", e);
        breedNotifyErrors.push(e instanceof Error ? e.message : String(e));
      }

      try {
        const { data: listingRow, error: listingError } = await supabase
          .from("sale_listings")
          .select("id, title, seller_id, converted_from_showcase_id")
          .eq("id", listingId)
          .maybeSingle();

        if (listingError) {
          showcaseNotifyErrors.push(`listing fetch: ${listingError.message}`);
        } else if (listingRow?.converted_from_showcase_id) {
          const sh = await notifyShowcaseWatchersForLiveSale(supabase, {
            id: listingRow.id,
            title: listingRow.title,
            seller_id: listingRow.seller_id,
            converted_from_showcase_id: listingRow.converted_from_showcase_id,
          });
          showcaseDashboardNotified = sh.dashboardNotifications;
          showcaseEmailNotified = sh.emailNotifications;
          showcaseNotifyErrors.push(...sh.errors);
          if (sh.errors.length) {
            console.warn("sale-live showcase alerts:", sh.errors.join("; "));
          }
        }
        console.log(
          JSON.stringify({
            sale_live_showcase_block: true,
            listingId,
            converted_from_showcase: Boolean(listingRow?.converted_from_showcase_id),
            showcaseDashboardNotified,
            showcaseEmailNotified,
            showcaseNotifyErrors,
          }),
        );
      } catch (e) {
        console.error("sale-live showcase alerts exception:", e);
        showcaseNotifyErrors.push(e instanceof Error ? e.message : String(e));
      }
    }

    const sellerId = payload.record.seller_id;
    if (!sellerId) {
      return new Response(
        JSON.stringify({
          message: "Skipped MailerLite: No seller_id in record",
          breedBuyersNotified,
          breedNotifyErrors,
          showcaseDashboardNotified,
          showcaseEmailNotified,
          showcaseNotifyErrors,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (!MAILERLITE_API_KEY || !SELLER_LIVE_LISTING_GROUP_ID) {
      return new Response(
        JSON.stringify({
          message: "MailerLite not configured; breed buyer alerts attempted",
          breedBuyersNotified,
          breedNotifyErrors,
          showcaseDashboardNotified,
          showcaseEmailNotified,
          showcaseNotifyErrors,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const { data: sellerProfile, error: sellerError } = await supabase
      .from("user_profiles")
      .select("email, first_name, last_name")
      .eq("id", sellerId)
      .single();

    if (sellerError || !sellerProfile?.email) {
      console.error("❌ Error fetching seller profile (buyer alerts already ran):", sellerError);
      return new Response(
        JSON.stringify({
          message: "Sale live: buyer/showcase alerts OK; MailerLite skipped — no seller email",
          breedBuyersNotified,
          breedNotifyErrors,
          showcaseDashboardNotified,
          showcaseEmailNotified,
          showcaseNotifyErrors,
          mailerLiteSkipped: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
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

    // Add to group (seller “listing live” automation). Use POST upsert.
    const groupsToAdd = [SELLER_LIVE_LISTING_GROUP_ID];
    const postSeller = (extra: Record<string, unknown> = {}) =>
      fetch("https://connect.mailerlite.com/api/subscribers", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${MAILERLITE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          fields: { name: name },
          groups: groupsToAdd,
          ...extra,
        }),
      });

    let subscriberResponse = await postSeller();

    // Non-active / unsubscribed sellers: MailerLite may reject POST unless resubscribe is true.
    let subscriberData = await subscriberResponse.json();
    const errBlob = String(JSON.stringify(subscriberData));
    const mailerLiteImportBlocked =
      !subscriberResponse.ok &&
      /cannot be imported|not active|reactivat/i.test(errBlob);
    if (mailerLiteImportBlocked) {
      console.warn("MailerLite seller upsert blocked; retrying with resubscribe: true", {
        email,
      });
      subscriberResponse = await postSeller({ resubscribe: true });
      subscriberData = await subscriberResponse.json();
    }

    if (!subscriberResponse.ok) {
      console.error("❌ MailerLite API error (buyer emails already sent):", subscriberData);
      return new Response(
        JSON.stringify({
          message: "Sale live: buyer/showcase alerts OK; MailerLite seller sync failed",
          email: email,
          groupId: SELLER_LIVE_LISTING_GROUP_ID,
          breedBuyersNotified,
          breedNotifyErrors,
          showcaseDashboardNotified,
          showcaseEmailNotified,
          showcaseNotifyErrors,
          mailerLiteError: subscriberData,
          webhookEvent: eventType,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        message: "Sale Live Flow triggered",
        email: email,
        groupId: SELLER_LIVE_LISTING_GROUP_ID,
        breedBuyersNotified,
        breedNotifyErrors,
        showcaseDashboardNotified,
        showcaseEmailNotified,
        showcaseNotifyErrors,
        webhookEvent: eventType,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("❌ Error processing sale live webhook:", error);
    return new Response(JSON.stringify({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error) 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

