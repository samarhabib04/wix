import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Call `send-email` over HTTP with the service role. Edge-to-edge
 * `supabase.functions.invoke()` is unreliable; this matches a working `curl` and
 * ensures Resend actually receives the request when `RESEND_*` is set on `send-email`.
 */
async function sendShowcaseLiveEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return {
      ok: false,
      error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for send-email",
    };
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to, subject, html }),
  });

  const text = await res.text();
  let parsed: { error?: string; ok?: boolean } = {};
  try {
    parsed = JSON.parse(text) as { error?: string; ok?: boolean };
  } catch {
    /* body may be plain text */
  }

  if (!res.ok) {
    return {
      ok: false,
      error: parsed.error || `send-email HTTP ${res.status}: ${text.slice(0, 400)}`,
    };
  }
  if (parsed.error) {
    return { ok: false, error: parsed.error };
  }
  return { ok: true };
}

async function sendShowcaseLiveEmailViaMailerLite(
  to: string,
  listingUrl: string,
  name?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = Deno.env.get("MAILERLITE_API_KEY");
  const groupId = Deno.env.get("SHOWCASE_WISHLIST_NOTIFICATION_GROUP_ID");
  /** Must match MailerLite Fields “key” for your custom field (see GET /api/fields). Default matches tag {$listing_url}. */
  const listingFieldKey = Deno.env.get("MAILERLITE_LISTING_URL_FIELD_KEY") || "listing_url";
  if (!apiKey || !groupId) {
    return { ok: false, error: "MailerLite env missing" };
  }

  const fieldsPayload: Record<string, string> = {
    [listingFieldKey]: listingUrl,
    ...(name ? { name } : {}),
  };

  let subscriberId: string | null = null;
  const checkResponse = await fetch(
    `https://connect.mailerlite.com/api/subscribers?email=${encodeURIComponent(to)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    },
  );
  if (checkResponse.ok) {
    const checkData = await checkResponse.json();
    if (checkData.data && checkData.data.length > 0) {
      subscriberId = checkData.data[0].id;
    }
  }

  // Set fields before re-join so automation merge tags resolve (avoids race with “subscriber joined group”).
  if (subscriberId) {
    const putRes = await fetch(
      `https://connect.mailerlite.com/api/subscribers/${subscriberId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields: fieldsPayload }),
      },
    );
    if (!putRes.ok) {
      const errText = await putRes.text();
      console.warn(
        `MailerLite PUT subscriber fields before wishlist retrigger: ${putRes.status} ${errText.slice(0, 400)}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  // Retrigger automation by remove -> add.
  if (subscriberId) {
    await fetch(
      `https://connect.mailerlite.com/api/subscribers/${subscriberId}/groups/${groupId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  const postBody = (extra: Record<string, unknown> = {}) =>
    JSON.stringify({
      email: to,
      fields: fieldsPayload,
      groups: [groupId],
      ...extra,
    });

  let upsertResponse = await fetch("https://connect.mailerlite.com/api/subscribers", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: postBody(),
  });

  let detailsText = await upsertResponse.text();
  if (
    !upsertResponse.ok &&
    /cannot be imported|not active|reactivat/i.test(detailsText)
  ) {
    upsertResponse = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: postBody({ resubscribe: true }),
    });
    detailsText = await upsertResponse.text();
  }

  if (!upsertResponse.ok) {
    return { ok: false, error: `MailerLite ${upsertResponse.status}: ${detailsText.slice(0, 500)}` };
  }

  // Re-PUT fields right after upsert so automations that snapshot on “joined group” see listing_url.
  try {
    const parsed = JSON.parse(detailsText) as { data?: { id?: string } };
    const newId = parsed?.data?.id;
    if (newId) {
      await fetch(`https://connect.mailerlite.com/api/subscribers/${newId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields: fieldsPayload }),
      });
    }
  } catch {
    /* non-JSON body — ignore */
  }

  return { ok: true };
}

function siteUrl(): string {
  return (Deno.env.get("PUBLIC_SITE_URL") || "https://dogquest.ie").replace(
    /\/$/,
    "",
  );
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type LiveSaleListing = {
  id: string;
  title: string;
  seller_id: string;
  converted_from_showcase_id: string | null;
};

/**
 * Notify users who wishlisted / subscribed to a showcase once the converted sale
 * listing actually goes live (approved + published).
 */
export async function notifyShowcaseWatchersForLiveSale(
  supabase: SupabaseClient,
  listing: LiveSaleListing,
): Promise<{
  dashboardNotifications: number;
  emailNotifications: number;
  errors: string[];
}> {
  const errors: string[] = [];
  const showcaseId = listing.converted_from_showcase_id;
  if (!showcaseId) {
    return { dashboardNotifications: 0, emailNotifications: 0, errors };
  }

  // 1) Logged-in users who wishlisted this showcase
  const { data: wishRows, error: wishErr } = await supabase
    .from("user_wishlists")
    .select("user_id")
    .eq("item_type", "showcase")
    .eq("item_id", showcaseId);

  if (wishErr) {
    errors.push(`user_wishlists: ${wishErr.message}`);
  }

  const wishlistUserIds = [
    ...new Set((wishRows ?? []).map((r: any) => String(r.user_id || ""))),
  ].filter((id) => id && id !== listing.seller_id);

  // Dashboard notifications for logged-in wishlist users
  let dashboardNotifications = 0;
  if (wishlistUserIds.length > 0) {
    const notificationRows = wishlistUserIds.map((userId) => ({
      user_id: userId,
      title: "A showcase you liked is now live",
      message:
        `"${listing.title}" is now live as a sale listing on Dog Quest.`,
      type: "showcase_listing_live",
      listing_id: listing.id,
      listing_type: "sale",
      read: false,
    }));

    const { error: notifErr } = await supabase
      .from("notifications")
      .insert(notificationRows);

    if (notifErr) {
      errors.push(`notifications: ${notifErr.message}`);
    } else {
      dashboardNotifications = notificationRows.length;
    }
  }

  // 2) Build email recipient list from:
  //    - logged-in wishlist users (subject to email preference)
  //    - non-logged-in showcase_email_notifications subscribers
  const recipients = new Map<string, { name?: string }>();

  if (wishlistUserIds.length > 0) {
    const { data: profiles, error: profileErr } = await supabase
      .from("user_profiles")
      .select("id, email, first_name")
      .in("id", wishlistUserIds);

    if (profileErr) {
      errors.push(`user_profiles: ${profileErr.message}`);
    }

    const { data: prefs, error: prefErr } = await supabase
      .from("user_preferences")
      .select("user_id, email_notifications_enabled")
      .in("user_id", wishlistUserIds);

    if (prefErr) {
      errors.push(`user_preferences: ${prefErr.message}`);
    }

    const prefMap = new Map<string, boolean>();
    for (const p of prefs ?? []) {
      const uid = String((p as any).user_id);
      const raw = (p as any).email_notifications_enabled;
      // null / undefined = not set → default allow (do not store → .has() stays false)
      if (raw === null || raw === undefined) continue;
      prefMap.set(uid, !!raw);
    }

    for (const p of profiles ?? []) {
      const userId = String((p as any).id || "");
      const email = String((p as any).email || "").trim().toLowerCase();
      if (!email) continue;
      // Explicit false disables; missing row or unset column defaults to allowed.
      const enabled = prefMap.has(userId) ? prefMap.get(userId) === true : true;
      if (enabled) {
        recipients.set(email, {
          name: String((p as any).first_name || "").trim() || undefined,
        });
      }
    }
  }

  const { data: emailSubs, error: emailSubsErr } = await (supabase as any)
    .from("showcase_email_notifications")
    .select("email")
    .eq("showcase_id", showcaseId);

  if (emailSubsErr) {
    errors.push(`showcase_email_notifications: ${emailSubsErr.message}`);
  } else {
    for (const row of emailSubs ?? []) {
      const email = String((row as any).email || "").trim().toLowerCase();
      if (email && !recipients.has(email)) recipients.set(email, {});
    }
  }

  const listingUrl = `${siteUrl()}/listing/${listing.id}`;
  let emailNotifications = 0;
  const useMailerLite =
    Boolean(Deno.env.get("MAILERLITE_API_KEY")) &&
    Boolean(Deno.env.get("SHOWCASE_WISHLIST_NOTIFICATION_GROUP_ID"));
  console.log(
    JSON.stringify({
      notify_showcase_live: true,
      showcaseId,
      sale_listing_id: listing.id,
      listingUrl,
      recipientCount: recipients.size,
      useMailerLite,
    }),
  );
  for (const [to, recipientMeta] of recipients.entries()) {
    const html = `<p>Hi,</p>
<p>A showcase you followed is now live as a sale listing: <strong>${escapeHtml(listing.title)}</strong>.</p>
<p><a href="${escapeHtml(listingUrl)}" style="color:#2d5a27;font-weight:bold;">View listing</a></p>`;

    const sent = useMailerLite
      ? await sendShowcaseLiveEmailViaMailerLite(to, listingUrl, recipientMeta.name)
      : await sendShowcaseLiveEmail(
        to,
        `A showcase is now live — ${listing.title}`,
        html,
      );
    if (!sent.ok) {
      errors.push(`email ${to}: ${sent.error}`);
      continue;
    }
    emailNotifications++;
  }

  return { dashboardNotifications, emailNotifications, errors };
}
