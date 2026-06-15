'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowRight,
  Calendar, 
  Check, 
  FileCheck, 
  Home,
  Lock, 
  MapPin, 
  MessageSquare, 
  Shield, 
  Stethoscope, 
  Users 
} from 'lucide-react';
import VetPartnerCarousel from '@/components/vet/VetPartnerCarousel';

// Gold Star and Green Tick Icons as Image components
const GoldStarIcon = () => (
  <div className="flex items-center justify-center mb-4">
    <div className="bg-white rounded-full p-4 flex items-center justify-center">
    <img 
        src="/badges/goldernstart.jpeg" 
      alt="Gold Star Verification" 
        className="w-32 h-32 object-contain"
    />
    </div>
  </div>
);

const GreenTickIcon = () => (
  <div className="flex items-center justify-center mb-4">
    <div className="bg-white rounded-full p-4 flex items-center justify-center">
    <img 
        src="/badges/greentick.jpeg" 
      alt="Green Tick Verification" 
        className="w-32 h-32 object-contain"
    />
    </div>
  </div>
);

const Trust: React.FC = () => {
  const router = useRouter();
  
  return (
    <>

      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="max-w-4xl mx-auto mb-16 text-center">
          <div className="bg-[#E1E8E0] p-8 rounded-lg shadow-md">
            <h1 className="text-4xl md:text-5xl font-berkshire text-brand-dark-green mb-4">
              Why Trust Dog Quest?
            </h1>
            <p className="text-xl text-gray-700 mb-6">
              Where puppy love meets peace of mind.
            </p>
            <div className="w-24 h-1 bg-brand-soft-green mx-auto"></div>
          </div>
        </section>

        {/* Trust Through Verification Section */}
        <section className="max-w-5xl mx-auto mb-16">
          <h2 className="text-3xl font-berkshire text-brand-dark-green text-center mb-8">
            Trust Through Verification
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Gold Star Card */}
            <Card className="overflow-hidden bg-white hover:shadow-lg transition-shadow">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <GoldStarIcon />
                <h3 className="text-xl font-bold text-brand-dark-green mb-4">
                  Gold Star: Vet-Verified Health Check
                </h3>
                <p className="text-gray-700 mb-4">
                  Listings with a gold star mean the dog or puppy has been health checked by a licensed Irish vet. 
                  The breeder or seller has uploaded valid documentation reviewed by our team.
                </p>
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                  Health Check Verified
                </Badge>
              </CardContent>
            </Card>

            {/* Green Tick Card */}
            <Card className="overflow-hidden bg-white hover:shadow-lg transition-shadow">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <GreenTickIcon />
                <h3 className="text-xl font-bold text-brand-dark-green mb-4">
                  Green Tick: Vaccination Confirmed
                </h3>
                <p className="text-gray-700 mb-4">
                  This icon means the seller has uploaded proof of vaccination performed by a licensed vet. 
                  For puppies, we ensure their V1 is submitted before or at week 6 and V2 before or by week 12. 
                  If not, the badge is removed automatically.
                </p>
                <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                  Vaccination Verified
                </Badge>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Vet Partnership Section */}
        <section className="max-w-4xl mx-auto py-10 px-6 mb-16 bg-[#E1E8E0] rounded-lg">
          <div className="flex flex-col items-center text-center mb-8">
            <Stethoscope size={36} className="text-brand-dark-green mb-4" />
            <h2 className="text-3xl font-berkshire text-brand-dark-green mb-4">
              Powered by Vets Across Ireland
            </h2>
          </div>
          
          <p className="text-gray-700 text-center text-lg mb-8 max-w-2xl mx-auto">
            Dog Quest works in partnership with certified veterinarians all over Ireland.
            We're proud to be the first Irish dog marketplace with double-factor health verification 
            - so you can browse with total confidence.
          </p>
          
          <div className="flex justify-center mb-8">
            <div className="flex items-center bg-white px-6 py-3 rounded-full shadow-sm">
              <MapPin className="h-5 w-5 text-brand-soft-green mr-2" />
              <span className="text-brand-dark-green font-medium">
                Over 40 trusted vet clinics nationwide (and growing!)
              </span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 max-w-md mx-auto">
            <div className="grid grid-cols-2 gap-4">
              {/* Column 1: Gold Star */}
              <div className="flex flex-col items-center">
                <GoldStarIcon />
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 mt-2">
                  Health Checked
                </Badge>
              </div>
              
              {/* Column 2: Green Tick */}
              <div className="flex flex-col items-center">
                <GreenTickIcon />
                <Badge className="bg-green-100 text-green-800 hover:bg-green-200 mt-2">
                  Vaccinated
                </Badge>
              </div>
            </div>
          </div>
        </section>

        {/* What Makes Dog Quest Different */}
        <section className="max-w-4xl mx-auto mb-16">
          <h2 className="text-3xl font-berkshire text-brand-dark-green text-center mb-8">
            What Makes Dog Quest Different?
          </h2>
          
          <div className="grid sm:grid-cols-2 gap-6 mb-10">
            <div className="flex items-start">
              <div className="mr-4 p-2 bg-[#E1E8E0] rounded-full">
                <Check className="h-5 w-5 text-brand-dark-green" />
              </div>
              <div>
                <h3 className="font-bold text-brand-dark-green mb-1">Every listing is reviewed before publishing</h3>
                <p className="text-gray-700">We manually check all listings to ensure quality and compliance.</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="mr-4 p-2 bg-[#E1E8E0] rounded-full">
                <FileCheck className="h-5 w-5 text-brand-dark-green" />
              </div>
              <div>
                <h3 className="font-bold text-brand-dark-green mb-1">Seller-provided documents are securely stored</h3>
                <p className="text-gray-700">Health records and breeder documentation are encrypted and protected.</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="mr-4 p-2 bg-[#E1E8E0] rounded-full">
                <Calendar className="h-5 w-5 text-brand-dark-green" />
              </div>
              <div>
                <h3 className="font-bold text-brand-dark-green mb-1">Reminders sent before badge expiry</h3>
                <p className="text-gray-700">Sellers receive automatic prompts when it's time to update health records.</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="mr-4 p-2 bg-[#E1E8E0] rounded-full">
                <Lock className="h-5 w-5 text-brand-dark-green" />
              </div>
              <div>
                <h3 className="font-bold text-brand-dark-green mb-1">Built on modern, secure infrastructure</h3>
                <p className="text-gray-700">Powered by Supabase and Stripe for enterprise-grade security.</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="mr-4 p-2 bg-[#E1E8E0] rounded-full">
                <MessageSquare className="h-5 w-5 text-brand-dark-green" />
              </div>
              <div>
                <h3 className="font-bold text-brand-dark-green mb-1">Transparent chat system</h3>
                <p className="text-gray-700">Direct communication between buyers and sellers with no hidden fees.</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="mr-4 p-2 bg-[#E1E8E0] rounded-full">
                <Users className="h-5 w-5 text-brand-dark-green" />
              </div>
              <div>
                <h3 className="font-bold text-brand-dark-green mb-1">Verified breeders</h3>
                <p className="text-gray-700">Breeders with gold stars and green ticks in their ads have attended vets for health checks and vaccinations.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="max-w-3xl mx-auto text-center py-10 px-6 mb-16 bg-[#E1E8E0] rounded-lg">
          <div className="mb-8">
            <Shield className="h-12 w-12 text-brand-soft-green mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-berkshire text-brand-dark-green mb-4">
              Want your next puppy to come from a verified breeder?
            </h2>
            <p className="text-lg text-gray-700 mb-8">
              Look for the Gold Star and Green Tick on listings.
            </p>
          </div>
          
          <Button asChild className="bg-brand-dark-green hover:bg-brand-soft-green text-white px-8 py-3 text-lg">
            <Link id="trust-browse-verified-btn" data-restore-target href="/listings?verified=true">Browse Verified Listings</Link>
          </Button>
        </section>
      </div>

      {/* Vet Partner Carousel */}
      <section className="max-w-7xl mx-auto mb-16 px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-berkshire text-brand-dark-green mb-4">
            Nearest DogQuest Vet Partner to Me
          </h2>
        </div>
        <VetPartnerCarousel
          title=""
          maxItems={10}
          showSeeAll={true}
          paidFirst={true}
        />
      </section>

       <section className="w-full bg-[#E1E8E0] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h2 className="text-2xl sm:text-3xl font-berkshire text-brand-dark-green mb-3">
                Continue Your Journey
              </h2>
              <p className="text-gray-700 mb-6 max-w-xl">
                Discover more ways to find your perfect dog companion or learn about our services.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild className="bg-brand-dark-green hover:bg-brand-soft-green px-6">
                <Link href="/" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Return Home
                </Link>
              </Button>
              <Button 
                id="trust-quiz-btn"
                data-restore-target
                onClick={() => router.push('/quiz')} 
                className="bg-brand-soft-green hover:bg-brand-dark-green px-6 flex items-center gap-2"
              >
                Take the Quiz
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Trust;
