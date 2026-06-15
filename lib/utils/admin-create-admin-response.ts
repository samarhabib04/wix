export type AdminCreateAdminCode =
  | "USER_EXISTS"
  | "ALREADY_ADMIN"
  | string;

export interface ExistingUserForPromote {
  userId: string;
  email: string;
  role: string;
  displayName: string | null;
}

export interface AdminCreateAdminResponse {
  ok?: boolean;
  code?: AdminCreateAdminCode;
  error?: string;
  message?: string;
  existingUser?: ExistingUserForPromote;
  action?: string;
  userId?: string;
  email?: string;
}

const ROLE_LABELS: Record<string, string> = {
  buyer: "Buyer",
  seller: "Seller",
  business: "Business",
  admin: "Administrator",
};

export function formatUserRoleLabel(role: string | undefined | null): string {
  if (!role) return "User";
  return ROLE_LABELS[role] ?? role.charAt(0).toUpperCase() + role.slice(1);
}

/** Parse body from admin-create-admin invoke (success or business-logic response). */
export function parseAdminCreateAdminResponse(
  data: unknown,
): AdminCreateAdminResponse | null {
  if (!data || typeof data !== "object") return null;
  return data as AdminCreateAdminResponse;
}
