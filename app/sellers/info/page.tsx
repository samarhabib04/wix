'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Building, ShieldCheck } from 'lucide-react';
import NavigationSection from '@/components/NavigationSection';

export default function SellerInfoPage() {
  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Header Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-berkshire text-brand-dark-green mb-4">
              Seller Information
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Understanding the different types of sellers on Dog Quest and what buyers can expect from each category.
            </p>
          </div>

          {/* Seller Type Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Private Individuals */}
            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 mx-auto flex items-center justify-center mb-4">
                  <User className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl font-berkshire text-brand-dark-green">
                  Private Individuals
                </CardTitle>
                <Badge variant="secondary" className="w-fit mx-auto">
                  Occasional Sellers
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="font-semibold text-brand-dark-green">What buyers can expect:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Personal family breeding or one-off litters</li>
                  <li>• Direct communication with dog owners</li>
                  <li>• Home environment for puppies</li>
                  <li>• Personal care and attention to each puppy</li>
                  <li>• May have limited breeding experience</li>
                </ul>
                
                <h3 className="font-semibold text-brand-dark-green pt-4">Seller obligations:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Ensure puppies are at least 8 weeks old before sale</li>
                  <li>• Provide accurate health and vaccination records</li>
                  <li>• Ensure microchipping where required</li>
                  <li>• Honest representation of puppy's health and temperament</li>
                  <li>• Comply with local animal welfare regulations</li>
                </ul>
              </CardContent>
            </Card>

            {/* Registered Sellers */}
            <Card className="border-2 hover:shadow-lg transition-shadow border-emerald-200">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 mx-auto flex items-center justify-center mb-4">
                  <Building className="h-8 w-8 text-emerald-600" />
                </div>
                <CardTitle className="text-xl font-berkshire text-brand-dark-green">
                  Registered Sellers
                </CardTitle>
                <Badge variant="default" className="w-fit mx-auto bg-emerald-600">
                  Licensed Breeders
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="font-semibold text-brand-dark-green">What buyers can expect:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Professional breeding experience</li>
                  <li>• Comprehensive health testing</li>
                  <li>• Detailed breeding records and pedigrees</li>
                  <li>• Ongoing breeder support</li>
                  <li>• Higher standards of care and facilities</li>
                </ul>
                
                <h3 className="font-semibold text-brand-dark-green pt-4">Licensing requirements:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Local authority breeding license</li>
                  <li>• Regular facility inspections</li>
                  <li>• Insurance and business registration</li>
                  <li>• Professional veterinary relationships</li>
                  <li>• Compliance with breeding standards</li>
                </ul>
              </CardContent>
            </Card>

            {/* DBEs */}
            <Card className="border-2 hover:shadow-lg transition-shadow border-amber-200">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 rounded-full bg-amber-100 mx-auto flex items-center justify-center mb-4">
                  <ShieldCheck className="h-8 w-8 text-amber-600" />
                </div>
                <CardTitle className="text-xl font-berkshire text-brand-dark-green">
                  DBEs (Dog Breeding Establishments)
                </CardTitle>
                <Badge variant="default" className="w-fit mx-auto bg-amber-600">
                  Commercial Operations
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="font-semibold text-brand-dark-green">What buyers can expect:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Large-scale professional breeding operations</li>
                  <li>• Multiple breeds and regular litters</li>
                  <li>• Comprehensive health guarantees</li>
                  <li>• Professional facilities and staff</li>
                  <li>• Extensive documentation and records</li>
                </ul>
                
                <h3 className="font-semibold text-brand-dark-green pt-4">Special compliance notes:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Must hold Dog Breeding Establishment license</li>
                  <li>• Strict welfare and facility standards</li>
                  <li>• Regular government inspections</li>
                  <li>• Advanced record-keeping requirements</li>
                  <li>• Professional veterinary supervision</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Additional Information Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-2xl font-berkshire text-brand-dark-green text-center">
                Important Information for All Sellers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-brand-dark-green mb-3">General Requirements</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• All puppies must be microchipped before sale (unless exempt)</li>
                    <li>• Accurate vaccination records must be provided</li>
                    <li>• Puppies must be at least 8 weeks old before leaving mother</li>
                    <li>• Health checks by qualified veterinarian</li>
                    <li>• Truthful advertising and honest representation</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-brand-dark-green mb-3">Best Practices</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Allow buyers to meet the mother dog</li>
                    <li>• Provide socialization opportunities for puppies</li>
                    <li>• Offer lifetime support and advice</li>
                    <li>• Maintain clean, safe breeding environments</li>
                    <li>• Screen potential buyers carefully</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legal Disclaimer */}
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="p-6">
              <h3 className="font-semibold text-brand-dark-green mb-3">Legal Disclaimer</h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>Important:</strong> This information is provided for guidance only and does not constitute legal advice. 
                  Sellers are responsible for ensuring they comply with all applicable local, national, and EU laws regarding dog breeding and sales.
                </p>
                <p>
                  Dog Quest is a platform that connects buyers and sellers but does not verify licenses or oversee breeding practices. 
                  Buyers should conduct their own due diligence when purchasing a puppy.
                </p>
                <p>
                  <strong>Regulatory Compliance:</strong> Sellers must ensure compliance with:
                </p>
                <ul className="ml-4 space-y-1">
                  <li>• Animal Health and Welfare Act 2013 (Ireland)</li>
                  <li>• Dog Breeding Establishments Act 2010 (Ireland)</li>
                  <li>• EU Pet Passport regulations</li>
                  <li>• Local authority licensing requirements</li>
                  <li>• Consumer protection legislation</li>
                </ul>
                <p className="pt-2">
                  <strong>For specific legal guidance, please consult with a qualified legal professional or contact your local authority.</strong>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <NavigationSection variant="default" />
      </div>
    </>
  );
}

