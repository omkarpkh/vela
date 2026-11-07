/**
 * The Playground tab's spec sections (slice 7, s5-tabs, Playground tab): after the stage and the
 * code, the spec's own Props table, its States and its keyboard, so the tab answers "what can I set,
 * what does it do in each state, and how do I reach it" without a trip to the spec. Every word is
 * the spec's, read at build, through the display layer (`undash`); nothing is written here.
 *
 * - Props repeats the spec's Props table (or its Composition table, for a component made of parts),
 *   every row, as the spec writes it. Its count is the table's rows. A prop the stage has no control
 *   for carries a "no control" tag, its reason on hover and focus (the kit's Tooltip, description
 *   kind); the registry's plain words for it, which "Also in the API" used to show beside the
 *   controls, follow the spec's own Notes (slice 7 fixes, item 9: each thing shown once).
 * - States is the spec's States section, whole. Its count is its top-level items (a list's bullets,
 *   or a table's rows). A spec without one has no States here. States is on this tab only: the Rules
 *   tab keeps Motion and Anti-patterns.
 * - Keyboard is what the spec's Accessibility section says about keys: the items that name a key or
 *   the keyboard. A spec that says nothing about keys has no Keyboard here, never a placeholder.
 *
 * With the stage and "Use it", four or more of these give the tab Slice 1's section index ("On this
 * tab"); three or fewer, and the sections are already in view, so there is none.
 */
import type { ReactNode } from 'react'
import { Tooltip } from '../../src/headless'
import { Markdown, inline } from './Markdown'
import { undash } from './rules-read'
import { cells, sectionOf, type Spec } from './spec'
import { ScrollRegion } from '../shell/ScrollRegion'

/** The table blocks of a section: runs of lines that start with a pipe. */
const tablesOf = (body: string) => body.split(/\n\s*\n/).map((b) => b.trim()).filter((b) => b.startsWith('|'))

/** The spec's Props table (or Composition table), as the spec writes it, and its row count. */
export function propsOf(spec: Spec): { table: string; count: number } | null {
  const s = spec.sections.find((x) => x.heading === 'Props' || x.heading === 'Composition')
  const table = s ? tablesOf(s.body).join('\n\n') : ''
  return table && spec.props.length > 0 ? { table, count: spec.props.length } : null
}

/** The spec's States section and how many states it names: top-level bullets, or a table's rows. */
export function statesOf(spec: Spec): { body: string; count: number } | null {
  const s = sectionOf(spec, 'States')
  if (!s) return null
  const bullets = s.body.split('\n').filter((l) => /^- /.test(l)).length
  const rows = tablesOf(s.body).reduce((n, t) => n + Math.max(0, t.split('\n').length - 2), 0)
  const count = bullets || rows
  return count > 0 ? { body: s.body, count } : null
}

/** A key, or the keyboard, named in a line of the spec. */
const KEY = /\b(Tab|Enter|Space|Escape|Esc|Arrow|Home|End|Shift|F6|keyboard|tabindex)\b/

/** The Accessibility section's items that name a key or the keyboard, each with its nested lines. */
export function keyboardOf(spec: Spec): string | null {
  const s = sectionOf(spec, 'Accessibility')
  if (!s) return null
  // Top-level items, each with any lines indented under it (Dropdown List's "Keys:" list).
  const items: string[] = []
  for (const line of s.body.split('\n')) {
    if (/^- /.test(line)) items.push(line)
    else if (items.length && /^\s+\S/.test(line)) items[items.length - 1] += `\n${line}`
    else if (!line.trim()) items.push('')
  }
  const keys = items.filter((it) => it.startsWith('- ') && KEY.test(it))
  return keys.length ? keys.join('\n') : null
}

/** A prop the stage has no control for: its part (in a Composition table) and its name. */
export interface NoControl { part?: string; prop: string }

/** The reason a prop has no control, when the registry gives none of its own. */
export const NO_CONTROL_REASON = 'No control on the stage: it looks the same whichever you pick.'

/** The tag, a button so the keyboard reaches it; its reason is its description, on hover and on focus. */
function NoControlTag({ reason }: { reason: string }) {
  return (
    <Tooltip content={reason}>
      <button type="button" className="site-tag pg-nocontrol">no control</button>
    </Tooltip>
  )
}

const key = (part: string | undefined, prop: string) => `${part ?? ''}.${prop}`
const bare = (s: string) => s.replace(/`/g, '').trim()

/**
 * The Props table as Markdown draws a table, row for row, with the tag after a prop that has no
 * control, and the registry's plain words for it after the spec's Notes.
 */
function PropsTable({ table, noControl, explain }: { table: string; noControl: NoControl[]; explain: Record<string, string> }) {
  const without = new Set(noControl.map((n) => key(n.part, n.prop)))
  const blocks = table.split(/\n\s*\n/).map((b) => b.trim()).filter((b) => b.startsWith('|'))
  return (
    <>
      {blocks.map((block, b) => {
        const [head, , ...body] = block.split('\n').map(cells)
        const hasPart = head[0]?.toLowerCase() === 'part'
        const propAt = hasPart ? 1 : 0
        const notesAt = head.findIndex((h) => /^notes$/i.test(h))
        let part: string | undefined
        return (
          <ScrollRegion key={b} label={`${head[0] ? head[0].replace(/[`*]/g, '') + ' table' : 'Table'}, scrollable`} className="pg-tablewrap">
            <table className="pg-table">
              <thead><tr>{head.map((h, j) => <th key={j}>{inline(h, j)}</th>)}</tr></thead>
              <tbody>
                {body.map((r, j) => {
                  if (hasPart && r[0]) part = bare(r[0])
                  const prop = bare(r[propAt] ?? '')
                  const tagged = without.has(key(hasPart ? part : undefined, prop))
                  const words = tagged ? explain[prop] : undefined
                  return (
                    <tr key={j}>
                      {r.map((c, m) => {
                        let cell: ReactNode = inline(c, m)
                        if (m === propAt && tagged) cell = <>{cell} <NoControlTag reason={NO_CONTROL_REASON} /></>
                        if (m === notesAt && words) cell = <>{cell} {inline(undash(words), m + 1)}</>
                        return <td key={m}>{cell}</td>
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </ScrollRegion>
        )
      })}
    </>
  )
}

export interface SpecSectionsProps {
  name: string
  spec: Spec
  specHref: string
  /** The props the stage has no control for: each is tagged in the Props table. */
  noControl?: NoControl[]
  /** The registry's plain words for a prop with no control, added after the spec's Notes. */
  explain?: Record<string, string>
}

/** The three sections, each under its own heading, its id the section index's target. */
export function SpecSections({ name, spec, specHref, noControl = [], explain = {} }: SpecSectionsProps) {
  const props = propsOf(spec)
  const states = statesOf(spec)
  const keys = keyboardOf(spec)
  if (!props && !states && !keys) return null
  return (
    <div className="pg-spec">
      {props && (
        <section className="pg-spec__section" aria-labelledby="section-props">
          <h2 id="section-props" className="vela-h3">Props</h2>
          <p className="pg-p">Every prop {name} has, as <a href={specHref}>the spec</a> writes it. Nothing outside this table exists.</p>
          <PropsTable table={undash(props.table)} noControl={noControl} explain={explain} />
        </section>
      )}
      {states && (
        <section className="pg-spec__section" aria-labelledby="section-states">
          <h2 id="section-states" className="vela-h3">States</h2>
          <Markdown source={undash(states.body)} em />
        </section>
      )}
      {keys && (
        <section className="pg-spec__section" aria-labelledby="section-keyboard">
          <h2 id="section-keyboard" className="vela-h3">Keyboard</h2>
          <Markdown source={undash(keys)} em />
        </section>
      )}
    </div>
  )
}
