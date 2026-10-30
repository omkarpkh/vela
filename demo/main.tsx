import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/styles/index.css'
import { App } from './App'
import { SiteBoundary } from './shell/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SiteBoundary>
      <App />
    </SiteBoundary>
  </StrictMode>,
)
