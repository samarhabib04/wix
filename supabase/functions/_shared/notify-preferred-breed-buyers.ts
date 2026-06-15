// Shared by sale-live: when a sale listing goes live, notify buyers whose saved
// quiz breeds (user_preferences.breed_ids) match the listing's breed(s).

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

function siteUrl(): string {
  return (Deno.env.get("PUBLIC_SITE_URL") || "https://dogquest.ie").replace(
    /\/$/,
    "",
  );
}

/**
 * Lowercase letters/digits only — aligns quiz "Golden Retriever" with listing slug
 * `goldenretriever`, and "Affenpinscher" with `affenpinscher`.
 */
export function breedMatchKey(s: string): string {
  return String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Pedigree uses `breed`; crossbreeds set breed_1, breed_2; `breed` may be "a-b" slug. */
export function listingBreedMatchKeys(listing: {
  breed: string;
  breed_1: string | null;
  breed_2: string | null;
}): Set<string> {
  const set = new Set<string>();
  const addTokens = (raw: string | null | undefined) => {
    if (raw == null || !String(raw).trim()) return;
    const s = String(raw).trim();
    const full = breedMatchKey(s);
    if (full.length) set.add(full);
    for (const part of s.split(/[-_/]/)) {
      const k = breedMatchKey(part);
      if (k.length) set.add(k);
    }
  };
  addTokens(listing.breed);
  addTokens(listing.breed_1);
  addTokens(listing.breed_2);
  return set;
}

function firstMatchingPreferredLabel(
  breedIds: string[] | null,
  listingKeys: Set<string>,
): string | null {
  if (!breedIds?.length) return null;
  for (const b of breedIds) {
    const key = breedMatchKey(b);
    if (key.length && listingKeys.has(key)) return b.trim() || b;
  }
  return null;
}

type SaleListingRow = {
  id: string;
  title: string;
  seller_id: string;
  breed: string;
  breed_1: string | null;
  breed_2: string | null;
};

/**
 * Inserts dashboard notifications + breed_alerts_log and optionally emails buyers.
 */
export async function notifyPreferredBreedBuyersForSaleListing(
  supabase: SupabaseClient,
  listingId: string,
): Promise<{ notified: number; errors: string[] }> {
  const errors: string[] = [];
  const { data: listing, error: listingErr } = await supabase
    .from("sale_listings")
    .select("id, title, seller_id, breed, breed_1, breed_2")
    .eq("id", listingId)
    .maybeSingle();

  if (listingErr) {
    errors.push(`listing fetch: ${listingErr.message}`);
    return { notified: 0, errors };
  }
  const row = listing as SaleListingRow | null;
  if (!row) {
    errors.push("listing not found");
    return { notified: 0, errors };
  }

  const listingKeys = listingBreedMatchKeys(row);
  if (listingKeys.size === 0) {
    return { notified: 0, errors };
  }

  const { data: prefs, error: prefsErr } = await supabase
    .from("user_preferences")
    .select(
      "user_id, breed_ids, breed_alerts_enabled, email_notifications_enabled",
    )
    .eq("breed_alerts_enabled", true);

  if (prefsErr) {
    errors.push(`user_preferences: ${prefsErr.message}`);
    return { notified: 0, errors };
  }

  const matches = (prefs ?? []).filter((p) => {
    if (!p.user_id || p.user_id === row.seller_id) return false;
    const label = firstMatchingPreferredLabel(
      p.breed_ids as string[] | null,
      listingKeys,
    );
    return label != null;
  });

  if (matches.length === 0) {
    return { notified: 0, errors };
  }

  const base = siteUrl();
  const listingUrl = `${base}/listing/${row.id}`;
  let notified = 0;

  for (const pref of matches) {
    const matchedLabel = firstMatchingPreferredLabel(
      pref.breed_ids as string[] | null,
      listingKeys,
    );
    if (!matchedLabel) continue;

    const userId = pref.user_id as string;

    const { error: notifErr } = await supabase.from("notifications").insert({
      user_id: userId,
      title: "A listing for your preferred breed is live",
      message: `"${row.title}" — ${matchedLabel} — is now published on Dog Quest.`,
      type: "breed_listing_live",
      listing_id: row.id,
      listing_type: "sale",
      read: false,
    });

    if (notifErr) {
      errors.push(`notification ${userId}: ${notifErr.message}`);
      continue;
    }

    const emailEnabled = !!(pref as { email_notifications_enabled?: boolean })
      .email_notifications_enabled;
    let emailSentAt: string | null = null;

    if (emailEnabled) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("email, first_name, last_name")
        .eq("id", userId)
        .maybeSingle();

      const to = profile?.email;
      const firstName = profile?.first_name || "";
      if (to) {
        const inner = `<p>Hi ${firstName ? escapeHtml(firstName) : "there"},</p>
<p>A new <strong>${escapeHtml(matchedLabel)}</strong> listing is live on Dog Quest: <strong>${escapeHtml(row.title)}</strong>.</p>
<p><a href="${escapeHtml(listingUrl)}" style="color:#2d5a27;font-weight:bold;">View listing</a></p>
<p>You received this because you matched this breed in the Dog Quest quiz and breed alerts are on. You can change this in your buyer dashboard.</p>`;

        const { error: invokeErr } = await supabase.functions.invoke(
          "send-email",
          {
            body: {
              to,
              subject: `New ${matchedLabel} listing — Dog Quest`,
              html: inner,
            },
          },
        );

        if (invokeErr) {
          errors.push(`email ${userId}: ${invokeErr.message}`);
        } else {
          emailSentAt = new Date().toISOString();
        }
      }
    }

    const logRow: {
      user_id: string;
      listing_id: string;
      listing_type: string;
      breed: string;
      email_sent_at?: string;
    } = {
      user_id: userId,
      listing_id: row.id,
      listing_type: "sale",
      breed: matchedLabel,
    };
    if (emailSentAt) logRow.email_sent_at = emailSentAt;

    const { error: logErr } = await supabase.from("breed_alerts_log").insert(logRow);
    if (logErr) {
      errors.push(`breed_alerts_log ${userId}: ${logErr.message}`);
    }

    notified++;
  }

  return { notified, errors };
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
