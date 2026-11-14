// Connection status, shown on every screen (the PRD says sync status must always be visible).
//
// "Ground link open" = the device is online AND the app server answers AND the astronaut has not
// switched on practice mode ("Pretend the ground link is down" in Settings).
import { useEffect, useSyncExternalStore } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getStatus } from './api'
import { db } from './db'

// oldServer: an older copy of the Orbloom server is answering (it lacks sign-in and sync).
// aiProblem: why the AI is off ('missing', 'example' or 'refused' key), or null.
const state = { online: navigator.onLine, server: null, ai: null, oldServer: false, aiProblem: null }
let snapshot = { ...state }
const listeners = new Set()

function emit() {
  snapshot = { ...state }
  listeners.forEach((l) => l())
}

export async function checkServer() {
  const s = navigator.onLine ? await getStatus() : null
  state.online = navigator.onLine
  state.server = Boolean(s)
  state.oldServer = Boolean(s) && (s.app !== 'orbloom' || (s.version ?? 0) < 3)
  state.ai = s && !state.oldServer ? Boolean(s.ai?.health) : false
  state.aiProblem = s && !state.oldServer ? s.ai?.problem ?? null : null
  emit()
  return state.server
}

let started = false
function start() {
  if (started) return
  started = true
  checkServer()
  setInterval(checkServer, 20000)
  window.addEventListener('online', checkServer)
  window.addEventListener('offline', checkServer)
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
  return { ...s, blackout, open: s.online && s.server === true && !s.oldServer && !blackout }
}
