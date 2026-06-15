import { addDays, addHours } from 'date-fns';

export type ManualBoostDurationPresetId =
  | '1h'
  | '3h'
  | '6h'
  | '12h'
  | '24h'
  | '1d'
  | '2d'
  | '3d'
  | '7d'
  | '14d'
  | '30d'
  | '60d'
  | '90d'
  | 'custom';

export interface ManualBoostDurationPreset {
  id: ManualBoostDurationPresetId;
  label: string;
  /** Only set for non-custom presets */
  addToStart?: (start: Date) => Date;
}

export const MANUAL_BOOST_DURATION_PRESETS: ManualBoostDurationPreset[] = [
  { id: '1h', label: '1 hour', addToStart: (s) => addHours(s, 1) },
  { id: '3h', label: '3 hours', addToStart: (s) => addHours(s, 3) },
  { id: '6h', label: '6 hours', addToStart: (s) => addHours(s, 6) },
  { id: '12h', label: '12 hours', addToStart: (s) => addHours(s, 12) },
  { id: '24h', label: '24 hours', addToStart: (s) => addHours(s, 24) },
  { id: '1d', label: '1 day', addToStart: (s) => addDays(s, 1) },
  { id: '2d', label: '2 days', addToStart: (s) => addDays(s, 2) },
  { id: '3d', label: '3 days', addToStart: (s) => addDays(s, 3) },
  { id: '7d', label: '7 days', addToStart: (s) => addDays(s, 7) },
  { id: '14d', label: '14 days', addToStart: (s) => addDays(s, 14) },
  { id: '30d', label: '30 days', addToStart: (s) => addDays(s, 30) },
  { id: '60d', label: '60 days', addToStart: (s) => addDays(s, 60) },
  { id: '90d', label: '90 days', addToStart: (s) => addDays(s, 90) },
  { id: 'custom', label: 'Custom date & time' },
];

const PRESET_BY_ID = new Map(
  MANUAL_BOOST_DURATION_PRESETS.map((p) => [p.id, p])
);

export const DEFAULT_MANUAL_BOOST_DURATION_ID: ManualBoostDurationPresetId = '1d';

export function getBoostEndTimeForPreset(
  presetId: ManualBoostDurationPresetId,
  start: Date = new Date()
): Date {
  const preset = PRESET_BY_ID.get(presetId);
  if (!preset?.addToStart) {
    return addDays(start, 1);
  }
  return preset.addToStart(start);
}

/** Match an existing boost window to a preset (for the duration dropdown). */
export function matchDurationPresetId(
  start: Date,
  end: Date
): ManualBoostDurationPresetId {
  const toleranceMs = 90_000; // 1.5 min — clock skew / rounding
  for (const preset of MANUAL_BOOST_DURATION_PRESETS) {
    if (!preset.addToStart) continue;
    const expected = preset.addToStart(start);
    if (Math.abs(expected.getTime() - end.getTime()) <= toleranceMs) {
      return preset.id;
    }
  }
  return 'custom';
}

export function toDatetimeLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function parseDatetimeLocalInputValue(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
