import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Shield, 
  Bell, 
  Eye,
  EyeOff,
  AlertTriangle,
  Camera,
  Edit3,
  Save,
  X
} from "lucide-react";
import { PasswordChangeCard } from "../buyer-dashboard/PasswordChangeCard";
import { AvatarUploader } from "@/components/ui/avatar-uploader";

const SellerSettings = () => {
  const { toast } = useToast();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    county: "",
    phone: "",
    email: "",
    sellerId: "",
    dbeId: "",
    newsletter: true,
    notifyEmailMessages: true,
    notifyEmailBoostExpiry: true,
    notifyEmailListingExpiry: true,
  });
  const [savingNotifyKey, setSavingNotifyKey] = useState<string | null>(null);
  
  const [isPhoneVerified] = useState(true);

  // Fetch user profile data on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching user profile:', error);
          toast({
            title: "Error loading profile",
            description: "Unable to load your profile data. Please try again.",
            variant: "destructive",
          });
          return;
        }

        if (data) {
          setFormData({
            firstName: data.first_name || "",
            lastName: data.last_name || "",
            county: data.county || "",
            phone: data.phone || "",
            email: data.email || user.email || "",
            sellerId: data.seller_id || "",
            dbeId: data.dbe_id || "",
            newsletter: data.newsletter_opt_in ?? false,
            notifyEmailMessages: data.notify_email_messages ?? true,
            notifyEmailBoostExpiry: data.notify_email_boost_expiry ?? true,
            notifyEmailListingExpiry: data.notify_email_listing_expiry ?? true,
          });
          setAvatarUrl(data.avatar_url || null);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [user, toast]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const persistNotificationPreference = async (
    key: "newsletter" | "notifyEmailMessages" | "notifyEmailBoostExpiry" | "notifyEmailListingExpiry",
    checked: boolean
  ) => {
    if (!user?.id) return;
    const columnMap = {
      newsletter: "newsletter_opt_in" as const,
      notifyEmailMessages: "notify_email_messages" as const,
      notifyEmailBoostExpiry: "notify_email_boost_expiry" as const,
      notifyEmailListingExpiry: "notify_email_listing_expiry" as const,
    };
    setSavingNotifyKey(key);
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({
          [columnMap[key]]: checked,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      setFormData((prev) => ({ ...prev, [key]: checked }));
      toast({
        title: "Preferences saved",
        description: "Your notification settings have been updated.",
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "Could not save",
        description: "Please try again. If this persists, contact support.",
        variant: "destructive",
      });
    } finally {
      setSavingNotifyKey(null);
    }
  };
  
  const handleSaveChanges = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          county: formData.county,
          seller_id: formData.sellerId,
          dbe_id: formData.dbeId,
          newsletter_opt_in: formData.newsletter,
          notify_email_messages: formData.notifyEmailMessages,
          notify_email_boost_expiry: formData.notifyEmailBoostExpiry,
          notify_email_listing_expiry: formData.notifyEmailListingExpiry,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        toast({
          title: "Error",
          description: "Failed to update profile. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Settings updated",
        description: "Your profile settings have been saved successfully.",
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-dark-green mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h2 className="text-2xl font-berkshire text-brand-dark-green mb-1">Account Settings</h2>
          <p className="text-gray-600">Manage your seller profile and account preferences</p>
        </div>
        
        {!isEditing ? (
          <Button 
            onClick={() => setIsEditing(true)}
            className="mt-4 md:mt-0 bg-brand-dark-green hover:bg-opacity-90"
          >
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2 mt-4 md:mt-0">
            <Button 
              variant="outline" 
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveChanges}
              className="bg-brand-dark-green hover:bg-opacity-90"
            >
              Save Changes
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profile Information Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Seller Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="county">County</Label>
                  <Input
                    id="county"
                    name="county"
                    value={formData.county}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="phone">Phone</Label>
                    {isPhoneVerified && (
                      <span className="text-xs flex items-center text-emerald-600">
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          viewBox="0 0 24 24" 
                          fill="currentColor" 
                          className="w-4 h-4 mr-1"
                        >
                          <path 
                            fillRule="evenodd" 
                            d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" 
                            clipRule="evenodd" 
                          />
                        </svg>
                        Verified
                      </span>
                    )}
                  </div>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={true} // Always disabled for verified numbers
                  />
                  {isPhoneVerified && (
                    <p className="text-xs text-gray-500">
                      Phone number has been verified and cannot be changed.
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={true} // Email is always read-only
                  />
                  <p className="text-xs text-gray-500">
                    Your email address cannot be changed. Please contact support if needed.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sellerId" className="flex items-center">
                      Seller ID
                      <span className="ml-2 text-xs text-gray-500">(Optional)</span>
                    </Label>
                    <Input
                      id="sellerId"
                      name="sellerId"
                      value={formData.sellerId}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      placeholder="Enter your Seller ID"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dbeId" className="flex items-center">
                      DBE ID
                      <span className="ml-2 text-xs text-gray-500">(Optional)</span>
                    </Label>
                    <Input
                      id="dbeId"
                      name="dbeId"
                      value={formData.dbeId}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      placeholder="Enter your DBE ID"
                    />
                  </div>
                </div>
                
                <p className="text-xs text-gray-500">
                  These verification IDs help build trust with potential buyers and can be displayed on your listings.
                </p>
              </CardContent>
            </Card>
            
            {/* Profile Picture & Verification Card */}
            <Card>
              <CardHeader>
                <CardTitle>Profile & Verification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center justify-center py-4">
                  <AvatarUploader
                    value={avatarUrl}
                    onChange={setAvatarUrl}
                    userId={user?.id || ""}
                    size="lg"
                    onImmediateUpdate={async (url) => {
                      if (!user?.id) return;
                      const { error } = await supabase
                        .from('user_profiles')
                        .update({ 
                          avatar_url: url, 
                          updated_at: new Date().toISOString() 
                        })
                        .eq('id', user.id);
                      if (error) {
                        console.error('Error updating avatar:', error);
                        throw new Error(error.message);
                      }
                    }}
                  />
                </div>
                
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center">
                    <div className="mr-3 bg-emerald-100 p-2 rounded-full">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        fill="currentColor" 
                        className="w-6 h-6 text-emerald-600"
                      >
                        <path 
                          fillRule="evenodd" 
                          d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" 
                          clipRule="evenodd" 
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold">Verified Seller</h4>
                      <p className="text-sm text-gray-600">
                        Your phone number has been verified
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <PasswordChangeCard />
          
          {/* Danger Zone Card */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Deleting your account will remove all your listings, messages, and profile information. This action cannot be undone.
              </p>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Delete My Account</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your account
                      and remove all your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting Account..." : "Delete Account"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <p className="text-sm text-muted-foreground font-normal">
                Changes save automatically. Email delivery for each type can be turned off below (in-app
                notifications still appear in your bell unless you clear them).
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-medium">Email Newsletter</h4>
                  <p className="text-sm text-gray-500">
                    Receive product updates, news, and Hero Stories
                  </p>
                </div>
                <Switch 
                  checked={formData.newsletter}
                  onCheckedChange={(v) => void persistNotificationPreference("newsletter", v)}
                  disabled={savingNotifyKey === "newsletter"}
                />
              </div>
              
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-medium">Message Notifications</h4>
                  <p className="text-sm text-gray-500">
                    Email alerts for new messages from potential buyers
                  </p>
                </div>
                <Switch 
                  checked={formData.notifyEmailMessages}
                  onCheckedChange={(v) => void persistNotificationPreference("notifyEmailMessages", v)}
                  disabled={savingNotifyKey === "notifyEmailMessages"}
                />
              </div>
              
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-medium">Boost Expiry Notifications</h4>
                  <p className="text-sm text-gray-500">
                    Email reminders when your listing boosts are about to expire
                  </p>
                </div>
                <Switch 
                  checked={formData.notifyEmailBoostExpiry}
                  onCheckedChange={(v) => void persistNotificationPreference("notifyEmailBoostExpiry", v)}
                  disabled={savingNotifyKey === "notifyEmailBoostExpiry"}
                />
              </div>
              
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-medium">Listing Expiry Notifications</h4>
                  <p className="text-sm text-gray-500">
                    Email reminders when your listings are about to expire
                  </p>
                </div>
                <Switch 
                  checked={formData.notifyEmailListingExpiry}
                  onCheckedChange={(v) => void persistNotificationPreference("notifyEmailListingExpiry", v)}
                  disabled={savingNotifyKey === "notifyEmailListingExpiry"}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SellerSettings;
