// Background sync: sends this device's new shareable records to the server and brings back
// what changed elsewhere. Runs every 30 seconds while signed in, when the internet comes back,
// and right after something new is saved.
//
// Never synced: check-ins, moods, private notes, greenhouse notes. Family messages go through
// their own relay (below), only when the ground link is open.
import { useSyncExternalStore } from 'react'
import { db, getSetting, setSetting, upsertByUid } from './db'
import { apiFamilyInbox, apiFamilySend, apiSync } from './api'
import { currentUser } from './auth'
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

export function syncNow() {
  running ??= doSync().finally(() => {
    running = null
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
  if (!user.token) {
    return set({ phase: 'waiting', message: user.expired ? 'Sign in again to keep syncing.' : 'Signed in offline. Sign in again while connected to sync.' })
  }
  if (!(await checkServer())) return set({ phase: 'waiting', message: 'App server not reachable. Changes wait on this device.' })

  set({ phase: 'syncing', message: 'Syncing…' })
  try {
    const push = {}
    for (const table of TABLES[user.role] ?? []) {
      const rows = await db[table].filter((r) => shouldSend(user, table, r)).toArray()
      if (rows.length) push[table] = rows.map(({ id: _id, synced: _s, reviewPending: _r, ...rest }) => rest)
    }
    const seqKey = `syncSeq:${user.email}`
    const since = await getSetting(seqKey, 0)
    const res = await apiSync(push, since)

    const accepted = new Set(res.accepted)
    const rejected = new Set(res.rejected ?? [])
    for (const [table, rows] of Object.entries(push)) {
      for (const r of rows) {
        if (accepted.has(r.uid)) await upsertByUid(table, { uid: r.uid, synced: true, reviewPending: false })
        // The server refused it (for example a review of demo data that only exists on this device):
        // keep it here and stop retrying.
        else if (rejected.has(r.uid)) await upsertByUid(table, { uid: r.uid, synced: true, reviewPending: false, localOnly: true })
      }
    }

    let newItems = 0
    for (const table of PULL_TABLES) {
      for (const row of res.pulled?.[table] ?? []) {
        const { _seq: _q, ...rest } = row
        const existed = await db[table].where('uid').equals(rest.uid).count()
        if (!existed && table === 'careMessages') newItems++
        await upsertByUid(table, { ...rest, synced: true, reviewPending: false })
      }
    }
    await setSetting(seqKey, res.seq)
    if (user.role === 'astronaut') newItems += await syncFamily(user)

    set({ phase: 'done', lastSyncAt: Date.now(), message: '', newItems })
    if (newItems) notify(newItems)
  } catch (err) {
    console.warn('Sync failed', err)
    set({ phase: 'error', message: 'Sync did not finish. It will try again shortly.' })
  }
}

// Sends queued family messages and collects replies.
async function syncFamily(user) {
  const queued = await db.family.where('userId').equals(user.crewId).filter((m) => m.status === 'queued').toArray()
  if (queued.length) {
    const messages = []
    for (const m of queued) {
      messages.push({ uid: m.uid, to: m.contact, text: await unseal(m.text), photo: m.photo ? await unseal(m.photo) : null, createdAt: m.createdAt })
    }
    const res = await apiFamilySend(messages)
    for (const uid of res.sent) {
      const m = queued.find((q) => q.uid === uid)
      if (m) await db.family.update(m.id, { status: 'sent', sentAt: res.sentAt })
    }
  }

  const seqKey = `familySeq:${user.email}`
  const inbox = await apiFamilyInbox(await getSetting(seqKey, 0))
  let added = 0
  for (const m of inbox.messages) {
    if (await db.family.where('uid').equals(m.uid).count()) continue
    await db.family.add({
      uid: m.uid,
      userId: user.crewId,
      contact: m.from,
      contactName: m.fromName,
      direction: 'in',
      text: await seal(m.text),
      photo: null,
      status: 'received',
      read: false,
      demo: Boolean(m.demo),
      createdAt: m.createdAt,
    })
    added++
  }
  await setSetting(seqKey, inbox.seq)
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
