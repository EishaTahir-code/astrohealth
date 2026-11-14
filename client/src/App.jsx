import { useEffect } from 'react'
import AppShell, { PublicShell } from './components/Shell'
import SignIn from './pages/SignIn'
import Doctor from './pages/Doctor'
import MySpace from './pages/MySpace'
import Garden from './pages/Garden'
import { useRoute } from './lib/router'
import { useSession } from './lib/auth'
import { ensureDemoData } from './lib/seed'

// Pages:
//   #/                 sign in (first screen). Signed-in people go to their dashboard.
//   #/me/<tab>         astronaut dashboard (needs an astronaut sign-in)
//   #/doctor/<id>      doctor dashboard (needs a doctor sign-in)
//   #/garden           shared crew garden (no sign-in needed)
export default function App() {
  const [section, sub] = useRoute()
  const user = useSession()

  // Adds the fake crew data the first time the app opens on this device.
  useEffect(() => {
    ensureDemoData().catch((err) => console.error('Could not add demo data', err))
  }, [])

  const isHome = section !== 'me' && section !== 'doctor' && section !== 'garden'

  // Signed in and on the sign-in page: go to the right dashboard.
  useEffect(() => {
    if (isHome && user) window.location.replace(user.role === 'doctor' ? '#/doctor' : '#/me')
  }, [isHome, user])

  if (section === 'garden') {
    return user ? (
      <AppShell user={user} active="garden">
        <Garden />
      </AppShell>
    ) : (
      <PublicShell>
        <Garden />
      </PublicShell>
    )
  }

  if (section === 'me') {
    if (user?.role !== 'astronaut') return <SignIn key="astronaut" want="astronaut" />
    return (
      <AppShell user={user} active={sub ?? 'today'}>
        <MySpace tab={sub} user={user} />
      </AppShell>
    )
  }

  if (section === 'doctor') {
    if (user?.role !== 'doctor') return <SignIn key="doctor" want="doctor" />
    return (
      <AppShell user={user} active={sub ?? 'crew'}>
        <Doctor astronautId={sub} doctor={user} />
      </AppShell>
    )
  }

  return user ? null : <SignIn />
}
