// Connection status, shown on every screen (the PRD says sync status must always be visible).
//
// "Ground link open" = the device is online AND Supabase (the online part of Orbloom) answers AND
// the astronaut has not switched on practice mode ("Pretend the ground link is down" in Settings).
import { useEffect, useSyncExternalStore } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getStatus } from './api'
import { db } from './db'

// aiProblem: why the AI is off ('missing', 'example' or 'refused' key), or null.
const state = { online: navigator.onLine, server: null, ai: null, aiProblem: null }
let snapshot = { ...state }
const listeners = new Set()

function emit() {
  snapshot = { ...state }
  listeners.forEach((l) => l())
}

let lastCheck = 0

// maxAge: reuse a successful check from the last few milliseconds instead of asking again.
export async function checkServer(maxAge = 0) {
  if (maxAge && state.server && navigator.onLine && Date.now() - lastCheck < maxAge) return true
  const s = navigator.onLine ? await getStatus() : null
  lastCheck = Date.now()
  state.online = navigator.onLine
  state.server = Boolean(s)
  state.ai = s ? Boolean(s.ai?.health) : false
  state.aiProblem = s ? s.ai?.problem ?? null : null
  emit()
  return state.server
}

let started = false
function start() {
  if (started) return
  started = true
  const check = () => checkServer()
  check()
  setInterval(check, 30000)
  window.addEventListener('online', check)
  window.addEventListener('offline', check)
}

function subscribe(listener) {
  start()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useLink() {
  const s = useSyncExternalStore(subscribe, () => snapshot)
  const blackout = useLiveQuery(() => db.settings.get('blackout').then((r) => Boolean(r?.value)), [], false)
  useEffect(() => {
    start()
  }, [])
  return { ...s, blackout, open: s.online && s.server === true && !blackout }
}
