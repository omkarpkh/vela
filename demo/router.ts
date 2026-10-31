import { useEffect, useState } from 'react'

// Hash routes, so every page has a link that survives a reload and the back button works,
// with no router dependency. `#/components/button`, `#/foundations/motion`, `#/adopt`, `#/how`,
// `#/motion` (the motion review page), `#/status`, `#/changelog`, `#/roadmap`, `#/contributing`, `#/accessibility`, `#/`,
// `#/proposals/evidence-locker` for a Proposal page (a spec that is not built), and
// `#/patterns/copy` for a Pattern page (guidelines/patterns/, shown once its content is approved).
// A component page's other tabs add a segment (`#/components/button/rules`); the Playground tab is
// the page's own address, so every old link still opens the right page (playground spec, B6).
// Anything after a `?` is the shared-link query (slice 2) and is not read here.
export const PAGE_TABS = ['rules', 'tokens', 'figma', 'changelog'] as const
export type PageTab = (typeof PAGE_TABS)[number]
const isPageTab = (s: string | undefined): s is PageTab => (PAGE_TABS as readonly string[]).includes(s ?? '')

export type Route =
  | { kind: 'overview' }
  | { kind: 'component'; id: string; tab?: PageTab }
  | { kind: 'proposal'; id: string }
  | { kind: 'pattern'; id: string }
  | { kind: 'foundation'; id: string }
  | { kind: 'adopt' }
  | { kind: 'motion' }
  | { kind: 'how' }
  | { kind: 'status' }
  | { kind: 'doc'; id: 'changelog' | 'roadmap' | 'contributing' | 'accessibility' }

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean)
  if (parts[0] === 'components' && parts[1]) return isPageTab(parts[2]) ? { kind: 'component', id: parts[1], tab: parts[2] } : { kind: 'component', id: parts[1] }
  if (parts[0] === 'proposals' && parts[1]) return { kind: 'proposal', id: parts[1] }
  if (parts[0] === 'patterns' && parts[1]) return { kind: 'pattern', id: parts[1] }
  if (parts[0] === 'foundations' && parts[1]) return { kind: 'foundation', id: parts[1] }
  if (parts[0] === 'adopt') return { kind: 'adopt' }
  if (parts[0] === 'motion') return { kind: 'motion' }
  if (parts[0] === 'how') return { kind: 'how' }
  if (parts[0] === 'status') return { kind: 'status' }
  if (parts[0] === 'changelog' || parts[0] === 'roadmap' || parts[0] === 'contributing' || parts[0] === 'accessibility')
    return { kind: 'doc', id: parts[0] }
  return { kind: 'overview' }
}

export const href = (r: Route): string =>
  r.kind === 'component' ? `#/components/${r.id}${r.tab ? `/${r.tab}` : ''}`
  : r.kind === 'proposal' ? `#/proposals/${r.id}`
  : r.kind === 'pattern' ? `#/patterns/${r.id}`
  : r.kind === 'foundation' ? `#/foundations/${r.id}`
  : r.kind === 'adopt' ? '#/adopt'
  : r.kind === 'motion' ? '#/motion'
  : r.kind === 'how' ? '#/how'
  : r.kind === 'status' ? '#/status'
  : r.kind === 'doc' ? `#/${r.id}`
  : '#/'

/** Same page: a component's tabs are one page, so its nav link stays current on every tab. */
export const sameRoute = (a: Route, b: Route) =>
  a.kind === 'component' && b.kind === 'component' ? a.id === b.id : href(a) === href(b)

/**
 * Moves to another tab of the same page. The address changes, so the tab can be shared and survives
 * a reload, but the history does not grow by one entry per arrow key: the entry is replaced, and the
 * route listeners are told as a hash change would tell them.
 */
export function replaceRoute(r: Route) {
  window.history.replaceState(window.history.state, '', href(r))
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
