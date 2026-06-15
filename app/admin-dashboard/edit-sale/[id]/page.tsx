'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { adminToast } from '@/lib/utils/adminToast';
import SaleListingForm from '@/components/seller-dashboard/forms/SaleListingForm';

// 🔵 DEBUG: Log at module level to verify file is loaded

export default function AdminEditSaleListingPage() {
  // 🔵 DEBUG: Log at component start

  const params = useParams();
  const router = useRouter();
  const { user, role } = useAuth();
  const { toast } = useToast();
  const id = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [listing, setListing] = useState<any>(null);

  useEffect(() => {

    if (role && role !== 'admin') {

      toast(adminToast.error('Access denied. Admin privileges required.'));
      router.push('/admin-dashboard');
    }
  }, [role, router, toast]);

  useEffect(() => {

    if (id) {

      fetchListing();
    } else {
    }
  }, [id]);

  const fetchListing = async () => {

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('sale_listings')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Error from Supabase:', error);
        throw error;
      }
      
      // 🔍 DEBUG: Console log listing status when page loads
      // Check if status field exists at all
      if (!('status' in (data || {}))) {
        console.error('❌ CRITICAL: status field does NOT exist in listing data!');
      } else {

      }
      
      setListing(data);
    } catch (error: any) {
      console.error('Error fetching listing:', error);
      toast(adminToast.error('Failed to load listing'));
      router.push('/admin-dashboard/listings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (formData: any) => {
    try {

      // First, fetch current listing to preserve status, admin_approved, and is_published

      const { data: currentListing, error: fetchError } = await supabase
        .from('sale_listings')
        .select('status, admin_approved, is_published')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching current listing:', fetchError);
        throw fetchError;
      }

      // 🔍 DEBUG: Console log status when Update Listing is clicked
      // Check if status field exists
      if (!('status' in (currentListing || {}))) {
        console.error('❌ CRITICAL: status field does NOT exist in currentListing!');
      } else {

      }
      
      // 🔍 DEBUG: Check what formData contains

      if ('status' in formData) {
      }

      // Remove status-related fields from formData if they somehow got in there
      const cleanFormData = { ...formData };
      delete cleanFormData.status;
      delete cleanFormData.admin_approved;
      delete cleanFormData.is_published;
      // Transform form data to match database schema
      // IMPORTANT: Explicitly preserve status, admin_approved, and is_published with current values
      const listingData: any = {
        title: cleanFormData.title,
        breed_type: cleanFormData.breedType,
        breed: cleanFormData.breedType === 'pedigree' ? cleanFormData.breed : (cleanFormData.breed1 && cleanFormData.breed2 ? `${cleanFormData.breed1}-${cleanFormData.breed2}` : 'crossbreed'),
        breed_1: cleanFormData.breedType === 'crossbreed' ? cleanFormData.breed1 : (cleanFormData.breedType === 'pedigree' ? cleanFormData.breed : null),
        breed_2: cleanFormData.breedType === 'crossbreed' ? cleanFormData.breed2 : null,
        location: cleanFormData.location,
        date_of_birth: cleanFormData.dob.toISOString().split('T')[0],
        male_count: parseInt(cleanFormData.maleCount),
        female_count: parseInt(cleanFormData.femaleCount),
        description: cleanFormData.description,
        vet_name: cleanFormData.vetName,
        vet_location: cleanFormData.vetLocation,
        same_pricing: cleanFormData.pricingOption === 'uniform' ? 'yes' : 'no',
        uniform_price: cleanFormData.pricingOption === 'uniform' ? parseFloat(cleanFormData.uniformPrice || '0') : null,
        min_price: cleanFormData.pricingOption === 'range' ? parseFloat(cleanFormData.minPrice || '0') : null,
        max_price: cleanFormData.pricingOption === 'range' ? parseFloat(cleanFormData.maxPrice || '0') : null,
        images: cleanFormData.uploadedImageUrls || [],
        primary_image_index: cleanFormData.selectedFeatureImage || 0,
        video_url: cleanFormData.uploadedVideoUrl || null,
        microchip_database: cleanFormData.microchipDatabase || null,
        puppy_details: cleanFormData.puppyDetails || [],
        use_collar_codes: cleanFormData.useCollarCodes || false,
        selected_colors: cleanFormData.selectedColors || [],
        identifiers: cleanFormData.identifiers || null,
        documents: cleanFormData.uploadedDocuments?.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          url: doc.url,
          size: doc.size
        })) || [],
      };

      // CRITICAL: Explicitly preserve status fields with their current values
      // This ensures they are never changed during the update
      if (currentListing) {
        listingData.status = currentListing.status;
        listingData.admin_approved = currentListing.admin_approved;
        listingData.is_published = currentListing.is_published;
      }

      // Ad Editing: Never update created_at or expires_at - edited ads must keep
      // original lifecycle (don't reappear as "new", don't restart duration)
      delete (listingData as any).created_at;
      delete (listingData as any).expires_at;

      if (!currentListing) {
        console.error('⚠️ WARNING: Could not fetch current listing status!');
        throw new Error('Failed to fetch current listing status');
      }

      // 🔍 DEBUG: Console log status being sent to update
      // Verify status is actually set
      if (!('status' in listingData)) {
        console.error('❌ CRITICAL: status field missing from update payload!');
      } else if (listingData.status === null || listingData.status === undefined) {
        console.error('❌ CRITICAL: status field is null/undefined in update payload!');
      } else {

      }

      const { data: updateResult, error: updateError } = await supabase
        .from('sale_listings')
        .update(listingData)
        .eq('id', id)
        .select('status, admin_approved, is_published');

      if (updateError) {
        console.error('❌ Update error:', updateError);
        throw updateError;
      }

      // Verify status was preserved

      const { data: updatedListing, error: verifyError } = await supabase
        .from('sale_listings')
        .select('status, admin_approved, is_published')
        .eq('id', id)
        .single();

      if (verifyError) {
        console.error('❌ Verification error:', verifyError);
      } else if (updatedListing) {
        // 🔍 DEBUG: Console log status after update

        // Warn if status changed unexpectedly

        if (currentListing && updatedListing.status !== currentListing.status) {
          console.error('❌ ERROR: Status was changed during update!', {
            before: currentListing.status,
            after: updatedListing.status,
            payload_sent: listingData.status
          });
          toast(adminToast.error(`Warning: Listing status changed from "${currentListing.status}" to "${updatedListing.status}"`));
        } else if (currentListing && updatedListing.status === currentListing.status) {

        }
      }

      toast(adminToast.success('Listing updated successfully'));
      router.push('/admin-dashboard/listings');
    } catch (error: any) {
      console.error('Error updating listing:', error);
      toast(adminToast.error('Failed to update listing: ' + (error.message || 'Unknown error')));
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6 px-4">
        <div className="text-center py-12">Loading listing...</div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container mx-auto py-6 space-y-6 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Listing Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">The listing you're looking for could not be found.</p>
            <Button onClick={() => router.push('/admin-dashboard/listings')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Listings Management
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6 px-4 mb-12">
      <div className="flex flex-col space-y-2">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 text-gray-600 -ml-2"
            onClick={() => router.push('/admin-dashboard/listings')}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Listings Management
          </Button>
        </div>

        <h1 className="text-4xl font-berkshire text-blue-600 mb-2">
          Edit Sale Listing (Admin)
        </h1>
        <p className="text-gray-600">
          Edit this sale listing as an administrator. Changes will be automatically approved.
        </p>
      </div>

      <SaleListingForm initialData={listing} onSubmit={handleFormSubmit} submitButtonText="Update Listing" />
    </div>
  );
}

