import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeadersForRequest } from "../_shared/cors-headers.ts";
import { emailLogoUrl } from "../_shared/email-logo-url.ts";
import {
  contactForwardEmails,
  adminEmailsFromEnv,
  DEFAULT_OPERATIONS_EMAIL,
} from "../_shared/operations-email.ts";

function siteUrl(): string {
  // Keep aligned with the domain you send from (Resend: "Ensure link URLs match sending domain").
  return (Deno.env.get("PUBLIC_SITE_URL") || "https://dogquest.ie").replace(
    /\/$/,
    "",
  );
}

function escapeHtml(s: string | undefined | null): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Resend / RFC 2392 — referenced from HTML as <img src="cid:dogquest-logo" /> */
const LOGO_CONTENT_ID = "dogquest-logo";

function logoCandidateUrls(): string[] {
  const urls: string[] = [];
  const explicit = Deno.env.get("EMAIL_LOGO_URL");
  if (explicit) urls.push(explicit);
  urls.push(emailLogoUrl());
  const site = (Deno.env.get("PUBLIC_SITE_URL") || "https://dogquest.ie").replace(
    /\/$/,
    "",
  );
  urls.push(`${site}/email/dog-quest-logo.jpg`);
  return [...new Set(urls.filter(Boolean))];
}

function isImageBytes(buf: Uint8Array, contentType: string): boolean {
  const ct = contentType.toLowerCase();
  if (ct.includes("text/html")) return false;
  if (ct.includes("image/")) return true;
  if (buf.length < 4) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8) return true;
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
  ) {
    return true;
  }
  return false;
}

function uint8ToBase64(bytes: Uint8Array): string {
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + chunk) as unknown as number[],
    );
  }
  return btoa(binary);
}

/** Fetch logo bytes in Edge; embed via CID so clients don’t rely on hot-linked URLs (often HTML). */
async function tryLogoInlineAttachment(): Promise<
  Record<string, unknown> | null
> {
  for (const url of logoCandidateUrls()) {
    try {
      const r = await fetch(url, { redirect: "follow" });
      if (!r.ok) continue;
      const ct = r.headers.get("content-type") || "";
      const buf = new Uint8Array(await r.arrayBuffer());
      if (buf.length < 200) continue;
      if (!isImageBytes(buf, ct)) continue;
      const filename = url.toLowerCase().includes(".png")
        ? "dog-quest-logo.png"
        : "dog-quest-logo.jpg";
      const contentType = ct.includes("png") ? "image/png" : "image/jpeg";
      return {
        content: uint8ToBase64(buf),
        filename,
        content_type: contentType,
        content_id: LOGO_CONTENT_ID,
      };
    } catch (e) {
      console.warn("send-email: could not load logo from", url, e);
    }
  }
  console.warn(
    "send-email: no inline logo — all candidate URLs failed or returned non-images",
  );
  return null;
}

/** Table-based shell; prefers CID inline logo so Gmail/WhatsApp show the image without fragile hotlinks. */
async function buildBrandedHtml(
  mainContent: string,
  baseUrl: string,
): Promise<{
  html: string;
  attachments?: Record<string, unknown>[];
}> {
  const inline = await tryLogoInlineAttachment();
  const logoSrc = inline
    ? `cid:${LOGO_CONTENT_ID}`
    : escapeHtml(emailLogoUrl());

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
<tr><td align="center" style="padding:28px 24px 20px;border-bottom:1px solid #e5e7eb;">
<a href="${escapeHtml(baseUrl)}" target="_blank" rel="noopener" style="text-decoration:none;">
<img src="${logoSrc}" alt="Dog Quest" width="220" style="max-width:220px;width:100%;height:auto;display:block;border:0;outline:none;" />
</a>
</td></tr>
<tr><td style="padding:24px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#374151;">
${mainContent}
</td></tr>
<tr><td style="padding:16px 24px 24px;font-size:12px;line-height:1.5;color:#9ca3af;text-align:center;border-top:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;">
<a href="${escapeHtml(baseUrl)}" style="color:#2d5a27;">Dog Quest</a>
 · <a href="mailto:${escapeHtml(DEFAULT_OPERATIONS_EMAIL)}" style="color:#2d5a27;">${escapeHtml(DEFAULT_OPERATIONS_EMAIL)}</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  if (inline) {
    return { html, attachments: [inline] };
  }
  return { html };
}

function listingPublicUrl(
  base: string,
  listingType: string,
  listingId: string,
): string {
  const t = (listingType || "").toLowerCase();
  if (t === "stud") return `${base}/stud/${listingId}`;
  if (t === "showcase") return `${base}/showcase/${listingId}`;
  return `${base}/listing/${listingId}`;
}

async function sendResend(
  to: string | string[],
  subject: string,
  html: string,
  options?: { replyTo?: string; attachments?: Record<string, unknown>[] },
): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY is not configured");

  const from = Deno.env.get("RESEND_FROM") ??
    "Dog Quest <onboarding@resend.dev>";

  const payload: Record<string, unknown> = {
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  };
  if (options?.replyTo) payload.reply_to = options.replyTo;
  if (options?.attachments?.length) payload.attachments = options.attachments;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend ${res.status}: ${text}`);
  }
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
    console.error("send-email admin lookup:", error);
    return [DEFAULT_OPERATIONS_EMAIL];
  }
  const set = new Set<string>();
  for (const row of data ?? []) {
    if (row?.email && typeof row.email === "string") set.add(row.email);
  }
  if (set.size > 0) return [...set];
  return [DEFAULT_OPERATIONS_EMAIL];
}

Deno.serve(async (req) => {
  const cors = corsHeadersForRequest(req, "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: cors });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const base = siteUrl();

  const getServiceClient = () =>
    createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

  try {
    // Stripe webhook & other server callers: { to, subject, html }
    const rawTo = body.to;
    const rawSubject = body.subject;
    const rawHtml = body.html;
    if (
      typeof rawTo === "string" &&
      typeof rawSubject === "string" &&
      typeof rawHtml === "string" &&
      body.type === undefined
    ) {
      const { html: wrapped, attachments } = await buildBrandedHtml(
        rawHtml,
        base,
      );
      await sendResend(rawTo, rawSubject, wrapped, { attachments });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const type = String(body.type || "");

    switch (type) {
      case "listing_submission": {
        const email = String(body.email || "");
        const firstName = body.firstName as string | undefined;
        const listingTitle = String(body.listingTitle || "Your listing");
        const listingType = String(body.listingType || "puppy");
        const listingId = String(body.listingId || "");
        if (!email) throw new Error("email required");
        const link = listingId
          ? listingPublicUrl(base, listingType, listingId)
          : base;
        const inner = `<p>Hi ${escapeHtml(firstName || "there")},</p>
<p>Thanks for submitting <strong>${escapeHtml(listingTitle)}</strong> on Dog Quest. Our team will review it shortly.</p>
<p><a href="${escapeHtml(link)}" style="color:#2d5a27;font-weight:bold;">View listing</a></p>
<p>Kind regards,<br/>Dog Quest</p>`;
        {
          const { html, attachments } = await buildBrandedHtml(inner, base);
          await sendResend(email, "Listing received — Dog Quest", html, {
            attachments,
          });
        }
        break;
      }

      case "listing_approval": {
        const email = String(body.email || "");
        const firstName = body.firstName as string | undefined;
        const listingTitle = String(body.listingTitle || "Your listing");
        const listingType = String(body.listingType || "puppy");
        const listingId = String(body.listingId || "");
        if (!email || !listingId) throw new Error("email and listingId required");
        const link = listingPublicUrl(base, listingType, listingId);
        const inner = `<p>Hi ${escapeHtml(firstName || "there")},</p>
<p>Good news — <strong>${escapeHtml(listingTitle)}</strong> has been approved and is live on Dog Quest.</p>
<p><a href="${escapeHtml(link)}" style="color:#2d5a27;font-weight:bold;">View your listing</a></p>
<p>Kind regards,<br/>Dog Quest</p>`;
        {
          const { html, attachments } = await buildBrandedHtml(inner, base);
          await sendResend(email, "Your listing is live — Dog Quest", html, {
            attachments,
          });
        }
        break;
      }

      case "listing_rejection": {
        const email = String(body.email || "");
        const firstName = body.firstName as string | undefined;
        const listingTitle = String(body.listingTitle || "Your listing");
        const reason = body.rejectionReason as string | undefined;
        if (!email) throw new Error("email required");
        const inner = `<p>Hi ${escapeHtml(firstName || "there")},</p>
<p>We weren’t able to approve <strong>${escapeHtml(listingTitle)}</strong> at this time.</p>
${reason ? `<p><strong>Reason:</strong> ${escapeHtml(reason)}</p>` : ""}
<p>If you have questions, reply to this email or contact <a href="mailto:${DEFAULT_OPERATIONS_EMAIL}">${DEFAULT_OPERATIONS_EMAIL}</a>.</p>
<p>Dog Quest</p>`;
        {
          const { html, attachments } = await buildBrandedHtml(inner, base);
          await sendResend(email, "Listing update — Dog Quest", html, {
            attachments,
          });
        }
        break;
      }

      case "admin_listing_notification": {
        const admins = await getAdminNotificationEmails(getServiceClient());
        if (!admins.length) {
          throw new Error(
            "No admin notification emails (set ADMIN_NOTIFICATION_EMAIL or admin user_profiles with email)",
          );
        }
        const listingTitle = String(body.listingTitle || "");
        const listingType = String(body.listingType || "");
        const listingId = String(body.listingId || "");
        const sellerEmail = String(body.sellerEmail || "");
        const sellerName = String(body.sellerName || "");
        const inner = `<p><strong>New listing pending review</strong></p>
<p><strong>Title:</strong> ${escapeHtml(listingTitle)}</p>
<p><strong>Type:</strong> ${escapeHtml(listingType)}</p>
<p><strong>Seller:</strong> ${escapeHtml(sellerName)} (${escapeHtml(sellerEmail)})</p>
<p><strong>ID:</strong> ${escapeHtml(listingId)}</p>
<p><a href="${escapeHtml(base)}/admin-dashboard" style="color:#2d5a27;">Open admin dashboard</a></p>`;
        {
          const { html, attachments } = await buildBrandedHtml(inner, base);
          await sendResend(admins, `New listing: ${listingTitle || "Review"}`, html, {
            attachments,
          });
        }
        break;
      }

      case "showcase_approval": {
        const email = String(body.email || "");
        const listingTitle = String(body.listingTitle || "");
        const listingId = String(body.listingId || "");
        const isEdit = Boolean(body.isEdit);
        if (!email) throw new Error("email required");
        const link = listingId ? `${base}/showcase/${listingId}` : base;
        const inner = `<p>Hi,</p>
<p>Your showcase ${isEdit ? "update" : "listing"} <strong>${escapeHtml(listingTitle)}</strong> has been approved.</p>
<p><a href="${escapeHtml(link)}" style="color:#2d5a27;">View showcase</a></p>`;
        {
          const { html, attachments } = await buildBrandedHtml(inner, base);
          await sendResend(email, "Showcase approved — Dog Quest", html, {
            attachments,
          });
        }
        break;
      }

      case "business_rejection": {
        const email = String(body.email || "");
        const businessName = String(body.businessName || "");
        const rejectionReason = body.rejectionReason as string | undefined;
        if (!email) throw new Error("email required");
        const inner = `<p>Hi,</p>
<p>We weren’t able to approve the business listing <strong>${escapeHtml(businessName)}</strong>.</p>
${rejectionReason ? `<p>${escapeHtml(rejectionReason)}</p>` : ""}
<p>Questions? <a href="mailto:${DEFAULT_OPERATIONS_EMAIL}">${DEFAULT_OPERATIONS_EMAIL}</a></p>`;
        {
          const { html, attachments } = await buildBrandedHtml(inner, base);
          await sendResend(email, "Business listing update — Dog Quest", html, {
            attachments,
          });
        }
        break;
      }

      case "contact_form": {
        const forward = contactForwardEmails();
        const email = String(body.email || "");
        const fullName = String(body.fullName || "");
        const phone = String(body.phone || "");
        const subject = String(body.subject || "Contact form");
        const message = String(body.message || "");

        try {
          const sb = getServiceClient();
          const { error: insertError } = await sb.from("contact_submissions").insert({
            full_name: fullName,
            email,
            phone: phone || null,
            subject,
            message,
          });
          if (insertError) {
            console.error(
              "send-email: contact_submissions insert failed",
              insertError,
            );
          }
        } catch (persistErr) {
          console.error("send-email: contact persistence exception", persistErr);
        }

        const inner = `<p><strong>New contact message</strong></p>
<p><strong>From:</strong> ${escapeHtml(fullName)} &lt;${escapeHtml(email)}&gt;</p>
<p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
<p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
<p style="white-space:pre-wrap;">${escapeHtml(message)}</p>`;
        {
          const { html, attachments } = await buildBrandedHtml(inner, base);
          await sendResend(
            forward.length === 1 ? forward[0] : forward,
            `Contact: ${subject}`,
            html,
            {
              replyTo: email,
              attachments,
            },
          );
        }
        break;
      }

      case "business_enquiry": {
        const forward = contactForwardEmails();
        const businessName = String(body.businessName || "Business listing");
        const businessId = String(body.businessId || "");
        const name = String(body.name || "");
        const email = String(body.email || "");
        const phone = String(body.phone || "");
        const message = String(body.message || "");
        const listingType = String(body.listingType || "");

        const inner = `<p><strong>New business enquiry</strong></p>
<p><strong>Business:</strong> ${escapeHtml(businessName)}${businessId ? ` (${escapeHtml(businessId)})` : ""}</p>
${listingType ? `<p><strong>Type:</strong> ${escapeHtml(listingType)}</p>` : ""}
<p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
<p><strong>Phone:</strong> ${escapeHtml(phone || "—")}</p>
<p style="white-space:pre-wrap;">${escapeHtml(message)}</p>
<p><a href="${escapeHtml(base)}/my-business-dashboard/enquiries" style="color:#2d5a27;">View in business dashboard</a></p>`;
        {
          const { html, attachments } = await buildBrandedHtml(inner, base);
          await sendResend(
            forward.length === 1 ? forward[0] : forward,
            `Enquiry: ${businessName}`,
            html,
            { replyTo: email, attachments },
          );
        }
        break;
      }

      case "password_reset": {
        const email = String(body.email || "");
        const firstName = body.firstName as string | undefined;
        const resetUrl = String(body.resetUrl || "");
        if (!email || !resetUrl) throw new Error("email and resetUrl required");
        const inner = `<p>Hi ${escapeHtml(firstName || "there")},</p>
<p>Reset your Dog Quest password using the link below:</p>
<p><a href="${escapeHtml(resetUrl)}" style="color:#2d5a27;font-weight:bold;">Reset password</a></p>
<p>If you didn’t request this, you can ignore this email.</p>`;
        {
          const { html, attachments } = await buildBrandedHtml(inner, base);
          await sendResend(email, "Reset your password — Dog Quest", html, {
            attachments,
          });
        }
        break;
      }

      case "signup_confirmation": {
        const email = String(body.email || "");
        const confirmationUrl = String(body.confirmationUrl || "");
        const firstName = body.firstName as string | undefined;
        const role = String(body.role || "");
        if (!email || !confirmationUrl) {
          throw new Error("email and confirmationUrl required");
        }
        const inner = `<p>Hi ${escapeHtml(firstName || "there")},</p>
<p>Welcome to Dog Quest! Confirm your email to finish signing up (${escapeHtml(role)}).</p>
<p><a href="${escapeHtml(confirmationUrl)}" style="color:#2d5a27;font-weight:bold;">Confirm email</a></p>`;
        {
          const { html, attachments } = await buildBrandedHtml(inner, base);
          await sendResend(email, "Confirm your email — Dog Quest", html, {
            attachments,
          });
        }
        break;
      }

      case "order_confirmation":
      case "order_shipped": {
        const email = String(body.email || "");
        const orderNumber = String(body.orderNumber || "");
        const cartItems = (body.cartItems as Array<{ title?: string; quantity?: number; price?: number }>) ?? [];
        const shippingInfo = body.shippingInfo as Record<string, string> | undefined;
        const totalPrice = Number(body.totalPrice ?? 0);
        const currency = String(body.currency ?? "EUR");
        if (!email) throw new Error("email required");
        const lines = cartItems
          .map(
            (i) =>
              `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(i.title)}</td><td style="padding:8px;border-bottom:1px solid #eee;">${i.quantity ?? 0}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${escapeHtml(String(i.price ?? ""))}</td></tr>`,
          )
          .join("");
        const ship = shippingInfo
          ? `<p><strong>Ship to:</strong><br/>${escapeHtml(shippingInfo.firstName || "")} ${escapeHtml(shippingInfo.lastName || "")}<br/>${escapeHtml(shippingInfo.addressLine1 || "")}<br/>${escapeHtml(shippingInfo.county || "")} ${escapeHtml(shippingInfo.eircode || "")}</p>`
          : "";
        const inner =
          type === "order_shipped"
            ? `<p>Your order <strong>#${escapeHtml(orderNumber)}</strong> has shipped.</p>${ship}`
            : `<p>Thank you for your order <strong>#${escapeHtml(orderNumber)}</strong>.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0;"><thead><tr><th align="left" style="padding:8px;border-bottom:2px solid #ddd;">Item</th><th align="left" style="padding:8px;border-bottom:2px solid #ddd;">Qty</th><th align="right" style="padding:8px;border-bottom:2px solid #ddd;">Price</th></tr></thead><tbody>${lines}</tbody></table>
<p><strong>Total:</strong> ${escapeHtml(String(totalPrice))} ${escapeHtml(currency)}</p>${ship}`;
        {
          const { html, attachments } = await buildBrandedHtml(inner, base);
          await sendResend(
            email,
            type === "order_shipped"
              ? `Order shipped #${orderNumber} — Dog Quest`
              : `Order confirmation #${orderNumber} — Dog Quest`,
            html,
            { attachments },
          );
        }
        break;
      }

      case "admin_order_notification": {
        const admins = await getAdminNotificationEmails(getServiceClient());
        if (!admins.length) {
          throw new Error("No admin emails for admin_order_notification");
        }
        const orderNumber = String(body.orderNumber || "");
        const customerEmail = String(body.customerEmail || "");
        const cartItems = (body.cartItems as Array<{ title?: string; quantity?: number }>) ?? [];
        const lines = cartItems
          .map(
            (i) =>
              `<li>${escapeHtml(i.title)} × ${i.quantity ?? 0}</li>`,
          )
          .join("");
        const inner = `<p><strong>New shop order</strong> #${escapeHtml(orderNumber)}</p>
<p><strong>Customer:</strong> ${escapeHtml(customerEmail)}</p>
<ul>${lines}</ul>
<p><a href="${escapeHtml(base)}/admin-dashboard" style="color:#2d5a27;">Admin</a></p>`;
        {
          const { html, attachments } = await buildBrandedHtml(inner, base);
          await sendResend(admins, `New order #${orderNumber}`, html, {
            attachments,
          });
        }
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown email type: ${type}` }),
          {
            status: 400,
            headers: { ...cors, "Content-Type": "application/json" },
          },
        );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-email:", e);
    const msg = e instanceof Error ? e.message : "Send failed";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
