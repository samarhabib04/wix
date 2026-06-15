'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, PawPrint, Heart } from 'lucide-react';

export default function ViewListingsSection() {
  const router = useRouter();

  const listingTypes = [
    {
      id: 'sale',
      title: 'Sale Listings',
      description: 'View all puppy sale listings',
      description2: 'View all sale listings on the frontend',
      icon: <DollarSign className="h-12 w-12 text-green-600" />,
      route: '/listings?adType=sale',
      buttonText: 'View Listings',
    },
    {
      id: 'stud',
      title: 'Stud Listings',
      description: 'View all stud listings',
      description2: 'View all stud listings on the frontend',
      icon: <PawPrint className="h-12 w-12 text-blue-600" />,
      route: '/stud',
      buttonText: 'View Stud Listings',
    },
    {
      id: 'showcase',
      title: 'Showcase Listings',
      description: 'View all showcase listings',
      description2: 'View all showcase listings on the frontend',
      icon: <Heart className="h-12 w-12 text-red-600" />,
      route: '/showcase',
      buttonText: 'View Showcase',
    },
  ];

  const handleNavigate = (route: string) => {
    router.push(route);
  };

  return (
    <div className="mb-8">
      <h2 className="text-3xl font-bold text-brand-dark-green mb-6">View Listings</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {listingTypes.map((type) => (
          <Card key={type.id} className="hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0">{type.icon}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{type.title}</h3>
                  <p className="text-sm text-gray-600 mb-1">{type.description}</p>
                  <p className="text-sm text-gray-600">{type.description2}</p>
                </div>
              </div>
              <Button
                onClick={() => handleNavigate(type.route)}
                className="w-full bg-brand-dark-green hover:bg-brand-soft-green text-white"
              >
                {type.buttonText}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
