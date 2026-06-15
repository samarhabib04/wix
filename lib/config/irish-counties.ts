import { irishCounties } from '@/lib/utils/irish-data';

/** Counties only (no “All”) — same order as registration / listing forms. */
export const IRISH_COUNTIES = irishCounties as unknown as readonly string[];

export const IRISH_COUNTY_FILTER_OPTIONS = ['All Counties', ...irishCounties] as const;

export function resolveCountyQueryParam(param: string | null | undefined): string | null {
  if (!param || !param.trim()) return null;
  const q = param.trim().toLowerCase();
  const found = IRISH_COUNTY_FILTER_OPTIONS.find((c) => c.toLowerCase() === q);
  return found ?? null;
}
