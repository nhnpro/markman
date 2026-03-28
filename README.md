# MarkMan

A beautiful Notion-style markdown document viewer with a unique 3D page-flip animation. Write, edit, and read markdown documents in a clean, interactive interface.

## Features

- **3D Page Flip** — Drag from the corner to peel the page like a real book, revealing the raw markdown source underneath
- **WYSIWYG Editor** — Rich text editing powered by MDXEditor with formatting toolbar (bold, italic, headings, lists, links, code)
- **Preview Mode** — Clean read-only rendered view with no editor UI
- **Source View** — Dark-themed raw markdown editor with syntax highlighting
- **Left Sidebar** — Document tree with favorites, search, and new page creation
- **Right Sidebar** — Auto-generated table of contents with click-to-scroll
- **Command Palette** — `Cmd+K` to quickly search and jump between documents
- **Drag & Drop Import** — Drop `.md` files or entire folders to import them as pages
- **Auto-Save** — All changes saved to localStorage automatically
- **Keyboard Shortcuts** — `Cmd+E` flip, `Cmd+K` search, `Cmd+\` toggle sidebar

## Tech Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS v4
- MDXEditor (WYSIWYG markdown editing)
- react-markdown + remark-gfm (preview rendering)

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+E` | Flip between preview and source |
| `Cmd+K` | Open command palette |
| `Cmd+\` | Toggle left sidebar |
| `Cmd+Shift+\` | Toggle right sidebar |
| `Cmd+B` | Bold (in editor) |
| `Cmd+I` | Italic (in editor) |

## License

MIT
