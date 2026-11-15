import { Component } from 'react'

// If a page cannot load (for example it was never saved on this device and there is no internet),
// show what to do instead of an endless "Loading…".
export default class PageBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.warn('A page could not load', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    const offline = typeof navigator !== 'undefined' && !navigator.onLine
    return (
      <div className="page">
        <section className="card quiet" role="alert">
          <h2>This page could not open</h2>
          <p className="muted">
            {offline
              ? 'This page is not saved on this device yet. Connect to the internet once and open Orbloom again; after that it works offline.'
              : 'Orbloom was just updated. Reload to get the newest version.'}
          </p>
          <button type="button" className="btn" onClick={() => window.location.reload()}>
            Reload
          </button>
        </section>
      </div>
    )
  }
}
