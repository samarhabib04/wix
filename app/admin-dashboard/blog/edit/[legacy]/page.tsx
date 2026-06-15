'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { isPostUuid } from '@/lib/utils/blog-slug';
import LoadingSpinner from '@/components/ui/loading-spinner';

/** Redirects old /edit/{slug-or-id} URLs to /edit?id={uuid}. */
export default function LegacyBlogEditRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const segment = decodeURIComponent((params.legacy as string) ?? '');

  useEffect(() => {
    if (!segment) {
      router.replace('/admin-dashboard/blog');
      return;
    }

    let cancelled = false;

    (async () => {
      if (isPostUuid(segment)) {
        router.replace(`/admin-dashboard/blog/edit?id=${segment}`);
        return;
      }

      const { data } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('slug', segment)
        .maybeSingle();

      if (cancelled) return;

      if (data?.id) {
        router.replace(`/admin-dashboard/blog/edit?id=${data.id}`);
      } else {
        router.replace('/admin-dashboard/blog');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [segment, router]);

  return <LoadingSpinner fullPage label="Opening editor..." />;
}
