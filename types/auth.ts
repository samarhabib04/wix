export interface UserRole {
  role: 'buyer' | 'seller' | 'business' | 'admin';
}

export interface UserSession {
  user: {
    id: string;
    email: string;
    role: UserRole['role'];
  } | null;
  isLoading: boolean;
}

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  county: string;
  role: UserRole['role'];
  newsletter_opt_in: boolean;
  auth_method: 'email_password' | 'google';
  business_name?: string;
  seller_id?: string;
  dbe_id?: string;
  profile_complete: boolean;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// Type guard function to safely check roles
export function isValidRole(role: string): role is UserRole['role'] {
  return ['buyer', 'seller', 'business', 'admin'].includes(role);
}

/** Roles allowed in public sign-up metadata — never admin (DogQuest-2026-001 / WSTG-ATHZ-03). */
export type RegistrationRole = Exclude<UserRole['role'], 'admin'>;

export function sanitizeRegistrationRole(role: string): RegistrationRole {
  if (role === 'seller' || role === 'business' || role === 'buyer') return role;
  return 'buyer';
}
































