'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Mail, Phone, Stethoscope, MapPin, Users, TrendingUp, Shield, FileCheck, Heart } from 'lucide-react';
import { CONTACT_EMAIL, CONTACT_MAILTO_HREF } from '@/lib/config/contact';

const AffiliatedVet = () => {
  return (
    <>

      <div className="min-h-screen bg-gradient-to-b from-[#E1E8E0] to-white">
        {/* Hero Section */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-brand-dark-green rounded-full p-4">
                <Stethoscope className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-berkshire text-brand-dark-green mb-6">
              🩺 Become a DogQuest Affiliated Vet
            </h1>
            <p className="text-xl text-gray-700 mb-8 max-w-3xl mx-auto leading-relaxed">
              Help us build a better, safer future for puppies in Ireland.
            </p>
            <p className="text-lg text-gray-600 mb-12 max-w-3xl mx-auto">
              At DogQuest, we're changing the way puppies are bought and sold - with vets at the heart of it all.
            </p>
            <div className="bg-white rounded-lg p-6 shadow-lg max-w-2xl mx-auto">
              <p className="text-lg font-medium text-brand-dark-green">
                By becoming a DogQuest Affiliated Vet, you're not just validating health - you're validating trust.
              </p>
            </div>
          </div>
        </section>

        {/* Why Join Section */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-berkshire text-brand-dark-green text-center mb-12">
              ✅ Why Join?
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Free to Join */}
              <Card className="border-brand-soft-green">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-brand-soft-green rounded-full p-2">
                      <Check className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle className="text-brand-dark-green">Free to Join</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">No fees, no subscriptions. Just impact.</p>
                </CardContent>
              </Card>

              {/* Get Listed */}
              <Card className="border-brand-soft-green">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-brand-soft-green rounded-full p-2">
                      <MapPin className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle className="text-brand-dark-green">Get Listed on DogQuest.ie</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">We'll feature your practice on our platform and geolocate it, so local buyers and sellers see you as a trusted, ethical clinic.</p>
                </CardContent>
              </Card>

              {/* Boost Footfall */}
              <Card className="border-brand-soft-green">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-brand-soft-green rounded-full p-2">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle className="text-brand-dark-green">Boost Your Footfall</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Our platform will drive more responsible breeders and puppy buyers to your door - increasing check-ups, vaccinations, and community visibility.</p>
                </CardContent>
              </Card>

              {/* Raise Standards */}
              <Card className="border-brand-soft-green">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-brand-soft-green rounded-full p-2">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle className="text-brand-dark-green">Help Raise National Standards</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Join the large number of vet practices around Ireland already helping set a new benchmark for ethical puppy sales in Ireland.</p>
                </CardContent>
              </Card>

              {/* Keep It Simple */}
              <Card className="border-brand-soft-green">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-brand-soft-green rounded-full p-2">
                      <FileCheck className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle className="text-brand-dark-green">Keep It Simple</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">No extra admin - just apply a small sticker during routine health checks or vaccinations. That's it.</p>
                </CardContent>
              </Card>

              {/* Lead the Change */}
              <Card className="border-brand-soft-green">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-brand-soft-green rounded-full p-2">
                      <Heart className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle className="text-brand-dark-green">Lead the Change</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Be part of a movement putting animal welfare, vet oversight, and transparency at the centre of Ireland's puppy sales.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-16 px-4 bg-[#E1E8E0]">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-berkshire text-brand-dark-green mb-8">
              📬 Ready to Join?
            </h2>
            <p className="text-xl text-gray-700 mb-12">
              We'd love to hear from you.
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Email */}
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    <div className="bg-brand-dark-green rounded-full p-3">
                      <Mail className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-brand-dark-green text-center">Email Us</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button 
                    asChild
                    className="w-full bg-brand-soft-green hover:bg-brand-dark-green"
                  >
                    <a href={CONTACT_MAILTO_HREF}>
                      📧 {CONTACT_EMAIL}
                    </a>
                  </Button>
                </CardContent>
              </Card>

              {/* Brian */}
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden">
                      <img src="/lovable-uploads/17a8fe9e-622b-4d5c-b4e5-8c8953afba3a.png" alt="Brian" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <CardTitle className="text-brand-dark-green text-center">Contact Brian</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button 
                    asChild
                    className="w-full bg-brand-soft-green hover:bg-brand-dark-green"
                  >
                    <a href={CONTACT_MAILTO_HREF}>
                      📧 Email Brian
                    </a>
                  </Button>
                </CardContent>
              </Card>

              {/* Kevin */}
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden">
                      <img src="/lovable-uploads/c904e5fb-6ec9-4cba-a591-b215bfcd6616.png" alt="Kevin" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <CardTitle className="text-brand-dark-green text-center">Contact Kevin</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button 
                    asChild
                    className="w-full bg-brand-soft-green hover:bg-brand-dark-green"
                  >
                    <a href={CONTACT_MAILTO_HREF}>
                      📧 Email Kevin
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default AffiliatedVet;
