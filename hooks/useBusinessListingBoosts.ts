'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { BOOST_SYNC_EVENT } from '@/hooks/useBoostRealtimeSync';

export interface BusinessListingBoost {
  id: string;
  business_id: string;
  boost_start_time: string;
  is_active: boolean;
  payment_status: string;
  boost_end_time?: string | null;
}

export type BusinessBoostsByListingId = Record<string, BusinessListingBoost[]>;

function groupActiveBoosts(rows: BusinessListingBoost[]): BusinessBoostsByListingId {
  const map: BusinessBoostsByListingId = {};
  const now = Date.now();

  for (const boost of rows) {
    if (!boost.is_active || boost.payment_status !== 'paid') continue;
    if (!isBoostLiveNow(boost, now)) continue;
    if (!map[boost.business_id]) map[boost.business_id] = [];
    map[boost.business_id].push(boost);
  }

  return map;
}

function isBoostLiveNow(boost: BusinessListingBoost, now: number): boolean {
  if (!boost.boost_end_time) return true;
  return new Date(boost.boost_end_time).getTime() > now;
}

async function fetchActiveBusinessBoosts(
  businessIds: string[],
): Promise<BusinessBoostsByListingId> {
  if (businessIds.length === 0) return {};

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('business_boosts' as any)
    .select('id, business_id, boost_start_time, is_active, payment_status, boost_end_time')
    .in('business_id', businessIds)
    .eq('is_active', true)
    .eq('payment_status', 'paid')
    .or(`boost_end_time.is.null,boost_end_time.gt.${nowIso}`)
    .order('boost_start_time', { ascending: false });

  if (error) {
    console.error('Error fetching business boosts:', error);
    return {};
  }

  return groupActiveBoosts((data as unknown as BusinessListingBoost[]) || []);
}

/**
 * Active paid boosts per business listing, kept in sync when boosts expire,
 * are rotated out, or are deactivated (realtime + global boost sync event).
 */
export function useBusinessListingBoosts(businessIds: string[]) {
  const [businessBoosts, setBusinessBoosts] = useState<BusinessBoostsByListingId>({});
  const idsKey = businessIds.slice().sort().join(',');

  const refetchBoosts = useCallback(async () => {
    const map = await fetchActiveBusinessBoosts(businessIds);
    setBusinessBoosts(map);
  }, [idsKey]);

  useEffect(() => {
    void refetchBoosts();
  }, [refetchBoosts]);

  useEffect(() => {
    const onSync = () => void refetchBoosts();
    window.addEventListener(BOOST_SYNC_EVENT, onSync);
    return () => window.removeEventListener(BOOST_SYNC_EVENT, onSync);
  }, [refetchBoosts]);

  useEffect(() => {
    if (businessIds.length === 0) return;

    const channel = supabase.channel(`business-dashboard-boosts:${idsKey}`);

    for (const businessId of businessIds) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_boosts',
          filter: `business_id=eq.${businessId}`,
        },
        () => void refetchBoosts(),
      );
    }

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [idsKey, businessIds, refetchBoosts]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refetchBoosts();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refetchBoosts]);

  return { businessBoosts, refetchBoosts };
}
