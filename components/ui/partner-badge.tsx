
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Dog } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PartnerBadgeProps {
  className?: string;
  variant?: 'default' | 'outline' | 'secondary';
}

const PartnerBadge: React.FC<PartnerBadgeProps> = ({ 
  className, 
  variant = 'outline' 
}) => {
  return (
    <Badge 
      variant={variant} 
      className={cn(
        "w-auto bg-gradient-to-r from-brand-dark-green to-brand-soft-green text-white border-0 flex items-center gap-1.5 px-2 py-1",
        className
      )}
    >
      <Dog className="w-3.5 h-3.5 flex-shrink-0 text-white" />
      <span className="font-berkshire text-xs text-white">Dog Quest</span>
      <span className="text-xs font-normal text-white">Partner</span>
    </Badge>
  );
};

export default PartnerBadge;
