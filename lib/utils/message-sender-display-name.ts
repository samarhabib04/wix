/**
 * Display name for messaging UIs. Platform admins show as "Admin", not a personal name.
 */
export function messageSenderDisplayName(
  profile: {
    first_name?: string | null;
    last_name?: string | null;
    business_name?: string | null;
    role?: string | null;
    is_admin?: boolean | null;
  } | null | undefined,
  emptyLabel = "User"
): string {
  if (!profile) return emptyLabel;
  if (profile.role === "admin" || profile.is_admin === true) return "Admin";
  if (profile.business_name?.trim()) return profile.business_name.trim();
  const first = profile.first_name != null ? String(profile.first_name).trim() : "";
  const rawLast = profile.last_name != null ? String(profile.last_name).trim() : "";
  // Avoid "User 0" style labels when last_name is a placeholder 0 from bad/legacy data
  const last = rawLast && rawLast !== "0" ? rawLast : "";
  const full = `${first} ${last}`.trim();
  if (full) return full;
  return emptyLabel;
}
