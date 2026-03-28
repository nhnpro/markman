import { useRef, useCallback, useEffect, useState } from 'react';

interface Props {
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  isFlipped: boolean;
  onFlipChange?: (flipped: boolean) => void;
}

interface Point {
  x: number;
  y: number;
}

function calcFoldGeometry(corner: Point, origCorner: Point, width: number, height: number) {
  const mid: Point = {
    x: (corner.x + origCorner.x) / 2,
    y: (corner.y + origCorner.y) / 2,
  };
  const dx = origCorner.x - corner.x;
  const dy = origCorner.y - corner.y;
  const angle = Math.atan2(dy, dx);
  const foldAngle = angle + Math.PI / 2;
  const len = Math.max(width, height) * 3;

  return {
    mid,
    angle,
    foldAngle,
    foldStart: { x: mid.x + Math.cos(foldAngle) * len, y: mid.y + Math.sin(foldAngle) * len },
    foldEnd: { x: mid.x - Math.cos(foldAngle) * len, y: mid.y - Math.sin(foldAngle) * len },
  };
}

function reflectPoint(p: Point, linePoint: Point, lineAngle: number): Point {
  const cos = Math.cos(lineAngle);
  const sin = Math.sin(lineAngle);
  const dx = p.x - linePoint.x;
  const dy = p.y - linePoint.y;
  const dot = dx * cos + dy * sin;
  return { x: linePoint.x + 2 * dot * cos - dx, y: linePoint.y + 2 * dot * sin - dy };
}

function sideOfLine(p: Point, a: Point, b: Point): number {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
}

function clipPolygon(
  foldStart: Point, foldEnd: Point, w: number, h: number, sign: number
): Point[] {
  const corners = [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
  const sides = corners.map(c => sideOfLine(c, foldStart, foldEnd));
  const poly: Point[] = [];

  for (let i = 0; i < 4; i++) {
    const curr = corners[i];
    const next = corners[(i + 1) % 4];
    const cs = sides[i];
    const ns = sides[(i + 1) % 4];
    if (cs * sign >= 0) poly.push(curr);
    if ((cs > 0 && ns < 0) || (cs < 0 && ns > 0)) {
      const t = cs / (cs - ns);
      poly.push({ x: curr.x + t * (next.x - curr.x), y: curr.y + t * (next.y - curr.y) });
    }
  }
  return poly;
}

function polyToClipPath(poly: Point[], w: number, h: number): string {
  if (poly.length === 0) return 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
  return 'polygon(' + poly.map(p =>
    `${(p.x / w * 100).toFixed(2)}% ${(p.y / h * 100).toFixed(2)}%`
  ).join(', ') + ')';
}

export default function PageFlip({ frontContent, backContent, isFlipped, onFlipChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const isDragging = useRef(false);
  // Internal flip state — tracks what's currently showing (independent of animation)
  const internalFlipped = useRef(isFlipped);

  const [cornerPos, setCornerPos] = useState<Point | null>(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDims({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Corner always starts at bottom-right and flips left
  const origCorner: Point = { x: dims.w, y: dims.h };
  const flippedTarget: Point = { x: -dims.w * 0.1, y: dims.h * 0.6 };

  const animateTo = useCallback((from: Point, to: Point, duration: number, onDone?: () => void) => {
    setIsAnimating(true);
    const startTime = performance.now();
    cancelAnimationFrame(animRef.current);

    const step = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const current: Point = {
        x: from.x + (to.x - from.x) * eased,
        y: from.y + (to.y - from.y) * eased,
      };
      setCornerPos(current);

      if (t < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        setCornerPos(null);
        setIsAnimating(false);
        onDone?.();
      }
    };
    animRef.current = requestAnimationFrame(step);
  }, []);

  // Respond to isFlipped prop
  useEffect(() => {
    if (isFlipped === internalFlipped.current) return;

    internalFlipped.current = isFlipped;

    if (isFlipped) {
      // Flip forward
      const from = cornerPos || origCorner;
      animateTo(from, flippedTarget, 800);
    } else {
      // Unflip: animate corner from left back to bottom-right
      const from = cornerPos || flippedTarget;
      animateTo(from, { x: dims.w, y: dims.h }, 800);
    }

    return () => cancelAnimationFrame(animRef.current);
  }, [isFlipped]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isAnimating || internalFlipped.current) return; // Only drag from front view
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const threshold = 120;

    // Grab bottom-right or top-right corner
    const brDist = Math.hypot(px - rect.width, py - rect.height);
    const trDist = Math.hypot(px - rect.width, py);
    if (brDist > threshold && trDist > threshold) return;

    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setCornerPos({ x: px, y: py });
  }, [isAnimating]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const px = Math.max(-rect.width * 0.15, Math.min(rect.width * 1.15, e.clientX - rect.left));
    const py = Math.max(-rect.height * 0.1, Math.min(rect.height * 1.1, e.clientY - rect.top));
    setCornerPos({ x: px, y: py });
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (!cornerPos) return;

    const halfW = dims.w / 2;

    if (cornerPos.x < halfW) {
      // Past midpoint — complete the flip
      internalFlipped.current = true;
      animateTo(cornerPos, flippedTarget, 500, () => {
        onFlipChange?.(true);
      });
    } else {
      // Snap back
      animateTo(cornerPos, { x: dims.w, y: dims.h }, 400);
    }
  }, [cornerPos, dims, animateTo, onFlipChange, flippedTarget]);

  // ─── Render ────────────────────────────────────────────

  // Static state (no fold in progress)
  if (!cornerPos) {
    const showBack = internalFlipped.current;
    return (
      <div
        ref={containerRef}
        className="relative w-full h-full select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="absolute inset-0 overflow-auto rounded-lg">
          {showBack ? backContent : frontContent}
        </div>

        {/* Corner curl hint — only on front view */}
        {!showBack && (
          <>
            <div className="absolute bottom-0 right-0 w-10 h-10 pointer-events-none">
              <svg width="40" height="40" viewBox="0 0 40 40" className="opacity-30 scale-x-[-1]">
                <path d="M0 40 Q0 0 40 0 L40 5 Q5 5 5 40 Z" fill="rgba(0,0,0,0.15)" />
              </svg>
            </div>
            <div className="absolute bottom-0 right-0 w-28 h-28 cursor-grab" onPointerDown={handlePointerDown} />
            <div className="absolute top-0 right-0 w-28 h-28 cursor-grab" onPointerDown={handlePointerDown} />
          </>
        )}
      </div>
    );
  }

  // ─── Active fold rendering ─────────────────────────────
  const { w, h } = dims;
  const fold = calcFoldGeometry(cornerPos, origCorner, w, h);

  // Front page stays in place (clipped), back is revealed underneath
  const staySign = -1;

  const stayPoly = clipPolygon(fold.foldStart, fold.foldEnd, w, h, staySign);
  const stayClip = polyToClipPath(stayPoly, w, h);

  // Peeled polygon (the lifted part)
  const peeledPoly = clipPolygon(fold.foldStart, fold.foldEnd, w, h, -staySign);
  // Reflect it across the fold line
  const reflectedPoly = peeledPoly.map(p => reflectPoint(p, fold.mid, fold.foldAngle));
  const reflectedClip = polyToClipPath(reflectedPoly, w, h);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden rounded-lg"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ cursor: isDragging.current ? 'grabbing' : 'default' }}
    >
      {/* Layer 1: Back content (revealed underneath) */}
      <div className="absolute inset-0 overflow-auto">
        {backContent}
      </div>

      {/* Layer 2: Front page (clipped to its side of the fold) */}
      <div
        className="absolute inset-0 overflow-auto"
        style={{ clipPath: stayClip }}
      >
        {frontContent}
      </div>

      {/* Layer 3: Folded-back portion — solid white paper back */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ clipPath: reflectedClip }}
      >
        <div className="absolute inset-0 bg-white" />
      </div>

    </div>
  );
}
