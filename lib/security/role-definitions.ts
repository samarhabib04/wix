/**
 * WSTG-IDNT-01 — Role definitions (auditors: see docs/security/WSTG-IDNT-01-through-04.md).
 *
 * Full application roles vs roles allowed at public registration:
 * - APPLICATION_ROLES: every role the product understands (including admin).
 * - REGISTRATION_ROLES: subset that may be chosen during self-service signup / OAuth preselect;
 *   admin is never self-assignable (client + DB trigger enforce).
 *
 * Alignment: middleware.ts PROTECTED_ROUTES, user_profiles RLS, enforce_user_profiles_no_self_admin.
 */
export const APPLICATION_ROLES = ['buyer', 'seller', 'business', 'admin'] as const;
export type ApplicationRole = (typeof APPLICATION_ROLES)[number];

/** Roles a user may obtain without operator/service-role provisioning */
export const REGISTRATION_ROLES = ['buyer', 'seller', 'business'] as const;
export type RegistrationRoleName = (typeof REGISTRATION_ROLES)[number];

export function isApplicationRole(value: string): value is ApplicationRole {
  return (APPLICATION_ROLES as readonly string[]).includes(value);
}

export function isRegistrationRole(value: string): value is RegistrationRoleName {
  return (REGISTRATION_ROLES as readonly string[]).includes(value);
}

export const ROLE_DESCRIPTIONS: Record<ApplicationRole, string> = {
  buyer: 'Browse listings, reservations, wishlist, buyer dashboard.',
  seller: 'Manage sale/stud/showcase listings, seller dashboard, boost flows.',
  business: 'Business listings, marketplace, business dashboard.',
  admin: 'Admin dashboard, moderation, configuration (via is_current_user_admin / RLS).',
};
