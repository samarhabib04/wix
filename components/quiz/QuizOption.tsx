
import React from 'react';
import { cn } from '@/lib/utils';

interface QuizOptionProps {
  value: string;
  label: string;
  icon?: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}

const QuizOption: React.FC<QuizOptionProps> = ({ 
  value, 
  label, 
  icon, 
  selected, 
  onClick 
}) => {
  return (
    <div
      className={cn(
        "flex items-center p-3 sm:p-4 rounded-lg cursor-pointer transition-all duration-200",
        "border-2 hover:border-brand-soft-green",
        selected 
          ? "bg-[#E1E8E0] border-brand-soft-green" 
          : "bg-white border-gray-200 hover:bg-gray-50"
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
    >
      <div className="flex items-center w-full">
        <div className="mr-3 sm:mr-4 text-brand-dark-green">
          {icon}
        </div>
        
        <div className="flex-1">
          <p className={cn(
            "text-sm sm:text-lg transition-colors", 
            selected ? "font-medium text-brand-dark-green" : "text-gray-800"
          )}>
            {label}
          </p>
        </div>
        
        <div className={cn(
          "min-w-5 h-5 rounded-full border-2 flex items-center justify-center",
          selected 
            ? "border-brand-dark-green bg-brand-dark-green" 
            : "border-gray-400"
        )}>
          {selected && (
            <div className="w-2 h-2 bg-white rounded-full" />
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizOption;
