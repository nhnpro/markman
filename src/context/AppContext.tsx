import { createContext, useContext, useMemo, useCallback } from 'react';
import type { AppState, AppAction, Document } from '../types';
import { parseFrontmatter, type DocMeta } from '../data/sampleDoc';
import { useDocumentStore } from '../hooks/useDocumentStore';
import { useHistory } from '../hooks/useHistory';

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  addDocument: (parentId?: string | null) => string;
  activeDoc: Document | null;
  activeMeta: DocMeta;
  activeContent: string;
  updateContent: (content: string) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  handleSave: () => void;
  handleSaveAs: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { state, dispatch, addDocument } = useDocumentStore();
  const history = useHistory();

  const activeDoc = useMemo(
    () => state.documents.find(d => d.id === state.activeDocId) || null,
    [state.documents, state.activeDocId]
  );

  const { meta: activeMeta, content: activeContent } = useMemo(
    () => parseFrontmatter(activeDoc?.content || ''),
    [activeDoc?.content]
  );

  // Update content with history tracking
  const updateContent = useCallback((content: string) => {
    if (!activeDoc) return;
    history.pushState(activeDoc.id, activeDoc.content);
    dispatch({ type: 'UPDATE_DOCUMENT', id: activeDoc.id, content });
  }, [activeDoc, dispatch, history]);

  const handleUndo = useCallback(() => {
    if (!activeDoc) return;
    const prev = history.undo(activeDoc.id, activeDoc.content);
    if (prev !== null) {
      dispatch({ type: 'UPDATE_DOCUMENT', id: activeDoc.id, content: prev });
    }
  }, [activeDoc, dispatch, history]);

  const handleRedo = useCallback(() => {
    if (!activeDoc) return;
    const next = history.redo(activeDoc.id, activeDoc.content);
    if (next !== null) {
      dispatch({ type: 'UPDATE_DOCUMENT', id: activeDoc.id, content: next });
    }
  }, [activeDoc, dispatch, history]);

  const canUndo = activeDoc ? history.canUndo(activeDoc.id) : false;
  const canRedo = activeDoc ? history.canRedo(activeDoc.id) : false;

  const isTauri = !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;

  // Save As: ask user where to save
  const handleSaveAs = useCallback(async () => {
    if (!activeDoc) return;

    if (isTauri) {
      try {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const path = await save({
          defaultPath: `${activeMeta.title || 'document'}.md`,
          filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdx'] }],
        });
        if (!path) return; // cancelled
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('write_file', { path, content: activeDoc.content });
        // Update the doc's filePath so future saves go to this location
        dispatch({ type: 'UPDATE_DOCUMENT', id: activeDoc.id, content: activeDoc.content });
      } catch (err) {
        console.error('Save As failed:', err);
      }
      return;
    }

    // Browser fallback
    try {
      const handle = await (window as unknown as {
        showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle>;
      }).showSaveFilePicker({
        suggestedName: `${activeMeta.title || 'document'}.md`,
        types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(activeDoc.content);
      await writable.close();
    } catch {
      // Cancelled or API not available — fallback to download
      const blob = new Blob([activeDoc.content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeMeta.title || 'document'}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [activeDoc, activeMeta, dispatch, isTauri]);

  // Save: if doc has a local filePath, write to it directly. Otherwise trigger Save As.
  const handleSave = useCallback(async () => {
    if (!activeDoc) return;
    if (activeDoc.filePath && !/^https?:\/\//i.test(activeDoc.filePath) && isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('write_file', { path: activeDoc.filePath, content: activeDoc.content });
      } catch (err) {
        console.error('Save failed:', err);
      }
      return;
    }
    handleSaveAs();
  }, [activeDoc, isTauri, handleSaveAs]);

  const value = useMemo(
    () => ({
      state, dispatch, addDocument, activeDoc, activeMeta, activeContent,
      updateContent, handleUndo, handleRedo, canUndo, canRedo,
      handleSave, handleSaveAs,
    }),
    [state, dispatch, addDocument, activeDoc, activeMeta, activeContent,
     updateContent, handleUndo, handleRedo, canUndo, canRedo,
     handleSave, handleSaveAs]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
