import { useState } from 'react'
import { FALLBACK_REASONS } from '../lib/api'

// Simple question-and-answer box, shared by both assistants.
// ask(question) must return { text, source, reason?, confidence? }.
export default function Chat({ ask, placeholder, quickQuestions = [], intro }) {
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)

  async function send(q) {
    const text = q.trim()
    if (!text || busy) return
    setMessages((m) => [...m, { from: 'me', text }])
    setQuestion('')
    setBusy(true)
    try {
      const answer = await ask(text)
      setMessages((m) => [...m, { from: 'ai', ...answer }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      {quickQuestions.length > 0 && (
        <div className="row">
          {quickQuestions.map((q) => (
            <button key={q} type="button" className="btn secondary" onClick={() => send(q)} disabled={busy}>
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="chat" aria-live="polite">
        {!messages.length && intro && <div className="bubble ai">{intro}</div>}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.from}`}>
            {m.text}
            {m.from === 'ai' && (
              <span className="source">
                {m.source === 'ai' && 'Answer from the AI assistant.'}
                {m.source === 'offline' && (FALLBACK_REASONS[m.reason] ?? 'Pre-written offline answer.')}
                {m.source === 'safety' && 'Safety rule: this needs a person, not an app.'}
                {m.confidence && ` Confidence: ${m.confidence}.`}
              </span>
            )}
          </div>
        ))}
        {busy && <div className="bubble ai muted">Thinking…</div>}
      </div>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          send(question)
        }}
      >
        <label htmlFor="chat-q" className="sr-only">Your question</label>
        <input
          id="chat-q"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={placeholder}
          maxLength={500}
          style={{ flex: '1 1 240px' }}
        />
        <button className="btn" type="submit" disabled={busy || !question.trim()}>
          Ask
        </button>
      </form>
    </div>
  )
}
