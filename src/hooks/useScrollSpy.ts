import { useState, useEffect, useRef } from 'react';

export function useScrollSpy(headingIds: string[], containerRef: React.RefObject<HTMLElement | null>): string {
  const [activeId, setActiveId] = useState('');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || headingIds.length === 0) return;

    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the first heading that's intersecting from the top
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      {
        root: container,
        rootMargin: '-10% 0px -80% 0px',
        threshold: 0,
      }
    );

    // Observe all heading elements
    for (const id of headingIds) {
      const el = container.querySelector(`#${CSS.escape(id)}`);
      if (el) observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, [headingIds, containerRef]);

  return activeId;
}
