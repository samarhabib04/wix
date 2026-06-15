'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUp, Baby, Badge, Flag, Globe, PawPrint, Home, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { IconTooltip } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';

// Using the same puppy illustration image as the React version
const puppyHeroImage = 'https://sehzakutrlropprdcewu.supabase.co/storage/v1/object/sign/showcase_listings/image.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV80ZDM1YWQwOS05Mjk3LTRlZTktYjM2Yi1hZDUyMmE1YmRhNmEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaG93Y2FzZV9saXN0aW5ncy9pbWFnZS5wbmciLCJpYXQiOjE3Njc4OTAwNDksImV4cCI6MTc5OTQyNjA0OX0.nKe1w8JRRWBq3sHJBEM1WNa7EhP5J63sxCUZhPITykI';

// Mock data for the ContinueSearchSection component
const GOLD_STAR_URL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Five-pointed_star.svg/1088px-Five-pointed_star.svg.png';

const mockSimilarShowcaseListings = [
  {
    id: '1',
    title: 'Bella the Labrador',
    location: 'Dublin, Ireland',
    image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=2664&auto=format&fit=crop',
    breed: 'Labrador Retriever',
    verified: true,
    type: 'showcase' as const
  },
  {
    id: '2',
    title: 'Max the Shepherd',
    location: 'Cork, Ireland',
    image: 'https://images.unsplash.com/photo-1589941013453-ec89f98c6558?q=80&w=2670&auto=format&fit=crop',
    breed: 'German Shepherd',
    verified: false,
    type: 'showcase' as const
  },
  {
    id: '3',
    title: 'Cooper the Golden',
    location: 'Galway, Ireland',
    image: 'https://images.unsplash.com/photo-1611250282006-4484dd3fba6f?q=80&w=2670&auto=format&fit=crop',
    breed: 'Golden Retriever',
    verified: true,
    type: 'showcase' as const
  },
  {
    id: '4',
    title: 'Luna the Beagle',
    location: 'Limerick, Ireland',
    image: 'https://images.unsplash.com/photo-1615233500064-caa995e2f9dd?q=80&w=2574&auto=format&fit=crop',
    breed: 'Beagle',
    verified: false,
    type: 'showcase' as const
  }
];

const PuppyNameArchive = () => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [showScrollToTop, setShowScrollToTop] = React.useState(false);

  // Check scroll position to show/hide the scroll to top button
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollToTop(true);
      } else {
        setShowScrollToTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <>

      <div className="container mx-auto py-8 md:py-12 px-4 sm:px-6">
        {/* Page Title + Intro */}
        <div className="text-center mb-12">
          <h1 className="font-berkshire text-4xl md:text-5xl lg:text-6xl text-brand-dark-green mb-4">
            Puppy Name Archive
          </h1>
          <div className="mb-6">
            <img 
              src={puppyHeroImage} 
              alt="Adorable puppy illustration" 
              className="mx-auto rounded-lg shadow-lg max-w-xs md:max-w-sm w-full"
            />
          </div>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto">
            Need the perfect name? Browse Ireland's favourites and global trends - all in one place!
          </p>
        </div>

        {/* Section: Most Popular in Ireland */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <Flag className="w-6 h-6 text-brand-soft-green" />
            <h2 className="text-2xl font-medium text-brand-dark-green">Most Popular Puppy Names in Ireland</h2>
          </div>
          <p className="text-gray-600 mb-6">
            Based on 2025 research by Petmania & local pet name registries
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Girls Names */}
            <Card className="p-6 border-2 border-pink-100 bg-gradient-to-br from-white to-pink-50 rounded-xl shadow-md">
              <div className="flex items-center mb-4">
                <PawPrint className="w-5 h-5 text-pink-400 mr-2" />
                <h3 className="text-xl font-semibold text-gray-800">Girls</h3>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <NameBadge name="Bailey" color="bg-pink-200 hover:bg-pink-300 text-pink-900" />
                <NameBadge name="Luna" color="bg-purple-200 hover:bg-purple-300 text-purple-900" />
                <NameBadge name="Rosie" color="bg-red-200 hover:bg-red-300 text-red-900" />
                <NameBadge name="Ruby" color="bg-orange-200 hover:bg-orange-300 text-orange-900" />
                <NameBadge name="Bella" color="bg-yellow-200 hover:bg-yellow-300 text-yellow-900" />
              </div>
            </Card>

            {/* Boys Names */}
            <Card className="p-6 border-2 border-blue-100 bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-md">
              <div className="flex items-center mb-4">
                <PawPrint className="w-5 h-5 text-blue-400 mr-2" />
                <h3 className="text-xl font-semibold text-gray-800">Boys</h3>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <NameBadge name="Teddy" color="bg-blue-200 hover:bg-blue-300 text-blue-900" />
                <NameBadge name="Milo" color="bg-green-200 hover:bg-green-300 text-green-900" />
                <NameBadge name="Bruno" color="bg-amber-200 hover:bg-amber-300 text-amber-900" />
                <NameBadge name="Cooper" color="bg-teal-200 hover:bg-teal-300 text-teal-900" />
                <NameBadge name="Max" color="bg-cyan-200 hover:bg-cyan-300 text-cyan-900" />
              </div>
            </Card>
          </div>
        </section>

        <Separator className="my-8" />

        {/* Section: Most Popular Worldwide */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-6 h-6 text-brand-soft-green" />
            <h2 className="text-2xl font-medium text-brand-dark-green">Top Dog Names Around the World</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Top Girl Names */}
            <Card className="p-6 rounded-xl shadow-md bg-gradient-to-br from-white to-purple-50">
              <div className="flex items-center mb-4">
                <Badge className="w-5 h-5 text-purple-500 mr-2" />
                <h3 className="text-xl font-semibold text-gray-800">Top Girl Names</h3>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <NameBadge name="Luna" color="bg-purple-200 hover:bg-purple-300 text-purple-900" />
                <NameBadge name="Bella" color="bg-pink-200 hover:bg-pink-300 text-pink-900" />
                <NameBadge name="Daisy" color="bg-yellow-200 hover:bg-yellow-300 text-yellow-900" />
                <NameBadge name="Lucy" color="bg-orange-200 hover:bg-orange-300 text-orange-900" />
                <NameBadge name="Willow" color="bg-green-200 hover:bg-green-300 text-green-900" />
                <NameBadge name="Sadie" color="bg-red-200 hover:bg-red-300 text-red-900" />
                <NameBadge name="Zoey" color="bg-blue-200 hover:bg-blue-300 text-blue-900" />
                <NameBadge name="Lola" color="bg-indigo-200 hover:bg-indigo-300 text-indigo-900" />
              </div>
            </Card>

            {/* Top Boy Names */}
            <Card className="p-6 rounded-xl shadow-md bg-gradient-to-br from-white to-blue-50">
              <div className="flex items-center mb-4">
                <Badge className="w-5 h-5 text-blue-500 mr-2" />
                <h3 className="text-xl font-semibold text-gray-800">Top Boy Names</h3>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <NameBadge name="Milo" color="bg-blue-200 hover:bg-blue-300 text-blue-900" />
                <NameBadge name="Max" color="bg-cyan-200 hover:bg-cyan-300 text-cyan-900" />
                <NameBadge name="Charlie" color="bg-amber-200 hover:bg-amber-300 text-amber-900" />
                <NameBadge name="Teddy" color="bg-brown-200 hover:bg-brown-300 text-brown-900" 
                  tooltipText="Increasingly popular in the last 5 years!" />
                <NameBadge name="Bear" color="bg-gray-200 hover:bg-gray-300 text-gray-900" />
                <NameBadge name="Rocky" color="bg-stone-200 hover:bg-stone-300 text-stone-900" />
                <NameBadge name="Buddy" color="bg-teal-200 hover:bg-teal-300 text-teal-900" />
                <NameBadge name="Leo" color="bg-orange-200 hover:bg-orange-300 text-orange-900" />
              </div>
            </Card>
          </div>
        </section>

        <Separator className="my-8" />

        {/* Section: Irish-Inspired Names */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <PawPrint className="w-6 h-6 text-brand-soft-green" />
            <h2 className="text-2xl font-medium text-brand-dark-green">Names with Irish Flair</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Female Irish Names */}
            <Card className="p-6 rounded-xl shadow-md bg-gradient-to-br from-white to-green-50 border-2 border-green-100">
              <div className="flex items-center mb-4">
                <Badge className="w-5 h-5 text-green-600 mr-2" />
                <h3 className="text-xl font-semibold text-gray-800">Female Irish Names</h3>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <NameBadge name="Molly" color="bg-green-200 hover:bg-green-300 text-green-900" />
                <NameBadge name="Fiona" color="bg-emerald-200 hover:bg-emerald-300 text-emerald-900" />
                <NameBadge name="Saoirse" color="bg-lime-200 hover:bg-lime-300 text-lime-900" 
                  tooltipText="Pronounced 'SEER-sha', means 'freedom'" />
                <NameBadge name="Aisling" color="bg-teal-200 hover:bg-teal-300 text-teal-900"
                  tooltipText="Pronounced 'ASH-ling', means 'dream' or 'vision'" />
                <NameBadge name="Niamh" color="bg-green-200 hover:bg-green-300 text-green-900"
                  tooltipText="Pronounced 'NEEV', means 'bright'" />
                <NameBadge name="Caoimhe" color="bg-emerald-200 hover:bg-emerald-300 text-emerald-900"
                  tooltipText="Pronounced 'KEE-va', means 'beautiful'" />
              </div>
            </Card>

            {/* Male Irish Names */}
            <Card className="p-6 rounded-xl shadow-md bg-gradient-to-br from-white to-green-50 border-2 border-green-100">
              <div className="flex items-center mb-4">
                <Badge className="w-5 h-5 text-green-600 mr-2" />
                <h3 className="text-xl font-semibold text-gray-800">Male Irish Names</h3>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <NameBadge name="Finn" color="bg-green-200 hover:bg-green-300 text-green-900" />
                <NameBadge name="Seamus" color="bg-emerald-200 hover:bg-emerald-300 text-emerald-900"
                  tooltipText="Pronounced 'SHAY-mus'" />
                <NameBadge name="Conor" color="bg-lime-200 hover:bg-lime-300 text-lime-900" />
                <NameBadge name="Cian" color="bg-teal-200 hover:bg-teal-300 text-teal-900" 
                  tooltipText="Pronounced 'KEE-an', means 'ancient'" />
                <NameBadge name="Liam" color="bg-green-200 hover:bg-green-300 text-green-900" />
                <NameBadge name="Oisin" color="bg-emerald-200 hover:bg-emerald-300 text-emerald-900" 
                  tooltipText="Pronounced 'OSH-een', means 'little deer'" />
              </div>
            </Card>
          </div>
        </section>

        <Separator className="my-8" />

        {/* Section: Fun Trend Cards */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <Baby className="w-6 h-6 text-brand-soft-green" />
            <h2 className="text-2xl font-medium text-brand-dark-green">Name Trends We're Loving</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6">
            {/* Pop Culture Names */}
            <Card className="p-6 rounded-xl shadow-md bg-gradient-to-br from-white to-fuchsia-50 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">🎬 Pop Culture Names</h3>
              <div className="flex flex-wrap gap-3">
                <NameBadge name="Swiftie" color="bg-fuchsia-200 hover:bg-fuchsia-300 text-fuchsia-900" />
                <NameBadge name="Taylor" color="bg-pink-200 hover:bg-pink-300 text-pink-900" />
                <NameBadge name="Arya" color="bg-indigo-200 hover:bg-indigo-300 text-indigo-900" />
                <NameBadge name="Khaleesi" color="bg-purple-200 hover:bg-purple-300 text-purple-900" />
              </div>
            </Card>

            {/* Food-Inspired Names */}
            <Card className="p-6 rounded-xl shadow-md bg-gradient-to-br from-white to-amber-50 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">🍕 Food-Inspired Names</h3>
              <div className="flex flex-wrap gap-3">
                <NameBadge name="Pop-Tart" color="bg-amber-200 hover:bg-amber-300 text-amber-900" />
                <NameBadge name="Tiramisu" color="bg-brown-200 hover:bg-brown-300 text-brown-900" />
                <NameBadge name="Cookie" color="bg-yellow-200 hover:bg-yellow-300 text-yellow-900" />
                <NameBadge name="Mochi" color="bg-orange-200 hover:bg-orange-300 text-orange-900" />
              </div>
            </Card>

            {/* Tech Names */}
            <Card className="p-6 rounded-xl shadow-md bg-gradient-to-br from-white to-blue-50 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">💻 Tech Names</h3>
              <div className="flex flex-wrap gap-3">
                <NameBadge name="Pixel" color="bg-blue-200 hover:bg-blue-300 text-blue-900" />
                <NameBadge name="AI" color="bg-cyan-200 hover:bg-cyan-300 text-cyan-900" />
                <NameBadge name="Elon" color="bg-sky-200 hover:bg-sky-300 text-sky-900" />
                <NameBadge name="Echo" color="bg-indigo-200 hover:bg-indigo-300 text-indigo-900" />
              </div>
            </Card>
          </div>
        </section>
       
        

        <Separator className="my-8" />

        {/* Section: A-Z Name Lists */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <Badge className="w-6 h-6 text-brand-soft-green" />
            <h2 className="text-3xl font-berkshire text-brand-dark-green">A–Z Puppy Names</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Female Names A-Z */}
            <Card className="p-6 rounded-xl shadow-md bg-gradient-to-br from-white to-pink-50 border-2 border-pink-100">
              <div className="flex items-center mb-6">
                <PawPrint className="w-5 h-5 text-pink-400 mr-2" />
                <h3 className="text-2xl font-semibold text-gray-800">Female Puppy Names</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">(Popular & Irish-Inspired)</p>
              
              <ScrollArea className="h-96">
                <div className="space-y-4 pr-4">
                  <div>
                    <h4 className="font-semibold text-pink-700 mb-2">A</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Abby" />
                      <NameTag name="Aoife" tooltipText="ee-fa, Irish origin" />
                      <NameTag name="Amber" />
                      <NameTag name="Annie" />
                      <NameTag name="Aria" />
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-pink-700 mb-2">B</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Bailey" tooltipText="popular in Ireland" />
                      <NameTag name="Bella" tooltipText="very popular globally" />
                      <NameTag name="Bonnie" />
                      <NameTag name="Brandy" />
                      <NameTag name="Biddy" tooltipText="traditional Irish nickname" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-pink-700 mb-2">C</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Cassie" />
                      <NameTag name="Clover" />
                      <NameTag name="Coco" />
                      <NameTag name="Cara" tooltipText="means 'friend' in Irish" />
                      <NameTag name="Ciara" tooltipText="kee-ra, Irish origin" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-pink-700 mb-2">D</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Daisy" tooltipText="classic and popular in Ireland" />
                      <NameTag name="Dottie" />
                      <NameTag name="Dora" />
                      <NameTag name="Darcy" />
                      <NameTag name="Dervla" tooltipText="Irish origin" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-pink-700 mb-2">E</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Ellie" />
                      <NameTag name="Evie" tooltipText="very popular in the UK & Ireland" />
                      <NameTag name="Ember" />
                      <NameTag name="Elsa" />
                      <NameTag name="Enya" tooltipText="named after the Irish singer" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-pink-700 mb-2">F</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Freya" />
                      <NameTag name="Fiona" tooltipText="Scottish/Irish origin" />
                      <NameTag name="Fifi" />
                      <NameTag name="Fern" />
                      <NameTag name="Flossie" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-pink-700 mb-2">G</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Gracie" />
                      <NameTag name="Gaia" />
                      <NameTag name="Ginger" />
                      <NameTag name="Gigi" />
                      <NameTag name="Goldie" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-pink-700 mb-2">H</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Honey" />
                      <NameTag name="Holly" tooltipText="popular Christmas name in Ireland" />
                      <NameTag name="Hope" />
                      <NameTag name="Heidi" />
                      <NameTag name="Hattie" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-pink-700 mb-2">I</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Isla" tooltipText="pronounced eye-la, trendy in Ireland" />
                      <NameTag name="Ivy" tooltipText="rising in popularity" />
                      <NameTag name="Indie" />
                      <NameTag name="Inka" />
                      <NameTag name="Iris" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-pink-700 mb-2">J</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Jessie" />
                      <NameTag name="Juniper" />
                      <NameTag name="Joy" />
                      <NameTag name="Juno" />
                      <NameTag name="Josie" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-pink-700 mb-2">K</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Kira" />
                      <NameTag name="Katie" tooltipText="classic Irish nickname" />
                      <NameTag name="Kylie" />
                      <NameTag name="Keeva" tooltipText="Anglicized form of Irish 'Caoimhe'" />
                      <NameTag name="Kona" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-pink-700 mb-2">L</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Luna" tooltipText="top name in Ireland and worldwide" />
                      <NameTag name="Lily" />
                      <NameTag name="Lottie" />
                      <NameTag name="Lulu" />
                      <NameTag name="Lyra" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-pink-700 mb-2">M</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Molly" tooltipText="extremely popular in Ireland" />
                      <NameTag name="Maisie" />
                      <NameTag name="Millie" tooltipText="top name in Ireland/UK" />
                      <NameTag name="Mabel" />
                      <NameTag name="Mocha" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-pink-700 mb-2">N</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Nala" tooltipText="from The Lion King, very popular" />
                      <NameTag name="Nessa" tooltipText="Irish mythological name" />
                      <NameTag name="Nellie" />
                      <NameTag name="Nova" />
                      <NameTag name="Niamh" tooltipText="neev, Irish origin" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-pink-700 mb-2">O</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Olive" />
                      <NameTag name="Orla" tooltipText="Irish name meaning 'golden princess'" />
                      <NameTag name="Opal" />
                      <NameTag name="Oreo" />
                      <NameTag name="Onyx" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-pink-700 mb-2">P</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Penny" />
                      <NameTag name="Poppy" tooltipText="top name in Ireland and UK" />
                      <NameTag name="Pebbles" />
                      <NameTag name="Pixie" />
                      <NameTag name="Phoebe" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-pink-700 mb-2">Q</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Queenie" />
                      <NameTag name="Quinn" tooltipText="gender-neutral, rising in popularity" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-pink-700 mb-2">R</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Rosie" tooltipText="very common in Ireland" />
                      <NameTag name="Ruby" />
                      <NameTag name="Roxy" />
                      <NameTag name="Rhea" />
                      <NameTag name="River" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-pink-700 mb-2">S</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Sadie" />
                      <NameTag name="Skye" />
                      <NameTag name="Suki" />
                      <NameTag name="Saoirse" tooltipText="seer-sha, Irish origin" />
                      <NameTag name="Stella" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-pink-700 mb-2">T</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Tilly" tooltipText="sweet and trendy" />
                      <NameTag name="Tasha" />
                      <NameTag name="Tara" tooltipText="also an Irish place name" />
                      <NameTag name="Twix" />
                      <NameTag name="Trixie" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-pink-700 mb-2">U</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Uma" />
                      <NameTag name="Unity" tooltipText="rare, elegant choice" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-pink-700 mb-2">V</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Violet" />
                      <NameTag name="Veda" />
                      <NameTag name="Vienna" />
                      <NameTag name="Vixen" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-pink-700 mb-2">W</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Willow" tooltipText="very trendy and nature-inspired" />
                      <NameTag name="Winnie" />
                      <NameTag name="Winter" />
                      <NameTag name="Wanda" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-pink-700 mb-2">X</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Xena" tooltipText="as in 'Warrior Princess'" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-pink-700 mb-2">Y</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Yara" />
                      <NameTag name="Yuki" tooltipText="means 'snow' in Japanese" />
                      <NameTag name="Yasmine" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-pink-700 mb-2">Z</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Zoe" tooltipText="classic and energetic" />
                      <NameTag name="Zara" />
                      <NameTag name="Zinnia" />
                      <NameTag name="Zola" />
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </Card>

            {/* Male Names A-Z */}
            <Card className="p-6 rounded-xl shadow-md bg-gradient-to-br from-white to-blue-50 border-2 border-blue-100">
              <div className="flex items-center mb-6">
                <PawPrint className="w-5 h-5 text-blue-400 mr-2" />
                <h3 className="text-2xl font-semibold text-gray-800">Male Puppy Names</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">(Popular & Irish-Inspired)</p>
              
              <ScrollArea className="h-96">
                <div className="space-y-4 pr-4">
                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">A</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Alfie" tooltipText="very popular in Ireland & UK" />
                      <NameTag name="Archie" tooltipText="rising in popularity" />
                      <NameTag name="Angus" tooltipText="Scottish/Irish roots" />
                      <NameTag name="Apollo" />
                      <NameTag name="Arlo" />
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">B</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Buddy" tooltipText="a top name in Ireland" />
                      <NameTag name="Bruno" />
                      <NameTag name="Benji" />
                      <NameTag name="Bailey" tooltipText="popular for both sexes in Ireland" />
                      <NameTag name="Brody" tooltipText="Irish/Scottish name meaning 'ditch' or 'muddy place'" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">C</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Charlie" tooltipText="hugely popular in Ireland" />
                      <NameTag name="Cooper" />
                      <NameTag name="Cody" />
                      <NameTag name="Conan" tooltipText="Irish origin, meaning 'little wolf'" />
                      <NameTag name="Cian" tooltipText="kee-an, Irish origin meaning 'ancient'" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">D</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Dexter" />
                      <NameTag name="Duke" />
                      <NameTag name="Dylan" />
                      <NameTag name="Dash" />
                      <NameTag name="Darragh" tooltipText="Irish origin" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">E</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Eddie" />
                      <NameTag name="Eli" />
                      <NameTag name="Ezra" />
                      <NameTag name="Enzo" />
                      <NameTag name="Eoghan" tooltipText="pronounced 'Owen', traditional Irish name" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">F</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Finn" tooltipText="very popular in Ireland and internationally" />
                      <NameTag name="Fergus" tooltipText="Irish/Scottish origin" />
                      <NameTag name="Frank" />
                      <NameTag name="Fred" />
                      <NameTag name="Fionn" tooltipText="fee-un or finn, Irish name meaning 'fair'" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">G</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Gus" />
                      <NameTag name="Gizmo" />
                      <NameTag name="George" />
                      <NameTag name="Guinness" tooltipText="fun Irish-themed name" />
                      <NameTag name="Gilly" tooltipText="cute and uncommon" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">H</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Hugo" />
                      <NameTag name="Hunter" />
                      <NameTag name="Harry" tooltipText="classic and popular" />
                      <NameTag name="Hank" />
                      <NameTag name="Hamish" tooltipText="Scottish but loved in Ireland too" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">I</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Isaac" />
                      <NameTag name="Iggy" />
                      <NameTag name="Ike" />
                      <NameTag name="Indy" />
                      <NameTag name="Iver" tooltipText="uncommon, strong sound" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">J</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Jack" tooltipText="top male dog name in Ireland" />
                      <NameTag name="Jasper" />
                      <NameTag name="Joey" />
                      <NameTag name="Jax" />
                      <NameTag name="Jude" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">K</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Kyle" />
                      <NameTag name="Koda" />
                      <NameTag name="Kian" tooltipText="Irish origin" />
                      <NameTag name="Knox" />
                      <NameTag name="Kevin" tooltipText="classic Irish name" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">L</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Leo" tooltipText="very popular in Ireland" />
                      <NameTag name="Loki" tooltipText="rising in trendy lists" />
                      <NameTag name="Louie" />
                      <NameTag name="Lucky" />
                      <NameTag name="Lenny" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">M</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Max" tooltipText="top male name globally and in Ireland" />
                      <NameTag name="Milo" />
                      <NameTag name="Murphy" tooltipText="classic Irish surname-turned-name" />
                      <NameTag name="Monty" />
                      <NameTag name="Marley" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">N</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Nico" />
                      <NameTag name="Ned" />
                      <NameTag name="Noah" />
                      <NameTag name="Norman" />
                      <NameTag name="Niall" tooltipText="Irish origin" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">O</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Ollie" tooltipText="very common in Ireland" />
                      <NameTag name="Oscar" tooltipText="popular and classic" />
                      <NameTag name="Odin" />
                      <NameTag name="Odie" />
                      <NameTag name="Oisín" tooltipText="uh-sheen, Irish origin meaning 'little deer'" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">P</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Paddy" tooltipText="quintessential Irish nickname" />
                      <NameTag name="Percy" />
                      <NameTag name="Pluto" />
                      <NameTag name="Prince" />
                      <NameTag name="Patch" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">Q</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Quinn" tooltipText="unisex, rising in popularity" />
                      <NameTag name="Quest" tooltipText="unique and adventurous" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">R</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Rex" />
                      <NameTag name="Rocky" />
                      <NameTag name="Riley" tooltipText="Irish surname, popular globally" />
                      <NameTag name="Rolo" />
                      <NameTag name="Ronan" tooltipText="Irish origin, meaning 'little seal'" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">S</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Sam" />
                      <NameTag name="Simba" tooltipText="from The Lion King" />
                      <NameTag name="Shadow" />
                      <NameTag name="Sully" tooltipText="short for Sullivan, Irish surname" />
                      <NameTag name="Seamus" tooltipText="shay-mus, Irish origin" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">T</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Toby" tooltipText="very popular in Ireland" />
                      <NameTag name="Teddy" />
                      <NameTag name="Thor" />
                      <NameTag name="Tadhg" tooltipText="pronounced 'Tige', ancient Irish name" />
                      <NameTag name="Tucker" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">U</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Ulysses" />
                      <NameTag name="Uno" />
                      <NameTag name="Uri" tooltipText="short and punchy" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">V</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Vinnie" />
                      <NameTag name="Victor" />
                      <NameTag name="Vader" tooltipText="fun for Star Wars fans" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">W</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Winston" />
                      <NameTag name="Woody" />
                      <NameTag name="Wally" />
                      <NameTag name="Whiskey" tooltipText="fun Irish-themed name" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">X</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Xander" />
                      <NameTag name="Xavier" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">Y</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Yogi" />
                      <NameTag name="Yoshi" />
                      <NameTag name="Yukon" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">Z</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <NameTag name="Zeus" tooltipText="powerful and popular" />
                      <NameTag name="Ziggy" />
                      <NameTag name="Zane" />
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </Card>
          </div>

        </section>

        {/* Scroll to Top Button */}
        {showScrollToTop && (
          <Button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 rounded-full bg-brand-soft-green hover:bg-brand-dark-green text-white p-3 shadow-lg"
            size="icon"
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        )}
     
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
                id="puppy-names-quiz-btn"
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

// Badge component for displaying names in a pill shape
const NameBadge = ({ name, color, tooltipText }: { name: string; color: string; tooltipText?: string }) => {
  if (tooltipText) {
    return (
      <IconTooltip content={tooltipText}>
        <span className={`inline-block ${color} px-4 py-2 rounded-full font-medium cursor-pointer transition-transform hover:scale-105`}>
          {name}
        </span>
      </IconTooltip>
    );
  }

  return (
    <span className={`inline-block ${color} px-4 py-2 rounded-full font-medium cursor-pointer transition-transform hover:scale-105`}>
      {name}
    </span>
  );
};

// New NameTag component for the A-Z lists
const NameTag = ({ name, tooltipText }: { name: string; tooltipText?: string }) => {
  if (tooltipText) {
    return (
      <IconTooltip content={tooltipText}>
        <span className="inline-block bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors">
          {name}
        </span>
      </IconTooltip>
    );
  }

  return (
    <span className="inline-block bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors">
      {name}
    </span>
  );
};

export default PuppyNameArchive;
