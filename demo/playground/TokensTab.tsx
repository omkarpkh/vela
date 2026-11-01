/**
 * The Tokens tab (slice 2 of the playground uplift, s5-tabs, section 3).
 *
 * - Anatomy: the variant picker by picture (each picture is the real component, from the spec's Token
 *   bindings rows; a spec without variant rows gets no picker, sweep T37), State and Theme segments,
 *   and the component on a stage at twice its size, with the token each part binds beside it. A
 *   state's own tokens are marked "Changes on hover", in words, with a start edge and a tint.
 * - Colour, Size, Motion and Type: every token the spec names, resolved in the theme chosen here; the
 *   page keeps its own theme (T24). Long names break only after a hyphen (T33).
 * - A token the component's stylesheet binds but the spec never names is shown, dashed, with the
 *   words "Bound in code, not named in the spec": the page tells the truth even when it is
 *   uncomfortable (T28, T29).
 * - Every token has a 24px copy mark, always visible, with Copied and the Copy pattern's refusal.
 * - "See all as one table" keeps the full light and dark table, with Figma names, folded.
 */
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../src'
import type { Spec } from './spec'
import type { Values } from './registry'
import { resolve, figmaOf, isColor, kindOf, inState, exists, STATES, type Mode, type TokenKind, type TokenState } from './tokens'
import { Segments } from '../shell/Segments'
import { SectionIndex, type SectionLink } from '../shell/SectionIndex'
import { Fold, ShowMore, Rest, SHOW_FIRST } from '../shell/Fold'
import { Stage } from '../shell/Stage'
import { Announcer, CopyMark } from '../shell/CopyMark'
import { ScrollRegion } from '../shell/ScrollRegion'
import { Icon } from '../../src'
import { plural, undash } from './rules-read'

// The stylesheets the components ship, read for what they bind (T28). Raw text, bundled with the page.
const SHEETS = import.meta.glob<string>(['../../src/components/*/*.css', '../../src/headless/*/*.css'], { query: '?raw', import: 'default', eager: true })

/** Every token a component's stylesheet binds, by its source folder. */
export function boundInCode(src: string, headless: boolean): string[] {
  const sheet = SHEETS[`../../src/${headless ? 'headless' : 'components'}/${src}/${src}.css`] ?? ''
  return [...new Set([...sheet.matchAll(/var\((--vela-[a-z0-9-]+)/g)].map((m) => m[1]))].filter(exists)
}

const KIND_WORDS: Record<TokenKind, { index: string; heading: string }> = {
  colour: { index: 'Colour', heading: 'Colour' },
  size: { index: 'Size', heading: 'Size' },
  motion: { index: 'Motion', heading: 'Motion' },
  other: { index: 'Type', heading: 'Type and the rest' },
}

/** "Background", "Label", "Border" from a token's role, when no bindings table names the part. */
const PART_WORDS: Record<string, string> = { bg: 'Background', text: 'Label', border: 'Border', icon: 'Icon', signal: 'Signal', indicator: 'Edge' }
const partOf = (token: string) => {
  const last = token.split('-').pop() ?? ''
  return PART_WORDS[last] ?? PART_WORDS[token.replace(/^--vela-/, '').split('-')[0]] ?? token.replace(/^--vela-/, '')
}

/** A token's name, breaking only after a hyphen; the copy keeps the whole name. */
export function TokenName({ name, id }: { name: string; id?: string }) {
  const parts = name.split('-')
  return (
    <code id={id} className="pg-token__name">
      {parts.map((p, i) => <span key={i}>{p}{i < parts.length - 1 ? '-' : ''}{i < parts.length - 1 && p !== '' ? <wbr /> : null}</span>)}
    </code>
  )
}

function Swatch({ value }: { value: string }) {
  return <span className="pg-token__swatch" style={{ background: value }} aria-hidden="true" />
}

/** One token: its name, its value in the theme shown, and its copy mark. */
function TokenCell({ token, theme }: { token: string; theme: Mode }) {
  const id = useId()
  const value = resolve(token, theme)
  return (
    <span className="pg-token">
      {isColor(token) && <Swatch value={value} />}
      <span className="pg-token__text">
        <TokenName name={token} id={id} />
        <span className="pg-token__value">{value}</span>
      </span>
      <CopyMark what={token} text={token} shownId={id} />
    </span>
  )
}

export interface Variant { key: string; values: Values }

/** The spec's Token bindings rows that name values of the stage's own props: the variant pictures. */
export function variantsOf(bindings: Spec['bindings'], selects: { prop: string; options?: string[] }[]): Variant[] {
  const out: Variant[] = []
  for (const key of Object.keys(bindings)) {
    const values: Values = {}
    const ok = key.split(' · ').every((part) => {
      const c = selects.find((s) => s.options?.includes(part.trim()) && !(s.prop in values))
      if (c) values[c.prop] = part.trim()
      return !!c
    })
    if (ok && Object.keys(values).length) out.push({ key, values })
  }
  return out
}

export interface TokensTabProps {
  name: string
  spec: Spec
  tokens: string[]
  /** What the component's stylesheet binds (boundInCode). */
  inCode: string[]
  variants: Variant[]
  /** The variant the page's stage shows now, if it is one of the pictures. */
  startKey: string | undefined
  /** The page's stage values, so the tab starts where the reader was. */
  values: Values
  render: (v: Values) => ReactNode
  code: (v: Values) => string
  /** Whether a token is bound for these values, when the spec has no bindings row for them. */
  isBound: (v: Values) => (token: string) => boolean
  pageTheme: Mode
  children?: ReactNode
}

export function TokensTab({ name, spec, tokens, inCode, variants, startKey, values, render, code, isBound, pageTheme, children }: TokensTabProps) {
  const [key, setKey] = useState<string | undefined>(startKey ?? variants[0]?.key)
  const [state, setState] = useState<TokenState>('rest')
  const [theme, setTheme] = useState<Mode>(pageTheme)
  const [query, setQuery] = useState('')
  const [said, setSaid] = useState('')
  const [closed, setClosed] = useState<Set<string>>(() => new Set())
  const [more, setMore] = useState<Set<string>>(() => new Set())
  const [all, setAll] = useState(false)
  const findId = useId()
  const variant = variants.find((x) => x.key === key)
  const v: Values = { ...values, ...(variant?.values ?? {}), ...(state === 'disabled' ? { disabled: true } : {}) }
  const row = (state === 'disabled' ? Object.entries(spec.bindings).find(([k]) => k.startsWith('disabled'))?.[1] : undefined) ?? (variant ? spec.bindings[variant.key] : undefined)
  const bound = isBound(v)

  // The parts beside the stage: the bindings row's columns, or the bound colour tokens by their role.
  const parts = useMemo(() => {
    const list: { part: string; token: string | null; words: string; changes: boolean }[] = []
    if (row) {
      for (const [part, cell] of Object.entries(row)) {
        const token = /^--vela-/.test(cell) ? cell : null
        const moved = token && state !== 'rest' && state !== 'disabled' ? inState(token, state) : null
        list.push({ part, token: moved ?? token, words: token ? '' : undash(cell), changes: !!moved || (state === 'disabled' && !!token) })
      }
    } else {
      for (const t of tokens.filter((x) => isColor(x) && bound(x))) {
        const moved = state !== 'rest' ? inState(t, state) : null
        list.push({ part: partOf(t), token: moved ?? t, words: '', changes: !!moved })
      }
    }
    return list
  }, [row, tokens, bound, state])
  const anyChange = parts.some((p) => p.changes)
  const stateWord = STATES.find((s) => s.value === state)!.label

  // Every token by kind; the stylesheet's colour tokens the spec never names join Colour, dashed.
  const unnamed = inCode.filter((t) => isColor(t) && !tokens.includes(t))
  const q = query.trim().toLowerCase()
  const hit = (t: string) => !q || t.toLowerCase().includes(q) || resolve(t, theme).toLowerCase().includes(q)
  const kinds = (['colour', 'size', 'motion', 'other'] as TokenKind[])
    .map((k) => ({ kind: k, all: [...tokens.filter((t) => kindOf(t) === k)].sort((a, b) => Number(bound(b)) - Number(bound(a))) }))
    .filter((k) => k.all.length > 0)
  const total = tokens.length
  const shownCount = tokens.filter(hit).length

  useEffect(() => {
    if (!q) { setSaid(''); return }
    const t = window.setTimeout(() => setSaid(`${shownCount} of ${total} tokens shown`), 300)
    return () => window.clearTimeout(t)
  }, [q, shownCount, total])

  const index: SectionLink[] = [
    { id: 'anatomy', label: 'Anatomy' },
    ...kinds.map((k) => ({ id: k.kind, label: KIND_WORDS[k.kind].index, count: k.all.length })),
  ]
  const ids = index.map((s) => s.id)
  const anyOpen = ids.some((id) => !closed.has(id))
  const setFold = (id: string, o: boolean) => setClosed((c) => { const n = new Set(c); if (o) n.delete(id); else n.add(id); return n })
  const variantWords = variant ? `${variant.key}${typeof v.size === 'string' ? ` · ${v.size}` : ''}` : undefined

  const tools = (
    <>
      <label className="pg-find" htmlFor={findId}>
        <span className="pg-find__label">Find a token</span>
        <span className="pg-find__field">
          <Icon name="search" size="small" />
          <input id={findId} type="search" className="pg-find__input" placeholder="for example, hover" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" spellCheck={false} />
        </span>
      </label>
      <button type="button" className="pg-collapse" onClick={() => setClosed(anyOpen ? new Set(ids) : new Set())}>
        <Icon name={anyOpen ? 'chevron-up' : 'chevron-down'} size="small" />
        {anyOpen ? 'Collapse all' : 'Expand all'}
      </button>
    </>
  )

  return (
    <Announcer>
      <SectionIndex items={index} tools={tools} />
      <p className="vela-sr-only" role="status">{said}</p>
      <div className="pg-tokens">
        <Fold id="anatomy" heading="Anatomy" aside={variantWords} open={!closed.has('anatomy')} onOpenChange={(o) => setFold('anatomy', o)} className="pg-group">
          {variants.length > 1 && (
            <div className="pg-variants" role="group" aria-label="Variant">
              {/* The picture is the real component, inert and unheard; the button is the words, and its
                  hit area covers the card, so no control sits inside another. */}
              {variants.map((x) => (
                <div key={x.key} className={cn('pg-variant', x.key === key && 'is-current')}>
                  <span className="pg-variant__pic vela-root" data-theme={theme} aria-hidden="true" inert>{render({ ...values, ...x.values })}</span>
                  <button type="button" className="pg-variant__pick" aria-current={x.key === key ? 'true' : undefined} onClick={() => setKey(x.key)}>{x.key}</button>
                </div>
              ))}
            </div>
          )}
          <div className="pg-tokens__sets">
            <span className="pg-toolbar__group"><span className="pg-toolbar__label" aria-hidden="true">State</span>
              <Segments label="State" value={state} options={STATES.map((s) => ({ value: s.value, label: s.label }))} onChange={setState} />
            </span>
            <span className="pg-toolbar__group"><span className="pg-toolbar__label" aria-hidden="true">Theme</span>
              <Segments label="Theme" value={theme} options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} onChange={setTheme} />
            </span>
          </div>
          <Anatomy name={name} v={v} theme={theme} render={render} code={code(v).split('\n')[0]} stateWord={stateWord} variantWords={variant?.key}>
            {parts.length > 0 && (
              <ul className="pg-parts">
                {parts.map((p) => (
                  <li key={p.part} className={cn('pg-part', p.changes && 'is-changed')}>
                    <span className="pg-part__name">{p.part}{p.changes && state !== 'disabled' && <span className="site-tag">Changes on {stateWord.toLowerCase()}</span>}</span>
                    {p.token ? <TokenCell token={p.token} theme={theme} /> : <span className="pg-part__words">{p.words}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Anatomy>
          {state !== 'rest' && state !== 'disabled' && !anyChange && (
            <p className="pg-p">
              Nothing in colour changes on {stateWord}.
              {state === 'focus' && <> The ring is drawn by <code>--vela-focus-ring-width</code> and <code>--vela-focus-ring-offset</code>.</>}
            </p>
          )}
        </Fold>

        {q && shownCount === 0 && (
          <div className="pg-nomatch">
            <p className="pg-nomatch__lead">No token on {name} matches “{query.trim()}”.</p>
            <p className="pg-p">Tokens are found by their name and their value.</p>
            <p className="pg-nomatch__ways"><button type="button" className="pg-linkbutton" onClick={() => { setQuery(''); document.getElementById(findId)?.focus() }}>Clear the search</button></p>
          </div>
        )}

        {kinds.map((k) => {
          const list = k.all.filter(hit)
          const extra = k.kind === 'colour' ? unnamed.filter(hit) : []
          if (q && list.length === 0 && extra.length === 0) return null
          const first = q ? list : list.slice(0, SHOW_FIRST)
          const rest = q ? [] : list.slice(SHOW_FIRST)
          const line = (t: string) => {
            const isBoundNow = bound(t)
            const changes = state !== 'rest' && parts.some((p) => p.changes && p.token === t)
            return (
              <li key={t} className={cn('pg-trow', (isBoundNow || changes) && 'is-bound')}>
                <TokenCell token={t} theme={theme} />
                {k.kind === 'size' && <span className="pg-trow__bar" aria-hidden="true"><span style={{ width: `var(${t})` }} /></span>}
                <span className="pg-trow__tags">
                  {changes && <span className="site-tag">Changes on {stateWord.toLowerCase()}</span>}
                  {isBoundNow && variant && <span className="site-tag">{variant.key}</span>}
                  {isBoundNow && !variant && <span className="site-tag">On the stage</span>}
                </span>
              </li>
            )
          }
          return (
            <Fold key={k.kind} id={k.kind} heading={KIND_WORDS[k.kind].heading} count={k.all.length} open={!closed.has(k.kind)} onOpenChange={(o) => setFold(k.kind, o)} className="pg-group">
              <ul className="pg-trows">{first.map(line)}</ul>
              {rest.length > 0 && (
                <>
                  <Rest as="ul" className="pg-trows" shown={more.has(k.kind)} onFound={() => setMore((m) => new Set(m).add(k.kind))}>{rest.map(line)}</Rest>
                  {!more.has(k.kind) && <ShowMore more={rest.length} onShow={() => setMore((m) => new Set(m).add(k.kind))} />}
                </>
              )}
              {extra.length > 0 && (
                <div className="pg-unnamed">
                  <p className="pg-unnamed__words">Bound in code, not named in the spec</p>
                  <ul className="pg-trows">
                    {extra.map((t) => <li key={t} className="pg-trow"><TokenCell token={t} theme={theme} /></li>)}
                  </ul>
                </div>
              )}
            </Fold>
          )
        })}

        <div className="pg-alltable">
          <button type="button" className="pg-disclosure" aria-expanded={all} onClick={() => setAll((a) => !a)}>
            <Icon name={all ? 'chevron-down' : 'chevron-right'} size="small" />
            See all {total} as one table, light and dark
          </button>
          {all && (
            <ScrollRegion label="Tokens, scrollable" className="pg-tablewrap">
              <table className="pg-table pg-table--tokens">
                <thead><tr><th>Token</th><th>Light</th><th>Dark</th><th>Figma</th></tr></thead>
                <tbody>
                  {tokens.map((t) => {
                    const l = resolve(t, 'light'), d = resolve(t, 'dark')
                    return (
                      <tr key={t} className={bound(t) ? 'is-bound' : undefined}>
                        <td><TokenName name={t} /></td>
                        <td>{isColor(t) && <Swatch value={l} />}<code>{l}</code></td>
                        <td>{isColor(t) && <Swatch value={d} />}<code>{d}</code></td>
                        <td><code>{figmaOf(t)}</code></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </ScrollRegion>
          )}
        </div>
        {children}
      </div>
    </Announcer>
  )
}

/** The stage: the component at twice its size when it fits, or real size, in the theme chosen. */
function Anatomy({ name, v, theme, render, code, stateWord, variantWords, children }: { name: string; v: Values; theme: Mode; render: (v: Values) => ReactNode; code: string; stateWord: string; variantWords?: string; children: ReactNode }) {
  const holder = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [twice, setTwice] = useState(true)
  useLayoutEffect(() => {
    const h = holder.current, i = inner.current
    if (!h || !i) return
    const check = () => {
      const natural = i.scrollWidth / (twice ? 2 : 1)
      setTwice(natural * 2 <= h.clientWidth)
    }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(h)
    return () => ro.disconnect()
  }, [twice, v])
  const said = [variantWords ? variantWords.replace(/ · /g, ', ') : name, stateWord !== 'Rest' ? stateWord.toLowerCase() : ''].filter(Boolean).join(', ')
  return (
    <Stage caption={twice ? 'Live, twice size' : 'Live'} props={code} className="pg-anatomy">
      <div className="pg-anatomy__body">
        {children}
        <figure className="pg-anatomy__figure">
          <div ref={holder} className="pg-anatomy__holder vela-root" data-theme={theme}>
            <div ref={inner} className="pg-anatomy__live"><div className={cn('pg-anatomy__zoom', twice && 'is-twice')}>{render(v)}</div></div>
          </div>
          <figcaption className="pg-anatomy__caption">{said.charAt(0).toUpperCase() + said.slice(1)}. {twice ? 'Twice its real size.' : 'Its real size.'}{stateWord === 'Hover' || stateWord === 'Pressed' || stateWord === 'Focus' ? ` The ${stateWord.toLowerCase()} tokens are marked beside it; point at the component to see them.` : ''}</figcaption>
        </figure>
      </div>
    </Stage>
  )
}

/** The words for the Next card into this tab: the groups it has, and the count. */
export function tokensLine(tokens: string[]): string {
  const kinds = [...new Set(tokens.map(kindOf))].sort((a, b) => ['colour', 'size', 'motion', 'other'].indexOf(a) - ['colour', 'size', 'motion', 'other'].indexOf(b))
  const words = ['Anatomy', ...kinds.map((k) => (k === 'other' ? 'type' : k))]
  const list = words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}` : words[0]
  return `${list.charAt(0).toUpperCase()}${list.slice(1).toLowerCase()}, ${plural(tokens.length, 'token')}`
}
