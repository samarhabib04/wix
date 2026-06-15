import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Clock, Diff, AlertTriangle, FileText, ExternalLink, Edit, Check, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { adminToast } from '@/lib/utils/adminToast';
import { resolveListingVerificationBadges } from '@/lib/utils/code-verification';

interface StudListingDetailsModalProps {
  listingId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onListingUpdated: () => void;
}

interface StudListing {
  id: string;
  title: string;
  breed: string;
  location: string;
  dob: string;
  sex: string;
  description: string;
  vet_name: string;
  vet_location: string;
  stud_fee: number;
  pick_of_litter: boolean;
  images: string[];
  video_url?: string;
  v1_cert?: string;
  v2_cert?: string;
  h1_cert?: string;
  family_tree?: any;
  admin_approved: boolean;
  is_published: boolean;
  pending_edit_id?: string;
  admin_notes?: string;
  gold_star: boolean;
  green_tick: boolean;
  vaccination_code?: string;
  health_check_code?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface StudListingEdit {
  id: string;
  listing_id: string;
  user_id: string;
  title: string;
  breed: string;
  location: string;
  dob: string;
  sex: string;
  description: string;
  vet_name: string;
  vet_location: string;
  stud_fee: number;
  pick_of_litter: boolean;
  images: string[];
  video_url?: string;
  v1_cert?: string;
  v2_cert?: string;
  h1_cert?: string;
  family_tree?: any;
  vaccination_code?: string;
  health_check_code?: string;
  status: string;
  admin_notes?: string;
  created_at: string;
}

const StudListingDetailsModal: React.FC<StudListingDetailsModalProps> = ({
  listingId,
  open,
  onOpenChange,
  onListingUpdated
}) => {
  const { toast } = useToast();
  const [listing, setListing] = useState<StudListing | null>(null);
  const [pendingEdit, setPendingEdit] = useState<StudListingEdit | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('current');
  const [error, setError] = useState<string | null>(null);
  const [editConfirmAction, setEditConfirmAction] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    if (!open) {
      setIsProcessing(false);
      setListing(null);
      setPendingEdit(null);
      setAdminNotes('');
      setError(null);
      setEditConfirmAction(null);
    }
  }, [open]);

  useEffect(() => {
    if (listingId && open) {

      fetchListingDetails();
    }
  }, [listingId, open]);

  const fetchListingDetails = async () => {
    if (!listingId) {

      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {

      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('=== MODAL ERROR: Auth error ===', authError);
        throw new Error(`Authentication error: ${authError.message}`);
      }

      if (!user) {
        console.error('=== MODAL ERROR: No user found ===');
        throw new Error('Authentication required');
      }

      // Fetch the main listing

      const { data: listingData, error: listingError } = await supabase
        .from('stud_listings')
        .select('*')
        .eq('id', listingId)
        .single();

      if (listingError) {
        console.error('=== MODAL ERROR: Listing fetch error ===', listingError);
        throw new Error(`Failed to fetch listing: ${listingError.message}`);
      }

      if (!listingData) {
        console.error('=== MODAL ERROR: No listing data returned ===');
        throw new Error('Listing not found');
      }

      // Process the listing data - create breed from breed1/breed2
      const processedListing = {
        ...listingData,
        breed: getBreedDisplayName(listingData.breed1, listingData.breed2, listingData.breed_type),
        images: Array.isArray(listingData.images) 
          ? listingData.images.filter((img): img is string => typeof img === 'string')
          : [],
        sex: listingData.sex || '',
        admin_notes: listingData.admin_notes ?? undefined
      } as StudListing;

      setListing(processedListing);
      setAdminNotes(listingData.admin_notes || '');

      // If there's a pending edit, fetch it
      if (listingData.pending_edit_id) {

        try {
          const { data: editData, error: editError } = await supabase
            .from('stud_listing_edits')
            .select('*')
            .eq('id', listingData.pending_edit_id)
            .single();

          if (editError) {
            console.error('=== MODAL ERROR: Edit fetch error ===', editError);
            // Don't throw here, just log the error
          } else if (editData) {

            const processedEdit: StudListingEdit = {
              ...editData,
              sex: editData.sex || '',
              images: Array.isArray(editData.images) 
                ? editData.images.filter((img): img is string => typeof img === 'string')
                : []
            } as StudListingEdit;
            setPendingEdit(processedEdit);
            setActiveTab('edit');

          }
        } catch (editError: any) {
          console.error('=== MODAL ERROR: Edit fetch failed ===', editError);
          // Don't fail the whole operation if edit fetch fails
        }
      } else {

        setPendingEdit(null);
        setActiveTab('current');
      }

    } catch (error: any) {
      console.error('=== MODAL ERROR: fetchListingDetails failed ===', error);
      setError(error.message);
      toast(adminToast.error(`Failed to load listing: ${error.message}`));
    } finally {
      setIsLoading(false);

    }
  };

  // Helper function to get breed display name
  const getBreedDisplayName = (breed1: string | null, breed2: string | null, breed_type: string | null) => {
    if (breed_type === 'crossbreed' && breed1 && breed2) {
      return `${breed1} x ${breed2}`;
    }
    
    if (breed1) {
      return breed1;
    }
    
    return 'Mixed Breed';
  };

  // Helper function to check if a field has been changed
  const isFieldChanged = (fieldName: string, currentValue: any, editValue: any) => {
    if (fieldName === 'images') {
      return JSON.stringify(currentValue) !== JSON.stringify(editValue);
    }
    return currentValue !== editValue;
  };

  const handleApproveEdit = async () => {

    if (!listing || !pendingEdit) {

      toast(adminToast.error('Missing required data for approval'));
      return;
    }

    if (isProcessing) {

      return;
    }

    setIsProcessing(true);

    try {
      const badges = await resolveListingVerificationBadges(
        'stud',
        {
          v1_cert: pendingEdit.v1_cert,
          v2_cert: pendingEdit.v2_cert,
          h1_cert: pendingEdit.h1_cert,
        },
        {
          excludeListingId: listing.id,
          excludeListingType: 'stud',
        },
      );

      // Single atomic operation to update the listing with edit data
      const updateData = {
        title: pendingEdit.title,
        breed: pendingEdit.breed,
        location: pendingEdit.location,
        dob: pendingEdit.dob,
        sex: pendingEdit.sex,
        description: pendingEdit.description,
        vet_name: pendingEdit.vet_name,
        vet_location: pendingEdit.vet_location,
        stud_fee: pendingEdit.stud_fee,
        pick_of_litter: pendingEdit.pick_of_litter,
        images: pendingEdit.images,
        video_url: pendingEdit.video_url,
        v1_cert: pendingEdit.v1_cert,
        v2_cert: pendingEdit.v2_cert,
        h1_cert: pendingEdit.h1_cert,
        family_tree: pendingEdit.family_tree,
        admin_notes: adminNotes || null,
        pending_edit_id: null,
        updated_at: new Date().toISOString(),
        green_tick: badges.green_tick,
        gold_star: badges.gold_star,
        codes_verified: badges.codes_verified,
        verification_date: badges.verification_date,
      };

      // Update the main listing
      const { error: updateError } = await supabase
        .from('stud_listings')
        .update(updateData)
        .eq('id', listing.id);

      if (updateError) {
        console.error('=== APPROVE: Update error ===', updateError);
        throw new Error(`Failed to update listing: ${updateError.message}`);
      }

      // Create notification for seller about approval
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: listing.user_id,
          title: 'Edit Approved',
          message: `Your edit for "${listing.title}" has been approved and is now live.`,
          type: 'success',
          listing_id: listing.id,
          listing_type: 'stud'
        });

      if (notificationError) {
      } else {

      }

      // Mark edit as approved (fire and forget)
      supabase
        .from('stud_listing_edits')
        .update({
          status: 'approved',
          admin_notes: adminNotes || null
        })
        .eq('id', pendingEdit.id)
        .then(({ error }) => {
          if (error) {
          } else {

          }
        });

      setEditConfirmAction(null);
      toast(adminToast.success('Edit approved successfully!'));
      onOpenChange(false);
      onListingUpdated();

    } catch (error: any) {
      console.error('=== APPROVE: Approval failed ===', error);
      toast(adminToast.error(`Failed to approve edit: ${error.message}`));
    } finally {
      setIsProcessing(false);

    }
  };

  const handleRejectEdit = async () => {

    if (!listing || !pendingEdit) {

      toast(adminToast.error('Missing required data for rejection'));
      return;
    }

    if (!adminNotes.trim()) {

      toast(adminToast.error('Please provide feedback for the rejection'));
      return;
    }

    if (isProcessing) {

      return;
    }

    setIsProcessing(true);

    try {
      // Clear the pending edit from main listing
      const { error: listingError } = await supabase
        .from('stud_listings')
        .update({
          pending_edit_id: null,
          admin_notes: adminNotes
        })
        .eq('id', listing.id);

      if (listingError) {
        console.error('=== REJECT: Listing update error ===', listingError);
        throw new Error(`Failed to clear pending edit: ${listingError.message}`);
      }

      // Create notification for seller about rejection with admin notes
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: listing.user_id,
          title: 'Edit Rejected',
          message: `Your edit for "${listing.title}" has been rejected. Admin feedback: ${adminNotes}`,
          type: 'error',
          listing_id: listing.id,
          listing_type: 'stud'
        });

      if (notificationError) {
      } else {

      }

      // Mark edit as rejected (fire and forget)
      supabase
        .from('stud_listing_edits')
        .update({
          status: 'rejected',
          admin_notes: adminNotes
        })
        .eq('id', pendingEdit.id)
        .then(({ error }) => {
          if (error) {
          } else {

          }
        });

      setEditConfirmAction(null);
      toast(adminToast.success('Edit rejected successfully!'));
      onOpenChange(false);
      onListingUpdated();

    } catch (error: any) {
      console.error('=== REJECT: Rejection failed ===', error);
      toast(adminToast.error(`Failed to reject edit: ${error.message}`));
    } finally {
      setIsProcessing(false);

    }
  };

  // Helper function to render health certificates
  const renderHealthCertificates = (data: StudListing | StudListingEdit, showEditPills = false) => {
    const certificates = [
      { name: 'V1 Certificate', url: data.v1_cert, fieldName: 'v1_cert' },
      { name: 'V2 Certificate', url: data.v2_cert, fieldName: 'v2_cert' },
      { name: 'H1 Certificate', url: data.h1_cert, fieldName: 'h1_cert' }
    ].filter(cert => cert.url);

    if (certificates.length === 0) {
      return <p className="text-gray-500 text-sm">No health certificates uploaded</p>;
    }

    return (
      <div className="space-y-2">
        {certificates.map((cert, index) => (
          <div key={index} className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="font-medium">{cert.name}</span>
              {showEditPills && listing && pendingEdit && isFieldChanged(cert.fieldName, listing[cert.fieldName as keyof StudListing], pendingEdit[cert.fieldName as keyof StudListingEdit]) && (
                <Badge className="bg-orange-500 text-white text-xs ml-2">
                  <Edit className="h-3 w-3 mr-1" />
                  Edited
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(cert.url, '_blank')}
              className="flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              View
            </Button>
          </div>
        ))}
      </div>
    );
  };

  // Helper function to render listing data
  const renderListingData = (data: StudListing | StudListingEdit, isPendingEdit = false) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">{data.title}</h3>
              {isPendingEdit && listing && isFieldChanged('title', listing.title, data.title) && (
                <Badge className="bg-orange-500 text-white text-xs">
                  <Edit className="h-3 w-3 mr-1" />
                  Edited
                </Badge>
              )}
            </div>
            {isPendingEdit && (
              <Badge className="bg-orange-500 mb-2">Pending Changes</Badge>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p><span className="font-medium">Breed:</span> {data.breed}</p>
              {isPendingEdit && listing && isFieldChanged('breed', listing.breed, data.breed) && (
                <Badge className="bg-orange-500 text-white text-xs">
                  <Edit className="h-3 w-3 mr-1" />
                  Edited
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <p><span className="font-medium">Location:</span> {data.location}</p>
              {isPendingEdit && listing && isFieldChanged('location', listing.location, data.location) && (
                <Badge className="bg-orange-500 text-white text-xs">
                  <Edit className="h-3 w-3 mr-1" />
                  Edited
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <p><span className="font-medium">Date of Birth:</span> {new Date(data.dob).toLocaleDateString()}</p>
              {isPendingEdit && listing && isFieldChanged('dob', listing.dob, data.dob) && (
                <Badge className="bg-orange-500 text-white text-xs">
                  <Edit className="h-3 w-3 mr-1" />
                  Edited
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <p><span className="font-medium">Sex:</span> {data.sex}</p>
              {isPendingEdit && listing && isFieldChanged('sex', listing.sex, data.sex) && (
                <Badge className="bg-orange-500 text-white text-xs">
                  <Edit className="h-3 w-3 mr-1" />
                  Edited
                </Badge>
              )}
            </div>
            
            {/* Verification Codes - Admin Only (only show on current listing, not pending edit) */}
            {!isPendingEdit && data.vaccination_code && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm font-medium text-blue-900 flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Vaccination Code
                </p>
                <code className="text-sm font-mono bg-white px-2 py-1 rounded mt-1 block">
                  {data.vaccination_code}
                </code>
              </div>
            )}
            {!isPendingEdit && data.health_check_code && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm font-medium text-yellow-900 flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Health Check Code
                </p>
                <code className="text-sm font-mono bg-white px-2 py-1 rounded mt-1 block">
                  {data.health_check_code}
                </code>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <p><span className="font-medium">Stud Fee:</span> €{data.stud_fee}</p>
              {isPendingEdit && listing && isFieldChanged('stud_fee', listing.stud_fee, data.stud_fee) && (
                <Badge className="bg-orange-500 text-white text-xs">
                  <Edit className="h-3 w-3 mr-1" />
                  Edited
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <p><span className="font-medium">Pick of Litter:</span> {data.pick_of_litter ? 'Yes' : 'No'}</p>
              {isPendingEdit && listing && isFieldChanged('pick_of_litter', listing.pick_of_litter, data.pick_of_litter) && (
                <Badge className="bg-orange-500 text-white text-xs">
                  <Edit className="h-3 w-3 mr-1" />
                  Edited
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <p><span className="font-medium">Vet Name:</span> {data.vet_name}</p>
              {isPendingEdit && listing && isFieldChanged('vet_name', listing.vet_name, data.vet_name) && (
                <Badge className="bg-orange-500 text-white text-xs">
                  <Edit className="h-3 w-3 mr-1" />
                  Edited
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <p><span className="font-medium">Vet Location:</span> {data.vet_location}</p>
              {isPendingEdit && listing && isFieldChanged('vet_location', listing.vet_location, data.vet_location) && (
                <Badge className="bg-orange-500 text-white text-xs">
                  <Edit className="h-3 w-3 mr-1" />
                  Edited
                </Badge>
              )}
            </div>
          </div>

          {isPendingEdit && (
            <div className="text-sm text-gray-600">
              <p><span className="font-medium">Submitted:</span> {new Date(data.created_at).toLocaleDateString()}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-medium">Description:</h4>
              {isPendingEdit && listing && isFieldChanged('description', listing.description, data.description) && (
                <Badge className="bg-orange-500 text-white text-xs">
                  <Edit className="h-3 w-3 mr-1" />
                  Edited
                </Badge>
              )}
            </div>
            <div className="bg-gray-50 p-3 rounded-md text-sm border max-h-32 overflow-y-auto">
              {data.description}
            </div>
          </div>

          {data.images && data.images.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium">Primary Image:</h4>
                {isPendingEdit && listing && isFieldChanged('images', listing.images, data.images) && (
                  <Badge className="bg-orange-500 text-white text-xs">
                    <Edit className="h-3 w-3 mr-1" />
                    Edited
                  </Badge>
                )}
              </div>
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                <img 
                  src={data.images[0]} 
                  alt={data.title}
                  className="object-cover w-full h-full"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Health Certificates Section */}
      <div>
        <h4 className="font-medium mb-3">Health Certificates:</h4>
        {renderHealthCertificates(data, isPendingEdit)}
      </div>

      {/* Additional Certificates Display */}
      {(data.v1_cert || data.v2_cert || data.h1_cert) && (
        <div>
          <h4 className="font-medium mb-2">Available Certifications:</h4>
          <div className="flex gap-2">
            {data.v1_cert && <Badge variant="outline">V1 Certificate</Badge>}
            {data.v2_cert && <Badge variant="outline">V2 Certificate</Badge>}
            {data.h1_cert && <Badge variant="outline">H1 Certificate</Badge>}
          </div>
        </div>
      )}
    </div>
  );

  if (!open) {
    return null;
  }

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl bg-white">
          <DialogHeader>
            <DialogTitle>Error Loading Listing</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col justify-center items-center py-8 space-y-4">
            <p className="text-red-600">Error: {error}</p>
            <div className="flex gap-2">
              <Button onClick={() => fetchListingDetails()} className="mt-2">
                Try Again
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (isLoading || !listing) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl bg-white">
          <DialogHeader>
            <DialogTitle>Loading Listing Details...</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col justify-center items-center py-8 space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="text-gray-600">Loading listing details...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {pendingEdit ? (
              <>
                <Diff className="h-5 w-5" />
                Review Stud Listing Changes
              </>
            ) : (
              <>
                Stud Listing Details
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {pendingEdit 
              ? "Compare and approve or reject changes to this stud listing" 
              : "Review the details of this stud listing"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {pendingEdit ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="current">Current Version</TabsTrigger>
                <TabsTrigger value="edit" className="relative">
                  Proposed Changes
                  <Badge className="ml-2 bg-orange-500 text-white text-xs">New</Badge>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="current" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Current Listing
                      {listing.admin_approved && (
                        <Badge className="bg-green-500">Approved</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderListingData(listing)}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="edit" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Proposed Changes
                      <Badge className="bg-orange-500">Pending Review</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderListingData(pendingEdit, true)}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Listing Details
                  {listing.admin_approved && (
                    <Badge className="bg-green-500">Approved</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderListingData(listing)}
              </CardContent>
            </Card>
          )}

          {/* Admin Notes Section */}
          <div className="space-y-4">
            <h4 className="font-medium">Admin Notes</h4>
            <Textarea
              placeholder={pendingEdit ? "Add notes for the seller (required for rejection)" : "Add notes about this listing"}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={4}
            />
          </div>

          {pendingEdit && editConfirmAction && (
            <div
              className={`p-4 rounded-lg border-2 ${
                editConfirmAction === 'approve'
                  ? 'bg-green-50 border-green-300'
                  : 'bg-red-50 border-red-300'
              }`}
            >
              <p
                className={`font-semibold mb-1 ${
                  editConfirmAction === 'approve' ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {editConfirmAction === 'approve'
                  ? 'Approve these stud listing changes?'
                  : 'Reject these stud listing changes?'}
              </p>
              <p
                className={`text-sm mb-3 ${
                  editConfirmAction === 'approve' ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {editConfirmAction === 'approve'
                  ? 'Proposed changes will replace the live listing. The seller will be notified.'
                  : 'The live listing stays unchanged. Add admin notes above before rejecting.'}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isProcessing}
                  onClick={() => setEditConfirmAction(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className={
                    editConfirmAction === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }
                  disabled={
                    isProcessing ||
                    (editConfirmAction === 'reject' && !adminNotes.trim())
                  }
                  onClick={() => {
                    if (editConfirmAction === 'approve') void handleApproveEdit();
                    else void handleRejectEdit();
                  }}
                >
                  {isProcessing
                    ? 'Processing…'
                    : editConfirmAction === 'approve'
                      ? 'Yes, approve changes'
                      : 'Yes, reject changes'}
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              variant="outline"
              disabled={isProcessing}
            >
              Close
            </Button>

            {pendingEdit && (
              <div className="space-x-2">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isProcessing || editConfirmAction !== null}
                  onClick={() => setEditConfirmAction('reject')}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Changes
                </Button>

                <Button
                  type="button"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={isProcessing || editConfirmAction !== null}
                  onClick={() => setEditConfirmAction('approve')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Changes
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudListingDetailsModal;
