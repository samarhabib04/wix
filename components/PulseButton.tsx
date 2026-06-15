
'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from "@/lib/utils";
import { useRouter } from 'next/navigation';
import { PawPrint } from 'lucide-react';

interface PulseImageButtonProps {
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

const PulseImageButton: React.FC<PulseImageButtonProps> = ({ onClick, className, children }) => {
  const router = useRouter();
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push('/quiz');
    }
  };

  return (
    <div
      id="hero-start-journey-btn"
      data-restore-target
      onClick={handleClick}
      role="button"
      aria-label={typeof children === 'string' ? children : "Start Your Journey"}
      className={cn(
        "cursor-pointer transition-transform duration-700 hover:scale-105 w-fit",
        className
      )}
    >
      <div className="relative flex flex-col items-center">
        <div 
          className="relative w-[170px] h-[170px] sm:w-40 sm:h-40 md:w-64 md:h-64 rounded-full flex items-center justify-center animate-pulseScale" 
          style={{ 
            animationDuration: '1.5s',
            filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.9)) drop-shadow(0 0 40px rgba(255, 255, 255, 0.6)) drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3))'
          }}
        >
          <Image 
            src="https://sehzakutrlropprdcewu.supabase.co/storage/v1/object/sign/home-page/Start%20Your%20Journey%20Button.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0b3JhZ2UtdXJsLXNpZ25pbmcta2V5XzRkMzVhZDA5LTkyOTctNGVlOS1iMzZiLWFkNTIyYTViZGE2YSJ9.eyJ1cmwiOiJob21lLXBhZ2UvU3RhcnQgWW91ciBKb3VybmV5IEJ1dHRvbi5wbmciLCJpYXQiOjE3NDcxMjMzMTEsImV4cCI6MjM3Nzg0MzMxMX0.R1smPL2TBEgIiLJtD9SbUwd_wGviq4itxu-qEpnfHhw"
            alt="Start Your Journey"
            fill
            className="object-contain"
            loading="eager"
            quality={75}
            sizes="(max-width: 640px) 170px, (max-width: 768px) 160px, 256px"
          />
        </div>
        
        {children && (
          <div className="mt-2 text-center text-xs sm:text-sm md:text-base font-medium text-brand-dark-green max-w-[120px]">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

// Create a specialized pawprint button variation
export const PulsePawButton: React.FC<PulseImageButtonProps> = ({ onClick, className, children }) => {
  const router = useRouter();
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push('/quiz');
    }
  };

  return (
    <div
      id="quiz-paw-btn"
      data-restore-target
      onClick={handleClick}
      role="button"
      aria-label={typeof children === 'string' ? children : "Who Will I Grow Into?"}
      className={cn(
        "cursor-pointer transition-transform duration-700 hover:scale-105 w-fit",
        className
      )}
    >
      <div className="relative flex flex-col items-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-brand-soft-green rounded-full flex items-center justify-center animate-pulseScale" style={{ animationDuration: '2.5s' }}>
          <PawPrint className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </div>
        
        {children && (
          <div className="mt-2 text-center text-xs sm:text-sm md:text-base font-medium text-brand-dark-green max-w-[120px]">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export default PulseImageButton;
