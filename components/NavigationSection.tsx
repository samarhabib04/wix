
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, ArrowRight, ShoppingCart, Search } from 'lucide-react';

interface NavigationSectionProps {
  variant?: 'default' | 'shop' | 'quiz';
}

const NavigationSection: React.FC<NavigationSectionProps> = ({ variant = 'default' }) => {
  const router = useRouter();
  return (
    <section className="w-full bg-[#E1E8E0] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl font-berkshire text-brand-dark-green mb-3">
              Continue Your Journey
            </h2>
            <p className="text-gray-700 mb-6 max-w-xl">
              Discover more ways to find your perfect dog companion or explore our services.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            {variant === 'shop' ? (
              <>
                <Button 
                  id="nav-back-to-shop-btn"
                  data-restore-target
                  asChild 
                  className="bg-brand-dark-green hover:bg-brand-soft-green px-6"
                >
                  <Link href="/shop" className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Back to Shop
                  </Link>
                </Button>
                <Button 
                  id="nav-explore-breeds-btn"
                  data-restore-target
                  asChild 
                  className="bg-brand-soft-green hover:bg-brand-dark-green px-6"
                >
                  <Link href="/breeds" className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Explore Breeds
                  </Link>
                </Button>
              </>
            ) : variant === 'quiz' ? (
              <>
                <Button 
                  id="nav-return-home-quiz-btn"
                  data-restore-target
                  asChild 
                  className="bg-brand-dark-green hover:bg-brand-soft-green px-6"
                >
                  <Link href="/" className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Return Home
                  </Link>
                </Button>
                <Button 
                  id="nav-view-all-breeds-btn"
                  data-restore-target
                  asChild 
                  className="bg-brand-soft-green hover:bg-brand-dark-green px-6"
                >
                  <Link href="/breeds" className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    View All Breeds
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button 
                  id="nav-return-home-btn"
                  data-restore-target
                  asChild 
                  className="bg-brand-dark-green hover:bg-brand-soft-green px-6"
                >
                  <Link href="/" className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Return Home
                  </Link>
                </Button>
              <Button 
                id="nav-take-quiz-btn"
                data-restore-target
                onClick={() => router.push('/quiz')} 
                className="bg-brand-soft-green hover:bg-brand-dark-green px-6 flex items-center gap-2"
              >
                Take the Quiz
                <ArrowRight className="h-4 w-4" />
              </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default NavigationSection;
