import { useEffect } from 'react'
import Header from './components/Header'
import Home from './pages/Home'
import Doctor from './pages/Doctor'
import MySpace from './pages/MySpace'
import Garden from './pages/Garden'
import { useRoute } from './lib/router'
import { ensureDemoData } from './lib/seed'

export default function App() {
  const [section, sub] = useRoute()

  // Adds the fake crew data the first time the app opens on this device.
  useEffect(() => {
    ensureDemoData().catch((err) => console.error('Could not add demo data', err))
  }, [])

  let page
  if (section === 'me') page = <MySpace tab={sub} />
  else if (section === 'garden') page = <Garden />
  else if (section === 'doctor') page = <Doctor astronautId={sub} />
  else page = <Home />

  return (
    <>
      <Header section={section} />
      <main>{page}</main>
    </>
  )
}
