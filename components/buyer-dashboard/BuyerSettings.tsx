
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AvatarUploader } from "@/components/ui/avatar-uploader";
import { PasswordChangeCard } from "./PasswordChangeCard";
import { SellerConversion } from "./SellerConversion";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { irishCounties, validateIrishPhoneNumber } from "@/lib/utils/irish-data";

const formSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters."),
  lastName: z.string().min(2, "Last name must be at least 2 characters."),
  email: z.string().email(),
  phone: z.string().optional().refine((phone) => {
    if (!phone || phone.trim() === '') return true; // Optional field
    return validateIrishPhoneNumber(phone);
  }, {
    message: "Please enter a valid phone number (South Africa, USA, Ireland, or Canada)"
  }),
  county: z.string(),
  newsletterOptIn: z.boolean(),
  avatarUrl: z.string().optional()
});

export const BuyerSettings = () => {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingNewsletter, setIsUpdatingNewsletter] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      county: "",
      newsletterOptIn: false,
      avatarUrl: ""
    }
  });

  // Helper function to add cache-busting parameter to URL
  const addCacheBusting = (url: string | null) => {
    if (!url) return null;
    const timestamp = Date.now();
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}cb=${timestamp}`;
  };

  // Fetch user profile data from Supabase
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      try {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching user profile:', error);
          toast({
            variant: "destructive",
            title: "Error loading profile",
            description: "Unable to load your profile data. Please try again."
          });
          return;
        }

        if (profile) {
          form.reset({
            firstName: profile.first_name || "",
            lastName: profile.last_name || "",
            email: user.email || "",
            phone: profile.phone || "",
            county: profile.county || "",
            newsletterOptIn: profile.newsletter_opt_in || false,
            avatarUrl: profile.avatar_url || ""
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load profile information."
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [user, form, toast]);

  // Handle immediate avatar update with cache busting
  const handleImmediateAvatarUpdate = async (avatarUrl: string | null) => {
    if (!user?.id) {
      throw new Error("User not found");
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating avatar:', error);
        throw new Error("Failed to save avatar to database");
      }

      // Update the form value to keep it in sync
      form.setValue('avatarUrl', avatarUrl || '');
      
      // Force a re-render by updating the form's avatar URL with cache busting
      // This ensures the UI reflects the change immediately
      if (avatarUrl) {
        const cacheBustedUrl = addCacheBusting(avatarUrl);

      }
    } catch (error) {
      console.error('Error in immediate avatar update:', error);
      throw error;
    }
  };

  // Handle newsletter subscription changes
  const handleNewsletterChange = async (checked: boolean) => {
    if (!user?.email) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User email not found."
      });
      return;
    }

    setIsUpdatingNewsletter(true);
    
    try {
      // Update the form value
      form.setValue('newsletterOptIn', checked);
      
      // Update database
      const { error } = await supabase
        .from('user_profiles')
        .update({
          newsletter_opt_in: checked,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating newsletter preference in database:', error);
        throw new Error('Failed to update newsletter preference');
      }

      toast({
        title: "Newsletter subscription updated",
        description: checked 
          ? "You have been subscribed to our newsletter."
          : "You have been unsubscribed from our newsletter."
      });

    } catch (error) {
      console.error('Error updating newsletter subscription:', error);
      
      // Revert the switch to its previous state
      const currentDbValue = form.getValues('newsletterOptIn');
      form.setValue('newsletterOptIn', currentDbValue);
      
      toast({
        variant: "destructive",
        title: "Newsletter update failed",
        description: error instanceof Error ? error.message : "Failed to update newsletter subscription."
      });
    } finally {
      setIsUpdatingNewsletter(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User not found. Please try logging in again."
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          first_name: values.firstName,
          last_name: values.lastName,
          phone: values.phone,
          county: values.county,
          newsletter_opt_in: values.newsletterOptIn,
          avatar_url: values.avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        toast({
          variant: "destructive",
          title: "Update failed",
          description: "Could not update your profile. Please try again."
        });
        return;
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully."
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "An unexpected error occurred. Please try again."
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setIsDeleting(true);
    try {

      // Call the edge function to delete all user data
      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) {
        console.error('Error calling delete function:', error);
        throw new Error(error.message || 'Failed to delete account');
      }

      if (data?.error) {
        console.error('Error from delete function:', data.error);
        throw new Error(data.error);
      }

      // Show success message
      toast({
        title: "Account Deleted",
        description: "Your account and all associated data have been permanently deleted.",
        variant: "default",
      });

      // Automatically sign out the user and clear session
      await signOut();

      // Navigate to home page after signing out
      router.push('/');

    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error deleting account",
        description: error.message || "There was a problem deleting your account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePhoneInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow backspace, delete, tab, escape, enter, and arrow keys
    if ([8, 9, 27, 13, 37, 38, 39, 40, 46].indexOf(e.keyCode) !== -1 ||
        // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.keyCode === 65 && e.ctrlKey === true) ||
        (e.keyCode === 67 && e.ctrlKey === true) ||
        (e.keyCode === 86 && e.ctrlKey === true) ||
        (e.keyCode === 88 && e.ctrlKey === true)) {
      return;
    }
    
    // Only allow digits, space, dash, parentheses, and plus sign
    const char = String.fromCharCode(e.keyCode);
    if (!/[\d\s\-()+ ]/.test(char)) {
      e.preventDefault();
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove any invalid characters and limit length
    let value = e.target.value.replace(/[^\d\s\-()+ ]/g, '');
    
    // Limit to 20 characters (generous limit for international formats)
    if (value.length > 20) {
      value = value.substring(0, 20);
    }
    
    return value;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-soft-green mx-auto mb-2"></div>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your account details</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center">
                    <FormLabel>Profile Picture</FormLabel>
                    <FormControl>
                      <AvatarUploader
                        value={field.value || null}
                        onChange={(url) => field.onChange(url)}
                        userId={user?.id || ""}
                        size="lg"
                        onImmediateUpdate={handleImmediateAvatarUpdate}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input {...field} />
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
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                    <FormDescription>
                      Email addresses cannot be changed.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          placeholder="e.g., 083 123 4567, 01 234 5678, 028 1234 5678"
                          maxLength={20}
                          onKeyDown={handlePhoneInput}
                          onChange={(e) => {
                            const sanitizedValue = handlePhoneChange(e);
                            field.onChange(sanitizedValue);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter an Irish or Northern Irish mobile or landline number
                      </FormDescription>
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
                        <select
                          className="w-full rounded-md border border-gray-300 p-2 text-sm"
                          {...field}
                        >
                          <option value="">Select a county</option>
                          {irishCounties.map((county) => (
                            <option key={county} value={county}>
                              {county}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Separator />
              
              <FormField
                control={form.control}
                name="newsletterOptIn"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Newsletter Subscription
                      </FormLabel>
                      <FormDescription>
                        Subscribe to product updates, news, and Hero Stories
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={handleNewsletterChange}
                        disabled={isUpdatingNewsletter}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="bg-brand-dark-green hover:bg-brand-soft-green text-white">
                Save Changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <PasswordChangeCard />

      <SellerConversion />

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <Collapsible
            open={isDeleteOpen}
            onOpenChange={setIsDeleteOpen}
            className="w-full"
          >
            <CollapsibleTrigger asChild>
              <Button variant="destructive" className="w-full justify-between">
                <span>Delete My Account</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isDeleteOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4 mt-2 border border-destructive/50 rounded-md bg-destructive/5">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Warning: This action cannot be undone</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Deleting your account will permanently remove all your data, including your wishlist, messages, and reviews. You will no longer have access to any listings you've saved.
                    </p>
                  </div>
                </div>
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting Account..." : "Confirm Account Deletion"}
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
};

export default BuyerSettings;
