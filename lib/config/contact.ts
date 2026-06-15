import { OPERATIONS_EMAIL } from '@/lib/config/operations-email';

/**
 * Public contact address (mailto, Contact, FAQ, legal).
 * Defaults to the live team inbox. Set NEXT_PUBLIC_CONTACT_EMAIL on Vercel to override.
 * info@dogquest.ie can be shown later once domain MX/forwarding is configured.
 */
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? OPERATIONS_EMAIL;

export const CONTACT_MAILTO_HREF = `mailto:${CONTACT_EMAIL}`;
