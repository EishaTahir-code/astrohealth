// Status label that never relies on colour alone: it always has a shape and words.
// With onAsk, a yellow or red pill becomes a button: hovering shows "Ask the assistant what
// this means", and clicking asks the Health assistant about that reading.
const SHAPES = { green: '●', yellow: '▲', red: '■', none: '○' }

export default function StatusPill({ status = 'none', children, onAsk }) {
  if (onAsk && (status === 'yellow' || status === 'red')) {
    return (
      <span className="ask-pill">
        <button type="button" className={`pill ${status} pill-btn`} onClick={onAsk}>
          <span aria-hidden="true">{SHAPES[status]}</span>
          {children}
          <span className="sr-only">. Ask the assistant what this means</span>
        </button>
        <span className="ask-tip" aria-hidden="true">
          Ask the assistant what this means
        </span>
      </span>
    )
  }
  return (
    <span className={`pill ${status}`}>
      <span aria-hidden="true">{SHAPES[status]}</span>
      {children}
    </span>
  )
}
