'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import VideoBackground from './VideoBackground';
import PulseButton from './PulseButton';
import SearchContainer from './SearchContainer';

// Lazy load modals - only load when needed
const ImageModal = dynamic(() => import('./quiz/ImageModal'), { ssr: false });
const JourneyModal = dynamic(() => import('./JourneyModal'), { ssr: false });


// Video and image assets
const mobileVideoUrl = "https://sehzakutrlropprdcewu.supabase.co/storage/v1/object/sign/home-page/MOVIL_DOG_QUEST_LOGO_ANIMATION.mp4?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0b3JhZ2UtdXJsLXNpZ25pbmcta2V5XzRkMzVhZDA5LTkyOTctNGVlOS1iMzZiLWFkNTIyYTViZGE2YSJ9.eyJ1cmwiOiJob21lLXBhZ2UvTU9WSUxfRE9HX1FVRVNUX0xPR09fQU5JTUFUSU9OLm1wNCIsImlhdCI6MTc0NzY1NjMwMywiZXhwIjoyMzc4Mzc2MzAzfQ.KKAeyN9ZroFQcI1oZ-CISoiEjfav8NLTzPFySZTOrhY";

const desktopVideoUrl = "https://sehzakutrlropprdcewu.supabase.co/storage/v1/object/sign/home-page/WEB_DOG_QUEST_LOGO_ANIMATION.mp4?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0b3JhZ2UtdXJsLXNpZ25pbmcta2V5XzRkMzVhZDA5LTkyOTctNGVlOS1iMzZiLWFkNTIyYTViZGE2YSJ9.eyJ1cmwiOiJob21lLXBhZ2UvV0VCX0RPR19RVUVTVF9MT0dPX0FOSU1BVElPTi5tcDQiLCJpYXQiOjE3NDc2NTYzOTEsImV4cCI6MjM3ODM3NjM5MX0.FXDFZHTrb496lHC121l5p7SRNgq1j5ezG89LL8y192s";

const placeholderImageUrl = "https://sehzakutrlropprdcewu.supabase.co/storage/v1/object/sign/home-page/DogQuest-Green-Puppy-Archway-Edit.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0b3JhZ2UtdXJsLXNpZ25pbmcta2V5XzRkMzVhZDA5LTkyOTctNGVlOS1iMzZiLWFkNTIyYTViZGE2YSJ9.eyJ1cmwiOiJob21lLXBhZ2UvRG9nUXVlc3QtR3JlZW4tUHVwcHktQXJjaHdheS1FZGl0LnBuZyIsImlhdCI6MTc0NjAyMjk5OCwiZXhwIjoyMzc2NzQyOTk4fQ.jSDaSXU-EkL_hAvrftK5Szwd8if_HHadcWhzdeNHKzw";

/** Mobile hero still (Supabase CDN, ~204KB JPEG) — same image before, during fallback, and after video */
const MOBILE_HERO_STILL_IMAGE_URL =
  'https://sehzakutrlropprdcewu.supabase.co/storage/v1/object/sign/home-page/DogQuest-Mobile-Green-Puppy-Archway.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0b3JhZ2UtdXJsLXNpZ25pbmcta2V5XzRkMzVhZDA5LTkyOTctNGVlOS1iMzZiLWFkNTIyYTViZGE2YSJ9.eyJ1cmwiOiJob21lLXBhZ2UvRG9nUXVlc3QtTW9iaWxlLUdyZWVuLVB1cHB5LUFyY2h3YXkucG5nIiwiaWF0IjoxNzQ2NDQ0ODM1LCJleHAiOjIzNzcxNjQ4MzV9.gYnsRQzPPAqRPtfdDcTv5p2r9r9uPSthPEfkOKbArgs';

const proudToBeIrishImageUrl = "https://sehzakutrlropprdcewu.supabase.co/storage/v1/object/sign/home-page/Dog-Quest-Proud-to-be-Irish.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV80ZDM1YWQwOS05Mjk3LTRlZTktYjM2Yi1hZDUyMmE1YmRhNmEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJob21lLXBhZ2UvRG9nLVF1ZXN0LVByb3VkLXRvLWJlLUlyaXNoLnBuZyIsImlhdCI6MTc1MTAxMDkxNiwiZXhwIjoyMzgxNzMwOTE2fQ.pBGEi5LvP0tcQV8D69kmGa2D1t7wzmmEiyYl71GlksY";

const HeroSection: React.FC = () => {
  /** Laptop/desktop only: tablet (768–1023px) uses mobile video so animation matches phone. */
  const [useDesktopHeroVideo, setUseDesktopHeroVideo] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isJourneyModalOpen, setIsJourneyModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const check = (e?: MediaQueryList | MediaQueryListEvent) => {
      setUseDesktopHeroVideo(e ? e.matches : mediaQuery.matches);
    };

    check();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', check);
      return () => mediaQuery.removeEventListener('change', check);
    }
    mediaQuery.addListener(check);
    return () => mediaQuery.removeListener(check);
  }, []);

  // Preload mobile hero still on phone/tablet so it is ready when the intro video ends
  useEffect(() => {
    if (useDesktopHeroVideo || typeof window === 'undefined') return;

    const href = MOBILE_HERO_STILL_IMAGE_URL;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = href;
    document.head.appendChild(link);

    const img = new window.Image();
    img.src = href;

    return () => {
      link.remove();
    };
  }, [useDesktopHeroVideo]);

  const handleStartJourney = () => {
    setIsJourneyModalOpen(true);
  };

  return (
    <section className="relative w-full h-screen overflow-x-hidden overflow-y-visible">
      <div className="absolute inset-0 z-0">
        <VideoBackground
          videoSrc={useDesktopHeroVideo ? desktopVideoUrl : mobileVideoUrl}
          useDesktopLayout={useDesktopHeroVideo}
          fallbackImageSrc={placeholderImageUrl}
          mobileFallbackImageSrc={MOBILE_HERO_STILL_IMAGE_URL}
          mobilePostVideoImageSrc={MOBILE_HERO_STILL_IMAGE_URL}
          onVideoEnd={() => {}}
        />
      </div>

      {/* Proud to be Irish Image - Top Right Corner - Lazy loaded */}
      {proudToBeIrishImageUrl && (
        <div className="absolute top-4 right-4 z-40 md:top-8 md:right-8">
          <div 
            className="relative w-20 h-20 md:w-40 md:h-40 lg:w-40 lg:h-40 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setIsImageModalOpen(true)}
          >
            <Image 
              src={proudToBeIrishImageUrl}
              alt="Dog Quest - Proud to be Irish"
              fill
              className="object-contain"
              loading="lazy"
              sizes="(max-width: 768px) 80px, 160px"
              quality={70}
            />
          </div>
        </div>
      )}

      <div className="absolute inset-0 flex min-h-0 flex-col items-center justify-start z-30 px-4 md:px-8 pointer-events-none [&_*]:pointer-events-auto">
        <div className="mt-8 shrink-0 sm:mt-20 md:mt-10 lg:mt-20 w-full flex justify-center md:justify-start md:pl-8 lg:pl-16">
          <PulseButton onClick={handleStartJourney} />
        </div>
        {/* md–xl: flex spacer + bottom margin place search under chin / upper legs (not on face or paws) */}
        <div
          className="hidden md:flex xl:hidden w-full flex-1 min-h-[5rem] max-h-[min(40vh,17rem)] shrink basis-0"
          aria-hidden="true"
        />
        <div className="w-full shrink-0 flex-1 justify-center  md:mb-[min(17vh,8rem)] xl:mb-0">
          <SearchContainer position="hero-overlay" />
        </div>
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        imageUrl={proudToBeIrishImageUrl}
        breedName="Dog Quest - Proud to be Irish"
      />

      {/* Journey Modal */}
      <JourneyModal
        isOpen={isJourneyModalOpen}
        onClose={() => setIsJourneyModalOpen(false)}
      />
    </section>
  );
};

export default HeroSection;
