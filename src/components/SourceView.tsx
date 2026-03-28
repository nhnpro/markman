import { useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import type { FormatAction } from './Toolbar';

interface Props {
  raw: string;
  cursorLine?: number;
  onContentChange?: (content: string) => void;
}

export interface SourceViewHandle {
  applyFormat: (action: FormatAction) => void;
}

const syntaxHighlight = (line: string): React.ReactNode => {
  if (/^#{1,6}\s/.test(line)) {
    const match = line.match(/^(#{1,6})\s(.*)$/);
    if (match) {
      return (
        <>
          <span className="text-red-400">{match[1]}</span>{' '}
          <span className="text-amber-200 font-semibold">{match[2]}</span>
        </>
      );
    }
  }

  if (/^- \[[ x]\]/.test(line)) {
    const match = line.match(/^(- \[[ x]\])\s(.*)$/);
    if (match) {
      return (
        <>
          <span className="text-sky-400">{match[1]}</span>{' '}
          <span className="text-stone-300">{highlightInline(match[2])}</span>
        </>
      );
    }
  }

  if (/^- /.test(line)) {
    return (
      <>
        <span className="text-sky-400">-</span>{' '}
        <span className="text-stone-300">{highlightInline(line.slice(2))}</span>
      </>
    );
  }

  if (/^>/.test(line)) return <span className="text-green-400">{line}</span>;
  if (/^---$/.test(line)) return <span className="text-stone-500">{line}</span>;
  if (/\*\*/.test(line)) return <span className="text-stone-300">{highlightInline(line)}</span>;

  return <span className="text-stone-400">{highlightInline(line)}</span>;
};

const highlightInline = (text: string): React.ReactNode => {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`(.+?)`/);

    let firstMatch: { match: RegExpMatchArray; type: string } | null = null;
    if (boldMatch && boldMatch.index !== undefined) firstMatch = { match: boldMatch, type: 'bold' };
    if (codeMatch && codeMatch.index !== undefined) {
      if (!firstMatch || codeMatch.index < firstMatch.match.index!) firstMatch = { match: codeMatch, type: 'code' };
    }

    if (!firstMatch) { parts.push(<span key={key++}>{remaining}</span>); break; }

    const idx = firstMatch.match.index!;
    if (idx > 0) parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>);

    if (firstMatch.type === 'bold') {
      parts.push(<span key={key++} className="text-amber-300 font-semibold">**{firstMatch.match[1]}**</span>);
    } else {
      parts.push(<span key={key++} className="text-green-300 bg-green-900/30 px-0.5 rounded">`{firstMatch.match[1]}`</span>);
    }
    remaining = remaining.slice(idx + firstMatch.match[0].length);
  }
  return parts;
};

const SourceView = forwardRef<SourceViewHandle, Props>(({ raw, cursorLine = 0, onContentChange }, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lines = raw.split('\n');

  const applyFormat = useCallback((action: FormatAction) => {
    const ta = textareaRef.current;
    if (!ta) return;

    ta.focus();
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = raw.substring(start, end) || 'text';

    let replacement: string;
    let cursorOffset: number;

    switch (action) {
      case 'bold':
        replacement = `**${selected}**`;
        cursorOffset = selected === 'text' ? 2 : replacement.length;
        break;
      case 'italic':
        replacement = `*${selected}*`;
        cursorOffset = selected === 'text' ? 1 : replacement.length;
        break;
      case 'code':
        replacement = `\`${selected}\``;
        cursorOffset = selected === 'text' ? 1 : replacement.length;
        break;
      case 'link':
        replacement = `[${selected}](url)`;
        cursorOffset = selected === 'text' ? 1 : replacement.length - 4;
        break;
    }

    const newContent = raw.substring(0, start) + replacement + raw.substring(end);
    onContentChange?.(newContent);

    // Restore cursor position
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = start + cursorOffset;
    });
  }, [raw, onContentChange]);

  useImperativeHandle(ref, () => ({ applyFormat }), [applyFormat]);

  return (
    <div className="bg-[#1a1b26] min-h-full font-mono text-sm leading-6 relative">
      {/* Syntax-highlighted display layer */}
      <div className="flex pointer-events-none">
        <div className="py-4 pl-4 pr-3 text-right select-none flex-shrink-0 sticky left-0 bg-[#1a1b26]">
          {lines.map((_, i) => (
            <div key={i} className={`${i === cursorLine ? 'text-stone-300' : 'text-stone-600'} h-6`}>
              {i + 1}
            </div>
          ))}
        </div>
        <div className="py-4 pr-6 flex-1">
          {lines.map((line, i) => (
            <div key={i} className={`h-6 px-2 whitespace-pre ${i === cursorLine ? 'bg-stone-800/50 rounded' : ''}`}>
              {line === '' ? '\u00A0' : syntaxHighlight(line)}
            </div>
          ))}
        </div>
      </div>

      {/* Editable textarea overlay */}
      <textarea
        ref={textareaRef}
        value={raw}
        onChange={(e) => onContentChange?.(e.target.value)}
        className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-amber-400 resize-none outline-none font-mono text-sm leading-6 py-4 pl-[52px] pr-6 whitespace-pre overflow-auto"
        spellCheck={false}
      />

      {/* Bottom status bar */}
      <div className="sticky bottom-0 bg-[#1a1b26] border-t border-stone-800 px-4 py-1.5 flex items-center justify-between text-xs text-stone-500 z-10">
        <span>Markdown</span>
        <span>Ln {cursorLine + 1}, Col 1</span>
      </div>
    </div>
  );
});

SourceView.displayName = 'SourceView';
export default SourceView;
