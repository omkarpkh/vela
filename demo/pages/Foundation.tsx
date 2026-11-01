import { useId, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { cn, Button, Input, StatusIndicator, RiskPill, Icon } from '../../src'
import { IconButton } from '../../src/headless'
import type { Severity, Status, Risk } from '../../src'
import { FOUNDATIONS } from '../nav'
import { Markdown } from '../playground/Markdown'
import { GROUP, resolve } from '../playground/tokens'
import { LINKS } from '../links'
import { href } from '../router'
import { Announcer, CopyMark } from '../shell/CopyMark'
import { SectionIndex, useIndexForm, INDEX_MIN } from '../shell/SectionIndex'
import { Fold, ShowMore, Rest, SHOW_FIRST } from '../shell/Fold'
import { NextCard } from '../shell/Card'
import { SeverityTag } from '../shell/SeverityTag'
import { useArrival } from '../shell/arrival'
import { springAt } from '../../scripts/spring.mjs'
import { SEVERITIES, STATUSES, RISKS } from './overview-facts'
import {
  splitSpec, withoutTables, firstParagraph, useOf, colourGroups, ROLES, LEVEL_WORDS, primitiveFamilies,
  typeRoles, otherSizes, SKIPPED_SPACE, MOTION, valueWords, useLine, springOf, bezierNumbers, type MdSection,
} from './foundation-read'
// The Markdown renderer's code blocks and tables are styled there (`.pg-code`, `.pg-tablewrap`). Without
// it, a page opened directly, before any playground page, drew a long code line past the window.
import '../playground.css'
import './docs.css'
import './foundation.css'

// The Foundations pages (slice 6 of the playground uplift): each spec with its tables turned into
// specimens. Swatches are painted by the token itself, once in each theme (a `data-theme` subtree, the
// way a product themes a part of a page), type is set in its own class, space and size are bars of the
// token's own length, and the curves play when asked. Every token has a copy mark that is always in
// view, and every value is read from the token file. The spec's paragraphs stay under each picture,
// and its other sections are read as the document they are. A contract (Filter Grammar) has no
// specimen and is read as a document, as in slice 5.

const GH = `${LINKS.github}/blob/main/guidelines/foundations`

/** A token's name, breakable after its hyphens, with its copy mark after it. */
function Tok({ name, text = name }: { name: string; text?: string }) {
  const id = useId()
  const parts = text.split('-')
  return (
    <span className="fd-tok">
      <code id={id} className="fd-tok__name">
        {parts.map((p, i) => <span key={i}>{p}{i < parts.length - 1 ? '-' : ''}{i < parts.length - 1 && p !== '' ? <wbr /> : null}</span>)}
      </code>
      <CopyMark what={text} text={text} shownId={id} />
    </span>
  )
}

/** The value in light, and in dark when it differs. Said in words to a screen reader. */
function Values({ name }: { name: string }) {
  const v = valueWords(name)
  return (
    <span className="fd-values">
      {v.dark ? <><span className="vela-sr-only">Light </span>{v.light}<span aria-hidden="true"> · </span><span className="vela-sr-only">, dark </span>{v.dark}</> : v.light}
    </span>
  )
}

/** The token painted in each theme: light on the left, dark on the right. A picture, so it is hidden. */
function Pair({ name, small }: { name: string; small?: boolean }) {
  const paint = { background: `var(${name})` } as CSSProperties
  return (
    <span className={cn('fd-pair', small && 'fd-pair--small')} aria-hidden="true">
      <span data-theme="light" className="fd-pair__half" style={paint} />
      <span data-theme="dark" className="fd-pair__half" style={paint} />
    </span>
  )
}

/** A group of more than six shows six, then "Show N more" (Omkar's review rule 3). */
function SixThenMore<T>({ items, render, className, as = 'ul' }: { items: T[]; render: (t: T) => ReactNode; className: string; as?: 'ul' | 'div' }) {
  const [shown, setShown] = useState(false)
  const first = items.slice(0, SHOW_FIRST)
  const rest = items.slice(SHOW_FIRST)
  const List = as
  return (
    <>
      <List className={className}>{first.map(render)}</List>
      {rest.length > 0 && <Rest as={as} shown={shown} onFound={() => setShown(true)} className={className}>{rest.map(render)}</Rest>}
      {!shown && <ShowMore more={rest.length} onShow={() => setShown(true)} />}
    </>
  )
}

// ------------------------------------------------------------------------------------- colour --

function SwatchCard({ name }: { name: string }) {
  return (
    <li className="fd-swatch">
      <Pair name={name} />
      <Tok name={name} />
      <Values name={name} />
    </li>
  )
}

function Semantic() {
  const groups = useMemo(colourGroups, [])
  return (
    <div className="fd-groups">
      <p className="fd-key">Each swatch is the token itself: light on the left, dark on the right.</p>
      {groups.map((g) => (
        <section key={g.id} className="fd-group" aria-labelledby={`fd-${g.id}`}>
          <h3 id={`fd-${g.id}`} className="fd-h3">{g.title} <span className="fd-count">{g.tokens.length}</span></h3>
          <SixThenMore items={g.tokens} className="fd-swatches" render={(t) => <SwatchCard key={t} name={t} />} />
        </section>
      ))}
    </div>
  )
}

/** One taxonomy as a table: each level, shown by its own component, and one swatch per role. */
function TaxonomyTable<L extends string>({ title, levels, kind, roles, show, note }: {
  title: string; levels: readonly L[]; kind: 'severity' | 'risk' | 'status'; roles: readonly (typeof ROLES)[number][]; show: (l: L) => ReactNode; note?: ReactNode
}) {
  const id = useId()
  return (
    <section className="fd-taxonomy" aria-labelledby={id}>
      <h3 id={id} className="fd-h3">{title} <span className="fd-count">{levels.length}</span></h3>
      <div className="fd-tablewrap">
        <table className="fd-table">
          <caption className="vela-sr-only">{title}: each level, and its token for each role, in light and dark</caption>
          <thead>
            <tr>
              <th scope="col">Shown as</th>
              {roles.map((r) => <th key={r.role} scope="col">{r.words}</th>)}
            </tr>
          </thead>
          <tbody>
            {levels.map((l) => (
              <tr key={l}>
                <th scope="row">{show(l)}</th>
                {roles.map((r) => <td key={r.role}><SwatchCell name={r.token(kind, l)} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && <p className="fd-note">{note}</p>}
    </section>
  )
}

function SwatchCell({ name }: { name: string }) {
  const id = useId()
  return (
    <span className="fd-cell">
      <Pair name={name} small />
      <code id={id} className="vela-sr-only">{name}</code>
      <CopyMark what={name} text={name} shownId={id} />
    </span>
  )
}

function Taxonomies({ statusNote }: { statusNote: string }) {
  const signal = ROLES.filter((r) => r.role === 'signal')
  return (
    <div className="fd-groups">
      <p className="fd-key">Each swatch is light on the left, dark on the right. Each copy mark copies the whole token, such as <code className="fd-tok__name">--vela-bg-severity-major</code>.</p>
      <TaxonomyTable<Severity> title="Severity" kind="severity" levels={SEVERITIES} roles={ROLES} show={(s) => <SeverityTag severity={s} />} />
      <TaxonomyTable<Status> title="Status" kind="status" levels={STATUSES} roles={signal} show={(s) => <StatusIndicator status={s} label={LEVEL_WORDS.status(s)} />}
        note={statusNote ? <Markdown source={statusNote} top="h2" doc={{ base: GH }} /> : undefined} />
      <TaxonomyTable<Risk> title="Risk" kind="risk" levels={RISKS} roles={ROLES} show={(r) => <RiskPill risk={r} />} />
    </div>
  )
}

function Primitives({ line }: { line: string }) {
  const families = useMemo(primitiveFamilies, [])
  return (
    <div className="fd-groups">
      <p className="fd-key">{line}</p>
      <ul className="fd-families">
        {families.map((f) => (
          <li key={f.family} className="fd-family">
            <span className="fd-family__name">{f.family}</span>
            <ul className="fd-ramp" aria-label={f.family}>
              {f.tokens.map((t) => {
                const step = t.replace(`--vela-${f.family}-`, '').replace('--vela-', '')
                const hex = resolve(t, 'light')
                return (
                  <li key={t} className="fd-ramp__step">
                    {/* A primitive's own value, painted as a picture of the scale. It is never bound: no copy mark. */}
                    <span className="fd-ramp__chip" style={{ background: hex }} aria-hidden="true" />
                    <span className="fd-ramp__words"><span className="vela-sr-only">{f.family} </span>{step}<span className="vela-sr-only">, {hex}</span></span>
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  )
}

// --------------------------------------------------------------------------------- typography --

const SAMPLE = {
  primary: 'a.mehta signed in from two countries in nine minutes',
  display: '98.2%',
  mono: '10.0.4.17 · 3f9a2c1 · 08:02 UTC',
}

function Families() {
  const fams = [
    { token: '--vela-font-family-primary', cls: 'fd-face--primary', big: 'Aa', sample: SAMPLE.primary },
    { token: '--vela-font-family-display', cls: 'fd-face--display', big: 'Aa', sample: SAMPLE.display },
    { token: '--vela-font-family-mono', cls: 'fd-face--mono', big: 'Aa', sample: SAMPLE.mono },
  ]
  return (
    <ul className="fd-faces">
      {fams.map((f) => (
        <li key={f.token} className="fd-face">
          <span className={cn('fd-face__big', f.cls)} aria-hidden="true">{f.big}</span>
          <span className={cn('fd-face__sample', f.cls)}>{f.sample}</span>
          <Tok name={f.token} />
          <span className="fd-values fd-values--wrap">{resolve(f.token, 'light')}</span>
        </li>
      ))}
    </ul>
  )
}

function Scale({ md }: { md: string }) {
  const roles = useMemo(() => typeRoles(md), [md])
  return (
    <ul className="fd-rows fd-scale">
      {roles.map((r) => (
        <li key={r.role} className="fd-row fd-scale__row">
          <span className="fd-scale__role">
            <span className="fd-scale__name">{r.role}</span>
            <span className="fd-values">{r.triple}</span>
          </span>
          <span className={cn('fd-scale__sample', r.className.startsWith('.') ? r.className.slice(1) : 'vela-meta', r.mono && 'fd-face--mono')}>
            Impossible travel from two countries
          </span>
          <span className="fd-scale__class">
            {r.className.startsWith('.') ? <Tok name={r.className.slice(1)} /> : <Tok name="--vela-font-family-mono" />}
          </span>
        </li>
      ))}
    </ul>
  )
}

function TokenGrid({ tokens }: { tokens: string[] }) {
  return (
    <SixThenMore items={tokens} className="fd-tokgrid" render={(t) => (
      <li key={t} className="fd-tokgrid__item"><Tok name={t} /><Values name={t} /></li>
    )} />
  )
}

// ------------------------------------------------------------------------------ space and size --

/** One token as a row: its name and copy mark, its value, its picture, and what it is for. */
function Row({ name, picture, use }: { name: string; picture?: ReactNode; use?: string }) {
  return (
    <li className="fd-row">
      <span className="fd-row__name"><Tok name={name} /></span>
      <span className="fd-row__value"><Values name={name} /></span>
      <span className="fd-row__picture" aria-hidden="true">{picture}</span>
      <span className="fd-row__use">{use}</span>
    </li>
  )
}

const Bar = ({ length }: { length: string }) => <span className="fd-bar" style={{ width: length } as CSSProperties} />

function SpaceBars({ md }: { md: string }) {
  const tokens = GROUP.sizing.filter((n) => n.startsWith('--vela-space-'))
  return (
    <ul className="fd-rows">
      {tokens.map((t) => (
        <FragmentRow key={t} t={t} md={md} />
      ))}
    </ul>
  )
}
function FragmentRow({ t, md }: { t: string; md: string }) {
  return (
    <>
      <Row name={t} picture={<Bar length={`var(${t})`} />} use={useOf(md, t)} />
      {t === SKIPPED_SPACE.after && (
        <li className="fd-row fd-row--skipped">
          <span className="fd-row__name"><code className="fd-tok__name">{SKIPPED_SPACE.name}</code></span>
          <span className="fd-row__value">no token</span>
          <span className="fd-row__picture" aria-hidden="true"><span className="fd-bar fd-bar--none" /></span>
          <span className="fd-row__use">The scale skips 50 on purpose. If a layout seems to need it, check the control height first.</span>
        </li>
      )}
    </>
  )
}

function Heights({ md }: { md: string }) {
  const tokens = GROUP.sizing.filter((n) => n.startsWith('--vela-control-height-'))
  return (
    <div className="fd-groups">
      <ul className="fd-rows">
        {tokens.map((t) => <Row key={t} name={t} picture={<span className="fd-box" style={{ height: `var(${t})` } as CSSProperties} />} use={useOf(md, t)} />)}
      </ul>
      {/* The spec's one surprise, shown with the real parts: a regular Button and a regular Input on one row. */}
      <figure className="fd-figure">
        <div className="fd-pairup" inert aria-hidden="true">
          <span className="fd-pairup__item"><Button variant="primary">Save Changes</Button><span className="fd-values">Button regular · 35px</span></span>
          <span className="fd-pairup__item"><Input label="Tenant name" defaultValue="acme-prod" /><span className="fd-values">Input regular · 26px</span></span>
        </div>
        <figcaption className="fd-note">A regular Button and a regular Input, side by side, at their real heights.</figcaption>
      </figure>
    </div>
  )
}

function Target({ md }: { md: string }) {
  return (
    <div className="fd-groups">
      <ul className="fd-rows">
        <Row name="--vela-target-min" picture={<span className="fd-target"><IconButton label="Close" icon="x" size="tiny" onClick={() => {}} /></span>} use={useOf(md, '--vela-target-min')} />
      </ul>
    </div>
  )
}

function IconSizes({ md }: { md: string }) {
  const boxes = GROUP.sizing.filter((n) => /^--vela-icon-\d+$/.test(n))
  const glyphs: [string, 'small' | 'regular' | 'large'][] = [['--vela-icon-size-small', 'small'], ['--vela-icon-size', 'regular'], ['--vela-icon-size-large', 'large']]
  return (
    <ul className="fd-rows">
      {boxes.map((t) => <Row key={t} name={t} picture={<span className="fd-square" style={{ width: `var(${t})`, height: `var(${t})` } as CSSProperties} />} use={useOf(md, t)} />)}
      {glyphs.map(([t, size]) => <Row key={t} name={t} picture={<Icon name="shield-check" size={size} />} use={useOf(md, t)} />)}
      <Row name="--vela-icon-stroke" use={useOf(md, '--vela-icon-stroke')} />
    </ul>
  )
}

function Radii({ md }: { md: string }) {
  const tokens = GROUP.sizing.filter((n) => n.startsWith('--vela-radius-'))
  return (
    <ul className="fd-radii">
      {tokens.map((t) => (
        <li key={t} className="fd-radius">
          <span className="fd-radius__tile" style={{ borderRadius: `var(${t})` } as CSSProperties} aria-hidden="true" />
          <Tok name={t} />
          <Values name={t} />
          <span className="fd-radius__use">{useOf(md, t)}</span>
        </li>
      ))}
    </ul>
  )
}

function TokenRows({ tokens }: { tokens: string[] }) {
  return <SixThenMore items={tokens} className="fd-rows" render={(t) => <Row key={t} name={t} use={useLine(t)} />} />
}

// ------------------------------------------------------------------------------------- motion --

/** A dot that crosses its track when Play is pressed, over a duration and a curve, by transform only. */
function Runner({ name, duration, ease }: { name: string; duration: string; ease: string }) {
  const [at, setAt] = useState<'start' | 'reset' | 'end'>('start')
  const play = () => {
    // From the end, it goes back to the start at once, then crosses again: a replay, not a return trip.
    setAt('reset')
    requestAnimationFrame(() => requestAnimationFrame(() => setAt('end')))
  }
  return (
    <span className="fd-runner">
      <span className={cn('fd-run', at === 'end' && 'is-end', at === 'reset' && 'is-reset')} style={{ '--fd-dur': `var(${duration})`, '--fd-ease': `var(${ease})` } as CSSProperties} aria-hidden="true">
        <span className="fd-run__mover"><span className="fd-run__dot" /></span>
      </span>
      <Button size="tiny" appearance="hollow" variant="primary" aria-label={`Play ${name}`} onClick={play}>Play</Button>
    </span>
  )
}

const W = 96, H = 48, P = 4
function Curve({ f }: { f: (x: number) => number }) {
  const pts = Array.from({ length: 61 }, (_, i) => i / 60).map((x) => `${(P + x * (W - 2 * P)).toFixed(1)},${(H - P - f(x) * (H - 2 * P) * 0.85).toFixed(1)}`)
  return (
    <svg className="fd-curve" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <line className="fd-curve__rule" x1={P} x2={W - P} y1={H - P} y2={H - P} />
      <line className="fd-curve__rule" x1={P} x2={W - P} y1={H - P - (H - 2 * P) * 0.85} y2={H - P - (H - 2 * P) * 0.85} />
      <path className="fd-curve__line" d={`M${pts.join(' L')}`} />
    </svg>
  )
}

function bezierFn([x1, y1, x2, y2]: number[]) {
  const B = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3
  return (x: number) => {
    let lo = 0, hi = 1
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (B(x1, x2, mid) < x) lo = mid; else hi = mid }
    return B(y1, y2, (lo + hi) / 2)
  }
}

function MotionTokens() {
  const curveOf = (t: string) => {
    const s = springOf(t)
    if (s) {
      const ms = parseFloat(resolve(`--vela-${s.duration.slice(1, -1).split('.').pop()}`, 'light'))
      return (x: number) => springAt(s, (x * ms) / 1000)
    }
    return bezierFn(bezierNumbers(resolve(t, 'light')))
  }
  const springWords = (t: string) => { const s = springOf(t); return s ? `spring · stiffness ${s.stiffness}, damping ${s.damping}, mass ${s.mass}` : undefined }
  return (
    <div className="fd-groups">
      <section className="fd-group" aria-labelledby="fd-durations">
        <h3 id="fd-durations" className="fd-h3">Durations</h3>
        <p className="fd-key">Each plays on ease-standard. Under reduced motion the dot arrives at once.</p>
        <ul className="fd-rows">
          {MOTION.durations().map((t) => (
            <li key={t} className="fd-row fd-row--play">
              <span className="fd-row__name"><Tok name={t} /></span>
              <span className="fd-row__value"><Values name={t} /></span>
              <Runner name={t} duration={t} ease="--vela-ease-standard" />
              <span className="fd-row__use">{useLine(t)}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="fd-group" aria-labelledby="fd-curves">
        <h3 id="fd-curves" className="fd-h3">Curves</h3>
        <p className="fd-key">Each plays over duration-travel.</p>
        <ul className="fd-rows">
          {MOTION.curves().map((t) => (
            <li key={t} className="fd-row fd-row--play">
              <span className="fd-row__name"><Tok name={t} /></span>
              <span className="fd-row__value"><span className="fd-values">{springWords(t) ?? resolve(t, 'light')}</span></span>
              <span className="fd-curveplay"><Curve f={curveOf(t)} /><Runner name={t} duration="--vela-duration-travel" ease={t} /></span>
              <span className="fd-row__use">{useLine(t)}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="fd-group" aria-labelledby="fd-waits">
        <h3 id="fd-waits" className="fd-h3">Waits</h3>
        <p className="fd-key">Not motion: how long something waits. Reduced motion never shortens them.</p>
        <ul className="fd-rows">{MOTION.waits().map((t) => <Row key={t} name={t} use={useLine(t)} />)}</ul>
      </section>
      <section className="fd-group" aria-labelledby="fd-brand">
        <h3 id="fd-brand" className="fd-h3">The site's own</h3>
        <ul className="fd-rows">{[...MOTION.brand(), ...MOTION.other()].map((t) => <Row key={t} name={t} use={useLine(t)} />)}</ul>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------------- the page --

/** A section: a short lead before its picture, the picture, then the spec's words. */
interface Part { id: string; heading: string; before?: string; picture?: ReactNode; prose?: string; deep?: boolean }

/** What each foundation shows: its pictures first, then the rest of its spec in its own order. */
function partsOf(id: string, md: string): { lede: string; parts: Part[] } {
  const { intro, sections } = splitSpec(md)
  const sec = (sid: string) => sections.find((s) => s.id === sid)
  const rest = (taken: string[]) => sections.filter((s) => !taken.includes(s.id)).map((s: MdSection): Part => ({ id: s.id, heading: s.heading, prose: s.body }))
  const lede = firstParagraph(intro)
  const afterLede = intro.split(/\n\n/).slice(1).join('\n\n')
  switch (id) {
    case 'color': {
      const tax = sec('three-separate-status-taxonomies-keep-them-apart')
      // The Status note is the spec's own: from "`medium` is a token" to the end of its paragraph.
      const statusPara = tax?.body.split(/\n\n/).find((p) => /Degraded/.test(p)) ?? ''
      const statusNote = statusPara.slice(Math.max(0, statusPara.indexOf('`medium` is')))
      const primitivesLine = intro.match(/Primitives exist[^.]*\./)?.[0] ?? ''
      return {
        lede: lede.replace(/\s*Primitives exist[^.]*\./, '').replace(/\*\*/g, ''),
        parts: [
          { id: 'semantic', heading: 'Semantic colours', before: afterLede, picture: <Semantic /> },
          { id: 'taxonomies', heading: 'Severity, status and risk', before: tax ? firstParagraph(tax.body) : '', picture: <Taxonomies statusNote={statusNote} /> },
          { id: 'primitives', heading: 'Primitives', picture: <Primitives line={`Reference only, never bound. ${primitivesLine}`} /> },
          ...rest(['three-separate-status-taxonomies-keep-them-apart', 'primitives-reference-only']),
        ],
      }
    }
    case 'typography': {
      const scale = sec('the-scale')
      return {
        lede: '',
        parts: [
          { id: 'families', heading: 'Three families', before: intro, picture: <Families /> },
          { id: 'the-scale', heading: 'The scale', picture: <Scale md={scale?.body ?? ''} />, prose: withoutTables(scale?.body ?? '') },
          ...rest(['the-scale']),
          { id: 'tokens', heading: 'Every typography token', picture: <TokenGrid tokens={GROUP.typography} /> },
        ],
      }
    }
    case 'spacing':
      return { lede: withoutTables(intro), parts: [{ id: 'the-scale', heading: 'The scale', picture: <SpaceBars md={intro} /> }, ...rest([])] }
    case 'sizing': {
      const h = sec('control-heights'), t = sec('the-smallest-target'), i = sec('icon-sizes')
      return {
        lede: '',
        parts: [
          { id: 'control-heights', heading: h?.heading ?? 'Control heights', picture: <Heights md={h?.body ?? ''} />, prose: withoutTables(h?.body ?? '') },
          { id: 'the-smallest-target', heading: t?.heading ?? 'The smallest target', picture: <Target md={t?.body ?? ''} />, prose: withoutTables(t?.body ?? '') },
          { id: 'icon-sizes', heading: i?.heading ?? 'Icon sizes', picture: <IconSizes md={i?.body ?? ''} />, prose: withoutTables(i?.body ?? '') },
          { id: 'other-sizes', heading: 'Other sizes', picture: <TokenRows tokens={otherSizes()} /> },
          ...rest(['control-heights', 'the-smallest-target', 'icon-sizes']),
        ],
      }
    }
    case 'radius':
      return { lede: withoutTables(intro), parts: [{ id: 'the-scale', heading: 'The scale', picture: <Radii md={intro} /> }, ...rest([])] }
    case 'motion': {
      const tokens = sec('tokens')
      return {
        lede,
        parts: [
          { id: 'tokens', heading: 'Tokens', picture: <MotionTokens /> },
          { id: 'why-these-values', heading: 'Why these values', prose: withoutTables(tokens?.body ?? ''), deep: true },
          ...rest(['tokens']),
        ],
      }
    }
    default:
      return { lede, parts: [...(afterLede ? [{ id: 'intro', heading: 'Overview', prose: afterLede }] : []), ...rest([])] }
  }
}

function Prose({ source }: { source: string }) {
  return source.trim() ? <div className="doc__body fd-prose"><Markdown source={source} top="h2" doc={{ base: GH }} /></div> : null
}

function Deep({ part }: { part: Part }) {
  // A deep dive stays folded until asked for (Omkar's review rule 3).
  const [open, setOpen] = useState(false)
  return (
    <Fold id={part.id} heading={part.heading} open={open} onOpenChange={setOpen} className="fd-section">
      <Prose source={part.prose ?? ''} />
    </Fold>
  )
}

function FoundationPage({ f }: { f: (typeof FOUNDATIONS)[number] }) {
  const { lede, parts } = useMemo(() => partsOf(f.id, f.md), [f.id, f.md])
  const form = useIndexForm()
  useArrival()
  const items = parts.map((p) => ({ id: p.id, label: p.heading }))
  const rail = items.length >= INDEX_MIN
  const at = FOUNDATIONS.findIndex((x) => x.id === f.id)
  const next = FOUNDATIONS[at + 1]
  let first = true
  return (
    <Announcer>
      <article className="doc fd">
        <header className="page-head">
          <p className="vela-meta page-head__eyebrow">{f.kind}</p>
          <h1 className="vela-h2">{f.title}</h1>
          {lede && <div className="fd-lede"><Markdown source={lede} top="h2" doc={{ base: GH }} /></div>}
        </header>
        <div className={cn(rail && 'shell-railpage', rail && form === 'strip' && 'is-narrow')}>
          {rail && (
            <div className="shell-railpage__rail">
              <SectionIndex items={items} form={form} label="On this page" />
            </div>
          )}
          <div className={cn('fd-main', rail && 'shell-railpage__main')}>
            {parts.map((p) => {
              if (p.deep) return <Deep key={p.id} part={p} />
              const lead = p.picture && first
              if (p.picture) first = false
              return (
                <section key={p.id} className="fd-section" aria-labelledby={`section-${p.id}`} data-arrive={lead ? '1' : undefined}>
                  <h2 id={`section-${p.id}`} className="vela-h3 fd-h2" tabIndex={-1}>{p.heading}</h2>
                  {p.before && <Prose source={p.before} />}
                  {p.picture}
                  {p.prose && <Prose source={p.prose} />}
                </section>
              )
            })}
            <NextCard
              eyebrow={next ? 'Next foundation' : 'Back to the start'}
              href={next ? href({ kind: 'foundation', id: next.id }) : '#/'}
              title={next ? next.title : 'Overview'}
              line={next ? (next.kind === 'Contract' ? 'A contract, read as a document' : undefined) : undefined}
            />
          </div>
        </div>
      </article>
    </Announcer>
  )
}

export function Foundation({ id }: { id: string }) {
  const f = FOUNDATIONS.find((x) => x.id === id)
  if (!f) return <p className="vela-body">No foundation called “{id}”.</p>
  if (f.kind === 'Contract') {
    const body = f.md.replace(/^# .+\n/, '')
    return (
      <article className="doc">
        <header className="page-head">
          <p className="vela-meta page-head__eyebrow">{f.kind}</p>
          <h1 className="vela-h2">{f.title}</h1>
        </header>
        {/* A contract is read as a document (slice 5 of the playground uplift): links are links and no dash
            or markdown mark reaches the page. */}
        <div className="doc__body"><Markdown source={body} top="h2" doc={{ base: `${LINKS.github}/blob/main/guidelines/contracts` }} /></div>
      </article>
    )
  }
  return <FoundationPage key={f.id} f={f} />
}
