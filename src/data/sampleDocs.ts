import type { Document } from '../types';

const gettingStartedDoc = `---
title: Getting Started
status: Published
icon: "\uD83D\uDE80"
breadcrumb: MarkMan
cover: https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&q=80
---

Welcome to **MarkMan** — a beautiful markdown document viewer with a unique page-flip animation. Here's everything you need to know to get started.

## How It Works

MarkMan lets you write, edit, and read markdown documents in a clean Notion-style interface. Every document has two sides — like a real page:

- **Front** — A beautifully rendered preview of your document
- **Back** — The raw markdown source code

Flip between them by dragging the corner of the page, or pressing \`Cmd+E\`.

## Views

### Preview Mode

The default view. Your markdown is rendered as a clean, readable document — headings, lists, links, code blocks, and more. No editing UI, just the content.

Switch to it using the **Preview** button in the bottom bar.

### Edit Mode

Click **Edit** in the bottom bar to activate the WYSIWYG editor. You'll get a formatting toolbar at the top of the document where you can:

- **Bold**, **Italic**, **Underline** text
- Change block types (paragraphs, headings)
- Create **bullet lists**, **numbered lists**, and **task lists**
- Insert **links**
- Write inline \`code\`

All changes sync directly to the markdown source. Flip to the back to see the raw markdown update in real time.

### Source View

Press \`Cmd+E\` or click the **Source** button to flip the page and see the raw markdown. You can edit directly in the source view too — it has syntax highlighting and a dark theme.

## Page Flip

The signature feature. Drag from the **bottom-right corner** of the page to peel it like a real book page. The back reveals the raw markdown source.

- Drag past the halfway point to complete the flip
- Release before halfway to snap back
- Or just press \`Cmd+E\` for an animated flip

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| \`Cmd+E\` | Flip between preview and source |
| \`Cmd+K\` | Open command palette (search pages) |
| \`Cmd+\\\` | Toggle left sidebar |
| \`Cmd+Shift+\\\` | Toggle right sidebar |

## Sidebar Navigation

### Left Sidebar

Your document tree. Create new pages, organize with favorites, and switch between documents. Click the hamburger icon or press \`Cmd+\\\` to toggle it.

- Click **New Page** to create a blank document
- Right-click (or use the \`...\` menu) to favorite or delete pages
- Favorited pages appear at the top for quick access

### Right Sidebar

The **Table of Contents** — auto-generated from your document's headings. Click any heading to scroll directly to that section. The current section is highlighted as you scroll.

## Command Palette

Press \`Cmd+K\` to open the command palette. Search across all your documents by title and jump to any page instantly. Use arrow keys to navigate and Enter to open.

## Auto-Save

All your documents are automatically saved to your browser's local storage. Changes are saved within 500ms of your last edit — no save button needed.

> **Tip:** Try creating a new page from the sidebar, write some markdown, then flip the page to see your source code. That's the MarkMan experience!
`;

export const sampleDocuments: Document[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: '\uD83D\uDE80',
    content: gettingStartedDoc,
    parentId: null,
    createdAt: Date.now() - 86400000 * 30,
    updatedAt: Date.now(),
    isFavorite: true,
  },
];
