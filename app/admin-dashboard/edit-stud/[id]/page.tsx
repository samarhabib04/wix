'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import StudListingEditForm from "@/components/seller-dashboard/forms/StudListingEditForm";
import { adminToast } from '@/lib/utils/adminToast';
import Link from 'next/link';

export default function AdminEditStudListingPage() {
  const params = useParams();
  const router = useRouter();
  const { user, role } = useAuth();
  const { toast } = useToast();
  const id = params.id as string;
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (role && role !== 'admin') {
      toast(adminToast.error('Access denied. Admin privileges required.'));
      router.push('/admin-dashboard');
    }
  }, [role, router, toast]);

  const { data: studListing, isLoading: isLoadingListing, error } = useQuery({
    queryKey: ['admin-stud-listing', id],
    queryFn: async () => {
      if (!id) throw new Error('No listing ID provided');
      
      const { data, error } = await supabase
        .from('stud_listings')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      return data;
    },
    enabled: !!id && role === 'admin',
  });

  useEffect(() => {
    if (!isLoadingListing) {
      setIsLoading(false);
    }
  }, [isLoadingListing]);

  useEffect(() => {
    if (error) {
      toast(adminToast.error('Failed to load stud listing'));
      router.push('/admin-dashboard/listings');
    }
  }, [error, router, toast]);

  if (isLoading || isLoadingListing) {
    return (
      <div className="container mx-auto py-6 space-y-6 px-4 mb-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading stud listing...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!studListing) {
    return (
      <div className="container mx-auto py-6 space-y-6 px-4 mb-12">
        <Card>
          <CardHeader>
            <CardTitle>Listing Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">The stud listing you're looking for could not be found.</p>
            <Button asChild>
              <Link href="/admin-dashboard/listings">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Listings Management
              </Link>
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
            asChild
          >
            <Link href="/admin-dashboard/listings">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Listings Management
            </Link>
          </Button>
        </div>

        <h1 className="text-4xl font-berkshire text-blue-600 mb-2">
          Edit Stud Listing (Admin)
        </h1>
        <p className="text-gray-600">
          Edit this stud dog listing as an administrator. Changes will be automatically approved.
        </p>
      </div>

      <StudListingEditForm editMode={true} existingListing={studListing} isAdminEdit={true} />
    </div>
  );
}




























