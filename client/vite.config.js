import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Any request to /api goes to our backend, so the browser never needs the AI key.
    proxy: { '/api': 'http://127.0.0.1:3001' },
  },
})
