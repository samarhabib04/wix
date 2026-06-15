import { SALE_LISTING_LIVE_DAYS } from '@/lib/config/sale-listing-expiry';

export function isSaleListingExpired(
  expiresAt: string | null | undefined,
  status?: string | null
): boolean {
  if (status === 'expired') return true;
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

export function saleListingDaysRemaining(expiresAt: string | null | undefined): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function formatSaleListingExpiryLabel(expiresAt: string | null | undefined): string | null {
  if (!expiresAt) return null;
  const days = saleListingDaysRemaining(expiresAt);
  if (days === null) return null;
  if (days <= 0) return 'Expired';
  if (days === 1) return 'Expires tomorrow';
  if (days <= 7) return `Expires in ${days} days`;
  try {
    return `Live until ${new Date(expiresAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}`;
  } catch {
    return `Live for ${SALE_LISTING_LIVE_DAYS} days`;
  }
}
