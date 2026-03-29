interface Props {
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  isFlipped: boolean;
  onFlipChange?: (flipped: boolean) => void;
}

export default function PageFlip({ frontContent, backContent, isFlipped }: Props) {
  return (
    <div className="relative w-full h-full select-none overflow-hidden rounded-lg">
      {/* Back content (source view) */}
      <div
        className={`absolute inset-0 overflow-auto transition-opacity duration-300 ease-in-out ${
          isFlipped ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        }`}
      >
        {backContent}
      </div>

      {/* Front content (preview/edit) */}
      <div
        className={`absolute inset-0 overflow-auto transition-opacity duration-300 ease-in-out ${
          isFlipped ? 'opacity-0 z-0 pointer-events-none' : 'opacity-100 z-10'
        }`}
      >
        {frontContent}
      </div>
    </div>
  );
}
