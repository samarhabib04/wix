/**
 * Public seller label when profile fields yield no displayable name but the listing is tied to an account.
 */
export const SELLER_DISPLAY_FALLBACK = 'Verified seller';

export type SellerProfileFields = {
  first_name?: string | null;
  last_name?: string | null;
  business_name?: string | null;
  email?: string | null;
};

/**
 * Prefer full name, then business name, then email local-part. Empty string if nothing usable.
 */
export function formatSellerDisplayName(
  profile: SellerProfileFields | null | undefined
): string {
  if (!profile) return '';
  const full = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
  if (full) return full;
  const biz = profile.business_name?.trim();
  if (biz) return biz;
  const em = profile.email?.trim();
  if (em) {
    const at = em.indexOf('@');
    const local = at > 0 ? em.slice(0, at) : em;
    if (local) return local;
  }
  return '';
}

/**
 * Never returns "Anonymous Seller". Uses a short id prefix when the account id is known but names are missing.
 */
export function sellerDisplayNameWithFallback(
  profile: SellerProfileFields | null | undefined,
  userId?: string | null
): string {
  const name = formatSellerDisplayName(profile);
  if (name) return name;
  if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return `Seller ${userId.slice(0, 8)}`;
  }
  return SELLER_DISPLAY_FALLBACK;
}

/** True if the label is the old anonymous placeholder (handles odd spacing / zero-width chars). */
export function isAnonymousSellerPlaceholder(name: string | undefined | null): boolean {
  if (!name?.trim()) return false;
  const collapsed = name
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return collapsed === 'anonymous seller';
}

/** Ignores legacy/cached "Anonymous Seller" so the link label recomputes after fixes. */
export function resolveSellerLinkLabel(
  sellerName: string | undefined | null,
  userId?: string | null
): string {
  const t = sellerName?.trim();
  if (t && !isAnonymousSellerPlaceholder(t)) return t;
  return sellerDisplayNameWithFallback(null, userId);
}
