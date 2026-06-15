'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface UseAuthGuardOptions {
  requireAuth?: boolean;
  redirectTo?: string;
  message?: string;
}

export const useAuthGuard = ({
  requireAuth = true,
  redirectTo = '/auth/login',
  message = "Please log in to continue."
}: UseAuthGuardOptions = {}) => {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const checkAuth = (action?: () => void) => {
    if (!requireAuth) {
      if (action) action();
      return true;
    }

    if (isLoading) {
      return false; // Wait for auth to load
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: message,
        variant: "default"
      });
      
      // Store current location to redirect back after login
      const currentPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
      const loginUrl = `${redirectTo}?next=${encodeURIComponent(currentPath)}`;
      router.push(loginUrl);
      return false;
    }

    if (action) action();
    return true;
  };

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    checkAuth,
    requireLogin: () => checkAuth()
  };
};
