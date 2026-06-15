'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import BackgroundRemovalProcessor from '@/components/BackgroundRemovalProcessor';
const BadgesExplanationSection: React.FC = () => {
  const [showProcessor, setShowProcessor] = useState(false);
  return <div className="relative w-full overflow-hidden" style={{ backgroundColor: '#fce7f3' }}>
      {showProcessor && <BackgroundRemovalProcessor onProcessComplete={() => setShowProcessor(false)} />}
      
      {/* Dev Tool - Remove in production */}
      
      <section className="relative bg-[#E1E8E0] text-white py-16 px-4">
        <div className="container mx-auto max-w-5xl relative z-10">
          <h2 className="text-center text-3xl md:text-4xl font-semibold text-brand-dark-green mt-[-20px] mb-14 font-berkshire">
            Why You Can Trust Dog Quest
          </h2>

          {/* Badge Explanations - Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-12">
            {/* Gold Star Badge Explanation */}
            <div className={cn(
              "relative bg-white rounded-2xl p-6 md:p-8 shadow-xl",
              "border-2 border-amber-300/50 backdrop-blur-sm",
              "transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02]",
              "before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-amber-200/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300"
            )}>
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="mb-2 inline-flex items-center justify-center relative h-30 w-30 md:h-24 md:w-24 rounded-full p-3 ">
                  <Image src="/badges/goldernstart.jpeg" alt="Gold Star Badge" width={80} height={80} className="object-contain" loading="lazy" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-yellow-600 mb-3 font-berkshire">
                  Gold Star
                </h3>
                <p className="text-gray-700 text-sm md:text-base text-center leading-relaxed font-medium">
                  Verified health check by a licensed vet
                </p>
                <div className="mt-4 flex items-center gap-1 text-amber-600">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-xs font-semibold">Premium Verification</span>
                </div>
              </div>
            </div>

            {/* Green Tick Badge Explanation */}
            <div className={cn(
              "relative bg-white rounded-2xl p-6 md:p-8 shadow-xl",
              "border-2 border-green-300/30",
              "transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02]"
            )}>
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="mb-2 inline-flex items-center justify-center relative h-30 w-30 md:h-24 md:w-24 bg-white rounded-full p-3 ring-green-200/50">
                  <Image src="/badges/greentick.jpeg" alt="Green Tick Badge" width={80} height={80} className="object-contain" loading="lazy" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 mb-3 font-berkshire">
                  Green Tick
                </h3>
                <p className="text-gray-700 text-sm md:text-base text-center leading-relaxed font-medium">
                  Verified vaccination record by a licensed vet
                </p>
                <div className="mt-4 flex items-center gap-1 text-green-600">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-semibold">Health Verified</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sample Listing Card */}
          <div className="max-w-sm mx-auto mb-8">
            <div className="group relative bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-gray-100 transform transition-all duration-300 hover:shadow-3xl hover:-translate-y-1">
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-brand-soft-green/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"></div>
              
              <div className="relative">
                <div className="relative w-full h-52 overflow-hidden">
                  <Image 
                    src="/assets/puppy.jpg" 
                    alt="Sample puppy listing" 
                    width={384} 
                    height={208} 
                    className="object-cover object-center transition-transform duration-500 group-hover:scale-110" 
                    loading="lazy" 
                  />
                  {/* Gradient overlay on image */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
                
                {/* Enhanced Pulsing Badges */}
                <div className="absolute top-4 right-4 flex flex-col gap-3 z-20">
                  <div className="bg-white/95 backdrop-blur-sm rounded-full shadow-xl relative h-12 w-12 flex items-center justify-center ring-2 ring-amber-300/50 animate-pulse">
                    <Image src="/badges/goldernstart.jpeg" alt="Gold Star" width={32} height={32} className="object-contain " loading="lazy" />
                  </div>
                  <div className="bg-white rounded-full  relative h-12 w-12 flex items-center justify-center ring-2 ring-green-300/50 animate-pulse" style={{ animationDelay: '0.5s' }}>
                    <Image src="/badges/greentick.jpeg" alt="Green Tick" width={32} height={32} className="object-contain" loading="lazy" />
                  </div>
                </div>
                
                {/* Premium Badge */}
                <div className="absolute top-4 left-4 z-20">
                  <span className="bg-gradient-to-r from-brand-dark-green to-brand-soft-green text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                    Verified
                  </span>
                </div>
              </div>
              
              <div className="relative z-10 p-5 bg-gradient-to-b from-white to-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-bold text-lg text-gray-900 mb-1 group-hover:text-brand-dark-green transition-colors">
                      Golden Retriever Puppy
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>8 weeks old</span>
                      <span>•</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Dublin</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-dark-green to-brand-soft-green">
                    €1,200
                  </p>
                  <div className="flex gap-1">
                    <div className="h-2 w-2 rounded-full bg-amber-400"></div>
                    <div className="h-2 w-2 rounded-full bg-green-400"></div>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-center text-sm text-gray-600 mt-4 italic font-medium">
              ✨ Look for these pulsing badges when browsing listings ✨
            </p>
          </div>

          {/* Learn More Button */}
          <div className="text-center">
            <Button asChild className="bg-brand-dark-green hover:bg-brand-soft-green text-white px-4 py-2 md:px-8 md:py-3 text-base md:text-lg">
              <Link href="/vet-partners">Learn More About Our Trust System</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Bottom Wave */}
       <div className="w-full overflow-hidden">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-[60px] md:h-[80px] relative block">
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="fill-[#E1E8E0]"></path>
        </svg>
      </div>
    </div>;
};
export default BadgesExplanationSection;
