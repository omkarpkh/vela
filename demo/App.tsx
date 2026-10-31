import { useEffect, useState } from 'react'
import { cn } from '../src'
import pkg from '../package.json'
import './demo.css'
import { useRoute, href, sameRoute, type Route } from './router'
import { FOUNDATIONS, COMPONENTS, PROPOSALS } from './nav'
import { LINKS, figmaUrl } from './links'
import { Overview } from './pages/Overview'
import { Foundation } from './pages/Foundation'
import { Doc, DOCS } from './pages/Doc'
import { Status } from './pages/Status'
import { Adopt } from './Adopt'
import { Playground } from './Playground'
import { How } from './pages/How'
import { Motion } from './pages/Motion'
import { Proposal } from './pages/Proposal'
import { Segments } from './shell/Segments'
import { Search } from './shell/Search'
import { GROUPS } from './playground/registry'

type Theme = 'system' | 'light' | 'dark'
const THEMES = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const

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

const titleFor = (r: Route) =>
  r.kind === 'component' ? COMPONENTS.find((c) => c.id === r.id)?.title
  : r.kind === 'proposal' ? PROPOSALS.find((p) => p.id === r.id)?.title
  : r.kind === 'foundation' ? FOUNDATIONS.find((f) => f.id === r.id)?.title
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

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    document.title = `${titleFor(route) ?? 'Vela'} · Vela`
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
          <span className="brand__name">Vela</span>
          <span className="vela-meta brand__meta">@omkarux/vela {pkg.version}</span>
        </a>
        <Search compact={phone} />
        <div className="topbar__right">
          <Segments label="Theme" value={theme} options={THEMES} onChange={setTheme} />
          <a className="topbar__link vela-meta" href={LINKS.github}>GitHub</a>
          <a className="topbar__link vela-meta" href={LINKS.npm}>npm</a>
          <a className="topbar__link vela-meta" href={figmaUrl()}>Figma</a>
        </div>
      </header>

      <div className="shell__body">
        <nav id="site-nav" className="sitenav" aria-label="Site" onKeyDown={(e) => { if (e.key === 'Escape') setNavOpen(false) }}>
          <NavGroup title="Start" holdsCurrent={route.kind === 'overview' || route.kind === 'how'}>
            <NavLink to={{ kind: 'overview' }} current={route}>Overview</NavLink>
            <NavLink to={{ kind: 'how' }} current={route}>How it is made</NavLink>
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
          <NavGroup title="Project" holdsCurrent={['status', 'doc', 'adopt', 'motion'].includes(route.kind)}>
            <NavLink to={{ kind: 'status' }} current={route}>Component status</NavLink>
            <NavLink to={{ kind: 'doc', id: 'changelog' }} current={route}>Changelog</NavLink>
            <NavLink to={{ kind: 'doc', id: 'roadmap' }} current={route}>Roadmap</NavLink>
            <NavLink to={{ kind: 'doc', id: 'contributing' }} current={route}>Contributing</NavLink>
            <NavLink to={{ kind: 'doc', id: 'accessibility' }} current={route}>Accessibility</NavLink>
            <NavLink to={{ kind: 'adopt' }} current={route}>Adopt without rewrite</NavLink>
            <NavLink to={{ kind: 'motion' }} current={route}>Motion review</NavLink>
          </NavGroup>
          <p className="vela-meta sitenav__foot">Pages and controls are generated from <code>guidelines/</code> and the token file.</p>
        </nav>

        <main id="main" className="content">
          {route.kind === 'overview' && <Overview />}
          {route.kind === 'component' && <Playground key={route.id} id={route.id} tab={route.tab} />}
          {route.kind === 'proposal' && <Proposal key={route.id} id={route.id} />}
          {route.kind === 'foundation' && <Foundation id={route.id} />}
          {route.kind === 'adopt' && <Adopt mode={theme} />}
          {route.kind === 'motion' && <Motion />}
          {route.kind === 'how' && <How />}
          {route.kind === 'status' && <Status />}
          {route.kind === 'doc' && <Doc key={route.id} id={route.id} />}
          <footer className="demo-footer vela-meta">
            Zero runtime dependencies · ESM · light + dark · WCAG 2.1 AA asserted in CI
          </footer>
        </main>
      </div>
    </div>
  )
}
