
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

interface QuizCardProps {
  question: React.ReactNode;
  children: React.ReactNode;
}

const QuizCard: React.FC<QuizCardProps> = ({ 
  question,
  children
}) => {
  return (
    <Card className="shadow-lg border-gray-100 relative z-10 bg-white/90 backdrop-blur-sm">
      <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
        <h3 className="text-lg sm:text-xl md:text-2xl font-medium text-gray-800 mb-4 sm:mb-6">
          {question}
        </h3>
        
        {children}
      </CardContent>
    </Card>
  );
};

export default QuizCard;
