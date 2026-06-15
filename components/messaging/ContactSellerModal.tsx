
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useConversations } from '@/hooks/use-conversations';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { MessageSquare, DollarSign, Heart } from 'lucide-react';

interface ContactSellerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerId: string;
  listingId: string;
  listingType: string;
  listingTitle: string;
  contactOnly?: boolean; // New prop to show only contact option
}

export const ContactSellerModal = ({ 
  isOpen, 
  onClose, 
  sellerId, 
  listingId, 
  listingType, 
  listingTitle,
  contactOnly = false // Default to false for backward compatibility
}: ContactSellerModalProps) => {
  const [messageType, setMessageType] = useState('contact');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCollarColors, setSelectedCollarColors] = useState<string[]>([]);
  const { createConversation } = useConversations();
  const { checkAuth } = useAuthGuard({
    message: "Please log in to send messages to breeders."
  });

  // Available collar colors
  const collarColors = [
    'Light Grey',
    'Dark Grey', 
    'Orange',
    'Brown',
    'Black',
    'Yellow',
    'Gold',
    'Wine',
    'Purple',
    'Dark Blue',
    'Light Blue',
    'Green',
    'Other'
  ];

  const messageTypes = [
    {
      value: 'contact',
      label: 'General Enquiry',
      icon: MessageSquare,
      description: 'Ask questions about the listing'
    },
    {
      value: 'offer',
      label: 'Make an Offer',
      icon: DollarSign,
      description: 'Submit a price offer'
    },
    {
      value: 'reserve',
      label: 'Reserve',
      icon: Heart,
      description: 'Express interest in reserving'
    }
  ];

  // Filter message types based on contactOnly prop
  const availableMessageTypes = contactOnly 
    ? messageTypes.filter(type => type.value === 'contact')
    : messageTypes;

  const getDefaultMessage = (type: string) => {
    switch (type) {
      case 'contact':
        return `Hi, I'm interested in your listing "${listingTitle}". Could you please provide more information?`;
      case 'offer':
        return `Hi, I would like to make an offer for "${listingTitle}". Please let me know if you're open to negotiation.`;
      case 'reserve':
        return `Hi, I'm very interested in "${listingTitle}" and would like to discuss reservation options.`;
      default:
        return '';
    }
  };

  const handleTypeChange = (newType: string) => {
    setMessageType(newType);
    setMessage(getDefaultMessage(newType));
  };

  // Initialize with default message when modal opens
  useState(() => {
    if (isOpen && !message) {
      setMessage(getDefaultMessage(messageType));
    }
  });

  // Map the incoming listingType to the correct database value
  const getCorrectListingType = (type: string) => {
    switch (type) {
      case 'listing':
        return 'sale';
      case 'stud':
        return 'stud';
      case 'showcase':
        return 'showcase';
      default:
        return 'sale'; // Default fallback
    }
  };

  // Handle collar color selection
  const handleCollarColorChange = (color: string, checked: boolean) => {
    if (checked) {
      setSelectedCollarColors([...selectedCollarColors, color]);
    } else {
      setSelectedCollarColors(selectedCollarColors.filter(c => c !== color));
    }
  };

  const handleSubmit = async () => {
    // Check authentication before proceeding
    if (!checkAuth()) return;

    if (!message.trim()) {
      return;
    }

    const correctListingType = getCorrectListingType(listingType);

    // Include collar colors in message if any are selected
    let finalMessage = message.trim();
    if (selectedCollarColors.length > 0) {
      finalMessage += `\n\nPuppy collar colors of interest: ${selectedCollarColors.join(', ')}`;
    }

    setLoading(true);
    try {
      const subject = `${messageTypes.find(t => t.value === messageType)?.label} - ${listingTitle}`;
      const result = await createConversation(sellerId, listingId, correctListingType, subject, finalMessage, messageType);
      
      if (result) {
        onClose();
        setMessage('');
        setMessageType('contact');
        setSelectedCollarColors([]); // Reset collar colors
      } else {
        console.error('Failed to create conversation');
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Contact Seller</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Only show message type selection if not contactOnly */}
          {!contactOnly && (
            <div>
              <Label className="text-sm font-medium">Message Type</Label>
              <RadioGroup 
                value={messageType} 
                onValueChange={handleTypeChange}
                className="mt-2"
              >
                {availableMessageTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <div key={type.value} className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50">
                      <RadioGroupItem value={type.value} id={type.value} />
                      <div className="flex items-center space-x-2 flex-1">
                        <Icon className="h-4 w-4 text-gray-500" />
                        <div>
                          <Label htmlFor={type.value} className="font-medium cursor-pointer">
                            {type.label}
                          </Label>
                          <p className="text-xs text-gray-500">{type.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          )}

          {/* Collar Color Selection */}
          <div>
            <Label className="text-sm font-medium">
              Puppy Collar Colors (Optional)
            </Label>
            <p className="text-xs text-muted-foreground mb-3">
              Select the collar colors of puppies you're interested in. This helps the seller identify which specific puppies you want to discuss.
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-lg p-3 bg-gray-50">
              {collarColors.map((color) => (
                <div key={color} className="flex items-center space-x-2">
                  <Checkbox
                    id={color}
                    checked={selectedCollarColors.includes(color)}
                    onCheckedChange={(checked) => handleCollarColorChange(color, checked as boolean)}
                  />
                  <Label
                    htmlFor={color}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {color}
                  </Label>
                </div>
              ))}
            </div>
            {selectedCollarColors.length > 0 && (
              <p className="text-xs text-blue-600 mt-2">
                Selected: {selectedCollarColors.join(', ')}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="message" className="text-sm font-medium">
              Your Message
            </Label>
            <Textarea
              id="message"
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 min-h-[100px]"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!message.trim() || loading}
              className="bg-brand-soft-green hover:bg-brand-soft-green/90"
            >
              {loading ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
