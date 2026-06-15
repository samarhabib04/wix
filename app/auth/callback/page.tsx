'use client';

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PuppyStarterKitModal } from "@/components/PuppyStarterKitModal";
import { ColourCodedCollarsModal } from "@/components/ColourCodedCollarsModal";
import { withTimeout } from "@/lib/utils/async-utils";
import { sanitizeRegistrationRole } from "@/types/auth";

function AuthCallbackInner() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState<string>('Initializing...');
  const [showPuppyKitModal, setShowPuppyKitModal] = useState(false);
  const [showCollarsModal, setShowCollarsModal] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check for PKCE code in query params and exchange it first
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }

        // Recovery links should always go to reset-password so the token hash can be consumed there.
        if (typeof window !== "undefined") {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          if (hashParams.get("type") === "recovery" && hashParams.get("access_token")) {
            router.replace(`/auth/reset-password${window.location.hash}`);
            return;
          }
        }

        setLoadingStep('Checking your session...');
        const { data: { session }, error } = await withTimeout(
          supabase.auth.getSession(),
          5000,
          'Session check timed out'
        );

        if (error) throw error;

        if (!session) {
          throw new Error("No session found");
        }

        // If this is a recovery session, redirect to reset-password
        if (session.user?.recovery_sent_at) {
          const recoverySentAt = new Date(session.user.recovery_sent_at).getTime();
          const now = Date.now();
          const fiveMinutes = 5 * 60 * 1000;
          if (now - recoverySentAt < fiveMinutes) {
            router.replace('/auth/reset-password');
            return;
          }
        }

        setLoadingStep('Verifying your email...');
        // Check if email is verified
        if (!session.user.email_confirmed_at) {

          toast({
            title: "Email verification required",
            description: "Please verify your email address before accessing your dashboard.",
            variant: "destructive",
          });
          router.replace('/auth/login');
          return;
        }

        setLoadingStep('Loading your profile...');
        // Fetch user data in parallel with timeout
        const [userRolesResult, profileResult] = await Promise.allSettled([
          // Get role from user_roles table
          withTimeout(
            supabase
              .from('user_roles' as any)
              .select('*')
              .eq('user_id', session.user.id)
              .limit(1)
              .maybeSingle() as any,
            5000,
            'User roles fetch timed out'
          ),
          // Check database for profile completion
          withTimeout(
            supabase
              .from('user_profiles')
              .select('role, is_admin, profile_complete')
              .eq('id', session.user.id)
              .maybeSingle(),
            5000,
            'Profile fetch timed out'
          )
        ]);

        // Extract data from results with proper typing
        const userRoleData = userRolesResult.status === 'fulfilled' 
          ? (userRolesResult.value as { data: any }).data 
          : null;
        const profileData = profileResult.status === 'fulfilled' 
          ? (profileResult.value as { data: any }).data 
          : null;
        const profileError = profileResult.status === 'fulfilled' 
          ? (profileResult.value as { error: any }).error 
          : profileResult.reason;

        // Handle missing profile - create fallback for Google users
        if (profileError || !profileData) {

          // Attempt to create profile for Google users or other missing profiles
          const authMethod = session.user.app_metadata?.provider || 'email';
          const rawPreselected =
            typeof window !== 'undefined' ? localStorage.getItem('preselectedRole') || 'buyer' : 'buyer';
          const fallbackRole = sanitizeRegistrationRole(rawPreselected);

          try {
            const { error: insertError } = await supabase
              .from('user_profiles')
              .insert({
                id: session.user.id,
                first_name: session.user.user_metadata?.first_name || '',
                last_name: session.user.user_metadata?.last_name || '',
                email: session.user.email,
                role: fallbackRole,
                auth_method: authMethod,
                profile_complete: false,
                newsletter_opt_in: false,
                phone: '',
                county: '',
                business_name: '',
                seller_id: '',
                dbe_id: '',
                avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null
              });

            // Also insert into user_roles table
            if (!insertError) {
              await supabase
                .from('user_roles')
                .upsert(
                  { user_id: session.user.id, role: fallbackRole },
                  { onConflict: 'user_id,role' }
                );
            }

            if (insertError) {
              console.error('Failed to create fallback profile:', insertError);
            } else {

              // Wait a moment for database consistency
              await new Promise(resolve => setTimeout(resolve, 100));
            }

          } catch (createError) {
            console.error('Error creating fallback profile:', createError);
          }

          // After attempting to create profile, redirect to onboarding
          router.replace('/auth/onboarding');
          return;
        }

        setLoadingStep('Checking permissions...');
        // Check if user is admin first - admins bypass all other checks
        const isAdmin = profileData.is_admin === true;
        if (isAdmin) {

          const firstName = session.user.user_metadata?.first_name || '';
          toast({
            title: firstName ? `Welcome back, ${firstName}!` : "Welcome back to Dog Quest!",
            description: "You've successfully signed in as an admin",
          });

          if (typeof window !== 'undefined') {
            window.location.replace('/admin-dashboard');
          } else {
            router.replace('/admin-dashboard');
          }
          return;
        }

        // For non-admin users, check if profile is complete (DATABASE ONLY)
        if (!profileData.profile_complete) {

          router.replace('/auth/onboarding');
          return;
        }
        
        setLoadingStep('Preparing your dashboard...');

        // Get user role from user_roles table (single source of truth), fallback to profile
        let userRole = sanitizeRegistrationRole(
          String(userRoleData?.role ?? profileData.role ?? 'buyer')
        );

        // Backfill user_roles if missing
        if (!userRoleData && profileData.role) {
          const safeRole = sanitizeRegistrationRole(profileData.role);
          await supabase
            .from('user_roles')
            .upsert(
              { user_id: session.user.id, role: safeRole },
              { onConflict: 'user_id,role' }
            );
          userRole = safeRole;
        }

        // Check for special redirects
        const fromQuizLogin = typeof window !== 'undefined' ? sessionStorage.getItem('fromQuizLogin') : null;
        if (fromQuizLogin) {
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('fromQuizLogin');
          }
          router.replace('/quiz');
          return;
        }

        // Check for checkout redirect from search params
        const fromParam = searchParams.get('from');
        if (fromParam === '/checkout') {
          router.replace('/checkout');
          return;
        }

        // Check if we should show modals for new users
        // Check URL hash for signup indicators
        const hash = typeof window !== 'undefined' ? window.location.hash : '';
        const hasConfirmationFragment = hash.includes('access_token=') && hash.includes('type=signup');

        const shouldShowPuppyKitModal = (
          userRole === 'buyer' &&
          hasConfirmationFragment &&
          typeof window !== 'undefined' &&
          !localStorage.getItem('puppyStarterKitModalSeen')
        );

        const shouldShowCollarsModal = (
          (userRole === 'seller' || userRole === 'business') &&
          hasConfirmationFragment &&
          typeof window !== 'undefined' &&
          !localStorage.getItem('colourCodedCollarsModalSeen')
        );

        // Show welcome message only for successful auth callback
        const firstName = session.user.user_metadata?.first_name || '';
        toast({
          title: firstName ? `Welcome back, ${firstName}!` : "Welcome back to Dog Quest!",
          description: "You've successfully signed in",
        });

        // Show modals if needed, otherwise redirect
        if (shouldShowPuppyKitModal) {
          setShowPuppyKitModal(true);
          setIsLoading(false);
          // Don't navigate yet - let the modal handle the next step
        } else if (shouldShowCollarsModal) {
          setShowCollarsModal(true);
          setIsLoading(false);
          // Don't navigate yet - let the modal handle the next step
        } else {
          // Redirect based on role from database

          if (isAdmin) {
            if (typeof window !== 'undefined') {
              window.location.replace('/admin-dashboard');
            } else {
              router.replace('/admin-dashboard');
            }
          } else if (userRole === 'seller') {
            router.replace('/my-seller-dashboard');
          } else if (userRole === 'business') {
            router.replace('/my-business-dashboard');
          } else {
            router.replace('/my-buyer-dashboard');
          }
        }
      } catch (error: any) {
        console.error("Error during authentication callback:", error);
        toast({
          variant: "destructive",
          title: "Authentication error",
          description: error.message || "There was a problem with the authentication process",
        });
        router.replace('/auth/login');
      } finally {
        setIsLoading(false);
      }
    };

    handleAuthCallback();
  }, [router, toast, searchParams]);

  const handlePuppyKitModalClose = () => {
    setShowPuppyKitModal(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('puppyStarterKitModalSeen', 'true');
    }
    // Navigate to buyer dashboard after modal is closed
    router.replace('/my-buyer-dashboard');
  };

  const handleCollarsModalClose = () => {
    setShowCollarsModal(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('colourCodedCollarsModalSeen', 'true');
    }
    // Navigate to seller dashboard after modal is closed
    router.replace('/my-seller-dashboard');
  };

  if (showPuppyKitModal) {
    return (
      <PuppyStarterKitModal
        isOpen={showPuppyKitModal}
        onClose={handlePuppyKitModalClose}
      />
    );
  }

  if (showCollarsModal) {
    return (
      <ColourCodedCollarsModal
        isOpen={showCollarsModal}
        onClose={handleCollarsModalClose}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#E1E8E0]">
      <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6">Authenticating...</h1>
        <div className="flex justify-center">
          <div className="w-12 h-12 border-4 border-brand-dark-green border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-center mt-6 text-gray-600">
          {loadingStep}
        </p>
        <p className="text-center mt-2 text-sm text-gray-400">
          This should only take a few seconds
        </p>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#E1E8E0]">
          <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full">
            <h1 className="text-2xl font-bold text-center mb-6">Authenticating...</h1>
            <div className="flex justify-center">
              <div className="w-12 h-12 border-4 border-brand-dark-green border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-center mt-6 text-gray-600">
              Please wait while we complete your authentication
            </p>
          </div>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}

