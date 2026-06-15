'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Mail, Calendar, User, Shield, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface VetPartnerInvitation {
  id: string;
  business_id: string;
  tier: 'free' | 'paid';
  status: 'active' | 'suspended' | 'pending_approval';
  invited_by: string | null;
  invited_at: string | null;
  created_at: string;
  business_name: string;
  admin_name: string;
}

export default function VetPartnerInvitationPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [invitation, setInvitation] = useState<VetPartnerInvitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchInvitation();
  }, [user]);

  const fetchInvitation = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Get user's business
      const { data: business, error: businessError } = await supabase
        .from('business_listings')
        .select('id, name')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (businessError) throw businessError;
      if (!business) {
        setIsLoading(false);
        return;
      }

      // Get vet partner invitation for this business
      const { data: vp, error: vpError } = await supabase
        .from('vet_partners' as any)
        .select('*, business_listings!inner(name)')
        .eq('business_id', business.id)
        .eq('status', 'pending_approval')
        .maybeSingle();

      if (vpError && vpError.code !== 'PGRST116') throw vpError;

      if (vp) {
        // Get admin name who invited
        let adminName = 'Admin';
        const vpData = vp as any;
        if (vpData.invited_by) {
          const { data: admin } = await supabase
            .from('user_profiles')
            .select('first_name, last_name, business_name, email')
            .eq('id', vpData.invited_by)
            .maybeSingle();

          if (admin) {
            adminName = admin.business_name || 
                      `${admin.first_name || ''} ${admin.last_name || ''}`.trim() || 
                      admin.email?.split('@')[0] || 
                      'Admin';
          }
        }

        setInvitation({
          id: vpData.id,
          business_id: vpData.business_id,
          tier: vpData.tier,
          status: vpData.status,
          invited_by: vpData.invited_by,
          invited_at: vpData.invited_at,
          created_at: vpData.created_at,
          business_name: (vpData.business_listings as any)?.name || 'Unknown Business',
          admin_name: adminName,
        });
      }
    } catch (error: any) {
      console.error('Error fetching invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to load invitation',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!invitation || !user) return;

    try {
      setIsProcessing(true);

      // Update vet_partners status to active
      const { error: updateError } = await supabase
        .from('vet_partners' as any)
        .update({ status: 'active' })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      // Update business_listings to mark as vet partner
      const { error: businessUpdateError } = await supabase
        .from('business_listings')
        .update({
          is_vet_partner: true,
          vet_partner_tier: 'free',
        } as any)
        .eq('id', invitation.business_id);

      if (businessUpdateError) throw businessUpdateError;

      toast({
        title: 'Success!',
        description: 'You have accepted the Vet Partner invitation. Your business is now listed in the Vet Directory.',
      });

      // Redirect to upgrade page after a short delay
      setTimeout(() => {
        router.push('/vet-partners/upgrade');
      }, 2000);
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to accept invitation',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!invitation || !user) return;

    try {
      setIsProcessing(true);

      // Delete vet_partners record
      const { error: deleteError } = await supabase
        .from('vet_partners' as any)
        .delete()
        .eq('id', invitation.id);

      if (deleteError) throw deleteError;

      toast({
        title: 'Invitation Rejected',
        description: 'The Vet Partner invitation has been declined.',
      });

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/my-business-dashboard');
      }, 1500);
    } catch (error: any) {
      console.error('Error rejecting invitation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject invitation',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vet Partner Invitation</h1>
          <p className="text-muted-foreground">
            Manage your vet partner status
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                You don't have any pending Vet Partner invitations at this time.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push('/my-business-dashboard')}
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vet Partner Invitation</h1>
        <p className="text-muted-foreground">
          You have been invited to become a DogQuest Vet Partner
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-brand-soft-green" />
                Vet Partner Invitation
              </CardTitle>
              <CardDescription className="mt-2">
                Accept this invitation to get listed in our Vet Directory
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-sm">
              Pending Approval
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Mail className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Business</p>
                <p className="text-sm text-muted-foreground">{invitation.business_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Invited By</p>
                <p className="text-sm text-muted-foreground">{invitation.admin_name}</p>
              </div>
            </div>

            {invitation.invited_at && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Invited On</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(invitation.invited_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Shield className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Tier</p>
                <p className="text-sm text-muted-foreground">
                  Free Tier (€0/year) - Can upgrade to Paid Tier (€12/month) later
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold mb-3">What you'll get as a Vet Partner:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span>Vet Partner badge on your business profile</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span>Listed in the Vet Directory</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span>Geolocated visibility</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span>Social media handles displayed on profile</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span>Option to upgrade to Paid Tier for enhanced features</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              onClick={handleAccept}
              disabled={isProcessing}
              className="flex-1"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Accept Invitation
            </Button>
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={isProcessing}
              className="flex-1"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
