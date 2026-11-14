// Family Space helpers: contacts, saving messages (encrypted), photos and gentle prompts.
// Messages are saved on this device first and wait in a queue until the ground link opens.
import { db, newId } from './db'
import { seal } from './secure'
import { requestSync } from './sync'

// FAKE family members for the demo crew (the server has the same list in server/family.js).
export const FAMILY = {
  a1: [
    { id: 'lin', name: 'Mum (Lin)' },
    { id: 'jun', name: 'Jun' },
    { id: 'ava', name: 'Ava' },
  ],
  a2: [
    { id: 'ngozi', name: 'Ngozi' },
    { id: 'tobi', name: 'Dad (Tobi)' },
  ],
  a3: [
    { id: 'erik', name: 'Erik' },
    { id: 'mormor', name: 'Mormor (Grandma)' },
  ],
}

export function contactsFor(crewId) {
  return FAMILY[crewId] ?? []
}

export async function queueMessage({ userId, contact, text, photo }) {
  const c = contactsFor(userId).find((x) => x.id === contact)
  await db.family.add({
    uid: newId(),
    userId,
    contact,
    contactName: c?.name ?? contact,
    direction: 'out',
    text: await seal(text),
    photo: photo ? await seal(photo) : null,
    status: 'queued',
    read: true,
    createdAt: Date.now(),
  })
  requestSync()
}

// Makes a photo small enough to send over a slow link (longest side 900 px, JPEG).
export function shrinkPhoto(file, max = 900) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.78))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That file could not be opened as a picture.'))
    }
    img.src = url
  })
}

// Gentle, no-pressure connection prompts (PRD 6.7).
const IDEAS = [
  'Share one small thing you noticed today.',
  'Describe what Earth looked like from the window.',
  'Tell them about a meal you enjoyed this week.',
  'Ask them about their day. A short note is enough.',
  'Send a photo of something on board that made you smile.',
]

export function connectionPrompt(contacts, messages, now = Date.now()) {
  const lastOut = {}
  for (const m of messages) if (m.direction === 'out') lastOut[m.contact] = Math.max(lastOut[m.contact] ?? 0, m.createdAt)
  const quiet = contacts
    .map((c) => ({ c, days: lastOut[c.id] ? Math.floor((now - lastOut[c.id]) / 86400000) : null }))
    .sort((a, b) => (b.days ?? 99) - (a.days ?? 99))[0]
  const idea = IDEAS[new Date(now).getDate() % IDEAS.length]
  if (!quiet) return idea
  if (quiet.days == null) return `You have not written to ${quiet.c.name} yet. ${idea}`
  if (quiet.days >= 4) return `It has been ${quiet.days} days since you wrote to ${quiet.c.name}. ${idea}`
  return idea
}
