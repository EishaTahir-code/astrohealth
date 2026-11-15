import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// After an update, a page file from the older version may be gone: reload once to get the new one.
window.addEventListener('vite:preloadError', (event) => {
  if (!navigator.onLine) return // the page shows what to do instead
  try {
    if (sessionStorage.getItem('orbloom-reloaded')) return
    sessionStorage.setItem('orbloom-reloaded', '1')
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})

// Offline install: keep a copy of the app's files so Orbloom opens with no internet.
// Only in the built app (npm run build), not while developing.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Not available here (for example inside a preview frame). The app still works online.
    })
  })
}
