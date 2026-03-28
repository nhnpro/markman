import { useApp } from '../context/AppContext';

interface Props {
  onOpenCommandPalette: () => void;
}

export default function TopBar({ onOpenCommandPalette }: Props) {
  const { state, dispatch, activeMeta } = useApp();

  return (
    <div className="bg-white/95 backdrop-blur-md border-b border-stone-200 px-3 py-2 flex items-center gap-2 z-50 shrink-0">
      {/* Left sidebar toggle */}
      <button
        onClick={() => dispatch({ type: 'TOGGLE_LEFT_SIDEBAR' })}
        className="p-1.5 rounded-md text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
        title="Toggle sidebar"
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
      <div className="flex items-center gap-1.5 text-sm text-stone-400 min-w-0">
        {activeMeta.breadcrumb && (
          <>
            <span className="truncate">{activeMeta.breadcrumb}</span>
            <span>/</span>
          </>
        )}
        <span className="text-stone-700 font-medium truncate">{activeMeta.title || 'Untitled'}</span>
      </div>

      {/* Center shortcuts */}
      <div className="flex-1" />

      <button
        onClick={onOpenCommandPalette}
        className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 px-2 py-1 rounded-md hover:bg-stone-100 transition-colors"
      >
        <kbd className="bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200 text-[10px] font-mono">{'\u2318'}K</kbd>
        <span>Search</span>
      </button>

      <div className="flex-1" />

      {/* Right side */}
      <button
        onClick={() => dispatch({ type: 'SET_FLIPPED', flipped: !state.isFlipped })}
        className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 px-2 py-1 rounded-md hover:bg-stone-100 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        {state.isFlipped ? 'Preview' : 'Source'}
      </button>

      {/* Right sidebar toggle */}
      <button
        onClick={() => dispatch({ type: 'TOGGLE_RIGHT_SIDEBAR' })}
        className="p-1.5 rounded-md text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
        title="Toggle outline"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10M4 18h10" />
        </svg>
      </button>
    </div>
  );
}
