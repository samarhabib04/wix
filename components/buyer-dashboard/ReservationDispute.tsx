import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ReservationDisputeProps {
  reservationId: string;
  puppy_collar_color?: string;
  escrow_deadline: string;
  canDispute: boolean;
}

const DISPUTE_REASONS = [
  { value: 'seller_non_response', label: 'Seller not responding to messages' },
  { value: 'puppy_misrepresentation', label: 'Puppy does not match description' },
  { value: 'health_concerns', label: 'Health concerns with puppy' },
  { value: 'seller_cancelled', label: 'Seller cancelled the sale' },
  { value: 'false_availability', label: 'Puppy was not actually available' },
  { value: 'other', label: 'Other reason' }
];

export const ReservationDispute: React.FC<ReservationDisputeProps> = ({
  reservationId,
  puppy_collar_color,
  escrow_deadline,
  canDispute
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState<File[]>([]);

  const daysRemaining = Math.ceil((new Date(escrow_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setEvidence(prev => [...prev, ...files].slice(0, 5)); // Max 5 files
  };

  const handleSubmitDispute = async () => {
    if (!disputeReason || !description.trim()) {
      toast({
        title: "Incomplete Information",
        description: "Please select a reason and provide a description.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('handle-reservation-dispute', {
        body: {
          reservationId,
          disputeReason,
          description,
          evidence: evidence.map(f => ({ name: f.name, size: f.size, type: f.type }))
        }
      });

      if (error) throw error;

      toast({
        title: "Dispute Submitted",
        description: "Your dispute has been submitted and will be reviewed by our team within 24 hours."
      });

      setIsOpen(false);
      // Reset form
      setDisputeReason('');
      setDescription('');
      setEvidence([]);
    } catch (error) {
      console.error('Error submitting dispute:', error);
      toast({
        title: "Error",
        description: "Failed to submit dispute. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canDispute) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
          <AlertTriangle className="w-4 h-4 mr-2" />
          Raise Dispute
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Raise a Dispute</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You have {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left to raise a dispute for this reservation.
              {puppy_collar_color && ` Puppy: ${puppy_collar_color} collar`}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="dispute-reason">Reason for Dispute</Label>
            <Select value={disputeReason} onValueChange={setDisputeReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {DISPUTE_REASONS.map(reason => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Detailed Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide details about the issue..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="evidence">Supporting Evidence (Optional)</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4">
              <input
                type="file"
                id="evidence"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label htmlFor="evidence" className="cursor-pointer flex flex-col items-center gap-2 text-muted-foreground">
                <Upload className="w-6 h-6" />
                <span className="text-sm">Upload screenshots, documents, or other evidence</span>
                <span className="text-xs">Max 5 files, 10MB each</span>
              </label>
            </div>
            {evidence.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {evidence.length} file(s) selected
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitDispute}
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Dispute'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
