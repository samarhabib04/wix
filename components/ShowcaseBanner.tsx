
'use client';

import React from 'react';
import Link from 'next/link';
import { Baby, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const ShowcaseBanner: React.FC = () => {
  return (
    <>
   
    <section className="bg-pink-100 py-12 sm:py-16">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg border border-pink-200 p-6 sm:p-8 flex flex-col md:flex-row gap-8 items-center shadow-sm">
          <div className="flex-shrink-0 bg-pink-100 p-5 rounded-full">
            <Baby className="w-12 h-12 text-pink-500" />
          </div>
          
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-berkshire text-pink-800 mb-2">
                Puppy Showcase
              </h2>
              <p className="text-sm text-pink-600 font-medium">
                Sneak Peek. Big Paws to Fill.
              </p>
            </div>
            
            <p className="text-gray-700">
              Get an exclusive first look at upcoming litters from trusted breeders before they're officially listed. 
              See early photos, add puppies you love to your wishlist and follow updates.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pink-400"></span>
                <span className="text-sm">Newborn puppies & litters</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pink-400"></span>
                <span className="text-sm">New images</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pink-400"></span>
                <span className="text-sm">Add to your wishlist</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pink-400"></span>
                <span className="text-sm">Get notified when available</span>
              </div>
            </div>
            
            <div>
              <Button 
                asChild 
                className="bg-pink-500 hover:bg-pink-600 text-white font-medium"
              >
                <Link href="/showcase" className="flex items-center gap-2">
                  Explore Showcase <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
          
          {/* Added puppy image */}
          <div className="flex-shrink-0 ">
            <div className="relative w-36 h-36 lg:w-44 lg:h-44 rounded-full overflow-hidden border-4 border-pink-200">
              <img 
                src="https://images.unsplash.com/photo-1591160690555-5debfba289f0?q=80&w=764&auto=format&fit=crop"
                alt="Cute puppy" 
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
     <div className="w-full overflow-hidden">
        <svg 
          viewBox="0 0 1200 120" 
          preserveAspectRatio="none" 
          className="w-full h-[60px] md:h-[80px] relative block"
        >
          <path 
            d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" 
            className="fill-[#FCE7F3]"
          ></path>
        </svg>
      </div>
     </>
  );
};
