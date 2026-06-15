import { z } from 'zod';

/** Canonical stud listing sex — only male dogs may be listed for stud. */
export const STUD_LISTING_SEX = 'Male' as const;

export function normalizeStudListingSex(value: unknown): typeof STUD_LISTING_SEX {
  if (typeof value === 'string' && value.toLowerCase().trim() === 'male') {
    return STUD_LISTING_SEX;
  }
  return STUD_LISTING_SEX;
}

export function isValidStudListingSex(value: unknown): boolean {
  return typeof value === 'string' && value.toLowerCase().trim() === 'male';
}

export const studListingSexSchema = z
  .string()
  .min(1, 'Sex is required')
  .refine(isValidStudListingSex, {
    message: 'Stud listings must be male',
  });
