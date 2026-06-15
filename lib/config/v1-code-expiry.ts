/** V1 green tick expires if V2 is not uploaded within this period (from verification_date). */
export const V1_CODE_VALID_DAYS = 28;

export const V1_CODE_REMINDER_DAYS = [7, 1] as const;

export function v1CodeExpiresAt(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + V1_CODE_VALID_DAYS);
  return d;
}
