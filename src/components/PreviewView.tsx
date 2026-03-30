import { memo, useEffect, useState, useRef, useCallback } from 'react';
import type { DocMeta } from '../data/sampleDoc';
import { slugify } from '../data/sampleDoc';

interface Props {
  meta: DocMeta;
  content: string;
}

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

let invokeCache: ((cmd: string, args: Record<string, unknown>) => Promise<string>) | null = null;

async function renderMarkdown(md: string): Promise<string> {
  if (isTauri) {
    if (!invokeCache) {
      const { invoke } = await import('@tauri-apps/api/core');
      invokeCache = invoke;
    }
    return invokeCache('render_markdown', { markdown: md });
  }
  return basicMarkdownToHtml(md);
}

function sanitizeUrl(url: string): string {
  const trimmed = url.trim().toLowerCase();
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('data:text/html')
  ) {
    return '#';
  }
  return url;
}

function basicMarkdownToHtml(md: string): string {
  let html = md
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    .replace(/^### (.+)$/gm, (_, t) => `<h3 id="${slugify(t)}">${t}</h3>`)
    .replace(/^## (.+)$/gm, (_, t) => `<h2 id="${slugify(t)}">${t}</h2>`)
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^---$/gm, '<hr />')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => `<img src="${sanitizeUrl(src)}" alt="${alt}" />`)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, href) => `<a href="${sanitizeUrl(href)}">${text}</a>`)
    .replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')
    .replace(/^- \[x\] (.+)$/gm, '<li class="task"><input type="checkbox" checked disabled /> $1</li>')
    .replace(/^- \[ \] (.+)$/gm, '<li class="task"><input type="checkbox" disabled /> $1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(?!<[a-z/])((?!$).+)$/gm, '<p>$1</p>');
  html = html.replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
  return html;
}

export default memo(function PreviewView({ meta, content }: Props) {
  const [html, setHtml] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latestContent = useRef(content);

  const doRender = useCallback((md: string) => {
    latestContent.current = md;
    renderMarkdown(md).then(result => {
      if (latestContent.current === md) {
        setHtml(result);
      }
    });
  }, []);

  useEffect(() => {
    // Render immediately on first load or document switch
    if (!html || latestContent.current !== content) {
      clearTimeout(debounceRef.current);
      // If content is large (>50KB), debounce to avoid lag during fast typing
      if (content.length > 50000) {
        debounceRef.current = setTimeout(() => doRender(content), 150);
      } else {
        doRender(content);
      }
    }
    return () => clearTimeout(debounceRef.current);
  }, [content, doRender, html]);

  const statusColor = meta.status === 'Published'
    ? 'bg-green-50 text-green-700 border-green-200'
    : meta.status === 'Draft'
    ? 'bg-stone-100 text-stone-600 border-stone-200'
    : meta.status === 'In Progress'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-red-50 text-red-600 border-red-200';

  return (
    <div className="bg-white min-h-full">
      {meta.cover && (
        <div className="h-52 w-full overflow-hidden relative">
          <img src={meta.cover} alt="Cover" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent" />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-8 py-6">
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

        <h1 className="text-4xl font-bold text-stone-900 mb-4 tracking-tight">{meta.title}</h1>

        <div className="flex items-center gap-4 mb-6 text-sm text-stone-500">
          <span className="text-stone-400">Properties</span>
          {meta.status && (
            <div className="flex items-center gap-2">
              <span className="text-stone-400">{meta.icon} Status</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}>
                {meta.status}
              </span>
            </div>
          )}
        </div>

        <div
          className="preview-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
});
