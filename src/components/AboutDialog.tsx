declare const APP_VERSION: string;
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutDialog({ isOpen, onClose }: Props) {
  const { state } = useApp();

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative rounded-2xl shadow-2xl border w-[420px] max-w-[90vw] overflow-hidden ${
        state.darkMode ? 'bg-stone-900 border-stone-700' : 'bg-white border-stone-200'
      }`}>
        {/* Header with gradient */}
        <div className="h-28 bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500 flex items-center justify-center relative">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-3xl font-bold shadow-lg border border-white/30">
            M
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-white/80 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 text-center">
          <h2 className={`text-xl font-bold mb-0.5 ${state.darkMode ? 'text-stone-100' : 'text-stone-900'}`}>
            MarkMan
          </h2>
          <p className={`text-xs mb-4 ${state.darkMode ? 'text-stone-500' : 'text-stone-400'}`}>
            Version {APP_VERSION}
          </p>

          <p className={`text-sm leading-relaxed mb-4 ${state.darkMode ? 'text-stone-300' : 'text-stone-600'}`}>
            A beautiful Notion-style markdown document viewer. Write, edit, and read markdown documents in a clean, interactive interface with three seamless view modes.
          </p>

          <div className={`rounded-lg px-4 py-3 mb-4 text-left text-sm ${
            state.darkMode ? 'bg-stone-800' : 'bg-stone-50'
          }`}>
            <div className={`font-medium mb-2 ${state.darkMode ? 'text-stone-200' : 'text-stone-700'}`}>Features</div>
            <ul className={`space-y-1 text-xs ${state.darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
              <li>Three view modes: Preview, Edit, Source (Cmd+E to cycle)</li>
              <li>WYSIWYG markdown editor with formatting toolbar</li>
              <li>Dark mode, command palette, sidebar navigation</li>
              <li>Drag-and-drop files and folders with deduplication</li>
              <li>Right-click context menu with Reveal in Finder</li>
              <li>Export as HTML or Markdown</li>
              <li>Auto-save to local storage</li>
            </ul>
          </div>

          <div className={`rounded-lg px-4 py-3 mb-4 text-left text-sm ${
            state.darkMode ? 'bg-stone-800' : 'bg-stone-50'
          }`}>
            <div className={`font-medium mb-1 ${state.darkMode ? 'text-stone-200' : 'text-stone-700'}`}>Created by</div>
            <p className={`text-xs ${state.darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
              <span className="font-medium">NamNH</span> &mdash; Built with React, TypeScript, Tailwind CSS, and Tauri.
            </p>
          </div>

          <div className={`flex items-center justify-center gap-4 text-xs ${state.darkMode ? 'text-stone-500' : 'text-stone-400'}`}>
            <a
              href="https://github.com/nhnpro/markman"
              target="_blank"
              rel="noopener noreferrer"
              className={`hover:underline ${state.darkMode ? 'hover:text-stone-300' : 'hover:text-stone-600'}`}
            >
              GitHub
            </a>
            <span>&middot;</span>
            <a
              href="https://nhnpro.github.io/markman/"
              target="_blank"
              rel="noopener noreferrer"
              className={`hover:underline ${state.darkMode ? 'hover:text-stone-300' : 'hover:text-stone-600'}`}
            >
              Web Version
            </a>
            <span>&middot;</span>
            <span>MIT License</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
