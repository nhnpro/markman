import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useApp } from '../context/AppContext';
import TopBar from './TopBar';
import LeftSidebar, { isInternalDrag } from './LeftSidebar';
import RightSidebar from './RightSidebar';
import PageFlip from './PageFlip';
import PreviewView from './PreviewView';
import SourceView, { type SourceViewHandle } from './SourceView';
import CommandPalette from './CommandPalette';
import AboutDialog from './AboutDialog';

const RenderedView = lazy(() => import('./RenderedView'));

// Convert GitHub/GitLab page URLs to raw content URLs
function toRawUrl(url: string): string {
  // GitHub: https://github.com/user/repo/blob/branch/path/file.md
  //      → https://raw.githubusercontent.com/user/repo/branch/path/file.md
  const ghMatch = url.match(/^https?:\/\/github\.com\/([^/]+\/[^/]+)\/blob\/(.+)$/);
  if (ghMatch) return `https://raw.githubusercontent.com/${ghMatch[1]}/${ghMatch[2]}`;

  // GitLab: https://gitlab.com/user/repo/-/blob/branch/path/file.md
  //      → https://gitlab.com/user/repo/-/raw/branch/path/file.md
  const glMatch = url.match(/^(https?:\/\/[^/]*gitlab[^/]*\/[^/]+\/[^/]+)\/-\/blob\/(.+)$/);
  if (glMatch) return `${glMatch[1]}/-/raw/${glMatch[2]}`;

  // Bitbucket: https://bitbucket.org/user/repo/src/branch/path/file.md
  //         → https://bitbucket.org/user/repo/raw/branch/path/file.md
  const bbMatch = url.match(/^(https?:\/\/bitbucket\.org\/[^/]+\/[^/]+)\/src\/(.+)$/);
  if (bbMatch) return `${bbMatch[1]}/raw/${bbMatch[2]}`;

  return url;
}

export default function Layout() {
  const { state, dispatch, activeDoc, activeMeta, activeContent, updateContent, handleUndo, handleRedo, handleSave, handleSaveAs } = useApp();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sourceScrollRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<SourceViewHandle>(null);

  // Helper to import a file from a path (Tauri only)
  const importFromPath = useCallback(async (filePath: string) => {
    // Check if this file is already open — just activate it
    const existing = state.documents.find(d => d.filePath === filePath);
    if (existing) {
      dispatch({ type: 'SET_ACTIVE_DOC', id: existing.id });
      return;
    }

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const content = await invoke<string>('read_file', { path: filePath });
      const fileName = filePath.split('/').pop()?.replace(/\.(md|markdown|mdx)$/i, '') || 'Untitled';
      const hasFrontmatter = content.startsWith('---\n');
      const fullContent = hasFrontmatter
        ? content
        : `---\ntitle: ${fileName}\nstatus: Draft\nicon: "\uD83D\uDCC4"\nbreadcrumb: Opened\ncover: \n---\n\n${content}`;
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
    } catch (err) {
      console.error('Failed to read file:', err);
    }
  }, [dispatch, state.documents]);

  // Refs to avoid stale closures in Tauri event listeners
  const fetchAndOpenUrlRef = useRef<(url: string) => void>(() => {});
  const importFromPathRef = useRef(importFromPath);
  importFromPathRef.current = importFromPath;

  // Listen for Tauri events: open-file (double-click), drop-files (drag-drop), drag enter/leave
  useEffect(() => {
    const unlisteners: (() => void)[] = [];
    (async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        const { invoke } = await import('@tauri-apps/api/core');

        // Check for pending file from app launch (double-click open)
        try {
          const pending = await invoke<string | null>('get_pending_file');
          if (pending) importFromPathRef.current(pending);
        } catch { /* no pending file */ }

        // File opened via double-click
        const u1 = await listen<string>('open-file', (event) => {
          importFromPathRef.current(event.payload);
        });
        unlisteners.push(u1 as unknown as () => void);

        // Files/folders dropped onto window
        const u2 = await listen<string[]>('drop-files', (event) => {
          for (const filePath of event.payload) {
            importFromPathRef.current(filePath);
          }
          setIsDragOver(false);
        });
        unlisteners.push(u2 as unknown as () => void);

        // URL dropped from browser
        const u5 = await listen<string>('drop-url', (event) => {
          fetchAndOpenUrlRef.current(event.payload);
          setIsDragOver(false);
        });
        unlisteners.push(u5 as unknown as () => void);

        // Drag enter/leave for overlay — skip if internal sidebar drag
        const u3 = await listen('drag-enter', () => { if (!isInternalDrag) setIsDragOver(true); });
        unlisteners.push(u3 as unknown as () => void);
        const u4 = await listen('drag-leave', () => setIsDragOver(false));
        unlisteners.push(u4 as unknown as () => void);
      } catch {
        // Not running in Tauri — web drag-drop still works via HTML5 API
      }
    })();
    return () => unlisteners.forEach(u => u());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  // File drop handling — only show overlay for external drags (files/URLs), not internal sidebar drags
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInternalDrag) return;
    if (e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes('text/uri-list')) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const isMdFile = (name: string) =>
    /\.(md|markdown|mdx)$/i.test(name);

  const importFile = useCallback((file: File, breadcrumb: string) => {
    // Use file name as dedup key for web drag-drop (no real path available)
    const fileKey = file.name;
    const existing = state.documents.find(d => d.filePath === fileKey);
    if (existing) {
      dispatch({ type: 'SET_ACTIVE_DOC', id: existing.id });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const fileName = file.name.replace(/\.(md|markdown|mdx)$/i, '');

      const hasFrontmatter = text.startsWith('---\n');
      const content = hasFrontmatter
        ? text
        : `---\ntitle: ${fileName}\nstatus: Draft\nicon: "\uD83D\uDCC4"\nbreadcrumb: ${breadcrumb}\ncover: \n---\n\n${text}`;

      const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      dispatch({
        type: 'ADD_DOCUMENT',
        doc: {
          id,
          title: fileName,
          icon: '\uD83D\uDCC4',
          content,
          parentId: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isFavorite: false,
          filePath: fileKey,
        },
      });
    };
    reader.readAsText(file);
  }, [dispatch, state.documents]);

  const readDirectory = useCallback((dirEntry: FileSystemDirectoryEntry, path: string) => {
    const dirReader = dirEntry.createReader();
    const readBatch = () => {
      dirReader.readEntries((entries) => {
        if (entries.length === 0) return;
        for (const entry of entries) {
          if (entry.isFile && isMdFile(entry.name)) {
            (entry as FileSystemFileEntry).file((file) => {
              importFile(file, path);
            });
          } else if (entry.isDirectory) {
            readDirectory(entry as FileSystemDirectoryEntry, `${path} / ${entry.name}`);
          }
        }
        readBatch(); // directories may return entries in batches
      });
    };
    readBatch();
  }, [importFile]);

  const fetchAndOpenUrl = useCallback(async (url: string) => {
    // Check dedup with original URL first
    const existing = state.documents.find(d => d.filePath === url);
    if (existing) {
      dispatch({ type: 'SET_ACTIVE_DOC', id: existing.id });
      return;
    }
    // Convert GitHub/GitLab URLs to raw content URLs
    const rawUrl = toRawUrl(url);
    // Also check dedup with raw URL
    if (rawUrl !== url) {
      const existingRaw = state.documents.find(d => d.filePath === rawUrl || d.filePath === url);
      if (existingRaw) {
        dispatch({ type: 'SET_ACTIVE_DOC', id: existingRaw.id });
        return;
      }
    }
    try {
      let content: string;
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        content = await invoke<string>('fetch_url', { url: rawUrl });
      } catch {
        const resp = await fetch(rawUrl, { signal: AbortSignal.timeout(15000) });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        content = await resp.text();
      }
      const fileName = url.split('/').pop()?.replace(/\.(md|markdown|mdx)$/i, '') || 'Untitled';
      const hasFrontmatter = content.startsWith('---\n');
      const fullContent = hasFrontmatter
        ? content
        : `---\ntitle: ${fileName}\nstatus: Draft\nicon: "\uD83D\uDCC4"\nbreadcrumb: Web\ncover: \n---\n\n${content}`;
      dispatch({
        type: 'ADD_DOCUMENT',
        doc: {
          id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: fileName,
          icon: '\uD83C\uDF10',
          content: fullContent,
          parentId: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isFavorite: false,
          filePath: url,
        },
      });
    } catch (err) {
      console.error('Failed to fetch URL:', err);
    }
  }, [state.documents, dispatch]);

  // Keep ref in sync
  fetchAndOpenUrlRef.current = fetchAndOpenUrl;

  const openPathOrUrl = useCallback((input: string) => {
    if (/^https?:\/\//i.test(input)) {
      fetchAndOpenUrl(input);
    } else {
      importFromPath(input);
    }
  }, [fetchAndOpenUrl, importFromPath]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // Check for URL drops first
    const textData = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (textData && /^https?:\/\//i.test(textData.trim())) {
      const url = textData.trim().split('\n')[0].trim();
      fetchAndOpenUrl(url);
      return;
    }

    const items = e.dataTransfer.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (!entry) continue;

        if (entry.isFile && isMdFile(entry.name)) {
          (entry as FileSystemFileEntry).file((file) => {
            importFile(file, 'Imported');
          });
        } else if (entry.isDirectory) {
          readDirectory(entry as FileSystemDirectoryEntry, entry.name);
        }
      }
    } else {
      // Fallback for browsers without webkitGetAsEntry
      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        if (isMdFile(file.name)) {
          importFile(file, 'Imported');
        }
      }
    }
  }, [importFile, readDirectory, fetchAndOpenUrl]);

  const handleContentChange = useCallback((content: string) => {
    updateContent(content);
  }, [updateContent]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && zenMode) {
        e.preventDefault();
        setZenMode(false);
        return;
      }
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'e':
            e.preventDefault();
            dispatch({ type: 'CYCLE_VIEW_MODE' });
            break;
          case 'k':
            e.preventDefault();
            setPaletteOpen(p => !p);
            break;
          case '\\':
            e.preventDefault();
            if (e.shiftKey) {
              dispatch({ type: 'TOGGLE_RIGHT_SIDEBAR' });
            } else {
              dispatch({ type: 'TOGGLE_LEFT_SIDEBAR' });
            }
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
            break;
          case 's':
            e.preventDefault();
            if (e.shiftKey) {
              handleSaveAs();
            } else {
              handleSave();
            }
            break;
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dispatch, state.viewMode, zenMode]);

  // Word count & reading time
  const wordCount = activeContent ? activeContent.split(/\s+/).filter(Boolean).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // Apply dark mode to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.darkMode);
  }, [state.darkMode]);

  return (
    <div
      className={`h-screen flex flex-col relative transition-colors ${
        state.darkMode ? 'bg-stone-900' : 'bg-stone-100'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-[200] bg-amber-50/80 backdrop-blur-sm flex items-center justify-center cursor-pointer" onClick={() => setIsDragOver(false)}>
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-dashed border-amber-400 px-12 py-10 text-center">
            <svg className="w-12 h-12 text-amber-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <div className="text-lg font-semibold text-stone-800">Drop .md files or URLs here</div>
            <div className="text-sm text-stone-500 mt-1">They'll be added as new pages</div>
          </div>
        </div>
      )}

      {!zenMode && <TopBar onOpenCommandPalette={openPalette} onOpenAbout={() => setAboutOpen(true)} onToggleZen={() => setZenMode(true)} />}

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        {!zenMode && (
          <div
            className={`shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
              state.leftSidebarOpen ? 'w-[260px]' : 'w-0'
            } ${state.darkMode ? 'border-r border-stone-700/60' : 'border-r border-stone-200/60'}`}
          >
            <div className="w-[260px] h-full">
              <LeftSidebar onOpenCommandPalette={openPalette} onOpenAbout={() => setAboutOpen(true)} />
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
          <div className={`flex-1 overflow-hidden ${zenMode ? 'p-0' : 'p-4 md:p-6'}`}>
            <div className={`w-full h-full overflow-hidden ${zenMode ? '' : 'rounded-xl shadow-lg shadow-stone-200/50 border border-stone-200/60'}`}>
              {activeDoc ? (
                <PageFlip
                  key={activeDoc.id}
                  frontContent={
                    <div ref={scrollRef} className="h-full overflow-auto">
                      {state.viewMode === 'edit' ? (
                        <Suspense fallback={<div className="flex items-center justify-center h-full text-stone-400 text-sm">Loading editor...</div>}>
                          <RenderedView
                            meta={activeMeta}
                            content={activeContent}
                            rawContent={activeDoc.content}
                            onContentChange={handleContentChange}
                          />
                        </Suspense>
                      ) : (
                        <PreviewView meta={activeMeta} content={activeContent} />
                      )}
                    </div>
                  }
                  backContent={
                    <div ref={sourceScrollRef} className="h-full overflow-auto">
                      <SourceView
                        ref={sourceRef}
                        raw={activeDoc.content}
                        onContentChange={handleContentChange}
                      />
                    </div>
                  }
                  isFlipped={state.viewMode === 'source'}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-stone-400 text-sm">
                  Select a document or create a new one
                </div>
              )}
            </div>
          </div>

          {/* Bottom bar */}
          {!zenMode && <div className={`backdrop-blur-sm border-t px-3 py-2 flex items-center gap-1 shrink-0 transition-colors ${
            state.darkMode ? 'bg-stone-900/95 border-stone-700' : 'bg-white/95 border-stone-200'
          }`}>
            {/* View mode tabs */}
            <div className={`flex items-center rounded-lg p-0.5 ${state.darkMode ? 'bg-stone-800' : 'bg-stone-100'}`}>
              {([
                { mode: 'preview' as const, label: 'Preview', icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></> },
                { mode: 'edit' as const, label: 'Edit', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /> },
                { mode: 'source' as const, label: 'Source', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /> },
              ]).map(({ mode, label, icon }) => (
                <button
                  key={mode}
                  onClick={() => dispatch({ type: 'SET_VIEW_MODE', mode })}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 flex items-center gap-1.5 ${
                    state.viewMode === mode
                      ? (state.darkMode ? 'bg-stone-700 text-stone-200 shadow-sm' : 'bg-white text-stone-800 shadow-sm')
                      : (state.darkMode ? 'text-stone-400 hover:text-stone-300' : 'text-stone-500 hover:text-stone-600')
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{icon}</svg>
                  {label}
                </button>
              ))}
            </div>

            <kbd className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ml-2 ${
              state.darkMode ? 'bg-stone-800 border-stone-700 text-stone-500' : 'bg-stone-100 border-stone-200 text-stone-400'
            }`}>{'\u2318'}E</kbd>

            {/* Word count & reading time */}
            <div className={`text-[11px] tabular-nums ml-3 ${state.darkMode ? 'text-stone-500' : 'text-stone-400'}`}>
              {wordCount} words &middot; {readingTime} min read
            </div>

            <div className="flex-1" />
          </div>}
        </div>

        {/* Right Sidebar */}
        {!zenMode && <div
          className={`shrink-0 border-l border-stone-200/60 transition-all duration-300 ease-in-out overflow-hidden ${
            state.rightSidebarOpen ? 'w-[240px]' : 'w-0 border-l-0'
          }`}
        >
          <div className="w-[240px] h-full">
            <RightSidebar scrollRef={scrollRef} sourceScrollRef={sourceScrollRef} />
          </div>
        </div>}
      </div>

      {/* Zen mode escape button */}
      {zenMode && (
        <button
          onClick={() => setZenMode(false)}
          className={`fixed top-3 right-3 z-50 p-2 rounded-full transition-opacity opacity-20 hover:opacity-100 ${
            state.darkMode ? 'bg-stone-800 text-stone-300 hover:bg-stone-700' : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
          }`}
          title="Exit zen mode (Esc)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Command Palette */}
      <CommandPalette isOpen={paletteOpen} onClose={closePalette} onOpenPath={openPathOrUrl} />
      <AboutDialog isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
