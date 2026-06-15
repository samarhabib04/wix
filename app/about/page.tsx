
'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { PawPrint, Stethoscope, Mail, Home, ArrowRight } from 'lucide-react';
import { BrandVideo } from '@/components/BrandVideo';

const AboutUs: React.FC = () => {
  const router = useRouter();
  
  return (
    <>

      <div className="container mx-auto px-4 py-8 space-y-12 max-w-7xl">
        {/* Hero Header Section */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-berkshire text-brand-dark-green">
            Our Story
          </h1>
          <p className="text-lg md:text-xl text-brand-soft-green max-w-3xl mx-auto">
            Connecting Irish dog lovers with trusted breeders, sellers, and vets - one paw at a time.
          </p>

          <BrandVideo youtubeUrl="https://www.youtube.com/watch?v=KNpZO0DTnK0" />
        </header>

        {/* Founders Section */}
        <section className="py-8">
          <h2 className="text-3xl font-berkshire text-brand-dark-green text-center mb-8">
            Meet Our Founders
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Founder 1 */}
            <Card className="bg-white hover:shadow-md transition-shadow duration-300">
              <CardContent className="flex flex-col items-center pt-6 space-y-4">
                <Avatar className="w-32 h-32 border-4 border-brand-light-green">
                  <AvatarImage src="/lovable-uploads/2c11673b-914f-40d1-b036-d2b7ad2b4c4a.png" alt="Brian Ivess" draggable={false} className="media-scroll-fix object-cover" />
                  <AvatarFallback className="bg-brand-soft-green text-white text-xl">BI</AvatarFallback>
                </Avatar>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-brand-dark-green">Brian</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Brian grew up as an only child, but he was never truly alone - his dogs were always by his side. Those bonds gave him comfort, loyalty, and a sense of belonging, shaping the person he is today. With dogs as his greatest companions, he found the inspiration to create Dog Quest: a platform built to help others discover not just a pet, but a loyal best friend for life.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Founder 2 */}
            <Card className="bg-white hover:shadow-md transition-shadow duration-300">
              <CardContent className="flex flex-col items-center pt-6 space-y-4">
                <Avatar className="w-32 h-32 border-4 border-brand-light-green">
                  <AvatarImage src="/lovable-uploads/cd760f49-1bb2-4b03-b4b4-ce6aa3bd90e4.png" alt="Kevin Moore" draggable={false} className="media-scroll-fix object-cover object-top" />
                  <AvatarFallback className="bg-brand-soft-green text-white text-xl">KM</AvatarFallback>
                </Avatar>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-brand-dark-green">Kevin</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Kev has an entrepreneurial spirit and a lifelong love of dogs. Growing up surrounded by them, he's now combining that passion with technology to transform the dog world. With a strong focus on animal welfare, Kev is driven to make Dog Quest a place where dogs and people connect in healthier, safer ways.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Our Mission */}
        <section className="py-8 max-w-3xl mx-auto">
          <div className="flex justify-center">
            <PawPrint className="h-10 w-10 text-brand-soft-green" />
          </div>
          
          <div className="text-center mt-4 mb-4">
            <h2 className="text-3xl font-berkshire text-brand-dark-green mb-4">
              Our Mission
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              Dog Quest was born out of the belief that finding your next furry companion should be safe, transparent, and joyful.
              Whether you're searching for a loyal friend, a certified stud, or puppy essentials - we're here to guide you every step of the way.
            </p>
          </div>
          
          <div className="flex justify-center mt-4">
            <PawPrint className="h-10 w-10 text-brand-soft-green" />
          </div>
        </section>

        {/* Vet Partnerships / Trust & Safety Section */}
        <section className="py-8 bg-brand-light-green/20 rounded-lg p-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Stethoscope className="h-8 w-8 text-brand-dark-green" />
            <h2 className="text-3xl font-berkshire text-brand-dark-green">
              Powered by Trusted Vets Across Ireland
            </h2>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <p className="text-lg text-gray-700 leading-relaxed mb-6 text-center">
              We work closely with licensed veterinarians across Ireland to ensure every dog is properly health-checked, vaccinated, and verified.
              Through this partnership, we've introduced a double-factor authentication system: listings marked with a Gold Star (health check) and Green Tick (vaccination verified) are backed by real veterinary documents reviewed by our team.
            </p>
            
            <div className="flex flex-wrap justify-center gap-8 mt-6">
              {/* Gold Star - Stacked vertically */}
              <div className="flex flex-col items-center gap-2">
                <img 
                  src="/badges/goldernstart.jpeg"
                  alt="Gold Star"
                  draggable={false}
                  className="h-20 w-20 mb-1 media-scroll-fix"
                />
                <Badge variant="outline" className="bg-white border-brand-soft-green text-brand-dark-green">
                  Health Checked
                </Badge>
              </div>
              
              {/* Green Tick - Stacked vertically */}
              <div className="flex flex-col items-center gap-2">
                <img 
                  src="/badges/greentick.jpeg"
                  alt="Green Tick"
                  draggable={false}
                  className="h-20 w-20 mb-1 media-scroll-fix"
                />
                <Badge variant="outline" className="bg-white border-brand-soft-green text-brand-dark-green">
                  Vaccinated
                </Badge>
              </div>
            </div>
          </div>
        </section>

        {/* Dog Quest in the Community */}
        <section className="py-8">
          <h2 className="text-3xl font-berkshire text-brand-dark-green text-center mb-6">
            Dog Quest in the Community
          </h2>
          
          <div className="max-w-3xl mx-auto">
            <div className="bg-gray-100 rounded-lg overflow-hidden">
              <img 
                src="/assets/city-vets-dogquest.jpg" 
                alt="City Vets team wearing Dog Quest fleeces"
                draggable={false}
                className="w-full rounded-lg media-scroll-fix"
              />
              <div className="p-4 text-center text-gray-700 italic">
                "Partnering with veterinary professionals across Ireland to ensure the highest standards."
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-8 text-center max-w-3xl mx-auto">
          <Separator className="mb-10" />
          <h2 className="text-2xl font-bold text-brand-dark-green mb-4">
            Want to get involved or partner with Dog Quest?
          </h2>
          <p className="text-lg mb-6">
            Reach out - we'd love to hear from you.
          </p>
          <Link href="/contact">
  <Button className="bg-brand-dark-green hover:bg-brand-soft-green text-white" size="lg">
    <Mail className="mr-2 h-5 w-5" />
    Contact Us
  </Button>
</Link>
        </section>
      </div>
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

export default AboutUs;
