
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Phone, MapPin, FileText, Loader2, UserCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { irishCounties, validateIrishPhoneNumber } from "@/lib/utils/irish-data";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PhoneVerification from "@/components/auth/PhoneVerification";

const phoneSchema = z.string().refine(validateIrishPhoneNumber, {
  message: "Please enter a valid phone number (South Africa, USA, Ireland, or Canada)",
});

const sellerConversionSchema = z.object({
  phone: phoneSchema,
  county: z.string().min(1, { message: "County is required" }),
  sellerId: z.string().transform((val) => val === "" ? undefined : val).optional(),
  dbeId: z.string().transform((val) => val === "" ? undefined : val).optional(),
});

type SellerConversionData = z.infer<typeof sellerConversionSchema>;

export const SellerConversion = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  const form = useForm<SellerConversionData>({
    resolver: zodResolver(sellerConversionSchema),
    defaultValues: {
      phone: "",
      county: "",
      sellerId: "",
      dbeId: "",
    },
  });

  const watchedPhone = form.watch("phone");

  const onSubmit = async (data: SellerConversionData) => {
    if (!isPhoneVerified) {
      toast({
        variant: "destructive",
        title: "Phone Verification Required",
        description: "Please verify your phone number before converting to seller"
      });
      return;
    }

    if (!user?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User not found. Please try logging in again."
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Update user profile to seller role
      const { error } = await supabase
        .from('user_profiles')
        .update({
          role: 'seller',
          phone: data.phone,
          county: data.county,
          seller_id: data.sellerId || null,
          dbe_id: data.dbeId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        toast({
          variant: "destructive",
          title: "Conversion Failed",
          description: "Could not convert your account to seller. Please try again."
        });
        return;
      }

      toast({
        title: "Account Converted Successfully!",
        description: "You can now create listings and manage your seller profile.",
      });

      // Close dialog and navigate to seller dashboard
      setIsOpen(false);
      // Force a full reload so the updated role is picked up immediately
      window.location.assign('/my-seller-dashboard');
      
    } catch (error) {
      console.error('Error converting to seller:', error);
      toast({
        variant: "destructive",
        title: "Conversion Failed",
        description: "An unexpected error occurred. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Card className="border-2 border-dashed border-emerald-200 bg-emerald-50 cursor-pointer hover:bg-emerald-100 transition-colors">
          <CardContent className="p-6 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 rounded-full bg-emerald-100 mx-auto flex items-center justify-center">
                <UserCheck className="w-10 h-10 text-emerald-600" />
              </div>
            </div>
            
            <h2 className="text-xl font-semibold mb-2 font-berkshire">Become a Dog Quest Seller</h2>
            
            <p className="text-gray-600 mb-6">
              Have a litter or a stud dog? Convert your account to start creating listings and connect with potential buyers.
            </p>
            
            <Button 
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Convert to Seller Account
            </Button>
            
            <div className="mt-4 text-sm text-gray-500 space-y-2">
              <p>🐕 Create dog listings for sale, stud, or showcase</p>
              <p>💰 Set your own prices and availability</p>
              <p>📱 Connect directly with interested buyers</p>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Convert to Seller Account</DialogTitle>
          <DialogDescription>
            We need some additional information to set up your seller profile.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input placeholder="087 123 4567" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Required for sellers to communicate with buyers
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
                  <FormLabel>County *</FormLabel>
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="sellerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seller ID (optional)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input placeholder="SEL12345" className="pl-10" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dbeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>DBE ID (optional)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input placeholder="DBE12345" className="pl-10" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <p className="text-xs text-gray-600">
              You can add verification IDs later in your seller dashboard settings
            </p>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={isLoading || !isPhoneVerified}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Converting...
                  </>
                ) : (
                  "Convert Account"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
