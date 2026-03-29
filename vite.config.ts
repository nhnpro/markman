import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import pkg from './package.json'

// In Tauri production build, use relative paths
// In Tauri dev or plain web dev, use /
// For GitHub Pages deployment, set VITE_BASE=/markman/ env var
const base = process.env.VITE_BASE || './';

export default defineConfig({
  base,
  define: {
    APP_VERSION: JSON.stringify(pkg.version),
  },
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1200,
  },
  clearScreen: false,
  server: {
    strictPort: true,
    port: 1420,
  },
})
