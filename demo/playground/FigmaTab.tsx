/**
 * The Figma tab (slice 2 of the playground uplift, s5-tabs, section 4). Everything here is read from
 * guidelines/figma-map.json and the spec, at build; nothing is drawn by hand.
 *
 * - Find it in the library: the set as a picture (the real component in every combination of its
 *   Figma variant properties, with this page's setting outlined), and three steps.
 * - Figma properties are props: each property whose prop has closed values is a row of segments that
 *   writes the code line; a property the map explains in words keeps its words. Over eight values,
 *   the first eight, then "and N more" in words (sweep T38). Choosing works by click, tap or keys;
 *   hover alone changes nothing.
 * - Only in code: the props with no Figma property.
 * - No set yet (Icon Button, Brand Mark): said in words, with the import line, and no picture of a set
 *   that does not exist (T26).
 */
import { useId, useMemo, useState, type ReactNode } from 'react'
import figmaMap from '../../guidelines/figma-map.json'
import { Icon, cn } from '../../src'
import type { Control, PropRow } from './spec'
import type { Values, Lock } from './registry'
import { Segments } from '../shell/Segments'
import { Announcer, CopyMark } from '../shell/CopyMark'
import { Markdown, inline } from './Markdown'
import { undash, plural } from './rules-read'

export interface FigmaSetEntry {
  set: string; page: string; state: 'published' | 'built' | 'none'; url: string | null
  import: string; write: string; figmaToProp: { figma: string; prop: string }[]; example: string; spec: string
}

/** The library map's entry for a spec, whatever its state. */
export function figmaEntryFor(specFile: string): FigmaSetEntry | undefined {
  return (figmaMap.sets as FigmaSetEntry[]).find((s) => s.spec === `guidelines/components/${specFile}`)
}

const SEGMENT_CAP = 8
const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const listWords = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0] ?? '')

/** A Figma property that is a prop with closed values: its control. Prose in the map stays prose. */
function controlFor(row: { figma: string; prop: string }, controls: Control[]): Control | undefined {
  return controls.find((c) => c.prop === row.prop.trim() && (c.kind === 'select' || c.kind === 'boolean'))
}

/** "variant="primary"", "icon={<PlusIcon />}", or nothing, for one prop at a value. */
function codeFor(c: Control, value: Values[string]): string {
  if (c.kind === 'boolean') return value ? (c.prop === 'icon' ? 'icon={<PlusIcon />}' : c.prop) : `no ${c.prop}`
  return `${c.prop}="${String(value ?? c.default ?? '')}"`
}

export interface FigmaTabProps {
  name: string
  entry: FigmaSetEntry | undefined
  controls: Control[]
  initial: Values
  values: Values
  render: (v: Values) => ReactNode
  code: (v: Values) => string
  locks?: (v: Values) => Record<string, Record<string, Lock>>
  /** The spec's own Figma mapping section, kept folded as the deep dive. */
  mapping?: string
  /** Rows of the Props table no Figma property covers. */
  onlyInCode: PropRow[]
  /** No set picture for components the set would show as their trigger (the overlays). */
  picture: boolean
  issueHref: string
  /** The setting chosen here, for the Next card. */
  onValues: (v: Values) => void
  children?: ReactNode
}

export function FigmaTab({ name, entry, controls, initial, values, render, code, locks, mapping, onlyInCode, picture, issueHref, onValues, children }: FigmaTabProps) {
  const codeId = useId()
  const importId = useId()
  const [v, setV] = useState<Values>(values)
  const rows = (entry?.figmaToProp ?? []).map((r) => ({ ...r, control: controlFor(r, controls) }))
  const set = (patch: Values) => { const next = { ...v, ...patch }; setV(next); onValues(next) }
  const line = code(v)
  const [why, setWhy] = useState(false)

  // The set as a picture: every combination of the select properties that the code allows (48 at most).
  const grid = useMemo(() => {
    if (!picture) return null
    const axes = rows.filter((r) => r.control?.kind === 'select').map((r) => r.control!)
    if (!axes.length) return null
    let combos: Values[] = [{}]
    for (const a of axes) combos = combos.flatMap((c) => a.options!.map((o) => ({ ...c, [a.prop]: o })))
    if (combos.length > 48) return null
    const legal = combos.filter((c) => {
      const full = { ...initial, ...c }
      const l = locks?.(full) ?? {}
      return !Object.entries(l).some(([p, byValue]) => String(full[p]) in byValue)
    })
    const cols = axes[axes.length - 1]
    return { axes, cols: cols.options!.length, legal }
  }, [picture, rows, initial, locks])
  const current = (c: Values) => grid?.axes.every((a) => String(c[a.prop]) === String(v[a.prop] ?? initial[a.prop])) ?? false
  const currentWords = grid?.axes.map((a) => String(v[a.prop] ?? initial[a.prop])).join(', ')

  if (!entry || entry.state === 'none' || !entry.url) {
    const importLine = entry?.import ?? ''
    return (
      <Announcer>
        <div className="pg-figma">
          <section className="pg-figma__none" aria-labelledby={`${codeId}-h`} data-arrive="1">
            <h2 id={`${codeId}-h`} className="vela-h3 pg-figma__h">No set yet</h2>
            <div className="pg-figma__empty" aria-hidden="true">No set yet</div>
            <p className="pg-p pg-figma__lead"><strong>{name} has no Figma set yet.</strong> Its builder is written; it has not been run in the library.</p>
            {importLine && (
              <>
                <p className="pg-figma__label">Until then, use it in code</p>
                <p className="pg-figma__import"><code id={importId}>{importLine}</code><CopyMark what="import line" text={importLine} shownId={importId} /></p>
              </>
            )}
            <p className="pg-p"><a href={issueHref} target="_blank" rel="noreferrer">Ask for the set on GitHub<Icon name="external-link" size="small" /></a></p>
          </section>
          {children}
        </div>
      </Announcer>
    )
  }

  return (
    <Announcer>
      <div className="pg-figma">
        <section className="pg-figma__find" aria-labelledby={`${codeId}-find`} data-arrive="1">
          <h2 id={`${codeId}-find`} className="vela-h3 pg-figma__h">Find it in the library</h2>
          <div className="pg-figma__where">
            {grid && (
              <figure className="pg-figma__set" aria-label={`${entry.set}, drawn from the code: ${plural(grid.legal.length, 'combination')} of ${grid.axes.map((a) => a.prop).join(', ')}. The outlined one is ${currentWords}.`}>
                <span className="pg-figma__setname" aria-hidden="true">{entry.set}, drawn from the code · {plural(grid.legal.length, 'combination')}</span>
                <div className="pg-figma__grid" style={{ gridTemplateColumns: `repeat(${grid.cols}, auto)` }} aria-hidden="true" inert>
                  {grid.legal.map((c, i) => (
                    <span key={i} className={cn('pg-figma__cell', current(c) && 'is-current')}>{render({ ...initial, ...c })}</span>
                  ))}
                </div>
              </figure>
            )}
            <ol className="pg-steps">
              <li><span className="pg-steps__n" aria-hidden="true">1</span><span className="pg-steps__what">Open the file</span><a href={entry.url} target="_blank" rel="noreferrer">Vela Design System in Figma<Icon name="external-link" size="small" /></a></li>
              <li><span className="pg-steps__n" aria-hidden="true">2</span><span className="pg-steps__what">Go to the page</span><span className="pg-steps__val">{entry.page}</span></li>
              <li>
                <span className="pg-steps__n" aria-hidden="true">3</span><span className="pg-steps__what">Use the set</span><span className="pg-steps__val">{entry.set}</span>
                <span className="pg-steps__note">Its properties: {listWords(entry.figmaToProp.map((r) => r.figma))}</span>
              </li>
            </ol>
          </div>
        </section>

        <section className="pg-figma__props" aria-labelledby={`${codeId}-props`}>
          <h2 id={`${codeId}-props`} className="vela-h3 pg-figma__h">Figma properties are props</h2>
          <ul className="pg-fprops">
            {rows.map((r) => {
              const c = r.control
              const opts = c?.kind === 'select' ? c.options! : c?.kind === 'boolean' ? ['false', 'true'] : []
              const value = c ? (c.kind === 'boolean' ? String(v[c.prop] === true) : String(v[c.prop] ?? c.default ?? '')) : ''
              const shown = opts.slice(0, SEGMENT_CAP)
              const l = c ? locks?.(v)?.[c.prop] ?? {} : {}
              return (
                <li key={r.figma} className="pg-fprop">
                  <span className="pg-fprop__name">{r.figma}</span>
                  <span className="pg-fprop__set">
                    {c ? (
                      <>
                        <Segments
                          label={r.figma}
                          value={value}
                          options={shown.map((o) => ({ value: o, label: c.kind === 'boolean' ? (o === 'true' ? 'On' : 'Off') : title(o), locked: l[o] ? { reason: l[o].reason } : undefined }))}
                          onChange={(o) => set({ [c.prop]: c.kind === 'boolean' ? o === 'true' : o })}
                        />
                        {opts.length > SEGMENT_CAP && <span className="pg-fprop__more">and {opts.length - SEGMENT_CAP} more</span>}
                        {Object.keys(l).length > 0 && <span className="pg-field__note">{[...new Set(Object.values(l).map((x) => x.reason))].join(' ')}</span>}
                      </>
                    ) : <span className="pg-fprop__words">{inline(undash(r.prop), 0)}</span>}
                  </span>
                  {c && <><Icon name="arrow-right" size="small" className="pg-fprop__arrow" /><code className="pg-fprop__code">{codeFor(c, v[c.prop])}</code></>}
                </li>
              )
            })}
          </ul>
          <div className="pg-figma__code">
            <pre id={codeId} className="pg-figma__pre">{line}</pre>
            <CopyMark what="the code for this setting" text={line} shownId={codeId} />
            <div className="pg-figma__live vela-root">{render(v)}</div>
          </div>
        </section>

        {onlyInCode.length > 0 && (
          <section className="pg-figma__code-only" aria-labelledby={`${codeId}-only`}>
            <h2 id={`${codeId}-only`} className="vela-h3 pg-figma__h">Only in code</h2>
            <ul className="pg-only">
              {onlyInCode.map((p) => (
                <li key={`${p.part ?? ''}${p.prop}`} className="pg-only__item">
                  <code className="pg-only__prop">{p.part ? `${p.part}.` : ''}{p.prop}</code>
                  <code className="pg-only__type">{p.type.replace(/`/g, '')}</code>
                  {p.notes && <span className="pg-only__notes">{inline(undash(p.notes), 0)}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {mapping && (
          <div className="pg-alltable">
            <button type="button" className="pg-disclosure" aria-expanded={why} onClick={() => setWhy((w) => !w)}>
              <Icon name={why ? 'chevron-down' : 'chevron-right'} size="small" />
              What the spec says about the set
            </button>
            {why && <div className="pg-figma__why"><Markdown source={undash(mapping)} /></div>}
          </div>
        )}
        {children}
      </div>
    </Announcer>
  )
}

/** "Primary, filled, large, with an icon, on the stage": the Next card's line for a setting. */
export function settingWords(entry: FigmaSetEntry | undefined, controls: Control[], v: Values): string {
  const words: string[] = []
  for (const r of entry?.figmaToProp ?? []) {
    const c = controlFor(r, controls)
    if (!c) continue
    if (c.kind === 'select') words.push(String(v[c.prop] ?? c.default ?? ''))
    else if (v[c.prop] === true) words.push(c.prop === 'icon' ? 'with an icon' : `${c.prop} on`)
  }
  const s = [...words.filter(Boolean), 'on the stage'].join(', ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** How many Figma properties a set has, in words, for the Next card into this tab. */
export function figmaLine(entry: FigmaSetEntry | undefined): string {
  if (!entry || entry.state === 'none') return 'Use it in code until then'
  const n = entry.figmaToProp.length
  const words = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'][n] ?? String(n)
  return `${words} ${n === 1 ? 'property' : 'properties'}, one line each`
}
