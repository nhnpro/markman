import { useRef, useEffect, useCallback } from 'react';
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  linkPlugin,
  linkDialogPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  ListsToggle,
  CreateLink,
  UndoRedo,
  CodeToggle,
  Separator,
  type MDXEditorMethods,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import type { DocMeta } from '../data/sampleDoc';

interface Props {
  meta: DocMeta;
  content: string;
  rawContent?: string;
  onContentChange?: (content: string) => void;
}

export default function RenderedView({ meta, content, rawContent, onContentChange }: Props) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const lastExternalContent = useRef(content);

  // Update editor when document switches (content changes externally)
  useEffect(() => {
    if (content !== lastExternalContent.current) {
      editorRef.current?.setMarkdown(content);
      lastExternalContent.current = content;
    }
  }, [content]);

  const handleChange = useCallback((md: string) => {
    if (!rawContent || !onContentChange) return;
    lastExternalContent.current = md;

    // Reconstruct the full document with frontmatter
    const fmMatch = rawContent.match(/^(---\n[\s\S]*?\n---\n)/);
    const frontmatter = fmMatch ? fmMatch[1] : '';
    onContentChange(frontmatter + md);
  }, [rawContent, onContentChange]);

  // Status badge color
  const statusColor = meta.status === 'Published'
    ? 'bg-green-50 text-green-700 border-green-200'
    : meta.status === 'Draft'
    ? 'bg-stone-100 text-stone-600 border-stone-200'
    : meta.status === 'In Progress'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-red-50 text-red-600 border-red-200';

  return (
    <div className="bg-white min-h-full">
      {/* Cover Image */}
      {meta.cover && (
        <div className="h-52 w-full overflow-hidden relative">
          <img src={meta.cover} alt="Cover" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent" />
        </div>
      )}

      <div className="max-w-3xl mx-auto px-8 py-6">
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
        <div className="flex items-center gap-4 mb-6 text-sm text-stone-500">
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

        {/* MDXEditor WYSIWYG */}
        <div className="mdx-editor-wrapper -mx-3">
          <MDXEditor
            ref={editorRef}
            markdown={content}
            onChange={handleChange}
            contentEditableClassName="prose prose-stone max-w-none prose-headings:font-semibold prose-h2:text-xl prose-h3:text-lg prose-p:text-[15px] prose-p:leading-relaxed prose-p:text-stone-600 prose-li:text-[15px] prose-li:text-stone-600 prose-a:text-stone-500 prose-a:underline prose-blockquote:border-amber-400 prose-blockquote:bg-amber-50/50 prose-blockquote:italic prose-code:bg-green-50 prose-code:text-green-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[13px] prose-code:font-mono prose-code:border prose-code:border-green-200 prose-hr:border-stone-200 focus:outline-none min-h-[200px] px-3"
            plugins={[
              headingsPlugin(),
              listsPlugin(),
              linkPlugin(),
              linkDialogPlugin(),
              quotePlugin(),
              thematicBreakPlugin(),
              markdownShortcutPlugin(),
              toolbarPlugin({
                toolbarContents: () => (
                  <>
                    <UndoRedo />
                    <Separator />
                    <BlockTypeSelect />
                    <Separator />
                    <BoldItalicUnderlineToggles />
                    <CodeToggle />
                    <Separator />
                    <ListsToggle />
                    <Separator />
                    <CreateLink />
                  </>
                ),
              }),
            ]}
          />
        </div>
      </div>
    </div>
  );
}
