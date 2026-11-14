// Online/offline and AI status, shown on every screen
// (the PRD says connection status must always be visible).
import { useEffect, useState } from 'react'
import { getStatus } from './api'

export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

// true = at least one AI has a key, false = offline answers only, null = still checking.
export function useAiReady(online) {
  const [aiReady, setAiReady] = useState(null)
  useEffect(() => {
    let alive = true
    const check = () =>
      getStatus().then((s) => {
        if (alive) setAiReady(s ? s.ai.health || s.ai.medication : false)
      })
    check()
    const timer = setInterval(check, 30000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [online])
  return aiReady
}
