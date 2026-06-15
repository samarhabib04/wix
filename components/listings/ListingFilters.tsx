
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface ListingFiltersProps {
  filters: {
    priceRange: number[];
    location: string;
    county: string;
    sort: string;
    status: string[];
    breed?: string; // Added breed filter
  };
  onFilterChange: (key: string, value: any) => void;
  onSortChange: (value: string) => void;
  onReset: () => void;
}

const ListingFilters: React.FC<ListingFiltersProps> = ({
  filters,
  onFilterChange,
  onSortChange,
  onReset
}) => {
  const [breeds, setBreeds] = useState<Array<{breed: string, type: string}>>([]);
  const [isLoadingBreeds, setIsLoadingBreeds] = useState(true);
  const [breedComboboxOpen, setBreedComboboxOpen] = useState(false);
  const router = useRouter();

  const handleBreedChange = (breedName: string) => {
    if (breedName === "all-breeds" || breedName === "all") {
      onFilterChange('breed', 'all');
      return;
    }
    
    // Find the selected breed to get its type and create slug
    const selectedBreed = breeds.find(breed => breed.breed === breedName);
    if (selectedBreed) {
      const slug = breedName.toLowerCase().replace(/\s+/g, '-');
      const isPedigreeBreed = selectedBreed.type === 'Pedigree';
      const path = isPedigreeBreed ? `/breeds/${slug}` : `/mixed-breeds/${slug}`;
      router.push(path);
    }
  };

  // Fetch breeds from Supabase quiz_breeds table
  useEffect(() => {
    const fetchBreeds = async () => {
      try {
        setIsLoadingBreeds(true);
        const { data, error } = await supabase
          .from('quiz_breeds')
          .select('breed, breed_type')
          .order('breed_type, breed');

        if (error) {
          console.error('Error fetching breeds:', error);
          setBreeds([]);
        } else if (data) {
          // Group breeds by type for structured display
          const groupedBreeds = data.reduce((acc: any[], item) => {
            if (item.breed) {
              acc.push({
                breed: item.breed,
                type: item.breed_type || 'Pedigree'
              });
            }
            return acc;
          }, []);
          setBreeds(groupedBreeds);
        }
      } catch (error) {
        console.error('Error fetching breeds:', error);
        setBreeds([]);
      } finally {
        setIsLoadingBreeds(false);
      }
    };

    fetchBreeds();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-100">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        {/* Price Filter */}
        <div className="flex-1">
          <Label className="text-sm font-medium mb-2 block">Price Range</Label>
          <div className="px-2">
            <Slider
              defaultValue={filters.priceRange}
              min={0}
              max={5000}
              step={100}
              onValueChange={(value) => onFilterChange('priceRange', value)}
              className="my-4"
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>€{filters.priceRange[0]}</span>
            <span>€{filters.priceRange[1]}</span>
          </div>
        </div>

        {/* Breed Filter - Searchable Combobox */}
        <div className="w-full sm:w-48">
          <Label className="text-sm font-medium mb-2 block">Breed</Label>
          <Popover open={breedComboboxOpen} onOpenChange={setBreedComboboxOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={breedComboboxOpen}
                className="w-full bg-white border-gray-300 justify-between"
              >
                {filters.breed && filters.breed !== 'all'
                  ? breeds.find(breed => breed.breed === filters.breed)?.breed || "Select breed..."
                  : "All breeds"}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 bg-white border border-gray-200 shadow-lg z-[9999]" align="start">
              <Command className="w-full">
                <CommandInput placeholder="Search breeds..." className="h-9" />
                <CommandList className="max-h-60">
                  <CommandEmpty>No breed found.</CommandEmpty>
                  <CommandItem
                    value="all"
                    onSelect={() => {
                      onFilterChange('breed', 'all');
                      setBreedComboboxOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        !filters.breed || filters.breed === 'all' ? "opacity-100" : "opacity-0"
                      )}
                    />
                    All breeds
                  </CommandItem>
                  {(() => {
                    const pedigreeBreeds = breeds.filter(item => item.type === 'Pedigree');
                    const mixedBreeds = breeds.filter(item => item.type === 'Mixed Breed' || item.type === 'Mixed');
                    
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
                                    filters.breed === item.breed ? "opacity-100" : "opacity-0"
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
                                    filters.breed === item.breed ? "opacity-100" : "opacity-0"
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
        
        {/* Location Filter */}
        <div className="w-full sm:w-48">
          <Label className="text-sm font-medium mb-2 block">Location</Label>
          <Select 
            value={filters.location} 
            onValueChange={(value) => onFilterChange('location', value)}
          >
            <SelectTrigger className="w-full bg-white border-gray-300">
              <SelectValue placeholder="All locations" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg z-[9999]">
              <SelectItem value="all" className="bg-white hover:bg-gray-100">All locations</SelectItem>
              <SelectItem value="dublin" className="bg-white hover:bg-gray-100">Dublin</SelectItem>
              <SelectItem value="cork" className="bg-white hover:bg-gray-100">Cork</SelectItem>
              <SelectItem value="galway" className="bg-white hover:bg-gray-100">Galway</SelectItem>
              <SelectItem value="limerick" className="bg-white hover:bg-gray-100">Limerick</SelectItem>
              <SelectItem value="waterford" className="bg-white hover:bg-gray-100">Waterford</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* County Filter */}
        <div className="w-full sm:w-48">
          <Label className="text-sm font-medium mb-2 block">County</Label>
          <Select 
            value={filters.county} 
            onValueChange={(value) => onFilterChange('county', value)}
          >
            <SelectTrigger className="w-full bg-white border-gray-300">
              <SelectValue placeholder="All counties" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg z-[9999] max-h-60 overflow-y-auto">
              <SelectItem value="all" className="bg-white hover:bg-gray-100">All counties</SelectItem>
              <SelectItem value="antrim" className="bg-white hover:bg-gray-100">Antrim</SelectItem>
              <SelectItem value="armagh" className="bg-white hover:bg-gray-100">Armagh</SelectItem>
              <SelectItem value="carlow" className="bg-white hover:bg-gray-100">Carlow</SelectItem>
              <SelectItem value="cavan" className="bg-white hover:bg-gray-100">Cavan</SelectItem>
              <SelectItem value="clare" className="bg-white hover:bg-gray-100">Clare</SelectItem>
              <SelectItem value="cork" className="bg-white hover:bg-gray-100">Cork</SelectItem>
              <SelectItem value="derry" className="bg-white hover:bg-gray-100">Derry</SelectItem>
              <SelectItem value="donegal" className="bg-white hover:bg-gray-100">Donegal</SelectItem>
              <SelectItem value="down" className="bg-white hover:bg-gray-100">Down</SelectItem>
              <SelectItem value="dublin" className="bg-white hover:bg-gray-100">Dublin</SelectItem>
              <SelectItem value="fermanagh" className="bg-white hover:bg-gray-100">Fermanagh</SelectItem>
              <SelectItem value="galway" className="bg-white hover:bg-gray-100">Galway</SelectItem>
              <SelectItem value="kerry" className="bg-white hover:bg-gray-100">Kerry</SelectItem>
              <SelectItem value="kildare" className="bg-white hover:bg-gray-100">Kildare</SelectItem>
              <SelectItem value="kilkenny" className="bg-white hover:bg-gray-100">Kilkenny</SelectItem>
              <SelectItem value="laois" className="bg-white hover:bg-gray-100">Laois</SelectItem>
              <SelectItem value="leitrim" className="bg-white hover:bg-gray-100">Leitrim</SelectItem>
              <SelectItem value="limerick" className="bg-white hover:bg-gray-100">Limerick</SelectItem>
              <SelectItem value="longford" className="bg-white hover:bg-gray-100">Longford</SelectItem>
              <SelectItem value="louth" className="bg-white hover:bg-gray-100">Louth</SelectItem>
              <SelectItem value="mayo" className="bg-white hover:bg-gray-100">Mayo</SelectItem>
              <SelectItem value="meath" className="bg-white hover:bg-gray-100">Meath</SelectItem>
              <SelectItem value="monaghan" className="bg-white hover:bg-gray-100">Monaghan</SelectItem>
              <SelectItem value="offaly" className="bg-white hover:bg-gray-100">Offaly</SelectItem>
              <SelectItem value="roscommon" className="bg-white hover:bg-gray-100">Roscommon</SelectItem>
              <SelectItem value="sligo" className="bg-white hover:bg-gray-100">Sligo</SelectItem>
              <SelectItem value="tipperary" className="bg-white hover:bg-gray-100">Tipperary</SelectItem>
              <SelectItem value="tyrone" className="bg-white hover:bg-gray-100">Tyrone</SelectItem>
              <SelectItem value="waterford" className="bg-white hover:bg-gray-100">Waterford</SelectItem>
              <SelectItem value="westmeath" className="bg-white hover:bg-gray-100">Westmeath</SelectItem>
              <SelectItem value="wexford" className="bg-white hover:bg-gray-100">Wexford</SelectItem>
              <SelectItem value="wicklow" className="bg-white hover:bg-gray-100">Wicklow</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Sort Filter */}
        <div className="w-full sm:w-48">
          <Label className="text-sm font-medium mb-2 block">Sort By</Label>
          <Select 
            value={filters.sort} 
            onValueChange={onSortChange}
          >
            <SelectTrigger className="w-full bg-white border-gray-300">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg z-[9999]">
              <SelectItem value="newest" className="bg-white hover:bg-gray-100">Newest First</SelectItem>
              <SelectItem value="price_asc" className="bg-white hover:bg-gray-100">Price: Low to High</SelectItem>
              <SelectItem value="price_desc" className="bg-white hover:bg-gray-100">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Reset Button */}
        <div className="flex items-end">
          <Button 
            variant="outline" 
            onClick={onReset}
            className="w-full sm:w-auto"
          >
            Reset Filters
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ListingFilters;
