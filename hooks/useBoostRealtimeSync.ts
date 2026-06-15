'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

/** Dispatched after debounced boost-related invalidation so non–React Query UIs can refetch. */
export const BOOST_SYNC_EVENT = 'dogquest:boosts-invalidate';

const DEBOUNCE_MS = 1500;

/** Requires REPLICA IDENTITY FULL on listing tables so UPDATE `old` includes compared columns. */
function listingAffectsBoostDisplay(
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>
): boolean {
  const { eventType, new: n, old: o } = payload;
  if (eventType === 'INSERT') {
    const row = n as { current_boost_id?: string | null } | null;
    return Boolean(row?.current_boost_id);
  }
  if (eventType === 'DELETE') {
    const row = o as { current_boost_id?: string | null } | null;
    return Boolean(row?.current_boost_id);
  }
  if (eventType === 'UPDATE') {
    const next = n as Record<string, unknown> | null;
    if (!next) return false;
    // `old` can be missing or PK-only if replica identity was wrong; treat as {} so boost changes still invalidate.
    const prev = (o as Record<string, unknown> | null) ?? {};
    if (next.current_boost_id !== prev.current_boost_id) return true;
    const hadOrHasBoost = Boolean(next.current_boost_id || prev.current_boost_id);
    if (!hadOrHasBoost) return false;
    const visKeys = ['is_published', 'is_deleted', 'is_paused', 'admin_approved'] as const;
    return visKeys.some((k) => next[k] !== prev[k]);
  }
  return false;
}

/**
 * Subscribes to boost and listing rows that affect carousel / listing boost state,
 * then invalidates relevant React Query caches and fires {@link BOOST_SYNC_EVENT}.
 */
function runBoostInvalidation(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['unified-listings', 'public'] });
  queryClient.invalidateQueries({ queryKey: ['stud-listings'] });
  queryClient.invalidateQueries({ queryKey: ['seller-sale-listings'] });
  queryClient.invalidateQueries({ queryKey: ['seller-stud-listings'] });
  queryClient.invalidateQueries({ queryKey: ['seller-showcase-listings'] });
  queryClient.invalidateQueries({ queryKey: ['seller-listing-boosts'] });
  queryClient.invalidateQueries({ queryKey: ['boosted-listings'] });
  queryClient.invalidateQueries({ queryKey: ['boost-carousel-listings'] });
  queryClient.invalidateQueries({ queryKey: ['business-boosts-carousel'] });
  queryClient.invalidateQueries({ queryKey: ['business-dashboard-boosts'] });
  queryClient.invalidateQueries({ queryKey: ['marketplace-product-boosts-carousel'] });
  queryClient.invalidateQueries({ queryKey: ['admin-listings'] });
  queryClient.invalidateQueries({ queryKey: ['global-search'] });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BOOST_SYNC_EVENT));
  }
}

export function useBoostRealtimeSync() {
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastVisibilityRefreshRef = useRef(0);

  const scheduleInvalidate = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      runBoostInvalidation(queryClient);
    }, DEBOUNCE_MS);
  }, [queryClient]);

  /** Mobile / multi-tab: WS can miss events while backgrounded; refresh when tab becomes visible again. */
  useEffect(() => {
    const maybeRefresh = () => {
      const now = Date.now();
      if (now - lastVisibilityRefreshRef.current < 1500) return;
      lastVisibilityRefreshRef.current = now;
      runBoostInvalidation(queryClient);
    };

    const onVisibility = () => {
      if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
      maybeRefresh();
    };

    const onPageShow = (e: PageTransitionEvent) => {
      // bfcache restore (common on mobile Safari) — replay same catch-up as visibility return
      if (e.persisted) maybeRefresh();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [queryClient]);

  useEffect(() => {
    const channel = supabase
      .channel('dogquest-boost-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'boosts' },
        () => scheduleInvalidate()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sale_listings' },
        (payload) => {
          if (listingAffectsBoostDisplay(payload)) scheduleInvalidate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stud_listings' },
        (payload) => {
          if (listingAffectsBoostDisplay(payload)) scheduleInvalidate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'showcase_listings' },
        (payload) => {
          if (listingAffectsBoostDisplay(payload)) scheduleInvalidate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'business_boosts' },
        () => scheduleInvalidate()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'marketplace_product_boosts' },
        () => scheduleInvalidate()
      )
      .subscribe();

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [scheduleInvalidate]);
}
