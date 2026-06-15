/**
 * Strip characters that act as wildcards in SQL ILIKE patterns when interpolated into %...%.
 */
export function sanitizeSearchTermForIlike(raw: string): string {
  return raw
    .trim()
    .replace(/[%_\\,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
