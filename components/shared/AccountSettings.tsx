import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { AlertTriangle, Trash2, User } from "lucide-react";
import { PasswordChangeCard } from "../buyer-dashboard/PasswordChangeCard";
import { AvatarUploader } from "@/components/ui/avatar-uploader";

interface AccountSettingsProps {
  title?: string;
  description?: string;
}

export const AccountSettings = ({ 
  title = "Account Security", 
  description = "Manage your password and account settings" 
}: AccountSettingsProps) => {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Profile form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [county, setCounty] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Fetch user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: "Error loading profile",
          description: "Unable to load your profile data. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setCounty(data.county || "");
        setAvatarUrl(data.avatar_url || null);
      }
    };

    fetchProfile();
  }, [user?.id]);

  const handleUpdateProfile = async () => {
    if (!user?.id) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          county: county,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile information has been updated successfully.",
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAvatarUpdate = async (url: string | null) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          avatar_url: url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error updating avatar:', error);
      throw error;
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-berkshire text-brand-dark-green mb-1">{title}</h2>
        <p className="text-gray-600">{description}</p>
      </div>

      {/* Profile Information Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Avatar Section */}
            <div className="flex justify-center pb-4 border-b">
              <AvatarUploader
                value={avatarUrl}
                onChange={setAvatarUrl}
                userId={user?.id || ""}
                size="lg"
                onImmediateUpdate={handleAvatarUpdate}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter your first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-muted-foreground">
                Email address cannot be changed
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+353 123 456 789"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="county">County</Label>
              <Input
                id="county"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                placeholder="Enter your county"
              />
            </div>

            <Button
              onClick={handleUpdateProfile}
              disabled={isUpdating}
              className="bg-brand-dark-green hover:bg-brand-soft-green text-white"
            >
              {isUpdating ? "Updating..." : "Update Profile"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password Change Section */}
      <PasswordChangeCard />
      
      {/* Account Deletion Section */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold">Delete Account</h3>
              <p className="text-sm text-muted-foreground">
                This will permanently delete your account and remove all your data.
              </p>
            </div>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                  <Trash2 className="mr-1 h-4 w-4" />
                  {isDeleting ? 'Deleting...' : 'Delete Account'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Delete Account
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account, 
                    remove your data, listings, and messages from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? "Deleting Account..." : "Delete Account"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
