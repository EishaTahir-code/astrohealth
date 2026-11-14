// Very small page switcher using the part of the URL after "#".
// Example: #/me/health  ->  ['me', 'health']
import { useEffect, useState } from 'react'

function read() {
  return window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
}

export function useRoute() {
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const onChange = () => {
      setRoute(read())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
