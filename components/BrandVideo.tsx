'use client';

import React, { useEffect, useState } from 'react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { ExternalLink, Youtube } from 'lucide-react';

interface BrandVideoProps {
  youtubeUrl?: string; // Full YouTube URL or video ID
  youtubeVideoId?: string; // Direct video ID (alternative to youtubeUrl)
}

// Extract YouTube video ID from URL
const extractVideoId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

export const BrandVideo: React.FC<BrandVideoProps> = ({ 
  youtubeUrl,
  youtubeVideoId 
}) => {
  const isMobile = useIsMobile();
  const [showOverlay, setShowOverlay] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);

  // Determine video ID
  useEffect(() => {
    if (youtubeVideoId) {
      setVideoId(youtubeVideoId);
    } else if (youtubeUrl) {
      const extractedId = extractVideoId(youtubeUrl);
      setVideoId(extractedId);
    } else {
      // Default video ID - replace with your actual YouTube video ID
      setVideoId(null);
    }
  }, [youtubeUrl, youtubeVideoId]);

  // Show overlay after 6 seconds once video is loaded
  useEffect(() => {
    if (!videoId || !videoLoaded) return;

    const timer = setTimeout(() => {
      setShowOverlay(true);
    }, 6000); // 6 seconds preview

    return () => clearTimeout(timer);
  }, [videoId, videoLoaded]);

  if (!videoId) {
    return (
      <div className="mt-8 rounded-lg overflow-hidden shadow-lg relative bg-muted flex items-center justify-center p-8 min-h-[300px]">
        <div className="text-center space-y-2">
          <p className="text-gray-600 font-medium">YouTube video not configured</p>
          <p className="text-sm text-gray-500">
            Please provide a YouTube URL or video ID to the BrandVideo component
          </p>
        </div>
      </div>
    );
    }

  // YouTube embed URL with autoplay and muted settings
  const youtubeEmbedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&start=0&controls=0&modestbranding=1&rel=0&loop=1&playlist=${videoId}&enablejsapi=1`;
  const youtubeWatchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return (
    <div 
      id="brand-video-container"
      className="mt-8 rounded-lg overflow-hidden shadow-lg relative group"
    >
      <AspectRatio 
        ratio={isMobile ? 9/16 : 4/3} 
        className="bg-muted"
      >
        <iframe
          src={youtubeEmbedUrl}
          className="w-full h-full"
          allow="autoplay; encrypted-media; accelerometer; gyroscope; picture-in-picture"
          allowFullScreen
          title="Dog Quest brand video"
          style={{ border: 'none' }}
          onLoad={() => setVideoLoaded(true)}
        />
        
        {/* Overlay that appears after 5 seconds */}
        {showOverlay && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-4 p-6 transition-opacity duration-500 z-10">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Youtube className="h-16 w-16 text-red-500" />
              </div>
              <h3 className="text-2xl md:text-3xl font-berkshire text-white">
                Watch Full Video on YouTube
              </h3>
              <p className="text-white/90 text-sm md:text-base max-w-md">
                Get the full experience with better quality and sound
              </p>
            </div>
            
          <Button
              onClick={() => window.open(youtubeWatchUrl, '_blank', 'noopener,noreferrer')}
            size="lg"
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-lg font-semibold shadow-2xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
              aria-label="Watch video on YouTube"
          >
              <Youtube className="h-6 w-6" />
              Watch on YouTube
              <ExternalLink className="h-5 w-5" />
          </Button>
        </div>
        )}
      </AspectRatio>
    </div>
  );
};
