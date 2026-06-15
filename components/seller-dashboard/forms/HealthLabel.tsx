import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Info } from 'lucide-react';

interface HealthLabelProps {
  htmlFor: string;
  children: React.ReactNode;
  tooltip: string;
  required?: boolean;
}

const HealthLabel: React.FC<HealthLabelProps> = ({ htmlFor, children, tooltip, required = false }) => {
  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex items-center gap-2">
        <Label htmlFor={htmlFor} className="flex items-center gap-1">
          {children}
          {required && <span className="text-red-500">*</span>}
        </Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-soft-green focus:ring-offset-1 rounded-full p-0.5"
              aria-label={`Information about ${children}`}
              tabIndex={0}
            >
              <Info className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="max-w-xs px-3 py-2 text-sm bg-gray-900 text-white border border-gray-700 rounded-md shadow-lg"
            sideOffset={5}
          >
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export { HealthLabel };
