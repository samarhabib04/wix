'use client';

import { useBoostRealtimeSync } from '@/hooks/useBoostRealtimeSync';

/** Mount once under QueryClientProvider to sync boost UI across tabs/devices. */
export function BoostRealtimeSync() {
  useBoostRealtimeSync();
  return null;
}
