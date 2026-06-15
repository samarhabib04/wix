'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import SaleListingForm from '@/components/seller-dashboard/forms/SaleListingForm';
import { useSellerListingActions } from '@/hooks/useSellerListingActions';

interface SaleListing {
  id: string;
  title: string;
  seller_id: string;
  breed: string;
  breed_1?: string;
  breed_2?: string;
  location: string;
  description: string;
  price?: number;
  min_price?: number;
  max_price?: number;
  date_of_birth: string;
  male_count: number;
  female_count: number;
  admin_approved: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  status: string;
  images?: string[];
  puppy_details?: any[];
  vet_name: string;
  vet_location: string;
  same_pricing: string;
  breed_type: string;
  use_collar_codes?: boolean;
  selected_colors?: any[];
  microchip_database?: string;
  identifiers?: string;
  h1_document?: string;
  v1_document?: string;
  v2_document?: string;
  h1_checked?: boolean;
  v1_checked?: boolean;
  v2_checked?: boolean;
  video_url?: string;
  family_tree?: any;
  primary_image_index?: number;
  energy?: string;
  size?: string;
  pending_edit_id?: string | null;
}

export default function EditSaleListingPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;
  const [listing, setListing] = useState<SaleListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { editListing, isEditing } = useSellerListingActions();

  useEffect(() => {
    if (id && user) {
      fetchListing();
    }
  }, [id, user]);

  const fetchListing = async () => {
    try {
      const { data, error } = await supabase
        .from('sale_listings')
        .select('*')
        .eq('id', id)
        .eq('seller_id', user?.id || '')
        .single();

      if (error) {
        console.error('Error fetching sale listing:', error);
        toast.error('Failed to fetch sale listing');
        router.push('/my-seller-dashboard/listings');
        return;
      }

      const convertedData: SaleListing = {
        ...data,
        puppy_details: Array.isArray(data.puppy_details) ? data.puppy_details : [],
        selected_colors: Array.isArray(data.selected_colors) ? data.selected_colors : [],
        images: Array.isArray(data.images) ? data.images : [],
        breed_1: data.breed_1 || undefined,
        breed_2: data.breed_2 || undefined,
        admin_approved: data.admin_approved ?? false,
        is_published: data.is_published ?? false,
        status: data.status || 'pending',
        price: data.price ?? undefined,
        min_price: data.min_price ?? undefined,
        max_price: data.max_price ?? undefined,
        video_url: data.video_url || undefined,
        use_collar_codes: data.use_collar_codes ?? undefined,
      } as SaleListing;

      setListing(convertedData);
    } catch (error) {
      console.error('Error fetching sale listing:', error);
      toast.error('Failed to fetch sale listing');
      router.push('/my-seller-dashboard/listings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSubmit = useCallback(async (formData: any) => {
    if (!listing) return;

    if (listing.pending_edit_id) {
      toast.error('You already have a pending edit awaiting admin review.');
      return;
    }

    try {
      // Transform form data to match database schema
      const listingData = {
        title: formData.title,
        breed_type: formData.breedType,
        breed: formData.breedType === 'pedigree' ? formData.breed : (formData.breed1 && formData.breed2 ? `${formData.breed1}-${formData.breed2}` : 'crossbreed'),
        breed_1: formData.breedType === 'crossbreed' ? formData.breed1 : (formData.breedType === 'pedigree' ? formData.breed : null),
        breed_2: formData.breedType === 'crossbreed' ? formData.breed2 : null,
        location: formData.location,
        date_of_birth: formData.dob.toISOString().split('T')[0],
        male_count: parseInt(formData.maleCount),
        female_count: parseInt(formData.femaleCount),
        description: formData.description,
        vet_name: formData.vetName,
        vet_location: formData.vetLocation,
        same_pricing: formData.pricingOption === 'uniform' ? 'yes' : 'no',
        uniform_price: formData.pricingOption === 'uniform' ? parseFloat(formData.uniformPrice || '0') : null,
        min_price: formData.pricingOption === 'range' ? parseFloat(formData.minPrice || '0') : null,
        max_price: formData.pricingOption === 'range' ? parseFloat(formData.maxPrice || '0') : null,
        energy: formData.energy,
        size: formData.size,
        images: formData.uploadedImageUrls || [],
        primary_image_index: formData.selectedFeatureImage || 0,
        video_url: formData.uploadedVideoUrl || null,
        microchip_database: formData.microchipDatabase || null,
        puppy_details: formData.puppyDetails || [],
        use_collar_codes: formData.useCollarCodes || false,
        selected_colors: formData.selectedColors || [],
        identifiers: formData.identifiers || null,
        documents: formData.uploadedDocuments?.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          url: doc.url,
          size: doc.size
        })) || [],
      };

      // Extract family tree data into individual fields
      const familyTreeFields: any = {};
      if (formData.family_tree && Array.isArray(formData.family_tree)) {
        formData.family_tree.forEach((member: any) => {
          if (member.relationship === 'mother') {
            familyTreeFields.mother_name = member.name || null;
            familyTreeFields.mother_breed = member.breed || null;
            familyTreeFields.mother_image = member.image || null;
          } else if (member.relationship === 'father') {
            familyTreeFields.father_name = member.name || null;
            familyTreeFields.father_breed = member.breed || null;
            familyTreeFields.father_image = member.image || null;
          } else if (member.relationship === 'maternal_grandmother') {
            familyTreeFields.maternal_grandmother_name = member.name || null;
            familyTreeFields.maternal_grandmother_breed = member.breed || null;
            familyTreeFields.maternal_grandmother_image = member.image || null;
          } else if (member.relationship === 'maternal_grandfather') {
            familyTreeFields.maternal_grandfather_name = member.name || null;
            familyTreeFields.maternal_grandfather_breed = member.breed || null;
            familyTreeFields.maternal_grandfather_image = member.image || null;
          } else if (member.relationship === 'paternal_grandmother') {
            familyTreeFields.paternal_grandmother_name = member.name || null;
            familyTreeFields.paternal_grandmother_breed = member.breed || null;
            familyTreeFields.paternal_grandmother_image = member.image || null;
          } else if (member.relationship === 'paternal_grandfather') {
            familyTreeFields.paternal_grandfather_name = member.name || null;
            familyTreeFields.paternal_grandfather_breed = member.breed || null;
            familyTreeFields.paternal_grandfather_image = member.image || null;
          }
        });
      }

      // Merge family tree fields into listing data
      const finalListingData = {
        ...listingData,
        ...familyTreeFields
      };

      await editListing({
        listingId: listing.id,
        listingType: 'sale',
        editData: finalListingData
      });

      router.push('/my-seller-dashboard/listings');
    } catch (error) {
      console.error('Error updating listing:', error);
      toast.error('Failed to update listing');
    }
  }, [listing, editListing, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#E1E8E0]">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-dark-green mx-auto mb-4"></div>
              <p className="text-gray-600">Loading listing...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-[#E1E8E0]">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-4">Listing not found or you don't have permission to edit it.</p>
              <Button asChild>
                <Link href="/my-seller-dashboard/listings">Back to Listings</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E1E8E0]">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/my-seller-dashboard/listings">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Listings
            </Link>
          </Button>
          <h1 className="text-3xl font-berkshire text-brand-dark-green mb-2">Edit Sale Listing</h1>
          <p className="text-gray-600">Update your listing details. Changes will be reviewed by admin.</p>
        </div>

        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm text-blue-900 font-medium mb-1">Editing Your Listing</p>
                <p className="text-sm text-blue-800">
                  {listing.pending_edit_id
                    ? 'You already have edits waiting for admin review. Please wait for approval before submitting more changes.'
                    : 'When you save changes, they will be submitted for admin review. Your current listing stays live until approved.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <SaleListingForm 
          initialData={listing}
          onSubmit={handleEditSubmit}
          isSubmitting={isEditing}
          submitButtonText={listing.pending_edit_id ? 'Edit pending review' : 'Save Changes'}
        />
      </div>
    </div>
  );
}

