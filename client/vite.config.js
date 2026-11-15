import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// After a build, writes the full list of app files into the service worker (dist/sw.js),
// so a phone saves the WHOLE app on its first visit and every page opens with no internet,
// even pages that were never opened online.
function precacheEverything() {
  let outDir = 'dist'
  return {
    name: 'orbloom-precache',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const files = []
      const walk = (dir) => {
        for (const name of readdirSync(dir)) {
          const full = path.join(dir, name)
          if (statSync(full).isDirectory()) walk(full)
          else files.push(path.relative(outDir, full).split(path.sep).join('/'))
        }
      }
      walk(outDir)
      const list = ['./', ...files.filter((f) => f !== 'sw.js' && !f.endsWith('.map')).sort()]
      const version = createHash('sha256').update(list.join('\n')).digest('hex').slice(0, 12)
      const swFile = path.join(outDir, 'sw.js')
      const sw = readFileSync(swFile, 'utf8').replace("'__PRECACHE__'", JSON.stringify(list)).replace('__VERSION__', version)
      writeFileSync(swFile, sw)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), precacheEverything()],
  // Relative paths, so the built app also works from a sub-folder (or GitHub Pages).
  base: './',
  build: { chunkSizeWarningLimit: 700 },
  server: {
    // Always port 5173. If it is busy, stop with an error instead of quietly using another port
    // (that once made an older copy of the app appear instead of the new one).
    port: 5173,
    strictPort: true,
  },
})
