'use client';

import { Suspense, useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import AuthLayout from "@/components/auth/AuthLayout";
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
  rememberMe: z.boolean(),
});

type LoginFormData = z.infer<typeof loginSchema>;

function isSafeInternalPath(path: string): boolean {
  const p = path.trim();
  return p.startsWith('/') && !p.startsWith('//') && !p.includes('://') && !p.includes('\\');
}

function LoginPageInner() {
  const { signIn, user, isLoading: authLoading, isEmailVerified, role } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [maxWaitTimeReached, setMaxWaitTimeReached] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // If Supabase recovery tokens land on /auth/login, forward to reset page immediately.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash) return;

    const hashParams = new URLSearchParams(hash.substring(1));
    const type = hashParams.get("type");
    const accessToken = hashParams.get("access_token");

    if (type === "recovery" && accessToken) {
      router.replace(`/auth/reset-password${hash}`);
    }
  }, [router]);

  // Set a maximum wait time for auth loading (3 seconds)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setMaxWaitTimeReached(true);
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, []);

  // Toggle handler for password visibility (works on both mobile and desktop)
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  // If user is already logged in, redirect based on next parameter or to callback
  useEffect(() => {
    // Wait for auth to load or max wait time
    if (authLoading && !maxWaitTimeReached) return;

    if (user) {
      // Check if email is verified before redirecting
      if (!isEmailVerified) {
        // Don't redirect, stay on login page to show verification message
        return;
      }

      // Get the redirect URL from the 'next' query parameter
      const nextUrl = searchParams.get('next');

      if (nextUrl) {
        // Redirect to the originally requested URL
        const decodedUrl = decodeURIComponent(nextUrl);

        // Clear any redirect flags
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('redirectingToLogin');
        }
        // Full navigation: App Router client replace sometimes fails after sign-in, leaving users on /auth/login?next=…
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.replace(decodedUrl);
          } else {
            router.replace(decodedUrl);
          }
        }, 100);
      } else {
        // Handle special cases for quiz and checkout
        const fromQuizLogin = typeof window !== 'undefined' ? sessionStorage.getItem('fromQuizLogin') : null;

        setTimeout(() => {
          if (typeof window !== 'undefined') {
            if (fromQuizLogin) {
              window.location.replace('/quiz');
            } else {
              window.location.replace('/auth/callback');
            }
          } else if (fromQuizLogin) {
            router.replace('/quiz');
          } else {
            router.replace('/auth/callback');
          }
        }, 100);
      }
    }
  }, [user, authLoading, isEmailVerified, router, searchParams, maxWaitTimeReached]);

  // Show loading only if auth is loading AND max wait time not reached
  // This prevents infinite loading if auth context gets stuck
  if (authLoading && !maxWaitTimeReached) {
    return (
      <AuthLayout
        title="Loading..."
        description="Please wait while we check your authentication status"
      >
        <div className="flex justify-center my-10">
          <div className="w-12 h-12 border-4 border-brand-dark-green border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AuthLayout>
    );
  }

  if (user && !isEmailVerified) {
    return (
      <AuthLayout
        title="Email Verification Required"
        description="Please verify your email address to continue"
      >
        <div className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please check your email and click the confirmation link to verify your account before accessing your dashboard.
            </AlertDescription>
          </Alert>

          <Button
            onClick={() => window.location.reload()}
            className="w-full bg-brand-dark-green hover:bg-brand-dark-green/90"
          >
            I've verified my email - Continue
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (user && isEmailVerified) {
    return (
      <AuthLayout
        title="Taking you to your account…"
        description="Almost there — please wait."
      >
        <div className="flex flex-col items-center justify-center my-10 gap-4">
          <div className="w-12 h-12 border-4 border-brand-dark-green border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground text-center">
            If nothing happens in a few seconds,{" "}
            <button
              type="button"
              className="text-brand-dark-green underline font-medium"
              onClick={() => {
                const nextUrl = searchParams.get("next");
                if (nextUrl && isSafeInternalPath(decodeURIComponent(nextUrl))) {
                  window.location.href = decodeURIComponent(nextUrl);
                } else {
                  window.location.href = "/auth/callback";
                }
              }}
            >
              tap here to continue
            </button>
            .
          </p>
        </div>
      </AuthLayout>
    );
  }

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      // Do not call get_auth_method_by_email (DogQuest-2026-004): it enabled auth-method enumeration.
      await signIn(data.email, data.password, data.rememberMe);

      // Ensure cookie-backed session is written before full navigation (SSR middleware reads cookies only).
      await supabase.auth.getSession();
      await new Promise((r) => setTimeout(r, 150));

      const nextRaw = searchParams.get('next');
      const fallback = '/auth/callback';
      if (typeof window !== 'undefined') {
        if (nextRaw) {
          const decoded = decodeURIComponent(nextRaw);
          window.location.href = isSafeInternalPath(decoded) ? decoded : fallback;
        } else {
          const fromQuiz = sessionStorage.getItem('fromQuizLogin');
          window.location.href = fromQuiz ? '/quiz' : fallback;
        }
      }

      // Rare: navigation blocked — unlock button after delay so user can retry / use link
      window.setTimeout(() => setIsLoading(false), 10000);

    } catch (error) {
      console.error("Login error:", error);
      // Only clear loading on error
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Log in to your account"
      description="Welcome back to Dog Quest"
    >
      <div className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" autoComplete="on">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="name@example.com"
                        className="pl-10"
                        autoComplete="email"
                        type="email"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <Link
                      href="/auth/forgot-password"
                      className="text-xs text-brand-dark-green hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                        autoComplete="current-password"
                        {...field}
                      />
                      <div
                        onClick={togglePasswordVisibility}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            togglePasswordVisibility();
                          }
                        }}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rememberMe"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-normal">
                    Remember me for 30 days
                  </FormLabel>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-brand-dark-green hover:bg-brand-dark-green/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </Form>

        <p className="text-sm text-center text-gray-600">
          Don't have an account?{" "}
          <Link href="/auth/role-selection" className="text-brand-dark-green hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default function LoginPage() {
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
      <LoginPageInner />
    </Suspense>
  );
}

