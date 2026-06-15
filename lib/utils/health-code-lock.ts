import { supabase } from '@/lib/supabase/client';
import type {
  HealthCodeType,
  HealthCodeValidationContext,
  ListingCodeOwnerType,
} from './code-validation';

export interface HealthCodeUsageInfo {
  code: string;
  code_type: HealthCodeType;
  listing_id: string;
  listing_type: ListingCodeOwnerType;
  locked_at: string;
  listing_title?: string | null;
}

/** True if code exists, is active, and is not locked by another listing. */
export async function isHealthCodeAvailable(
  code: string,
  codeType: HealthCodeType,
  context?: HealthCodeValidationContext,
): Promise<boolean> {
  if (!code?.trim()) return true;

  const { data, error } = await (
    supabase as unknown as {
      rpc: (
        name: string,
        params: Record<string, unknown>,
      ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
    }
  ).rpc('check_health_code_available', {
    p_code: code.trim().toUpperCase(),
    p_code_type: codeType,
    p_exclude_listing_id: context?.excludeListingId ?? null,
    p_exclude_listing_type: context?.excludeListingType ?? null,
  });

  if (error) {
    console.error('check_health_code_available error:', error);
    return false;
  }

  return data === true;
}

export async function fetchHealthCodeUsages(): Promise<HealthCodeUsageInfo[]> {
  const { data, error } = await supabase
    .from('health_code_usages' as any)
    .select('code, code_type, listing_id, listing_type, locked_at');

  if (error) {
    console.error('fetchHealthCodeUsages error:', error);
    return [];
  }

  const rows = (data ?? []) as unknown as HealthCodeUsageInfo[];
  if (rows.length === 0) return rows;

  const saleIds = rows.filter((r) => r.listing_type === 'sale').map((r) => r.listing_id);
  const studIds = rows.filter((r) => r.listing_type === 'stud').map((r) => r.listing_id);

  const titleByKey = new Map<string, string>();

  if (saleIds.length > 0) {
    const { data: sales } = await supabase
      .from('sale_listings')
      .select('id, title')
      .in('id', saleIds);
    sales?.forEach((s) => titleByKey.set(`sale:${s.id}`, s.title));
  }

  if (studIds.length > 0) {
    const { data: studs } = await supabase
      .from('stud_listings')
      .select('id, title')
      .in('id', studIds);
    studs?.forEach((s) => titleByKey.set(`stud:${s.id}`, s.title));
  }

  return rows.map((r) => ({
    ...r,
    listing_title: titleByKey.get(`${r.listing_type}:${r.listing_id}`) ?? null,
  }));
}

export async function syncHealthCodeLocksForListing(
  listingId: string,
  listingType: ListingCodeOwnerType,
): Promise<void> {
  const { error } = await (
    supabase as unknown as {
      rpc: (
        name: string,
        params: Record<string, unknown>,
      ) => Promise<{ error: { message: string } | null }>;
    }
  ).rpc('sync_health_code_locks_for_listing', {
    p_listing_id: listingId,
    p_listing_type: listingType,
  });
  if (error) throw error;
}
