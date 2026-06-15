'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, SlidersHorizontal, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { supabase } from '@/lib/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface BreedFiltersProps {
  filters: {
    size: string[];
    grooming: string[];
    energy: string[];
    search: string;
    county: string[];
    breed?: string;
  };
  onFilterChange: (filterType: string, value: string[]) => void;
  onSearchChange: (search: string) => void;
  onReset: () => void;
  breedType?: 'Pedigree' | 'Mixed' | 'all';
}

const BreedFilters: React.FC<BreedFiltersProps> = ({
  filters,
  onFilterChange,
  onSearchChange,
  onReset,
  breedType = 'all'
}) => {
  const [breeds, setBreeds] = useState<Array<{breed: string, type: string}>>([]);
  const [isLoadingBreeds, setIsLoadingBreeds] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [breedComboboxOpen, setBreedComboboxOpen] = useState(false);
  const isMobile = useIsMobile();
  const router = useRouter();

  // Fetch breeds from Supabase quiz_breeds table
  useEffect(() => {
    const fetchBreeds = async () => {
      try {
        setIsLoadingBreeds(true);
        let query = supabase
          .from('quiz_breeds')
          .select('breed, breed_type');

        const { data, error } = await query.order('breed_type, breed');

        if (error) {
          console.error('Error fetching breeds:', error);
          setBreeds([]);
        } else if (data) {
          // Normalize and filter breeds by type
          const normalizedBreeds = data.reduce((acc: any[], item) => {
            if (item.breed) {
              // Normalize breed_type to consistent values
              const normalizedType = item.breed_type?.includes('Mixed') || item.breed_type?.includes('mixed') 
                ? 'Mixed' 
                : 'Pedigree';
              
              // Apply breedType filter if specified
              if (breedType === 'all' || 
                  (breedType === 'Mixed' && normalizedType === 'Mixed') ||
                  (breedType === 'Pedigree' && normalizedType === 'Pedigree')) {
                acc.push({
                  breed: item.breed,
                  type: normalizedType
                });
              }
            }
            return acc;
          }, []);
          setBreeds(normalizedBreeds);
        }
      } catch (error) {
        console.error('Error fetching breeds:', error);
        setBreeds([]);
      } finally {
        setIsLoadingBreeds(false);
      }
    };

    fetchBreeds();
  }, [breedType]);

  const handleBreedChange = (breedName: string) => {
    if (breedName === "all-breeds") {
      onFilterChange('breed', []);
      return;
    }
    
    // Find the selected breed to get its type and create consistent slug
    const selectedBreed = breeds.find(breed => breed.breed === breedName);
    if (selectedBreed) {
      // Generate consistent slug: lowercase, spaces to hyphens, remove special chars
      const slug = breedName
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      
      const isPedigreeBreed = selectedBreed.type === 'Pedigree';
      const path = isPedigreeBreed ? `/breeds/${slug}` : `/mixed-breeds/${slug}`;
      router.push(path);
    }
  };

  // Count active filters
  const activeFilterCount = (
    (filters.size.length > 0 ? 1 : 0) +
    (filters.grooming.length > 0 ? 1 : 0) +
    (filters.energy.length > 0 ? 1 : 0) +
    (filters.county.length > 0 ? 1 : 0) +
    (filters.breed && filters.breed.length > 0 ? 1 : 0)
  );

  if (isMobile) {
    return (
      <div className="bg-white rounded-lg shadow-sm mb-6">
        {/* Always visible search bar */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search breeds..."
              value={filters.search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 h-12 border-2 border-gray-200 focus:border-brand-soft-green"
            />
          </div>
        </div>

        {/* Collapsible filters */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full flex items-center justify-between p-4 h-auto text-left"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="bg-brand-soft-green text-white text-xs px-2 py-1 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="p-4 pt-0 space-y-4">
              {/* Breed Filter - Searchable Combobox */}
              <div>
                <Popover open={breedComboboxOpen} onOpenChange={setBreedComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={breedComboboxOpen}
                      className="w-full h-12 border-2 border-gray-200 focus:border-brand-soft-green bg-white justify-between rounded-md"
                    >
                      {filters.breed && filters.breed.length > 0
                        ? breeds.find(breed => breed.breed === filters.breed?.[0])?.breed || "Select breed..."
                        : "All Breeds"}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 bg-white border border-gray-200 shadow-lg z-[9999]" align="start">
                    <Command className="w-full">
                      <CommandInput placeholder="Search breeds..." className="h-9" />
                      <CommandList className="max-h-60">
                        <CommandEmpty>No breed found.</CommandEmpty>
                        <CommandItem
                          value="all-breeds"
                          onSelect={() => {
                            onFilterChange('breed', []);
                            setBreedComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              !filters.breed || filters.breed.length === 0 ? "opacity-100" : "opacity-0"
                            )}
                          />
                          All Breeds
                        </CommandItem>
                        {(() => {
                          const pedigreeBreeds = breeds.filter(item => item.type === 'Pedigree');
                          const mixedBreeds = breeds.filter(item => item.type === 'Mixed');
                          
                          return (
                            <>
                              {pedigreeBreeds.length > 0 && (
                                <CommandGroup 
                                  heading="Pedigree Breeds"
                                  className="[&_[cmdk-group-heading]]:bg-muted/70 [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-foreground [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2"
                                >
                                  {pedigreeBreeds.map((item) => (
                                     <CommandItem
                                       key={`pedigree-${item.breed}`}
                                       value={item.breed}
                                       onSelect={() => {
                                         handleBreedChange(item.breed);
                                         setBreedComboboxOpen(false);
                                       }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          filters.breed?.[0] === item.breed ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {item.breed}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                              {mixedBreeds.length > 0 && (
                                <CommandGroup 
                                  heading="Mixed Breeds"
                                  className="[&_[cmdk-group-heading]]:bg-muted/70 [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-foreground [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2"
                                >
                                  {mixedBreeds.map((item) => (
                                     <CommandItem
                                       key={`mixed-${item.breed}`}
                                       value={item.breed}
                                       onSelect={() => {
                                         handleBreedChange(item.breed);
                                         setBreedComboboxOpen(false);
                                       }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          filters.breed?.[0] === item.breed ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {item.breed}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                            </>
                          );
                        })()}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Size Filter */}
              <div>
                <Select
                  value={filters.size.length > 0 ? filters.size[0] : "all-sizes"}
                  onValueChange={(value) => {
                    if (value === "all-sizes") {
                      onFilterChange('size', []);
                    } else {
                      onFilterChange('size', [value]);
                    }
                  }}
                >
                  <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-brand-soft-green bg-white">
                    <SelectValue placeholder="Size" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg z-[9999]">
                    <SelectItem value="all-sizes" className="bg-white hover:bg-gray-100">All Sizes</SelectItem>
                    <SelectItem value="Small" className="bg-white hover:bg-gray-100">Small</SelectItem>
                    <SelectItem value="Medium" className="bg-white hover:bg-gray-100">Medium</SelectItem>
                    <SelectItem value="Large" className="bg-white hover:bg-gray-100">Large</SelectItem>
                    <SelectItem value="ExtraLarge" className="bg-white hover:bg-gray-100">Extra Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Grooming Filter */}
              <div>
                <Select
                  value={filters.grooming.length > 0 ? filters.grooming[0] : "all-grooming"}
                  onValueChange={(value) => {
                    if (value === "all-grooming") {
                      onFilterChange('grooming', []);
                    } else {
                      onFilterChange('grooming', [value]);
                    }
                  }}
                >
                  <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-brand-soft-green bg-white">
                    <SelectValue placeholder="Grooming" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg z-[9999]">
                    <SelectItem value="all-grooming" className="bg-white hover:bg-gray-100">All Grooming</SelectItem>
                    <SelectItem value="Low" className="bg-white hover:bg-gray-100">Low</SelectItem>
                    <SelectItem value="Moderate" className="bg-white hover:bg-gray-100">Moderate</SelectItem>
                    <SelectItem value="High" className="bg-white hover:bg-gray-100">High</SelectItem>
                    <SelectItem value="VeryHigh" className="bg-white hover:bg-gray-100">Very High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Energy Filter */}
              <div>
                <Select
                  value={filters.energy.length > 0 ? filters.energy[0] : "all-energy"}
                  onValueChange={(value) => {
                    if (value === "all-energy") {
                      onFilterChange('energy', []);
                    } else {
                      onFilterChange('energy', [value]);
                    }
                  }}
                >
                  <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-brand-soft-green bg-white">
                    <SelectValue placeholder="Energy" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg z-[9999]">
                    <SelectItem value="all-energy" className="bg-white hover:bg-gray-100">All Energy</SelectItem>
                    <SelectItem value="Low" className="bg-white hover:bg-gray-100">Low</SelectItem>
                    <SelectItem value="Moderate" className="bg-white hover:bg-gray-100">Moderate</SelectItem>
                    <SelectItem value="High" className="bg-white hover:bg-gray-100">High</SelectItem>
                    <SelectItem value="VeryHigh" className="bg-white hover:bg-gray-100">Very High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reset Button */}
              <Button 
                onClick={onReset}
                variant="outline"
                className="w-full h-12 border-2 border-gray-200 hover:border-brand-soft-green hover:bg-brand-soft-green hover:text-white transition-colors rounded-md"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }

  // Desktop layout (unchanged)
  return (
    <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search breeds..."
            value={filters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-12 border-2 border-gray-200 focus:border-brand-soft-green"
          />
        </div>

        {/* Breed Filter - Searchable Combobox */}
        <div className="min-w-[200px]">
          <Popover open={breedComboboxOpen} onOpenChange={setBreedComboboxOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={breedComboboxOpen}
                className="w-full h-12 border-2 border-gray-200 focus:border-brand-soft-green bg-white justify-between rounded-md"
              >
                {filters.breed && filters.breed.length > 0
                  ? breeds.find(breed => breed.breed === filters.breed?.[0])?.breed || "Select breed..."
                  : "All Breeds"}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 bg-white border border-gray-200 shadow-lg z-[9999]" align="start">
              <Command className="w-full">
                <CommandInput placeholder="Search breeds..." className="h-9" />
                <CommandList className="max-h-60">
                  <CommandEmpty>No breed found.</CommandEmpty>
                  <CommandItem
                    value="all-breeds"
                    onSelect={() => {
                      onFilterChange('breed', []);
                      setBreedComboboxOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        !filters.breed || filters.breed.length === 0 ? "opacity-100" : "opacity-0"
                      )}
                    />
                    All Breeds
                  </CommandItem>
                  {(() => {
                    const pedigreeBreeds = breeds.filter(item => item.type === 'Pedigree');
                    const mixedBreeds = breeds.filter(item => item.type === 'Mixed');
                    
                    return (
                      <>
                        {pedigreeBreeds.length > 0 && (
                          <CommandGroup 
                            heading="Pedigree Breeds"
                            className="[&_[cmdk-group-heading]]:bg-muted/70 [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-foreground [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2"
                          >
                            {pedigreeBreeds.map((item) => (
                               <CommandItem
                                 key={`pedigree-${item.breed}`}
                                 value={item.breed}
                                 onSelect={() => {
                                   handleBreedChange(item.breed);
                                   setBreedComboboxOpen(false);
                                 }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    filters.breed?.[0] === item.breed ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {item.breed}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                        {mixedBreeds.length > 0 && (
                          <CommandGroup 
                            heading="Mixed Breeds"
                            className="[&_[cmdk-group-heading]]:bg-muted/70 [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-foreground [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2"
                          >
                            {mixedBreeds.map((item) => (
                               <CommandItem
                                 key={`mixed-${item.breed}`}
                                 value={item.breed}
                                 onSelect={() => {
                                   handleBreedChange(item.breed);
                                   setBreedComboboxOpen(false);
                                 }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    filters.breed?.[0] === item.breed ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {item.breed}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </>
                    );
                  })()}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Size Filter */}
        <div className="min-w-[140px]">
          <Select
            value={filters.size.length > 0 ? filters.size[0] : "all-sizes"}
            onValueChange={(value) => {
              if (value === "all-sizes") {
                onFilterChange('size', []);
              } else {
                onFilterChange('size', [value]);
              }
            }}
          >
            <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-brand-soft-green bg-white">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg z-[9999]">
              <SelectItem value="all-sizes" className="bg-white hover:bg-gray-100">All Sizes</SelectItem>
              <SelectItem value="Small" className="bg-white hover:bg-gray-100">Small</SelectItem>
              <SelectItem value="Medium" className="bg-white hover:bg-gray-100">Medium</SelectItem>
              <SelectItem value="Large" className="bg-white hover:bg-gray-100">Large</SelectItem>
              <SelectItem value="ExtraLarge" className="bg-white hover:bg-gray-100">Extra Large</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grooming Filter */}
        <div className="min-w-[140px]">
          <Select
            value={filters.grooming.length > 0 ? filters.grooming[0] : "all-grooming"}
            onValueChange={(value) => {
              if (value === "all-grooming") {
                onFilterChange('grooming', []);
              } else {
                onFilterChange('grooming', [value]);
              }
            }}
          >
            <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-brand-soft-green bg-white">
              <SelectValue placeholder="Grooming" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg z-[9999]">
              <SelectItem value="all-grooming" className="bg-white hover:bg-gray-100">All Grooming</SelectItem>
              <SelectItem value="Low" className="bg-white hover:bg-gray-100">Low</SelectItem>
              <SelectItem value="Moderate" className="bg-white hover:bg-gray-100">Moderate</SelectItem>
              <SelectItem value="High" className="bg-white hover:bg-gray-100">High</SelectItem>
              <SelectItem value="VeryHigh" className="bg-white hover:bg-gray-100">Very High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Energy Filter */}
        <div className="min-w-[140px]">
          <Select
            value={filters.energy.length > 0 ? filters.energy[0] : "all-energy"}
            onValueChange={(value) => {
              if (value === "all-energy") {
                onFilterChange('energy', []);
              } else {
                onFilterChange('energy', [value]);
              }
            }}
          >
            <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-brand-soft-green bg-white">
              <SelectValue placeholder="Energy" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg z-[9999]">
              <SelectItem value="all-energy" className="bg-white hover:bg-gray-100">All Energy</SelectItem>
              <SelectItem value="Low" className="bg-white hover:bg-gray-100">Low</SelectItem>
              <SelectItem value="Moderate" className="bg-white hover:bg-gray-100">Moderate</SelectItem>
              <SelectItem value="High" className="bg-white hover:bg-gray-100">High</SelectItem>
              <SelectItem value="VeryHigh" className="bg-white hover:bg-gray-100">Very High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reset Button */}
        <Button 
          onClick={onReset}
          variant="outline"
          className="h-12 border-2 border-gray-200 hover:border-brand-soft-green hover:bg-brand-soft-green hover:text-white transition-colors rounded-md"
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>
    </div>
  );
};

export default BreedFilters;
