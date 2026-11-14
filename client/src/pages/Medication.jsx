import { useMemo, useState } from 'react'
import Chat from '../components/Chat'
import StatusPill from '../components/StatusPill'
import { askAi } from '../lib/api'
import { MED_NOTICE, MED_SOURCE, MEDICINES, answerOffline, searchMedicines } from '../lib/medSearch'
import { DISCLAIMER } from '../lib/safety'

const PACKS = [...new Set(MEDICINES.map((m) => m.pack))]

// AI 2: Medication Assistant. Answers only from the ISS medical kit list (medicines.json).
export default function Medication() {
  async function ask(question) {
    const res = await askAi('medication', { question })
    if (res.fallback) return { text: answerOffline(question), source: 'offline', reason: res.reason }
    return { text: res.answer, source: res.source }
  }

  return (
    <div className="grid grid-2 top">
      <section className="card">
        <h2>Ask about a medicine</h2>
        <p className="muted small">Try a suggestion or ask about a symptom or a medicine name.</p>
        <Chat
          icon="meds"
          ask={ask}
          placeholder="For example: what is on board for motion sickness?"
          quickQuestions={['What is on board for a headache?', 'Do we have aspirin?', 'Tell me about meclizine', 'What helps with trouble sleeping?']}
          intro="Hi. I only know the medicines in the station's medical kit list. For anything else, or if you feel unwell, please contact the flight surgeon."
        />
        <p className="disclaimer spaced">
          {DISCLAIMER} Always check with the flight surgeon before taking anything. Your medication questions stay private.
        </p>
      </section>

      <KitList />
    </div>
  )
}

function KitList() {
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState('crew')
  const [pack, setPack] = useState('')

  const list = useMemo(() => {
    let items = query.trim() ? searchMedicines(query) : MEDICINES
    if (scope === 'crew') items = items.filter((m) => m.access === 'crew')
    if (pack) items = items.filter((m) => m.pack === pack)
    return items
  }, [query, scope, pack])

  return (
    <section className="card quiet" aria-labelledby="kit-h">
      <span className="tag">[ {MED_NOTICE} ]</span>
      <h2 id="kit-h">Medical kit list</h2>
      <p className="muted small">{MED_SOURCE}</p>
      <div className="med-tools">
        <label htmlFor="med-search" className="sr-only">
          Search medicines or symptoms
        </label>
        <input id="med-search" type="search" placeholder="Search a medicine or a symptom" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="chips" role="group" aria-label="Which medicines">
          <button type="button" className="chip" aria-pressed={scope === 'crew'} onClick={() => setScope('crew')}>
            Crew self-care pack
          </button>
          <button type="button" className="chip" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>
            Whole kit
          </button>
        </div>
        {scope === 'all' && (
          <select aria-label="Pack" value={pack} onChange={(e) => setPack(e.target.value)}>
            <option value="">All packs</option>
            {PACKS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        )}
      </div>
      <p className="small muted" aria-live="polite">
        {list.length} medicine{list.length === 1 ? '' : 's'}
      </p>
      <ul className="med-list">
        {list.map((m) => (
          <li key={`${m.name}-${m.pack}`}>
            <details>
              <summary>
                <strong>{m.name}</strong>
                <span className="small muted">{m.strength}</span>
                <StatusPill status={m.access === 'crew' ? 'green' : 'yellow'}>{m.access === 'crew' ? 'Crew self-care' : 'Flight surgeon only'}</StatusPill>
              </summary>
              <dl>
                <dt>Used for</dt>
                <dd>{m.usedFor.join(', ')}</dd>
                <dt>How</dt>
                <dd>
                  {m.route}, {m.unit}
                </dd>
                {m.comments && (
                  <>
                    <dt>List says</dt>
                    <dd>{m.comments}</dd>
                  </>
                )}
                <dt>Side effects</dt>
                <dd>{m.sideEffects}</dd>
                <dt>Where</dt>
                <dd>
                  {m.pack}, location {m.location}
                </dd>
              </dl>
            </details>
          </li>
        ))}
      </ul>
    </section>
  )
}
