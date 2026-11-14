// Talks to our backend. If the backend is down, has no key, or the AI fails,
// the AI calls return { fallback: true } so the screen can show the offline answer.
import { getToken, markTokenExpired } from './auth'

async function call(path, { method = 'GET', body, timeout = 15000 } = {}) {
  const token = getToken()
  const res = await fetch(`/api/${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeout),
  })
  if (res.status === 401 && token) markTokenExpired()
  return res
}

export async function apiLogin(email, password) {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(8000),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.token) return { ok: true, token: data.token, user: data.user }
    if (res.status === 401 || res.status === 429) return { ok: false, status: res.status, error: data.error }
    return { ok: false, status: res.status }
  } catch {
    return { ok: false, status: 0 }
  }
}

// which: 'health', 'medication' or 'doctor-summary'
export async function askAi(which, body) {
  if (!getToken()) return { fallback: true, reason: 'no-session' }
  try {
    const res = await call(`ai/${which}`, { method: 'POST', body, timeout: 35000 })
    if (res.status === 401) return { fallback: true, reason: 'no-session' }
    if (!res.ok) return { fallback: true, reason: 'server-error' }
    return await res.json()
  } catch {
    return { fallback: true, reason: 'server-unreachable' }
  }
}

export async function getStatus() {
  try {
    const res = await fetch('/api/status', { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return null
    const data = await res.json()
    return data?.ok ? data : null
  } catch {
    return null
  }
}

export async function apiSync(push, since) {
  const res = await call('sync', { method: 'POST', body: { push, since }, timeout: 20000 })
  if (!res.ok) throw new Error(`sync ${res.status}`)
  return res.json()
}

export async function apiFamilySend(messages) {
  const res = await call('family/send', { method: 'POST', body: { messages }, timeout: 30000 })
  if (!res.ok) throw new Error(`family send ${res.status}`)
  return res.json()
}

export async function apiFamilyInbox(since) {
  const res = await call(`family/inbox?since=${since}`, { timeout: 15000 })
  if (!res.ok) throw new Error(`family inbox ${res.status}`)
  return res.json()
}

export const FALLBACK_REASONS = {
  'no-key': 'No AI key is set yet (add your Groq key to .env.health), so this is a pre-written offline answer.',
  'example-key': 'The .env.health file still has the example text instead of your Groq key, so this is a pre-written offline answer.',
  'bad-key': 'Groq did not accept the key in .env.health, so this is a pre-written offline answer. Check the key or make a new one.',
  'ai-error': 'The AI service did not answer, so this is a pre-written offline answer.',
  'ai-busy': 'The AI is busy (the free Groq plan allows a few questions per minute), so this is a pre-written offline answer. Try again in a minute.',
  'server-error': 'The app server had a problem, so this is a pre-written offline answer.',
  'server-unreachable': 'You are offline or the app server is not running, so this is a pre-written offline answer.',
  'no-session': 'You signed in while offline, so the AI is paused. Use “Reconnect” at the top of the page. This is a pre-written offline answer.',
}
