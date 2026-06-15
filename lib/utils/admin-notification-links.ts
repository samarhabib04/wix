import { adminListingKind } from "@/lib/utils/admin-listing-kind";

/**
 * Target URL for admin notification "view details" actions.
 * Uses listing_id + listing_type when present; otherwise type-specific fallbacks.
 */
export function getAdminNotificationDetailHref(args: {
  type: string;
  listing_id?: string | null;
  listing_type?: string | null;
}): string | null {
  const { type, listing_id, listing_type } = args;
  const lid = listing_id?.trim();

  if (type === "fraud_alert") {
    return "/admin-dashboard/fraud-alerts";
  }

  if (!lid) {
    if (type === "vet_partner_request_submitted") {
      return "/admin-dashboard/vet-partners";
    }
    return null;
  }

  const lt = (listing_type || "").toLowerCase();
  if (lt === "business") {
    return `/admin-dashboard/businesses?open=${encodeURIComponent(lid)}`;
  }

  const kind = adminListingKind(listing_type);
  if (kind) {
    return `/admin-dashboard/listings?open=${encodeURIComponent(lid)}&kind=${kind}`;
  }

  return null;
}
