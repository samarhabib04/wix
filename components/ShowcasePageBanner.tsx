
import React from 'react';
import { Baby } from 'lucide-react';

export const ShowcasePageBanner: React.FC = () => {
  return (
    <section className="bg-pink-100 rounded-lg border border-pink-300 p-4 sm:p-6 md:p-8 relative mb-6 min-h-[180px] sm:min-h-[200px] overflow-hidden">
      <div className="text-left max-w-2xl pr-16 sm:pr-20 md:pr-24 relative z-10">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-berkshire text-pink-800 mb-2">Puppy Showcase</h2>
        <p className="text-pink-700 text-xs sm:text-sm md:text-base leading-relaxed font-medium">
          The DogQuest Showcase is a sneak peek - a curated preview of upcoming litters from trusted breeders and verified dog lovers.
          <br className="hidden sm:block" />
          <span className="sm:hidden"> </span>
          Add your favourites to your wishlist and get notified when they are looking for a new home!
        </p>
      </div>
      <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 md:bottom-6 md:right-6 z-0">
        <Baby className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 text-pink-700 opacity-40 sm:opacity-60" />
      </div>
    </section>
  );
};
