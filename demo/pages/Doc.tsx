import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { cn } from '../../src'
import { Markdown, slugOf } from '../playground/Markdown'
import { undash } from '../playground/rules-read'
import { LINKS } from '../links'
import { SectionIndex, useIndexForm, INDEX_MIN, jumpTo, withSection, type SectionLink } from '../shell/SectionIndex'
import '../playground.css'
import './docs.css'

// Project documents rendered from the same markdown the repository ships, so the site cannot
// say something the repo does not. Each one is a route (#/changelog, #/contributing, …).
// Each document is loaded when its page opens, as the Proposal pages' specs are, so the
// changelog and the rest do not ride in the main bundle (the build's chunk-size warning must
// not grow).
//
// Slice 5 of the playground uplift: no markdown leaks (links are links, nested lists nest, every
// dash goes through the display layer), a rail of the document's own sections when it has four or
// more, and the Roadmap leads with its phases, read from its own headings.
const LOADERS = import.meta.glob<string>(['../../CHANGELOG.md', '../../CONTRIBUTING.md', '../../ACCESSIBILITY.md', '../../ROADMAP.md'], { query: '?raw', import: 'default' })

export const DOCS = [
  { id: 'changelog', eyebrow: 'Record', title: 'Changelog', file: '../../CHANGELOG.md' },
  { id: 'roadmap', eyebrow: 'Plan', title: 'Roadmap', file: '../../ROADMAP.md' },
  { id: 'contributing', eyebrow: 'Project', title: 'Contributing', file: '../../CONTRIBUTING.md' },
  { id: 'accessibility', eyebrow: 'Project', title: 'Accessibility', file: '../../ACCESSIBILITY.md' },
] as const

export type DocId = (typeof DOCS)[number]['id']
export const isDocId = (id: string): id is DocId => DOCS.some((d) => d.id === id)

/** A repository path in a document points at the file on GitHub. */
const BASE = `${LINKS.github}/blob/main`

/** The document's own sections, its `## ` headings, for the rail: each by its words up to the first stop or colon ("Phase 2b", "0.15.0"). */
export function sectionsOf(md: string): SectionLink[] {
  return [...md.matchAll(/^## (.+)$/gm)].map((m) => {
    const words = undash(m[1].replace(/^\[([^\]]+)\](?!\()/, '$1')).replace(/`|\*\*/g, '')
    return { id: slugOf(m[1]), label: words.split(/[.:]\s/)[0].trim() }
  })
}

export interface Phase { id: string; number: string; name: string; state?: string }

/** The Roadmap's phases, from its own headings: `## Phase 2b — Name (state)`. */
export function phasesOf(md: string): Phase[] {
  return [...md.matchAll(/^## (Phase (\S+) [—–-] (.+?))(?: \(([^)]+)\))?$/gm)].map((m) => ({
    id: slugOf(m[0].slice(3)), number: m[2], name: m[3].trim(), state: m[4]?.trim(),
  }))
}

/** The Roadmap's picture: the phases in order, on one line, the one in progress marked in words. Each is a link to its section. */
function Phases({ phases }: { phases: Phase[] }) {
  const go = (e: MouseEvent<HTMLAnchorElement>, p: Phase) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    // The rail holds the place: going through its own link keeps its mark on the section chosen.
    const railLink = document.querySelector<HTMLAnchorElement>(`.shell-index a[href$="section=${p.id}"]`)
    if (railLink) { railLink.click(); return }
    window.history.replaceState(window.history.state, '', withSection(window.location.hash, p.id))
    jumpTo({ id: p.id, label: p.name })
  }
  const now = phases.findIndex((p) => p.state)
  return (
    <figure className="doc-phases" data-arrive="2">
      <ol className="doc-phases__list" aria-label="The phases, in order">
        {phases.map((p, i) => (
          <li key={p.id} className={cn('doc-phases__phase', i === now && 'is-now', now >= 0 && i > now && 'is-later')}>
            <span className="doc-phases__dot" aria-hidden="true" />
            <a className="doc-phases__link" href={withSection(window.location.hash, p.id)} onClick={(e) => go(e, p)}>
              <span className="doc-phases__number">Phase {p.number}</span>
              <span className="doc-phases__name">{p.name}</span>
              {p.state && <span className="site-tag doc-phases__state">{p.state.charAt(0).toUpperCase() + p.state.slice(1)}</span>}
            </a>
          </li>
        ))}
      </ol>
    </figure>
  )
}

export function Doc({ id }: { id: DocId }) {
  const d = DOCS.find((x) => x.id === id)!
  const [body, setBody] = useState<string | null>(null)
  const form = useIndexForm()
  useEffect(() => {
    let live = true
    setBody(null)
    LOADERS[d.file]?.().then((md) => { if (live) setBody(md.replace(/^# .+\n/, '')) })
    return () => { live = false }
  }, [d.file])
  const sections = useMemo(() => (body ? sectionsOf(body) : []), [body])
  const phases = useMemo(() => (body && id === 'roadmap' ? phasesOf(body) : []), [body, id])
  const rail = sections.length >= INDEX_MIN
  return (
    <article className="doc doc-page">
      <header className="page-head">
        <p className="vela-meta page-head__eyebrow">{d.eyebrow}</p>
        <h1 className="vela-h2">{d.title}</h1>
      </header>
      {phases.length > 0 && <Phases phases={phases} />}
      <div className={cn(rail && 'shell-railpage', rail && form === 'strip' && 'is-narrow')}>
        {rail && (
          <div className="shell-railpage__rail">
            <SectionIndex items={sections} form={form} label="On this page" ready={body !== null} />
          </div>
        )}
        <div className={cn('doc__body', rail && 'shell-railpage__main')} aria-busy={body === null ? true : undefined}>
          {body !== null && <Markdown source={body} top="h2" doc={{ base: BASE }} />}
        </div>
      </div>
    </article>
  )
}
