'use client';

import dynamic from 'next/dynamic';
import HeroSection from "@/components/HeroSection";

// Lazy load BoostCarousels - defer loading until visible
const BoostCarousels = dynamic(() => import("@/components/BoostCarousels"), {
  loading: () => <div className="h-96 animate-pulse bg-gray-50" />,
  ssr: false  // Don't render on server, load only on client when visible
});

// Lazy load below-the-fold components to improve initial load performance
const NewListingsCarousel = dynamic(() => import("@/components/NewListingsCarousel"), {
  loading: () => <div className="h-64 animate-pulse bg-gray-100" />,
  ssr: false  // Don't render on server, load only on client
});

const BadgesExplanationSection = dynamic(() => import("@/components/BadgesExplanationSection"), {
  loading: () => <div className="h-96 animate-pulse bg-gray-50" />,
  ssr: false
});

const ShowcaseBanner = dynamic(() => import("@/components/ShowcaseBanner").then(mod => ({ default: mod.ShowcaseBanner })), {
  loading: () => <div className="h-32 animate-pulse bg-gray-100" />,
  ssr: false
});

const ShowcaseSection = dynamic(() => import("@/components/ShowcaseSection"), {
  loading: () => <div className="h-96 animate-pulse bg-gray-50" />,
  ssr: false
});

const CarouselSection = dynamic(() => import("@/components/CarouselSection"), {
  loading: () => <div className="h-96 animate-pulse bg-gray-50" />,
  ssr: false
});

const BrowseByBreedSection = dynamic(() => import("@/components/BrowseByBreedSection"), {
  loading: () => <div className="h-96 animate-pulse bg-gray-50" />,
  ssr: false
});

const BrowseMixedBreedsSection = dynamic(() => import("@/components/BrowseMixedBreedsSection"), {
  loading: () => <div className="h-96 animate-pulse bg-gray-50" />,
  ssr: false
});

const QuizCTASection = dynamic(() => import("@/components/QuizCTASection"), {
  loading: () => <div className="h-64 animate-pulse bg-gray-100" />,
  ssr: false
});

const ServicesSection = dynamic(() => import("@/components/ServicesSection"), {
  loading: () => <div className="h-96 animate-pulse bg-gray-50" />,
  ssr: false
});

const ShopSection = dynamic(() => import("@/components/ShopSection"), {
  loading: () => <div className="h-96 animate-pulse bg-gray-50" />,
  ssr: false
});

const BusinessBoostCarousel = dynamic(() => import("@/components/business/BusinessBoostCarousel"), {
  loading: () => <div className="h-96 animate-pulse bg-gray-50" />,
  ssr: false
});

const TrustedByVetsSection = dynamic(() => import("@/components/TrustedByVetsSection"), {
  loading: () => <div className="h-96 animate-pulse bg-gray-50" />,
  ssr: false
});

const StoriesSection = dynamic(() => import("@/components/StoriesSection"), {
  loading: () => <div className="h-96 animate-pulse bg-gray-50" />,
  ssr: false
});

const NewsletterSection = dynamic(() => import("@/components/NewsletterSection"), {
  loading: () => <div className="h-64 animate-pulse bg-gray-100" />,
  ssr: false
});

export default function Home() {
  return (
    <>
      <HeroSection />
      <BoostCarousels />
      <NewListingsCarousel />
      <BadgesExplanationSection />
      <ShowcaseBanner />
      <ShowcaseSection />
      <CarouselSection />
      <BrowseByBreedSection />
      <BrowseMixedBreedsSection />
      <QuizCTASection />
      <BusinessBoostCarousel title="Featured Businesses" />
      <ServicesSection />
      <ShopSection />
      <TrustedByVetsSection />
      <StoriesSection />
      <NewsletterSection />
    </>
  );
}
