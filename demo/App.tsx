import { useEffect, useState } from 'react'
import { Button, Input, cn } from '../src'
import pkg from '../package.json'
import './demo.css'
import { useRoute, href, sameRoute, type Route } from './router'
import { FOUNDATIONS, COMPONENTS } from './nav'
import { LINKS, figmaUrl } from './links'
import { Overview } from './pages/Overview'
import { Foundation } from './pages/Foundation'
import { Adopt } from './Adopt'
import { Playground } from './Playground'

type Theme = 'system' | 'light' | 'dark'

function NavLink({ to, current, children }: { to: Route; current: Route; children: React.ReactNode }) {
  const active = sameRoute(to, current)
  return (
    <a href={href(to)} className={cn('sitenav__link', active && 'is-active')} aria-current={active ? 'page' : undefined}>
      {children}
    </a>
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
  : r.kind === 'foundation' ? FOUNDATIONS.find((f) => f.id === r.id)?.title
  : r.kind === 'adopt' ? 'Adopt without rewrite'
  : 'Overview'

export function App() {
  const route = useRoute()
  const [theme, setTheme] = useState<Theme>('system')
  const [navOpen, setNavOpen] = useState(() => window.matchMedia('(min-width: 901px)').matches)
  const [filter, setFilter] = useState('')

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

  const q = filter.trim().toLowerCase()
  const components = COMPONENTS.filter((c) => !q || c.title.toLowerCase().includes(q))
  const foundations = FOUNDATIONS.filter((f) => !q || f.title.toLowerCase().includes(q))

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
        <div className="topbar__right">
          <div className="demo-themes" role="group" aria-label="Theme">
            {(['system', 'light', 'dark'] as Theme[]).map((t) => (
              <Button
                key={t}
                size="tiny"
                variant={theme === t ? 'primary' : 'standard'}
                appearance={theme === t ? 'filled' : 'hollow'}
                onClick={() => setTheme(t)}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </Button>
            ))}
          </div>
          <a className="topbar__link vela-meta" href={LINKS.github}>GitHub</a>
          <a className="topbar__link vela-meta" href={LINKS.npm}>npm</a>
          <a className="topbar__link vela-meta" href={figmaUrl()}>Figma</a>
        </div>
      </header>

      <div className="shell__body">
        <nav id="site-nav" className="sitenav" aria-label="Site" onKeyDown={(e) => { if (e.key === 'Escape') setNavOpen(false) }}>
          <Input label="Filter" size="tiny" placeholder="Find a page" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <div className="sitenav__group">
            <h3>Start</h3>
            <NavLink to={{ kind: 'overview' }} current={route}>Overview</NavLink>
          </div>
          {foundations.length > 0 && (
            <div className="sitenav__group">
              <h3>Foundations</h3>
              {foundations.map((f) => <NavLink key={f.id} to={{ kind: 'foundation', id: f.id }} current={route}>{f.title}</NavLink>)}
            </div>
          )}
          {components.length > 0 && (
            <div className="sitenav__group">
              <h3>Components</h3>
              {components.map((c) => <NavLink key={c.id} to={{ kind: 'component', id: c.id }} current={route}>{c.title}</NavLink>)}
            </div>
          )}
          <div className="sitenav__group">
            <h3>Demos</h3>
            <NavLink to={{ kind: 'adopt' }} current={route}>Adopt without rewrite</NavLink>
          </div>
          <p className="vela-meta sitenav__foot">Pages and controls are generated from <code>guidelines/</code> and the token file.</p>
        </nav>

        <main id="main" className="content">
          {route.kind === 'overview' && <Overview />}
          {route.kind === 'component' && <Playground key={route.id} id={route.id} />}
          {route.kind === 'foundation' && <Foundation id={route.id} />}
          {route.kind === 'adopt' && <Adopt mode={theme} />}
          <footer className="demo-footer vela-meta">
            Zero runtime dependencies · ESM · light + dark · WCAG 2.1 AA asserted in CI
          </footer>
        </main>
      </div>
    </div>
  )
}
