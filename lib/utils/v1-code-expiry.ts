import { V1_CODE_VALID_DAYS } from '@/lib/config/v1-code-expiry';
import {
  extractCodesFromPuppyDetails,
  extractCodesFromStudListing,
} from '@/lib/utils/code-verification';

export function listingHasV1OnlyFromPuppyDetails(puppyDetails: unknown): boolean {
  const codes = extractCodesFromPuppyDetails(
    Array.isArray(puppyDetails) ? puppyDetails : [],
  );
  const hasV1 = codes.some((c) => c.type === 'V1');
  const hasV2 = codes.some((c) => c.type === 'V2');
  return hasV1 && !hasV2;
}

export function studListingHasV1Only(stud: {
  v1_cert?: string | null;
  v2_cert?: string | null;
}): boolean {
  const codes = extractCodesFromStudListing({
    v1_cert: stud.v1_cert ?? undefined,
    v2_cert: stud.v2_cert ?? undefined,
  });
  const hasV1 = codes.some((c) => c.type === 'V1');
  const hasV2 = codes.some((c) => c.type === 'V2');
  return hasV1 && !hasV2;
}

export function v1ExpiryAnchor(
  verificationDate: string | null | undefined,
  createdAt: string | null | undefined,
): Date | null {
  const raw = verificationDate || createdAt;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isV1GreenTickExpired(
  verificationDate: string | null | undefined,
  createdAt: string | null | undefined,
  hasV2: boolean,
): boolean {
  if (hasV2) return false;
  const anchor = v1ExpiryAnchor(verificationDate, createdAt);
  if (!anchor) return false;
  const expires = new Date(anchor);
  expires.setDate(expires.getDate() + V1_CODE_VALID_DAYS);
  return expires.getTime() <= Date.now();
}

export function v1DaysRemaining(
  verificationDate: string | null | undefined,
  createdAt: string | null | undefined,
): number | null {
  const anchor = v1ExpiryAnchor(verificationDate, createdAt);
  if (!anchor) return null;
  const expires = new Date(anchor);
  expires.setDate(expires.getDate() + V1_CODE_VALID_DAYS);
  const ms = expires.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}
