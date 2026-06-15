import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

export const useBoostNavigation = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const openBoostModal = async (listingId: string, listingType: 'sale' | 'stud' | 'showcase') => {
    try {
      setIsLoading(true);
      
      // Get listing title
      let query;
      switch (listingType) {
        case 'sale':
          query = supabase.from('sale_listings').select('title').eq('id', listingId).single();
          break;
        case 'stud':
          query = supabase.from('stud_listings').select('title').eq('id', listingId).single();
          break;
        case 'showcase':
          query = supabase.from('showcase_listings').select('title').eq('id', listingId).single();
          break;
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Store in sessionStorage for Next.js navigation (no state support)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('boostListingId', listingId);
        sessionStorage.setItem('boostListingType', listingType);
        sessionStorage.setItem('boostListingTitle', data?.title || 'Listing');
      }

      // Navigate to boost listing page
      router.push('/boost-listing');
    } catch (error) {
      console.error('Error opening boost modal:', error);
      toast.error('Failed to open boost modal');
    } finally {
      setIsLoading(false);
    }
  };

  return { openBoostModal, isLoading };
};
