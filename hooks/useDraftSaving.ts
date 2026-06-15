import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Draft {
  id: string;
  draft_name: string;
  form_data: any;
  created_at: string;
  updated_at: string;
  draft_type?: string;
}

export const useDraftSaving = (formValues: any, currentUser: any, draftType: 'business' | 'stud' | 'sale' | 'showcase' = 'business', initialDraftId?: string) => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(initialDraftId || null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { toast } = useToast();
  const lastSavedHashRef = useRef<string | null>(null);
  
  // Storage key for persisting draft ID
  const STORAGE_KEY = `dq_current_draft_${draftType}`;

  // Determine table name based on draft type
  const getTableName = () => {
    switch (draftType) {
      case 'stud':
        return 'stud_listing_drafts';
      case 'sale':
        return 'sale_listing_drafts';
      case 'showcase':
        return 'showcase_listing_drafts';
      case 'business':
      default:
        return 'business_listing_drafts';
    }
  };

  // Load all drafts for the current user
  const loadDrafts = useCallback(async () => {
    if (!currentUser) return;

    try {
      const tableName = getTableName();
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('user_id', currentUser.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      const normalized = (data || []).map((d: any) => ({
        ...d,
        draft_type: d?.draft_type ?? undefined,
        email: d?.email ?? undefined,
      }));
      setDrafts(normalized as Draft[]);
    } catch (error) {
      console.error('Error loading drafts:', error);
    }
  }, [currentUser, draftType]);

  // Initialize from localStorage or initialDraftId
  useEffect(() => {
    if (initialDraftId) {
      setCurrentDraftId(initialDraftId);
      localStorage.setItem(STORAGE_KEY, initialDraftId);
    } else {
      const savedDraftId = localStorage.getItem(STORAGE_KEY);
      if (savedDraftId) {
        setCurrentDraftId(savedDraftId);
      }
    }
  }, [initialDraftId, STORAGE_KEY]);

  // Helper function to serialize form data including image previews
  const serializeFormData = useCallback((formData: any) => {
    const isFile = (val: any) => typeof File !== 'undefined' && (val instanceof File || val instanceof Blob);

    const sanitize = (data: any): any => {
      if (data === null || data === undefined) return null;
      if (data instanceof Date) return data.toISOString();
      if (isFile(data)) return null;
      if (Array.isArray(data)) return data.map(sanitize);
      if (typeof data === 'object') {
        const out: any = {};
        for (const key of Object.keys(data)) {
          const val = (data as any)[key];
          if (key === 'file' && isFile(val)) {
            // drop raw file blobs
            out[key] = null;
            continue;
          }
          out[key] = sanitize(val);
        }
        // Compact common { url, name, file } shapes: keep url and name only
        if ('url' in out && typeof out.url === 'string') {
          const compact: any = { url: out.url };
          if (typeof out.name === 'string') compact.name = out.name;
          return compact;
        }
        return out;
      }
      return data;
    };

    const cleaned = sanitize(formData);
    return cleaned;
  }, []);

  // Auto-save draft with change detection
  const autoSaveDraft = useCallback(async (draftName?: string) => {
    if (!currentUser) {
      return;
    }
    
    if (!formValues || Object.keys(formValues).length === 0) {
      return;
    }
    try {
      const serializedFormData = serializeFormData(formValues);
      const currentHash = JSON.stringify(serializedFormData);
      
      // Skip if nothing changed
      if (currentHash === lastSavedHashRef.current) {

        return;
      }

      // Only flip UI state if we are actually going to write
      setIsAutoSaving(true);
      
      const tableName = getTableName();
      const autoDraftName = draftName || 'Auto-saved Draft';
      
      const draftData: any = {
        user_id: currentUser.id,
        draft_name: autoDraftName,
        form_data: serializedFormData
      };
      
      // Only add draft_type for tables that have this column (not sale_listing_drafts)
      if (tableName !== 'sale_listing_drafts') {
        draftData.draft_type = draftType;
      }

      let draftIdToUse = currentDraftId;

      // If no current draft ID, check if there's already an auto-save draft for this user
      if (!draftIdToUse) {
        const { data: existingDrafts } = await supabase
          .from(tableName)
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('draft_name', autoDraftName)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (existingDrafts && existingDrafts.length > 0) {
          draftIdToUse = existingDrafts[0].id;
          setCurrentDraftId(draftIdToUse);
          localStorage.setItem(STORAGE_KEY, draftIdToUse);
        }
      }

      if (draftIdToUse) {
        // Update existing draft
        const { error } = await supabase
          .from(tableName)
          .update({ 
            form_data: serializedFormData, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', draftIdToUse);

        if (error) {
          console.error('[Draft Save] Update error:', error);
          throw error;
        }
      } else {
        // Create new draft only if no existing auto-save found
        const { data, error } = await supabase
          .from(tableName)
          .insert(draftData)
          .select()
          .single();

        if (error) {
          console.error('[Draft Save] Insert error:', error);
          throw error;
        }
        if (data) {
          setCurrentDraftId(data.id);
          localStorage.setItem(STORAGE_KEY, data.id);
        }
      }

      lastSavedHashRef.current = currentHash;
      setLastSaved(new Date());
      // Avoid reloading the entire drafts list on every auto-save (this can spam network and UI).
    } catch (error) {
      console.error('[Draft Save] Error auto-saving draft:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [currentUser, formValues, currentDraftId, loadDrafts, serializeFormData, draftType, STORAGE_KEY]);

  // Save draft with custom name
  const saveDraft = useCallback(async (draftName: string) => {
    if (!currentUser || !formValues) return;

    try {
      const serializedFormData = serializeFormData(formValues);
      const tableName = getTableName();
      
      const draftData: any = {
        user_id: currentUser.id,
        draft_name: draftName,
        form_data: serializedFormData
      };
      
      // Only add draft_type for tables that have this column (not sale_listing_drafts)
      if (tableName !== 'sale_listing_drafts') {
        draftData.draft_type = draftType;
      }

      if (currentDraftId) {
        // Update existing draft
        const { error } = await supabase
          .from(tableName)
          .update({ 
            draft_name: draftName, 
            form_data: serializedFormData 
          })
          .eq('id', currentDraftId);

        if (error) throw error;
      } else {
        // Create new draft
        const { data, error } = await supabase
          .from(tableName)
          .insert(draftData)
          .select()
          .single();

        if (error) throw error;
        if (data) setCurrentDraftId(data.id);
      }

      toast({
        title: "Draft saved",
        description: `"${draftName}" has been saved successfully.`,
      });

      await loadDrafts();
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "Error saving draft",
        description: "There was a problem saving your draft. Please try again.",
        variant: "destructive",
      });
    }
  }, [currentUser, formValues, currentDraftId, loadDrafts, toast, serializeFormData, draftType]);

  // Load a specific draft
  const loadDraft = useCallback((draft: Draft) => {

    setCurrentDraftId(draft.id);
    return draft.form_data;
  }, []);

  // Delete a draft
  const deleteDraft = useCallback(async (draftId: string) => {
    try {
      const tableName = getTableName();
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', draftId);

      if (error) throw error;

      if (currentDraftId === draftId) {
        setCurrentDraftId(null);
        localStorage.removeItem(STORAGE_KEY);
      }

      toast({
        title: "Draft deleted",
        description: "The draft has been deleted successfully.",
      });

      await loadDrafts();
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast({
        title: "Error deleting draft",
        description: "There was a problem deleting the draft. Please try again.",
        variant: "destructive",
      });
    }
  }, [currentDraftId, loadDrafts, toast, draftType, STORAGE_KEY]);

  // Create new draft (reset current draft)
  const createNewDraft = useCallback(() => {
    setCurrentDraftId(null);
    setLastSaved(null);
    localStorage.removeItem(STORAGE_KEY);
    lastSavedHashRef.current = null;
  }, [STORAGE_KEY]);

  // Load drafts on mount
  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  return {
    drafts,
    currentDraftId,
    isAutoSaving,
    lastSaved,
    autoSaveDraft,
    saveDraft,
    loadDraft,
    deleteDraft,
    createNewDraft,
    loadDrafts,
  };
};
