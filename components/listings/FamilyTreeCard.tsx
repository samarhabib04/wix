
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AspectRatio } from '@/components/ui/aspect-ratio';

export interface FamilyTreeCardProps {
  name: string;
  breed: string;
  image: string;
  relation: string;
  variant?: 'default' | 'compact' | 'micro' | 'grandparent' | 'parent';
}

const PLACEHOLDER_IMAGE = "https://sehzakutrlropprdcewu.supabase.co/storage/v1/object/sign/showcase_listings/DogQuest-Null-Family-Tree.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0b3JhZ2UtdXJsLXNpZ25pbmcta2V5XzRkMzVhZDA5LTkyOTctNGVlOS1iMzZiLWFkNTIyYTViZGE2YSJ9.eyJ1cmwiOiJzaG93Y2FzZV9saXN0aW5ncy9Eb2dRdWVzdC1OdWxsLUZhbWlseS1UcmVlLnBuZyIsImlhdCI6MTc0NzMxOTA2NywiZXhwIjoyMzc4MDM5MDY3fQ.NVHT34Q7ufcflzOiafyD3jLToBxrmOIYb5Q60xw18fY";
const DOG_QUEST_LOGO = "https://sehzakutrlropprdcewu.supabase.co/storage/v1/object/sign/showcase_listings/DogQuest-Null-Family-Tree.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0b3JhZ2UtdXJsLXNpZ25pbmcta2V5XzRkMzVhZDA5LTkyOTctNGVlOS1iMzZiLWFkNTIyYTViZGE2YSJ9.eyJ1cmwiOiJzaG93Y2FzZV9saXN0aW5ncy9Eb2dRdWVzdC1OdWxsLUZhbWlseS1UcmVlLnBuZyIsImlhdCI6MTc0NzMxOTA2NywiZXhwIjoyMzc4MDM5MDY3fQ.NVHT34Q7ufcflzOiafyD3jLToBxrmOIYb5Q60xw18fY";

const FamilyTreeCard: React.FC<FamilyTreeCardProps> = ({ 
  name, 
  breed, 
  image, 
  relation, 
  variant = 'default' 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Format display values for missing data - improved handling for empty strings
  const displayName = name && name.trim() !== "" ? name : "Unknown";
  const displayBreed = breed && breed.trim() !== "" ? breed : "Unknown Breed";
  
  // Determine which image to use - handle various edge cases
  const displayImage = (() => {
    if (!image || image === "null" || image === "undefined" || image.trim() === "") {
      return PLACEHOLDER_IMAGE; // Use placeholder if no image provided at all or empty string
    }
    return image; // Use provided image
  })();

  const styleMap = {
    default: {
      container: "bg-white rounded-lg shadow-md p-4 flex flex-col items-center text-center transition-all cursor-pointer",
      image: "w-20 h-20 rounded-full overflow-hidden mb-3",
      name: "text-base font-semibold",
      breed: "text-sm text-gray-600",
      relation: "mt-1 text-xs text-gray-500",
    },
    compact: {
      container: "bg-white rounded-lg shadow-sm p-3 flex flex-col items-center text-center transition-all cursor-pointer",
      image: "w-16 h-16 rounded-full overflow-hidden mb-2 border-2 border-brand-soft-green",
      name: "text-sm font-semibold",
      breed: "text-xs text-gray-600",
      relation: "text-xs text-gray-500 mt-1",
    },
    micro: {
      container: "bg-white rounded-lg shadow-sm p-2 flex items-center transition-all cursor-pointer",
      image: "w-10 h-10 rounded-full overflow-hidden mr-2 border-2 border-brand-soft-green",
      name: "text-xs font-medium",
      breed: "text-[10px] text-gray-600",
      relation: "text-[10px] text-gray-500",
    },
    grandparent: {
      container: "bg-white rounded-lg shadow p-3 flex flex-col items-center text-center transition-all hover:shadow-md cursor-pointer",
      image: "w-16 h-16 rounded-full overflow-hidden mb-2 ",
      relation: "mt-1 text-lg text-gray-800 font-medium",
      name: "text-sm",
      breed: "text-xs text-gray-600",
      
    },
    parent: {
      container: "bg-white rounded-lg shadow-md p-4 flex flex-col items-center text-center transition-all hover:shadow-lg cursor-pointer",
      image: "w-24 h-24 rounded-full overflow-hidden mb-3 ",
      relation: "mt-1 text-lg font-medium text-gray-800",
      name: "text-sm",
      breed: "text-sm text-gray-600",
      
    }
  };
  
  const style = styleMap[variant];

  const borderColor = (() => {
  if (relation.toLowerCase().includes("mother") || relation.toLowerCase().includes("grandmother")) {
    return "border-4 border-pink-400";
  }
  if (relation.toLowerCase().includes("father") || relation.toLowerCase().includes("grandfather")) {
    return "border-4 border-blue-400";
  }
  return ""; // Default: no border
})();
  
  return (
    <>
      <motion.div 
        whileHover={{ scale: variant === 'micro' ? 1.02 : 1.05 }}
        className={style.container}
        onClick={() => setIsModalOpen(true)}
      >
        {variant === 'micro' ? (
          <div className="flex items-center w-full">
           <div className={cn(style.image, borderColor)}>
              <img 
                src={displayImage}
                alt={displayName} 
                className="w-full h-full object-cover media-scroll-fix"
                onError={(e) => {
                  // Fallback if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.src = PLACEHOLDER_IMAGE;
                }}
                draggable={false}
              />
            </div>
            <div className="flex flex-col">
               <p className={style.relation}>{relation}</p>
              <p className={style.name}>{displayName}</p>
              <p className={style.breed}>{displayBreed}</p>
             
            </div>
          </div>
        ) : (
          <>
           <div className={cn(style.image, borderColor)}>
              <img 
                src={displayImage}
                alt={displayName} 
                className="w-full h-full object-cover media-scroll-fix"
                onError={(e) => {
                  // Fallback if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.src = PLACEHOLDER_IMAGE;
                }}
                draggable={false}
              />
            </div>
             <p className={style.relation}>{relation}</p>
            <p className={style.name}>{displayName}</p>
            <p className={style.breed}>{displayBreed}</p>
           
          </>
        )}
      </motion.div>

      {/* Zoomed View Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="text-2xl font-berkshire text-center">
            {relation}
          </DialogTitle>
          
          <div className="flex flex-col items-center">
            {/* Circle wrapper with dynamic border color */}
            <div className={cn("w-64 h-64 rounded-full overflow-hidden mb-4 border-4", borderColor)}>
              <img 
                src={displayImage}
                alt={displayName} 
                className="w-full h-full object-cover rounded-full media-scroll-fix"
                onError={(e) => {
                  // Fallback if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.src = PLACEHOLDER_IMAGE;
                }}
                draggable={false}
              />
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-xl font-medium">{displayName}</h3>
              <p className="text-lg text-gray-700 font-semibold">{displayBreed}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FamilyTreeCard;
