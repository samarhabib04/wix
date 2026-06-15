'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Dog, Dna, Bookmark, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function CreateListingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const listingTypes = [
    {
      id: "sale",
      title: "Puppy / Litter Listing",
      subtitle: "Advertise puppies for sale (single or full litter)",
      icon: <Dog className="h-12 w-12 text-brand-dark-green" />,
      route: "/add-sale-listing",
      color: "bg-gradient-to-br from-emerald-50 to-emerald-100",
      borderColor: "border-emerald-200",
      shadowColor: "shadow-emerald-200/50",
    },
    {
      id: "stud",
      title: "Stud Listing",
      subtitle: "List your dog as a stud for breeding",
      icon: <Dna className="h-12 w-12 text-blue-600" />,
      route: "/add-stud-listing",
      color: "bg-gradient-to-br from-blue-50 to-blue-100",
      borderColor: "border-blue-200",
      shadowColor: "shadow-blue-200/50",
    },
    {
      id: "showcase",
      title: "Showcase Listing",
      subtitle: "Show a sneak peak of your newborn puppy/litter - this is not a sale listing",
      icon: <Bookmark className="h-12 w-12 text-pink-500" />,
      route: "/add-showcase-listing",
      color: "bg-gradient-to-br from-pink-50 to-pink-100",
      borderColor: "border-pink-200",
      shadowColor: "shadow-pink-200/50",
    },
  ];

  const handleNavigate = (route: string) => {
    router.push(route);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 text-gray-600 -ml-2"
          asChild
        >
          <Link href="/my-seller-dashboard">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        
        <h1 className="text-4xl font-berkshire text-brand-dark-green mb-2">Select Listing Type</h1>
        <p className="text-gray-600">
          Choose the type of listing you want to create for your pets
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {listingTypes.map((type) => (
          <motion.div
            key={type.id}
            className={`relative rounded-xl border ${type.borderColor} ${type.color} p-6 flex flex-col items-center text-center
              ${hoveredCard === type.id ? `shadow-lg ${type.shadowColor}` : "shadow-md"}`}
            whileHover={{ y: -5 }}
            onMouseEnter={() => setHoveredCard(type.id)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="mb-4">{type.icon}</div>
            <h2 className="text-xl font-semibold mb-2">{type.title}</h2>
            <p className="text-gray-600 mb-6">{type.subtitle}</p>
            <div className="mt-auto">
              <Button 
                onClick={() => handleNavigate(type.route)}
                className="bg-brand-dark-green hover:bg-brand-dark-green/90"
              >
                Continue
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-8">
        <Button 
          variant="outline"
          onClick={() => router.push("/my-seller-dashboard/listings")}
          className="text-gray-600"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}




























