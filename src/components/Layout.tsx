import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import TopBar from './TopBar';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import PageFlip from './PageFlip';
import RenderedView from './RenderedView';
import PreviewView from './PreviewView';
import SourceView, { type SourceViewHandle } from './SourceView';
import CommandPalette from './CommandPalette';
import AboutDialog from './AboutDialog';

export default function Layout() {
  const { state, dispatch, activeDoc, activeMeta, activeContent, updateContent, handleUndo, handleRedo, handleSave, handleSaveAs } = useApp();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [cursorLine, setCursorLine] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<SourceViewHandle>(null);

  // Helper to import a file from a path (Tauri only)
  const importFromPath = useCallback(async (filePath: string) => {
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
        },
      });
    } catch (err) {
      console.error('Failed to read file:', err);
    }
  }, [dispatch]);

  // Listen for Tauri events: open-file (double-click), drop-files (drag-drop), drag enter/leave
  useEffect(() => {
    const unlisteners: (() => void)[] = [];
    (async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');

        // File opened via double-click
        const u1 = await listen<string>('open-file', (event) => {
          importFromPath(event.payload);
        });
        unlisteners.push(u1 as unknown as () => void);

        // Files/folders dropped onto window
        const u2 = await listen<string[]>('drop-files', (event) => {
          for (const filePath of event.payload) {
            importFromPath(filePath);
          }
          setIsDragOver(false);
        });
        unlisteners.push(u2 as unknown as () => void);

        // Drag enter/leave for overlay
        const u3 = await listen('drag-enter', () => setIsDragOver(true));
        unlisteners.push(u3 as unknown as () => void);
        const u4 = await listen('drag-leave', () => setIsDragOver(false));
        unlisteners.push(u4 as unknown as () => void);
      } catch {
        // Not running in Tauri — web drag-drop still works via HTML5 API
      }
    })();
    return () => unlisteners.forEach(u => u());
  }, [importFromPath]);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  // File drop handling
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only hide if leaving the root container
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const isMdFile = (name: string) =>
    /\.(md|markdown|mdx)$/i.test(name);

  const importFile = useCallback((file: File, breadcrumb: string) => {
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
        },
      });
    };
    reader.readAsText(file);
  }, [dispatch]);

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

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
  }, [importFile, readDirectory]);

  const handleContentChange = useCallback((content: string) => {
    updateContent(content);
  }, [updateContent]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'e':
            e.preventDefault();
            dispatch({ type: 'SET_FLIPPED', flipped: !state.isFlipped });
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
  }, [dispatch, state.isFlipped]);

  // Animate cursor in source view
  useEffect(() => {
    if (!state.isFlipped || !activeDoc) return;
    const lines = activeDoc.content.split('\n');
    let line = 0;
    const interval = setInterval(() => {
      line = (line + 1) % lines.length;
      setCursorLine(line);
    }, 800);
    return () => clearInterval(interval);
  }, [state.isFlipped, activeDoc]);

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
        <div className="absolute inset-0 z-[200] bg-amber-50/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-dashed border-amber-400 px-12 py-10 text-center">
            <svg className="w-12 h-12 text-amber-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <div className="text-lg font-semibold text-stone-800">Drop .md files here</div>
            <div className="text-sm text-stone-500 mt-1">They'll be added as new pages</div>
          </div>
        </div>
      )}

      <TopBar onOpenCommandPalette={openPalette} onOpenAbout={() => setAboutOpen(true)} />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div
          className={`shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
            state.leftSidebarOpen ? 'w-[260px]' : 'w-0'
          } ${state.darkMode ? 'border-r border-stone-700/60' : 'border-r border-stone-200/60'}`}
        >
          <div className="w-[260px] h-full">
            <LeftSidebar onOpenCommandPalette={openPalette} />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
          <div className="flex-1 overflow-hidden p-4 md:p-6">
            <div className="w-full max-w-4xl mx-auto h-full rounded-xl overflow-hidden shadow-lg shadow-stone-200/50 border border-stone-200/60">
              {activeDoc ? (
                <PageFlip
                  key={activeDoc.id}
                  frontContent={
                    <div ref={scrollRef} className="h-full overflow-auto">
                      {state.editMode ? (
                        <RenderedView
                          meta={activeMeta}
                          content={activeContent}
                          rawContent={activeDoc.content}
                          onContentChange={handleContentChange}
                        />
                      ) : (
                        <PreviewView meta={activeMeta} content={activeContent} />
                      )}
                    </div>
                  }
                  backContent={
                    <div className="h-full overflow-auto">
                      <SourceView
                        ref={sourceRef}
                        raw={activeDoc.content}
                        cursorLine={cursorLine}
                        onContentChange={handleContentChange}
                      />
                    </div>
                  }
                  isFlipped={state.isFlipped}
                  onFlipChange={(f) => dispatch({ type: 'SET_FLIPPED', flipped: f })}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-stone-400 text-sm">
                  Select a document or create a new one
                </div>
              )}
            </div>
          </div>

          {/* Bottom bar */}
          <div className={`backdrop-blur-sm border-t px-3 py-2 flex items-center gap-1 shrink-0 transition-colors ${
            state.darkMode ? 'bg-stone-900/95 border-stone-700' : 'bg-white/95 border-stone-200'
          }`}>
            {/* Edit / Preview toggle */}
            <div className={`flex items-center rounded-lg p-0.5 ${state.darkMode ? 'bg-stone-800' : 'bg-stone-100'}`}>
              <button
                onClick={() => { if (state.editMode) dispatch({ type: 'TOGGLE_EDIT_MODE' }); }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 flex items-center gap-1.5 ${
                  !state.editMode
                    ? (state.darkMode ? 'bg-stone-700 text-stone-200 shadow-sm' : 'bg-white text-stone-800 shadow-sm')
                    : (state.darkMode ? 'text-stone-400 hover:text-stone-300' : 'text-stone-500 hover:text-stone-600')
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview
              </button>
              <button
                onClick={() => { if (!state.editMode) dispatch({ type: 'TOGGLE_EDIT_MODE' }); }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 flex items-center gap-1.5 ${
                  state.editMode
                    ? (state.darkMode ? 'bg-stone-700 text-stone-200 shadow-sm' : 'bg-white text-stone-800 shadow-sm')
                    : (state.darkMode ? 'text-stone-400 hover:text-stone-300' : 'text-stone-500 hover:text-stone-600')
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
            </div>

            {/* Word count & reading time */}
            <div className={`text-[11px] tabular-nums ml-3 ${state.darkMode ? 'text-stone-500' : 'text-stone-400'}`}>
              {wordCount} words &middot; {readingTime} min read
            </div>

            <div className="flex-1" />

            {/* Source toggle */}
            <button
              onClick={() => dispatch({ type: 'SET_FLIPPED', flipped: !state.isFlipped })}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 flex items-center gap-1.5 ${
                state.isFlipped
                  ? (state.darkMode ? 'bg-stone-700 text-stone-200 shadow-sm' : 'bg-stone-200 text-stone-800 shadow-sm')
                  : (state.darkMode ? 'text-stone-400 hover:text-stone-300 hover:bg-stone-800' : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100')
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              {state.isFlipped ? 'Preview' : 'Source'}
              <kbd className={`px-1 py-0.5 rounded text-[9px] font-mono border ml-1 ${
                state.darkMode ? 'bg-stone-800 border-stone-700' : 'bg-stone-100 border-stone-200'
              }`}>{'\u2318'}E</kbd>
            </button>
          </div>
        </div>

        {/* Right Sidebar */}
        <div
          className={`shrink-0 border-l border-stone-200/60 transition-all duration-300 ease-in-out overflow-hidden ${
            state.rightSidebarOpen ? 'w-[240px]' : 'w-0 border-l-0'
          }`}
        >
          <div className="w-[240px] h-full">
            <RightSidebar scrollRef={scrollRef} />
          </div>
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette isOpen={paletteOpen} onClose={closePalette} />
      <AboutDialog isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
