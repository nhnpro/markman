# MarkMan

A beautiful Notion-style markdown document viewer and editor. Write, edit, and read markdown documents in a clean, interactive interface with three seamless view modes.

## Features

- **Three View Modes** — Preview, Edit, and Source views with smooth fade transitions. Press `Cmd+E` to cycle through them
- **WYSIWYG Editor** — Rich text editing powered by MDXEditor with formatting toolbar (bold, italic, headings, lists, links, code)
- **Preview Mode** — Clean read-only rendered view with GFM table support
- **Source View** — Dark-themed raw markdown editor with syntax highlighting
- **Left Sidebar** — Document tree with favorites, search, file/folder import, and settings
- **Right Sidebar** — Auto-generated table of contents with click-to-scroll (works in all view modes)
- **Command Palette** — `Cmd+K` to quickly search and jump between documents
- **File Management** — Open files/folders, drag-and-drop import, file deduplication by path
- **Context Menu** — Right-click documents to favorite, reveal in Finder, or delete
- **Settings Panel** — Dark mode toggle, keyboard shortcuts reference, about info
- **Export** — Export documents as HTML or Markdown
- **Auto-Save** — All changes saved to localStorage automatically
- **Dark Mode** — Full dark theme support
- **Desktop App** — Native macOS app built with Tauri

## Tech Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS v4
- Tauri 2 (native desktop)
- MDXEditor (WYSIWYG markdown editing)
- react-markdown + remark-gfm (preview rendering)

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:1420

### Build Desktop App

```bash
npm run tauri build
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+E` | Cycle view mode (Preview → Edit → Source) |
| `Cmd+K` | Open command palette |
| `Cmd+\` | Toggle left sidebar |
| `Cmd+Shift+\` | Toggle right sidebar |
| `Cmd+S` | Save |
| `Cmd+Shift+S` | Save As |
| `Cmd+Z` | Undo |
| `Cmd+Shift+Z` | Redo |

## License

MIT
