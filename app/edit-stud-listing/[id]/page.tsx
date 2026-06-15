'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import StudListingEditForm from '@/components/seller-dashboard/forms/StudListingEditForm';

export default function EditStudListingPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;
  const [listing, setListing] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id && user) {
      fetchListing();
    }
  }, [id, user]);

  const fetchListing = async () => {
    try {
      const { data, error } = await supabase
        .from('stud_listings')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id || '')
        .single();

      if (error) {
        console.error('Error fetching stud listing:', error);
        toast.error('Failed to fetch stud listing');
        router.push('/my-seller-dashboard/listings');
        return;
      }

      setListing(data);
    } catch (error) {
      console.error('Error fetching stud listing:', error);
      toast.error('Failed to fetch stud listing');
      router.push('/my-seller-dashboard/listings');
    } finally {
      setIsLoading(false);
    }
  };

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
          <h1 className="text-3xl font-berkshire text-brand-dark-green mb-2">Edit Stud Listing</h1>
          <p className="text-gray-600">Update your listing details. Changes will be reviewed by admin.</p>
        </div>

        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm text-blue-900 font-medium mb-1">Editing Your Listing</p>
                <p className="text-sm text-blue-800">
                  When you save changes, your images will be updated immediately. Other changes will be submitted for admin review and your listing will remain active during the review process.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <StudListingEditForm 
          editMode={true}
          existingListing={listing}
          isAdminEdit={false}
        />
      </div>
    </div>
  );
}

