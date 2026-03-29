import { useRef, useCallback } from 'react';
import type { DocMeta } from '../data/sampleDoc';
import SourceView, { type SourceViewHandle } from './SourceView';

interface Props {
  meta: DocMeta;
  content: string;
  rawContent?: string;
  onContentChange?: (content: string) => void;
}

export default function RenderedView({ meta, rawContent, onContentChange }: Props) {
  const sourceRef = useRef<SourceViewHandle>(null);

  // Status badge color
  const statusColor = meta.status === 'Published'
    ? 'bg-green-50 text-green-700 border-green-200'
    : meta.status === 'Draft'
    ? 'bg-stone-100 text-stone-600 border-stone-200'
    : meta.status === 'In Progress'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-red-50 text-red-600 border-red-200';

  const handleFormat = useCallback((action: 'bold' | 'italic' | 'code' | 'link') => {
    sourceRef.current?.applyFormat(action);
  }, []);

  return (
    <div className="bg-white min-h-full flex flex-col">
      {/* Cover Image */}
      {meta.cover && (
        <div className="h-52 w-full overflow-hidden relative shrink-0">
          <img src={meta.cover} alt="Cover" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent" />
        </div>
      )}

      <div className="max-w-3xl mx-auto px-8 py-6 w-full shrink-0">
        {/* Breadcrumb */}
        {meta.breadcrumb && (
          <div className="mb-4">
            <span className="inline-flex items-center gap-1.5 text-sm text-stone-400 bg-stone-100 px-2.5 py-1 rounded-md">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {meta.breadcrumb}
            </span>
          </div>
        )}

        {/* Title */}
        <h1 className="text-4xl font-bold text-stone-900 mb-4 tracking-tight">
          {meta.title}
        </h1>

        {/* Properties */}
        <div className="flex items-center gap-4 mb-4 text-sm text-stone-500">
          <div className="flex items-center gap-2">
            <span className="text-stone-400">Properties</span>
          </div>
          {meta.status && (
            <div className="flex items-center gap-2">
              <span className="text-stone-400">{meta.icon} Status</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}>
                {meta.status}
              </span>
            </div>
          )}
        </div>

        {/* Formatting toolbar */}
        <div className="flex items-center gap-1 mb-2 px-1 py-1.5 rounded-lg border border-stone-200 bg-stone-50/80">
          <ToolbarBtn onClick={() => handleFormat('bold')} title="Bold (Cmd+B)">
            <span className="font-bold text-xs">B</span>
          </ToolbarBtn>
          <ToolbarBtn onClick={() => handleFormat('italic')} title="Italic (Cmd+I)">
            <span className="italic text-xs">I</span>
          </ToolbarBtn>
          <ToolbarBtn onClick={() => handleFormat('code')} title="Code">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
          </ToolbarBtn>
          <ToolbarBtn onClick={() => handleFormat('link')} title="Link">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
          </ToolbarBtn>
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 min-h-[400px]">
        <SourceView
          ref={sourceRef}
          raw={rawContent || ''}
          onContentChange={onContentChange}
        />
      </div>
    </div>
  );
}

function ToolbarBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className="px-2 py-1 rounded text-stone-500 hover:text-stone-700 hover:bg-stone-200 transition-colors"
    >
      {children}
    </button>
  );
}
