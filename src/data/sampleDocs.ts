import type { Document } from '../types';

const gettingStartedDoc = `---
title: Getting Started
status: Published
icon: "\uD83D\uDE80"
breadcrumb: MarkMan
cover: https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&q=80
---

Welcome to **MarkMan** — a beautiful Notion-style markdown document viewer. Write, edit, and read markdown documents in a clean, interactive interface with three seamless view modes.

## How It Works

MarkMan lets you write, edit, and read markdown documents in a Notion-style interface. Switch between three view modes using \`Cmd+E\` or the tab bar at the bottom.

## View Modes

### Preview Mode

The default view. Your markdown is rendered as a clean, readable document — headings, lists, links, tables, code blocks, and more. No editing UI, just the content.

### Edit Mode

A WYSIWYG editor powered by MDXEditor. You'll get a formatting toolbar at the top where you can:

- **Bold**, **Italic**, **Underline** text
- Change block types (paragraphs, headings)
- Create **bullet lists**, **numbered lists**, and **task lists**
- Insert **links**
- Write inline \`code\`

All changes sync directly to the markdown source.

### Source View

Raw markdown editor with syntax highlighting and a dark theme. You can edit the markdown directly here.

Press \`Cmd+E\` to cycle through all three modes: Preview → Edit → Source.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| \`Cmd+E\` | Cycle view mode (Preview → Edit → Source) |
| \`Cmd+K\` | Open command palette (search pages) |
| \`Cmd+\\\` | Toggle left sidebar |
| \`Cmd+Shift+\\\` | Toggle right sidebar |
| \`Cmd+S\` | Save |
| \`Cmd+Z\` | Undo |
| \`Cmd+Shift+Z\` | Redo |

## Sidebar Navigation

### Left Sidebar

Your document tree. Create new pages, organize with favorites, and switch between documents. Press \`Cmd+\\\` to toggle.

- Click **New Page** to create a blank document
- **Open File** or **Open Folder** to import markdown files
- Right-click any page for context menu (Favorite, Reveal in Finder, Delete)
- Favorited pages appear at the top for quick access
- Duplicate files are detected and won't be added twice

### Right Sidebar

The **Table of Contents** — auto-generated from your document's headings. Click any heading to scroll directly to that section. Works in all view modes including Source view.

## File Management

- **Drag & Drop** — Drop \`.md\` files or folders directly onto the window
- **Open File / Folder** — Use the sidebar buttons or Tauri file dialog
- **Deduplication** — Files are tracked by path; reopening the same file activates the existing copy
- **Reveal in Finder** — Right-click any imported file to open its location in Finder
- **Export** — Export documents as HTML or Markdown via the File menu

## Settings

Click **Settings** at the bottom of the left sidebar to access:

- Dark / Light mode toggle
- Keyboard shortcuts reference
- About MarkMan

## Auto-Save

All your documents are automatically saved to your browser's local storage. Changes are saved within 500ms of your last edit — no save button needed.

> **Tip:** Try importing a markdown file, then press \`Cmd+E\` to cycle through Preview, Edit, and Source views!
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
