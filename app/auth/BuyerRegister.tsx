'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import AuthLayout from "@/components/auth/AuthLayout";
import { Mail, Lock, Loader2, User, MapPin, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { irishCounties } from "@/lib/utils/irish-data";

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

const buyerSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }).max(20, { message: "First name must be 20 characters or less" }),
  lastName: z.string().min(1, { message: "Last name is required" }).max(20, { message: "Last name must be 20 characters or less" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  phone: z.string().optional(),
  county: z.string().min(1, { message: "County is required" }),
  password: passwordSchema,
  confirmPassword: z.string(),
  newsletterOptIn: z.boolean(),
  termsAccepted: z.literal(true, {
    message: "You must accept the terms and conditions",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type BuyerFormData = z.infer<typeof buyerSchema>;

export default function BuyerRegister() {
  const { signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  const form = useForm<BuyerFormData>({
    resolver: zodResolver(buyerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      county: "",
      password: "",
      confirmPassword: "",
      newsletterOptIn: true,
      termsAccepted: false as any,
    },
  });

  const onSubmit = async (data: BuyerFormData) => {
    try {
      setIsLoading(true);

      await signUp({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || "",
        county: data.county,
        role: "buyer",
        newsletterOptIn: data.newsletterOptIn,
        authMethod: "email_password",
        profileComplete: true
      });

      toast({
        title: `Welcome to Dog Quest, ${data.firstName}!`,
        description: "Your account has been created successfully.",
      });

      router.push('/auth/login');
    } catch (error: any) {
      console.error('Signup error:', error);

      // Handle specific error messages
      if (error.message?.includes('User already registered') ||
        error.message?.includes('email_exists') ||
        error.message?.includes('already been registered')) {
        toast({
          variant: "destructive",
          title: "Account already exists",
          description: "An account with this email address already exists. Please try signing in instead.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Registration failed",
          description: error.message || "An error occurred during registration. Please try again.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };


  // Password strength indicators
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

  return (
    <AuthLayout
      title="Create your buyer account"
      description="Join Dog Quest to find your perfect companion"
    >
      <div className="space-y-6">


        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input placeholder="John" className="pl-10" maxLength={20} {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input placeholder="Doe" className="pl-10" maxLength={20} {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input placeholder="name@example.com" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="+353 123 456 789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="county"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>County</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className="pl-10">
                          <SelectValue placeholder="Select a county" />
                        </SelectTrigger>
                        <SelectContent>
                          {irishCounties.map((county) => (
                            <SelectItem key={county} value={county}>
                              {county}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setPassword(e.target.value);
                        }}
                      />
                      <div
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setShowPassword(!showPassword);
                          }
                        }}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </div>
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
                        8+ characters
                      </span>
                    </div>
                    <div className="flex items-center text-xs">
                      {hasUppercase ? (
                        <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1 text-gray-300" />
                      )}
                      <span className={hasUppercase ? "text-green-600" : "text-gray-500"}>
                        Uppercase
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
                        Special char
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
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setConfirmPassword(e.target.value);
                        }}
                      />
                      <div
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setShowConfirmPassword(!showConfirmPassword);
                          }
                        }}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newsletterOptIn"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm">
                      Subscribe to our newsletter for dog care tips and updates
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="termsAccepted"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm">
                      I agree to the{" "}
                      <Link href="/terms" className="text-brand-dark-green hover:underline">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy-policy" className="text-brand-dark-green hover:underline">
                        Privacy Policy
                      </Link>
                    </FormLabel>
                  </div>
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
                  Creating account...
                </>
              ) : (
                "Create buyer account"
              )}
            </Button>
          </form>
        </Form>

        <div className="flex items-center justify-center space-x-1 text-sm">
          <span className="text-gray-600">Changed your mind?</span>
          <Button
            variant="link"
            className="text-brand-dark-green hover:underline p-0 h-auto"
            onClick={() => router.push("/auth/role-selection")}
          >
            Choose a different role
          </Button>
        </div>

        <p className="text-sm text-center text-gray-600">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-brand-dark-green hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
