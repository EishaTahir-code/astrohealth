import { useState } from 'react'
import GardenPlan from '../components/GardenPlan'
import { Logo } from '../components/Icons'
import { ConnectionStatus } from '../components/Shell'
import { DEMO_ACCOUNT, ROLE_LABEL, login, useSession } from '../lib/auth'

// First screen of the app. Astronauts and flight surgeons sign in here.
// want: the role needed for the page the person tried to open (optional).
export default function SignIn({ want }) {
  const user = useSession()
  const [role, setRole] = useState(want ?? 'astronaut')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function submit(e) {
    e.preventDefault()
    const res = login(email, password, role)
    if (!res.ok) {
      setError(res.error)
      return
    }
    // Go to the page they asked for, or their own dashboard.
    const section = window.location.hash.replace(/^#\/?/, '').split('/')[0]
    const home = res.session.role === 'doctor' ? 'doctor' : 'me'
    if (section !== home) window.location.hash = `#/${home}`
  }

  function chooseRole(next) {
    setRole(next)
    setError('')
  }

  function fillDemo() {
    setEmail(DEMO_ACCOUNT[role].email)
    setPassword(DEMO_ACCOUNT[role].password)
    setError('')
  }

  return (
    <div className="signin">
      <div className="signin-art">
        <GardenPlan className="signin-plan" />
        <p className="signin-caption">
          Every crew member tends a bed in the shared garden. Check in, rest well, and watch it bloom.
        </p>
      </div>

      <div className="signin-panel">
        <div className="signin-inner">
          <div className="brand brand-lg">
            <Logo size={40} /> <span>Orbloom</span>
          </div>
          <h1 className="signin-title">Welcome back to the garden</h1>
          <p className="muted">A calm health companion for long missions. Everything is saved on this device first.</p>

          {want && user && user.role !== want && (
            <p className="alert info small" role="status">
              You are signed in as {user.name}. This page is for {ROLE_LABEL[want].toLowerCase()}s, so sign in with a{' '}
              {ROLE_LABEL[want].toLowerCase()} account to open it.
            </p>
          )}

          <form onSubmit={submit} noValidate className="signin-form">
            <fieldset className="role-switch">
              <legend className="sr-only">I am signing in as</legend>
              {['astronaut', 'doctor'].map((r) => (
                <label key={r}>
                  <input type="radio" name="role" value={r} checked={role === r} onChange={() => chooseRole(r)} />
                  <span>{ROLE_LABEL[r]}</span>
                </label>
              ))}
            </fieldset>

            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <button className="btn big wide" type="submit">
              Sign in as {ROLE_LABEL[role].toLowerCase()}
            </button>
          </form>

          <div className="demo-hint small">
            <p>
              Demo account: <strong>{DEMO_ACCOUNT[role].email}</strong>, password <strong>{DEMO_ACCOUNT[role].password}</strong>.
              Fake login for the demo, not real security.
            </p>
            <button type="button" className="link-btn" onClick={fillDemo}>
              Fill in the demo account
            </button>
          </div>

          <a className="garden-link" href="#/garden">
            Visit the crew garden without signing in
          </a>

          <ConnectionStatus compact />
        </div>
      </div>
    </div>
  )
}
