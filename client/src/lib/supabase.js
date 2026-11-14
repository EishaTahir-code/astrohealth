// The connection to Supabase (the online part of Orbloom: accounts, shared records, family relay, AI).
//
// These two values are PUBLIC on purpose: every visitor's browser needs them to reach Supabase.
// The "publishable" key only lets people do what the privacy rules (Row Level Security) allow,
// so it is safe to have in the code. The secret keys and the Groq AI key are never in this app.
import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://tjvycqynezzwdojzwufu.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_GyKd17P0FU0U6tUMgBkvoA_pjisxcrR'

// Every request gives up after 20 seconds, so a dropped link never leaves syncing stuck.
function fetchWithTimeout(url, options = {}) {
  const timeout = AbortSignal.timeout(20000)
  const signal = options.signal && AbortSignal.any ? AbortSignal.any([options.signal, timeout]) : options.signal ?? timeout
  return fetch(url, { ...options, signal })
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  global: { fetch: fetchWithTimeout },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // "pkce": the password-reset link comes back as ?code=… which works with the app's #/ page links.
    flowType: 'pkce',
    storageKey: 'orbloom-auth',
  },
})

// The address of this app, used in password-reset emails (works locally and on GitHub Pages).
export function appUrl() {
  return `${window.location.origin}${window.location.pathname}`
}

// True if Supabase holds a live sign-in for this email (needed for syncing and the AI).
export async function hasCloudSession(email) {
  try {
    const { data } = await supabase.auth.getSession()
    const session = data?.session
    if (!session) return false
    return !email || session.user?.email?.toLowerCase() === email.toLowerCase()
  } catch {
    return false
  }
}

// Turns a Supabase sign-in error into a plain sentence.
export function isNetworkError(error) {
  if (!error) return false
  return error.name === 'AuthRetryableFetchError' || error.status === 0 || /fetch|network|Failed to fetch|Load failed/i.test(error.message ?? '')
}
