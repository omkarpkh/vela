import { useMemo } from 'react'
import { Icon } from '../../src'
import { buildIndex, nearest, MISSING, type Item } from '../playground/search'
import { CATALOG as REGISTRY } from '../playground/catalog'
import { PROPOSALS } from '../playground/proposals'
import { href } from '../router'
import { LINKS } from '../links'
import { searchFor } from '../shell/Search'
import { NextCard } from '../shell/Card'
import { ComponentThumb, hasThumb } from '../shell/ComponentThumb'
import './docs.css'

// Not found (slice 5 of the playground uplift): any address that names no page. It says what was
// asked for, names the closest parts by meaning (through the catalogue's names and aliases, never
// a word of a spec's prose and never the nearest spelling of a long name), flags the gap when there
// is none, and opens Search on the words typed. It arrives at once: an error never makes you wait.

/** The Overview's proposals section: `?section=` lands on its heading, focused. */
export const PROPOSALS_ON_OVERVIEW = '#/?section=proposals'

export type Area = 'component' | 'proposal' | 'pattern' | 'foundation' | 'page'

const AREA_WORD: Record<Area, string> = { component: 'component', proposal: 'proposal', pattern: 'pattern', foundation: 'foundation', page: 'page' }
const STANDS: Record<string, string> = Object.fromEntries(MISSING.map((m) => [m.id, m.stands]))
const CLOSEST: Record<string, { id: string; name: string }> = Object.fromEntries(MISSING.map((m) => {
  const e = REGISTRY.find((x) => x.id === m.closest)!
  return [m.id, { id: e.id, name: e.name }]
}))
const titleCase = (words: string) => words.replace(/\b\w/g, (c) => c.toUpperCase())

function Part({ item, alias }: { item: Item; alias?: string }) {
  return (
    <a className="nf-card" href={item.href}>
      {hasThumb(item.id) && <div className="nf-card__thumb" aria-hidden="true" inert><ComponentThumb id={item.id} /></div>}
      <span className="nf-card__title">{item.title}{item.tag && <> <span className="site-tag">{item.tag}</span></>}</span>
      {alias && <span className="nf-card__line">Also called {alias}</span>}
      <span className="nf-card__line">{item.sign}</span>
    </a>
  )
}

/**
 * `asked` is the address after `#/`, as typed; `name` is the part that named nothing (the last
 * segment), and `area` what it was meant to be.
 */
export function NotFound({ asked, name, area }: { asked: string; name: string; area: Area }) {
  const index = useMemo(buildIndex, [])
  const near = useMemo(() => nearest(index, name), [index, name])
  const aliasOf = (i: Item) => {
    const q = near.words
    return i.aliases.find((a) => a.toLowerCase() === q || q.split(' ').includes(a.toLowerCase()))
  }
  const words = near.words || asked
  const ask = `${LINKS.github}/issues/new?${new URLSearchParams({ template: 'component-request.yml', title: `Component request: ${titleCase(words)}` })}`
  return (
    <article className="doc nf">
      <header className="page-head">
        <p className="vela-meta page-head__eyebrow">Not found</p>
        <h1 className="vela-h2">{area === 'page' ? <>There is no page at “{asked}”</> : <>There is no {AREA_WORD[area]} called “{name}”</>}</h1>
        <p className="vela-body nf__asked">You asked for <code>#/{asked}</code>. Nothing on this site has that address.</p>
      </header>

      <button type="button" className="nf-search" onClick={() => searchFor(words)}>
        <Icon name="search" />
        <span>Search Vela for “{words}”</span>
      </button>

      {near.parts.length > 0 && (
        <section className="nf__section" aria-labelledby="nf-closest">
          <h2 id="nf-closest" className="vela-h4">{near.how === 'meaning' ? 'Closest by meaning' : 'Did you mean'}</h2>
          <ul className="nf-cards">
            {near.parts.map((i) => <li key={i.id}><Part item={i} alias={aliasOf(i)} /></li>)}
          </ul>
        </section>
      )}

      {near.gaps.length > 0 && (
        <section className="nf__section" aria-labelledby="nf-gaps">
          <h2 id="nf-gaps" className="vela-h4">Not in Vela yet</h2>
          <ul className="nf-cards">
            {near.gaps.map((g) => (
              <li key={g.id} className="nf-gap">
                <span className="nf-card__title">{g.title} <span className="site-tag">{g.tag}</span></span>
                <span className="nf-card__line">{g.title} is {STANDS[g.id]}. {g.sign}</span>
                <a href={href({ kind: 'component', id: CLOSEST[g.id].id })}>Closest today: {CLOSEST[g.id].name}</a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {near.how === 'none' && (
        <section className="nf__section" aria-labelledby="nf-gap">
          <h2 id="nf-gap" className="vela-h4">Not in Vela</h2>
          <div className="nf-gap nf-gap--wide">
            <p className="nf-card__title">Vela has no {titleCase(words)}</p>
            <p className="nf-card__line">No component is called that, by its own name or by another. Vela never invents a part to fill a gap: name the need, and the closest part is chosen with you.</p>
            <a href={ask} target="_blank" rel="noreferrer">Ask for it on GitHub<Icon name="external-link" size="small" /></a>
          </div>
        </section>
      )}

      <section className="nf__section nf__ways" aria-label="Ways on">
        <NextCard eyebrow="Every component" href={href({ kind: 'status' })} title="Component status" line={`All ${REGISTRY.length}, each with its picture and its label`} />
        {/* Every proposal, as a card with its picture, on the Overview (slice 6): the one page that lists them all. */}
        <NextCard eyebrow="Specified, not built yet" href={PROPOSALS_ON_OVERVIEW} title={`${PROPOSALS.length} proposals`} line={`From ${PROPOSALS[0].name} to ${PROPOSALS[PROPOSALS.length - 1].name}`} />
      </section>
    </article>
  )
}
