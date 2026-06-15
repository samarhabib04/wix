
import React from 'react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface BreedImageWithDetailsProps {
  name: string;
  image: string;
  badges: string[];
  className?: string;
}

export const BreedImageWithDetails = ({ name, image, badges, className }: BreedImageWithDetailsProps) => {
  return (
    <Card className={cn("overflow-hidden shadow-md", className)}>
      <div className="relative w-full h-full">
        <AspectRatio ratio={1/1} className="w-full">
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 z-10" />
          <img 
            src={image} 
            alt={name} 
            className="object-cover w-full h-full media-scroll-fix"
            draggable={false}
          />
          
          {/* Breed name at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
            <h2 className="text-white font-berkshire text-2xl drop-shadow-lg">
              {name}
            </h2>
          </div>
          
          {/* Badges at top */}
          <div className="absolute top-0 right-0 p-3 z-20 flex flex-wrap gap-1.5 justify-end">
            {badges.map((badge, index) => (
              <Badge 
                key={index} 
                className="bg-white/80 text-brand-dark-green hover:bg-white"
              >
                {badge}
              </Badge>
            ))}
          </div>
        </AspectRatio>
      </div>
    </Card>
  );
};
