import Chat from '../components/Chat'
import { askAi } from '../lib/api'
import { MED_NOTICE, MEDICINES, answerOffline } from '../lib/medSearch'
import { DISCLAIMER } from '../lib/safety'

// AI 2: Medication Assistant. Answers only from the spacecraft medicine list.
export default function Medication() {
  async function ask(question) {
    const res = await askAi('medication', { question })
    if (res.fallback) return { text: answerOffline(question), source: 'offline', reason: res.reason }
    return { text: res.answer, source: res.source }
  }

  return (
    <div className="grid grid-2" style={{ alignItems: 'start' }}>
      <section className="card">
        <h2>Medication assistant</h2>
        <p className="muted small">Ask about medicines on the spacecraft list. It cannot answer about anything else.</p>
        <Chat
          ask={ask}
          placeholder="For example: what can I use for motion sickness?"
          quickQuestions={['What is on board for a headache?', 'Do we have aspirin?', 'Tell me about meclizine']}
          intro="Hi. I only know the medicines on the spacecraft list. For anything else, or if you feel unwell, please contact the flight surgeon."
        />
        <p className="disclaimer" style={{ marginTop: '1rem' }}>
          {DISCLAIMER} Your medication questions stay private on this device.
        </p>
      </section>

      <section className="card quiet">
        <div className="alert yellow small" style={{ marginBottom: '1rem' }}>
          <strong>{MED_NOTICE}.</strong> These 5 entries are made up for the demo and have no doses on purpose.
        </div>
        <h2>Spacecraft medicine list</h2>
        <ul style={{ paddingLeft: '1.1rem', margin: 0 }}>
          {MEDICINES.map((m) => (
            <li key={m.name} style={{ marginBottom: '0.5rem' }}>
              <strong>{m.name}</strong>
              <br />
              <span className="muted small">Used for: {m.usedFor.join(', ')}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
