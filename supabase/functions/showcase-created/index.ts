// @ts-ignore - Deno runtime types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno runtime types
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// @ts-ignore - Deno global
const MAILERLITE_API_KEY = Deno.env.get("MAILERLITE_API_KEY");
// @ts-ignore - Deno global
const SHOWCASE_CREATED_GROUP_ID = Deno.env.get("SHOWCASE_CREATED_GROUP_ID") || "174765332888553048";
// @ts-ignore - Deno global
const SHOWCASE_LIVE_GROUP_ID = Deno.env.get("SHOWCASE_LIVE_GROUP_ID") || "174764127708775590";
// @ts-ignore - Deno global
const SELLER_GROUP_ID = Deno.env.get("SELLER_GROUP_ID") || "174470710173894341";
// @ts-ignore - Deno global
const SHOWCASE_WISHLIST_NOTIFICATION_GROUP_ID = Deno.env.get("SHOWCASE_WISHLIST_NOTIFICATION_GROUP_ID") || "174764127708775590";

interface WebhookPayload {
  type: string;
  table: string;
  record: {
    id?: string;
    user_id?: string;
    seller_id?: string;
    admin_approved?: boolean;
    is_published?: boolean;
    is_expired?: boolean;
    old_record?: {
      admin_approved?: boolean;
      is_published?: boolean;
      is_expired?: boolean;
    };
  };
}

serve(async (req: Request) => {
  try {
    const payload: WebhookPayload = await req.json();

    // Only handle showcase_listings table
    if (payload.table !== "showcase_listings") {
      return new Response(JSON.stringify({ message: "Skipped: Not a showcase_listings event" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!MAILERLITE_API_KEY) {
      return new Response(JSON.stringify({ error: "MAILERLITE_API_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userId = payload.record.user_id || payload.record.seller_id;
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

    // ============================================================
    // FLOW 1: Showcase Created (INSERT event)
    // ============================================================
    if (payload.type === "INSERT") {
      if (!SHOWCASE_CREATED_GROUP_ID) {
        return new Response(JSON.stringify({ message: "Skipped: SHOWCASE_CREATED_GROUP_ID not configured" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

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

      // ALWAYS remove from group first (even if not in group) to ensure automation triggers every time
      // This ensures email is sent for EVERY showcase created, even for the same user
      if (subscriberId) {

        const removeResponse = await fetch(
          `https://connect.mailerlite.com/api/subscribers/${subscriberId}/groups/${SHOWCASE_CREATED_GROUP_ID}`,
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

      // Add to MailerLite groups
      const groupsToAdd = [SHOWCASE_CREATED_GROUP_ID, SELLER_GROUP_ID];
      
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
        message: "Showcase Created Flow triggered", 
        email: email,
        groupId: SHOWCASE_CREATED_GROUP_ID 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // FLOW 2: Showcase Expired (UPDATE event when expiring)
    // ============================================================
    if (payload.type === "UPDATE") {
      const oldRecord = (payload as any).old_record || payload.record.old_record;
      const isExpiring = 
        payload.record?.is_expired === true ||
        (oldRecord?.is_published === true && payload.record?.is_published === false);

      // Check if showcase is expiring
      if (isExpiring) {
        const listingId = payload.record.id;
        if (listingId && SHOWCASE_WISHLIST_NOTIFICATION_GROUP_ID) {

          // Fetch all users who wishlisted this showcase
          const { data: wishlistUsers, error: wishlistError } = await supabase
            .from("user_wishlists")
            .select("user_id")
            .eq("item_id", listingId)
            .eq("item_type", "showcase");

          if (wishlistError) {
            console.error("❌ Error fetching wishlist users:", wishlistError);
          } else if (wishlistUsers && wishlistUsers.length > 0) {

            // Get unique user IDs
            const uniqueUserIds = [...new Set(wishlistUsers.map((w: any) => w.user_id))];
            
            // Fetch user profiles for wishlist users
            const { data: wishlistUserProfiles, error: profilesError } = await supabase
              .from("user_profiles")
              .select("id, email, first_name, last_name")
              .in("id", uniqueUserIds);

            if (profilesError) {
              console.error("❌ Error fetching wishlist user profiles:", profilesError);
            } else if (wishlistUserProfiles && wishlistUserProfiles.length > 0) {

              // Send MailerLite emails to each wishlist user
              const notificationPromises = wishlistUserProfiles.map(async (userProfile: any) => {
                if (!userProfile.email) {
                  console.warn(`⚠️ Skipping user ${userProfile.id} - no email`);
                  return { success: false, email: null, reason: "no_email" };
                }

                const wishlistUserEmail = userProfile.email;
                const wishlistUserName = `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim() || wishlistUserEmail;

                try {
                  // Check if subscriber exists
                  const checkWishlistResponse = await fetch(
                    `https://connect.mailerlite.com/api/subscribers?email=${encodeURIComponent(wishlistUserEmail)}`,
                    {
                      method: "GET",
                      headers: {
                        "Authorization": `Bearer ${MAILERLITE_API_KEY}`,
                        "Content-Type": "application/json",
                      },
                    }
                  );

                  let wishlistSubscriberId: string | null = null;

                  if (checkWishlistResponse.ok) {
                    const checkWishlistData = await checkWishlistResponse.json();
                    if (checkWishlistData.data && checkWishlistData.data.length > 0) {
                      wishlistSubscriberId = checkWishlistData.data[0].id;
                    }
                  }

                  // Remove from group first to retrigger automation
                  if (wishlistSubscriberId) {
                    await fetch(
                      `https://connect.mailerlite.com/api/subscribers/${wishlistSubscriberId}/groups/${SHOWCASE_WISHLIST_NOTIFICATION_GROUP_ID}`,
                      {
                        method: "DELETE",
                        headers: {
                          "Authorization": `Bearer ${MAILERLITE_API_KEY}`,
                          "Content-Type": "application/json",
                        },
                      }
                    );
                    await new Promise(resolve => setTimeout(resolve, 300));
                  }

                  // Add to wishlist notification group (this will trigger expiration email flow)
                  const wishlistSubscriberResponse = await fetch(
                    "https://connect.mailerlite.com/api/subscribers",
                    {
                      method: "POST",
                      headers: {
                        "Authorization": `Bearer ${MAILERLITE_API_KEY}`,
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        email: wishlistUserEmail,
                        fields: { name: wishlistUserName },
                        groups: [SHOWCASE_WISHLIST_NOTIFICATION_GROUP_ID],
                      }),
                    }
                  );

                  if (!wishlistSubscriberResponse.ok) {
                    const errorData = await wishlistSubscriberResponse.json();
                    console.error(`❌ Failed to add ${wishlistUserEmail} to wishlist group:`, errorData);
                    return { success: false, email: wishlistUserEmail, reason: "mailerlite_error" };
                  }

                  return { success: true, email: wishlistUserEmail };
                } catch (error) {
                  console.error(`❌ Error processing wishlist expiration notification for ${wishlistUserEmail}:`, error);
                  return { success: false, email: wishlistUserEmail, reason: "exception" };
                }
              });

              const notificationResults = await Promise.all(notificationPromises);
              const successCount = notificationResults.filter((r: any) => r.success).length;
              const failureCount = notificationResults.filter((r: any) => !r.success).length;

            }
          } else {

          }
        }

        return new Response(JSON.stringify({ 
          message: "Showcase Expired Flow triggered - Wishlist users notified", 
          listingId: payload.record.id
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // ============================================================
      // FLOW 3: Showcase Live (UPDATE event when going live)
      // ============================================================
      // Only trigger when going live
      if (
        payload.record?.admin_approved !== true ||
        payload.record?.is_published !== true
      ) {
        return new Response(JSON.stringify({ message: "Skipped: Showcase not going live or expiring" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Check if it was already live
      const wasLiveBefore = oldRecord?.admin_approved === true && oldRecord?.is_published === true;
      
      if (wasLiveBefore) {
        return new Response(JSON.stringify({ message: "Skipped: Showcase was already live" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!SHOWCASE_LIVE_GROUP_ID) {
        return new Response(JSON.stringify({ message: "Skipped: SHOWCASE_LIVE_GROUP_ID not configured" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

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
      let isInGroup = false;

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.data && checkData.data.length > 0) {
          subscriberId = checkData.data[0].id;
          const groups = checkData.data[0].groups || [];
          isInGroup = groups.some((group: any) => group.id === SHOWCASE_LIVE_GROUP_ID);
        }
      }

      // ALWAYS remove from group first (even if not in group) to ensure automation triggers every time
      // This ensures email is sent for EVERY listing that goes live, even for the same user
      if (subscriberId) {

        const removeResponse = await fetch(
          `https://connect.mailerlite.com/api/subscribers/${subscriberId}/groups/${SHOWCASE_LIVE_GROUP_ID}`,
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
      const groupsToAdd = [SHOWCASE_LIVE_GROUP_ID, SELLER_GROUP_ID];
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
        message: "Showcase Live Flow triggered", 
        email: email,
        groupId: SHOWCASE_LIVE_GROUP_ID 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Not a supported event type
    return new Response(JSON.stringify({ message: "Skipped: Not INSERT or UPDATE event" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Error processing showcase webhook:", error);
    return new Response(JSON.stringify({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error) 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
