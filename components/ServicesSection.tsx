'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Bone,
  Brain,
  Camera,
  CarFront,
  Check,
  ChevronDown,
  Footprints,
  GraduationCap,
  Home,
  IdCard,
  ListFilter,
  MapPinned,
  Package,
  PawPrint,
  Scissors,
  ShoppingBag,
  Siren,
  Stethoscope,
  Sun,
  Truck,
  Warehouse,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { IRISH_COUNTIES } from '@/lib/config/irish-counties';
import { HOMEPAGE_SERVICE_CATEGORY_TILES } from '@/lib/config/homepage-service-categories';

function servicesBrowseUrl(county: string | null, filterValue: string): string {
  const params = new URLSearchParams();
  params.set('type', filterValue);
  if (county) params.set('county', county);
  return `/services?${params.toString()}`;
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Vets: Stethoscope,
  'Emergency vets': Siren,
  'Dog groomers': Scissors,
  'Mobile dog groomers': Truck,
  'Dog walkers': Footprints,
  'Dog sitters': Home,
  'Doggy day care': Sun,
  'Boarding kennels': Warehouse,
  'Dog trainers': GraduationCap,
  'Puppy trainers': Bone,
  Behaviourists: Brain,
  'Pet shops': ShoppingBag,
  'Dog Products': Package,
  'Microchipping services': IdCard,
  'Pet transport': CarFront,
  'Pet photographers': Camera,
};

const ServicesSection: React.FC = () => {
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);

  return (
    <>
      <div className="w-full overflow-hidden">
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="w-full h-[60px] md:h-[80px] relative block"
        >
          <path
            d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z"
            className="fill-white"
          />
        </svg>
      </div>

      <section className="py-0 sm:py-6 px-4 mb-14 md:mb-20 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-6 md:mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-berkshire text-brand-dark-green mb-3">
              Find services near you
            </h2>
            <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto">
              Find trusted pet services sorted by distance from your location.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mb-10">
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-11 border border-[#BFCFBB] bg-white px-5 gap-2 hover:bg-[#F7FAF6]"
                  aria-expanded={filterOpen}
                >
                  <ListFilter className="h-4 w-4 text-brand-dark-green" />
                  Filter by county
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="center"
                sideOffset={8}
                className="z-[200] w-[min(100vw-2rem,22rem)] p-0 overflow-hidden flex flex-col max-h-[min(420px,72vh)] border border-[#BFCFBB] shadow-md"
              >
                <Command
                  shouldFilter
                  className="flex h-full max-h-[min(420px,72vh)] flex-col rounded-md border-0 bg-popover overflow-hidden"
                >
                  <div className="shrink-0 border-b border-border/60 px-1">
                    <CommandInput placeholder="Search counties…" className="h-10 border-0" />
                  </div>
                  <CommandList
                    className={cn(
                      'min-h-0 flex-1 overflow-y-scroll overflow-x-hidden py-1',
                      'max-h-[min(280px,50vh)]',
                      'touch-pan-y',
                      '[scrollbar-gutter:stable]',
                      '[scrollbar-width:thin]',
                      '[scrollbar-color:hsl(152_18%_36%_/_0.45)_hsl(120_10%_96%)]',
                      '[&::-webkit-scrollbar]:w-2',
                      '[&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-black/[0.04]',
                      '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-brand-dark-green/35',
                      '[&::-webkit-scrollbar-thumb]:hover:bg-brand-dark-green/50'
                    )}
                  >
                    <CommandEmpty className="py-6 text-sm text-muted-foreground">
                      No county found.
                    </CommandEmpty>
                    <CommandGroup
                      heading="County"
                      className="px-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-brand-dark-green/70"
                    >
                      <CommandItem
                        value="all-ireland-all-counties"
                        onSelect={() => {
                          setSelectedCounty(null);
                          setFilterOpen(false);
                        }}
                        className="cursor-pointer rounded-md"
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4 shrink-0',
                            selectedCounty === null ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        All Ireland (no county filter)
                      </CommandItem>
                      {IRISH_COUNTIES.map((c) => (
                        <CommandItem
                          key={c}
                          value={c}
                          onSelect={() => {
                            setSelectedCounty(c);
                            setFilterOpen(false);
                          }}
                          className="cursor-pointer rounded-md"
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4 shrink-0',
                              selectedCounty === c ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {c}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                  <p className="shrink-0 border-t border-border/50 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                    Scroll the list to see all counties — or type to search.
                  </p>
                </Command>
              </PopoverContent>
            </Popover>

            {selectedCounty ? (
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#BFCFBB] bg-[#F4F7F3] text-brand-dark-green px-3 py-1.5 text-sm font-medium">
                  <MapPinned className="h-3.5 w-3.5 shrink-0" />
                  {selectedCounty}
                  <button
                    type="button"
                    className="rounded-full p-0.5 hover:bg-black/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft-green"
                    aria-label="Clear county"
                    onClick={() => setSelectedCounty(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
            ) : null}
          </div>

          <div className="relative mt-2 rounded-xl border border-[#E1E8E0] bg-[#FAFBFA] p-5 sm:p-6">
            <div className="flex flex-col gap-1 mb-5 text-center sm:text-left sm:items-start">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <PawPrint className="h-6 w-6 text-brand-dark-green shrink-0" />
                <h3 className="text-xl md:text-2xl font-berkshire text-brand-dark-green">
                  Dog service categories
                </h3>
              </div>
              <p className="text-sm text-gray-600 max-w-xl mx-auto sm:mx-0">
                {selectedCounty
                  ? `Results open in ${selectedCounty}. Change the county filter anytime.`
                  : 'Choose a category for all of Ireland, or pick a county first to narrow results.'}
              </p>
            </div>

            <Carousel
              opts={{
                align: 'start',
                loop: false,
                dragFree: true,
                containScroll: 'trimSnaps',
                inViewThreshold: 0.55,
                duration: 25,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-3 md:-ml-4">
                {HOMEPAGE_SERVICE_CATEGORY_TILES.map((tile) => {
                  const Icon = CATEGORY_ICONS[tile.filterValue] ?? PawPrint;
                  return (
                    <CarouselItem
                      key={tile.filterValue}
                      className="pl-3 md:pl-4 basis-[10.5rem] min-[480px]:basis-[11.25rem] sm:basis-[12rem] md:basis-[13rem] lg:basis-[13.5rem]"
                    >
                      <Link
                        href={servicesBrowseUrl(selectedCounty, tile.filterValue)}
                        className={cn(
                          'group flex h-full min-h-[188px] flex-col rounded-xl border border-[#D8E3D4] bg-white pl-1 shadow-sm',
                          'border-l-[3px] border-l-brand-soft-green',
                          'transition-colors hover:border-[#BFCFBB] hover:bg-[#FAFCFA]',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft-green focus-visible:ring-offset-2'
                        )}
                      >
                        <div className="flex flex-1 flex-col p-4">
                          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#EEF4EC] text-brand-dark-green">
                            <Icon className="h-[1.15rem] w-[1.15rem]" aria-hidden />
                          </div>
                          <p className="font-semibold text-brand-dark-green text-[0.9375rem] leading-snug line-clamp-2">
                            {tile.label}
                          </p>
                          <p className="mt-1 flex-1 text-xs leading-relaxed text-gray-500 line-clamp-2">
                            {tile.description}
                          </p>
                          <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-dark-green">
                            {selectedCounty ? `In ${selectedCounty}` : 'All Ireland'}
                            <ArrowRight
                              className="h-3.5 w-3.5 opacity-70 transition-transform group-hover:translate-x-0.5"
                              aria-hidden
                            />
                          </span>
                        </div>
                      </Link>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
              <div className="flex justify-end gap-2 mt-5">
                <CarouselPrevious className="relative static left-0 translate-y-0 h-9 w-9 border-[#BFCFBB] bg-white" />
                <CarouselNext className="relative static right-0 translate-y-0 h-9 w-9 border-[#BFCFBB] bg-white" />
              </div>
            </Carousel>
          </div>

          <div className="flex justify-center mt-10">
            <Link
              href={
                selectedCounty ? `/services?county=${encodeURIComponent(selectedCounty)}` : '/services'
              }
            >
              <Button
                id="browse-all-services-btn"
                data-restore-target
                className="bg-brand-soft-green text-white hover:bg-brand-dark-green px-6 py-4 h-auto text-base sm:text-lg font-medium rounded-md shadow-sm transition-colors"
              >
                {selectedCounty ? `All services in ${selectedCounty}` : 'Browse all services'}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default ServicesSection;
