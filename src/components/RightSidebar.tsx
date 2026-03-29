import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useTableOfContents } from '../hooks/useTableOfContents';

interface Props {
  scrollRef: React.RefObject<HTMLElement | null>;
  sourceScrollRef: React.RefObject<HTMLElement | null>;
}

export default function RightSidebar({ scrollRef, sourceScrollRef }: Props) {
  const { activeContent, state, dispatch } = useApp();
  const headings = useTableOfContents(activeContent);

  const handleClick = useCallback((text: string) => {
    if (state.viewMode === 'source') {
      // Source view: find the line containing the heading text
      const container = sourceScrollRef.current;
      if (!container) return;
      // Source view renders lines as divs; find one whose text matches a markdown heading
      const lines = container.querySelectorAll('[data-line]');
      for (const el of lines) {
        const lineText = el.textContent?.trim() || '';
        if (lineText.replace(/^#{1,6}\s*/, '') === text.trim()) {
          const containerRect = container.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          const offset = elRect.top - containerRect.top + container.scrollTop - 16;
          container.scrollTo({ top: offset, behavior: 'smooth' });
          return;
        }
      }
    } else {
      // Preview/Edit view: find by heading element text content
      const container = scrollRef.current;
      if (!container) return;
      const allHeadings = container.querySelectorAll('h1, h2, h3, h4');
      for (const el of allHeadings) {
        if (el.textContent?.trim() === text.trim()) {
          const containerRect = container.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          const offset = elRect.top - containerRect.top + container.scrollTop - 16;
          container.scrollTo({ top: offset, behavior: 'smooth' });
          return;
        }
      }
    }
  }, [scrollRef, sourceScrollRef, state.viewMode]);

  return (
    <div className="h-full flex flex-col bg-white/80 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-stone-200/60 shrink-0">
        <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
          On this page
        </span>
        <button
          onClick={() => dispatch({ type: 'TOGGLE_RIGHT_SIDEBAR' })}
          className="p-1 rounded hover:bg-stone-100 text-stone-400"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Headings list */}
      <div className="flex-1 overflow-y-auto py-2 sidebar-scroll">
        {headings.length === 0 ? (
          <div className="px-4 py-3 text-xs text-stone-400 italic">
            No headings found
          </div>
        ) : (
          <nav className="space-y-0.5">
            {headings.map((h) => (
              <button
                key={h.id}
                onClick={() => handleClick(h.text)}
                className={`w-full text-left px-4 py-1 text-[13px] transition-colors leading-snug hover:text-stone-700 hover:bg-stone-50 rounded-sm ${
                  h.level === 3 ? 'pl-7' : ''
                } text-stone-500`}
              >
                {h.text}
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* Document info */}
      {state.activeDocId && (
        <div className="px-4 py-3 border-t border-stone-200/60 space-y-1 shrink-0">
          <div className="text-[11px] text-stone-400">
            Last edited {new Date(
              state.documents.find(d => d.id === state.activeDocId)?.updatedAt || 0
            ).toLocaleDateString()}
          </div>
        </div>
      )}
    </div>
  );
}
