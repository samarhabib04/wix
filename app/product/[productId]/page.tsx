'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function ProductRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string;

  useEffect(() => {
    const fetchProductSlug = async () => {
      try {
        // Try to fetch the product by ID to get the slug
        const { data, error } = await supabase
          .from('products')
          .select('slug')
          .eq('id', productId)
          .single();

        if (data && data.slug) {
          router.replace(`/shop/${data.slug}`);
        } else {
          // If no slug found, try to redirect to shop with ID as fallback
          router.replace(`/shop/${productId}`);
        }
      } catch (error) {
        // On error, redirect to shop page
        router.replace('/shop');
      }
    };

    if (productId) {
      fetchProductSlug();
    } else {
      router.replace('/shop');
    }
  }, [productId, router]);

  return null;
}

