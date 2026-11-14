// Sign-in for the app.
//
// 1. Normally the app asks the server (server/auth.js). The server checks the scrambled (hashed)
//    password and returns a signed token. The token is sent with every sync and AI request.
// 2. If the server cannot be reached (no ground link), the app checks the password on the device
//    against a PBKDF2 "verifier" (a one-way scramble), so astronauts are never locked out offline.
//    Offline sign-ins have no token: syncing and the AI wait until the next online sign-in.
//
// DEMO ACCOUNTS: every password is "demo1234".
import { useEffect, useState } from 'react'
import { apiLogin } from './api'

const ACCOUNTS = [
  { email: 'maya.chen@orbloom.demo', name: 'Maya Chen', role: 'astronaut', crewId: 'a1', salt: '6555eb3c35cf97a973285fa15b9891a7', verifier: 'e49a42c348c253856e1d5243031c94afc2d2c493b09d07b2a3260567051a123b' },
  { email: 'leo.okafor@orbloom.demo', name: 'Leo Okafor', role: 'astronaut', crewId: 'a2', salt: '3f2667064e64489057c53f2bb9b34d53', verifier: '037a4275eedf44cda7d67d0a87766a9942a3bd3cf01df529afa8a2d3788662c5' },
  { email: 'sara.lindqvist@orbloom.demo', name: 'Sara Lindqvist', role: 'astronaut', crewId: 'a3', salt: '8f475f23378125f0d14ad54bdf3ef604', verifier: '20d8e8d0facd1628029f65182efe415f836f8e885e6ce6e3ce147a4816c243e5' },
  { email: 'dr.rivera@orbloom.demo', name: 'Dr. Ana Rivera', role: 'doctor', salt: '17412acb39e32e3d26695247a7d50034', verifier: '513da0ab2522efca5ebbbd976d74403ca6ca7af0ca7a93fc9dc4c74d6713c477' },
  { email: 'dr.patel@orbloom.demo', name: 'Dr. Dev Patel', role: 'doctor', salt: '9fa8ec900b6c7005610bac8c1ddadbae', verifier: '741bbad6836dec94c15dba83ffd29c3d7dfcb603993100f4c93527d75185c6fb' },
]

// The account suggested on the sign-in page for each role.
export const DEMO_ACCOUNT = {
  astronaut: { email: 'maya.chen@orbloom.demo', password: 'demo1234' },
  doctor: { email: 'dr.rivera@orbloom.demo', password: 'demo1234' },
}

export const ROLE_LABEL = { astronaut: 'Astronaut', doctor: 'Flight surgeon' }

const KEY = 'orbloom-session'
const EVENT = 'orbloom-session-change'
let memory = null // used only if the browser blocks sessionStorage

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const unhex = (s) => Uint8Array.from(s.match(/../g).map((h) => parseInt(h, 16)))

async function checkOffline(account, password) {
  if (!globalThis.crypto?.subtle) return false
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(account.salt), iterations: 100000 }, base, 256)
  return hex(bits) === account.verifier
}

function store(session) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session))
  } catch {
    memory = session
  }
  window.dispatchEvent(new Event(EVENT))
}

// Returns { ok: true, session } or { ok: false, error }.
export async function login(email, password, role) {
  const cleanEmail = email.trim().toLowerCase()
  const account = ACCOUNTS.find((a) => a.email === cleanEmail)
  if (account && role && account.role !== role) {
    return { ok: false, error: `That is a ${ROLE_LABEL[account.role].toLowerCase()} account. Choose “${ROLE_LABEL[account.role]}” above and sign in again.` }
  }

  const res = await apiLogin(cleanEmail, password)
  if (res.ok) {
    const session = { ...res.user, token: res.token, online: true, signedInAt: Date.now() }
    store(session)
    return { ok: true, session }
  }
  if (res.status === 401 || res.status === 429) return { ok: false, error: res.error }

  // Server not reachable: check on the device instead.
  if (account && (await checkOffline(account, password))) {
    const session = { email: account.email, name: account.name, role: account.role, crewId: account.crewId ?? null, token: null, online: false, signedInAt: Date.now() }
    store(session)
    return { ok: true, session }
  }
  return { ok: false, error: 'That email and password do not match an account. Check both and try again.' }
}

export function currentUser() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || 'null') ?? memory
  } catch {
    return memory
  }
}

export function getToken() {
  return currentUser()?.token ?? null
}

// Called when the server says the token has run out.
export function markTokenExpired() {
  const user = currentUser()
  if (user?.token) store({ ...user, token: null, expired: true })
}

export function logout() {
  memory = null
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(EVENT))
}

// React hook: the signed-in user (or null). Updates on sign in and sign out.
export function useSession() {
  const [user, setUser] = useState(currentUser)
  useEffect(() => {
    const update = () => setUser(currentUser())
    window.addEventListener(EVENT, update)
    return () => window.removeEventListener(EVENT, update)
  }, [])
  return user
}

// The crew id of the signed-in astronaut ("a1" for Maya).
export function useMe() {
  return useSession()?.crewId ?? null
}
