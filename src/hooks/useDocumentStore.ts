import { useReducer, useEffect, useRef, useCallback } from 'react';
import type { AppState, AppAction, Document } from '../types';
import { sampleDocuments } from '../data/sampleDocs';

const STORAGE_KEY = 'mkdviewer_state_v3';

function loadState(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.documents?.length > 0) {
        return {
          documents: parsed.documents,
          activeDocId: parsed.activeDocId || parsed.documents[0].id,
          leftSidebarOpen: parsed.leftSidebarOpen ?? true,
          rightSidebarOpen: parsed.rightSidebarOpen ?? true,
          viewMode: parsed.viewMode ?? 'preview',
          darkMode: parsed.darkMode ?? false,
        };
      }
    }
  } catch { /* ignore */ }

  return {
    documents: sampleDocuments,
    activeDocId: sampleDocuments[0].id,
    leftSidebarOpen: true,
    rightSidebarOpen: true,
    viewMode: 'preview' as const,
    darkMode: false,
  };
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ACTIVE_DOC':
      return { ...state, activeDocId: action.id, viewMode: 'preview' as const };

    case 'ADD_DOCUMENT':
      return {
        ...state,
        documents: [...state.documents, action.doc],
        activeDocId: action.doc.id,
        viewMode: 'preview' as const,
      };

    case 'UPDATE_DOCUMENT':
      return {
        ...state,
        documents: state.documents.map(d =>
          d.id === action.id
            ? { ...d, content: action.content, updatedAt: Date.now() }
            : d
        ),
      };

    case 'DELETE_DOCUMENT': {
      const remaining = state.documents.filter(d => d.id !== action.id && d.parentId !== action.id);
      return {
        ...state,
        documents: remaining,
        activeDocId: state.activeDocId === action.id
          ? (remaining[0]?.id || null)
          : state.activeDocId,
      };
    }

    case 'DELETE_DOCUMENTS': {
      const idSet = new Set(action.ids);
      const remaining = state.documents.filter(d => !idSet.has(d.id) && !idSet.has(d.parentId ?? ''));
      return {
        ...state,
        documents: remaining,
        activeDocId: idSet.has(state.activeDocId ?? '')
          ? (remaining[0]?.id || null)
          : state.activeDocId,
      };
    }

    case 'TOGGLE_FAVORITE':
      return {
        ...state,
        documents: state.documents.map(d =>
          d.id === action.id ? { ...d, isFavorite: !d.isFavorite } : d
        ),
      };

    case 'TOGGLE_LEFT_SIDEBAR':
      return { ...state, leftSidebarOpen: !state.leftSidebarOpen };

    case 'TOGGLE_RIGHT_SIDEBAR':
      return { ...state, rightSidebarOpen: !state.rightSidebarOpen };

    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.mode };

    case 'CYCLE_VIEW_MODE': {
      const modes: Array<'preview' | 'edit' | 'source'> = ['preview', 'edit', 'source'];
      const idx = modes.indexOf(state.viewMode);
      return { ...state, viewMode: modes[(idx + 1) % 3] };
    }

    case 'TOGGLE_DARK_MODE':
      return { ...state, darkMode: !state.darkMode };

    default:
      return state;
  }
}

export function useDocumentStore() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Auto-save to localStorage (debounced)
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        documents: state.documents,
        activeDocId: state.activeDocId,
        leftSidebarOpen: state.leftSidebarOpen,
        rightSidebarOpen: state.rightSidebarOpen,
      }));
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [state.documents, state.activeDocId, state.leftSidebarOpen, state.rightSidebarOpen]);

  const addDocument = useCallback((parentId: string | null = null) => {
    const id = `doc-${Date.now()}`;
    const doc: Document = {
      id,
      title: 'Untitled',
      icon: '\uD83D\uDCC4',
      content: `---\ntitle: Untitled\nstatus: Draft\nicon: "\uD83D\uDCC4"\nbreadcrumb: Pages\ncover: \n---\n\nStart writing here...\n`,
      parentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
    };
    dispatch({ type: 'ADD_DOCUMENT', doc });
    return id;
  }, []);

  return { state, dispatch, addDocument };
}
