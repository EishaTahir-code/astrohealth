// Sign-in for the app, with Supabase Auth (accounts live in the Orbloom Supabase project).
//
// 1. Online: Supabase checks the email and password. The app then reads the person's profile
//    (name, astronaut or flight surgeon, crew id). Supabase keeps a signed token in this browser
//    and sends it with every sync and AI request.
// 2. Offline (no ground link): the app checks the password on the device against a PBKDF2
//    "verifier" (a one-way scramble saved the last time this person signed in online here),
//    so astronauts are never locked out. Syncing and the AI wait until the link is back.
// 3. New people sign up here too. Flight surgeons need the invite code (checked by Supabase).
//
// SAMPLE ACCOUNTS (the made-up sample crew): every password is "orbloom2026".
import { useEffect, useState } from 'react'
import { getSetting, setSetting } from './db'
import { appUrl, hasCloudSession, isNetworkError, supabase } from './supabase'
import { saveCrew, setCrewWorld } from '../data/crew'

// Sample accounts can sign in offline even on a brand-new device (verifiers made with PBKDF2).
const ACCOUNTS = [
  { email: 'maya.chen@orbloom.crew', name: 'Maya Chen', role: 'astronaut', crewId: 'a1', salt: '6555eb3c35cf97a973285fa15b9891a7', verifier: '0525cd409ac64f523968143935edee301e535ff9804d9e826097e8437b2de21d' },
  { email: 'leo.okafor@orbloom.crew', name: 'Leo Okafor', role: 'astronaut', crewId: 'a2', salt: '3f2667064e64489057c53f2bb9b34d53', verifier: '4149ddef32f3932e50d3fdbd32a3fb4b1a2cf7a9f72a0da1df2b27805c03972e' },
  { email: 'sara.lindqvist@orbloom.crew', name: 'Sara Lindqvist', role: 'astronaut', crewId: 'a3', salt: '8f475f23378125f0d14ad54bdf3ef604', verifier: '95d890074e8fbf917a465d28bba5ec70e40b1a7659b4414a741905526a337735' },
  { email: 'arjun.mehta@orbloom.crew', name: 'Arjun Mehta', role: 'astronaut', crewId: 'a4', salt: 'fb2f6f6bfff23cddbee6a477b50610aa', verifier: '747e267dfe1791f8cff0805c2d0d0d43a7f7a4824bce3195b49d71802cd62f52' },
  { email: 'hana.sato@orbloom.crew', name: 'Hana Sato', role: 'astronaut', crewId: 'a5', salt: '631dcd9c70f5c8dcbae53a0f04117558', verifier: '4b4808508587a853b7c9233773b6e74be1518cc9b89a05e1746ccf96a43cacfd' },
  { email: 'tomas.alvarez@orbloom.crew', name: 'Tomás Alvarez', role: 'astronaut', crewId: 'a6', salt: '5975f38a5de64d0f57c18a709c36f47e', verifier: 'ed324222a56351a77a5cac979861b5c18f2e4d15718b521f1c48ff1f3cd83416' },
  { email: 'amara.nwosu@orbloom.crew', name: 'Amara Nwosu', role: 'astronaut', crewId: 'a7', salt: '97ba304395940f671397d6931acb74a7', verifier: '1c866d2922befd14315a4f3771c3a4e580fa98be5967c02593df3d6221d89039' },
  { email: 'elena.petrova@orbloom.crew', name: 'Elena Petrova', role: 'astronaut', crewId: 'a8', salt: 'bb1f628804819dcebf3e6aad577c0f5d', verifier: '30ba930d92acdb30de92eb500e812fd7602d81f123bc00841d0b36d998ccecbb' },
  { email: 'dr.rivera@orbloom.crew', name: 'Dr. Ana Rivera', role: 'doctor', salt: '17412acb39e32e3d26695247a7d50034', verifier: 'a492598293b1475487f5315572b3b6d2b4d2edbc14f96d795ca74034b11aa891' },
  { email: 'dr.patel@orbloom.crew', name: 'Dr. Dev Patel', role: 'doctor', salt: '9fa8ec900b6c7005610bac8c1ddadbae', verifier: 'b0c41d66f0d2ab4a310e819c5a7beeb8ba7be23c0d88bf1d9d0b41b10705f578' },
]

// The account suggested on the sign-in page for each role.
export const SAMPLE_ACCOUNT = {
  astronaut: { email: 'maya.chen@orbloom.crew', password: 'orbloom2026' },
  doctor: { email: 'dr.rivera@orbloom.crew', password: 'orbloom2026' },
}

export const ROLE_LABEL = { astronaut: 'Astronaut', doctor: 'Flight surgeon' }

const KEY = 'orbloom-session'
const EVENT = 'orbloom-session-change'
let memory = null // used only if the browser blocks sessionStorage

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const unhex = (s) => Uint8Array.from(s.match(/../g).map((h) => parseInt(h, 16)))

async function pbkdf2(password, saltHex) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(saltHex), iterations: 100000 }, base, 256)
  return hex(bits)
}

async function checkOffline(account, password) {
  if (!globalThis.crypto?.subtle) return false
  return (await pbkdf2(password, account.salt)) === account.verifier
}

// After an online sign-in, remember a verifier so this person can also sign in here offline later.
async function rememberForOffline(session, password) {
  if (!globalThis.crypto?.subtle) return
  try {
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)))
    const verifier = await pbkdf2(password, salt)
    const { email, name, role, crewId, sample } = session
    await setSetting(`offline:${email}`, { email, name, role, crewId, sample, salt, verifier })
  } catch {
    // Offline sign-in just won't be available for this account on this device.
  }
}

async function offlineAccount(email) {
  return ACCOUNTS.find((a) => a.email === email) ?? (await getSetting(`offline:${email}`, null).catch(() => null))
}

function store(session) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session))
  } catch {
    memory = session
  }
  window.dispatchEvent(new Event(EVENT))
}

const NO_MATCH = 'That email and password do not match an account. Check both and try again.'
const wrongRole = (role) => `That is a ${ROLE_LABEL[role].toLowerCase()} account. Choose “${ROLE_LABEL[role]}” above and sign in again.`

// Reads the signed-in person's profile and the crew of their world, then saves the app session.
async function finishOnlineSignIn(authUser, password, role) {
  const { data: profile, error } = await supabase.from('profiles').select('name, role, crew_id, title, sample').eq('id', authUser.id).maybeSingle()
  if (error || !profile) {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
    return { ok: false, error: isNetworkError(error) ? 'The ground link dropped while signing in. Try again.' : 'This account has no Orbloom profile yet. Try again in a minute, or sign up again.' }
  }
  if (role && profile.role !== role) {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
    return { ok: false, error: wrongRole(profile.role) }
  }
  const session = {
    email: authUser.email.toLowerCase(),
    name: profile.name,
    role: profile.role,
    crewId: profile.role === 'astronaut' ? profile.crew_id : null,
    title: profile.title,
    sample: profile.sample,
    online: true,
    signedInAt: Date.now(),
  }
  await refreshCrew(profile.sample)
  if (password) await rememberForOffline(session, password)
  store(session)
  return { ok: true, session }
}

// Updates the crew list (names for the garden and the doctor's list) from Supabase.
export async function refreshCrew(isSample) {
  try {
    const { data, error } = await supabase.from('profiles').select('name, role, crew_id, title, flower, bloom, sample').order('created_at')
    if (error) throw error
    await saveCrew(isSample, data ?? [])
  } catch {
    await setCrewWorld(isSample)
  }
}

// Returns { ok: true, session } or { ok: false, error }.
export async function login(email, password, role) {
  const cleanEmail = email.trim().toLowerCase()
  const known = ACCOUNTS.find((a) => a.email === cleanEmail)
  if (known && role && known.role !== role) return { ok: false, error: wrongRole(known.role) }

  let networkDown = !navigator.onLine
  if (!networkDown) {
    try {
      // A weak or half-working connection can hang for a long time: after 8 seconds, sign in on the device instead.
      const attempt = await Promise.race([
        supabase.auth.signInWithPassword({ email: cleanEmail, password }),
        new Promise((resolve) => setTimeout(() => resolve({ timedOut: true }), 8000)),
      ])
      if (attempt.timedOut) throw new Error('timeout')
      const { data, error } = attempt
      if (!error && data?.user) return await finishOnlineSignIn(data.user, password, role)
      if (isNetworkError(error)) networkDown = true
      else if (error?.code === 'email_not_confirmed') return { ok: false, error: 'Please confirm your email first: open the link Supabase sent you, then sign in.' }
      else if (error?.status === 429) return { ok: false, error: 'Too many tries. Wait a few minutes and try again.' }
      else return { ok: false, error: NO_MATCH }
    } catch {
      networkDown = true
    }
  }

  // No ground link: check on the device instead.
  const account = await offlineAccount(cleanEmail)
  if (account && (await checkOffline(account, password))) {
    if (role && account.role !== role) return { ok: false, error: wrongRole(account.role) }
    const session = { email: account.email, name: account.name, role: account.role, crewId: account.crewId ?? null, sample: ACCOUNTS.includes(account) || Boolean(account.sample), online: false, signedInAt: Date.now() }
    await setCrewWorld(session.sample)
    store(session)
    return { ok: true, session }
  }
  if (networkDown && !account) {
    return { ok: false, error: 'No ground link, and this account has not signed in on this device before. Sign in once while online, then it works offline too.' }
  }
  return { ok: false, error: NO_MATCH }
}

// Creates a new account. Flight surgeons need the invite code.
// Returns { ok: true, session } when the account is ready, { ok: true, confirm: true } when Supabase
// first wants the email confirmed, or { ok: false, error }.
export async function signUp({ name, email, password, role, inviteCode }) {
  const cleanEmail = email.trim().toLowerCase()
  const cleanName = name.trim().replace(/\s+/g, ' ').slice(0, 80)
  if (!cleanName) return { ok: false, error: 'Please write your name.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { ok: false, error: 'Please write a full email address, like name@example.com.' }
  if (password.length < 8) return { ok: false, error: 'Please choose a password with at least 8 characters.' }
  if (role === 'doctor' && !inviteCode.trim()) return { ok: false, error: 'Flight surgeon accounts need the invite code from the mission team.' }
  if (!navigator.onLine) return { ok: false, error: 'Creating an account needs the ground link (internet). Try again when you are online.' }

  try {
    if (role === 'doctor') {
      const { data: codeOk, error: codeError } = await supabase.rpc('doctor_invite_ok', { code: inviteCode.trim() })
      if (codeError) return { ok: false, error: signUpError(codeError) }
      if (!codeOk) return { ok: false, error: signUpError({ message: 'invite code' }) }
    }
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { name: cleanName, role, ...(role === 'doctor' ? { invite_code: inviteCode.trim() } : {}) }, emailRedirectTo: appUrl() },
    })
    if (error) return { ok: false, error: signUpError(error) }
    if (data?.session && data.user) return await finishOnlineSignIn(data.user, password, role)
    return { ok: true, confirm: true }
  } catch (err) {
    return { ok: false, error: signUpError(err) }
  }
}

function signUpError(error) {
  const text = `${error?.code ?? ''} ${error?.message ?? ''}`
  // (Checked first: Supabase reports this rule as a server error, which looks like a network problem.)
  if (/invite code/i.test(text)) return 'That flight surgeon invite code is not right. Check it with the mission team and try again.'
  if (isNetworkError(error)) return 'No ground link right now. Try again when you are online.'
  if (/Database error saving new user|unexpected_failure/i.test(text)) return 'Supabase could not save the new account. Check the details (and the invite code for flight surgeons), then try again.'
  if (/already registered|user_already_exists/i.test(text)) return 'There is already an account with that email. Sign in instead, or reset the password.'
  if (/email_address_invalid|invalid.*email/i.test(text)) return 'Supabase did not accept that email address. Please use a real email address you can open.'
  if (/weak_password|password/i.test(text)) return 'Please choose a stronger password (at least 8 characters, not a common word).'
  if (/sending confirmation email|over_email_send_rate_limit|rate limit/i.test(text)) {
    return 'Supabase could not send the confirmation email (its free email service only allows a few emails). Ask the app owner to turn off “Confirm email” in Supabase, or try again later.'
  }
  return 'The account could not be created. Please try again in a moment.'
}

// Sends a password-reset email. The link opens Orbloom, where a new password can be chosen.
export async function requestPasswordReset(email) {
  const cleanEmail = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { ok: false, error: 'Please write the email address of your account.' }
  if (cleanEmail.endsWith('@orbloom.crew')) return { ok: false, error: 'Sample accounts cannot reset their password. Their password is always orbloom2026.' }
  if (!navigator.onLine) return { ok: false, error: 'Resetting a password needs the ground link (internet).' }
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: appUrl() })
    if (error) {
      if (/rate limit|over_email_send_rate_limit/i.test(`${error.code} ${error.message}`)) return { ok: false, error: 'Too many emails were sent just now. Please wait a few minutes and try again.' }
      return { ok: false, error: isNetworkError(error) ? 'No ground link right now. Try again when you are online.' : 'The reset email could not be sent. Please try again later.' }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: 'No ground link right now. Try again when you are online.' }
  }
}

// After opening the reset link: saves the new password, then signs the person in.
export async function setNewPassword(password) {
  if (password.length < 8) return { ok: false, error: 'Please choose a password with at least 8 characters.' }
  const { data, error } = await supabase.auth.updateUser({ password })
  if (error || !data?.user) {
    return { ok: false, error: /same/i.test(error?.message ?? '') ? 'That is your old password. Please choose a new one.' : 'The new password could not be saved. Open the link from the email again.' }
  }
  return finishOnlineSignIn(data.user, password)
}

// "Recovery mode": true while someone who opened a password-reset link has not chosen a new password.
let recovering = false
const RECOVERY_EVENT = 'orbloom-recovery-change'
supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') {
    recovering = true
    window.dispatchEvent(new Event(RECOVERY_EVENT))
  }
})
export function useRecovery() {
  const [on, setOn] = useState(recovering)
  useEffect(() => {
    const update = () => setOn(recovering)
    window.addEventListener(RECOVERY_EVENT, update)
    update()
    return () => window.removeEventListener(RECOVERY_EVENT, update)
  }, [])
  return on
}
export function endRecovery() {
  recovering = false
  // Remove ?code=… from the address so a reload does not try the link again.
  try {
    window.history.replaceState(null, '', `${appUrl()}${window.location.hash || '#/'}`)
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(RECOVERY_EVENT))
}

export function currentUser() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || 'null') ?? memory
  } catch {
    return memory
  }
}

// Is there a live Supabase sign-in for the signed-in person (needed for syncing and the AI)?
export function cloudReady() {
  const user = currentUser()
  return user ? hasCloudSession(user.email) : Promise.resolve(false)
}

// Called when Supabase says the sign-in has run out.
export function markTokenExpired() {
  const user = currentUser()
  if (user?.online) store({ ...user, online: false, expired: true })
}

export function logout() {
  memory = null
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // ignore
  }
  supabase.auth.signOut({ scope: 'local' }).catch(() => {})
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

// React hook: true when Supabase holds a live sign-in for this email (so syncing and the AI work),
// false after an offline sign-in, null while checking.
export function useCloudReady(email) {
  const [ready, setReady] = useState(null)
  useEffect(() => {
    let alive = true
    const check = () => hasCloudSession(email).then((ok) => alive && setReady(ok))
    check()
    // (Supabase asks not to call it again from inside this callback, so check a moment later.)
    const { data } = supabase.auth.onAuthStateChange(() => setTimeout(check, 0))
    window.addEventListener(EVENT, check)
    return () => {
      alive = false
      data.subscription.unsubscribe()
      window.removeEventListener(EVENT, check)
    }
  }, [email])
  return ready
}

// The crew id of the signed-in astronaut ("a1" for Maya).
export function useMe() {
  return useSession()?.crewId ?? null
}
