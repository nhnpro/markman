import { useRef, useImperativeHandle, forwardRef, useCallback, useState, useEffect, useMemo } from 'react';
import type { FormatAction } from './Toolbar';
import { useApp } from '../context/AppContext';

interface Props {
  raw: string;
  cursorLine?: number;
  onContentChange?: (content: string) => void;
}

export interface SourceViewHandle {
  applyFormat: (action: FormatAction) => void;
}

const LINE_HEIGHT = 24;
const OVERSCAN = 20; // extra lines rendered above/below viewport

const syntaxHighlight = (line: string, dark: boolean): React.ReactNode => {
  if (/^#{1,6}\s/.test(line)) {
    const match = line.match(/^(#{1,6})\s(.*)$/);
    if (match) {
      return (
        <>
          <span className={dark ? 'text-red-400' : 'text-red-500'}>{match[1]}</span>{' '}
          <span className={`font-semibold ${dark ? 'text-amber-200' : 'text-stone-900'}`}>{match[2]}</span>
        </>
      );
    }
  }

  if (/^- \[[ x]\]/.test(line)) {
    const match = line.match(/^(- \[[ x]\])\s(.*)$/);
    if (match) {
      return (
        <>
          <span className={dark ? 'text-sky-400' : 'text-sky-600'}>{match[1]}</span>{' '}
          <span className={dark ? 'text-stone-200' : 'text-stone-700'}>{highlightInline(match[2], dark)}</span>
        </>
      );
    }
  }

  if (/^- /.test(line)) {
    return (
      <>
        <span className={dark ? 'text-sky-400' : 'text-sky-600'}>-</span>{' '}
        <span className={dark ? 'text-stone-200' : 'text-stone-700'}>{highlightInline(line.slice(2), dark)}</span>
      </>
    );
  }

  if (/^>/.test(line)) return <span className={dark ? 'text-green-400' : 'text-green-700'}>{line}</span>;
  if (/^---$/.test(line)) return <span className={dark ? 'text-stone-500' : 'text-stone-400'}>{line}</span>;
  if (/\*\*/.test(line)) return <span className={dark ? 'text-stone-200' : 'text-stone-700'}>{highlightInline(line, dark)}</span>;

  return <span className={dark ? 'text-stone-300' : 'text-stone-600'}>{highlightInline(line, dark)}</span>;
};

const highlightInline = (text: string, dark: boolean): React.ReactNode => {
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
      parts.push(<span key={key++} className={`font-semibold ${dark ? 'text-amber-300' : 'text-amber-700'}`}>**{firstMatch.match[1]}**</span>);
    } else {
      parts.push(<span key={key++} className={`px-0.5 rounded ${dark ? 'text-green-300 bg-green-900/30' : 'text-green-700 bg-green-100'}`}>`{firstMatch.match[1]}`</span>);
    }
    remaining = remaining.slice(idx + firstMatch.match[0].length);
  }
  return parts;
};

function findMatches(text: string, query: string): number[] {
  if (!query) return [];
  const indices: number[] = [];
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  let pos = 0;
  while (pos < lower.length) {
    const idx = lower.indexOf(q, pos);
    if (idx === -1) break;
    indices.push(idx);
    pos = idx + 1;
  }
  return indices;
}

function renderLineWithHighlights(
  lineText: string,
  lineStart: number,
  queryLen: number,
  currentMatchIdx: number,
  allMatchPositions: number[],
): React.ReactNode {
  if (!queryLen || allMatchPositions.length === 0) {
    return lineText || '\u00A0';
  }

  const lineEnd = lineStart + lineText.length;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const matchStart of allMatchPositions) {
    const matchEnd = matchStart + queryLen;
    if (matchEnd <= lineStart || matchStart >= lineEnd) continue;

    const relStart = Math.max(0, matchStart - lineStart);
    const relEnd = Math.min(lineText.length, matchEnd - lineStart);

    if (relStart > cursor) {
      parts.push(<span key={key++}>{lineText.slice(cursor, relStart)}</span>);
    }

    const isCurrent = currentMatchIdx >= 0 && matchStart === allMatchPositions[currentMatchIdx];
    parts.push(
      <mark
        key={key++}
        className={`rounded px-0 ${isCurrent ? 'bg-amber-500/70 text-white' : 'bg-amber-500/30 text-inherit'}`}
      >
        {lineText.slice(relStart, relEnd)}
      </mark>
    );
    cursor = relEnd;
  }

  if (cursor < lineText.length) {
    parts.push(<span key={key++}>{lineText.slice(cursor)}</span>);
  }

  return parts.length > 0 ? parts : (lineText || '\u00A0');
}

const SourceView = forwardRef<SourceViewHandle, Props>(({ raw, onContentChange }, ref) => {
  const { state } = useApp();
  const dark = state.darkMode;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const findInputRef = useRef<HTMLInputElement>(null);
  const goToLineInputRef = useRef<HTMLInputElement>(null);

  // Memoize lines split
  const lines = useMemo(() => raw.split('\n'), [raw]);

  // Virtualization state
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(800);

  // Cursor tracking
  const [cursorLine, setCursorLine] = useState(0);
  const [cursorCol, setCursorCol] = useState(0);

  // Find state
  const [findOpen, setFindOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);

  // Go to line state
  const [goToLineOpen, setGoToLineOpen] = useState(false);
  const [goToLineValue, setGoToLineValue] = useState('');

  // Attach scroll listener to the overflow-auto parent
  useEffect(() => {
    const container = containerRef.current?.closest('.overflow-auto') as HTMLElement;
    if (!container) return;
    scrollContainerRef.current = container;

    const onScroll = () => setScrollTop(container.scrollTop);
    const onResize = () => setViewportHeight(container.clientHeight);

    container.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(onResize);
    ro.observe(container);
    onResize();

    return () => {
      container.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, []);

  // Compute visible line range
  const totalHeight = lines.length * LINE_HEIGHT;
  const startLine = Math.max(0, Math.floor(scrollTop / LINE_HEIGHT) - OVERSCAN);
  const endLine = Math.min(lines.length, Math.ceil((scrollTop + viewportHeight) / LINE_HEIGHT) + OVERSCAN);

  const updateCursorPos = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const textBefore = raw.substring(0, pos);
    const line = textBefore.split('\n').length - 1;
    const col = pos - textBefore.lastIndexOf('\n') - 1;
    setCursorLine(line);
    setCursorCol(col);
  }, [raw]);

  const matchPositions = useMemo(() => findMatches(raw, findQuery), [raw, findQuery]);

  useEffect(() => {
    if (matchPositions.length === 0) {
      setCurrentMatchIdx(0);
    } else if (currentMatchIdx >= matchPositions.length) {
      setCurrentMatchIdx(0);
    }
  }, [matchPositions.length, currentMatchIdx]);

  useEffect(() => {
    if (matchPositions.length === 0) return;
    const matchStart = matchPositions[currentMatchIdx];
    if (matchStart === undefined) return;
    const lineNum = raw.substring(0, matchStart).split('\n').length - 1;
    const container = scrollContainerRef.current;
    if (container) {
      const targetScroll = lineNum * LINE_HEIGHT - container.clientHeight / 2 + 16;
      container.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
    }
  }, [currentMatchIdx, matchPositions, raw]);

  useEffect(() => {
    if (findOpen) requestAnimationFrame(() => findInputRef.current?.focus());
  }, [findOpen]);

  useEffect(() => {
    if (goToLineOpen) requestAnimationFrame(() => goToLineInputRef.current?.focus());
  }, [goToLineOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === 'f') {
        e.preventDefault(); e.stopPropagation();
        setReplaceOpen(false); setFindOpen(true); setGoToLineOpen(false);
      } else if (e.key === 'h') {
        e.preventDefault(); e.stopPropagation();
        setFindOpen(true); setReplaceOpen(true); setGoToLineOpen(false);
      } else if (e.key === 'g') {
        e.preventDefault(); e.stopPropagation();
        setGoToLineOpen(true); setFindOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const navigateMatch = useCallback((direction: 1 | -1) => {
    if (matchPositions.length === 0) return;
    setCurrentMatchIdx(prev => {
      const next = prev + direction;
      if (next < 0) return matchPositions.length - 1;
      if (next >= matchPositions.length) return 0;
      return next;
    });
  }, [matchPositions.length]);

  const handleReplace = useCallback(() => {
    if (matchPositions.length === 0) return;
    const matchStart = matchPositions[currentMatchIdx];
    if (matchStart === undefined) return;
    const newContent = raw.substring(0, matchStart) + replaceQuery + raw.substring(matchStart + findQuery.length);
    onContentChange?.(newContent);
  }, [raw, matchPositions, currentMatchIdx, findQuery, replaceQuery, onContentChange]);

  const handleReplaceAll = useCallback(() => {
    if (matchPositions.length === 0 || !findQuery) return;
    const newContent = raw.split(new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')).join(replaceQuery);
    onContentChange?.(newContent);
  }, [raw, findQuery, replaceQuery, matchPositions.length, onContentChange]);

  const handleGoToLine = useCallback(() => {
    const lineNum = parseInt(goToLineValue, 10);
    if (isNaN(lineNum) || lineNum < 1 || lineNum > lines.length) return;
    const ta = textareaRef.current;
    if (!ta) return;

    let offset = 0;
    for (let i = 0; i < lineNum - 1; i++) offset += lines[i].length + 1;
    ta.focus();
    ta.selectionStart = ta.selectionEnd = offset;
    setCursorLine(lineNum - 1);
    setCursorCol(0);

    const container = scrollContainerRef.current;
    if (container) {
      const targetScroll = (lineNum - 1) * LINE_HEIGHT - container.clientHeight / 2 + 16;
      container.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
    }
    setGoToLineOpen(false);
  }, [goToLineValue, lines]);

  const closeFindBar = useCallback(() => {
    setFindOpen(false);
    setReplaceOpen(false);
    textareaRef.current?.focus();
  }, []);

  // Line start offsets (for search highlight positioning)
  const lineStarts = useMemo(() => {
    const starts: number[] = [0];
    for (let i = 0; i < lines.length - 1; i++) {
      starts.push(starts[i] + lines[i].length + 1);
    }
    return starts;
  }, [lines]);

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

    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = start + cursorOffset;
    });
  }, [raw, onContentChange]);

  useImperativeHandle(ref, () => ({ applyFormat }), [applyFormat]);

  const bgMain = dark ? 'bg-[#1a1b26]' : 'bg-stone-50';
  const bgBar = dark ? 'bg-[#292524]' : 'bg-white';
  const borderBar = dark ? 'border-stone-700' : 'border-stone-200';
  const inputBg = dark ? 'bg-[#1a1b26] text-stone-200 border-stone-700' : 'bg-stone-100 text-stone-800 border-stone-300';
  const btnClass = dark ? 'text-stone-400 hover:text-stone-200 hover:bg-stone-700' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-200';
  const btnFilled = dark ? 'text-stone-300 bg-stone-700 hover:bg-stone-600' : 'text-stone-600 bg-stone-200 hover:bg-stone-300';
  const caretColor = dark ? 'caret-amber-400' : 'caret-amber-600';
  const lineNumActive = dark ? 'text-stone-300' : 'text-stone-700';
  const lineNumInactive = dark ? 'text-stone-500' : 'text-stone-400';
  const activeLine = dark ? 'bg-stone-800/50' : 'bg-amber-50';
  const statusText = dark ? 'text-stone-500' : 'text-stone-400';
  const statusSep = dark ? 'text-stone-600' : 'text-stone-300';

  // Build visible lines
  const visibleLines = [];
  for (let i = startLine; i < endLine; i++) {
    const line = lines[i];
    const isActive = i === cursorLine;
    visibleLines.push(
      <div key={i} data-line={i} className={`h-6 px-2 whitespace-pre ${isActive ? `${activeLine} rounded` : ''}`}>
        {findQuery && matchPositions.length > 0
          ? renderLineWithHighlights(line, lineStarts[i], findQuery.length, currentMatchIdx, matchPositions)
          : (line === '' ? '\u00A0' : syntaxHighlight(line, dark))
        }
      </div>
    );
  }

  const visibleLineNums = [];
  for (let i = startLine; i < endLine; i++) {
    visibleLineNums.push(
      <div key={i} className={`${i === cursorLine ? lineNumActive : lineNumInactive} h-6`}>
        {i + 1}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`${bgMain} min-h-full font-mono text-sm leading-6 relative`}>
      {/* Find bar */}
      {findOpen && (
        <div className={`sticky top-0 z-20 ${bgBar} border-b ${borderBar} px-3 py-2 flex flex-col gap-2 shadow-lg`}>
          <div className="flex items-center gap-2">
            <input
              ref={findInputRef}
              type="text"
              value={findQuery}
              onChange={(e) => { setFindQuery(e.target.value); setCurrentMatchIdx(0); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); navigateMatch(e.shiftKey ? -1 : 1); }
                if (e.key === 'Escape') { e.preventDefault(); closeFindBar(); }
              }}
              placeholder="Find..."
              className={`flex-1 text-xs px-2 py-1 rounded border outline-none focus:border-amber-500/60 ${inputBg}`}
            />
            <span className="text-[10px] text-stone-500 tabular-nums min-w-[50px] text-center">
              {matchPositions.length > 0 ? `${currentMatchIdx + 1}/${matchPositions.length}` : 'No results'}
            </span>
            <button onClick={() => navigateMatch(-1)} className={`p-1 rounded ${btnClass}`} title="Previous (Shift+Enter)">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
            </button>
            <button onClick={() => navigateMatch(1)} className={`p-1 rounded ${btnClass}`} title="Next (Enter)">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            <button
              onClick={() => setReplaceOpen(!replaceOpen)}
              className={`p-1 rounded text-xs ${replaceOpen ? 'text-amber-400 bg-stone-700' : btnClass}`}
              title="Toggle Replace (Cmd+H)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            </button>
            <button onClick={closeFindBar} className={`p-1 rounded ${btnClass}`} title="Close (Esc)">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          {replaceOpen && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleReplace(); }
                  if (e.key === 'Escape') { e.preventDefault(); closeFindBar(); }
                }}
                placeholder="Replace..."
                className={`flex-1 text-xs px-2 py-1 rounded border outline-none focus:border-amber-500/60 ${inputBg}`}
              />
              <button onClick={handleReplace} className={`px-2 py-1 text-[10px] rounded ${btnFilled}`} title="Replace current">
                Replace
              </button>
              <button onClick={handleReplaceAll} className={`px-2 py-1 text-[10px] rounded ${btnFilled}`} title="Replace all">
                All
              </button>
            </div>
          )}
        </div>
      )}

      {/* Go to Line dialog */}
      {goToLineOpen && (
        <div className={`sticky top-0 z-20 ${bgBar} border-b ${borderBar} px-3 py-2 flex items-center gap-2 shadow-lg`}>
          <span className={`text-xs ${statusText}`}>Go to Line</span>
          <input
            ref={goToLineInputRef}
            type="number"
            min={1}
            max={lines.length}
            value={goToLineValue}
            onChange={(e) => setGoToLineValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleGoToLine(); }
              if (e.key === 'Escape') { e.preventDefault(); setGoToLineOpen(false); textareaRef.current?.focus(); }
            }}
            placeholder={`1–${lines.length}`}
            className={`w-24 text-xs px-2 py-1 rounded border outline-none focus:border-amber-500/60 ${inputBg}`}
          />
          <button onClick={handleGoToLine} className={`px-2 py-1 text-[10px] rounded ${btnFilled}`}>
            Go
          </button>
          <button onClick={() => { setGoToLineOpen(false); textareaRef.current?.focus(); }} className={`p-1 rounded ${btnClass}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Virtualized syntax-highlighted display layer */}
      <div className="flex pointer-events-none" style={{ height: totalHeight + 32 }}>
        <div
          className={`py-4 pl-4 pr-3 text-right select-none flex-shrink-0 sticky left-0 ${bgMain}`}
          style={{ paddingTop: 16 + startLine * LINE_HEIGHT }}
        >
          {visibleLineNums}
        </div>
        <div
          className="py-4 pr-6 flex-1"
          style={{ paddingTop: 16 + startLine * LINE_HEIGHT }}
        >
          {visibleLines}
        </div>
      </div>

      {/* Editable textarea overlay */}
      <textarea
        ref={textareaRef}
        value={raw}
        onChange={(e) => { onContentChange?.(e.target.value); }}
        onSelect={updateCursorPos}
        onClick={updateCursorPos}
        onKeyUp={updateCursorPos}
        className={`absolute inset-0 w-full bg-transparent text-transparent ${caretColor} resize-none outline-none font-mono text-sm leading-6 py-4 pl-[52px] pr-6 whitespace-pre overflow-auto`}
        style={{ height: totalHeight + 32 }}
        spellCheck={false}
      />

      {/* Bottom status bar */}
      <div className={`sticky bottom-0 ${bgMain} border-t ${borderBar} px-4 py-1.5 flex items-center justify-between text-xs ${statusText} z-10`}>
        <div className="flex items-center gap-3">
          <span>Markdown</span>
          <span className={statusSep}>|</span>
          <span>{lines.length} lines</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setGoToLineOpen(true); setFindOpen(false); }}
            className={`${dark ? 'hover:text-stone-300' : 'hover:text-stone-700'} transition-colors cursor-pointer`}
            title="Go to Line (Cmd+G)"
          >
            Ln {cursorLine + 1}, Col {cursorCol + 1}
          </button>
          <span className={statusSep}>|</span>
          <button
            onClick={() => { setReplaceOpen(false); setFindOpen(true); setGoToLineOpen(false); }}
            className={`${dark ? 'hover:text-stone-300' : 'hover:text-stone-700'} transition-colors cursor-pointer`}
            title="Find (Cmd+F)"
          >
            <svg className="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
});

SourceView.displayName = 'SourceView';
export default SourceView;
