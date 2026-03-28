import { useMemo } from 'react';
import { slugify } from '../data/sampleDoc';

export interface TocEntry {
  id: string;
  text: string;
  level: 2 | 3;
}

export function useTableOfContents(content: string): TocEntry[] {
  return useMemo(() => {
    const entries: TocEntry[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const m2 = line.match(/^## (.+)$/);
      if (m2) {
        entries.push({ id: slugify(m2[1]), text: m2[1], level: 2 });
        continue;
      }
      const m3 = line.match(/^### (.+)$/);
      if (m3) {
        entries.push({ id: slugify(m3[1]), text: m3[1], level: 3 });
      }
    }

    return entries;
  }, [content]);
}
