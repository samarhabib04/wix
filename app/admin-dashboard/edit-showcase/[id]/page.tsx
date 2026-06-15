'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ShowcaseListingForm from "@/components/seller-dashboard/forms/ShowcaseListingForm";
import { supabase } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { logSupabaseOperation } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { adminToast } from '@/lib/utils/adminToast';
import Link from 'next/link';

export default function AdminEditShowcaseListingPage() {
  const params = useParams();
  const router = useRouter();
  const { role } = useAuth();
  const { toast } = useToast();
  const id = params.id as string;

  useEffect(() => {
    if (role && role !== 'admin') {
      toast(adminToast.error('Access denied. Admin privileges required.'));
      router.push('/admin-dashboard');
    }
  }, [role, router, toast]);

  const { data: listing, isLoading, error } = useQuery({
    queryKey: ['admin-showcase-listing', id],
    queryFn: async () => {
      if (!id) throw new Error("Listing ID is required");
      
      const { data, error } = await supabase
        .from('showcase_listings')
        .select('*')
        .eq('id', id)
        .single();
        
      await logSupabaseOperation('fetch showcase listing for admin edit', data, error);
        
      if (error) throw error;
      return data;
    },
    enabled: !!id && role === 'admin',
  });

  if (error) {
    console.error("Error fetching listing:", error);
    return (
      <div className="container mx-auto py-6 space-y-6 px-4">
        <div className="bg-white p-6 rounded-lg shadow-sm text-center">
          <h2 className="text-2xl font-berkshire text-red-600 mb-4">Error</h2>
          <p>Unable to load the listing. Please try again later.</p>
          <Button 
            onClick={() => router.push('/admin-dashboard/listings')}
            className="mt-4"
          >
            Return to Listings Management
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 py-6 px-4">
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
        
        <h1 className="text-4xl font-berkshire text-brand-dark-green mb-2">Edit Showcase Listing (Admin)</h1>
        <p className="text-gray-600">
          Edit this showcase listing as an administrator. Changes will be automatically approved.
        </p>
      </div>

      {isLoading ? (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="space-y-4">
            <Skeleton className="h-12 w-1/3" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      ) : (
        <ShowcaseListingForm editMode={true} existingListing={listing} isAdminEdit={true} />
      )}
    </div>
  );
}




























