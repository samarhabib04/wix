import React, { useEffect, useState } from 'react';
import { removeBackground, loadImage } from '@/lib/utils/background-removal';
import { Button } from '@/components/ui/button';

interface BackgroundRemovalProcessorProps {
  onProcessComplete?: () => void;
}

const BackgroundRemovalProcessor: React.FC<BackgroundRemovalProcessorProps> = ({ onProcessComplete }) => {
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<string>('');

  const processImages = async () => {
    setProcessing(true);
    setStatus('Processing badge images...');

    try {
      // Process Gold Star
      setStatus('Loading Gold Star image...');
      const goldStarResponse = await fetch('/badges/goldernstart.jpeg');
      const goldStarBlob = await goldStarResponse.blob();
      const goldStarImg = await loadImage(goldStarBlob);
      
      setStatus('Removing Gold Star background...');
      const goldStarProcessed = await removeBackground(goldStarImg);
      
      // Create download for processed gold star
      const goldStarUrl = URL.createObjectURL(goldStarProcessed);
      const goldStarLink = document.createElement('a');
      goldStarLink.href = goldStarUrl;
      goldStarLink.download = 'gold-star-no-bg.png';
      goldStarLink.click();
      
      // Process Green Tick
      setStatus('Loading Green Tick image...');
      const greenTickResponse = await fetch('/badges/greentick.jpeg');
      const greenTickBlob = await greenTickResponse.blob();
      const greenTickImg = await loadImage(greenTickBlob);
      
      setStatus('Removing Green Tick background...');
      const greenTickProcessed = await removeBackground(greenTickImg);
      
      // Create download for processed green tick
      const greenTickUrl = URL.createObjectURL(greenTickProcessed);
      const greenTickLink = document.createElement('a');
      greenTickLink.href = greenTickUrl;
      greenTickLink.download = 'green-tick-no-bg.png';
      greenTickLink.click();
      
      setStatus('Processing complete! Download the processed images and replace the originals.');
      onProcessComplete?.();
      
    } catch (error) {
      console.error('Error processing images:', error);
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg border z-50 max-w-xs">
      <h3 className="font-semibold mb-2">Background Removal Tool</h3>
      <p className="text-sm text-gray-600 mb-3">
        Process badge images to remove backgrounds
      </p>
      
      {status && (
        <p className="text-sm mb-3 p-2 bg-gray-100 rounded">
          {status}
        </p>
      )}
      
      <Button 
        onClick={processImages} 
        disabled={processing}
        size="sm"
        className="w-full"
      >
        {processing ? 'Processing...' : 'Process Images'}
      </Button>
    </div>
  );
};

export default BackgroundRemovalProcessor;
