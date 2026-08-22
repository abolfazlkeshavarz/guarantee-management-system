import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './i18n'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Register the service worker once the page has settled, so it never competes
// with the first render for bandwidth. Only in a real build: the dev server
// serves modules that must not be cached.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // An unavailable worker costs the app nothing but offline support.
    })
  })
}
