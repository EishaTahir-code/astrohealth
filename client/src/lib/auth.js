// FAKE doctor accounts for the demo.
// WARNING: this is not real security. Passwords are in the code and checked in the browser.
// A real version must check logins on the server with hashed passwords (see TECH.md: JWT + OAuth2).
const DOCTORS = [
  { email: 'dr.rivera@orbloom.demo', password: 'demo1234', name: 'Dr. Ana Rivera' },
  { email: 'dr.patel@orbloom.demo', password: 'demo1234', name: 'Dr. Dev Patel' },
]

const KEY = 'orbloom-doctor'

export function login(email, password) {
  const doc = DOCTORS.find((d) => d.email === email.trim().toLowerCase() && d.password === password)
  if (!doc) return null
  const session = { email: doc.email, name: doc.name }
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session))
  } catch {
    // Storage blocked: stay signed in until the page reloads.
  }
  return session
}

export function currentDoctor() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || 'null')
  } catch {
    return null
  }
}

export function logout() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
