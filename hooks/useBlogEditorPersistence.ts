'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type BlogEditorFormData = {
  title: string;
  description: string;
  content: string;
  category: string[];
  status: string;
  image: string;
  featured: boolean;
  author: string;
};

type SaveStatus = 'idle' | 'local' | 'saving' | 'saved' | 'error';

const SERVER_AUTOSAVE_MS = 45000;

function storageKey(mode: 'edit' | 'new', postId?: string) {
  return `dq_blog_editor_${mode}_${postId ?? 'new'}`;
}

function legacySlugStorageKey(slug: string) {
  return `dq_blog_editor_edit_${slug}`;
}

function snapshot(data: BlogEditorFormData) {
  return JSON.stringify(data);
}

function writeBackup(key: string, data: BlogEditorFormData) {
  const payload = JSON.stringify({
    formData: data,
    savedAt: new Date().toISOString(),
  });
  localStorage.setItem(key, payload);
  sessionStorage.setItem(key, payload);
}

function readBackup(key: string): BlogEditorFormData | null {
  if (typeof window === 'undefined') return null;

  const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
  if (!raw) return null;

  try {
    const backup = JSON.parse(raw) as { formData?: BlogEditorFormData };
    return backup.formData ?? null;
  } catch {
    return null;
  }
}

function readLocalBackup(
  mode: 'edit' | 'new',
  postId?: string,
  legacySlug?: string,
): BlogEditorFormData | null {
  const primary = readBackup(storageKey(mode, postId));
  if (primary) return primary;

  if (mode === 'edit' && legacySlug) {
    const legacy = readBackup(legacySlugStorageKey(legacySlug));
    if (legacy && postId) {
      writeBackup(storageKey(mode, postId), legacy);
    }
    return legacy;
  }

  return null;
}

export function useBlogEditorPersistence({
  mode,
  postId,
  legacySlug,
  formData,
  setFormData,
  ready = true,
}: {
  mode: 'edit' | 'new';
  postId?: string;
  legacySlug?: string;
  formData: BlogEditorFormData;
  setFormData: React.Dispatch<React.SetStateAction<BlogEditorFormData>>;
  serverUpdatedAt?: string | null;
  ready?: boolean;
}) {
  const { toast } = useToast();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const baselineRef = useRef<string>('');
  const lastWrittenHashRef = useRef<string>('');
  const lastServerHashRef = useRef<string>('');
  const hasUnsavedChangesRef = useRef(false);
  const restoredRef = useRef(false);
  const serverTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  const persistLocally = useCallback(
    (data: BlogEditorFormData, force = false) => {
      if (typeof window === 'undefined') return;
      const currentHash = snapshot(data);
      if (!force && currentHash === baselineRef.current) return;
      if (!force && currentHash === lastWrittenHashRef.current) return;

      try {
        writeBackup(storageKey(mode, postId), data);
        lastWrittenHashRef.current = currentHash;
        setSaveStatus('local');
        setLastSavedAt(new Date());
      } catch (error) {
        console.error('Failed to persist blog draft locally:', error);
      }
    },
    [mode, postId],
  );

  const flushLocalBackup = useCallback(() => {
    persistLocally(formDataRef.current, true);
  }, [persistLocally]);

  const clearBackup = useCallback(() => {
    if (typeof window === 'undefined') return;
    const key = storageKey(mode, postId);
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
    baselineRef.current = snapshot(formData);
    lastWrittenHashRef.current = baselineRef.current;
    lastServerHashRef.current = baselineRef.current;
    setHasUnsavedChanges(false);
    hasUnsavedChangesRef.current = false;
    setSaveStatus('saved');
    setLastSavedAt(new Date());
  }, [formData, mode, postId]);

  const hydrateFromServer = useCallback(
    (serverData: BlogEditorFormData, slugForLegacy?: string): BlogEditorFormData => {
      const serverSnapshot = snapshot(serverData);
      baselineRef.current = serverSnapshot;
      lastServerHashRef.current = serverSnapshot;

      const backup = readLocalBackup(
        mode,
        postId,
        slugForLegacy ?? legacySlug,
      );
      if (!backup) {
        lastWrittenHashRef.current = serverSnapshot;
        setHasUnsavedChanges(false);
        hasUnsavedChangesRef.current = false;
        return serverData;
      }

      const backupSnapshot = snapshot(backup);
      if (backupSnapshot === serverSnapshot) {
        lastWrittenHashRef.current = serverSnapshot;
        setHasUnsavedChanges(false);
        hasUnsavedChangesRef.current = false;
        return serverData;
      }

      lastWrittenHashRef.current = backupSnapshot;
      setHasUnsavedChanges(true);
      hasUnsavedChangesRef.current = true;
      setSaveStatus('local');

      if (!restoredRef.current) {
        restoredRef.current = true;
        toast({
          title: 'Draft restored',
          description:
            'Recovered unsaved edits from your browser after a refresh or interrupted session.',
        });
      }

      return backup;
    },
    [legacySlug, mode, postId, toast],
  );

  const autosaveToServer = useCallback(async () => {
    if (mode !== 'edit' || !postId || !ready) return;

    const currentHash = snapshot(formData);
    if (currentHash === lastServerHashRef.current) return;

    setSaveStatus('saving');
    try {
      const { error } = await supabase
        .from('blog_posts')
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId);

      if (error) {
        setSaveStatus('error');
        return;
      }

      lastServerHashRef.current = currentHash;
      setSaveStatus('saved');
      setLastSavedAt(new Date());
    } catch (error) {
      console.error('Blog autosave error:', error);
      setSaveStatus('error');
    }
  }, [formData, mode, ready, postId]);

  useEffect(() => {
    if (mode !== 'new' || restoredRef.current || !ready) return;

    const backup = readLocalBackup(mode, postId);
    if (!backup) return;

    const backupSnapshot = snapshot(backup);
    const emptySnapshot = snapshot(formData);
    if (backupSnapshot === emptySnapshot) return;

    restoredRef.current = true;
    baselineRef.current = emptySnapshot;
    lastWrittenHashRef.current = backupSnapshot;
    setHasUnsavedChanges(true);
    hasUnsavedChangesRef.current = true;
    setSaveStatus('local');
    setFormData(backup);
    toast({
      title: 'Draft restored',
      description:
        'Recovered unsaved edits from your browser after a refresh or interrupted session.',
    });
  }, [formData, mode, postId, ready, setFormData, toast]);

  useEffect(() => {
    if (mode === 'edit' && !postId) return;

    const currentHash = snapshot(formData);
    const dirty = baselineRef.current !== '' && currentHash !== baselineRef.current;
    setHasUnsavedChanges(dirty);
    hasUnsavedChangesRef.current = dirty;

    if (dirty) {
      persistLocally(formData);
    }
  }, [formData, mode, persistLocally, postId]);

  useEffect(() => {
    if (!ready || mode !== 'edit') return;

    serverTimerRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void autosaveToServer();
      }
    }, SERVER_AUTOSAVE_MS);

    return () => {
      if (serverTimerRef.current) clearInterval(serverTimerRef.current);
    };
  }, [autosaveToServer, mode, ready]);

  useEffect(() => {
    const handlePageHide = () => flushLocalBackup();
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      flushLocalBackup();
      if (!hasUnsavedChangesRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [flushLocalBackup]);

  const saveStatusLabel = (() => {
    switch (saveStatus) {
      case 'saving':
        return 'Autosaving…';
      case 'saved':
        return lastSavedAt
          ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : 'Saved';
      case 'local':
        return 'Draft backed up in browser';
      case 'error':
        return 'Autosave issue — work kept locally';
      default:
        return hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved';
    }
  })();

  return {
    hasUnsavedChanges,
    saveStatus,
    saveStatusLabel,
    lastSavedAt,
    hydrateFromServer,
    clearBackup,
    autosaveToServer,
  };
}
