import { useState } from 'react'
import { Logo } from '../components/Icons'
import { ConnectionStatus } from '../components/Shell'
import SignInMeadow from '../components/SignInMeadow'
import { DEMO_ACCOUNT, ROLE_LABEL, endRecovery, login, requestPasswordReset, setNewPassword, signUp, useSession } from '../lib/auth'

const TITLES = {
  signin: 'Welcome back to the garden',
  signup: 'Plant your flower bed',
  reset: 'Reset your password',
  newpw: 'Choose a new password',
}

// First screen of the app. Astronauts and flight surgeons sign in, create an account,
// or reset a forgotten password here.
// want: the role needed for the page the person tried to open (optional).
// recovery: true after opening a password-reset link from the email.
export default function SignIn({ want, recovery = false }) {
  const user = useSession()
  const [mode, setMode] = useState(recovery ? 'newpw' : 'signin')
  const [role, setRole] = useState(want ?? 'astronaut')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  function goHome(session) {
    // Go to the page they asked for, or their own dashboard.
    const section = window.location.hash.replace(/^#\/?/, '').split('/')[0]
    const home = session.role === 'doctor' ? 'doctor' : 'me'
    if (section !== home) window.location.hash = `#/${home}`
  }

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    let res
    if (mode === 'signin') res = await login(email, password, role)
    else if (mode === 'signup') res = await signUp({ name, email, password, role, inviteCode })
    else if (mode === 'reset') res = await requestPasswordReset(email)
    else res = await setNewPassword(password)
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    if (mode === 'reset') {
      setNotice('If that email has an Orbloom account, a reset link is on its way. Open it on this device to choose a new password.')
      return
    }
    if (res.confirm) {
      setNotice('Almost done: open the confirmation link we just emailed you, then come back and sign in.')
      switchMode('signin', true)
      return
    }
    if (mode === 'newpw') endRecovery()
    setPassword('')
    goHome(res.session)
  }

  function switchMode(next, keepNotice = false) {
    setMode(next)
    setError('')
    if (!keepNotice) setNotice('')
  }

  function chooseRole(next) {
    setRole(next)
    setError('')
  }

  function fillDemo() {
    switchMode('signin')
    setEmail(DEMO_ACCOUNT[role].email)
    setPassword(DEMO_ACCOUNT[role].password)
  }

  const submitLabel = {
    signin: busy ? 'Signing in…' : `Sign in as ${ROLE_LABEL[role].toLowerCase()}`,
    signup: busy ? 'Creating your account…' : `Create ${role === 'doctor' ? 'flight surgeon' : 'astronaut'} account`,
    reset: busy ? 'Sending…' : 'Email me a reset link',
    newpw: busy ? 'Saving…' : 'Save new password and sign in',
  }[mode]

  return (
    <div className="signin-page">
      <header className="signin-bar">
        <a className="brand" href="#/">
          <Logo /> <span>Orbloom</span>
        </a>
        <ConnectionStatus compact />
        <a className="btn secondary small-btn" href="#/garden">Crew garden</a>
      </header>
      <div className="signin">
      <div className="signin-art">
        <SignInMeadow />
        <p className="signin-caption">Every crew member tends a bed of light. Check in, rest well, and watch it bloom.</p>
      </div>

      <div className="signin-panel">
        <div className="signin-inner">
          <span className="tag">Health companion for long missions</span>
          <h1 className="signin-title">{TITLES[mode]}</h1>
          <p className="muted">
            {mode === 'signup'
              ? 'One account for every device: your phone, a laptop or the station tablet. Everything is still saved on the device first.'
              : mode === 'reset'
                ? 'Write the email of your account. We send a link to choose a new password.'
                : mode === 'newpw'
                  ? 'Your reset link worked. Choose a new password of at least 8 characters.'
                  : 'Everything is saved on this device first, so it works even with no ground link.'}
          </p>

          {want && user && user.role !== want && (
            <p className="alert info small" role="status">
              You are signed in as {user.name}. This page is for {ROLE_LABEL[want].toLowerCase()}s, so sign in with a{' '}
              {ROLE_LABEL[want].toLowerCase()} account to open it.
            </p>
          )}

          {mode !== 'newpw' && mode !== 'reset' && (
            <div className="mode-tabs" role="group" aria-label="Sign in or create an account">
              <button type="button" aria-pressed={mode === 'signin'} onClick={() => switchMode('signin')}>
                Sign in
              </button>
              <button type="button" aria-pressed={mode === 'signup'} onClick={() => switchMode('signup')}>
                Create account
              </button>
            </div>
          )}

          <form onSubmit={submit} noValidate className="signin-form">
            {(mode === 'signin' || mode === 'signup') && (
              <fieldset className="role-switch">
                <legend className="sr-only">{mode === 'signup' ? 'I am joining as' : 'I am signing in as'}</legend>
                {['astronaut', 'doctor'].map((r) => (
                  <label key={r}>
                    <input type="radio" name="role" value={r} checked={role === r} onChange={() => chooseRole(r)} />
                    <span>{ROLE_LABEL[r]}</span>
                  </label>
                ))}
              </fieldset>
            )}

            {mode === 'signup' && (
              <div className="field">
                <label htmlFor="name">Your name</label>
                <input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
                <span className="hint">Crewmates see this name on your flower bed.</span>
              </div>
            )}

            {mode !== 'newpw' && (
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" inputMode="email" autoComplete={mode === 'signup' ? 'email' : 'username'} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            )}

            {mode !== 'reset' && (
              <div className="field">
                <label htmlFor="password">{mode === 'signin' ? 'Password' : 'New password'}</label>
                <div className="password-field">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" className="show-pw" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? 'Hide' : 'Show'}
                    <span className="sr-only"> password</span>
                  </button>
                </div>
                {mode !== 'signin' && <span className="hint">At least 8 characters.</span>}
              </div>
            )}

            {mode === 'signup' && role === 'doctor' && (
              <div className="field">
                <label htmlFor="invite">Flight surgeon invite code</label>
                <input id="invite" autoComplete="off" autoCapitalize="characters" spellCheck={false} value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
                <span className="hint">Flight surgeons see the crew&apos;s health data, so this account needs the code from the mission team.</span>
              </div>
            )}

            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="alert info small">
                {notice}
              </p>
            )}
            <button className="btn big wide" type="submit" disabled={busy}>
              {submitLabel}
            </button>
          </form>

          {mode === 'signin' && (
            <button type="button" className="link-btn forgot" onClick={() => switchMode('reset')}>
              Forgot your password?
            </button>
          )}
          {(mode === 'reset' || mode === 'newpw') && (
            <button
              type="button"
              className="link-btn forgot"
              onClick={() => {
                if (mode === 'newpw') endRecovery()
                switchMode('signin')
              }}
            >
              Back to sign in
            </button>
          )}

          {(mode === 'signin' || mode === 'signup') && (
            <div className="demo-hint small">
              <p>
                Just looking around? Use the demo {role === 'doctor' ? 'flight surgeon' : 'astronaut'}: <strong>{DEMO_ACCOUNT[role].email}</strong>, password{' '}
                <strong>{DEMO_ACCOUNT[role].password}</strong>.
                {role === 'astronaut' && ' Leo, Sara and the rest of the demo crew can sign in too (leo.okafor@orbloom.demo …, same password).'} Demo
                accounts only ever see the made-up demo crew.
              </p>
              <button type="button" className="link-btn" onClick={fillDemo}>
                Fill in the demo account
              </button>
            </div>
          )}

          <a className="garden-link" href="#/garden">
            Visit the crew garden without signing in
          </a>
        </div>
      </div>
      </div>
    </div>
  )
}
