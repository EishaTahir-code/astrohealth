// FAKE demo accounts: one astronaut (Maya) and two doctors.
// WARNING: this is not real security. Passwords are in the code and checked in the browser.
// A real version must check logins on the server with hashed passwords (see TECH.md: JWT + OAuth2).
import { useEffect, useState } from 'react'
import { ME } from '../data/crew'

const ACCOUNTS = [
  { email: 'maya.chen@orbloom.demo', password: 'demo1234', name: 'Maya Chen', role: 'astronaut', crewId: ME },
  { email: 'dr.rivera@orbloom.demo', password: 'demo1234', name: 'Dr. Ana Rivera', role: 'doctor' },
  { email: 'dr.patel@orbloom.demo', password: 'demo1234', name: 'Dr. Dev Patel', role: 'doctor' },
]

// The account shown as a hint on the sign-in page for each role.
export const DEMO_ACCOUNT = {
  astronaut: { email: 'maya.chen@orbloom.demo', password: 'demo1234' },
  doctor: { email: 'dr.rivera@orbloom.demo', password: 'demo1234' },
}

export const ROLE_LABEL = { astronaut: 'Astronaut', doctor: 'Flight surgeon' }

const KEY = 'orbloom-session'
const EVENT = 'orbloom-session-change'

// Used only if the browser blocks sessionStorage.
let memory = null

// Returns { ok: true, session } or { ok: false, error }.
export function login(email, password, role) {
  const account = ACCOUNTS.find((a) => a.email === email.trim().toLowerCase() && a.password === password)
  if (!account) return { ok: false, error: 'That email and password do not match a demo account. Check both and try again.' }
  if (role && account.role !== role) {
    return { ok: false, error: `That is a ${ROLE_LABEL[account.role].toLowerCase()} account. Choose “${ROLE_LABEL[account.role]}” above and sign in again.` }
  }
  const session = { email: account.email, name: account.name, role: account.role, crewId: account.crewId ?? null }
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session))
  } catch {
    // Storage blocked: keep the session in memory until the page reloads.
    memory = session
  }
  window.dispatchEvent(new Event(EVENT))
  return { ok: true, session }
}

export function currentUser() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || 'null') ?? memory
  } catch {
    return memory
  }
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
