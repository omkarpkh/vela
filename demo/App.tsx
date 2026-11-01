import { lazy, Suspense, useEffect, useState } from 'react'
import { cn } from '../src'
import { IconButton } from '../src/headless'
import pkg from '../package.json'
import './demo.css'
import { useRoute, href, sameRoute, type Route } from './router'
import { FOUNDATIONS, COMPONENTS, PROPOSALS, PATTERNS } from './nav'
import { LINKS, figmaUrl } from './links'
import { Doc, DOCS } from './pages/Doc'
import { Appearance, type Theme } from './shell/Appearance'
import { Search } from './shell/Search'
import { ProductMark } from './shell/product-mark-core'
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
// Any address that names no page (slice 5 of the playground uplift).
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })))


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

/**
 * GitHub, npm and Figma on a wide screen: each its own mark, or npm's word, in an Icon Button link
 * named in words, with a label tooltip. Figma's mark keeps its 20px clear space (.topbar__marks).
 */
function SiteMarks() {
  return (
    <div className="topbar__marks">
      <IconButton label="Vela on GitHub" brandMark="github" href={LINKS.github} opensInNewTab tooltipPlacement="bottom" />
      <IconButton label="Vela on npm" word="npm" href={LINKS.npm} opensInNewTab tooltipPlacement="bottom" />
      <IconButton label="Vela in Figma" brandMark="figma" href={figmaUrl()} opensInNewTab tooltipPlacement="bottom" />
    </div>
  )
}

/** GitHub, npm and Figma, written as words, in the phone's menu. Each says where it goes, so no mark or tooltip is needed. */
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
  missingIn(r) ? 'Not found'
  : r.kind === 'component' ? COMPONENTS.find((c) => c.id === r.id)?.title
  : r.kind === 'proposal' ? PROPOSALS.find((p) => p.id === r.id)?.title
  : r.kind === 'pattern' ? PATTERNS.find((p) => p.id === r.id)?.title
  : r.kind === 'foundation' ? FOUNDATIONS.find((f) => f.id === r.id)?.title
  : r.kind === 'states' ? 'All states'
  : r.kind === 'adopt' ? 'Adopt without rewrite'
  : r.kind === 'motion' ? 'Motion review'
  : r.kind === 'how' ? 'How it is made'
  : r.kind === 'status' ? 'Component status'
  : r.kind === 'doc' ? DOCS.find((d) => d.id === r.id)?.title
  : r.kind === 'notfound' ? 'Not found'
  : 'Overview'

/** The Not found page's props when the route names nothing: the address, the name that missed, and its area. */
function missingIn(r: Route): { asked: string; name: string; area: 'component' | 'proposal' | 'pattern' | 'foundation' | 'page' } | null {
  const asked = href(r).replace(/^#\//, '')
  if (r.kind === 'notfound') return { asked: r.path, name: r.path.split('/').pop() ?? r.path, area: 'page' }
  if (r.kind === 'component' && !COMPONENTS.some((c) => c.id === r.id)) return { asked, name: r.id, area: 'component' }
  if (r.kind === 'proposal' && !PROPOSALS.some((p) => p.id === r.id)) return { asked, name: r.id, area: 'proposal' }
  if (r.kind === 'pattern' && !PATTERNS.some((p) => p.id === r.id)) return { asked, name: r.id, area: 'pattern' }
  if (r.kind === 'foundation' && !FOUNDATIONS.some((f) => f.id === r.id)) return { asked, name: r.id, area: 'foundation' }
  return null
}

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
  // An address in a known area that names nothing there is Not found too, and says what it was meant to be.
  const missing = missingIn(route)

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
        {/* The logo (the logo states Omkar approved on 1 Nov 2026): the 24px mark, the name and the
            version, one link to the Overview. The link is named by the name alone, "Vela Design
            System": the mark is aria-hidden, and so is the version, which is shown, not read. On the
            Overview it is the current page, and a press there goes back to the top. It never pulses. */}
        <a
          href="#/"
          className="brand"
          aria-current={route.kind === 'overview' ? 'page' : undefined}
          onClick={(e) => {
            if (route.kind !== 'overview') return
            e.preventDefault()
            window.scrollTo({ top: 0 })
          }}
        >
          <ProductMark size="regular" decorative />
          <span className="brand__words">
            <span className="brand__name">Vela<span className="brand__rest"> Design System</span></span>
            <span className="vela-meta brand__meta" aria-hidden="true">@omkarux/vela {pkg.version}</span>
          </span>
        </a>
        <Search compact={phone} />
        <div className="topbar__right">
          {/* Only the Appearance panel sets the page's theme and brand (section 9). */}
          <Appearance theme={theme} onTheme={setTheme} compact={phone} />
          {/* The three marks, as Icon Button links (section 3); on a phone they are written links in
              the menu, after the nav. */}
          {!phone && <SiteMarks />}
        </div>
      </header>

      <div className="shell__body">
        <nav id="site-nav" className="sitenav" aria-label="Site" onKeyDown={(e) => { if (e.key === 'Escape') setNavOpen(false) }}>
          <NavGroup title="Start" holdsCurrent={route.kind === 'overview' || route.kind === 'how' || route.kind === 'states'}>
            <NavLink to={{ kind: 'overview' }} current={route}>Overview</NavLink>
            <NavLink to={{ kind: 'how' }} current={route}>How it is made</NavLink>
            {/* All states (#/states) is the visual baselines' page: it keeps its address, and leaves
                the menu (slice 1 of the playground uplift). */}
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
          {missing && <NotFound key={missing.asked} {...missing} />}
          {!missing && route.kind === 'component' && <Playground key={route.id} id={route.id} tab={route.tab} />}
          {!missing && route.kind === 'proposal' && <Proposal key={route.id} id={route.id} />}
          {!missing && route.kind === 'pattern' && <CopyPattern />}
          {!missing && route.kind === 'foundation' && <Foundation id={route.id} />}
          {route.kind === 'adopt' && <Adopt mode={theme} />}
          {route.kind === 'motion' && <Motion />}
          {route.kind === 'how' && <How />}
          {route.kind === 'status' && <Status />}
          {route.kind === 'doc' && <Doc key={route.id} id={route.id} />}
          </Suspense>
          {/* In a reader's words (Omkar, 1 Nov 2026): no "ESM", no "CI". The contrast claim holds because
              the CI workflow runs the contrast test on every pull request and every push to main. */}
          <footer className="demo-footer vela-meta">
            No runtime dependencies · Light and dark · Contrast checked to WCAG 2.1 AA on every change
          </footer>
        </main>
      </div>
    </div>
  )
}
