export type FormatAction = 'bold' | 'italic' | 'code' | 'link';

interface Props {
  isSource: boolean;
  onToggleView: () => void;
  onFormat?: (action: FormatAction) => void;
}

// Use onMouseDown + preventDefault to keep the text selection alive when clicking toolbar
const ToolbarButton = ({
  children, active, onClick, onMouseDown, title,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  title?: string;
}) => (
  <button
    onClick={onClick}
    onMouseDown={onMouseDown}
    title={title}
    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 flex items-center gap-1.5 ${
      active
        ? 'bg-stone-200 text-stone-800 shadow-sm'
        : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100'
    }`}
  >
    {children}
  </button>
);

const Separator = () => <div className="w-px h-5 bg-stone-200 mx-1" />;

export default function Toolbar({ isSource, onToggleView, onFormat }: Props) {
  // Prevent mousedown from stealing focus/selection, then fire format on click
  const handleFormatMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); // keeps the selection in the contentEditable
  };

  const makeFormatHandler = (action: FormatAction) => ({
    onMouseDown: handleFormatMouseDown,
    onClick: () => onFormat?.(action),
  });

  return (
    <div className="bg-white/95 backdrop-blur-sm border-t border-stone-200 px-3 py-2 flex items-center gap-1 overflow-x-auto shrink-0">
      <ToolbarButton {...makeFormatHandler('link')} title="Link (Cmd+K)">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        Link
      </ToolbarButton>

      <Separator />

      <ToolbarButton {...makeFormatHandler('bold')} title="Bold (Cmd+B)">
        <span className="font-bold text-sm">B</span>
        Bold
      </ToolbarButton>

      <ToolbarButton {...makeFormatHandler('italic')} title="Italic (Cmd+I)">
        <span className="italic text-sm">I</span>
        Italic
      </ToolbarButton>

      <ToolbarButton {...makeFormatHandler('code')} title="Inline Code">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        Code
      </ToolbarButton>

      <div className="flex-1" />

      <ToolbarButton active={isSource} onClick={onToggleView}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        {isSource ? 'Preview' : 'Source'}
        <kbd className="bg-stone-100 px-1 py-0.5 rounded text-[9px] font-mono border border-stone-200 ml-1">{'\u2318'}E</kbd>
      </ToolbarButton>
    </div>
  );
}
