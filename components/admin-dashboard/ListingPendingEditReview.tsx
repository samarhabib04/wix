'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Clock, Diff, Edit, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { adminToast } from '@/lib/utils/adminToast';
import {
  approveSaleListingEdit,
  rejectSaleListingEdit,
} from '@/lib/utils/listing-edit-approval';

function fieldChanged(current: unknown, proposed: unknown): boolean {
  if (Array.isArray(current) || Array.isArray(proposed)) {
    return JSON.stringify(current) !== JSON.stringify(proposed);
  }
  return current !== proposed;
}

function ChangedBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <Badge className="bg-orange-500 text-white text-xs">
      <Edit className="h-3 w-3 mr-1" />
      Edited
    </Badge>
  );
}

interface ListingPendingEditReviewProps {
  listingType: 'sale';
  listingId: string;
  sellerId: string;
  current: Record<string, unknown>;
  pendingEdit: Record<string, unknown>;
  adminNotes: string;
  onCompleted: () => void;
}

export function ListingPendingEditReview({
  listingType,
  listingId,
  sellerId,
  current,
  pendingEdit,
  adminNotes,
  onCompleted,
}: ListingPendingEditReviewProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'current' | 'edit'>('edit');
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);

  const renderField = (label: string, key: string, formatter?: (v: unknown) => string) => {
    const currentVal = current[key];
    const editVal = pendingEdit[key];
    const display = formatter ? formatter(editVal) : String(editVal ?? '—');
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <p>
          <span className="font-medium">{label}:</span> {display}
        </p>
        <ChangedBadge show={fieldChanged(currentVal, editVal)} />
      </div>
    );
  };

  const renderListingBody = (data: Record<string, unknown>, isPending = false) => (
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="font-semibold text-lg">{String(data.title ?? '')}</h3>
        {isPending && <Badge className="bg-orange-500">Pending Changes</Badge>}
      </div>
      {renderField('Breed', 'breed')}
      {renderField('Location', 'location')}
      {renderField('Date of birth', 'date_of_birth')}
      {renderField('Description', 'description', (v) =>
        v ? String(v).slice(0, 200) + (String(v).length > 200 ? '…' : '') : '—',
      )}
      {renderField('Vet', 'vet_name')}
      {renderField('Vet location', 'vet_location')}
      {Array.isArray(data.images) && data.images.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="font-medium">Images ({data.images.length})</p>
            {isPending && (
              <ChangedBadge show={fieldChanged(current.images, pendingEdit.images)} />
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(data.images as string[]).slice(0, 4).map((url, i) => (
              <img key={i} src={url} alt="" className="rounded border h-24 w-full object-cover" />
            ))}
          </div>
        </div>
      )}
      {Array.isArray(data.puppy_details) && (
        <div className="flex items-center gap-2">
          <p>
            <span className="font-medium">Puppies:</span>{' '}
            {(data.puppy_details as unknown[]).length} configured
          </p>
          {isPending && (
            <ChangedBadge
              show={fieldChanged(current.puppy_details, pendingEdit.puppy_details)}
            />
          )}
        </div>
      )}
    </div>
  );

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await approveSaleListingEdit({
        listingId,
        pendingEdit,
        adminNotes: adminNotes || null,
        sellerId,
      });
      setConfirmAction(null);
      toast(adminToast.success('Edit approved — changes are now live.'));
      onCompleted();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to approve edit';
      toast(adminToast.error(message));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!adminNotes.trim()) {
      toast(adminToast.error('Please add admin notes explaining the rejection.'));
      return;
    }
    setIsProcessing(true);
    try {
      await rejectSaleListingEdit({
        listingId,
        editId: String(pendingEdit.id),
        adminNotes,
        sellerId,
        listingTitle: String(current.title ?? 'Listing'),
      });
      setConfirmAction(null);
      toast(adminToast.success('Edit rejected. The live listing was unchanged.'));
      onCompleted();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to reject edit';
      toast(adminToast.error(message));
    } finally {
      setIsProcessing(false);
    }
  };

  if (listingType !== 'sale') return null;

  return (
    <div className="space-y-4 border-2 border-orange-200 rounded-lg p-4 bg-orange-50/40">
      <div className="flex items-center gap-2">
        <Diff className="h-5 w-5 text-orange-600" />
        <h4 className="font-semibold text-orange-900">Pending seller edit — review required</h4>
      </div>
      <p className="text-sm text-orange-800">
        The live listing stays visible until you approve these changes.
      </p>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'current' | 'edit')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="current">Current (live)</TabsTrigger>
          <TabsTrigger value="edit" className="relative">
            Proposed changes
            <Badge className="ml-2 bg-orange-500 text-white text-xs">New</Badge>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="current" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current live version</CardTitle>
            </CardHeader>
            <CardContent>{renderListingBody(current)}</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="edit" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Proposed changes
              </CardTitle>
            </CardHeader>
            <CardContent>{renderListingBody(pendingEdit, true)}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {confirmAction && (
        <div
          className={`p-4 rounded-lg border-2 ${
            confirmAction === 'approve'
              ? 'bg-green-50 border-green-300'
              : 'bg-red-50 border-red-300'
          }`}
        >
          <p
            className={`font-semibold mb-1 ${
              confirmAction === 'approve' ? 'text-green-800' : 'text-red-800'
            }`}
          >
            {confirmAction === 'approve'
              ? 'Approve these listing changes?'
              : 'Reject these listing changes?'}
          </p>
          <p
            className={`text-sm mb-3 ${
              confirmAction === 'approve' ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {confirmAction === 'approve'
              ? 'The proposed version will replace the live listing. Verification badges are recalculated from puppy codes (this may take a few seconds).'
              : 'The live listing stays unchanged. Add admin notes above so the seller knows why.'}
          </p>
          {confirmAction === 'reject' && !adminNotes.trim() && (
            <p className="text-sm text-red-600 mb-3">
              Please add admin notes before rejecting.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isProcessing}
              onClick={() => setConfirmAction(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className={
                confirmAction === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }
              disabled={
                isProcessing ||
                (confirmAction === 'reject' && !adminNotes.trim())
              }
              onClick={() => {
                if (confirmAction === 'approve') void handleApprove();
                else void handleReject();
              }}
            >
              {isProcessing
                ? 'Processing…'
                : confirmAction === 'approve'
                  ? 'Yes, approve changes'
                  : 'Yes, reject changes'}
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="destructive"
          disabled={isProcessing || confirmAction !== null}
          onClick={() => setConfirmAction('reject')}
        >
          <XCircle className="h-4 w-4 mr-2" />
          Reject changes
        </Button>
        <Button
          type="button"
          className="bg-green-600 hover:bg-green-700"
          disabled={isProcessing || confirmAction !== null}
          onClick={() => setConfirmAction('approve')}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Approve changes
        </Button>
      </div>
    </div>
  );
}
