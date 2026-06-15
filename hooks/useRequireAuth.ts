
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export const useRequireAuth = (allowedRoles?: string[]) => {
  const router = useRouter();
  const { user, isLoading, isEmailVerified, isSigningOut } = useAuth(); // ADDED: isSigningOut

  useEffect(() => {
    const checkAuth = async () => {
      if (isLoading || isSigningOut) return; // ADDED: isSigningOut check
      
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Check if email is verified
      if (!isEmailVerified) {
        router.push('/auth/login');
        return;
      }

      if (allowedRoles && allowedRoles.length > 0) {
        try {
          // Check if user is admin using our security definer function
          const { data: isAdmin, error } = await supabase.rpc('is_current_user_admin');
          
          if (error) {
            logger.error('Error checking admin status', error);
            router.push('/');
            return;
          }

          // For admin role check
          if (allowedRoles.includes('admin') && !isAdmin) {
            router.push('/');
            return;
          }
        } catch (error) {
          logger.error('Error in role check', error);
          router.push('/');
        }
      }
    };

    checkAuth();
 }, [user, isLoading, isEmailVerified, isSigningOut, router, allowedRoles]); // ADDED: isSigningOut

  return { user, isLoading };
};
