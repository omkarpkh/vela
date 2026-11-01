/**
 * The proposal page's parts (slice 4 of the playground uplift, s5-proposal): site parts, never kit
 * components, never exported from the package. Imported only by demo/pages/Proposal.tsx, so they
 * stay in its chunk.
 *
 * - `partStatus` says where a part named in a spec's "Built from" stands today, read from the kit's
 *   own catalogue, the proposals' README and the site's list of missing components (search.ts), never
 *   typed by hand: Popover is in the kit, so it is drawn solid; Combobox is not, so it is flagged
 *   with the closest part the kit has (sweep P5, P6).
 * - `Sketch` draws a proposal's picture in low fidelity: a dashed frame, a "Sketch" chip, boxes of
 *   the spec's own words and grey bars where the spec gives none. It is one figure with a name; the
 *   words inside are hidden from assistive technology, so a sketch is never heard as a working
 *   product (sweep P26). In forced colours the bars keep a CanvasText edge (P29).
 */
import type { ReactNode } from 'react'
import { cn } from '../../src'
import { CATALOG } from '../playground/catalog'
import { PROPOSALS } from '../playground/proposals'
import { MISSING } from '../playground/search'
import { statusOf } from '../playground/status'
import { undash } from '../playground/rules-read'
import { href } from '../router'
import { FOUNDATIONS } from '../nav'
import type { PartStatus } from '../playground/proposal-read'
import type { SketchBlock } from '../playground/proposal-steps'

/** Where a part stands: in the kit (with its status), a proposal, or missing (with the closest the kit has). */
export function partStatus(name: string): PartStatus {
  const kit = CATALOG.find((c) => c.name === name)
  if (kit) return { kind: 'kit', status: statusOf(kit.spec).label, href: href({ kind: 'component', id: kit.id }) }
  // A contract the kit ships with no UI of its own (src/grammar/), read on its own doc page.
  const doc = FOUNDATIONS.find((f) => f.title === name)
  if (doc) return { kind: 'kit', status: statusOf(doc.md).label, href: href({ kind: 'foundation', id: doc.id }) }
  const proposal = PROPOSALS.find((p) => p.name === name)
  if (proposal) return { kind: 'proposal', href: href({ kind: 'proposal', id: proposal.id }) }
  const missing = MISSING.find((m) => m.title === name)
  if (missing) {
    const closest = CATALOG.find((c) => c.id === missing.closest)
    return { kind: 'missing', stands: missing.stands, closest: closest && { name: closest.name, href: href({ kind: 'component', id: closest.id }) } }
  }
  return { kind: 'missing' }
}

/** The words a part's box carries under its name. */
export function statusWords(s: PartStatus): string {
  if (s.kind === 'kit') return `In the kit · ${s.status}`
  if (s.kind === 'proposal') return 'Proposal'
  if (s.kind === 'self') return 'This page'
  return 'Not in the kit'
}

/** "Ab" from "ab": a quote from the middle of a spec sentence, set as a title. */
export const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** A number in a circle: a pin on a sketch, or its note in the list beside it. */
export function Pin({ n }: { n: number }) {
  return <span className="prop-pin" aria-hidden="true">{n}</span>
}

/**
 * A sketch: the spec's own words in boxes, grey bars where the spec gives none. `name` is the one
 * thing a screen reader hears; the boxes are hidden from it.
 */
export function Sketch({ name, caption, blocks, small, className }: { name: string; caption?: ReactNode; blocks: SketchBlock[]; small?: boolean; className?: string }) {
  return (
    <figure className={cn('prop-sketch', small && 'prop-sketch--small', className)} role="img" aria-label={`Sketch: ${name}`}>
      {!small && (
        <figcaption className="prop-sketch__caption" aria-hidden="true">
          <span className="prop-chip">Sketch</span>
          {caption && <span>{caption}</span>}
        </figcaption>
      )}
      <div className="prop-sketch__body" aria-hidden="true">
        {blocks.map((b, i) => (
          <div key={i} className={cn('prop-sketch__block', b.pin !== undefined && 'has-pin')}>
            {b.pin !== undefined && !small && <Pin n={b.pin} />}
            <div className="prop-sketch__box">
              {b.lines.map((l, j) => 'bar' in l
                ? <span key={j} className={cn('prop-bar', l.bar === 'short' && 'prop-bar--short')} />
                : <span key={j} className={cn('prop-sketch__line', l.kind && `is-${l.kind}`)}>{undash(l.text)}</span>)}
            </div>
          </div>
        ))}
      </div>
    </figure>
  )
}

/** The first thing a state's "What renders" quotes, as a sketch's words; none when it quotes nothing. */
export function quoteOf(renders: string): string | undefined {
  const q = renders.match(/"([^"]{3,})"/)?.[1]
  return q ? undash(q.replace(/\*/g, '')) : undefined
}
