/**
 * `sale_listings.status` values that count as live on public marketplace surfaces
 * (home, for sale, search, breed counts), together with admin_approved + is_published
 * and not deleted/paused.
 *
 * Canonical live value is `active`. `approved` is legacy only — normalize via migration
 * and always write `active` for new approvals; queries accept both until DB is clean.
 */
export const PUBLIC_MARKETPLACE_SALE_STATUSES = ['active', 'approved'] as const;

/** Supabase `.or()` filter: hide For Sale ads past `expires_at` (before daily cron unpublishes). */
export function saleListingNotExpiredOrFilter(
  nowIso: string = new Date().toISOString()
): string {
  return `expires_at.is.null,expires_at.gt.${nowIso}`;
}
