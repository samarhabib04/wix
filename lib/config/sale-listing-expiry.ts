/** For Sale listings stay live for 4 weeks after admin approval (go-live). */
export const SALE_LISTING_LIVE_DAYS = 28;

export const SALE_LISTING_REMINDER_DAYS = [7, 1] as const;

export function saleListingExpiresAt(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + SALE_LISTING_LIVE_DAYS);
  return d;
}
