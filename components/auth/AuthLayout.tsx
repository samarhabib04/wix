'use client';

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { DogIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: React.ReactNode;
}

export default function AuthLayout({ children, title, description }: AuthLayoutProps) {
  return (
    <div className="auth-layout min-h-screen bg-[#E1E8E0]">
      <style>
        {`
          .auth-layout .footer-wave-container {
            background-color: white !important;
          }
        `}
      </style>
      
      <div className="flex-grow flex">
        {/* Left Column - Content */}
        <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
            <div className="text-center">
              <Link href="/" className="inline-flex justify-center">
                <DogIcon className="h-24 w-24 text-brand-dark-green" />
              </Link>
              
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">{title}</h2>
              {description && (
                typeof description === 'string' 
                  ? <p className="mt-2 text-sm text-gray-600">{description}</p>
                  : <div className="mt-2 text-sm text-gray-600">{description}</div>
              )}
            </div>
            
            <div className="mt-8">
              {children}
            </div>
          </div>
        </div>

        {/* Right Column - Image (Desktop only) */}   
        <div className="hidden lg:flex lg:flex-1 relative">
          <Image
            src="https://sehzakutrlropprdcewu.supabase.co/storage/v1/object/sign/quiz-page/Dog-Quest-Quiz-Start-Your-Journey.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV80ZDM1YWQwOS05Mjk3LTRlZTktYjM2Yi1hZDUyMmE1YmRhNmEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJxdWl6LXBhZ2UvRG9nLVF1ZXN0LVF1aXotU3RhcnQtWW91ci1Kb3VybmV5LnBuZyIsImlhdCI6MTc0ODk2MzA1MywiZXhwIjoyMzc5NjgzMDUzfQ.6yX2nynHptekm0NccCBbymRZPxWEZZnJzHEMDtNbTyc"
            alt="Dog Quest Authentication"
            fill
            className="object-cover"
            loading="lazy"
            quality={85}
            sizes="50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/0 to-sky-50/0 flex items-start justify-center pt-[320px]">
            <div className="max-w-lg w-full p-8 text-center backdrop-blur-sm bg-black/30 rounded-lg shadow-md">
              <h3 className="text-4xl font-berkshire mb-2 text-white">Welcome to Dog Quest</h3>
              <p className="text-xl text-white">Your trusted companion in finding the perfect dog</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Section - Below Main Content */}
      <div className="bg-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-berkshire text-center mt-6 text-brand-dark-green mb-8">Why Trust Dog Quest?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Gold Star Badge Section */}
            <Link href="/trust#gold-star" className="bg-white border-2 border-amber-200 rounded-lg p-6 transition-all hover:shadow-md hover:border-amber-300 block">
              <div className="flex flex-col items-center mb-4 text-center">
                <div className="h-32 w-32 rounded-full bg-white flex items-center justify-center mb-4">
                  <img 
                    src="/badges/goldernstart.jpeg"
                    alt="Gold Star Badge"
                    className="h-26 w-26"
                  />
                </div>
                <h3 className="text-xl font-semibold text-amber-500">Gold Star Verification</h3>
              </div>
              <p className="text-gray-700 text-center">
                Listings with our Gold Star badge have been verified by licensed veterinarians, 
                confirming the dog's health status and ensuring you're making a safe choice.
              </p>
            </Link>
            
            {/* Green Tick Badge Section */}
            <Link href="/trust#green-tick" className="bg-white border-2 border-[#BFCFBB] rounded-lg p-6 transition-all hover:shadow-md hover:border-[#738A6E] block">
              <div className="flex flex-col items-center mb-4 text-center">
                <div className="h-32 w-32 rounded-full bg-white flex items-center justify-center mb-4">
                  <img 
                    src="/badges/greentick.jpeg"
                    alt="Green Tick Badge"
                    className="h-26 w-26"
                  />
                </div>
                <h3 className="text-xl font-semibold text-green-700">Green Tick Verification</h3>
              </div>
              <p className="text-gray-700 text-center">
                Our Green Tick badge indicates that vaccination records have been verified 
                by licensed veterinarians, giving you peace of mind about your new companion's health history.
              </p>
            </Link>
          </div>
          
          <p className="text-center text-gray-600 max-w-3xl mx-auto mb-6">
            At Dog Quest, we prioritize the health and well-being of every dog on our platform. Our verification 
            system works with licensed veterinary clinics nationwide to authenticate health checks and vaccination records, 
            ensuring transparency and trust in every transaction.
          </p>
          
          <div className="text-center">
            <Button asChild className="bg-brand-dark-green hover:bg-brand-soft-green text-white px-8 py-3">
              <Link href="/trust">Learn More</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
