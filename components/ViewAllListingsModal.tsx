
'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Dog, Dna, Bookmark, ArrowRight } from 'lucide-react';

interface ViewAllListingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ViewAllListingsModal: React.FC<ViewAllListingsModalProps> = ({
  open,
  onOpenChange,
}) => {
  const router = useRouter();

  const listingTypes = [
    {
      id: "sale",
      title: "Sale Listings",
      subtitle: "Browse puppies and litters for sale",
      icon: <Dog className="h-12 w-12 text-brand-dark-green" />,
      route: "/listings?adType=sale",
      color: "bg-gradient-to-br from-emerald-50 to-emerald-100",
      borderColor: "border-emerald-200",
      shadowColor: "shadow-emerald-200/50",
    },
    {
      id: "stud",
      title: "Stud Listings",
      subtitle: "Find stud dogs for breeding",
      icon: <Dna className="h-12 w-12 text-blue-600" />,
      route: "/listings?adType=stud",
      color: "bg-gradient-to-br from-blue-50 to-blue-100",
      borderColor: "border-blue-200",
      shadowColor: "shadow-blue-200/50",
    },
    {
      id: "showcase",
      title: "Showcase Puppies",
      subtitle: "Preview upcoming puppies and litters",
      icon: <Bookmark className="h-12 w-12 text-pink-500" />,
      route: "/listings?adType=showcase",
      color: "bg-gradient-to-br from-pink-50 to-pink-100",
      borderColor: "border-pink-200",
      shadowColor: "shadow-pink-200/50",
    },
  ];

  const handleNavigate = (route: string) => {
    router.push(route);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-berkshire text-brand-dark-green text-center mb-4">
            Explore All
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4">
          {listingTypes.map((type) => (
            <div
              key={type.id}
              className={`relative rounded-xl border ${type.borderColor} ${type.color} p-6 flex flex-col items-center text-center hover:shadow-lg ${type.shadowColor} transition-all duration-200 hover:-translate-y-1 cursor-pointer`}
              onClick={() => handleNavigate(type.route)}
            >
              <div className="mb-4">{type.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{type.title}</h3>
              <p className="text-gray-600 mb-6 flex-1">{type.subtitle}</p>
              <Button 
                className="bg-brand-dark-green hover:bg-brand-dark-green/90 w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNavigate(type.route);
                }}
              >
                Browse Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewAllListingsModal;
