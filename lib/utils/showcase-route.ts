const SHOWCASE_UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Extract listing UUID from route param (supports `{uuid}-{title-slug}`). */
export function resolveShowcaseCanonicalId(routeId: string): string | null {
  const trimmed = routeId?.trim();
  if (!trimmed) return null;
  return trimmed.match(SHOWCASE_UUID_RE)?.[0] ?? null;
}

/** Legacy URLs used only the last 4 hex chars of the UUID before the title slug. */
export function isLegacyShowcaseSlugRoute(routeId: string): boolean {
  return Boolean(routeId?.includes('-') && !resolveShowcaseCanonicalId(routeId));
}
