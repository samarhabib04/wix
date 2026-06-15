// @ts-ignore - Deno runtime types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno runtime types
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type V1ExpiryRow = {
  listing_id: string;
  seller_id: string;
  listing_title: string;
  listing_type: string;
  action: string;
  v1_expires_at: string | null;
};

function siteUrl(): string {
  return (Deno.env.get("PUBLIC_SITE_URL") || "https://dogquest.ie").replace(/\/$/, "");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso: string | null): string {
  if (!iso) return "soon";
  try {
    return new Date(iso).toLocaleDateString("en-IE", { dateStyle: "medium" });
  } catch {
    return iso;
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) return false;

  const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to, subject, html }),
  });
  if (!res.ok) {
    console.error("send-email failed:", await res.text());
    return false;
  }
  return true;
}

async function triggerMailerLiteV1Flow(email: string, name: string): Promise<void> {
  const apiKey = Deno.env.get("MAILERLITE_API_KEY");
  const groupId = Deno.env.get("V1_GREEN_TICK_EXPIRY_GROUP_ID") || "";
  if (!apiKey || !groupId) return;

  try {
    const check = await fetch(
      `https://connect.mailerlite.com/api/subscribers?email=${encodeURIComponent(email)}`,
      {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      },
    );
    let subscriberId: string | null = null;
    if (check.ok) {
      const data = await check.json();
      subscriberId = data?.data?.[0]?.id ?? null;
    }

    if (subscriberId) {
      await fetch(
        `https://connect.mailerlite.com/api/subscribers/${subscriberId}/groups/${groupId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        },
      );
      await new Promise((r) => setTimeout(r, 400));
    }

    await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        fields: { name },
        groups: [groupId],
      }),
    });
  } catch (e) {
    console.warn("MailerLite V1 expiry flow skipped:", e);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase configuration" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const base = siteUrl();
    const dashboardUrl = `${base}/my-seller-dashboard/listings`;

    const { data: rows, error: rpcError } = await supabase.rpc("process_all_v1_code_expiry");
    if (rpcError) {
      return new Response(JSON.stringify({ error: rpcError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const actions = (rows ?? []) as V1ExpiryRow[];
    let emailsSent = 0;
    let emailsSkipped = 0;
    let mailerLiteTriggered = 0;
    const errors: string[] = [];

    for (const row of actions) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("email, first_name, notify_email_listing_expiry")
        .eq("id", row.seller_id)
        .maybeSingle();

      if (!profile?.email) {
        emailsSkipped++;
        continue;
      }

      const name = escapeHtml(profile.first_name || "there");
      const title = escapeHtml(row.listing_title || "Your listing");
      const expiryLabel = formatDate(row.v1_expires_at);

      let subject = "V1 vaccination — Dog Quest";
      let body = "";

      if (row.action === "expired") {
        subject = "Green tick removed — add V2 vaccination — Dog Quest";
        body = `<p>Hi ${name},</p>
<p>The green tick on <strong>${title}</strong> was removed because a <strong>V2 vaccination code</strong> was not added within 28 days of V1.</p>
<p>Add V2 to your listing and contact us if you need the badge restored after review.</p>
<p><a href="${escapeHtml(dashboardUrl)}" style="color:#2d5a27;font-weight:bold;">Manage listings</a></p>
<p>Kind regards,<br/>Dog Quest</p>`;
        await triggerMailerLiteV1Flow(profile.email, profile.first_name || profile.email);
        mailerLiteTriggered++;
      } else if (row.action === "reminder_7d") {
        subject = "V1 green tick expires in 7 days — Dog Quest";
        body = `<p>Hi ${name},</p>
<p>Your listing <strong>${title}</strong> has V1 only. The green tick expires on <strong>${escapeHtml(expiryLabel)}</strong> unless you add a V2 code.</p>
<p><a href="${escapeHtml(dashboardUrl)}" style="color:#2d5a27;font-weight:bold;">Update listing</a></p>
<p>Kind regards,<br/>Dog Quest</p>`;
      } else if (row.action === "reminder_1d") {
        subject = "V1 green tick expires tomorrow — Dog Quest";
        body = `<p>Hi ${name},</p>
<p>Your listing <strong>${title}</strong> loses its green tick tomorrow (${escapeHtml(expiryLabel)}) unless V2 is added.</p>
<p><a href="${escapeHtml(dashboardUrl)}" style="color:#2d5a27;font-weight:bold;">Update listing now</a></p>
<p>Kind regards,<br/>Dog Quest</p>`;
      } else {
        emailsSkipped++;
        continue;
      }

      if (profile.notify_email_listing_expiry === false) {
        emailsSkipped++;
        continue;
      }

      const ok = await sendEmail(profile.email, subject, body);
      if (ok) emailsSent++;
      else errors.push(`email failed for ${row.listing_id}`);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        actionsProcessed: actions.length,
        emailsSent,
        emailsSkipped,
        mailerLiteTriggered,
        errors,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
