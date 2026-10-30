/**
 * Error boundaries: shell parts of the Vela site, not kit components, never exported from the
 * package. Spec: the playground spec, section 7 ("Stage error" and "Site error"), and item 1 of
 * the P1 request. Before them, a render error anywhere blanked the whole site.
 *
 * - StageBoundary sits around the stage. The caller keys it to the component and its settings, so
 *   any change of a setting mounts a fresh boundary, which is a retry. Navigation, the filter and
 *   the props panel live outside it and keep working.
 * - SiteBoundary sits at the root, around everything else.
 *
 * "Report it on GitHub" opens a new issue pre-filled only with values from closed sets: the
 * component id, the settings a select or a switch can hold, the page and the commit. Free text a
 * person typed into a field, and the error text, never leave the page.
 */
import { Component, type ReactNode } from 'react'
import { Button } from '../../src'
import { LINKS } from '../links'
import './shell.css'

/** The commit the site was built from, written in at build time (vite.demo.config.ts). */
export const COMMIT: string = import.meta.env.VITE_VELA_COMMIT || 'unknown'

/** A new-issue link on the repository, with a title and a body. */
export function issueUrl(title: string, body: string[]): string {
  return `${LINKS.github}/issues/new?${new URLSearchParams({ title, body: body.join('\n') })}`
}

interface BoundaryProps {
  fallback: (error: Error) => ReactNode
  children: ReactNode
}

class Boundary extends Component<BoundaryProps, { error: Error | null }> {
  state: { error: Error | null } = { error: null }
  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }
  render() {
    return this.state.error ? this.props.fallback(this.state.error) : this.props.children
  }
}

export type Settings = Record<string, string | boolean | undefined>

export function stageIssueUrl(component: string, settings: Settings): string {
  const lines = Object.entries(settings)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `- ${k}: ${String(v)}`)
  return issueUrl(`Playground: ${component} stopped working`, [
    `Component: ${component}`,
    'Settings:',
    ...lines,
    `Commit: ${COMMIT}`,
  ])
}

export function StageBoundary({ component, settings, onReset, children }: {
  /** The component's id, from the registry (a closed set). */
  component: string
  /** Only values from closed sets: selects and switches, never free text. */
  settings: Settings
  onReset: () => void
  children: ReactNode
}) {
  return (
    <Boundary
      fallback={(error) => (
        <div className="shell-error" role="alert">
          <p className="shell-error__lead">
            <strong>This component stopped working with these settings.</strong> That's a fault in Vela, not in what you chose.
          </p>
          <details className="shell-error__details">
            <summary>Show details</summary>
            <pre className="shell-error__text">{error.message || error.name}</pre>
          </details>
          <div className="shell-error__actions">
            <Button size="tiny" onClick={onReset}>Reset settings</Button>
            <a className="shell-error__link" href={stageIssueUrl(component, settings)}>Report it on GitHub</a>
          </div>
        </div>
      )}
    >
      {children}
    </Boundary>
  )
}

export function siteIssueUrl(page: string): string {
  return issueUrl('Playground: the site stopped working', [`Page: ${page}`, `Commit: ${COMMIT}`])
}

/** The page the person was on, as one of the site's own routes (a closed set), never raw text. */
function currentPage(): string {
  const hash = typeof window === 'undefined' ? '' : window.location.hash
  const m = hash.match(/^#\/([a-z-]+)(?:\/([a-z0-9-]+))?/)
  return m ? `#/${m[1]}${m[2] ? `/${m[2]}` : ''}` : '#/'
}

export function SiteBoundary({ children }: { children: ReactNode }) {
  return (
    <Boundary
      fallback={() => (
        <div className="vela-root shell-site-error">
          <main className="shell-site-error__body">
            <h1 className="vela-h2">The playground stopped working.</h1>
            <p className="vela-body">Reload the page to try again.</p>
            <div className="shell-error__actions">
              <Button onClick={() => window.location.reload()}>Reload</Button>
              <a className="shell-error__link" href={siteIssueUrl(currentPage())}>Report it on GitHub</a>
            </div>
          </main>
        </div>
      )}
    >
      {children}
    </Boundary>
  )
}
