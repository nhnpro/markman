import { createContext, useContext, useMemo } from 'react';
import type { AppState, AppAction, Document } from '../types';
import { parseFrontmatter, type DocMeta } from '../data/sampleDoc';
import { useDocumentStore } from '../hooks/useDocumentStore';

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  addDocument: (parentId?: string | null) => string;
  activeDoc: Document | null;
  activeMeta: DocMeta;
  activeContent: string;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { state, dispatch, addDocument } = useDocumentStore();

  const activeDoc = useMemo(
    () => state.documents.find(d => d.id === state.activeDocId) || null,
    [state.documents, state.activeDocId]
  );

  const { meta: activeMeta, content: activeContent } = useMemo(
    () => parseFrontmatter(activeDoc?.content || ''),
    [activeDoc?.content]
  );

  const value = useMemo(
    () => ({ state, dispatch, addDocument, activeDoc, activeMeta, activeContent }),
    [state, dispatch, addDocument, activeDoc, activeMeta, activeContent]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
