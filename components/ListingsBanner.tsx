
import React from 'react';
import { Home } from 'lucide-react';

export const ListingsBanner: React.FC = () => {
  return (
    <section className="bg-[#E1E8E0] rounded-lg border border-[#A2BF9E] p-4 sm:p-6 md:p-8 relative mb-6 min-h-[180px] sm:min-h-[200px] overflow-hidden">
      <div className="text-left max-w-2xl pr-16 sm:pr-20 md:pr-24 relative z-10">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-berkshire text-brand-dark-green mb-2">Dogs for Sale</h2>
        <p className="text-gray-700 text-xs sm:text-sm md:text-base leading-relaxed">
          Find your perfect canine companion.<br className="hidden sm:block" />
          <span className="sm:hidden"> </span>
          Browse our selection of healthy, well-socialized dogs from trusted breeders.
        </p>
      </div>
      <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 md:bottom-6 md:right-6 z-0">
        <Home className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 text-brand-dark-green opacity-40 sm:opacity-60" />
      </div>
    </section>
  );
};
