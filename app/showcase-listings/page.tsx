'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ShowcaseListingsRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const queryString = searchParams.toString();
    const redirectUrl = queryString ? `/showcase?${queryString}` : '/showcase';
    router.replace(redirectUrl);
  }, [router, searchParams]);

  return null;
}

export default function ShowcaseListingsRedirect() {
  return (
    <Suspense fallback={null}>
      <ShowcaseListingsRedirectContent />
    </Suspense>
  );
}

