'use client';

import React, { useState } from 'react';
import BreedGrid from "@/components/BreedGrid";
import BreedFilters from "@/components/BreedFilters";
import { Badge } from "@/components/ui/badge";
import QuizCTASection from "@/components/QuizCTASection";
import NewsletterSection from "@/components/NewsletterSection";

export default function MixedBreedsPage() {
  const [filters, setFilters] = useState({
    size: [],
    grooming: [],
    energy: [],
    search: "",
    county: []
  });

  const handleFilterChange = (filterType: string, value: string[]) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleSearchChange = (search: string) => {
    setFilters(prev => ({
      ...prev,
      search
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      size: [],
      grooming: [],
      energy: [],
      search: "",
      county: []
    });
  };

  // Count active filters for displaying filter badges
  const activeFilterCount = (
    (filters.size.length > 0 ? 1 : 0) +
    (filters.grooming.length > 0 ? 1 : 0) +
    (filters.energy.length > 0 ? 1 : 0) +
    (filters.county.length > 0 ? 1 : 0) +
    (filters.search ? 1 : 0)
  );

  return (
    <div className="bg-[#E1E8E0] w-full">
      <div className="container mx-auto px-4 py-6 md:py-8 lg:py-10 min-h-screen">
        <div className="bg-brand-soft-green rounded-lg p-6 md:p-8 mb-8">
          <h1 className="font-berkshire text-3xl md:text-4xl lg:text-5xl text-white mb-3">Browse Mixed Breeds</h1>
          <p className="text-white text-lg md:text-xl opacity-90">Explore crossbreed puppies and dogs by size, temperament, and characteristics.</p>
        </div>

        <BreedFilters 
          filters={filters} 
          onFilterChange={handleFilterChange} 
          onSearchChange={handleSearchChange} 
          onReset={handleResetFilters} 
          breedType="Mixed"
        />
        
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {activeFilterCount > 0 && (
              <Badge variant="outline" className="bg-brand-light-green/10">
                Active filters: {activeFilterCount}
              </Badge>
            )}
          </div>
        )}
        
        <BreedGrid filters={filters} breedType="Mixed" />
      </div>
      
      {/* Full-width Newsletter Section */}
      <div className="w-full">
        <NewsletterSection />
      </div>
    </div>
  );
}

