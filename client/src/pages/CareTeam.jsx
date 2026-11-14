import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId } from '../lib/db'
import { requestSync } from '../lib/sync'
import { useLink } from '../lib/connection'

// Messages with the flight surgeon (doctor-to-astronaut messaging, TODO Phase 8),
// and the check-in notes this astronaut chose to share.
export default function CareTeam({ me, user }) {
  const messages = useLiveQuery(() => db.careMessages.where('userId').equals(me).sortBy('createdAt'), [me])
  const notes = useLiveQuery(() => db.sharedNotes.where('userId').equals(me).reverse().sortBy('createdAt'), [me])
  const link = useLink()
  const [text, setText] = useState('')

  // Opening this page marks the flight surgeon's messages as read.
  useEffect(() => {
    const unread = (messages ?? []).filter((m) => m.from === 'doctor' && !m.read)
    if (unread.length) db.careMessages.bulkUpdate(unread.map((m) => ({ key: m.id, changes: { read: true } })))
  }, [messages])

  async function send(e) {
    e.preventDefault()
    if (!text.trim()) return
    await db.careMessages.add({ uid: newId(), userId: me, from: 'astronaut', author: user.name, text: text.trim(), createdAt: Date.now(), read: true, synced: false })
    setText('')
    requestSync()
  }

  if (!messages || !notes) return <p className="muted">Loading…</p>

  return (
    <div className="grid grid-2 top">
      <section className="card" aria-labelledby="thread-h">
        <h2 id="thread-h">Messages</h2>
        <p className="muted small">For anything urgent, use “Get medical help” instead. Messages are private between you and the flight surgeons.</p>
        <div className="thread" aria-live="polite">
          {messages.map((m) => (
            <div key={m.uid} className={`msg ${m.from === 'doctor' ? 'in' : 'out'}`}>
              {m.text}
              <span className="meta">
                <span>{m.from === 'doctor' ? m.author : 'You'}</span>
                <span>{new Date(m.createdAt).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                {m.from === 'astronaut' && <span>{m.synced ? 'Delivered' : link.open ? 'Sending…' : 'Waiting for the ground link'}</span>}
              </span>
            </div>
          ))}
        </div>
        <form onSubmit={send}>
          <label htmlFor="care-text" className="sr-only">
            Message to the flight surgeon
          </label>
          <textarea id="care-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write to the flight surgeon…" maxLength={2000} />
          <button className="btn spaced-sm" type="submit" disabled={!text.trim()}>
            Send message
          </button>
        </form>
      </section>

      <section className="card quiet" aria-labelledby="notes-h">
        <h2 id="notes-h">Notes you shared</h2>
        <p className="muted small">You can share a check-in note by ticking “Also share this note” on the check-in page. Everything else stays private.</p>
        {notes.length ? (
          <ul className="notes">
            {notes.map((n) => (
              <li key={n.uid}>
                {n.text}
                <span className="meta">
                  {n.date} · {n.synced ? 'Shared' : 'Waiting for the ground link'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No shared notes yet.</p>
        )}
      </section>
    </div>
  )
}
