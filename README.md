<p align="center">
  <img src="src-tauri/icons/128x128@2x.png" width="128" height="128" alt="MarkMan icon">
</p>

<h1 align="center">MarkMan</h1>

<p align="center">
  <strong>A beautiful, ultra-lightweight Notion-style markdown viewer & editor</strong>
</p>

<p align="center">
  <a href="https://github.com/nhnpro/markman/releases/latest"><img src="https://img.shields.io/github/v/release/nhnpro/markman?style=flat-square&color=blue&label=Download" alt="Latest Release"></a>
  <img src="https://img.shields.io/badge/platforms-macOS%20%7C%20Windows%20%7C%20Linux-brightgreen?style=flat-square" alt="Platforms">
  <img src="https://img.shields.io/badge/DMG-2.0%20MB-blueviolet?style=flat-square" alt="DMG Size">
  <img src="https://img.shields.io/badge/JS%20bundle-82%20KB%20gz-blue?style=flat-square" alt="JS Bundle">
  <img src="https://img.shields.io/github/license/nhnpro/markman?style=flat-square&color=orange" alt="License">
  <img src="https://img.shields.io/github/stars/nhnpro/markman?style=flat-square&color=yellow" alt="Stars">
</p>

---

## ✨ Features

| | Feature | Description |
|---|---|---|
| 🔄 | **Three View Modes** | Preview, Edit, and Source views with smooth fade transitions (`Cmd+E`) |
| ✏️ | **Markdown Editor** | Source editor with formatting toolbar, syntax highlighting, find & replace |
| 👁️ | **Preview Mode** | Clean rendered view with GFM tables, task lists, and code blocks |
| 💻 | **Source View** | Dark-themed raw markdown editor with line numbers |
| 📂 | **Left Sidebar** | Document tree with favorites, search, file/folder import, and settings |
| 📑 | **Right Sidebar** | Auto-generated table of contents with click-to-scroll |
| 🔍 | **Command Palette** | `Cmd+K` to quickly search and jump between documents |
| 📁 | **File Management** | Open files/folders, drag-and-drop import, path deduplication |
| 📤 | **Export** | Export documents as HTML or Markdown |
| 🌙 | **Dark Mode** | Full dark theme support |
| 💾 | **Auto-Save** | All changes saved automatically |
| 🖥️ | **Desktop App** | Native app for macOS, Windows, and Linux via Tauri |
| 🛠️ | **CLI Mode** | `markman serve file.md` — serve any markdown as styled HTML |

---

## 🪶 Lightweight by Design

MarkMan is aggressively optimized for minimal footprint:

| Metric | Value |
|---|---|
| 📦 macOS DMG | **2.0 MB** |
| �� Binary | **3.4 MB** |
| 📜 JS bundle (gzip) | **82 KB** |
| ⚡ Vite modules | **38** |
| 🔧 Build time | **~1 second** |

**Large file performance:**
- Virtualized editor — only visible lines are rendered (~100 DOM nodes regardless of file size)
- Rust-powered markdown rendering with batched event processing
- Debounced preview for files >50 KB — no lag during fast typing
- Handles 10,000+ line files smoothly

---

## 🚀 Getting Started

### Desktop App (Recommended)

Download the latest release for your platform:

> **[📦 Download MarkMan](https://github.com/nhnpro/markman/releases/latest)**

| Platform | File |
|---|---|
| 🍎 macOS (Intel + Apple Silicon) | `.dmg` |
| 🪟 Windows | `.msi` |
| 🐧 Linux | `.deb` / `.AppImage` |

### CLI Usage

```bash
# Open a file in the GUI
markman README.md

# Serve markdown as HTML
markman serve README.md --port 3000
```

### Build from Source

```bash
npm install
npm run dev          # Dev server at http://localhost:1420
npm run tauri build  # Build native desktop app
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd+E` | Cycle view mode (Preview → Edit → Source) |
| `Cmd+K` | Open command palette |
| `Cmd+\` | Toggle left sidebar |
| `Cmd+Shift+\` | Toggle right sidebar |
| `Cmd+S` | Save |
| `Cmd+Shift+S` | Save As |
| `Cmd+Z` / `Cmd+Shift+Z` | Undo / Redo |

---

## 🧰 Tech Stack

| | Technology | Purpose |
|---|---|---|
| ⚛️ | React 19 + TypeScript | Frontend framework |
| ⚡ | Vite 8 + Terser | Build & minification |
| 🎨 | Tailwind CSS v4 | Styling |
| 🦀 | Tauri 2 + Rust | Native desktop shell |
| 📖 | pulldown-cmark (Rust) | Markdown rendering |
| 🌐 | ureq | HTTP client |

---

## 📄 License

**MIT License** — free for everyone. See [LICENSE](LICENSE) for details.

Attribution is required: please credit this repository if you use or redistribute this project.

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/nhnpro">nhnpro</a>
</p>
