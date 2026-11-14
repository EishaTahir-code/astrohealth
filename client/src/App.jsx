import Header from './components/Header'
import Placeholder from './components/Placeholder'
import Home from './pages/Home'
import MySpace from './pages/MySpace'
import { useRoute } from './lib/router'

export default function App() {
  const [section, sub] = useRoute()

  let page
  if (section === 'me') page = <MySpace tab={sub} />
  else if (section === 'garden') page = <div className="page"><Placeholder title="Crew garden" /></div>
  else if (section === 'doctor') page = <div className="page"><Placeholder title="Doctor dashboard" /></div>
  else page = <Home />

  return (
    <>
      <Header section={section} />
      <main>{page}</main>
    </>
  )
}
