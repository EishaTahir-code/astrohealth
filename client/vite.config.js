import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative paths, so the built app also works from a sub-folder (or GitHub Pages).
  base: './',
  server: {
    // Any request to /api goes to our backend, so the browser never needs the AI key.
    proxy: { '/api': 'http://127.0.0.1:3001' },
  },
  // "npm run preview" (the built app) uses the same backend.
  preview: {
    proxy: { '/api': 'http://127.0.0.1:3001' },
  },
})
