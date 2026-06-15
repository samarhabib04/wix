'use client';

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Heart, Shield, Users } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import VetPartnerCarousel to avoid SSR issues
const VetPartnerCarousel = dynamic(() => import("@/components/vet/VetPartnerCarousel"), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded-lg" />
});

const TrustedByVetsSection = () => {
  const trustIndicators = [
    {
      icon: Shield,
      title: "Health Verification",
      description: "Partnered vets provide health verification for listings"
    },
    {
      icon: CheckCircle,
      title: "Professional Standards",
      description: "Maintaining high standards in puppy welfare"
    },
    {
      icon: Heart,
      title: "Animal Welfare",
      description: "Committed to ethical breeding practices"
    },
    {
      icon: Users,
      title: "Expert Network",
      description: "Growing network of trusted veterinary professionals"
    }
  ];

  return (
    <section className="py-16 bg-gradient-to-b from-white to-green-50/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4 text-brand-dark-green border-brand-soft-green">
            VETERINARY PARTNERSHIPS
          </Badge>
          <h2 className="text-3xl md:text-5xl font-berkshire text-brand-dark-green mb-6">
            Trusted by Vets
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            We're proud to partner with veterinary professionals across Ireland who share our commitment 
            to puppy welfare and ethical breeding standards.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-12">
          {/* Image Section */}
             <div className="order-2 lg:order-1">
            <div className="relative max-w-3xl mx-auto">
              <img 
                src="/assets/city-vets-dogquest.jpg" 
                alt="City Vets team wearing Dog Quest fleeces" 
                className="rounded-lg shadow-xl w-full"
              />
              <div className="absolute -bottom-4 -left-4 bg-white p-4 rounded-lg shadow-lg">
                <div className="text-center">
                  <p className="text-xl font-bold text-brand-dark-green">City Vet</p>
                  <p className="text-sm text-muted-foreground">Limerick</p>
                </div>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="order-1 lg:order-2 space-y-6">
            <div>
              <h3 className="text-2xl font-semibold text-brand-dark-green mb-4">
                Professional Partnership Program
              </h3>
              <p className="text-muted-foreground mb-6">
                Our veterinary partners play a crucial role in maintaining the highest standards 
                of animal welfare on Dog Quest. They provide health verification services and 
                support ethical breeding practices across Ireland.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {trustIndicators.map((indicator, index) => (
                <Card key={index} className="border-0 shadow-sm bg-white/60">
                  <CardContent className="p-4 flex items-start space-x-3">
                    <div className="bg-brand-soft-green/10 p-2 rounded-full flex-shrink-0">
                      <indicator.icon className="h-4 w-4 text-brand-dark-green" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-brand-dark-green mb-1">
                        {indicator.title}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {indicator.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="bg-brand-light-green/20 p-6 rounded-lg">
              <h4 className="font-semibold text-brand-dark-green mb-2">
                Interested in Partnering?
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                If you're a veterinary professional interested in joining our network, 
                we'd love to hear from you.
              </p>
              <a 
                href="/affiliated-vet" 
                className="inline-flex items-center text-sm font-medium text-brand-dark-green hover:text-brand-soft-green transition-colors"
              >
                Learn more about becoming a partner
                <CheckCircle className="ml-2 h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom stats or additional info */}
        <div className="text-center pt-8 border-t border-green-100">
          <p className="text-muted-foreground text-sm">
            Supporting responsible breeding and puppy welfare across Ireland
          </p>
        </div>

        {/* Vet Partner Carousel - Under "Why You Can Trust DogQuest" widget */}
        <div className="mt-12">
          <VetPartnerCarousel
            title="Nearest DogQuest Vet Partner to Me"
            maxItems={10}
            showSeeAll={true}
            paidFirst={false}
          />
        </div>
      </div>
    </section>
  );
};

export default TrustedByVetsSection;
