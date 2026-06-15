'use client';

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import AuthLayout from "@/components/auth/AuthLayout";
import { Lock, Loader2, CheckCircle2, XCircle } from "lucide-react";

const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters" })
  .refine((value) => /[A-Z]/.test(value), {
    message: "Password must contain at least one uppercase letter",
  })
  .refine((value) => /[0-9]/.test(value), {
    message: "Password must contain at least one number",
  })
  .refine((value) => /[^A-Za-z0-9]/.test(value), {
    message: "Password must contain at least one special character",
  });

const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordInner() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Handle both PKCE code exchange and implicit flow hash fragments
  useEffect(() => {
    const establishSession = async () => {
      try {
        // Method 1: PKCE flow - exchange code from query parameter
        const code = searchParams.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('Code exchange error:', error);
            toast({
              title: "Reset link expired",
              description: "Please request a new password reset link.",
              variant: "destructive",
            });
            router.replace('/auth/forgot-password');
            return;
          }
          window.history.replaceState(null, '', window.location.pathname);
          setSessionReady(true);
          setIsInitializing(false);
          return;
        }

        // Method 2: Implicit flow - tokens in hash fragment
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (error) {
            console.error('Session set error:', error);
            toast({
              title: "Reset link expired",
              description: "Please request a new password reset link.",
              variant: "destructive",
            });
            router.replace('/auth/forgot-password');
            return;
          }
          window.history.replaceState(null, '', window.location.pathname);
          setSessionReady(true);
          setIsInitializing(false);
          return;
        }

        // Method 3: Session may already exist (auto-detected by Supabase client)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSessionReady(true);
          setIsInitializing(false);
          return;
        }

        // No token/code/session found - invalid reset link
        toast({
          title: "Invalid reset link",
          description: "Please request a new password reset link.",
          variant: "destructive",
        });
        router.replace('/auth/forgot-password');
      } catch (error: any) {
        console.error('Error establishing session for password reset:', error);
        toast({
          title: "Error",
          description: "Something went wrong. Please request a new reset link.",
          variant: "destructive",
        });
        router.replace('/auth/forgot-password');
      }
    };

    establishSession();
  }, [toast, searchParams, router]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });
      
      if (error) throw error;
      
      setIsSubmitted(true);
      toast({
        title: "Password updated",
        description: "Your password has been successfully updated",
      });
    } catch (error: any) {
      toast({
        title: "Error resetting password",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check password requirements
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

  if (isInitializing) {
    return (
      <AuthLayout
        title="Preparing password reset"
        description="Please wait while we verify your reset link"
      >
        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-brand-dark-green" />
          <p className="text-sm text-gray-500">Verifying your reset link...</p>
        </div>
      </AuthLayout>
    );
  }

  if (isSubmitted) {
    return (
      <AuthLayout 
        title="Password reset successful" 
        description="You can now sign in with your new password"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-center">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <p className="text-center text-gray-600">
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
          
          <Button
            onClick={() => router.push("/auth/login")}
            className="w-full bg-brand-dark-green hover:bg-brand-dark-green/90"
          >
            Go to sign in
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout 
      title="Reset your password" 
      description="Enter a new password for your account"
    >
      <div className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        className="pl-10" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e);
                          setPassword(e.target.value);
                        }}
                      />
                    </div>
                  </FormControl>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="flex items-center text-xs">
                      {hasMinLength ? (
                        <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1 text-gray-300" />
                      )}
                      <span className={hasMinLength ? "text-green-600" : "text-gray-500"}>
                        At least 8 characters
                      </span>
                    </div>
                    <div className="flex items-center text-xs">
                      {hasUppercase ? (
                        <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1 text-gray-300" />
                      )}
                      <span className={hasUppercase ? "text-green-600" : "text-gray-500"}>
                        Uppercase letter
                      </span>
                    </div>
                    <div className="flex items-center text-xs">
                      {hasNumber ? (
                        <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1 text-gray-300" />
                      )}
                      <span className={hasNumber ? "text-green-600" : "text-gray-500"}>
                        Number
                      </span>
                    </div>
                    <div className="flex items-center text-xs">
                      {hasSpecialChar ? (
                        <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1 text-gray-300" />
                      )}
                      <span className={hasSpecialChar ? "text-green-600" : "text-gray-500"}>
                        Special character
                      </span>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        className="pl-10" 
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
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
                  Resetting password...
                </>
              ) : (
                "Reset password"
              )}
            </Button>
          </form>
        </Form>

        <p className="text-sm text-center text-gray-600">
          Remember your password?{" "}
          <Link href="/auth/login" className="text-brand-dark-green hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default function ResetPassword() {
  return (
    <Suspense
      fallback={
        <AuthLayout
          title="Preparing password reset"
          description="Please wait while we verify your reset link"
        >
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-brand-dark-green" />
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        </AuthLayout>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
