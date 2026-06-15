'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
const DogSearchModule: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedBreed, setSelectedBreed] = useState<string>("");
  const [selectedAdType, setSelectedAdType] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [breedOptions, setBreedOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [customBreed, setCustomBreed] = useState<string>("");
  const [breedComboboxOpen, setBreedComboboxOpen] = useState(false);
  const [locationComboboxOpen, setLocationComboboxOpen] = useState(false);
  const counties = ["Antrim", "Armagh", "Carlow", "Cavan", "Clare", "Cork", "Derry", "Donegal", "Down", "Dublin", "Fermanagh", "Galway", "Kerry", "Kildare", "Kilkenny", "Laois", "Leitrim", "Limerick", "Longford", "Louth", "Mayo", "Meath", "Monaghan", "Offaly", "Roscommon", "Sligo", "Tipperary", "Tyrone", "Waterford", "Westmeath", "Wexford", "Wicklow"];
  const adTypes = [{
    value: "sale",
    label: "Sale"
  }, {
    value: "stud",
    label: "Stud"
  }, {
    value: "showcase",
    label: "Showcase"
  }];

  // Initialize form values from URL parameters
  useEffect(() => {
    const breedParam = searchParams.get('breed');
    const locationParam = searchParams.get('location');
    const typeParam = searchParams.get('type');
    if (breedParam) setSelectedBreed(breedParam);
    if (locationParam) setSelectedLocation(locationParam);
    if (typeParam) setSelectedAdType(typeParam);
  }, [searchParams]);
  useEffect(() => {
    const fetchBreeds = async () => {
      try {
        setIsLoading(true);
        const {
          data,
          error
        } = await supabase.from('quiz_breeds').select('breed').order('breed');
        if (error) {
          console.error("Error fetching breeds:", error);
          setBreedOptions([]);
        } else if (data && Array.isArray(data)) {
          const breeds = data.map(item => item?.breed).filter(Boolean).filter((breed, index, self) => self.indexOf(breed) === index); // Remove duplicates
          setBreedOptions(breeds);
        } else {
          setBreedOptions([]);
        }
      } catch (error) {
        console.error("Exception while fetching breeds:", error);
        setBreedOptions([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBreeds();
  }, []);
  const handleSearch = () => {
    setBreedComboboxOpen(false);
    setLocationComboboxOpen(false);

    // Require ad type selection
    if (!selectedAdType) {
      return; // Don't proceed if no ad type is selected
    }

    // Create URL search parameters
    const params = new URLSearchParams();
    
    // Handle breed selection - use custom breed if "Other" is selected
    if (selectedBreed === 'other' && customBreed.trim()) {
      params.append('breed', customBreed.trim());
    } else if (selectedBreed && selectedBreed !== 'all-breeds' && selectedBreed !== 'other') {
      params.append('breed', selectedBreed);
    }
    
    if (selectedLocation && selectedLocation !== 'all-counties') {
      params.append('location', selectedLocation);
    }

    // Navigate to the appropriate page based on ad type
    if (selectedAdType === 'stud') {
      router.push(`/stud?${params.toString()}`);
    } else if (selectedAdType === 'showcase') {
      router.push(`/showcase?${params.toString()}`);
    } else if (selectedAdType === 'sale') {
      // For sale listings, add adType param to the unified listings page
      params.append('adType', 'sale');
      router.push(`/listings?${params.toString()}`);
    }
  };
  
  // Reset custom breed when breed selection changes away from "Other"
  const handleBreedChange = (value: string) => {
    setSelectedBreed(value);
    if (value !== 'other') {
      setCustomBreed('');
    }
    setBreedComboboxOpen(false);
  };

  const breedOptionsForList = breedOptions.filter(
    (breed) => breed.toLowerCase() !== 'other'
  );

  const getBreedTriggerLabel = () => {
    if (isLoading) return 'Loading breeds...';
    if (!selectedBreed) return 'Select breed';
    if (selectedBreed === 'all-breeds') return 'All Breeds';
    if (selectedBreed === 'other') return 'Other';
    return selectedBreed;
  };

  const handleLocationChange = (value: string) => {
    setSelectedLocation(value);
    setLocationComboboxOpen(false);
  };

  const getLocationTriggerLabel = () => {
    if (!selectedLocation) return "Select county";
    if (selectedLocation === "all-counties") return "All Counties";
    return selectedLocation;
  };
  const selectTriggerClasses = "w-full h-10 md:h-12 bg-white border-2 border-gray-300 hover:border-brand-soft-green focus:border-brand-soft-green text-base";
  const selectContentBaseClasses = "w-[var(--radix-select-trigger-width)] bg-white border-2 border-gray-200 shadow-lg";
  const selectListScrollClasses =
    "max-h-[250px] overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:#9ca3af_#f3f4f6] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400";
  return <Card className="w-full md:max-w-[95%] mx-0 md:mx-auto shadow-md rounded-2xl bg-white/80 overflow-visible relative z-50 scale-[0.85] md:scale-100 origin-top">
      <CardContent className="p-3 pb-4 md:p-6 lg:p-8 relative z-50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 lg:gap-6 items-end">

          {/* Breed Select */}
          <div className="space-y-1 md:space-y-2">
            <label htmlFor={selectedBreed === 'other' ? "custom-breed-input" : "breed-select"} className="text-brand-dark-green font-berkshire text-2xl md:text-2xl lg:text-3xl block text-center">
              Breed
            </label>
            {selectedBreed === 'other' ? (
              // Show only text input when "Other" is selected
              <Input
                id="custom-breed-input"
                type="text"
                placeholder="Enter breed name"
                value={customBreed}
                onChange={(e) => setCustomBreed(e.target.value)}
                className="w-full h-10 md:h-12 bg-white border-2 border-gray-300 hover:border-brand-soft-green focus:border-brand-soft-green text-base"
                autoFocus
              />
            ) : (
              <Popover open={breedComboboxOpen} onOpenChange={setBreedComboboxOpen} modal={false}>
                <PopoverTrigger asChild>
                  <Button
                    id="breed-select"
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={breedComboboxOpen}
                    disabled={isLoading}
                    className={cn(
                      selectTriggerClasses,
                      'justify-between font-normal hover:bg-white'
                    )}
                  >
                    <span className="truncate">{getBreedTriggerLabel()}</span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className={cn(selectContentBaseClasses, 'p-0')}
                  align="start"
                  sideOffset={5}
                  style={{ width: 'var(--radix-popover-trigger-width)' }}
                  onOpenAutoFocus={(e) => e.preventDefault()}
                  // Mobile: keyboard open shifts focus to the document briefly; don't treat
                  // that as an outside interaction (real outside taps still close via pointer).
                  onFocusOutside={(e) => e.preventDefault()}
                >
                  <Command shouldFilter>
                    <CommandInput placeholder="Search breeds..." className="h-9" />
                    <CommandList className={selectListScrollClasses}>
                      <CommandEmpty>No breeds found.</CommandEmpty>
                      <CommandItem
                        value="all-breeds"
                        onSelect={() => handleBreedChange('all-breeds')}
                      >
                        All Breeds
                      </CommandItem>
                      {breedOptionsForList.map((breed) => (
                        <CommandItem
                          key={breed}
                          value={breed}
                          onSelect={() => handleBreedChange(breed)}
                        >
                          {breed}
                        </CommandItem>
                      ))}
                      <CommandItem
                        value="other-custom-breed"
                        className="font-semibold border-t border-gray-200"
                        onSelect={() => handleBreedChange('other')}
                      >
                        Other
                      </CommandItem>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Ad Type Select */}
          <div className="space-y-1 md:space-y-2">
            <label htmlFor="ad-type-select" className="text-brand-dark-green font-berkshire text-2xl md:text-2xl lg:text-3xl block text-center">
              Ad Type <span className="text-red-500">*</span>
            </label>
            <Select value={selectedAdType} onValueChange={setSelectedAdType} required>
               <SelectTrigger id="ad-type-select" className={selectTriggerClasses}>
                 <SelectValue placeholder="Select ad type (required)" />
               </SelectTrigger>
               <SelectContent className={selectContentBaseClasses} position="popper" sideOffset={5}>
                 {adTypes.map(type => <SelectItem key={type.value} value={type.value}>
                     {type.label}
                   </SelectItem>)}
               </SelectContent>
            </Select>
          </div>

          {/* County picker — Popover (not Select) so mobile keyboard + Search tap work on Android */}
          <div className="space-y-1 md:space-y-2">
            <label htmlFor="location-select" className="text-brand-dark-green font-berkshire text-2xl md:text-2xl lg:text-3xl block text-center">
              Location
            </label>
            <Popover
              open={locationComboboxOpen}
              onOpenChange={setLocationComboboxOpen}
              modal={false}
            >
              <PopoverTrigger asChild>
                <Button
                  id="location-select"
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={locationComboboxOpen}
                  className={cn(
                    selectTriggerClasses,
                    "justify-between font-normal hover:bg-white",
                  )}
                >
                  <span className="truncate">{getLocationTriggerLabel()}</span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className={cn(selectContentBaseClasses, "p-0")}
                align="start"
                sideOffset={5}
                style={{ width: "var(--radix-popover-trigger-width)" }}
                onOpenAutoFocus={(e) => e.preventDefault()}
                // Mobile: keyboard open shifts focus to the document briefly; don't treat
                // that as an outside interaction (real outside taps still close via pointer).
                onFocusOutside={(e) => e.preventDefault()}
              >
                <Command shouldFilter>
                  <CommandInput placeholder="Search counties..." className="h-9" />
                  <CommandList className={selectListScrollClasses}>
                    <CommandEmpty>No counties found.</CommandEmpty>
                    <CommandItem
                      value="all-counties"
                      className="font-semibold"
                      onSelect={() => handleLocationChange("all-counties")}
                    >
                      All Counties
                    </CommandItem>
                    {counties.map((county) => (
                      <CommandItem
                        key={county}
                        value={county}
                        onSelect={() => handleLocationChange(county)}
                      >
                        {county}
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Search Button */}
          <div className="space-y-1 md:space-y-2">
            <label className="text-transparent font-berkshire text-2xl md:text-2xl lg:text-3xl block text-center select-none">
              Search
            </label>
            <Button
              type="button"
              className="w-full h-10 md:h-12 bg-brand-soft-green hover:bg-brand-dark-green text-white font-semibold rounded-xl transition-colors duration-200 shadow-lg hover:shadow-xl text-base disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !selectedAdType}
              onPointerDown={(e) => {
                // Android/iOS: keep the tap on Search when a dropdown input had focus
                e.preventDefault();
              }}
              onClick={handleSearch}
            >
              {isLoading ? 'Loading...' : 'Search Dogs'}
            </Button>
          </div>
        </div>
        <p className="hidden md:block text-center text-xs md:text-sm text-gray-600 mt-4 px-1 leading-snug">
          Filter <strong>sale</strong>, <strong>stud</strong>, or <strong>showcase</strong> ads by breed and county. For keyword search across listings, dog services, shop, breeds, and blog, use{' '}
          <Link href="/search" className="text-brand-dark-green font-semibold underline underline-offset-2 hover:text-brand-soft-green">
            site search
          </Link>
          {' '}in the header.
        </p>
      </CardContent>
    </Card>;
};
export default DogSearchModule;
