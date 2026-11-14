// Connection status, shown on every screen (the PRD says sync status must always be visible).
//
// "Ground link open" = the device is online AND the app server answers AND the astronaut has not
// switched on practice mode ("Pretend the ground link is down" in Settings).
import { useEffect, useSyncExternalStore } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getStatus } from './api'
import { db } from './db'

const state = { online: navigator.onLine, server: null, ai: null }
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
  state.ai = s ? Boolean(s.ai.health || s.ai.medication) : false
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
  return { ...s, blackout, open: s.online && s.server === true && !blackout }
}
