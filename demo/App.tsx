import { lazy, Suspense, useEffect, useState } from 'react'
import { cn } from '../src'
import pkg from '../package.json'
import './demo.css'
import { useRoute, href, sameRoute, type Route } from './router'
import { FOUNDATIONS, COMPONENTS, PROPOSALS, PATTERNS } from './nav'
import { LINKS, figmaUrl } from './links'
import { Doc, DOCS } from './pages/Doc'
import { Appearance, type Theme } from './shell/Appearance'
import { Search } from './shell/Search'
import { GROUPS } from './playground/catalog'

// One chunk per page, loaded when it is opened (playground spec, B8). The shell — header, nav,
// search — stays in the first chunk; a page's components, its spec and its stage code do not.
const Overview = lazy(() => import('./pages/Overview').then((m) => ({ default: m.Overview })))
// The gallery the visual baselines are taken from ("All states", #/states), the Overview until 1 Nov 2026.
const States = lazy(() => import('./pages/States').then((m) => ({ default: m.States })))
const Foundation = lazy(() => import('./pages/Foundation').then((m) => ({ default: m.Foundation })))
const Status = lazy(() => import('./pages/Status').then((m) => ({ default: m.Status })))
const Adopt = lazy(() => import('./Adopt').then((m) => ({ default: m.Adopt })))
const Playground = lazy(() => import('./Playground').then((m) => ({ default: m.Playground })))
const How = lazy(() => import('./pages/How').then((m) => ({ default: m.How })))
const Motion = lazy(() => import('./pages/Motion').then((m) => ({ default: m.Motion })))
const Proposal = lazy(() => import('./pages/Proposal').then((m) => ({ default: m.Proposal })))
// The Copy pattern page is its own chunk, and nothing else imports it.
const CopyPattern = lazy(() => import('./pages/CopyPattern').then((m) => ({ default: m.CopyPattern })))


function NavLink({ to, current, tag, children }: { to: Route; current: Route; tag?: string; children: React.ReactNode }) {
  const active = sameRoute(to, current)
  return (
    <a href={href(to)} className={cn('sitenav__link', active && 'is-active')} aria-current={active ? 'page' : undefined}>
      {children}
      {/* The lifecycle in words, in an outlined tag; read as part of the link's name. Approved has none. */}
      {tag && <>{' '}<span className="site-tag sitenav__tag">{tag}</span></>}
    </a>
  )
}

const useMedia = (query: string) => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setMatches(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [query])
  return matches
}

/** A nav group that can be collapsed; the group holding the current page is always open. */
function NavGroup({ title, level = 3, holdsCurrent, children }: { title: string; level?: 3 | 4; holdsCurrent: boolean; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const id = `nav-${title.toLowerCase().replace(/\s+/g, '-')}`
  const open = holdsCurrent || !collapsed
  const H = level === 3 ? 'h3' : 'h4'
  return (
    <div className={cn('sitenav__group', level === 4 && 'sitenav__group--sub')}>
      <H>
        {holdsCurrent ? <span className="sitenav__heading">{title}</span> : (
          <button type="button" className="sitenav__heading sitenav__toggle" aria-expanded={open} aria-controls={id} onClick={() => setCollapsed((c) => !c)}>
            {title}
          </button>
        )}
      </H>
      <div id={id} hidden={!open}>{children}</div>
    </div>
  )
}

function MenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

/** GitHub, npm and Figma, written as words. Each says where it goes, so no mark or tooltip is needed. */
function SiteLinks({ className }: { className: string }) {
  return (
    <>
      <a className={className} href={LINKS.github}>GitHub</a>
      <a className={className} href={LINKS.npm}>npm</a>
      <a className={className} href={figmaUrl()}>Figma</a>
    </>
  )
}

const titleFor = (r: Route) =>
  r.kind === 'component' ? COMPONENTS.find((c) => c.id === r.id)?.title
  : r.kind === 'proposal' ? PROPOSALS.find((p) => p.id === r.id)?.title
  : r.kind === 'pattern' ? PATTERNS.find((p) => p.id === r.id)?.title
  : r.kind === 'foundation' ? FOUNDATIONS.find((f) => f.id === r.id)?.title
  : r.kind === 'states' ? 'All states'
  : r.kind === 'adopt' ? 'Adopt without rewrite'
  : r.kind === 'motion' ? 'Motion review'
  : r.kind === 'how' ? 'How it is made'
  : r.kind === 'status' ? 'Component status'
  : r.kind === 'doc' ? DOCS.find((d) => d.id === r.id)?.title
  : 'Overview'

export function App() {
  const route = useRoute()
  const [theme, setTheme] = useState<Theme>('system')
  const [navOpen, setNavOpen] = useState(() => window.matchMedia('(min-width: 901px)').matches)
  // The phone header shows Search as an icon named "Search" (playground spec, section 3).
  const phone = useMedia('(max-width: 600px)')
  // The theme the page resolves to: System follows the screen. The Overview's mark and stills read it.
  const systemDark = useMedia('(prefers-color-scheme: dark)')
  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    // The full name on every page (the naming rule, 1 Nov 2026): "Vela Design System" at least once.
    document.title = `${titleFor(route) ?? 'Vela Design System'} · Vela Design System`
    // A narrow screen's drawer closes once a destination is chosen.
    if (!window.matchMedia('(min-width: 901px)').matches) setNavOpen(false)
  }, [route])

  // No nav Filter (playground spec v1.2, section 2): Search covers names, aliases and rule ids, and
  // two find boxes side by side make people choose between them.
  const components = COMPONENTS
  const foundations = FOUNDATIONS
  const proposals = PROPOSALS

  return (
    <div className={cn('vela-root shell', !navOpen && 'shell--nav-closed')}>
      <a className="skip" href="#main">Skip to content</a>

      <header className="topbar">
        <button
          type="button"
          className="topbar__menu"
          aria-expanded={navOpen}
          aria-controls="site-nav"
          aria-label={navOpen ? 'Hide navigation' : 'Show navigation'}
          onClick={() => setNavOpen((o) => !o)}
        >
          <MenuIcon />
        </button>
        <a href="#/" className="brand">
          <span className="brand__name">Vela<span className="brand__rest"> Design System</span></span>
          <span className="vela-meta brand__meta">@omkarux/vela {pkg.version}</span>
        </a>
        <Search compact={phone} />
        <div className="topbar__right">
          {/* Only the Appearance panel sets the page's theme and brand (section 9). */}
          <Appearance theme={theme} onTheme={setTheme} compact={phone} />
          {/* Written links until BrandMark's three marks can ship together (section 3); on a phone
              they move into the menu, after the nav. */}
          {!phone && <SiteLinks className="topbar__link vela-meta" />}
        </div>
      </header>

      <div className="shell__body">
        <nav id="site-nav" className="sitenav" aria-label="Site" onKeyDown={(e) => { if (e.key === 'Escape') setNavOpen(false) }}>
          <NavGroup title="Start" holdsCurrent={route.kind === 'overview' || route.kind === 'how' || route.kind === 'states'}>
            <NavLink to={{ kind: 'overview' }} current={route}>Overview</NavLink>
            <NavLink to={{ kind: 'how' }} current={route}>How it is made</NavLink>
            <NavLink to={{ kind: 'states' }} current={route}>All states</NavLink>
          </NavGroup>
          {foundations.length > 0 && (
            <NavGroup title="Foundations" holdsCurrent={route.kind === 'foundation'}>
              {foundations.map((f) => <NavLink key={f.id} to={{ kind: 'foundation', id: f.id }} current={route}>{f.title}</NavLink>)}
            </NavGroup>
          )}
          {(components.length > 0 || proposals.length > 0) && (
            <div className="sitenav__group">
              <h3>Components</h3>
              {GROUPS.map((g) => {
                const inGroup = components.filter((c) => c.group === g)
                if (inGroup.length === 0) return null
                return (
                  <NavGroup key={g} title={g} level={4} holdsCurrent={route.kind === 'component' && inGroup.some((c) => c.id === route.id)}>
                    {inGroup.map((c) => <NavLink key={c.id} to={{ kind: 'component', id: c.id }} current={route} tag={c.tag}>{c.title}</NavLink>)}
                  </NavGroup>
                )
              })}
              {proposals.length > 0 && (
                <NavGroup title="Agent review" level={4} holdsCurrent={route.kind === 'proposal'}>
                  {proposals.map((p) => <NavLink key={p.id} to={{ kind: 'proposal', id: p.id }} current={route} tag="Proposal">{p.title}</NavLink>)}
                </NavGroup>
              )}
            </div>
          )}
          {PATTERNS.length > 0 && (
            <NavGroup title="Patterns" holdsCurrent={route.kind === 'pattern'}>
              {PATTERNS.map((p) => <NavLink key={p.id} to={{ kind: 'pattern', id: p.id }} current={route}>{p.title}</NavLink>)}
            </NavGroup>
          )}
          <NavGroup title="Project" holdsCurrent={['status', 'doc', 'adopt', 'motion'].includes(route.kind)}>
            <NavLink to={{ kind: 'status' }} current={route}>Component status</NavLink>
            <NavLink to={{ kind: 'doc', id: 'changelog' }} current={route}>Changelog</NavLink>
            <NavLink to={{ kind: 'doc', id: 'roadmap' }} current={route}>Roadmap</NavLink>
            <NavLink to={{ kind: 'doc', id: 'contributing' }} current={route}>Contributing</NavLink>
            <NavLink to={{ kind: 'doc', id: 'accessibility' }} current={route}>Accessibility</NavLink>
            <NavLink to={{ kind: 'adopt' }} current={route}>Adopt without rewrite</NavLink>
            <NavLink to={{ kind: 'motion' }} current={route}>Motion review</NavLink>
          </NavGroup>
          {phone && (
            <div className="sitenav__group sitenav__elsewhere">
              <h3>Elsewhere</h3>
              <SiteLinks className="sitenav__link" />
            </div>
          )}
          <p className="vela-meta sitenav__foot">Pages and controls are generated from <code>guidelines/</code> and the token file.</p>
        </nav>

        <main id="main" className="content">
          <Suspense fallback={<p className="vela-meta site-loading">Loading this page…</p>}>
          {route.kind === 'overview' && <Overview theme={resolved} />}
          {route.kind === 'states' && <States />}
          {route.kind === 'component' && <Playground key={route.id} id={route.id} tab={route.tab} />}
          {route.kind === 'proposal' && <Proposal key={route.id} id={route.id} />}
          {route.kind === 'pattern' && (route.id === 'copy' ? <CopyPattern /> : <p className="vela-body">No pattern called “{route.id}”.</p>)}
          {route.kind === 'foundation' && <Foundation id={route.id} />}
          {route.kind === 'adopt' && <Adopt mode={theme} />}
          {route.kind === 'motion' && <Motion />}
          {route.kind === 'how' && <How />}
          {route.kind === 'status' && <Status />}
          {route.kind === 'doc' && <Doc key={route.id} id={route.id} />}
          </Suspense>
          <footer className="demo-footer vela-meta">
            Zero runtime dependencies · ESM · light + dark · WCAG 2.1 AA asserted in CI
          </footer>
        </main>
      </div>
    </div>
  )
}
