import { supabase } from '@/lib/supabase/client';

export type HealthCodeType = 'H1' | 'V1' | 'V2';

export type ListingCodeOwnerType = 'sale' | 'stud';

export interface HealthCode {
  id: string;
  code: string;
  code_type: HealthCodeType;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface HealthCodeValidationContext {
  excludeListingId?: string;
  excludeListingType?: ListingCodeOwnerType;
}

/**
 * Validates a single health code: exists in DB, active, and not locked by another listing.
 */
export async function validateHealthCode(
  code: string,
  codeType: HealthCodeType,
  context?: HealthCodeValidationContext,
): Promise<boolean> {
  if (!code || !code.trim()) {
    return true;
  }

  const normalizedCode = code.trim().toUpperCase();

  try {
    const { data, error } = await (
      supabase as unknown as {
        rpc: (
          name: string,
          params: Record<string, unknown>,
        ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
      }
    ).rpc('check_health_code_available', {
      p_code: normalizedCode,
      p_code_type: codeType,
      p_exclude_listing_id: context?.excludeListingId ?? null,
      p_exclude_listing_type: context?.excludeListingType ?? null,
    });

    if (error) {
      console.error('Error validating health code:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Exception validating health code:', error);
    return false;
  }
}

export interface CodeValidationResult {
  code: string;
  type: HealthCodeType;
  isValid: boolean;
  /** Code exists but is locked to another listing */
  isReused?: boolean;
}

function findDuplicateCodesInBatch(
  codes: { code: string; type: HealthCodeType }[],
): Array<{ code: string; type: HealthCodeType }> {
  const seen = new Set<string>();
  const dupes: Array<{ code: string; type: HealthCodeType }> = [];
  for (const { code, type } of codes) {
    const key = `${code.trim().toUpperCase()}:${type}`;
    if (seen.has(key)) {
      dupes.push({ code: code.trim().toUpperCase(), type });
    } else {
      seen.add(key);
    }
  }
  return dupes;
}

async function classifyCode(
  code: string,
  type: HealthCodeType,
  context?: HealthCodeValidationContext,
): Promise<{ isValid: boolean; isReused: boolean }> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { isValid: true, isReused: false };

  const { data: exists } = await (supabase as any)
    .from('health_codes')
    .select('id')
    .eq('code', normalized)
    .eq('code_type', type)
    .eq('is_active', true)
    .maybeSingle();

  if (!exists) {
    return { isValid: false, isReused: false };
  }

  const available = await validateHealthCode(normalized, type, context);
  if (!available) {
    return { isValid: false, isReused: true };
  }

  return { isValid: true, isReused: false };
}

/**
 * Validates multiple health codes at once (existence + reuse lock).
 */
export async function validateMultipleCodes(
  codes: { code: string; type: HealthCodeType }[],
  context?: HealthCodeValidationContext,
): Promise<{
  valid: boolean;
  invalidCodes: Array<{ code: string; type: HealthCodeType }>;
  reusedCodes: Array<{ code: string; type: HealthCodeType }>;
  results: CodeValidationResult[];
}> {
  const codesToValidate = codes.filter((c) => c.code && c.code.trim());

  if (codesToValidate.length === 0) {
    return { valid: true, invalidCodes: [], reusedCodes: [], results: [] };
  }

  const dupes = findDuplicateCodesInBatch(codesToValidate);
  if (dupes.length > 0) {
    return {
      valid: false,
      invalidCodes: dupes,
      reusedCodes: [],
      results: dupes.map((d) => ({ ...d, isValid: false, isReused: false })),
    };
  }

  const results: CodeValidationResult[] = await Promise.all(
    codesToValidate.map(async ({ code, type }) => {
      const { isValid, isReused } = await classifyCode(code, type, context);
      return {
        code: code.trim().toUpperCase(),
        type,
        isValid,
        isReused,
      };
    }),
  );

  const invalidCodes = results.filter((r) => !r.isValid && !r.isReused);
  const reusedCodes = results.filter((r) => r.isReused);

  return {
    valid: invalidCodes.length === 0 && reusedCodes.length === 0,
    invalidCodes: invalidCodes.map((r) => ({ code: r.code, type: r.type })),
    reusedCodes: reusedCodes.map((r) => ({ code: r.code, type: r.type })),
    results,
  };
}

export async function validateHealthCodeRealtime(
  code: string,
  codeType: HealthCodeType,
  context?: HealthCodeValidationContext,
): Promise<{
  isValid: boolean;
  exists: boolean;
  formatValid: boolean;
  isReused: boolean;
}> {
  if (!code || !code.trim()) {
    return { isValid: false, exists: false, formatValid: false, isReused: false };
  }

  const formatRegex = /^[A-Z0-9]{12}$/;
  const normalizedCode = code.trim().toUpperCase();
  const formatValid = formatRegex.test(normalizedCode);

  if (!formatValid) {
    return { isValid: false, exists: false, formatValid: false, isReused: false };
  }

  const { data: existsRow } = await (supabase as any)
    .from('health_codes')
    .select('id')
    .eq('code', normalizedCode)
    .eq('code_type', codeType)
    .eq('is_active', true)
    .maybeSingle();

  if (!existsRow) {
    return { isValid: false, exists: false, formatValid: true, isReused: false };
  }

  const available = await validateHealthCode(normalizedCode, codeType, context);
  if (!available) {
    return { isValid: false, exists: true, formatValid: true, isReused: true };
  }

  return { isValid: true, exists: true, formatValid: true, isReused: false };
}

export async function getAllActiveCodes(
  codeType?: HealthCodeType,
): Promise<HealthCode[]> {
  try {
    const { data, error } = codeType
      ? await (supabase as any)
          .from('health_codes')
          .select('*')
          .eq('is_active', true)
          .eq('code_type', codeType)
          .order('code', { ascending: true })
      : await (supabase as any)
          .from('health_codes')
          .select('*')
          .eq('is_active', true)
          .order('code', { ascending: true });

    if (error) {
      console.error(`Error fetching ${codeType || 'all'} health codes:`, error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching active health codes:', error);
    return [];
  }
}
