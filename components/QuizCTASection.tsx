
import React from 'react';
import { motion } from 'framer-motion';
import PulseButton from './PulseButton';
import { useIsMobile } from '@/hooks/use-mobile';

const QuizCTASection: React.FC = () => {
  const isMobile = useIsMobile();
  
  return (
    <>
      <section className="py-12 md:py-20 bg-gradient-to-b from-brand-light-green/40 to-brand-light-green/10 overflow-hidden">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
            {/* Left Content - Text Column */}
            <motion.div 
              className="w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-berkshire text-brand-dark-green mb-4">
                Not Sure What Breed Suits You?
              </h2>
              <p className="text-gray-600 text-base sm:text-lg mb-8 max-w-lg">
                Take our quick quiz and discover your perfect match in under 2 minutes.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <PulseButton />
                <div className="invisible bg-gradient-to-r from-brand-soft-green/90 to-brand-soft-green/80 text-white px-6 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 font-medium text-sm sm:text-base flex items-center relative overflow-hidden group">
                  {/* Sparkle effect overlays */}
                  <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_107%,rgba(255,255,255,0.25)_0%,rgba(255,255,255,0.05)_5%,rgba(255,255,255,0)_45%)] animate-pulse"></span>
                  <span className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0)_60%)] animate-pulse" style={{ animationDuration: '2.5s' }}></span>
                  {/* Text with subtle shadow for depth */}
                  <span className="relative z-10 text-white drop-shadow-sm">Find Your Perfect Dog</span>
                </div>
              </div>
            </motion.div>

            {/* Right Content - Image Column */}
            <motion.div 
              className="w-full md:w-1/2 flex justify-center"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <div className="relative max-w-full">
                {/* Dog illustration with paw prints - using responsive sizing */}
                <img 
                  src="https://sehzakutrlropprdcewu.supabase.co/storage/v1/object/sign/home-page/Chihuahua-quiz-image.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0b3JhZ2UtdXJsLXNpZ25pbmcta2V5XzRkMzVhZDA5LTkyOTctNGVlOS1iMzZiLWFkNTIyYTViZGE2YSJ9.eyJ1cmwiOiJob21lLXBhZ2UvQ2hpaHVhaHVhLXF1aXotaW1hZ2UucG5nIiwiaWF0IjoxNzQ2MTEwNDY4LCJleHAiOjIzNzY4MzA0Njh9.2aflvjymatbMKT38Dm7HTryUtU9xC2hMUp0I9vcIWFU"
                  alt="Dog thinking about breed selection" 
                  className="w-full max-w-[300px] md:max-w-md h-auto rounded-lg shadow-md object-contain"
                />
                
                {/* Decorative paw prints - show only on larger screens */}
                {!isMobile && (
                  <>
                    <div className="absolute -top-8 -right-8 text-brand-soft-green opacity-40 transform rotate-12 hidden md:block">
                      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                        <path d="M8.75,8.46C7.91,6.48,6,5.81,4.81,6.69c-1.19,0.88-1.41,3.1-0.56,5.09c0.84,1.99,2.75,2.66,3.94,1.78C9.38,12.69,9.59,10.46,8.75,8.46z M20.75,8.46c-0.84-1.99-2.75-2.66-3.94-1.78c-1.19,0.88-1.41,3.1-0.56,5.09c0.84,1.99,2.75,2.66,3.94,1.78C21.38,12.69,21.59,10.46,20.75,8.46z M14.75,6.46c-0.84-1.99-2.75-2.66-3.94-1.78c-1.19,0.88-1.41,3.1-0.56,5.09c0.84,1.99,2.75,2.66,3.94,1.78C15.38,10.69,15.59,8.46,14.75,6.46z M14.21,15.46c-2.03-0.43-3.72,0.53-3.78,2.15c-0.06,1.62,1.54,3.27,3.57,3.69c2.03,0.43,3.72-0.53,3.78-2.15C17.84,17.54,16.24,15.89,14.21,15.46z M9.79,15.46c-2.03,0.43-3.63,2.08-3.57,3.69c0.06,1.62,1.75,2.57,3.78,2.15c2.03-0.43,3.63-2.08,3.57-3.69C13.51,15.98,11.82,15.03,9.79,15.46z"/>
                      </svg>
                    </div>
                    <div className="absolute bottom-4 -left-6 text-brand-soft-green opacity-40 transform -rotate-12 hidden md:block">
                      <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                        <path d="M8.75,8.46C7.91,6.48,6,5.81,4.81,6.69c-1.19,0.88-1.41,3.1-0.56,5.09c0.84,1.99,2.75,2.66,3.94,1.78C9.38,12.69,9.59,10.46,8.75,8.46z M20.75,8.46c-0.84-1.99-2.75-2.66-3.94-1.78c-1.19,0.88-1.41,3.1-0.56,5.09c0.84,1.99,2.75,2.66,3.94,1.78C21.38,12.69,21.59,10.46,20.75,8.46z M14.75,6.46c-0.84-1.99-2.75-2.66-3.94-1.78c-1.19,0.88-1.41,3.1-0.56,5.09c0.84,1.99,2.75,2.66,3.94,1.78C15.38,10.69,15.59,8.46,14.75,6.46z M14.21,15.46c-2.03-0.43-3.72,0.53-3.78,2.15c-0.06,1.62,1.54,3.27,3.57,3.69c2.03,0.43,3.72-0.53,3.78-2.15C17.84,17.54,16.24,15.89,14.21,15.46z M9.79,15.46c-2.03,0.43-3.63,2.08-3.57,3.69c0.06,1.62,1.75,2.57,3.78,2.15c2.03-0.43,3.63-2.08,3.57-3.69C13.51,15.98,11.82,15.03,9.79,15.46z"/>
                      </svg>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
};

export default QuizCTASection;
