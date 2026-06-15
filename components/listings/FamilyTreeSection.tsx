
import React, { useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import FamilyTreeCard from './FamilyTreeCard';
import { useIsMobile } from '@/hooks/use-mobile';

interface FamilyMember {
  name: string;
  breed: string;
  image: string;
}

interface FamilyTreeData {
  mother: FamilyMember;
  father: FamilyMember;
  grandparents: {
    maternalGrandmother: FamilyMember;
    maternalGrandfather: FamilyMember;
    paternalGrandmother: FamilyMember;
    paternalGrandfather: FamilyMember;
  };
}

interface FamilyTreeSectionProps {
  puppy: {
    title: string;
    breed: string;
    image: string | null;
  };
  familyTree: FamilyTreeData;
  backgroundColor?: string;
  className?: string;
}

const FamilyTreeSection: React.FC<FamilyTreeSectionProps> = ({
  puppy,
  familyTree,
  backgroundColor = "#EFF4ED",
  className = ""
}) => {
  const isMobile = useIsMobile();
  const [isGrandparentsExpanded, setIsGrandparentsExpanded] = useState(false);

  // Ensure we have valid data for all family members
  const validFamilyTree = {
    mother: {
      name: familyTree?.mother?.name || "",
      breed: familyTree?.mother?.breed || "",
      image: familyTree?.mother?.image || ""
    },
    father: {
      name: familyTree?.father?.name || "",
      breed: familyTree?.father?.breed || "",
      image: familyTree?.father?.image || ""
    },
    grandparents: {
      maternalGrandmother: {
        name: familyTree?.grandparents?.maternalGrandmother?.name || "",
        breed: familyTree?.grandparents?.maternalGrandmother?.breed || "",
        image: familyTree?.grandparents?.maternalGrandmother?.image || ""
      },
      maternalGrandfather: {
        name: familyTree?.grandparents?.maternalGrandfather?.name || "",
        breed: familyTree?.grandparents?.maternalGrandfather?.breed || "",
        image: familyTree?.grandparents?.maternalGrandfather?.image || ""
      },
      paternalGrandmother: {
        name: familyTree?.grandparents?.paternalGrandmother?.name || "",
        breed: familyTree?.grandparents?.paternalGrandmother?.breed || "",
        image: familyTree?.grandparents?.paternalGrandmother?.image || ""
      },
      paternalGrandfather: {
        name: familyTree?.grandparents?.paternalGrandfather?.name || "",
        breed: familyTree?.grandparents?.paternalGrandfather?.breed || "",
        image: familyTree?.grandparents?.paternalGrandfather?.image || ""
      }
    }
  };

  return (
    <section className={className}>
      {/* Enhanced Desktop Family Tree View */}
      <div className={`hidden md:block ${backgroundColor} p-6 rounded-xl shadow-sm relative overflow-hidden border bg-[#EFF4ED]`}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-berkshire mt-6 mb-10 text-center">Puppy's Family Tree</h2>
          
          {/* Maternal side connection lines */}
          <div className="absolute top-[270px] left-[calc(50%-385px)] z-[1]">
            <svg className="w-64 h-20" viewBox="0 0 256 64" preserveAspectRatio="none">
              <path d="M128,64 L128,32 L64,32 L64,0" stroke="#BFCFBB" strokeWidth="3" strokeDasharray="5,5" fill="none" />
              <path d="M128,64 L128,32 L192,32 L192,0" stroke="#BFCFBB" strokeWidth="3" strokeDasharray="5,5" fill="none" />
            </svg>
          </div>
          
          {/* Paternal side connection lines */}
          <div className="absolute top-[270px] left-[calc(50%+135px)] z-[1]">
            <svg className="w-64 h-20" viewBox="0 0 256 64" preserveAspectRatio="none">
              <path d="M128,64 L128,32 L64,32 L64,0" stroke="#BFCFBB" strokeWidth="3" strokeDasharray="5,5" fill="none" />
              <path d="M128,64 L128,32 L192,32 L192,0" stroke="#BFCFBB" strokeWidth="3" strokeDasharray="5,5" fill="none" />
            </svg>
          </div>
          
          {/* Connection lines from parents to puppy */}
          <div className="absolute top-[540px] left-0 w-full" style={{ zIndex: 1 }}>
            <svg className="w-full h-24" viewBox="0 0 1200 96" preserveAspectRatio="none">
              <path d="M373,0 L373,48 L600,48" stroke="#BFCFBB" strokeWidth="3" strokeDasharray="5,5" fill="none" />
              <path d="M830,0 L830,48 L600,48" stroke="#BFCFBB" strokeWidth="3" strokeDasharray="5,5" fill="none" />
              <path d="M600,48 L600,96" stroke="#BFCFBB" strokeWidth="3" strokeDasharray="5,5" fill="none" />
            </svg>
          </div>
          
          {/* Top level - Grandparents */}
          <div className="grid grid-cols-4 gap-4 mb-16" style={{ position: 'relative', zIndex: 2 }}>
            {/* Maternal Grandparents */}
            <div className="col-span-2 flex justify-center gap-4">
              <FamilyTreeCard 
                name={validFamilyTree.grandparents.maternalGrandmother.name}
                breed={validFamilyTree.grandparents.maternalGrandmother.breed}
                image={validFamilyTree.grandparents.maternalGrandmother.image} 
                relation="Maternal Grandmother"
                variant="grandparent"
              />
              <FamilyTreeCard 
                name={validFamilyTree.grandparents.maternalGrandfather.name}
                breed={validFamilyTree.grandparents.maternalGrandfather.breed}
                image={validFamilyTree.grandparents.maternalGrandfather.image} 
                relation="Maternal Grandfather"
                variant="grandparent"
              />
            </div>
            
            {/* Paternal Grandparents */}
            <div className="col-span-2 flex justify-center gap-4">
              <FamilyTreeCard 
                name={validFamilyTree.grandparents.paternalGrandmother.name}
                breed={validFamilyTree.grandparents.paternalGrandmother.breed}
                image={validFamilyTree.grandparents.paternalGrandmother.image} 
                relation="Paternal Grandmother"
                variant="grandparent"
              />
              <FamilyTreeCard 
                name={validFamilyTree.grandparents.paternalGrandfather.name}
                breed={validFamilyTree.grandparents.paternalGrandfather.breed}
                image={validFamilyTree.grandparents.paternalGrandfather.image} 
                relation="Paternal Grandfather"
                variant="grandparent"
              />
            </div>
          </div>
          
          {/* Middle level - Parents */}
          <div className="grid grid-cols-2 gap-16 mb-16" style={{ position: 'relative', zIndex: 2 }}>
            <div className="flex justify-center translate-x-4">
              <FamilyTreeCard 
                name={validFamilyTree.mother.name}
                breed={validFamilyTree.mother.breed}
                image={validFamilyTree.mother.image} 
                relation="Mother"
                variant="parent"
              />
            </div>
            <div className="flex justify-center -translate-x-2">
              <FamilyTreeCard 
                name={validFamilyTree.father.name}
                breed={validFamilyTree.father.breed}
                image={validFamilyTree.father.image} 
                relation="Father"
                variant="parent"
              />
            </div>
          </div>
          
          {/* Bottom level - Puppy */}
          <div className="flex justify-center mt-8" style={{ position: 'relative', zIndex: 2 }}>
            <motion.div 
              whileHover={{ scale: 1.03 }}
              className="flex flex-col items-center"
            >
              <div className="w-36 h-36 border-4 bg-brand-light-green border-brand-light-green rounded-full flex items-center justify-center mb-4 shadow-lg p-1">
                {puppy.image && typeof puppy.image === 'string' && puppy.image.trim() ? (
                  <img 
                    src={puppy.image} 
                    alt={puppy.title} 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400 text-xs">No Image</span>
                  </div>
                )}
              </div>
              <div className="bg-white px-6 py-3 rounded-lg shadow-md text-center">
                <p className="text-xl font-semibold">{puppy.title}</p>
                <p className="text-brand-dark-green">{puppy.breed}</p>
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Family tree legend - Fixed duplicate div structure */}
        <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-gray-600">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-pink-500 mr-2"></div>
            <span>Female Ancestry</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
            <span>Male Ancestry</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-brand-light-green mr-2"></div>
            <span>This Dog</span>
          </div>
          <div className="flex items-center">
            <hr className="w-5 border-t-2 border-dashed border-brand-soft-green mr-2" />
            <span>Family Connection</span>
          </div>
        </div>
      </div>
      
      {/* Enhanced Mobile Family Tree View */}
      <div className="md:hidden bg-[#EFF4ED] p-4 rounded-xl shadow-sm">
        <h2 className="text-2xl font-berkshire mb-6 text-center">Dog's Family Tree</h2>
        {/* Puppy - At the top in mobile */}
        <div className="flex justify-center mb-6">
          <motion.div whileHover={{ scale: 1.05 }} className="flex flex-col items-center">
            <div className="w-28 h-28 bg-brand-light-green border-brand-light-green border-4 rounded-full flex items-center justify-center mb-2 shadow-md p-1">
              {puppy.image && typeof puppy.image === 'string' && puppy.image.trim() ? (
                <img 
                  src={puppy.image} 
                  alt={puppy.title} 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400 text-xs">No Image</span>
                </div>
              )}
            </div>
            <div className="bg-white px-4 py-2 rounded-lg shadow text-center">
              <p className="font-semibold">{puppy.title}</p>
              <p className="text-sm text-brand-dark-green">{puppy.breed}</p>
            </div>
          </motion.div>
        </div>
        
        {/* Down arrow */}
        <div className="flex justify-center mb-4">
          <ArrowDown className="h-6 w-6 text-brand-soft-green animate-bounce" />
        </div>
        
        {/* Parents */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <FamilyTreeCard 
            name={validFamilyTree.mother.name}
            breed={validFamilyTree.mother.breed}
            image={validFamilyTree.mother.image} 
            relation="Mother"
            variant="compact"
          />
          <FamilyTreeCard 
            name={validFamilyTree.father.name}
            breed={validFamilyTree.father.breed}
            image={validFamilyTree.father.image} 
            relation="Father"
            variant="compact"
          />
        </div>
        
        {/* Grandparents - Collapsible */}
        <Collapsible 
          open={isGrandparentsExpanded} 
          onOpenChange={setIsGrandparentsExpanded}
          className="bg-white rounded-lg shadow mb-4"
        >
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full flex items-center justify-between py-3 px-4"
            >
              <span className="font-semibold">View Grandparents</span>
              <ArrowDown className={`h-5 w-5 transition-transform ${isGrandparentsExpanded ? "transform rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-500 text-center">Maternal Side</h4>
                <FamilyTreeCard 
                  name={validFamilyTree.grandparents.maternalGrandmother.name}
                  breed={validFamilyTree.grandparents.maternalGrandmother.breed}
                  image={validFamilyTree.grandparents.maternalGrandmother.image} 
                  relation="Grandmother"
                  variant="micro"
                />
                <FamilyTreeCard 
                  name={validFamilyTree.grandparents.maternalGrandfather.name}
                  breed={validFamilyTree.grandparents.maternalGrandfather.breed}
                  image={validFamilyTree.grandparents.maternalGrandfather.image} 
                  relation="Grandfather"
                  variant="micro"
                />
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-500 text-center">Paternal Side</h4>
                <FamilyTreeCard 
                  name={validFamilyTree.grandparents.paternalGrandmother.name}
                  breed={validFamilyTree.grandparents.paternalGrandmother.breed}
                  image={validFamilyTree.grandparents.paternalGrandmother.image} 
                  relation="Grandmother"
                  variant="micro"
                />
                <FamilyTreeCard 
                  name={validFamilyTree.grandparents.paternalGrandfather.name}
                  breed={validFamilyTree.grandparents.paternalGrandfather.breed}
                  image={validFamilyTree.grandparents.paternalGrandfather.image} 
                  relation="Grandfather"
                  variant="micro"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
        
        {/* Family tree legend - mobile - FIXED STRUCTURE */}
        <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-gray-600">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-pink-500 mr-1"></div>
            <span>Female Ancestry</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-blue-500 mr-1"></div>
            <span>Male Ancestry</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-brand-light-green mr-1"></div>
            <span>This Dog</span>
          </div>
          
        </div>
      </div>
    </section>
  );
};

export default FamilyTreeSection;
