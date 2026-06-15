
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Save, FolderOpen, Trash2, Plus, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Draft {
  id: string;
  draft_name: string;
  form_data: any;
  created_at: string;
  updated_at: string;
}

interface DraftManagerProps {
  drafts: Draft[];
  currentDraftId: string | null;
  isAutoSaving: boolean;
  lastSaved: Date | null;
  onSaveDraft: (name: string) => void;
  onLoadDraft: (draft: Draft) => void;
  onDeleteDraft: (draftId: string) => void;
  onCreateNew: () => void;
}

const DraftManager: React.FC<DraftManagerProps> = ({
  drafts,
  currentDraftId,
  isAutoSaving,
  lastSaved,
  onSaveDraft,
  onLoadDraft,
  onDeleteDraft,
  onCreateNew,
}) => {
  const [draftName, setDraftName] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);

  const handleSaveDraft = () => {
    if (draftName.trim()) {
      onSaveDraft(draftName.trim());
      setDraftName('');
      setSaveDialogOpen(false);
    }
  };

  const handleLoadDraft = (draft: Draft) => {
    onLoadDraft(draft);
    setLoadDialogOpen(false);
  };

  const handleDeleteDraft = async (draftId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Simple confirmation using browser's built-in confirm dialog
    if (window.confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
      try {
        await onDeleteDraft(draftId);
      } catch (error) {
        console.error('Error deleting draft:', error);
      }
    }
  };

  const currentDraft = drafts.find(d => d.id === currentDraftId);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 p-4 bg-gray-50 rounded-lg border">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Clock className="h-4 w-4 flex-shrink-0" />
        {isAutoSaving ? (
          <span className="text-blue-600">Saving...</span>
        ) : lastSaved ? (
          <span>Last saved {formatDistanceToNow(lastSaved, { addSuffix: true })}</span>
        ) : (
          <span>Not saved</span>
        )}
        {currentDraft && (
          <>
            <span>•</span>
            <span className="truncate">Current: {currentDraft.draft_name}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Save className="h-4 w-4 mr-1" />
              Save Draft
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Draft</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Enter draft name"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveDraft()}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveDraft} disabled={!draftName.trim()}>
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <FolderOpen className="h-4 w-4 mr-1" />
              Load Draft
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Load Draft</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {drafts.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No drafts found</p>
              ) : (
                drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 ${
                      draft.id === currentDraftId ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{draft.draft_name}</h4>
                      <p className="text-sm text-gray-500">
                        Updated {formatDistanceToNow(new Date(draft.updated_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLoadDraft(draft)}
                        disabled={draft.id === currentDraftId}
                      >
                        {draft.id === currentDraftId ? 'Current' : 'Load'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => handleDeleteDraft(draft.id, e)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" size="sm" onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-1" />
          New
        </Button>
      </div>
    </div>
  );
};

export default DraftManager;
