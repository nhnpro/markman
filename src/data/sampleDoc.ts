export interface DocMeta {
  title: string;
  status: string;
  icon: string;
  breadcrumb: string;
  cover: string;
}

export function parseFrontmatter(md: string): { meta: DocMeta; content: string } {
  const fmMatch = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    return {
      meta: { title: 'Untitled', status: '', icon: '', breadcrumb: '', cover: '' },
      content: md,
    };
  }

  const frontmatter = fmMatch[1];
  const content = fmMatch[2];

  const get = (key: string) => {
    const match = frontmatter.match(new RegExp(`^${key}:\\s*"?([^"\\n]*)"?`, 'm'));
    return match ? match[1].trim() : '';
  };

  return {
    meta: {
      title: get('title'),
      status: get('status'),
      icon: get('icon'),
      breadcrumb: get('breadcrumb'),
      cover: get('cover'),
    },
    content: content.trim(),
  };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
