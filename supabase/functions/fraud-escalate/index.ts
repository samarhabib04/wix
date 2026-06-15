import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  authenticateAdmin,
  createErrorResponse,
} from "../_shared/auth-helpers.ts";
import { corsHeadersForRequest } from "../_shared/cors-headers.ts";
import {
  adminEmailsFromEnv,
  DEFAULT_OPERATIONS_EMAIL,
} from "../_shared/operations-email.ts";

function escapeHtml(s: string | undefined | null): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function getAdminNotificationEmails(
  supabase: ReturnType<typeof createClient>,
): Promise<string[]> {
  const fromEnv = adminEmailsFromEnv();
  if (fromEnv.length > 0) return fromEnv;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("email")
    .or("role.eq.admin,is_admin.eq.true");
  if (error) {
    console.error("fraud-escalate admin lookup:", error);
    return [DEFAULT_OPERATIONS_EMAIL];
  }
  const set = new Set<string>();
  for (const row of data ?? []) {
    if (row?.email && typeof row.email === "string") set.add(row.email);
  }
  if (set.size > 0) return [...set];
  return [DEFAULT_OPERATIONS_EMAIL];
}

async function sendEscalationEmail(
  admins: string[],
  subject: string,
  html: string,
): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  const from = Deno.env.get("RESEND_FROM") ??
    "Dog Quest <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: admins,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend ${res.status}: ${text}`);
  }
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersForRequest(req, "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const auth = await authenticateAdmin(req);
  if (!auth.success) {
    return createErrorResponse(auth.error, corsHeaders);
  }

  let body: {
    alertType?: string;
    alertId?: string;
    detailText?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const alertType = String(body.alertType || "");
  const alertId = String(body.alertId || "");
  const detailText = String(body.detailText || "");

  if (!alertType || !alertId || !["user", "message", "reservation"].includes(alertType)) {
    return new Response(
      JSON.stringify({ error: "alertType and alertId required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Must be your real public origin (e.g. https://dogquest.ie), not a *.vercel.app preview URL —
  // Resend flags mismatched link domains vs From: and it hurts deliverability.
  const base = (Deno.env.get("PUBLIC_SITE_URL") || "https://dogquest.ie").replace(
    /\/$/,
    "",
  );

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const admins = await getAdminNotificationEmails(supabase);
  if (!admins.length) {
    return new Response(
      JSON.stringify({
        error:
          "No admin notification emails (set ADMIN_NOTIFICATION_EMAIL or admin profiles with email)",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const adminEmail = auth.data.user?.email ?? "unknown";
  const inner = `<p><strong>Fraud alert escalated</strong></p>
<p><strong>Alert type:</strong> ${escapeHtml(alertType)}</p>
<p><strong>Record ID:</strong> ${escapeHtml(alertId)}</p>
<p><strong>Escalated by:</strong> ${escapeHtml(adminEmail)}</p>
<p><strong>Notes / context:</strong></p>
<p style="white-space:pre-wrap;">${escapeHtml(detailText) || "(none)"}</p>
<p><a href="${escapeHtml(base)}/admin-dashboard/fraud-alerts" style="color:#2d5a27;">Open fraud alerts</a></p>`;

  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#374151;">
${inner}
</body></html>`;

  try {
    await sendEscalationEmail(
      admins,
      `[Dog Quest] Fraud escalation: ${alertType} ${alertId.slice(0, 8)}…`,
      html,
    );
  } catch (e) {
    console.error("fraud-escalate:", e);
    const msg = e instanceof Error ? e.message : "Send failed";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
