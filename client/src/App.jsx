import { Suspense, lazy, useEffect } from 'react'
import AppShell, { PublicShell } from './components/Shell'
import SignIn from './pages/SignIn'
import { useRoute } from './lib/router'
import { useRecovery, useSession } from './lib/auth'
import { ensureDemoData } from './lib/seed'
import { loadCrew } from './data/crew'

// Pages load when first opened, so the first screen appears quickly.
const MySpace = lazy(() => import('./pages/MySpace'))
const Doctor = lazy(() => import('./pages/Doctor'))
const Garden = lazy(() => import('./pages/Garden'))

const ASTRONAUT_SECTIONS = ['checkin', 'health', 'meds', 'care', 'family', 'greenhouse', 'reaction', 'settings', 'help']

// Pages:
//   #/                 sign in (first screen). Signed-in people go to their dashboard.
//   #/me/<section>     astronaut dashboard (needs an astronaut sign-in)
//   #/doctor/<page>    doctor dashboard (needs a doctor sign-in)
//   #/garden           shared crew garden (no sign-in needed)
export default function App() {
  const [section, sub, extra] = useRoute()
  const user = useSession()
  const recovering = useRecovery()

  // Adds the fake crew data the first time the app opens on this device,
  // and loads the crew list (people who signed up) saved on this device.
  useEffect(() => {
    ensureDemoData().catch((err) => console.error('Could not add demo data', err))
    loadCrew()
  }, [])

  const isHome = section !== 'me' && section !== 'doctor' && section !== 'garden'

  // Signed in and on the sign-in page: go to the right dashboard.
  useEffect(() => {
    if (isHome && user) window.location.replace(user.role === 'doctor' ? '#/doctor' : '#/me')
  }, [isHome, user])

  const loading = (
    <div className="page">
      <p className="muted">Loading…</p>
    </div>
  )

  // Opened a password-reset link from the email: choose a new password first.
  if (recovering) return <SignIn key="recovery" recovery />

  if (section === 'garden') {
    const page = (
      <Suspense fallback={loading}>
        <Garden user={user} />
      </Suspense>
    )
    return user ? (
      <AppShell user={user} active="garden">
        {page}
      </AppShell>
    ) : (
      <PublicShell>{page}</PublicShell>
    )
  }

  if (section === 'me') {
    if (user?.role !== 'astronaut') return <SignIn key="astronaut" want="astronaut" />
    // (the old separate Health assistant page is now part of Health)
    const tab = sub === 'ai' ? 'health' : ASTRONAUT_SECTIONS.includes(sub) ? sub : 'today'
    return (
      <AppShell user={user} active={tab}>
        <Suspense fallback={loading}>
          <MySpace tab={tab} user={user} extra={extra} />
        </Suspense>
      </AppShell>
    )
  }

  if (section === 'doctor') {
    if (user?.role !== 'doctor') return <SignIn key="doctor" want="doctor" />
    return (
      <AppShell user={user} active={sub ?? 'crew'}>
        <Suspense fallback={loading}>
          <Doctor page={sub} doctor={user} />
        </Suspense>
      </AppShell>
    )
  }

  return user ? null : <SignIn />
}
