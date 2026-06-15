/**
 * Curated service categories for the homepage “Find services near you” carousel.
 * `filterValue` must match `SERVICE_FILTER_OPTIONS` / `businessMatchesServiceFilter` on /services.
 */
export interface HomepageServiceCategoryTile {
  filterValue: string;
  label: string;
  description: string;
}

export const HOMEPAGE_SERVICE_CATEGORY_TILES: readonly HomepageServiceCategoryTile[] = [
  { filterValue: 'Vets', label: 'Dog vets', description: 'Clinics & practices' },
  { filterValue: 'Emergency vets', label: 'Emergency vets', description: '24/7 care' },
  { filterValue: 'Dog groomers', label: 'Puppy & dog groomers', description: 'Salon & spa' },
  { filterValue: 'Mobile dog groomers', label: 'Mobile groomers', description: 'Comes to you' },
  { filterValue: 'Dog walkers', label: 'Dog walkers', description: 'Solo or group walks' },
  { filterValue: 'Dog sitters', label: 'Dog sitters', description: 'Home visits' },
  { filterValue: 'Doggy day care', label: 'Doggy day care', description: 'Daytime care' },
  { filterValue: 'Boarding kennels', label: 'Boarding kennels', description: 'Stays & holidays' },
  { filterValue: 'Dog trainers', label: 'Dog trainers', description: 'Training & skills' },
  { filterValue: 'Puppy trainers', label: 'Puppy trainers', description: 'Young dogs' },
  { filterValue: 'Behaviourists', label: 'Behaviourists', description: 'Behaviour support' },
  { filterValue: 'Pet shops', label: 'Pet shops', description: 'Food & supplies' },
  { filterValue: 'Dog Products', label: 'Dog products', description: 'Shops with products' },
  { filterValue: 'Microchipping services', label: 'Microchipping', description: 'ID & compliance' },
  { filterValue: 'Pet transport', label: 'Pet transport', description: 'Taxi & travel' },
  { filterValue: 'Pet photographers', label: 'Pet photographers', description: 'Portraits' },
];
