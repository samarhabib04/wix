/**
 * Team inbox for contact form forwards, admin alerts, and enquiry notifications.
 * Override with CONTACT_FORWARD_EMAIL / ADMIN_NOTIFICATION_EMAIL (Supabase secrets)
 * and NEXT_PUBLIC_CONTACT_EMAIL (Vercel) when needed.
 */
export const OPERATIONS_EMAIL = 'dogquestireland@gmail.com';

export function parseEmailList(
  raw: string | undefined | null,
  fallback: string = OPERATIONS_EMAIL
): string[] {
  const list = (raw ?? fallback)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length > 0 ? list : [fallback];
}
