import { useMemo, useState } from 'react'
import StatusPill from '../components/StatusPill'
import { MED_NOTICE, MED_SOURCE, MEDICINES, searchMedicines } from '../lib/medSearch'

const PACKS = [...new Set(MEDICINES.map((m) => m.pack))]

// The station's medical kit list: search by medicine or symptom, filter by pack.
// Works fully offline (no AI). Always check with the flight surgeon before taking anything.
export default function Medication() {
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
    <section className="card" aria-labelledby="kit-h">
      <span className="tag">[ {MED_NOTICE} ]</span>
      <h2 id="kit-h">Medical kit list</h2>
      <p className="muted small">{MED_SOURCE}</p>
      <div className="med-tools">
        <label htmlFor="med-search" className="sr-only">
          Search medicines or symptoms
        </label>
        <input id="med-search" type="search" placeholder="Search a medicine or a symptom, for example “headache”" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="row">
          <div className="chips" role="group" aria-label="Which medicines">
            <button type="button" className="chip" aria-pressed={scope === 'crew'} onClick={() => setScope('crew')}>
              Crew self-care pack
            </button>
            <button type="button" className="chip" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>
              Whole kit
            </button>
          </div>
          {scope === 'all' && (
            <select aria-label="Pack" value={pack} onChange={(e) => setPack(e.target.value)} style={{ maxWidth: 360 }}>
              <option value="">All packs</option>
              {PACKS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          )}
        </div>
      </div>
      <p className="small muted" aria-live="polite">
        {list.length} medicine{list.length === 1 ? '' : 's'}
        {query.trim() && !list.length ? '. Not on the list: please contact the flight surgeon.' : ''}
      </p>
      <ul className="med-list wide">
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
      <p className="disclaimer spaced">Information only, not medical advice. Always check with the flight surgeon before taking anything.</p>
    </section>
  )
}
