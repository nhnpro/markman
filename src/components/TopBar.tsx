import { useCallback } from 'react';
import { useApp } from '../context/AppContext';

interface Props {
  onOpenCommandPalette: () => void;
}

export default function TopBar({ onOpenCommandPalette }: Props) {
  const { state, dispatch, activeMeta, activeContent, activeDoc } = useApp();

  const handleExportHTML = useCallback(() => {
    if (!activeDoc) return;
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${activeMeta.title}</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;color:#44403c;line-height:1.6}
h1,h2,h3{color:#1c1917}code{background:#f0fdf4;color:#15803d;padding:2px 6px;border-radius:4px;font-size:13px}
blockquote{border-left:3px solid #fbbf24;padding:8px 16px;margin:16px 0;background:rgba(254,243,199,0.3);font-style:italic}
a{color:#78716c;text-decoration:underline}hr{border:none;border-top:1px solid #e7e5e4;margin:24px 0}
img{max-width:100%;border-radius:8px}</style></head>
<body><h1>${activeMeta.title}</h1>
${document.querySelector('.mdx-editor-wrapper [contenteditable]')?.innerHTML
  || document.querySelector('[class*="prose"]')?.innerHTML
  || '<p>' + activeContent.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>') + '</p>'}
</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeMeta.title || 'document'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeDoc, activeMeta, activeContent]);

  const handleExportMd = useCallback(() => {
    if (!activeDoc) return;
    const blob = new Blob([activeDoc.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeMeta.title || 'document'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeDoc, activeMeta]);

  return (
    <div className={`backdrop-blur-md border-b px-3 py-2 flex items-center gap-2 z-50 shrink-0 transition-colors ${
      state.darkMode
        ? 'bg-stone-900/95 border-stone-700 text-stone-300'
        : 'bg-white/95 border-stone-200 text-stone-400'
    }`}>
      {/* Left sidebar toggle */}
      <button
        onClick={() => dispatch({ type: 'TOGGLE_LEFT_SIDEBAR' })}
        className={`p-1.5 rounded-md transition-colors ${
          state.darkMode ? 'hover:text-stone-200 hover:bg-stone-800' : 'hover:text-stone-600 hover:bg-stone-100'
        }`}
        title="Toggle sidebar (Cmd+\)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {state.leftSidebarOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm min-w-0">
        {activeMeta.breadcrumb && (
          <>
            <span className="truncate">{activeMeta.breadcrumb}</span>
            <span>/</span>
          </>
        )}
        <span className={`font-medium truncate ${state.darkMode ? 'text-stone-200' : 'text-stone-700'}`}>
          {activeMeta.title || 'Untitled'}
        </span>
      </div>

      <div className="flex-1" />

      <button
        onClick={onOpenCommandPalette}
        className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors ${
          state.darkMode ? 'hover:text-stone-200 hover:bg-stone-800' : 'hover:text-stone-600 hover:bg-stone-100'
        }`}
      >
        <kbd className={`px-1.5 py-0.5 rounded border text-[10px] font-mono ${
          state.darkMode ? 'bg-stone-800 border-stone-700' : 'bg-stone-100 border-stone-200'
        }`}>{'\u2318'}K</kbd>
        <span>Search</span>
      </button>

      <div className="flex-1" />

      {/* Export dropdown */}
      <div className="relative group">
        <button className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors ${
          state.darkMode ? 'hover:text-stone-200 hover:bg-stone-800' : 'hover:text-stone-600 hover:bg-stone-100'
        }`}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export
        </button>
        <div className={`absolute right-0 top-full mt-1 rounded-lg shadow-lg border py-1 w-36 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all ${
          state.darkMode ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'
        }`}>
          <button onClick={handleExportHTML} className={`w-full px-3 py-1.5 text-left text-xs ${
            state.darkMode ? 'text-stone-300 hover:bg-stone-700' : 'text-stone-600 hover:bg-stone-100'
          }`}>
            Export as HTML
          </button>
          <button onClick={handleExportMd} className={`w-full px-3 py-1.5 text-left text-xs ${
            state.darkMode ? 'text-stone-300 hover:bg-stone-700' : 'text-stone-600 hover:bg-stone-100'
          }`}>
            Export as Markdown
          </button>
        </div>
      </div>

      {/* Dark mode toggle */}
      <button
        onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}
        className={`p-1.5 rounded-md transition-colors ${
          state.darkMode ? 'hover:text-stone-200 hover:bg-stone-800' : 'hover:text-stone-600 hover:bg-stone-100'
        }`}
        title="Toggle dark mode"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {state.darkMode ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          )}
        </svg>
      </button>

      {/* Source toggle */}
      <button
        onClick={() => dispatch({ type: 'SET_FLIPPED', flipped: !state.isFlipped })}
        className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors ${
          state.darkMode ? 'hover:text-stone-200 hover:bg-stone-800' : 'hover:text-stone-600 hover:bg-stone-100'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        {state.isFlipped ? 'Preview' : 'Source'}
      </button>

      {/* Right sidebar toggle */}
      <button
        onClick={() => dispatch({ type: 'TOGGLE_RIGHT_SIDEBAR' })}
        className={`p-1.5 rounded-md transition-colors ${
          state.darkMode ? 'hover:text-stone-200 hover:bg-stone-800' : 'hover:text-stone-600 hover:bg-stone-100'
        }`}
        title="Toggle outline"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10M4 18h10" />
        </svg>
      </button>
    </div>
  );
}
