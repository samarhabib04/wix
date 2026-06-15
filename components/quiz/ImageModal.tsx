
import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  breedName: string;
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, imageUrl, breedName }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] min-h-[80vh] p-8 overflow-hidden">
        <div className="relative h-full flex flex-col justify-center">
          <div className="flex-1 flex items-center justify-center py-8">
            <img 
              src={imageUrl || '/placeholder.svg'}
              alt={breedName}
              className="max-w-full max-h-[60vh] object-contain"
            />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h3 className="text-black text-xl font-berkshire text-center">{breedName}</h3>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageModal;
