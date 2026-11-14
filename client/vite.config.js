import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative paths, so the built app also works from a sub-folder (or GitHub Pages).
  base: './',
  server: {
    // Always port 5173. If it is busy, stop with an error instead of quietly using another port
    // (that once made an older copy of the app appear instead of the new one).
    port: 5173,
    strictPort: true,
    // Any request to /api goes to our backend, so the browser never needs the AI key.
    proxy: { '/api': 'http://127.0.0.1:3001' },
  },
  // "npm run preview" (the built app) uses the same backend.
  preview: {
    proxy: { '/api': 'http://127.0.0.1:3001' },
  },
})
