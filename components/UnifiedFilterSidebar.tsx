import React, { useState, useCallback } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DOG_BREEDS } from '@/data/dog-breeds';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface UnifiedFilters {
  breed: string;
  breedSearch: string;
  county: string;
  hasGreenTick: boolean;
  hasGoldStar: boolean;
  sex: string;
  size: string;
  energy: string;
  adType: string; // 'all', 'sale', 'stud', 'showcase'
}

interface UnifiedFilterSidebarProps {
  filters: UnifiedFilters;
  setFilters: React.Dispatch<React.SetStateAction<UnifiedFilters>>;
  resetFilters: () => void;
  className?: string;
  /** Inside mobile drawer: title/actions live in drawer chrome */
  embeddedInDrawer?: boolean;
}

export const UnifiedFilterSidebar: React.FC<UnifiedFilterSidebarProps> = ({
  filters,
  setFilters,
  resetFilters,
  className,
  embeddedInDrawer = false,
}) => {
  const [breedSearchTerm, setBreedSearchTerm] = useState(
    () => filters.breedSearch || filters.breed || ''
  );

  React.useEffect(() => {
    const next = filters.breedSearch || filters.breed || '';
    setBreedSearchTerm((prev) => (prev === next ? prev : next));
  }, [filters.breed, filters.breedSearch]);

  // Filter breeds based on search term for the dropdown
  const filteredBreeds = DOG_BREEDS.filter(breed =>
    breed.toLowerCase().includes(breedSearchTerm.toLowerCase())
  );

  // Handle breed search - this will filter the listings by breed name
  const handleBreedSearch = useCallback((searchTerm: string) => {
    setBreedSearchTerm(searchTerm);
    // Set the breed filter to match the search term
    if (searchTerm.trim()) {
      // Find exact or partial matches in the breed list
      const matchingBreed = DOG_BREEDS.find(breed => 
        breed.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (matchingBreed) {
        setFilters(prev => ({...prev, breed: matchingBreed, breedSearch: searchTerm}));
      } else {
        // If no exact match, use the search term for partial matching
        setFilters(prev => ({...prev, breed: "", breedSearch: searchTerm}));
      }
    } else {
      // Clear the breed filter if search is empty
      setFilters(prev => ({...prev, breed: "", breedSearch: ""}));
    }
  }, [setFilters]);

  return (
    <div className={cn("bg-white rounded-lg p-4 space-y-6", className)}>
      <div>
        {!embeddedInDrawer && (
          <h2 className="text-xl font-berkshire text-brand-dark-green mb-4">Filters</h2>
        )}
        
        {/* Ad Type Filter */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-base font-medium">Listing Type</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-gray-400 cursor-help text-xs">(?)</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-[180px] text-sm">Filter by type of listing</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select
            value={filters.adType}
            onValueChange={(value) => setFilters(prev => ({...prev, adType: value}))}
          >
            <SelectTrigger className="bg-white border-gray-300">
              <SelectValue placeholder="Select listing type" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg z-[9999]">
              <SelectItem value="all" className="bg-white hover:bg-gray-100">All Types</SelectItem>
              <SelectItem value="sale" className="bg-white hover:bg-gray-100">For Sale</SelectItem>
              <SelectItem value="stud" className="bg-white hover:bg-gray-100">Stud</SelectItem>
              <SelectItem value="showcase" className="bg-white hover:bg-gray-100">Showcase</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Breed Filter */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-base font-medium">Breed</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-gray-400 cursor-help text-xs">(?)</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-[180px] text-sm">Search or select your preferred dog breed</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              type="text"
              placeholder="Search breeds..."
              className="pl-8"
              value={breedSearchTerm}
              onChange={(e) => handleBreedSearch(e.target.value)}
            />
          </div>
          <div className="mt-2">
            <Select
              value={filters.breed || "all-breeds"}
              onValueChange={(value) => {
                if (value === "all-breeds") {
                  setFilters(prev => ({...prev, breed: "", breedSearch: ""}));
                  setBreedSearchTerm("");
                } else {
                  setFilters(prev => ({...prev, breed: value, breedSearch: ""}));
                  setBreedSearchTerm("");
                }
              }}
            >
              <SelectTrigger className="bg-white border-gray-300">
                <SelectValue placeholder="Select breed" />
              </SelectTrigger>
              <SelectContent position="item-aligned" className="bg-white border border-gray-200 shadow-lg z-[9999]">
                <SelectItem value="all-breeds" className="bg-white hover:bg-gray-100">All Breeds</SelectItem>
                {filteredBreeds.map((breed) => (
                  <SelectItem key={breed} value={breed} className="bg-white hover:bg-gray-100">
                    {breed}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* County Filter */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-base font-medium">County</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-gray-400 cursor-help text-xs">(?)</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-[180px] text-sm">Filter by county location</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select
            value={filters.county}
            onValueChange={(value) => setFilters(prev => ({...prev, county: value}))}
          >
            <SelectTrigger className="bg-white border-gray-300">
              <SelectValue placeholder="Select county" />
            </SelectTrigger>
            <SelectContent position="item-aligned" className="bg-white border border-gray-200 shadow-lg z-[9999]">
              <SelectItem value="all" className="bg-white hover:bg-gray-100">All Counties</SelectItem>
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

        {/* Sex Filter */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-base font-medium">Sex</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-gray-400 cursor-help text-xs">(?)</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-[180px] text-sm">Filter by male or female (applies to stud and showcase listings)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <RadioGroup 
            value={filters.sex || ""}
            onValueChange={(value) => setFilters(prev => ({...prev, sex: value}))}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="" id="any-sex" />
              <Label htmlFor="any-sex">Any</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Male" id="male" />
              <Label htmlFor="male">Male</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Female" id="female" />
              <Label htmlFor="female">Female</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Size Filter */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-base font-medium">Size</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-gray-400 cursor-help text-xs">(?)</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-[180px] text-sm">Filter by dog size</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select
            value={filters.size || "all"}
            onValueChange={(value) => setFilters(prev => ({...prev, size: value === "all" ? "" : value}))}
          >
            <SelectTrigger className="bg-white border-gray-300">
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent position="item-aligned" className="bg-white border border-gray-200 shadow-lg z-[9999]">
              <SelectItem value="all" className="bg-white hover:bg-gray-100">All Sizes</SelectItem>
              <SelectItem value="Small" className="bg-white hover:bg-gray-100">Small</SelectItem>
              <SelectItem value="Medium" className="bg-white hover:bg-gray-100">Medium</SelectItem>
              <SelectItem value="Large" className="bg-white hover:bg-gray-100">Large</SelectItem>
              <SelectItem value="ExtraLarge" className="bg-white hover:bg-gray-100">Extra Large</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Energy Filter */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-base font-medium">Energy</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-gray-400 cursor-help text-xs">(?)</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-[180px] text-sm">Filter by energy level</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select
            value={filters.energy || "all"}
            onValueChange={(value) => setFilters(prev => ({...prev, energy: value === "all" ? "" : value}))}
          >
            <SelectTrigger className="bg-white border-gray-300">
              <SelectValue placeholder="Select energy level" />
            </SelectTrigger>
            <SelectContent position="item-aligned" className="bg-white border border-gray-200 shadow-lg z-[9999]">
              <SelectItem value="all" className="bg-white hover:bg-gray-100">All Energy Levels</SelectItem>
              <SelectItem value="Low" className="bg-white hover:bg-gray-100">Low</SelectItem>
              <SelectItem value="Moderate" className="bg-white hover:bg-gray-100">Moderate</SelectItem>
              <SelectItem value="High" className="bg-white hover:bg-gray-100">High</SelectItem>
              <SelectItem value="VeryHigh" className="bg-white hover:bg-gray-100">Very High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Certification Filters */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-base font-medium">Certification</Label>
          </div>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="greenTick" 
                checked={filters.hasGreenTick}
                onCheckedChange={(checked) => 
                  setFilters(prev => ({...prev, hasGreenTick: !!checked}))
                }
              />
              <div className="flex items-center gap-2">
                <img 
                  src="/badges/greentick.jpeg"
                  alt="Green Tick"
                  className="h-5 w-5"
                />
                <Label htmlFor="greenTick" className="text-sm">Vaccinated</Label>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-gray-400 cursor-help text-xs ml-auto">(?)</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-[180px] text-sm">Dog has received all required vaccinations</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="goldStar" 
                checked={filters.hasGoldStar}
                onCheckedChange={(checked) => 
                  setFilters(prev => ({...prev, hasGoldStar: !!checked}))
                }
              />
              <div className="flex items-center gap-2">
                <img 
                  src="/badges/goldernstart.jpeg"
                  alt="Gold Star"
                  className="h-6 w-6"
                />
                <Label htmlFor="goldStar" className="text-sm">Health Checked</Label>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-gray-400 cursor-help text-xs ml-auto">(?)</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-[180px] text-sm">Dog has passed a full health check by a veterinarian</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>
      
      {!embeddedInDrawer && (
        <Button
          onClick={resetFilters}
          className="w-full bg-brand-dark-green hover:bg-brand-soft-green"
        >
          Reset filters
        </Button>
      )}

    </div>
  );
};
