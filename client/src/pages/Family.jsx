import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Icon } from '../components/Icons'
import { db } from '../lib/db'
import { unseal } from '../lib/secure'
import { addContact, connectionPrompt, queueMessage, shrinkPhoto, useContacts } from '../lib/family'
import { useLink } from '../lib/connection'
import { syncNow, useSyncStatus } from '../lib/sync'

// Family Space (PRD 6.7): private messages with home. Written offline, queued on this device,
// sent when a communication window (ground link) opens. Text and photos are encrypted on the device.
export default function Family({ me }) {
  const contacts = useContacts(me)
  const [picked, setPicked] = useState(null)
  const active = picked ?? contacts?.[0]?.id
  const messages = useLiveQuery(() => db.family.where('userId').equals(me).sortBy('createdAt'), [me])
  const plain = useDecrypted(messages)
  const link = useLink()
  const sync = useSyncStatus()

  // Opening a conversation marks its messages as read.
  useEffect(() => {
    if (!messages) return
    const unread = messages.filter((m) => m.contact === active && m.direction === 'in' && !m.read)
    if (unread.length) db.family.bulkUpdate(unread.map((m) => ({ key: m.id, changes: { read: true } })))
  }, [messages, active])

  if (!messages || !contacts) return <p className="muted">Loading…</p>

  const queued = messages.filter((m) => m.status === 'queued').length
  const thread = plain.filter((m) => m.contact === active)
  const contact = contacts.find((c) => c.id === active)
  const prompt = connectionPrompt(contacts, messages)

  return (
    <div className="family-layout">
      <section className="card" aria-labelledby="contacts-h">
        <h2 id="contacts-h">People</h2>
        <ul className="contact-list">
          {contacts.map((c) => {
            const last = [...plain].reverse().find((m) => m.contact === c.id)
            const unread = messages.filter((m) => m.contact === c.id && m.direction === 'in' && !m.read).length
            return (
              <li key={c.id}>
                <button type="button" aria-pressed={active === c.id} onClick={() => setPicked(c.id)}>
                  <span className="avatar" aria-hidden="true">{c.name.replace(/[^A-Za-z]/g, '')[0]}</span>
                  <span className="who-text">
                    <strong>{c.name}</strong>
                    <span>{last ? last.text || 'Photo' : 'No messages yet'}</span>
                  </span>
                  {unread > 0 && (
                    <span className="nav-badge">
                      {unread}
                      <span className="sr-only"> new</span>
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
        <AddContact me={me} onAdded={(c) => setPicked(c.id)} first={!contacts.length} />
        <p className="muted small spaced">Family replies in this demo are pre-written and arrive about 20 seconds after you write.</p>
      </section>

      <section className="card" aria-labelledby="thread-h">
        <div className={`link-status`} role="status">
          <i className={`dot ${link.open ? 'on' : 'off'}`} aria-hidden="true" />
          <span>
            {link.open
              ? queued
                ? `Ground link open. Sending ${queued} message${queued > 1 ? 's' : ''}…`
                : 'Ground link open. New messages send right away.'
              : `No ground link right now${link.blackout ? ' (practice mode)' : ''}. ${queued ? `${queued} message${queued > 1 ? 's' : ''} waiting safely on this device.` : 'Messages you write will wait on this device.'}`}
          </span>
          {link.open && (
            <button type="button" className="link-btn small" onClick={() => syncNow()} disabled={sync.phase === 'syncing'} style={{ marginLeft: 'auto' }}>
              Check for replies
            </button>
          )}
        </div>

        <h2 id="thread-h">{contact?.name}</h2>
        <p className="prompt-line">{prompt}</p>

        <div className="thread" aria-live="polite">
          {!thread.length && <p className="muted">No messages with {contact?.name} yet.</p>}
          {thread.map((m) => (
            <div key={m.uid} className={`msg ${m.direction}`}>
              {m.text}
              {m.photo && <img src={m.photo} alt={m.direction === 'in' ? `Picture from ${m.contactName}` : 'Your photo'} />}
              <span className="meta">
                <span>{new Date(m.createdAt).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                {m.direction === 'out' && <span>{m.status === 'queued' ? 'Waiting for the ground link' : 'Sent'}</span>}
                {m.demo && m.direction === 'in' && <span>Demo message</span>}
              </span>
            </div>
          ))}
        </div>

        {contact ? <Composer key={active} me={me} contact={contact} /> : <p className="muted">Add someone from home on the left to start writing.</p>}
      </section>
    </div>
  )
}

// Adds a person from home to write to.
function AddContact({ me, onAdded, first }) {
  const [name, setName] = useState('')
  const [open, setOpen] = useState(first)
  if (!open) {
    return (
      <button type="button" className="link-btn small" onClick={() => setOpen(true)}>
        + Add someone from home
      </button>
    )
  }
  async function add(e) {
    e.preventDefault()
    const c = await addContact(me, name)
    if (c) {
      setName('')
      setOpen(false)
      onAdded(c)
    }
  }
  return (
    <form className="add-contact" onSubmit={add}>
      <label htmlFor="contact-name">{first ? 'Who would you like to write to?' : 'Add someone from home'}</label>
      <div className="row">
        <input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="For example: Mum, or Sam" maxLength={60} />
        <button className="btn small-btn" type="submit" disabled={!name.trim()}>
          Add
        </button>
      </div>
    </form>
  )
}

function Composer({ me, contact }) {
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function pickPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    try {
      setPhoto(await shrinkPhoto(file))
    } catch (err) {
      setError(err.message)
    }
    e.target.value = ''
  }

  async function send(e) {
    e.preventDefault()
    if (!text.trim() && !photo) return
    setBusy(true)
    await queueMessage({ userId: me, contact: contact.id, contactName: contact.name, text: text.trim(), photo })
    setText('')
    setPhoto(null)
    setBusy(false)
  }

  return (
    <form onSubmit={send}>
      <label htmlFor="family-text" className="sr-only">
        Message to {contact?.name}
      </label>
      <textarea id="family-text" value={text} onChange={(e) => setText(e.target.value)} placeholder={`Write to ${contact?.name}…`} maxLength={2000} />
      {photo && (
        <div className="photo-preview">
          <img src={photo} alt="Photo to send" />
          <button type="button" className="link-btn small" onClick={() => setPhoto(null)}>
            Remove photo
          </button>
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
      <div className="row form-actions">
        <button className="btn" type="submit" disabled={busy || (!text.trim() && !photo)}>
          Send
        </button>
        <label className="btn secondary" htmlFor="family-photo" style={{ marginBottom: 0 }}>
          <Icon name="photo" size={18} /> Add a photo
        </label>
        <input id="family-photo" type="file" accept="image/*" className="sr-only" onChange={pickPhoto} />
      </div>
    </form>
  )
}

// Unscrambles message text and photos for display (they are encrypted in the database).
function useDecrypted(messages) {
  const [plain, setPlain] = useState([])
  const key = useMemo(() => (messages ?? []).map((m) => `${m.uid}:${m.status}:${m.read}`).join('|'), [messages])
  useEffect(() => {
    let alive = true
    Promise.all(
      (messages ?? []).map(async (m) => ({ ...m, text: await unseal(m.text), photo: m.photo ? await unseal(m.photo) : null })),
    ).then((list) => alive && setPlain(list))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return plain
}
