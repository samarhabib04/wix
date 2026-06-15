'use client';

import React from 'react';
import SavedQuizResults from '@/components/shared/SavedQuizResults';

export default function BusinessQuizResultsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Quiz Results</h1>
          <p className="text-gray-600 mt-1">
            View your saved breed recommendation quiz results
          </p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg">
        <SavedQuizResults />
      </div>
    </div>
  );
}

