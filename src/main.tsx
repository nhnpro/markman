// Import Prism before anything else — MDXEditor's Lexical code needs it globally
import Prism from 'prismjs'
;(window as unknown as Record<string, unknown>).Prism = Prism

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
