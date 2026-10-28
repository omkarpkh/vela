import { useEffect, useState } from 'react'

// Hash routes, so every page has a link that survives a reload and the back button works,
// with no router dependency. `#/components/button`, `#/foundations/motion`, `#/adopt`, `#/how`,
// `#/status`, `#/changelog`, `#/roadmap`, `#/contributing`, `#/accessibility`, `#/`.
export type Route =
  | { kind: 'overview' }
  | { kind: 'component'; id: string }
  | { kind: 'foundation'; id: string }
  | { kind: 'adopt' }
  | { kind: 'how' }
  | { kind: 'status' }
  | { kind: 'doc'; id: 'changelog' | 'roadmap' | 'contributing' | 'accessibility' }

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  if (parts[0] === 'components' && parts[1]) return { kind: 'component', id: parts[1] }
  if (parts[0] === 'foundations' && parts[1]) return { kind: 'foundation', id: parts[1] }
  if (parts[0] === 'adopt') return { kind: 'adopt' }
  if (parts[0] === 'how') return { kind: 'how' }
  if (parts[0] === 'status') return { kind: 'status' }
  if (parts[0] === 'changelog' || parts[0] === 'roadmap' || parts[0] === 'contributing' || parts[0] === 'accessibility')
    return { kind: 'doc', id: parts[0] }
  return { kind: 'overview' }
}

export const href = (r: Route): string =>
  r.kind === 'component' ? `#/components/${r.id}`
  : r.kind === 'foundation' ? `#/foundations/${r.id}`
  : r.kind === 'adopt' ? '#/adopt'
  : r.kind === 'how' ? '#/how'
  : r.kind === 'status' ? '#/status'
  : r.kind === 'doc' ? `#/${r.id}`
  : '#/'

export const sameRoute = (a: Route, b: Route) => href(a) === href(b)

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
