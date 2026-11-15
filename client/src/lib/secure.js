// Encryption for private data saved on this device (AES-256-GCM, built into the browser).
//
// - The first time the app runs, it makes a random key and stores it in IndexedDB as
//   "non-extractable": the browser can use it, but no script can read or copy the key itself.
// - Private text and photos (check-in notes, family messages, greenhouse notes) are saved
//   scrambled with this key. Someone copying the database files sees only scrambled bytes.
// - Limit: the key lives on the same device as the data. A real mission would also
//   protect the key with the astronaut's passcode or the device's secure hardware.
import { db } from './db'

const enc = new TextEncoder()
const dec = new TextDecoder()
let keyPromise = null

export const encryptionAvailable = Boolean(globalThis.crypto?.subtle)

function deviceKey() {
  keyPromise ??= (async () => {
    const row = await db.keys.get('device')
    if (row?.key) return row.key
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
    await db.keys.put({ name: 'device', key, createdAt: Date.now() })
    return key
  })()
  return keyPromise
}

// In chunks, so large photos don't overflow the call stack.
function toB64(buf) {
  const bytes = new Uint8Array(buf)
  let text = ''
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(text)
}
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

// Scrambles text. Returns { sealed: true, iv, data } (or the plain text if this browser has no WebCrypto).
export async function seal(text) {
  if (text == null || text === '') return text ?? ''
  if (!encryptionAvailable) return String(text)
  const key = await deviceKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(String(text)))
  return { sealed: true, iv: toB64(iv), data: toB64(data) }
}

// Unscrambles what seal() made. Plain strings (older records) come back unchanged.
export async function unseal(value) {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (!value.sealed) return ''
  try {
    const key = await deviceKey()
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(value.iv) }, key, fromB64(value.data))
    return dec.decode(plain)
  } catch {
    return '[This entry cannot be opened on this device.]'
  }
}
