'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function StudListingsRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const queryString = searchParams.toString();
    const redirectUrl = queryString ? `/stud?${queryString}` : '/stud';
    router.replace(redirectUrl);
  }, [router, searchParams]);

  return null;
}

export default function StudListingsRedirect() {
  return (
    <Suspense fallback={null}>
      <StudListingsRedirectContent />
    </Suspense>
  );
}

