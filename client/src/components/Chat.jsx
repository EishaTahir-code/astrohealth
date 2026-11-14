import { useId, useState } from 'react'
import { Icon } from './Icons'
import { FALLBACK_REASONS } from '../lib/api'

// Simple question-and-answer box, shared by both assistants.
// ask(question) must return { text, source, reason?, confidence? }.
// tone: 'lavender' (health assistant) or 'periwinkle' (medication assistant).
export default function Chat({ ask, placeholder, quickQuestions = [], intro, tone = 'lavender', icon = 'ai' }) {
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const inputId = useId()

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
    <div className={`chat-box tone-${tone}`}>
      {quickQuestions.length > 0 && (
        <div className="chips" aria-label="Suggested questions">
          {quickQuestions.map((q) => (
            <button key={q} type="button" className="chip" onClick={() => send(q)} disabled={busy}>
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="chat" aria-live="polite">
        {!messages.length && intro && <AiBubble icon={icon}>{intro}</AiBubble>}
        {messages.map((m, i) =>
          m.from === 'me' ? (
            <div key={i} className="bubble me">
              {m.text}
            </div>
          ) : (
            <AiBubble key={i} icon={icon}>
              {m.text}
              <span className="source">
                {m.source === 'ai' && 'Answer from the AI assistant.'}
                {m.source === 'offline' && (FALLBACK_REASONS[m.reason] ?? 'Pre-written offline answer.')}
                {m.source === 'safety' && 'Safety rule: this needs a person, not an app.'}
                {m.confidence && ` Confidence: ${m.confidence}.`}
              </span>
            </AiBubble>
          ),
        )}
        {busy && (
          <AiBubble icon={icon} muted>
            <span className="thinking">Thinking</span>
          </AiBubble>
        )}
      </div>

      <form
        className="ask-row"
        onSubmit={(e) => {
          e.preventDefault()
          send(question)
        }}
      >
        <label htmlFor={inputId} className="sr-only">Your question</label>
        <input
          id={inputId}
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={placeholder}
          maxLength={500}
        />
        <button className="btn" type="submit" disabled={busy || !question.trim()}>
          Ask
        </button>
      </form>
    </div>
  )
}

function AiBubble({ icon, muted, children }) {
  return (
    <div className={`bubble ai ${muted ? 'muted' : ''}`}>
      <span className="bubble-icon" aria-hidden="true">
        <Icon name={icon} size={18} />
      </span>
      <div className="bubble-text">{children}</div>
    </div>
  )
}
