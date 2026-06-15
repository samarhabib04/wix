'use client';

import React from 'react';
import Header from './Header';
import Footer from './Footer';
import BreadcrumbNav from './BreadcrumbNav';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';

interface GlobalLayoutProps {
  children: React.ReactNode;
}

export default function GlobalLayout({ children }: GlobalLayoutProps) {
  // Enable scroll restoration for back button behavior
  useScrollRestoration();
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="pt-24">
        <BreadcrumbNav />
        <main className="flex-grow">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}

