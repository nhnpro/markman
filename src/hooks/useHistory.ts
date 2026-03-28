import { useRef, useCallback } from 'react';

interface HistoryState {
  past: string[];
  future: string[];
}

const MAX_HISTORY = 100;

export function useHistory() {
  // Per-document history keyed by doc ID
  const histories = useRef<Record<string, HistoryState>>({});

  const getHistory = (docId: string): HistoryState => {
    if (!histories.current[docId]) {
      histories.current[docId] = { past: [], future: [] };
    }
    return histories.current[docId];
  };

  const pushState = useCallback((docId: string, content: string) => {
    const h = getHistory(docId);
    h.past.push(content);
    if (h.past.length > MAX_HISTORY) h.past.shift();
    h.future = []; // clear redo stack on new change
  }, []);

  const undo = useCallback((docId: string, currentContent: string): string | null => {
    const h = getHistory(docId);
    if (h.past.length === 0) return null;
    const prev = h.past.pop()!;
    h.future.push(currentContent);
    return prev;
  }, []);

  const redo = useCallback((docId: string, currentContent: string): string | null => {
    const h = getHistory(docId);
    if (h.future.length === 0) return null;
    const next = h.future.pop()!;
    h.past.push(currentContent);
    return next;
  }, []);

  const canUndo = useCallback((docId: string): boolean => {
    return (histories.current[docId]?.past.length ?? 0) > 0;
  }, []);

  const canRedo = useCallback((docId: string): boolean => {
    return (histories.current[docId]?.future.length ?? 0) > 0;
  }, []);

  return { pushState, undo, redo, canUndo, canRedo };
}
