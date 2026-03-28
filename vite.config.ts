import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// In Tauri production build, use relative paths
// In Tauri dev or plain web dev, use /
// For GitHub Pages deployment, set VITE_BASE=/markman/ env var
const base = process.env.VITE_BASE || './';

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    strictPort: true,
    port: 1420,
  },
})
