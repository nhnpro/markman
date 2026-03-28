import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { DocMeta } from '../data/sampleDoc';
import { slugify } from '../data/sampleDoc';
import type { Components } from 'react-markdown';

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    const el = node as { props?: { children?: React.ReactNode } };
    return extractText(el.props?.children);
  }
  return '';
}

interface Props {
  meta: DocMeta;
  content: string;
}

const components: Components = {
  h2: ({ children }) => {
    const id = slugify(extractText(children));
    return <h2 id={id} className="text-xl font-semibold text-stone-900 mt-8 mb-3 first:mt-0 scroll-mt-4">{children}</h2>;
  },
  h3: ({ children }) => {
    const id = slugify(extractText(children));
    return <h3 id={id} className="text-lg font-semibold text-stone-800 mt-6 mb-2 scroll-mt-4">{children}</h3>;
  },
  p: ({ children }) => (
    <p className="text-stone-600 leading-relaxed mb-3 text-[15px]">{children}</p>
  ),
  ul: ({ children }) => <ul className="space-y-1.5 mb-4 list-none pl-0">{children}</ul>,
  li: ({ children }) => (
    <li className="flex items-start gap-2 text-[15px] text-stone-600">
      <span className="mt-0.5">{children}</span>
    </li>
  ),
  input: ({ checked }) => (
    <input
      type="checkbox"
      checked={checked}
      readOnly
      className="mt-1 h-4 w-4 rounded border-stone-300 text-amber-600 accent-amber-600"
    />
  ),
  a: ({ href, children }) => (
    <a href={href} className="text-stone-500 hover:text-stone-800 underline decoration-stone-300 underline-offset-2 transition-colors">
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold text-stone-800">{children}</strong>,
  code: ({ children, className }) => {
    if (className) return <code className={className}>{children}</code>;
    return (
      <code className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-[13px] font-mono border border-green-200">
        {children}
      </code>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="border-l-3 border-amber-400 bg-amber-50/50 pl-4 py-2 my-4 text-stone-600 italic rounded-r-lg">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-stone-200" />,
  del: ({ children }) => <del className="text-stone-400 line-through">{children}</del>,
};

export default function PreviewView({ meta, content }: Props) {
  const sections = content.split(/(?=## )/);
  const importantTasksIdx = sections.findIndex(s => s.startsWith('## Important Tasks'));
  const knowledgeBaseIdx = sections.findIndex(s => s.startsWith('## Knowledge Base'));
  const introIdx = sections.findIndex(s => !s.startsWith('## '));

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

      <div className="max-w-3xl mx-auto px-8 py-6">
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

        {introIdx !== -1 && sections[introIdx] && (
          <div className="mb-6">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
              {sections[introIdx]}
            </ReactMarkdown>
          </div>
        )}

        {importantTasksIdx !== -1 && knowledgeBaseIdx !== -1 ? (
          <>
            <div className="grid grid-cols-2 gap-8 mb-4">
              <div>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                  {sections[importantTasksIdx]}
                </ReactMarkdown>
              </div>
              <div>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                  {sections[knowledgeBaseIdx]}
                </ReactMarkdown>
              </div>
            </div>
            {sections
              .filter((_, i) => i !== introIdx && i !== importantTasksIdx && i !== knowledgeBaseIdx)
              .map((section, i) => (
                <ReactMarkdown key={i} remarkPlugins={[remarkGfm]} components={components}>
                  {section}
                </ReactMarkdown>
              ))}
          </>
        ) : (
          sections
            .filter((_, i) => i !== introIdx)
            .map((section, i) => (
              <ReactMarkdown key={i} remarkPlugins={[remarkGfm]} components={components}>
                {section}
              </ReactMarkdown>
            ))
        )}
      </div>
    </div>
  );
}
