import { useState, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { Document } from '../types';

const isMdFile = (name: string) => /\.(md|markdown|mdx)$/i.test(name);

// Module-level flag to track internal sidebar drags
export let isInternalDrag = false;

function importFileToStore(
  file: File,
  breadcrumb: string,
  dispatch: ReturnType<typeof useApp>['dispatch']
) {
  const reader = new FileReader();
  reader.onload = () => {
    const text = reader.result as string;
    const fileName = file.name.replace(/\.(md|markdown|mdx)$/i, '');
    const hasFrontmatter = text.startsWith('---\n');
    const content = hasFrontmatter
      ? text
      : `---\ntitle: ${fileName}\nstatus: Draft\nicon: "\uD83D\uDCC4"\nbreadcrumb: ${breadcrumb}\ncover: \n---\n\n${text}`;
    dispatch({
      type: 'ADD_DOCUMENT',
      doc: {
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: fileName,
        icon: '\uD83D\uDCC4',
        content,
        parentId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isFavorite: false,
        filePath: file.name,
      },
    });
  };
  reader.readAsText(file);
}

async function scanDirectory(
  dirHandle: FileSystemDirectoryHandle,
  path: string,
  dispatch: ReturnType<typeof useApp>['dispatch']
) {
  for await (const entry of (dirHandle as unknown as AsyncIterable<FileSystemHandle>)) {
    if (entry.kind === 'file' && isMdFile(entry.name)) {
      const file = await (entry as FileSystemFileHandle).getFile();
      importFileToStore(file, path, dispatch);
    } else if (entry.kind === 'directory') {
      await scanDirectory(entry as FileSystemDirectoryHandle, `${path} / ${entry.name}`, dispatch);
    }
  }
}

interface TreeItemProps {
  doc: Document;
  depth: number;
  allDocs: Document[];
  selectMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

function isWebUrl(path: string) {
  return /^https?:\/\//i.test(path);
}

async function revealPath(filePath: string) {
  if (isWebUrl(filePath)) {
    window.open(filePath, '_blank');
    return;
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('reveal_in_finder', { path: filePath });
  } catch { /* not in Tauri */ }
}

function TreeItem({ doc, depth, allDocs, selectMode, selectedIds, onToggleSelect }: TreeItemProps) {
  const { state, dispatch } = useApp();
  const [expanded, setExpanded] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  const children = allDocs.filter(d => d.parentId === doc.id);
  const hasChildren = children.length > 0;
  const isActive = state.activeDocId === doc.id;

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  }, []);

  const closeMenu = useCallback(() => {
    setShowMenu(false);
    setMenuPos(null);
  }, []);

  const tooltipText = doc.filePath
    ? `${doc.title}\n${doc.filePath}`
    : doc.title;

  return (
    <div>
      <div
        className={`group flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer transition-colors text-sm ${
          isActive
            ? 'bg-stone-200/70 text-stone-900'
            : 'text-stone-600 hover:bg-stone-100'
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        title={tooltipText}
        draggable={!selectMode}
        onDragStart={(e) => { isInternalDrag = true; e.dataTransfer.setData('application/x-markman-doc', doc.id); e.dataTransfer.setData('text/plain', doc.id); e.dataTransfer.effectAllowed = 'move'; }}
        onDragEnd={() => { isInternalDrag = false; }}
        onClick={() => selectMode ? onToggleSelect?.(doc.id) : dispatch({ type: 'SET_ACTIVE_DOC', id: doc.id })}
        onContextMenu={handleContextMenu}
      >
        {/* Select checkbox */}
        {selectMode && (
          <input
            type="checkbox"
            checked={selectedIds?.has(doc.id) ?? false}
            onChange={() => onToggleSelect?.(doc.id)}
            onClick={(e) => e.stopPropagation()}
            className="w-3.5 h-3.5 rounded border-stone-300 accent-amber-500 shrink-0"
          />
        )}

        {/* Expand chevron */}
        {!selectMode && (
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
        )}

        {/* Icon + Title */}
        <span className="text-base leading-none">{doc.icon}</span>
        <span className="truncate flex-1 text-[13px]">{doc.title}</span>

        {/* Menu button */}
        <button
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-stone-200 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            if (showMenu) { closeMenu(); return; }
            const rect = e.currentTarget.getBoundingClientRect();
            setMenuPos({ x: rect.left, y: rect.bottom + 4 });
            setShowMenu(true);
          }}
        >
          <svg className="w-3.5 h-3.5 text-stone-400" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Context / dropdown menu */}
      {showMenu && menuPos && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeMenu} onContextMenu={(e) => { e.preventDefault(); closeMenu(); }} />
          <div
            className="fixed z-50 bg-white rounded-lg shadow-lg border border-stone-200 py-1 w-44"
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            {doc.filePath && (
              <div className="px-3 py-1.5 text-[10px] text-stone-400 truncate max-w-[220px] border-b border-stone-100 mb-1" title={doc.filePath}>
                {doc.filePath}
              </div>
            )}
            <button
              className="w-full px-3 py-1.5 text-left text-xs text-stone-600 hover:bg-stone-100 flex items-center gap-2"
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: 'TOGGLE_FAVORITE', id: doc.id });
                closeMenu();
              }}
            >
              {doc.isFavorite ? '\u2B50 Unfavorite' : '\u2606 Favorite'}
            </button>
            {doc.filePath && (
              <button
                className="w-full px-3 py-1.5 text-left text-xs text-stone-600 hover:bg-stone-100 flex items-center gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  revealPath(doc.filePath!);
                  closeMenu();
                }}
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                {isWebUrl(doc.filePath) ? 'Open in Browser' : 'Reveal in Finder'}
              </button>
            )}
            <div className="border-t border-stone-100 my-1" />
            <button
              className="w-full px-3 py-1.5 text-left text-xs text-red-500 hover:bg-red-50 flex items-center gap-2"
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: 'DELETE_DOCUMENT', id: doc.id });
                closeMenu();
              }}
            >
              Delete
            </button>
          </div>
        </>
      )}

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

interface FolderGroupProps {
  name: string;
  docs: Document[];
  allDocs: Document[];
  forceExpanded?: boolean | null; // null = use local state
  selectMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

function FolderGroup({ name, docs, allDocs, forceExpanded, selectMode, selectedIds, onToggleSelect }: FolderGroupProps) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = forceExpanded !== null && forceExpanded !== undefined ? forceExpanded : localExpanded;

  const allSelected = selectMode && docs.every(d => selectedIds?.has(d.id));
  const toggleAllInGroup = () => {
    if (!onToggleSelect) return;
    for (const doc of docs) {
      if (allSelected) {
        if (selectedIds?.has(doc.id)) onToggleSelect(doc.id);
      } else {
        if (!selectedIds?.has(doc.id)) onToggleSelect(doc.id);
      }
    }
  };

  return (
    <div>
      <div
        className="w-full flex items-center gap-1 px-2 py-1 rounded-md text-sm text-stone-500 hover:bg-stone-100 transition-colors cursor-pointer"
        onClick={() => selectMode ? toggleAllInGroup() : setLocalExpanded(!localExpanded)}
      >
        {selectMode ? (
          <input
            type="checkbox"
            checked={allSelected ?? false}
            onChange={toggleAllInGroup}
            onClick={(e) => e.stopPropagation()}
            className="w-3.5 h-3.5 rounded border-stone-300 accent-amber-500 shrink-0"
          />
        ) : (
          <svg className={`w-3 h-3 text-stone-400 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
        <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <span className="truncate text-[13px]">{name}</span>
        <span className="text-[10px] text-stone-400 ml-auto shrink-0">{docs.length}</span>
      </div>
      {(expanded || selectMode) && (
        <div>
          {docs.map(doc => (
            <TreeItem key={doc.id} doc={doc} depth={1} allDocs={allDocs} selectMode={selectMode} selectedIds={selectedIds} onToggleSelect={onToggleSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

function getDirectoryName(filePath: string): string | null {
  if (!filePath) return null;
  if (/^https?:\/\//i.test(filePath)) return null;
  const lastSlash = filePath.lastIndexOf('/');
  if (lastSlash <= 0) return null;
  const dir = filePath.substring(0, lastSlash);
  // Use just the last folder name for display
  const parts = dir.split('/');
  return parts[parts.length - 1] || dir;
}

function getDirectoryPath(filePath: string): string | null {
  if (!filePath) return null;
  if (/^https?:\/\//i.test(filePath)) return null;
  const lastSlash = filePath.lastIndexOf('/');
  if (lastSlash <= 0) return null;
  return filePath.substring(0, lastSlash);
}

interface Props {
  onOpenCommandPalette: () => void;
  onOpenAbout: () => void;
}

export default function LeftSidebar({ onOpenCommandPalette, onOpenAbout }: Props) {
  const { state, dispatch, addDocument } = useApp();
  const [showSettings, setShowSettings] = useState(false);
  const [urlInputOpen, setUrlInputOpen] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState('');
  const [urlError, setUrlError] = useState('');
  const [forceExpanded, setForceExpanded] = useState<boolean | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPagesMenu, setShowPagesMenu] = useState(false);
  const [dragOverFav, setDragOverFav] = useState(false);
  const [dragOverPages, setDragOverPages] = useState(false);

  const onToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const deleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    dispatch({ type: 'DELETE_DOCUMENTS', ids: Array.from(selectedIds) });
    exitSelectMode();
  }, [selectedIds, dispatch, exitSelectMode]);

  const removeAllPages = useCallback(() => {
    const allRoot = state.documents.filter(d => d.parentId === null);
    if (!window.confirm(`Remove all ${allRoot.length} pages? This cannot be undone.`)) return;
    dispatch({ type: 'DELETE_DOCUMENTS', ids: allRoot.map(d => d.id) });
    setShowPagesMenu(false);
  }, [state.documents, dispatch]);

  const addFileFromContent = useCallback((filePath: string, content: string) => {
    // Dedup: if already open, just activate
    const existing = state.documents.find(d => d.filePath === filePath);
    if (existing) {
      dispatch({ type: 'SET_ACTIVE_DOC', id: existing.id });
      return;
    }

    const fileName = filePath.split('/').pop()?.replace(/\.(md|markdown|mdx)$/i, '') || 'Untitled';
    const hasFrontmatter = content.startsWith('---\n');
    const fullContent = hasFrontmatter
      ? content
      : `---\ntitle: ${fileName}\nstatus: Draft\nicon: "\uD83D\uDCC4"\nbreadcrumb: Imported\ncover: \n---\n\n${content}`;
    dispatch({
      type: 'ADD_DOCUMENT',
      doc: {
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: fileName,
        icon: '\uD83D\uDCC4',
        content: fullContent,
        parentId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isFavorite: false,
        filePath,
      },
    });
  }, [dispatch, state.documents]);

  // Detect if running in Tauri
  const isTauri = useCallback(() => !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__, []);

  const handleOpenFile = useCallback(async () => {
    if (isTauri()) {
      try {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const selected = await open({
          multiple: true,
          filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdx'] }],
        });
        if (!selected) return;
        const { invoke } = await import('@tauri-apps/api/core');
        const paths = Array.isArray(selected) ? selected : [selected];
        for (const filePath of paths) {
          try {
            const content = await invoke<string>('read_file', { path: filePath });
            addFileFromContent(filePath, content);
          } catch (err) {
            console.error('read_file failed:', err);
          }
        }
      } catch (err) {
        console.error('Tauri open dialog failed:', err);
      }
      return;
    }

    // Browser fallback
    try {
      const handles = await (window as unknown as { showOpenFilePicker: (opts: unknown) => Promise<FileSystemFileHandle[]> }).showOpenFilePicker({
        multiple: true,
        types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md', '.markdown', '.mdx'] } }],
      });
      for (const handle of handles) {
        const file = await handle.getFile();
        importFileToStore(file, 'Imported', dispatch);
      }
    } catch {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.md,.markdown,.mdx';
      input.multiple = true;
      input.onchange = () => {
        if (input.files) {
          for (const file of Array.from(input.files)) {
            importFileToStore(file, 'Imported', dispatch);
          }
        }
      };
      input.click();
    }
  }, [dispatch, addFileFromContent, isTauri]);

  const handleOpenFolder = useCallback(async () => {
    if (isTauri()) {
      try {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const selected = await open({ directory: true });
        if (!selected) return;
        const { invoke } = await import('@tauri-apps/api/core');
        const files = await invoke<[string, string][]>('read_md_files_in_dir', { path: selected });
        for (const [filePath, content] of files) {
          addFileFromContent(filePath, content);
        }
      } catch (err) {
        console.error('Tauri open folder failed:', err);
      }
      return;
    }

    // Browser fallback
    try {
      const dirHandle = await (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
      await scanDirectory(dirHandle, dirHandle.name, dispatch);
    } catch { /* cancelled */ }
  }, [dispatch, addFileFromContent]);

  const handleOpenURL = useCallback(async () => {
    const url = urlInputValue.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setUrlError('Must start with http:// or https://');
      return;
    }
    setUrlError('');

    // Dedup check
    const existing = state.documents.find(d => d.filePath === url);
    if (existing) {
      dispatch({ type: 'SET_ACTIVE_DOC', id: existing.id });
      setUrlInputOpen(false);
      setUrlInputValue('');
      return;
    }

    try {
      let content: string;
      if (isTauri()) {
        const { invoke } = await import('@tauri-apps/api/core');
        content = await invoke<string>('fetch_url', { url });
      } else {
        const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        content = await resp.text();
      }
      addFileFromContent(url, content);
      setUrlInputOpen(false);
      setUrlInputValue('');
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : 'Fetch failed');
    }
  }, [urlInputValue, state.documents, dispatch, addFileFromContent, isTauri]);

  const favorites = state.documents.filter(d => d.isFavorite);
  const rootDocs = state.documents.filter(d => d.parentId === null);

  // Group docs by directory for tree view
  const { ungrouped, groups } = useMemo(() => {
    const ungrouped: Document[] = [];
    const dirMap = new Map<string, { name: string; docs: Document[] }>();

    for (const doc of rootDocs) {
      const dirPath = doc.filePath ? getDirectoryPath(doc.filePath) : null;
      if (!dirPath) {
        ungrouped.push(doc);
      } else {
        const existing = dirMap.get(dirPath);
        if (existing) {
          existing.docs.push(doc);
        } else {
          dirMap.set(dirPath, { name: getDirectoryName(doc.filePath!) || dirPath, docs: [doc] });
        }
      }
    }

    return { ungrouped, groups: Array.from(dirMap.values()) };
  }, [rootDocs]);

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
        <button
          onClick={handleOpenFile}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-stone-500 hover:bg-stone-100 transition-colors text-[13px]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Open File
        </button>
        <button
          onClick={handleOpenFolder}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-stone-500 hover:bg-stone-100 transition-colors text-[13px]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          Open Folder
        </button>
        <button
          onClick={() => { setUrlInputOpen(!urlInputOpen); setUrlError(''); }}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-stone-500 hover:bg-stone-100 transition-colors text-[13px]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Open URL
        </button>
        {urlInputOpen && (
          <div className="px-2 pb-1 space-y-1">
            <div className="flex gap-1">
              <input
                type="url"
                value={urlInputValue}
                onChange={(e) => { setUrlInputValue(e.target.value); setUrlError(''); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleOpenURL();
                  if (e.key === 'Escape') { setUrlInputOpen(false); setUrlInputValue(''); }
                }}
                placeholder="https://...markdown URL"
                className="flex-1 text-xs px-2 py-1 rounded border border-stone-200 outline-none focus:border-amber-400 bg-white min-w-0"
                autoFocus
              />
              <button
                onClick={handleOpenURL}
                className="px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 shrink-0"
              >
                Go
              </button>
            </div>
            {urlError && <div className="text-[10px] text-red-500 px-1">{urlError}</div>}
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-2 py-1 sidebar-scroll">
        {/* Favorites drop zone */}
        <div
          className={`mb-3 rounded-lg transition-colors ${dragOverFav ? 'bg-amber-100/60 ring-2 ring-amber-400/50' : ''}`}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; setDragOverFav(true); }}
          onDragLeave={(e) => {
            // Only clear if leaving the drop zone entirely (not entering a child)
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverFav(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = e.dataTransfer.getData('application/x-markman-doc') || e.dataTransfer.getData('text/plain');
            if (id) {
              const doc = state.documents.find(d => d.id === id);
              if (doc && !doc.isFavorite) dispatch({ type: 'TOGGLE_FAVORITE', id });
            }
            setDragOverFav(false);
          }}
        >
          <div className="px-2 py-1.5 text-[11px] font-semibold text-stone-400 uppercase tracking-wider flex items-center gap-1">
            Favorites
            {dragOverFav && <span className="text-amber-500 text-[10px] normal-case font-normal">Drop to add</span>}
          </div>
          {favorites.length > 0 ? (
            favorites.map(doc => (
              <TreeItem key={doc.id} doc={doc} depth={0} allDocs={state.documents} />
            ))
          ) : (
            <div className="px-2 py-2 text-[11px] text-stone-400 italic">
              {dragOverFav ? 'Release to favorite' : 'Drag pages here'}
            </div>
          )}
        </div>

        {/* All pages — drop zone to unfavorite */}
        <div
          className={`rounded-lg transition-colors ${dragOverPages ? 'bg-stone-100/80 ring-2 ring-stone-300/50' : ''}`}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; setDragOverPages(true); }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverPages(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = e.dataTransfer.getData('application/x-markman-doc') || e.dataTransfer.getData('text/plain');
            if (id) {
              const doc = state.documents.find(d => d.id === id);
              if (doc && doc.isFavorite) dispatch({ type: 'TOGGLE_FAVORITE', id });
            }
            setDragOverPages(false);
          }}
        >
          {/* Pages header with actions */}
          <div className="px-2 py-1.5 flex items-center gap-1">
            <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider flex-1">
              Pages
              {dragOverPages && <span className="text-stone-500 text-[10px] normal-case font-normal ml-1">Drop to unfavorite</span>}
            </span>
            {!selectMode ? (
              <>
                <button
                  onClick={() => setForceExpanded(false)}
                  className="p-0.5 rounded text-stone-400 hover:text-stone-600 hover:bg-stone-200"
                  title="Fold all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                <button
                  onClick={() => setForceExpanded(true)}
                  className="p-0.5 rounded text-stone-400 hover:text-stone-600 hover:bg-stone-200"
                  title="Unfold all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                </button>
                <button
                  onClick={() => { setSelectMode(true); setForceExpanded(true); }}
                  className="p-0.5 rounded text-stone-400 hover:text-stone-600 hover:bg-stone-200"
                  title="Select pages"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowPagesMenu(!showPagesMenu)}
                    className="p-0.5 rounded text-stone-400 hover:text-stone-600 hover:bg-stone-200"
                    title="More actions"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
                  </button>
                  {showPagesMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowPagesMenu(false)} />
                      <div className="absolute right-0 top-6 z-50 bg-white rounded-lg shadow-lg border border-stone-200 py-1 w-36">
                        <button
                          className="w-full px-3 py-1.5 text-left text-xs text-red-500 hover:bg-red-50"
                          onClick={removeAllPages}
                        >
                          Remove All Pages
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={exitSelectMode}
                className="text-[10px] text-stone-500 hover:text-stone-700 px-1"
              >
                Cancel
              </button>
            )}
          </div>

          {ungrouped.map(doc => (
            <TreeItem key={doc.id} doc={doc} depth={0} allDocs={state.documents} selectMode={selectMode} selectedIds={selectedIds} onToggleSelect={onToggleSelect} />
          ))}
          {groups.map(group => (
            <FolderGroup key={group.name} name={group.name} docs={group.docs} allDocs={state.documents} forceExpanded={forceExpanded} selectMode={selectMode} selectedIds={selectedIds} onToggleSelect={onToggleSelect} />
          ))}
        </div>
      </div>

      {/* Select mode action bar */}
      {selectMode && selectedIds.size > 0 && (
        <div className="px-3 py-2 border-t border-stone-200/60 flex items-center gap-2 bg-stone-50">
          <span className="text-xs text-stone-600 flex-1">{selectedIds.size} selected</span>
          <button
            onClick={deleteSelected}
            className="px-2.5 py-1 text-xs text-white bg-red-500 hover:bg-red-600 rounded"
          >
            Delete
          </button>
          <button
            onClick={exitSelectMode}
            className="px-2.5 py-1 text-xs text-stone-600 bg-stone-200 hover:bg-stone-300 rounded"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Settings */}
      <div className="relative px-2 py-2 border-t border-stone-200/60">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-stone-500 hover:bg-stone-100 transition-colors text-[13px]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </button>

        {showSettings && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
            <div className="absolute bottom-full left-2 right-2 mb-1 z-50 bg-white rounded-lg shadow-lg border border-stone-200 py-1">
              {/* Dark mode */}
              <button
                className="w-full px-3 py-1.5 text-left text-xs text-stone-600 hover:bg-stone-100 flex items-center justify-between"
                onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {state.darkMode ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    )}
                  </svg>
                  {state.darkMode ? 'Light Mode' : 'Dark Mode'}
                </span>
              </button>

              <div className="border-t border-stone-100 my-1" />

              {/* Keyboard shortcuts */}
              <div className="px-3 py-1.5 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">Shortcuts</div>
              <div className="px-3 pb-1 space-y-0.5">
                {[
                  ['\u2318E', 'Cycle view mode'],
                  ['\u2318K', 'Command palette'],
                  ['\u2318\\', 'Toggle left sidebar'],
                  ['\u2318\u21E7\\', 'Toggle right sidebar'],
                  ['\u2318Z', 'Undo'],
                  ['\u2318\u21E7Z', 'Redo'],
                  ['\u2318S', 'Save'],
                ].map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between text-[11px] text-stone-500 py-0.5">
                    <span>{label}</span>
                    <kbd className="px-1 py-0.5 rounded text-[9px] font-mono bg-stone-100 border border-stone-200">{key}</kbd>
                  </div>
                ))}
              </div>

              <div className="border-t border-stone-100 my-1" />

              {/* About */}
              <button
                className="w-full px-3 py-1.5 text-left text-xs text-stone-600 hover:bg-stone-100 flex items-center gap-2"
                onClick={() => { setShowSettings(false); onOpenAbout(); }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                About MarkMan
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
