
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import AuthLayout from "@/components/auth/AuthLayout";
import { toast } from "@/hooks/use-toast";
import { Mail, Lock, Loader2, User, Phone, MapPin, Building, CheckCircle2, XCircle, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { irishCounties, validateIrishPhoneNumber } from "@/lib/utils/irish-data";
import PhoneVerification from "@/components/auth/PhoneVerification";

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

const phoneSchema = z.string().refine(validateIrishPhoneNumber, {
  message: "Please enter a valid phone number (South Africa, USA, Ireland, or Canada)",
});

const businessSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  businessName: z.string().min(1, { message: "Business name is required" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  phone: phoneSchema,
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

type BusinessFormData = z.input<typeof businessSchema>;

export default function BusinessRegister() {
  const { signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const router = useRouter();

  const form = useForm<BusinessFormData>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      businessName: "",
      email: "",
      phone: "",
      county: "",
      password: "",
      confirmPassword: "",
      newsletterOptIn: true,
      termsAccepted: false as any,
    },
  });

  const watchedPhone = form.watch("phone");

  const onSubmit = async (data: z.output<typeof businessSchema>) => {
    if (!isPhoneVerified) {
      toast({
        variant: "destructive",
        title: "Phone Verification Required",
        description: "Please verify your phone number before registering"
      });
      return;
    }

    try {
      setIsLoading(true);

      // Store role in localStorage for auth callback fallback
      localStorage.setItem('preselectedRole', 'business');

      await signUp({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        county: data.county,
        role: "business",
        newsletterOptIn: data.newsletterOptIn,
        authMethod: "email_password",
        businessName: data.businessName,
        profileComplete: true
      });

      router.push('/auth/login');
    } catch (error) {
      console.error(error);
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
      title="Create your business account"
      description="Join Dog Quest as a trusted service provider"
    >
      <div className="space-y-6">


        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Name</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input placeholder="ABC Veterinary Clinic" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                        <Input placeholder="John" className="pl-10" {...field} />
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
                        <Input placeholder="Doe" className="pl-10" {...field} />
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

            {/* <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-900">
                <strong>Important:</strong> Please include your country code prefix when entering your phone number.
                <ul className="mt-2 ml-4 list-disc space-y-1">
                  <li><strong>Ireland:</strong> Use +353 and drop the first 0 (e.g., 087 123 4567 → +353 87 123 4567)</li>
                  <li><strong>UK/NI:</strong> Use +44 and drop the first 0 (e.g., 07123 456789 → +44 7123 456789)</li>
                  <li><strong>Other countries:</strong> Include country code with + prefix</li>
                </ul>
              </AlertDescription>
            </Alert> */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="+353 87 123 4567"
                        className="pl-10"
                        {...field}
                        maxLength={20}
                        onInput={(e) => {
                          const target = e.target as HTMLInputElement;
                          target.value = target.value.replace(/[^0-9\s\-\+\(\)]/g, '');
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    For Ireland: Enter as +353 87 123 4567 (drop the first 0). For UK: +44 7XXX XXX XXX. Include country code for other countries.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedPhone && validateIrishPhoneNumber(watchedPhone) && (
              <PhoneVerification
                phone={watchedPhone}
                onVerified={setIsPhoneVerified}
                isRequired={true}
              />
            )}

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
                      Subscribe to our newsletter for business tips and marketplace updates
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
              disabled={isLoading || !isPhoneVerified}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create business account"
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
