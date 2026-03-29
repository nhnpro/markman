import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenPath?: (path: string) => void;
}

function detectInputType(q: string): 'url' | 'filepath' | null {
  const trimmed = q.trim();
  if (/^https?:\/\//i.test(trimmed)) return 'url';
  if (/^[\/~]/.test(trimmed) || /^[A-Z]:\\/i.test(trimmed)) return 'filepath';
  return null;
}

export default function CommandPalette({ isOpen, onClose, onOpenPath }: Props) {
  const { state, dispatch } = useApp();
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const inputType = detectInputType(query);

  const results = query.trim()
    ? state.documents.filter(d =>
        d.title.toLowerCase().includes(query.toLowerCase())
      )
    : state.documents;

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  const select = useCallback((id: string) => {
    dispatch({ type: 'SET_ACTIVE_DOC', id });
    onClose();
  }, [dispatch, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIdx(i => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIdx(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (inputType && selectedIdx === 0) {
          onOpenPath?.(query.trim());
          onClose();
        } else {
          const docIdx = inputType ? selectedIdx - 1 : selectedIdx;
          if (results[docIdx]) select(results[docIdx].id);
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[18vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />

      {/* Palette */}
      <div className="relative bg-white rounded-xl shadow-2xl border border-stone-200 w-[520px] max-w-[90vw] overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-100">
          <svg className="w-5 h-5 text-stone-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages..."
            className="flex-1 text-sm text-stone-800 placeholder:text-stone-400 outline-none bg-transparent"
          />
          <kbd className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[320px] overflow-y-auto py-1">
          {/* Open URL/File action */}
          {inputType && (
            <button
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                selectedIdx === 0
                  ? 'bg-amber-50 text-amber-900'
                  : 'text-stone-600 hover:bg-stone-50'
              }`}
              onClick={() => { onOpenPath?.(query.trim()); onClose(); }}
              onMouseEnter={() => setSelectedIdx(0)}
            >
              <span className="text-lg">{inputType === 'url' ? '\uD83C\uDF10' : '\uD83D\uDCC2'}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">Open {inputType === 'url' ? 'URL' : 'File'}</div>
                <div className="text-[11px] text-stone-400 truncate">{query.trim()}</div>
              </div>
              <kbd className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200 font-mono">{'\u21B5'}</kbd>
            </button>
          )}
          {results.length === 0 && !inputType ? (
            <div className="px-4 py-6 text-center text-sm text-stone-400">
              No results found
            </div>
          ) : (
            results.map((doc, i) => {
              const idx = inputType ? i + 1 : i;
              return (
                <button
                  key={doc.id}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    idx === selectedIdx
                      ? 'bg-stone-100 text-stone-900'
                      : 'text-stone-600 hover:bg-stone-50'
                  }`}
                  onClick={() => select(doc.id)}
                  onMouseEnter={() => setSelectedIdx(idx)}
                >
                  <span className="text-lg">{doc.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{doc.title}</div>
                    {doc.parentId && (
                      <div className="text-[11px] text-stone-400 truncate">
                        in {state.documents.find(d => d.id === doc.parentId)?.title || 'Pages'}
                      </div>
                    )}
                  </div>
                  {doc.isFavorite && (
                    <span className="text-amber-400 text-xs">{'\u2605'}</span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer hints */}
        <div className="px-4 py-2 border-t border-stone-100 flex items-center gap-4 text-[11px] text-stone-400">
          <span className="flex items-center gap-1">
            <kbd className="bg-stone-100 px-1 py-0.5 rounded text-[10px] font-mono">{'\u2191\u2193'}</kbd> Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-stone-100 px-1 py-0.5 rounded text-[10px] font-mono">{'\u21B5'}</kbd> Open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-stone-100 px-1 py-0.5 rounded text-[10px] font-mono">ESC</kbd> Close
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
