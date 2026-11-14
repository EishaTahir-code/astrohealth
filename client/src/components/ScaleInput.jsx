// A row of 1-5 buttons (radio buttons underneath, so keyboards and screen readers work).
export default function ScaleInput({ name, label, low, high, value, onChange }) {
  return (
    <fieldset className="field scale-field">
      <legend className="scale-legend">{label}</legend>
      <div className="scale">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n}>
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
            />
            <span>{n}</span>
          </label>
        ))}
      </div>
      <div className="scale-ends" aria-hidden="true">
        <span>1 = {low}</span>
        <span>5 = {high}</span>
      </div>
    </fieldset>
  )
}
