'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import SaleListingForm from "@/components/seller-dashboard/forms/SaleListingForm";
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { useAuth } from '@/contexts/AuthContext';

function AddSaleListingContent() {
  const router = useRouter();
  const { user, isLoading: authLoading, role } = useAuth();
  const searchParams = useSearchParams();
  const draftId = searchParams.get('draft');
  const [maxWaitTimeReached, setMaxWaitTimeReached] = useState(false);

  useEffect(() => {
    // Maximum wait time of 3 seconds - prevent infinite loading
    const timeoutId = setTimeout(() => {
      setMaxWaitTimeReached(true);
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, []);

  // Check authentication and role
  useEffect(() => {
    // Wait for auth to load (max 3 seconds)
    if (authLoading && !maxWaitTimeReached) return;
    
    // Redirect to login if not authenticated after max wait
    if (!user && maxWaitTimeReached) {
      router.push(`/auth/login?next=${encodeURIComponent('/add-sale-listing' + (draftId ? `?draft=${draftId}` : ''))}`);
      return;
    }
    
    // Check role only if it's loaded
    if (role !== null && role !== 'seller' && role !== 'admin') {
      router.push('/my-seller-dashboard');
      return;
    }
  }, [user, authLoading, role, router, draftId, maxWaitTimeReached]);

  // Fetch draft data if draft ID is present
  const { data: draftData, isLoading } = useQuery({
    queryKey: ['sale-listing-draft', draftId],
    queryFn: async () => {
      if (!draftId) return null;
      
      const { data, error } = await supabase
        .from('sale_listing_drafts')
        .select('*')
        .eq('id', draftId)
        .maybeSingle();
        
      if (error) throw error;
      return data;
    },
    enabled: !!draftId,
  });

  // Show loading only briefly (max 3 seconds) or when loading draft
  if ((authLoading && !maxWaitTimeReached) || (isLoading && draftId)) {
    return <LoadingSpinner fullPage label={isLoading ? "Loading draft..." : "Loading..."} />;
  }

  return (
    <div className="w-full bg-brand-soft-green/10 pb-20">
      <div className="container mx-auto py-6 space-y-6 px-4">
        <div className="flex flex-col space-y-2">
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 text-gray-600 -ml-2"
              asChild
            >
              <Link href="/seller-dashboard/create-listing">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to Select Listing Type
              </Link>
            </Button>
          </div>

          <h1 className="text-4xl font-berkshire text-brand-dark-green mb-2">
            {draftData ? 'Continue Draft' : 'Add Puppy/Litter Listing'}
          </h1>
          <p className="text-gray-600">
            {draftData 
              ? `Continue editing your draft: ${draftData.draft_name}` 
              : 'Create a listing for your puppies. Fill in the details below and submit for review.'}
          </p>
        </div>

        <SaleListingForm initialData={draftData?.form_data} draftId={draftId || undefined} />
      </div>
    </div>
  );
}

export default function AddSaleListingPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage label="Loading..." />}>
      <AddSaleListingContent />
    </Suspense>
  );
}




























