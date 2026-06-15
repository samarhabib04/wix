
import React from 'react';
import { Dog } from 'lucide-react';

export const StudBanner: React.FC = () => {
  return (
    <section className="bg-blue-200 rounded-lg border border-blue-600 p-4 sm:p-6 md:p-8 relative mb-6 min-h-[180px] sm:min-h-[200px] overflow-hidden">
      <div className="text-left max-w-2xl pr-16 sm:pr-20 md:pr-24 relative z-10">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-berkshire text-blue-600 mb-2">Stud Dogs</h2>
        <p className="text-gray-600 text-xs sm:text-sm md:text-base leading-relaxed font-medium">
          Find the perfect stud dog for your breeding program.<br className="hidden sm:block" />
          <span className="sm:hidden"> </span>
          All our stud dogs are health tested and have excellent pedigrees.
        </p>
      </div>
      <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 md:bottom-6 md:right-6 z-0">
        <Dog className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 text-blue-600 opacity-40 sm:opacity-60" />
      </div>
    </section>
  );
};
