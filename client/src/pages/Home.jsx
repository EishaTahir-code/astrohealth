export default function Home() {
  return (
    <div className="page">
      <div className="page-head">
        <h1>Orbloom</h1>
        <p>
          A calm health companion for long space missions. It works without internet: everything is saved on this
          device first.
        </p>
      </div>
      <div className="doors">
        <a className="door" href="#/garden">
          <h2>Crew garden</h2>
          <p>See how everyone&apos;s flower bed is growing. No login needed.</p>
        </a>
        <a className="door" href="#/me">
          <h2>My space</h2>
          <p>Daily check-in, health graphs, the two assistants and the alertness game.</p>
        </a>
        <a className="door" href="#/doctor">
          <h2>Doctor</h2>
          <p>For flight surgeons: crew health trends and red-flag alerts.</p>
        </a>
      </div>
      <p className="disclaimer" style={{ marginTop: '2rem' }}>
        Demo app with made-up crew data. It gives general information only and does not replace professional medical
        care.
      </p>
    </div>
  )
}
