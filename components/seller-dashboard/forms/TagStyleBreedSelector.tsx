
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface TagStyleBreedSelectorProps {
  breedOptions: Array<{ value: string; label: string }>;
  selectedBreeds: string[];
  onBreedsChange: (breeds: string[]) => void;
  label?: string;
  placeholder?: string;
  allowCustom?: boolean;
}

export const TagStyleBreedSelector = ({
  breedOptions,
  selectedBreeds,
  onBreedsChange,
  label = "Breeds",
  placeholder = "Search and select breeds...",
  allowCustom = false
}: TagStyleBreedSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredBreeds = breedOptions.filter(breed =>
    breed.label.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedBreeds.includes(breed.value)
  );

  const handleBreedSelect = (breedValue: string) => {
    if (!selectedBreeds.includes(breedValue) && selectedBreeds.length < 2) {
      const newBreeds = [...selectedBreeds, breedValue];
      onBreedsChange(newBreeds);
      
      // Close dropdown if 2 breeds are now selected
      if (newBreeds.length >= 2) {
        setIsOpen(false);
      }
    }
    setSearchTerm('');
  };

  const handleAddCustomBreed = () => {
    const value = searchTerm.trim();
    if (!value) return;
    handleBreedSelect(value);
  };

  const handleBreedRemove = (breedValue: string) => {
    onBreedsChange(selectedBreeds.filter(breed => breed !== breedValue));
  };

  const getBreedLabel = (value: string) => {
    return breedOptions.find(breed => breed.value === value)?.label || value;
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      {/* Selected breeds as tags */}
      {selectedBreeds.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-gray-50 min-h-[40px]">
          {selectedBreeds.map((breedValue) => (
            <Badge
              key={breedValue}
              variant="secondary"
              className="flex items-center gap-1 px-2 py-1"
            >
              {getBreedLabel(breedValue)}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => handleBreedRemove(breedValue)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search and select interface */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal"
            onClick={() => setIsOpen(true)}
            disabled={selectedBreeds.length >= 2}
          >
            {selectedBreeds.length >= 2 ? "Maximum 2 breeds selected" : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <div className="p-2">
            <Input
              placeholder="Search breeds..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-2"
            />
            <div className="max-h-48 overflow-y-auto">
              {filteredBreeds.length > 0 ? (
                filteredBreeds.map((breed) => (
                  <div
                    key={breed.value}
                    className="px-3 py-2 cursor-pointer hover:bg-gray-100 rounded-sm"
                    onClick={() => handleBreedSelect(breed.value)}
                  >
                    {breed.label}
                  </div>
                ))
              ) : allowCustom && searchTerm.trim() && selectedBreeds.length < 2 ? (
                <div
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 rounded-sm text-sm"
                  onClick={handleAddCustomBreed}
                >
                  Add "{searchTerm.trim()}" as custom breed
                </div>
              ) : (
                <div className="px-3 py-2 text-gray-500 text-sm">
                  {searchTerm ? 'No breeds found' : 'Maximum breeds selected'}
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
