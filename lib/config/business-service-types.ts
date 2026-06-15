/**
 * Canonical business service categories (filters + listing type field).
 * Legacy strings match older `business_listings.type` values so filters still work.
 */

export interface BusinessServiceTypeOption {
  value: string;
  label: string;
  /** Previous form/DB labels that should match this category */
  legacyMatches?: readonly string[];
}

export const BUSINESS_SERVICE_TYPE_OPTIONS: readonly BusinessServiceTypeOption[] = [
  { value: 'Vets', label: 'Vets', legacyMatches: ['Veterinary Clinics', 'Mobile Vets'] },
  { value: 'Emergency vets', label: 'Emergency vets', legacyMatches: ['Emergency Animal Care (24/7)'] },
  {
    value: 'Veterinary specialists',
    label: 'Veterinary specialists',
    legacyMatches: ['Pet Acupuncture'],
  },
  { value: 'Dog groomers', label: 'Dog groomers', legacyMatches: ['Dog Grooming (salon & mobile)', 'Self-Service Dog Wash'] },
  { value: 'Mobile dog groomers', label: 'Mobile dog groomers', legacyMatches: ['Dog Grooming (salon & mobile)'] },
  { value: 'Dog trainers', label: 'Dog trainers', legacyMatches: ['Dog Training'] },
  { value: 'Puppy trainers', label: 'Puppy trainers' },
  { value: 'Behaviourists', label: 'Behaviourists' },
  { value: 'Dog walkers', label: 'Dog walkers', legacyMatches: ['Dog Walking (solo or group)'] },
  { value: 'Dog sitters', label: 'Dog sitters', legacyMatches: ['Dog Sitting'] },
  {
    value: 'Doggy day care',
    label: 'Doggy day care',
    legacyMatches: ['Doggy Daycare', 'Doggy daycare'],
  },
  { value: 'Boarding kennels', label: 'Boarding kennels', legacyMatches: ['Kennels / Pet Hotels'] },
  { value: 'Home boarding', label: 'Home boarding', legacyMatches: ['Home Boarding (private homes)'] },
  {
    value: 'Pet transport',
    label: 'Pet transport',
    legacyMatches: ['Pet Taxi / Transport Services'],
  },
  {
    value: 'Dog taxi services',
    label: 'Dog taxi services',
    legacyMatches: ['Pet Taxi / Transport Services'],
  },
  { value: 'Dog physiotherapy', label: 'Dog physiotherapy', legacyMatches: ['Pet Physiotherapy'] },
  { value: 'Hydrotherapy', label: 'Hydrotherapy' },
  { value: 'Canine massage', label: 'Canine massage' },
  { value: 'Dog nutritionists', label: 'Dog nutritionists', legacyMatches: ['Pet Nutrition Consultation'] },
  { value: 'Raw food suppliers', label: 'Raw food suppliers' },
  { value: 'Pet shops', label: 'Pet shops', legacyMatches: ['Pet Store'] },
  { value: 'Dog boutiques / accessories', label: 'Dog boutiques / accessories' },
  { value: 'Breeders', label: 'Breeders' },
  { value: 'Rescue centres', label: 'Rescue centres', legacyMatches: ['Pet Rehoming / Rescue Services (e.g. Dogs Trust, ISPCA)'] },
  {
    value: 'Rehoming services',
    label: 'Rehoming services',
    legacyMatches: ['Pet Rehoming / Rescue Services (e.g. Dogs Trust, ISPCA)'],
  },
  {
    value: 'Pet photographers',
    label: 'Pet photographers',
    legacyMatches: ['Pet Photography', 'Pet Portraits'],
  },
  { value: 'Pet cremation / memorial services', label: 'Pet cremation / memorial services', legacyMatches: ['Pet Crematorium'] },
  { value: 'Dog waste removal services', label: 'Dog waste removal services' },
  { value: 'Kennel / run builders', label: 'Kennel / run builders' },
  { value: 'Fencing suppliers / installers', label: 'Fencing suppliers / installers' },
  { value: 'Pet insurance providers', label: 'Pet insurance providers' },
  { value: 'Microchipping services', label: 'Microchipping services' },
  { value: 'Dog boarding for special needs / elderly dogs', label: 'Dog boarding for special needs / elderly dogs' },
  { value: 'Dog hiking / adventure services', label: 'Dog hiking / adventure services' },
  { value: 'Puppy socialisation classes', label: 'Puppy socialisation classes' },
  { value: 'Obedience classes', label: 'Obedience classes' },
  { value: 'Agility / sport dog training', label: 'Agility / sport dog training' },
  { value: 'Dog-friendly accommodation', label: 'Dog-friendly accommodation' },
  { value: 'Pet relocation services', label: 'Pet relocation services' },
  { value: 'Dog breeding supplies / whelping supplies', label: 'Dog breeding supplies / whelping supplies' },
] as const;

/** Values for `<select>` / Zod — canonical types plus Other */
export const BUSINESS_SERVICE_TYPE_VALUES: readonly string[] = [
  ...BUSINESS_SERVICE_TYPE_OPTIONS.map((o) => o.value),
  'Other',
];

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Map a stored `business_listings.type` (canonical or legacy) to the matching dropdown value.
 */
export function normalizeStoredBusinessTypeForForm(stored: string | null | undefined): string {
  const t = (stored || '').trim();
  if (!t) return '';
  if (norm(t) === 'other') return 'Other';
  for (const opt of BUSINESS_SERVICE_TYPE_OPTIONS) {
    if (norm(opt.value) === norm(t)) return opt.value;
    if (opt.legacyMatches?.some((l) => norm(l) === norm(t))) return opt.value;
  }
  return t;
}

/** Values for business type `<Select>` including any legacy-only stored value on this listing. */
export function getBusinessTypeSelectValues(initialStoredType: string | null | undefined): readonly string[] {
  const normalized = normalizeStoredBusinessTypeForForm(initialStoredType || '');
  const base = [...BUSINESS_SERVICE_TYPE_VALUES];
  if (normalized && !base.includes(normalized)) {
    return [normalized, ...base];
  }
  return base;
}

/**
 * Label for UI: maps stored `type` (canonical or legacy) to the canonical label.
 */
export function getBusinessServiceTypeLabel(type: string | null | undefined): string {
  const t = (type || '').trim();
  if (!t) return 'Service';
  const n = norm(t);
  for (const opt of BUSINESS_SERVICE_TYPE_OPTIONS) {
    if (norm(opt.value) === n || norm(opt.label) === n) return opt.label;
    if (opt.legacyMatches?.some((l) => norm(l) === n)) return opt.label;
  }
  if (n === 'other') return 'Other';
  return t;
}

/**
 * Whether a listing matches the services directory filter value.
 */
export function businessMatchesServiceFilter(
  filterValue: string,
  businessType: string | null | undefined,
  hasMarketplaceProducts?: boolean | null
): boolean {
  if (filterValue === 'all') return true;
  if (filterValue === 'Dog Products') {
    return hasMarketplaceProducts === true;
  }
  const t = (businessType || '').trim();
  if (!t) return false;
  if (filterValue === 'Other') {
    return norm(t) === 'other';
  }
  const opt = BUSINESS_SERVICE_TYPE_OPTIONS.find((o) => o.value === filterValue);
  if (!opt) {
    return norm(t) === norm(filterValue);
  }
  if (norm(t) === norm(opt.value)) return true;
  if (opt.legacyMatches?.some((l) => norm(l) === norm(t))) return true;
  return false;
}
