// Talks to our backend. If the backend is down, has no key, or the AI fails,
// it returns { fallback: true } so the screen can show the offline answer.

export async function askAi(which, body) {
  try {
    const res = await fetch(`/api/ai/${which}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    })
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
    return await res.json()
  } catch {
    return null
  }
}

export const FALLBACK_REASONS = {
  'no-key': 'No AI key is set yet, so this is a pre-written offline answer.',
  'ai-error': 'The AI service did not answer, so this is a pre-written offline answer.',
  'server-error': 'The app server had a problem, so this is a pre-written offline answer.',
  'server-unreachable': 'You are offline or the app server is not running, so this is a pre-written offline answer.',
}
