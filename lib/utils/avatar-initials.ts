/**
 * First user-perceived character. Avoids str[0], which splits UTF-16 surrogate pairs
 * and can render as replacement glyphs (often seen as "?" in avatar fallbacks).
 */
export function firstGrapheme(text: string | null | undefined): string {
  if (text == null) return "";
  const t = text.trim();
  if (!t) return "";
  return Array.from(t)[0] ?? "";
}

/**
 * Up to two letters for dashboard sidebar avatars: business initial, or first+last,
 * or email local-part prefix — all grapheme-safe.
 */
export function dashboardSidebarAvatarLabel(options: {
  businessName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  metadataFirstName?: string | null;
  email?: string | null;
  fallbackLetter: string;
}): string {
  const b = firstGrapheme(options.businessName);
  if (b) return b.toLocaleUpperCase("en");

  const f = firstGrapheme(options.firstName);
  const l = firstGrapheme(options.lastName);
  if (f && l) return `${f}${l}`.toLocaleUpperCase("en");
  if (f) return f.toLocaleUpperCase("en");

  const m = firstGrapheme(options.metadataFirstName);
  if (m) return m.toLocaleUpperCase("en");

  const local = options.email?.split("@")[0]?.trim() ?? "";
  if (local) {
    const chars = Array.from(local);
    if (chars.length >= 2) {
      return `${chars[0]}${chars[1]}`.toLocaleUpperCase("en");
    }
    return (chars[0] ?? "").toLocaleUpperCase("en");
  }

  return options.fallbackLetter;
}
