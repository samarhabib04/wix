import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Lazy load search module to reduce initial bundle
const DogSearchModule = dynamic(() => import('./DogSearchModule'), {
  ssr: false,
  loading: () => <div className="h-12 animate-pulse bg-gray-200 rounded-lg" />
});

interface SearchContainerProps {
  position?: 'hero-overlay' | 'standalone';
  className?: string;
}

const SearchContainer: React.FC<SearchContainerProps> = ({ 
  position = 'hero-overlay',
  className = ''
}) => {
  if (position === 'hero-overlay') {
    return (
      <>
        {/* md+ (tablet & desktop): search below pulse; tablet spacer in HeroSection adds extra offset */}
        <div className="hidden md:block relative z-30 w-full max-w-2xl mx-auto animate-fade-in md:mt-0 lg:mt-6 xl:mt-10 mb-8 md:mb-10 lg:mb-16 xl:mb-24">
          <DogSearchModule />
        </div>

        {/* Mobile: anchored near the bottom of the hero so the panel sits well under the dog's face.
            Inline style guarantees the value applies even if CSS is cached. */}
        <div
          className="md:hidden absolute top-[60%] left-0 right-0 z-30 px-3"
          style={{ bottom: '6%' }}
        >
          <DogSearchModule />
        </div>
      </>
    );
  }

  // Standalone position - for use outside hero section
  return (
    <div className={`w-full ${className}`}>
      <div className="w-full max-w-2xl mx-auto pt-20">
        <DogSearchModule />
      </div>
    </div>
  );
};

export default SearchContainer;
