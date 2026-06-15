
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface VideoBackgroundProps {
  videoSrc: string;
  fallbackImageSrc: string;
  mobileFallbackImageSrc?: string;
  /** Mobile/tablet still hero (same URL as fallback avoids old→new flash after video) */
  mobilePostVideoImageSrc?: string;
  /** Wide WEB video + zoom crop; false for MOVIL video (phone and tablet below lg). */
  useDesktopLayout?: boolean;
  onVideoEnd?: () => void;
}

const VideoBackground: React.FC<VideoBackgroundProps> = ({
  videoSrc,
  fallbackImageSrc,
  mobileFallbackImageSrc,
  mobilePostVideoImageSrc,
  useDesktopLayout = false,
  onVideoEnd,
}) => {
  const [videoEnded, setVideoEnded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const mobileImageSrc =
    mobilePostVideoImageSrc ?? mobileFallbackImageSrc ?? fallbackImageSrc;

  const isMobileLayout = !useDesktopLayout;

  // Warm the mobile hero image in the browser cache while the intro video plays
  useEffect(() => {
    if (!isMobileLayout || !mobileImageSrc) return;
    const img = new window.Image();
    img.src = mobileImageSrc;
  }, [isMobileLayout, mobileImageSrc]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      setVideoEnded(true);
      onVideoEnd?.();
    };

    const handleError = () => {
      setVideoError(true);
    };

    const handleLoadedData = () => {
      setVideoLoaded(true);
    };

    const attemptAutoplay = async () => {
      try {
        await video.play();
      } catch {
        const playOnInteraction = async () => {
          try {
            await video.play();
            document.removeEventListener('touchstart', playOnInteraction);
            document.removeEventListener('click', playOnInteraction);
          } catch {
            // Video plays after user interaction
          }
        };

        document.addEventListener('touchstart', playOnInteraction, { once: true });
        document.addEventListener('click', playOnInteraction, { once: true });
      }
    };

    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    video.addEventListener('loadeddata', handleLoadedData);

    const autoplayTimeout = setTimeout(() => {
      void attemptAutoplay();
    }, 100);

    return () => {
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadeddata', handleLoadedData);
      clearTimeout(autoplayTimeout);
    };
  }, [onVideoEnd, videoSrc]);

  const showFallback = !videoLoaded || videoEnded || videoError;
  const showVideo = !videoError && !videoEnded;

  return (
    <div className="absolute inset-0 z-0 w-full h-full overflow-hidden">
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${showFallback ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
        aria-hidden={!showFallback}
      >
        <Image
          src={fallbackImageSrc}
          alt="Dog Quest Hero"
          fill
          priority
          className={`object-cover ${useDesktopLayout ? 'hidden lg:block' : 'hidden'}`}
          sizes="100vw"
          quality={50}
          fetchPriority="high"
        />
        {mobileFallbackImageSrc || mobilePostVideoImageSrc ? (
          <Image
            src={mobileImageSrc}
            alt="Dog Quest Hero"
            fill
            priority
            className={`object-cover object-[center_22%] ${useDesktopLayout ? 'block lg:hidden' : 'block'}`}
            sizes="100vw"
            quality={85}
            fetchPriority="high"
          />
        ) : (
          <Image
            src={fallbackImageSrc}
            alt="Dog Quest Hero"
            fill
            priority
            className={`object-cover ${useDesktopLayout ? 'block lg:hidden' : 'block'}`}
            sizes="100vw"
            quality={50}
            fetchPriority="high"
          />
        )}
      </div>

      {showVideo && (
        <video
          key={videoSrc}
          ref={videoRef}
          className={`absolute w-full h-full object-cover transition-opacity duration-1000 ease-in-out [&::-webkit-media-controls]:hidden ${useDesktopLayout ? 'lg:h-[120%] lg:top-[-10%]' : ''} ${videoLoaded ? 'opacity-100 z-20' : 'opacity-0 z-0'}`}
          style={{ pointerEvents: 'none' }}
          autoPlay
          muted
          playsInline
          webkit-playsinline="true"
          preload="auto"
          controls={false}
          controlsList="nodownload nofullscreen noremoteplayback"
          disablePictureInPicture
          x5-video-player-type="h5"
          x5-video-player-fullscreen="true"
          x5-video-orientation="portrait"
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}

      <div className="absolute inset-0 bg-black opacity-0" />
    </div>
  );
};

export default VideoBackground;
