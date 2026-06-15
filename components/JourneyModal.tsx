
'use client';

import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { PawPrint, Search, Heart, UserPlus } from 'lucide-react';

interface JourneyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const JourneyModal: React.FC<JourneyModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();

  const handleTakeQuiz = () => {
    router.push('/quiz');
    onClose();
  };

  const handleBrowseListings = () => {
    router.push('/listings');
    onClose();
  };

  const handleCreateAccount = () => {
    router.push('/auth/role-selection');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-4 sm:p-8">
        <div className="text-center space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex justify-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-brand-soft-green rounded-full flex items-center justify-center animate-pulse">
                <PawPrint className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-brand-dark-green font-berkshire">
              Welcome to Your Journey!
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-md mx-auto px-2">
              Ready to find your perfect companion? Choose your path to discover amazing dogs across Ireland!
            </p>
          </div>

          {/* Options - Mobile First Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-8">
            {/* Quiz Option */}
            <div className="bg-gradient-to-br from-brand-soft-green/10 to-brand-soft-green/5 rounded-xl p-4 sm:p-6 border border-brand-soft-green/20 hover:shadow-lg transition-all duration-300 hover:scale-105">
              <div className="space-y-3 sm:space-y-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-soft-green rounded-full flex items-center justify-center mx-auto">
                  <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-brand-dark-green">
                  Find My Perfect Breed
                </h3>
                <p className="text-gray-600 text-sm px-1">
                  Take our fun quiz to discover which dog breed matches your lifestyle perfectly!
                </p>
                <Button 
                  onClick={handleTakeQuiz}
                  className="w-full bg-brand-soft-green hover:bg-brand-soft-green/90 text-white font-medium text-sm sm:text-base"
                >
                  Take the Quiz
                </Button>
              </div>
            </div>

            {/* Browse Option */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-25 rounded-xl p-4 sm:p-6 border border-amber-200 hover:shadow-lg transition-all duration-300 hover:scale-105">
              <div className="space-y-3 sm:space-y-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-400 rounded-full flex items-center justify-center mx-auto">
                  <Search className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-brand-dark-green">
                  Browse All Listings
                </h3>
                <p className="text-gray-600 text-sm px-1">
                  Explore all beautiful pups and dogs available for new homes today
                </p>
                <Button 
                  onClick={handleBrowseListings}
                  variant="outline"
                  className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 font-medium text-sm sm:text-base"
                >
                  Browse Listings
                </Button>
              </div>
            </div>

            {/* Create Account Option */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-25 rounded-xl p-4 sm:p-6 border border-purple-200 hover:shadow-lg transition-all duration-300 hover:scale-105 sm:col-span-2 lg:col-span-1">
              <div className="space-y-3 sm:space-y-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-400 rounded-full flex items-center justify-center mx-auto">
                  <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-brand-dark-green">
                  Join Dog Quest
                </h3>
                <p className="text-gray-600 text-sm px-1">
                  Create an account as a buyer, seller, or business (vet, groomer, etc.) to get started.
                </p>
                <Button 
                  onClick={handleCreateAccount}
                  variant="outline"
                  className="w-full border-purple-300 text-purple-700 hover:bg-purple-50 font-medium text-sm sm:text-base"
                >
                  Create Account
                </Button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-100">
            <p className="text-xs sm:text-sm text-gray-500">
              🐾 Join thousands of dog lovers finding their perfect match across Ireland
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JourneyModal;
