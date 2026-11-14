// Status label that never relies on colour alone: it always has a shape and words.
const SHAPES = { green: '●', yellow: '▲', red: '■', none: '○' }

export default function StatusPill({ status = 'none', children }) {
  return (
    <span className={`pill ${status}`}>
      <span aria-hidden="true">{SHAPES[status]}</span>
      {children}
    </span>
  )
}
