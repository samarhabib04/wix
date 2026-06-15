#!/usr/bin/env node
/**
 * Smoke-test the send-email Edge Function (branding + logo) without using the app UI.
 *
 * Usage (from repo root, Node 20+):
 *   node --env-file=.env.local scripts/test-send-email.mjs you@example.com
 *   node --env-file=.env.local scripts/test-send-email.mjs you@example.com listing_approval
 *
 * Second arg (optional): listing_submission | listing_approval (default: listing_submission)
 *
 * Or set env vars manually:
 *   NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
 *   TEST_EMAIL=you@example.com node scripts/test-send-email.mjs
 *
 * Resend / testing:
 * - Until your sending domain is verified in Resend, API may only deliver to the
 *   Resend account owner’s address. If Kevin owns the Resend project, either:
 *   (a) ask him to add you as a team member and use your key, or
 *   (b) verify dogquest.ie (or your Vercel preview domain) in Resend and set
 *       RESEND_FROM on Supabase to that domain, or
 *   (c) use a separate Resend test project with your email as owner.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const p = join(__dirname, "..", ".env.local");
    const raw = readFileSync(p, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    // optional
  }
}

loadEnvLocal();

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(
  /\/$/,
  "",
);
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const toEmail =
  process.argv[2] || process.env.TEST_EMAIL || "";

const emailTypeRaw =
  process.argv[3] ||
  process.env.EMAIL_TYPE ||
  "listing_submission";
const emailType =
  String(emailTypeRaw).toLowerCase() === "listing_approval"
    ? "listing_approval"
    : "listing_submission";

if (!SUPABASE_URL || !ANON_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY (use .env.local or --env-file).",
  );
  process.exit(1);
}

if (!toEmail) {
  console.error(
    "Usage: node scripts/test-send-email.mjs <recipient@email.com> [listing_submission|listing_approval]\n" +
      "   or: TEST_EMAIL=... EMAIL_TYPE=listing_approval node scripts/test-send-email.mjs",
  );
  process.exit(1);
}

const url = `${SUPABASE_URL}/functions/v1/send-email`;

/** listing_approval requires a non-empty listingId (any UUID-shaped string is fine for link testing). */
const testListingId =
  emailType === "listing_approval"
    ? "00000000-0000-4000-8000-000000000001"
    : "test-logo-id";

const body =
  emailType === "listing_approval"
    ? {
        type: "listing_approval",
        email: toEmail,
        firstName: "Test",
        listingTitle: "Logo test — approved listing",
        listingType: "puppy",
        listingId: testListingId,
      }
    : {
        type: "listing_submission",
        email: toEmail,
        firstName: "Test",
        listingTitle: "Logo test — submitted listing",
        listingType: "puppy",
        listingId: testListingId,
      };

console.error(`send-email type: ${emailType} → ${toEmail}`);

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ANON_KEY}`,
    apikey: ANON_KEY,
  },
  body: JSON.stringify(body),
});

const text = await res.text();
console.log(res.status, text);
if (!res.ok) process.exit(1);
