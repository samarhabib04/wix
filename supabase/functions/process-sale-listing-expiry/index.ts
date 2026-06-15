// @ts-ignore - Deno runtime types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno runtime types
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ExpiryActionRow = {
  listing_id: string;
  seller_id: string;
  listing_title: string;
  action: string;
  expires_at: string | null;
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

function formatExpiryDate(iso: string | null): string {
  if (!iso) return "soon";
  try {
    return new Date(iso).toLocaleDateString("en-IE", { dateStyle: "medium" });
  } catch {
    return iso;
  }
}

async function sendExpiryEmail(
  to: string,
  subject: string,
  innerHtml: string,
): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) return false;

  const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to, subject, html: innerHtml }),
  });

  if (!res.ok) {
    console.error("send-email failed:", await res.text());
    return false;
  }
  return true;
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

    const { data: rows, error: rpcError } = await supabase.rpc("process_all_sale_listing_expiry");
    if (rpcError) {
      console.error("process_all_sale_listing_expiry RPC error:", rpcError);
      return new Response(JSON.stringify({ error: rpcError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const actions = (rows ?? []) as ExpiryActionRow[];
    let emailsSent = 0;
    let emailsSkipped = 0;
    const errors: string[] = [];

    for (const row of actions) {
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("email, first_name, notify_email_listing_expiry")
        .eq("id", row.seller_id)
        .maybeSingle();

      if (profileError || !profile?.email) {
        emailsSkipped++;
        continue;
      }

      if (profile.notify_email_listing_expiry === false) {
        emailsSkipped++;
        continue;
      }

      const name = escapeHtml(profile.first_name || "there");
      const title = escapeHtml(row.listing_title || "Your listing");
      const expiryLabel = formatExpiryDate(row.expires_at);

      let subject = "Your For Sale listing — Dog Quest";
      let body = "";

      if (row.action === "expired") {
        subject = "Your For Sale listing has expired — Dog Quest";
        body = `<p>Hi ${name},</p>
<p>Your For Sale listing <strong>${title}</strong> has expired after 4 weeks and is no longer visible to buyers.</p>
<p>You can request a renewal from your seller dashboard. After admin approval, your listing will go live for another 4 weeks.</p>
<p><a href="${escapeHtml(dashboardUrl)}" style="color:#2d5a27;font-weight:bold;">Manage listings</a></p>
<p>Kind regards,<br/>Dog Quest</p>`;
      } else if (row.action === "reminder_7d") {
        subject = "Your listing expires in 7 days — Dog Quest";
        body = `<p>Hi ${name},</p>
<p>Your For Sale listing <strong>${title}</strong> expires on <strong>${escapeHtml(expiryLabel)}</strong> (in 7 days).</p>
<p>Renew from your dashboard before it expires to keep reaching buyers.</p>
<p><a href="${escapeHtml(dashboardUrl)}" style="color:#2d5a27;font-weight:bold;">Renew listing</a></p>
<p>Kind regards,<br/>Dog Quest</p>`;
      } else if (row.action === "reminder_1d") {
        subject = "Your listing expires tomorrow — Dog Quest";
        body = `<p>Hi ${name},</p>
<p>Your For Sale listing <strong>${title}</strong> expires tomorrow (${escapeHtml(expiryLabel)}).</p>
<p>Renew now to avoid it being taken down.</p>
<p><a href="${escapeHtml(dashboardUrl)}" style="color:#2d5a27;font-weight:bold;">Renew listing</a></p>
<p>Kind regards,<br/>Dog Quest</p>`;
      } else {
        emailsSkipped++;
        continue;
      }

      const ok = await sendExpiryEmail(profile.email, subject, body);
      if (ok) {
        emailsSent++;
      } else {
        errors.push(`Failed email for listing ${row.listing_id}`);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        actionsProcessed: actions.length,
        emailsSent,
        emailsSkipped,
        errors,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("process-sale-listing-expiry error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
