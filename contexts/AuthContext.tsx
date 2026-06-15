'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { isValidRole, sanitizeRegistrationRole, UserRole } from '@/types/auth';
import { logger } from '@/lib/logger';
import { withTimeout, withRetry } from '@/lib/utils/async-utils';

interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  county: string;
  role: string;
  newsletterOptIn: boolean;
  authMethod?: string;
  businessName?: string;
  sellerId?: string;
  dbeId?: string;
  profileComplete?: boolean;
  avatarUrl?: string;
}

// Update the AuthContextType interface (around line 24)
interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole['role'] | null;
  isLoading: boolean;
  isEmailVerified: boolean;
  isSigningOut: boolean; // ADD THIS LINE
  signUp: (data: SignUpData) => Promise<void>;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signInWithGoogle: (preselectedRole?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<SignUpData>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendConfirmation: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Add state for isSigningOut (around line 47, after the other useState declarations)
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole['role'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isSigningOutState, setIsSigningOutState] = useState(false); // ADD THIS LINE
  const { toast } = useToast();

  
  // Refs to prevent race conditions
  const mounted = useRef(true);
  const authSubscription = useRef<any>(null);
  const isSigningOutRef = useRef(false);

  const clearAppAuthStorage = () => {
    if (typeof window === 'undefined') return;
    try {
      const sessionKeys: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key?.startsWith('user_role_') || key === 'dq_session_token') {
          sessionKeys.push(key);
        }
      }
      sessionKeys.forEach((key) => sessionStorage.removeItem(key));
      localStorage.removeItem('preselectedRole');
    } catch (storageError) {
      logger.warn('Error clearing app auth storage', storageError);
    }
  };

  // Fetch user role from secure user_roles table  
  const fetchUserRole = async (userId: string) => {
    if (!mounted.current || isSigningOutRef.current) return;
    
    try {
      logger.auth('Fetching user role', { userId });
      
      // Try to get cached role first for immediate display
      if (typeof window !== 'undefined') {
        const cachedRole = sessionStorage.getItem(`user_role_${userId}`);
        if (cachedRole && isValidRole(cachedRole)) {
          logger.auth('Using cached role', { role: cachedRole });
          if (mounted.current && !isSigningOutRef.current) {
            setRole(cachedRole as UserRole['role']);
          }
        }
      }
      
      // Run both checks in parallel with timeouts (maybeSingle avoids PGRST116 on 0 rows during races)
      const [adminCheckResult, profileResult] = await Promise.allSettled([
        // Check admin status with timeout
        withTimeout(
          supabase.rpc('is_current_user_admin'),
          5000,
          'Admin check timed out'
        ),
        // Fetch profile with timeout
        withTimeout(
          supabase
            .from('user_profiles')
            .select('role')
            .eq('id', userId)
            .maybeSingle(),
          5000,
          'Profile fetch timed out'
        )
      ]);
      
      if (!mounted.current || isSigningOutRef.current) return;
      
      // Check admin result
      let isAdmin = false;
      if (adminCheckResult.status === 'fulfilled') {
        const { data: adminData, error: adminError } = adminCheckResult.value;
        if (!adminError && adminData) {
          isAdmin = true;
        }
      } else {
        logger.warn('Admin check failed or timed out', adminCheckResult.reason);
      }
      
      if (isAdmin) {
        logger.auth('User is admin');
        if (mounted.current && !isSigningOutRef.current) {
          setRole('admin');
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(`user_role_${userId}`, 'admin');
          }
        }
        return;
      }
      
      // Check profile result
      let userRole: UserRole['role'] | null = null;
      if (profileResult.status === 'fulfilled') {
        let { data: profileData, error: profileError } = profileResult.value;

        // Transient empty reads after heavy writes (e.g. admin tools): retry before treating as deleted
        if (!profileError && !profileData?.role) {
          for (let attempt = 0; attempt < 2; attempt++) {
            await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
            if (!mounted.current || isSigningOutRef.current) return;
            const retry = await withTimeout(
              supabase
                .from('user_profiles')
                .select('role')
                .eq('id', userId)
                .maybeSingle(),
              5000,
              'Profile fetch timed out'
            );
            profileData = retry.data;
            profileError = retry.error;
            if (profileData?.role || profileError) break;
          }
        }

        if (!profileError && profileData?.role && isValidRole(profileData.role)) {
          userRole = profileData.role;
          logger.auth('User role set from user_profiles', { role: userRole });
        } else if (
          profileError?.code === 'PGRST116' ||
          (!profileError && !profileData)
        ) {
          let adminRecheck: boolean | null = null;
          try {
            const { data: adminData, error: adminError } = await withTimeout(
              supabase.rpc('is_current_user_admin'),
              5000,
              'Admin recheck timed out',
            );
            if (!adminError) {
              adminRecheck = adminData === true;
            }
          } catch {
            adminRecheck = null;
          }

          if (adminRecheck === true) {
            logger.auth('User is admin (profile row missing on first read; recheck)');
            if (mounted.current && !isSigningOutRef.current) {
              setRole('admin');
              if (typeof window !== 'undefined') {
                sessionStorage.setItem(`user_role_${userId}`, 'admin');
              }
            }
            return;
          }

          if (adminRecheck === null) {
            logger.warn('Admin recheck inconclusive under load, keeping session', { userId });
            return;
          }

          if (profileError?.code !== 'PGRST116' && profileData !== null) {
            logger.warn('Profile read inconclusive, keeping session', { userId, profileError });
            return;
          }

          logger.warn('User profile not found after retries — account may be deleted', { userId, error: profileError });
          
          if (mounted.current && !isSigningOutRef.current) {
            isSigningOutRef.current = true;
            setIsSigningOutState(true);
            setUser(null);
            setSession(null);
            setRole(null);
            setIsEmailVerified(false);
            setIsLoading(false);
            
            clearAppAuthStorage();

            if (typeof window !== 'undefined') {
              logger.auth('Redirecting deleted user to login immediately');
              try {
                await withTimeout(
                  supabase.auth.signOut({ scope: 'global' }),
                  10000,
                  'Sign out timed out'
                );
              } catch (signOutError) {
                logger.warn('Supabase signOut error for deleted user', signOutError);
              }
              window.location.replace('/auth/login?error=account_deleted');
            }
            
            return;
          }
          return;
        } else {
          logger.warn('No valid role found in profile, defaulting to buyer', { error: profileError });
          userRole = 'buyer';
        }
      } else {
        logger.warn('Profile fetch failed or timed out', profileResult.reason);
        // On timeout or failure, don't default to buyer - keep role as null
        // This prevents incorrect redirects
        userRole = null;
      }
      
      if (mounted.current && !isSigningOutRef.current) {
        if (userRole !== null) {
          setRole(userRole);
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(`user_role_${userId}`, userRole);
          }
        } else {
          // Role is null - don't set it, which will prevent dashboard redirects
          logger.warn('User role is null, not setting role to prevent incorrect redirects');
        }
      }
    } catch (error) {
      logger.error('Error fetching user role', error);
      // Don't default to buyer on error - this could cause incorrect redirects
      // Instead, keep role as null
      if (mounted.current && !isSigningOutRef.current) {
        logger.warn('Error fetching role, keeping role as null');
      }
    }
  };

  useEffect(() => {
    const setupAuth = async () => {
      logger.auth('Setting up authentication');
      
      // Set up auth state listener with improved error handling
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          logger.auth('Auth state changed', { event });

          if (!mounted.current) {
            return;
          }

          // Only clear auth state on an explicit sign-out — never on unrelated null sessions.
          if (event === 'SIGNED_OUT') {
            logger.auth('User signed out, clearing state');
            isSigningOutRef.current = false;
            setIsSigningOutState(false);
            setUser(null);
            setSession(null);
            setRole(null);
            setIsEmailVerified(false);
            setIsLoading(false);
            return;
          }

          if (event === 'INITIAL_SESSION' && !newSession?.user) {
            setUser(null);
            setSession(null);
            setRole(null);
            setIsEmailVerified(false);
            setIsLoading(false);
            return;
          }

          if (!newSession?.user) {
            return;
          }

          // Block TOKEN_REFRESHED / SIGNED_IN while logout is in flight
          if (isSigningOutRef.current) {
            logger.debug('Ignoring auth state change during sign out', { event });
            return;
          }

          const hasActiveSession = Boolean(newSession?.user);
          const isSessionEstablishingEvent =
            event === 'SIGNED_IN' ||
            event === 'TOKEN_REFRESHED' ||
            event === 'INITIAL_SESSION';

          try {

            // Handle password recovery - set session but don't fetch roles/redirect
            if (event === 'PASSWORD_RECOVERY' && newSession?.user) {
              logger.auth('Password recovery session detected');
              setSession(newSession);
              setUser(newSession.user);
              setIsLoading(false);
              return;
            }

            // Hydrate user from cookie session on load/refresh (INITIAL_SESSION is easy to miss).
            if (hasActiveSession && isSessionEstablishingEvent) {
              logger.auth('User session established', { event });
              setSession(newSession);
              setUser(newSession!.user);
              
              // Check email verification status
              const emailVerified = newSession!.user.email_confirmed_at !== null;
              setIsEmailVerified(emailVerified);
              
              if (!emailVerified) {
                logger.warn('User email not verified');
                setIsLoading(false);
                return;
              }
              
              if (mounted.current && !isSigningOutRef.current && newSession!.user.id) {
                const cachedRole = typeof window !== 'undefined' 
                  ? sessionStorage.getItem(`user_role_${newSession!.user.id}`)
                  : null;
                
                if (cachedRole && ['admin', 'seller', 'buyer', 'business'].includes(cachedRole)) {
                  setRole(cachedRole as 'admin' | 'seller' | 'buyer' | 'business');
                  setIsLoading(false);
                }
                
                fetchUserRole(newSession!.user.id).then(() => {
                  if (mounted.current && !isSigningOutRef.current) {
                    setIsLoading(false);
                  }
                });
              }
              return;
            }
          } catch (error) {
            logger.error('Error in auth state change', error);
            if (mounted.current && !isSigningOutRef.current) {
              setIsLoading(false);
            }
          }
        }
      );

      authSubscription.current = subscription;

      // Get initial session with better error handling
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          logger.error('Error getting initial session', error);
          if (mounted.current) {
            setIsLoading(false);
          }
          return;
        }

        logger.auth('Initial session check', { 
          userId: initialSession?.user?.id,
          emailVerified: initialSession?.user?.email_confirmed_at !== null
        });
        
        if (!mounted.current) {
          setIsLoading(false);
          return;
        }
        
        if (initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);
          
          // Check email verification status
          const emailVerified = initialSession.user.email_confirmed_at !== null;
          setIsEmailVerified(emailVerified);
          
          if (emailVerified) {
            fetchUserRole(initialSession.user.id)
              .then(() => {
                if (mounted.current) {
                  setIsLoading(false);
                }
              })
              .catch((error) => {
                logger.error('Error fetching role in initial setup', error);
                if (mounted.current) {
                  setIsLoading(false);
                }
              });
          } else {
            if (mounted.current) {
              setIsLoading(false);
            }
          }
        }
        // When getSession() is empty, INITIAL_SESSION may still arrive from cookie storage.
        // Do not set isLoading=false here — onAuthStateChange handles it.
        if (!initialSession?.user) {
          setTimeout(() => {
            if (mounted.current) {
              setIsLoading(false);
            }
          }, 12000);
        }
      } catch (error) {
        logger.error('Error in initial session setup', error);
        if (mounted.current) {
          setIsLoading(false);
        }
      }
    };

    setupAuth();

    return () => {
      mounted.current = false;
      if (authSubscription.current) {
        authSubscription.current.unsubscribe();
      }
    };
  }, []);

  const signUp = async (userData: SignUpData) => {
    try {
      setIsLoading(true);
      
      logger.auth('Starting signup process');
      
      const registrationRole = sanitizeRegistrationRole(userData.role);
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            phone: userData.phone || '',
            county: userData.county || '',
            role: registrationRole,
            newsletter_opt_in: userData.newsletterOptIn || false,
            business_name: userData.businessName || '',
            seller_id: userData.sellerId || '',
            dbe_id: userData.dbeId || '',
          },
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined
        }
      });

      if (error) {
        logger.error('Signup error', error);
        throw new Error(error.message || 'Registration failed');
      }

      logger.success('Signup successful');
      
      toast({
        title: "Account created successfully",
        description: "You can now sign in to your account.",
      });

    } catch (error: any) {
      logger.error('AuthContext signUp error', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'An unexpected error occurred during registration.';
      
      if (
        error.message?.includes('already registered') ||
        error.message?.includes('already exists') ||
        error.message?.includes('User already registered')
      ) {
        // WSTG-IDNT-04: do not confirm whether the email exists
        errorMessage =
          'Registration could not be completed. If you already have an account, sign in. Otherwise try again in a few minutes.';
      } else if (error.message?.includes('Invalid email')) {
        errorMessage = 'Please enter a valid email address';
      } else if (error.message?.includes('rate limit')) {
        errorMessage = 'Too many registration attempts. Please wait a few minutes before trying again.';
      }
      
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: errorMessage,
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string, rememberMe?: boolean) => {
    try {
      logger.auth('Attempting sign in');
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.error('Sign in error', error);
        throw error;
      }
      
      logger.success('Sign in successful');
    } catch (error: any) {
      logger.error('Sign in error', error);
      
      // WSTG-IDNT-04: same message for wrong credentials, unknown user, and unconfirmed email
      let errorMessage = 'Invalid email or password';
      if (error.message?.toLowerCase?.().includes('rate limit')) {
        errorMessage = 'Too many sign-in attempts. Please wait a few minutes and try again.';
      }
      
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: errorMessage
      });
      throw error;
    }
  };

  const signInWithGoogle = async (preselectedRole?: string) => {
    try {
      if (preselectedRole) {
        localStorage.setItem(
          'preselectedRole',
          sanitizeRegistrationRole(preselectedRole)
        );
      }
      
      const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
    queryParams: {
      access_type: 'offline',
      prompt: 'consent',
    }
  }
});


      if (error) throw error;
    } catch (error: any) {
      logger.error('Google sign in error', error);
      toast({
        variant: "destructive",
        title: "Google sign in failed",
        description: error.message?.toLowerCase?.().includes('rate limit')
          ? "Too many attempts. Please wait a few minutes and try again."
          : "We could not sign you in with Google. Please try again.",
      });
      throw error;
    }
  };

  const signOut = async () => {
    if (isSigningOutRef.current) {
      logger.auth('Sign out already in progress');
      return;
    }

    isSigningOutRef.current = true;
    setIsSigningOutState(true);
    logger.auth('Starting sign out process');

    try {
      // Update UI immediately; cookies are cleared by signOut below
      setUser(null);
      setSession(null);
      setRole(null);
      setIsEmailVerified(false);
      setIsLoading(false);

      const { error } = await withTimeout(
        supabase.auth.signOut({ scope: 'global' }),
        10000,
        'Sign out timed out'
      );

      if (error) {
        logger.warn('Supabase signOut error', error);
      }

      clearAppAuthStorage();
      logger.success('Sign out completed');

      if (typeof window !== 'undefined') {
        window.location.replace('/');
      }
    } catch (error: any) {
      logger.error('AuthContext sign out error', error);
      clearAppAuthStorage();
      if (typeof window !== 'undefined') {
        window.location.replace('/');
      }
      throw error;
    }
  };


  const updateProfile = async (data: Partial<SignUpData>) => {
  if (!user) throw new Error('No user logged in');

  try {
    // Ensure we have a valid session before attempting profile update
    const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !currentSession || !currentSession.user) {
      logger.error('No valid session found during profile update');
      throw new Error('Authentication session expired. Please sign in again.');
    }

    logger.auth('Valid session confirmed for profile update');

    // Retry mechanism for profile update
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        const safeRole =
          data.role !== undefined && data.role !== null
            ? sanitizeRegistrationRole(String(data.role))
            : undefined;
        const { error } = await supabase
          .from('user_profiles')
          .update({
            first_name: data.firstName,
            last_name: data.lastName,
            phone: data.phone,
            county: data.county,
            ...(safeRole !== undefined ? { role: safeRole } : {}),
            newsletter_opt_in: data.newsletterOptIn,
            business_name: data.businessName,
            seller_id: data.sellerId,
            dbe_id: data.dbeId,
            avatar_url: data.avatarUrl,
            profile_complete: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentSession.user.id);

        if (error) {
          logger.error(`Profile update attempt ${retryCount + 1} failed`, error);
          
          // If it's a permission error and we haven't reached max retries, wait and retry
          if (error.message.includes('permission denied') && retryCount < maxRetries - 1) {
            logger.debug(`Waiting before retry ${retryCount + 2}...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            retryCount++;
            continue;
          }
          
          throw error;
        }

        logger.success('Profile updated successfully');
        break; // Success, exit retry loop
        
      } catch (retryError: any) {
        if (retryCount >= maxRetries - 1) {
          throw retryError;
        }
        retryCount++;
        logger.debug(`Retrying profile update (${retryCount}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
  } catch (error: any) {
    logger.error('Update profile error', error);
    
    let errorMessage = error.message || "Failed to update profile";
    if (error.message?.includes('permission denied')) {
      errorMessage = "Authentication error occurred. Please try signing out and signing in again.";
    }
    
    toast({
      variant: "destructive",
      title: "Profile update failed",
      description: errorMessage
    });
    throw error;
  }
};


  const resetPassword = async (email: string) => {
    try {
      logger.auth('Starting password reset');
      
      // Route through server-side /auth/confirm to handle PKCE code exchange reliably
      // This fixes production issues where localStorage code_verifier is lost
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/confirm?next=/auth/reset-password&type=recovery`,
      });

      if (error?.message?.toLowerCase?.().includes('rate limit')) {
        logger.error('Reset password rate limited', error);
        throw error;
      }

      if (error) {
        // WSTG-IDNT-04: do not reveal whether the email is registered
        logger.warn('Password reset request completed with non-fatal auth error', error);
      } else {
        logger.success('Password reset email dispatched if account exists');
      }
      // Success UX: forgot-password page shows enumeration-safe copy (no duplicate toast here)
    } catch (error: any) {
      logger.error('Reset password error', error);
      
      let errorMessage = 'Unable to send reset email right now. Please try again later.';
      if (error.message?.toLowerCase?.().includes('rate limit')) {
        errorMessage = 'Too many reset attempts. Please wait a few minutes before trying again.';
      }
      
      toast({
        variant: "destructive",
        title: "Reset password failed",
        description: errorMessage
      });
      throw error;
    }
  };

  const resendConfirmation = async () => {
    if (!user?.email) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No email address found"
      });
      return;
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email
      });

      if (error) throw error;

      toast({
        title: "Confirmation email sent",
        description: "Please check your email for the confirmation link."
      });
    } catch (error: any) {
      logger.error('Resend confirmation error', error);
      toast({
        variant: "destructive",
        title: "Failed to resend confirmation",
        description:
          "We could not send the email right now. Please wait a few minutes and try again.",
      });
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user?.email) {
      throw new Error('No user logged in');
    }

    try {
      // First verify the current password by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (verifyError) {
        logger.error('Current password verification failed', verifyError);
        throw new Error('Current password is incorrect');
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        logger.error('Password update failed', updateError);
        throw updateError;
      }

      logger.success('Password updated successfully');
      
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });

    } catch (error: any) {
      logger.error('Change password error', error);
      
      let errorMessage = error.message || "Failed to change password";
      if (error.message?.includes('Current password is incorrect')) {
        errorMessage = "Current password is incorrect";
      } else if (error.message?.includes('Password should be at least')) {
        errorMessage = "New password does not meet security requirements";
      }
      
      toast({
        variant: "destructive",
        title: "Password change failed",
        description: errorMessage
      });
      throw error;
    }
  };

 // Update the context value object (at the end of AuthProvider, around line 550)
const value = {
  user,
  session,
  role,
  isLoading,
  isEmailVerified,
  isSigningOut: isSigningOutState, // ADD THIS LINE
  signUp,
  signIn,
  signInWithGoogle,
  signOut,
  updateProfile,
  resetPassword,
  resendConfirmation,
  changePassword,
};

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
