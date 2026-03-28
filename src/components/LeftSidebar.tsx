import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Document } from '../types';

interface TreeItemProps {
  doc: Document;
  depth: number;
  allDocs: Document[];
}

function TreeItem({ doc, depth, allDocs }: TreeItemProps) {
  const { state, dispatch } = useApp();
  const [expanded, setExpanded] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  const children = allDocs.filter(d => d.parentId === doc.id);
  const hasChildren = children.length > 0;
  const isActive = state.activeDocId === doc.id;

  return (
    <div>
      <div
        className={`group flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer transition-colors text-sm ${
          isActive
            ? 'bg-stone-200/70 text-stone-900'
            : 'text-stone-600 hover:bg-stone-100'
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => dispatch({ type: 'SET_ACTIVE_DOC', id: doc.id })}
      >
        {/* Expand chevron */}
        <button
          className={`w-4 h-4 flex items-center justify-center shrink-0 rounded hover:bg-stone-200 transition-transform ${
            hasChildren ? '' : 'invisible'
          } ${expanded ? 'rotate-90' : ''}`}
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        >
          <svg className="w-3 h-3 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Icon + Title */}
        <span className="text-base leading-none">{doc.icon}</span>
        <span className="truncate flex-1 text-[13px]">{doc.title}</span>

        {/* Menu button */}
        <div className="relative">
          <button
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-stone-200 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          >
            <svg className="w-3.5 h-3.5 text-stone-400" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-6 z-50 bg-white rounded-lg shadow-lg border border-stone-200 py-1 w-36">
                <button
                  className="w-full px-3 py-1.5 text-left text-xs text-stone-600 hover:bg-stone-100 flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: 'TOGGLE_FAVORITE', id: doc.id });
                    setShowMenu(false);
                  }}
                >
                  {doc.isFavorite ? '\u2B50 Unfavorite' : '\u2606 Favorite'}
                </button>
                <button
                  className="w-full px-3 py-1.5 text-left text-xs text-red-500 hover:bg-red-50 flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: 'DELETE_DOCUMENT', id: doc.id });
                    setShowMenu(false);
                  }}
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div>
          {children.map(child => (
            <TreeItem key={child.id} doc={child} depth={depth + 1} allDocs={allDocs} />
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  onOpenCommandPalette: () => void;
}

export default function LeftSidebar({ onOpenCommandPalette }: Props) {
  const { state, dispatch, addDocument } = useApp();

  const favorites = state.documents.filter(d => d.isFavorite);
  const rootDocs = state.documents.filter(d => d.parentId === null);

  return (
    <div className="h-full flex flex-col bg-stone-50/80 overflow-hidden">
      {/* Workspace header */}
      <div className="px-3 py-3 flex items-center gap-2 border-b border-stone-200/60">
        <div className="w-6 h-6 rounded bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
          M
        </div>
        <span className="text-sm font-semibold text-stone-800 truncate flex-1">MarkMan</span>
        <button
          onClick={() => dispatch({ type: 'TOGGLE_LEFT_SIDEBAR' })}
          className="p-1 rounded hover:bg-stone-200 text-stone-400"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Quick actions */}
      <div className="px-2 pt-2 pb-1 space-y-0.5">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-stone-500 hover:bg-stone-100 transition-colors text-[13px]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Search
        </button>
        <button
          onClick={() => addDocument()}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-stone-500 hover:bg-stone-100 transition-colors text-[13px]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Page
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-2 py-1 sidebar-scroll">
        {/* Favorites */}
        {favorites.length > 0 && (
          <div className="mb-3">
            <div className="px-2 py-1.5 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
              Favorites
            </div>
            {favorites.map(doc => (
              <TreeItem key={doc.id} doc={doc} depth={0} allDocs={state.documents} />
            ))}
          </div>
        )}

        {/* All pages */}
        <div>
          <div className="px-2 py-1.5 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
            Pages
          </div>
          {rootDocs.map(doc => (
            <TreeItem key={doc.id} doc={doc} depth={0} allDocs={state.documents} />
          ))}
        </div>
      </div>

      {/* Bottom */}
      <div className="px-3 py-2 border-t border-stone-200/60">
        <div className="flex items-center gap-2 text-[11px] text-stone-400">
          <div className="w-5 h-5 rounded-full bg-stone-300 flex items-center justify-center text-white text-[9px] font-bold">A</div>
          <span className="truncate">My Workspace</span>
        </div>
      </div>
    </div>
  );
}
