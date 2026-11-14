// Talks to the online part of Orbloom (Supabase). If there is no ground link, no sign-in, no AI key,
// or the AI fails, the AI calls return { fallback: true } so the screen can show the offline answer.
import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js'
import { cloudReady } from './auth'
import { SUPABASE_KEY, SUPABASE_URL, supabase } from './supabase'

const AI_FUNCTION = 'orbloom-ai'

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new FunctionsFetchError('timeout')), ms))])

// which: 'health' or 'doctor-summary'
export async function askAi(which, body) {
  if (!navigator.onLine) return { fallback: true, reason: 'server-unreachable' }
  if (!(await cloudReady())) return { fallback: true, reason: 'no-session' }
  try {
    const { data, error } = await withTimeout(supabase.functions.invoke(AI_FUNCTION, { body: { which, ...body } }), 35000)
    if (error) {
      if (error instanceof FunctionsHttpError && error.context?.status === 401) return { fallback: true, reason: 'no-session' }
      if (error instanceof FunctionsFetchError) return { fallback: true, reason: 'server-unreachable' }
      return { fallback: true, reason: 'server-error' }
    }
    return data ?? { fallback: true, reason: 'server-error' }
  } catch {
    return { fallback: true, reason: 'server-unreachable' }
  }
}

// Is Supabase reachable, and does the AI have a key? No sign-in needed.
export async function getStatus() {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${AI_FUNCTION}`, {
      headers: { apikey: SUPABASE_KEY },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.ok ? data : null
  } catch {
    return null
  }
}

const KEY_HELP = 'Add your Groq key in Supabase (Edge Functions, Secrets, name GROQ_API_KEY).'

export const FALLBACK_REASONS = {
  'no-key': `No AI key is set yet, so this is a pre-written offline answer. ${KEY_HELP}`,
  'example-key': `The AI key in Supabase is still example text, so this is a pre-written offline answer. ${KEY_HELP}`,
  'bad-key': 'Groq did not accept the AI key saved in Supabase, so this is a pre-written offline answer. Make a new Groq key and save it as the GROQ_API_KEY secret.',
  'ai-error': 'The AI service did not answer, so this is a pre-written offline answer.',
  'ai-busy': 'The AI is busy (the free Groq plan allows a few questions per minute), so this is a pre-written offline answer. Try again in a minute.',
  'server-error': 'The online service had a problem, so this is a pre-written offline answer.',
  'server-unreachable': 'There is no ground link (internet) right now, so this is a pre-written offline answer.',
  'no-session': 'You signed in while offline, so the AI is paused. Use “Reconnect” at the top of the page. This is a pre-written offline answer.',
}
