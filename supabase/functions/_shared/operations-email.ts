/** Team inbox — keep in sync with `lib/config/operations-email.ts`. */
export const DEFAULT_OPERATIONS_EMAIL = "dogquestireland@gmail.com";

export function parseEmailList(
  raw: string | undefined | null,
  fallback: string = DEFAULT_OPERATIONS_EMAIL,
): string[] {
  const list = (raw ?? fallback)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length > 0 ? list : [fallback];
}

export function contactForwardEmails(): string[] {
  return parseEmailList(Deno.env.get("CONTACT_FORWARD_EMAIL"));
}

export function adminEmailsFromEnv(): string[] {
  const raw = Deno.env.get("ADMIN_NOTIFICATION_EMAIL");
  if (!raw?.trim()) return [];
  return parseEmailList(raw);
}
