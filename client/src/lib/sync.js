// Background sync: sends this device's new shareable records to Supabase and brings back
// what changed elsewhere. The privacy rules in Supabase decide what each person may send and see.
// Runs every 30 seconds while signed in, when the internet comes back, and right after something
// new is saved.
//
// Never synced: check-ins, moods, private notes, greenhouse notes. Family messages go through
// their own relay (below), only when the ground link is open.
import { useSyncExternalStore } from 'react'
import { db, getSetting, setSetting, upsertByUid } from './db'
import { cloudReady, currentUser, refreshCrew } from './auth'
import { supabase } from './supabase'
import { seal, unseal } from './secure'
import { checkServer } from './connection'

const TABLES = {
  astronaut: ['readings', 'reactionTests', 'alerts', 'sharedNotes', 'careMessages', 'crewStatus'],
  doctor: ['alerts', 'careMessages', 'doctorNotes', 'auditLog'],
}
const PULL_TABLES = ['readings', 'reactionTests', 'alerts', 'sharedNotes', 'careMessages', 'doctorNotes', 'crewStatus', 'auditLog']

// Which local records this person should send.
function shouldSend(user, table, r) {
  if (r.synced) return false
  if (user.role === 'astronaut') return r.userId === user.crewId && (table !== 'careMessages' || r.from === 'astronaut')
  if (table === 'alerts') return Boolean(r.reviewPending)
  if (table === 'careMessages') return r.from === 'doctor'
  if (table === 'auditLog') return r.doctor === user.email
  return true
}

const status = { phase: 'idle', lastSyncAt: null, message: '', newItems: 0 }
let snap = { ...status }
const listeners = new Set()
function set(patch) {
  Object.assign(status, patch)
  snap = { ...status }
  listeners.forEach((l) => l())
}

export function useSyncStatus() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => snap,
  )
}

let running = null
let again = false

// Starts a sync. If one is already running, another one follows right after it,
// so something saved during a sync is not left waiting for the next 30-second round.
export function syncNow() {
  if (running) {
    again = true
    return running
  }
  running = doSync().finally(() => {
    running = null
    if (again) {
      again = false
      syncNow()
    }
  })
  return running
}

let soon = null
// Call after saving something shareable: syncs about a second later.
export function requestSync() {
  clearTimeout(soon)
  soon = setTimeout(() => syncNow(), 1200)
}

async function doSync() {
  const user = currentUser()
  if (!user) return
  if (!navigator.onLine) return set({ phase: 'waiting', message: 'No internet. Everything is saved on this device.' })
  if (await getSetting('blackout', false)) return set({ phase: 'waiting', message: 'Ground link down (practice mode). Changes wait on this device.' })
  if (!(await cloudReady())) {
    return set({ phase: 'waiting', message: user.expired ? 'Sign-in ran out. Use Reconnect to keep syncing.' : 'Signed in offline. Use Reconnect at the top to sync.' })
  }
  if (!(await checkServer(15000))) return set({ phase: 'waiting', message: 'Ground link not reachable. Changes wait on this device.' })

  set({ phase: 'syncing', message: 'Syncing…' })
  try {
    await pushRecords(user)
    const newItems = (await pullRecords(user)) + (user.role === 'astronaut' ? await syncFamily(user) : 0)
    await refreshCrew(Boolean(user.sample))
    set({ phase: 'done', lastSyncAt: Date.now(), message: '', newItems })
    if (newItems) notify(newItems)
  } catch (err) {
    // Signed out while this sync was running: stop quietly; nothing is lost, it is sent next time.
    if (err === SIGNED_OUT) return set({ phase: 'idle', message: '' })
    console.warn('Sync failed', err)
    set({ phase: 'error', message: 'Sync did not finish. It will try again shortly.' })
  }
}

// Thrown when the person signed out (or someone else signed in) during a sync.
const SIGNED_OUT = new Error('Signed out during sync')

// Is the person this sync started for still the one signed in, online too?
// A refusal that arrives after they signed out is not a real refusal: the record is kept and sent later.
async function stillSignedIn(user) {
  const now = currentUser()
  if (!now || now.email !== user.email) return false
  const { data } = await supabase.auth.getSession()
  return (data.session?.user?.email ?? '').toLowerCase() === user.email
}

// Does this person have anything on this device that still has to be sent?
async function hasUnsent(user) {
  for (const table of TABLES[user.role] ?? []) {
    if (await db[table].filter((r) => shouldSend(user, table, r)).count()) return true
  }
  if (user.role !== 'astronaut') return false
  return (await db.family.where('userId').equals(user.crewId).filter((m) => m.status === 'queued').count()) > 0
}

// Call before signing out. Sends what is still waiting (for up to 5 seconds) so the next person
// who signs in on this device does not start with someone else's unsent changes.
// Anything that does not make it stays safely on this device and is sent at the next sign-in.
export async function finishBeforeSignOut(maxMs = 5000) {
  stopAutoSync()
  clearTimeout(soon)
  again = false
  const user = currentUser()
  const flush = async () => {
    if (running) await running
    again = false
    if (user && (await hasUnsent(user))) await syncNow()
  }
  await Promise.race([flush().catch(() => {}), new Promise((resolve) => setTimeout(resolve, maxMs))])
}

// A local record in the shape Supabase stores: who it is about (crew_id) and the record itself (data).
function toRow(table, r) {
  const { id: _id, synced: _s, reviewPending: _r, localOnly: _l, ...data } = r
  return { uid: r.uid, kind: table, crew_id: table === 'auditLog' ? r.astronautId : r.userId, data }
}

const isRuleError = (error) => error && (error.code === '42501' || error.code === 'P0001' || error.code === '23514' || /row-level security|violates/i.test(error.message ?? ''))

async function markSent(table, uid, localOnly = false) {
  await upsertByUid(table, { uid, synced: true, reviewPending: false, ...(localOnly ? { localOnly: true } : {}) })
}

async function pushRecords(user) {
  for (const table of TABLES[user.role] ?? []) {
    const rows = await db[table].filter((r) => shouldSend(user, table, r)).toArray()
    if (!rows.length) continue

    // A flight surgeon's alert review goes through review_alert (only the review can change).
    if (user.role === 'doctor' && table === 'alerts') {
      for (const r of rows) {
        const { data, error } = await supabase.rpc('review_alert', { alert_uid: r.uid, is_reviewed: Boolean(r.reviewed), note: r.reviewNote ?? '' })
        if (error && !isRuleError(error)) throw error
        if (error && !(await stillSignedIn(user))) throw SIGNED_OUT
        // No such alert online (for example sample-crew data that only exists on this device): keep it here.
        if (error || !data) await markSent(table, r.uid, true)
        else await upsertByUid(table, { ...data, synced: true, reviewPending: false })
      }
      continue
    }

    const batch = rows.map((r) => toRow(table, r))
    const { error } = await supabase.from('records').upsert(batch, { onConflict: 'uid' })
    if (!error) {
      for (const r of rows) await markSent(table, r.uid)
      continue
    }
    if (!isRuleError(error)) throw error
    if (!(await stillSignedIn(user))) throw SIGNED_OUT
    // Something in the batch was refused: send one by one and keep refused ones on this device.
    for (const row of batch) {
      const one = await supabase.from('records').upsert(row, { onConflict: 'uid' })
      if (one.error && !isRuleError(one.error)) throw one.error
      if (one.error && !(await stillSignedIn(user))) throw SIGNED_OUT
      await markSent(table, row.uid, Boolean(one.error))
    }
  }
}

// Saves one record that came from Supabase. If the same record was changed on this device and
// not sent yet (for example a review saved while this sync was running), the local version is kept:
// it is sent next, and the new online version comes back after. One transaction, so a change
// made at the same moment cannot be overwritten.
function applyPulled(table, record) {
  return db.transaction('rw', db[table], async () => {
    const local = await db[table].where('uid').equals(record.uid).first()
    if (local && local.synced === false) return 'kept'
    if (local) await db[table].update(local.id ?? local.uid, record)
    else await db[table].add(record)
    return local ? 'updated' : 'added'
  })
}

// Brings back everything this person may see that changed since the last sync.
async function pullRecords(user) {
  const seqKey = `cloudSeq:${user.email}`
  // A small overlap, in case two changes were saved at the same moment. Saving twice is harmless.
  let since = Math.max(0, (await getSetting(seqKey, 0)) - 25)
  let newItems = 0
  for (let page = 0; page < 20; page++) {
    const { data, error } = await supabase.from('records').select('uid, kind, data, seq').gt('seq', since).order('seq').limit(500)
    if (error) throw error
    for (const row of data ?? []) {
      if (!PULL_TABLES.includes(row.kind)) continue
      since = Math.max(since, row.seq)
      const result = await applyPulled(row.kind, { ...row.data, uid: row.uid, synced: true, reviewPending: false })
      if (result === 'added' && row.kind === 'careMessages' && row.data.from === 'doctor' && user.role === 'astronaut') newItems++
    }
    if ((data ?? []).length < 500) break
  }
  await setSetting(seqKey, since)
  return newItems
}

// Sends queued family messages and collects replies (the family relay in Supabase).
async function syncFamily(user) {
  const queued = await db.family.where('userId').equals(user.crewId).filter((m) => m.status === 'queued').toArray()
  for (const m of queued) {
    const row = {
      uid: m.uid,
      direction: 'out',
      contact: m.contact,
      contact_name: m.contactName || m.contact,
      body: await unseal(m.text),
      photo: m.photo ? await unseal(m.photo) : null,
    }
    const { error } = await supabase.from('family_messages').upsert(row, { onConflict: 'uid', ignoreDuplicates: true })
    if (error) {
      if (!isRuleError(error)) throw error
      continue // refused (for example a photo that is too big): it stays queued on this device
    }
    await db.family.update(m.id, { status: 'sent', sentAt: Date.now() })
  }

  const cursorKey = `familyCursor:${user.email}`
  const cursor = await getSetting(cursorKey, '1970-01-01T00:00:00Z')
  // Look back two minutes as well, then skip the ones already here.
  const from = new Date(new Date(cursor).getTime() - 120000).toISOString()
  const { data, error } = await supabase
    .from('family_messages')
    .select('uid, contact, contact_name, body, photo, auto_reply, reply_to, deliver_at')
    .eq('direction', 'in')
    .gt('deliver_at', from)
    .order('deliver_at')
    .limit(200)
  if (error) throw error
  let added = 0
  let latest = cursor
  for (const m of data ?? []) {
    if (m.deliver_at > latest) latest = m.deliver_at
    if (await db.family.where('uid').equals(m.uid).count()) continue
    await db.family.add({
      uid: m.uid,
      userId: user.crewId,
      contact: m.contact,
      contactName: m.contact_name,
      direction: 'in',
      text: await seal(m.body),
      photo: m.photo ? await seal(m.photo) : null,
      status: 'received',
      read: false,
      auto: Boolean(m.auto_reply),
      createdAt: new Date(m.deliver_at).getTime(),
    })
    added++
  }
  await setSetting(cursorKey, latest)
  return added
}

// A gentle system notification for new messages, only if the person allowed it in Settings.
async function notify(count) {
  try {
    if (document.visibilityState === 'visible') return
    if (!(await getSetting('notifications', false)) || Notification.permission !== 'granted') return
    new Notification('Orbloom', { body: `${count} new message${count > 1 ? 's' : ''} arrived.`, icon: '/favicon.svg' })
  } catch {
    // Notifications not available here.
  }
}

let timer = null
export function startAutoSync() {
  stopAutoSync()
  syncNow()
  timer = setInterval(syncNow, 30000)
  window.addEventListener('online', syncNow)
}
export function stopAutoSync() {
  clearInterval(timer)
  window.removeEventListener('online', syncNow)
}
