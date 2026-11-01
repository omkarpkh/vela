import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cn, Icon } from '../../src'
import pkg from '../../package.json'
import checks from '../checks.json'
import tokens from '../../tokens/vela.tokens.json'
import dark from '../../tokens/vela.dark.tokens.json'
import { LINKS, figmaUrl } from '../links'
import { href } from '../router'
import { ScrollRegion } from '../shell/ScrollRegion'
import { SectionIndex, useIndexForm, type SectionLink } from '../shell/SectionIndex'
import { Fold } from '../shell/Fold'
import { NextCard } from '../shell/Card'
import { PAIRS } from 'virtual:vela-site-facts'
import './docs.css'

// How it is made (slice 5 of the playground uplift): the claim the whole repository makes, told as
// four ideas, one per screen, in the order they happen. A change is written once; it becomes five
// outputs; each output is checked; only then does it ship. Every number is read from the build: the
// check counts from demo/checks.json (written by scripts/count-checks.mjs and diffed in `verify`), the
// contrast pairs from scripts/contrast-core.mjs, the token count and the example token from the token
// file itself. So this page cannot quietly go stale.
//
// The entrance (Omkar's comment on this page, 1 Nov 2026): each idea lands as the reader reaches it,
// part by part along its own arrows, each part on Vela's motion tokens (180 to 300ms), opacity and
// transform only, nothing loops or bounces. With reduced motion, or when the address asks for a
// section, everything is simply there, with the same meaning. The timing is in docs.css.
const GH = `${LINKS.github}/blob/main`
const CDN = `https://cdn.jsdelivr.net/npm/@omkarux/vela@${pkg.version}`

/** Every token in the file: each entry that carries a `$value`. */
function countTokens(node: unknown): number {
  if (!node || typeof node !== 'object') return 0
  if ('$value' in node) return 1
  return Object.entries(node).filter(([k]) => !k.startsWith('$')).reduce((n, [, v]) => n + countTokens(v), 0)
}
const TOKEN_COUNT = countTokens(tokens)

// The example: the link colour, as the file writes it, light and dark.
const EXAMPLE = 'text-link'
const lightValue = (tokens.color as Record<string, { $value?: string }>)[EXAMPLE]?.$value ?? ''
const darkValue = (dark.color as Record<string, { $value?: string }>)[EXAMPLE]?.$value ?? ''

type Output = { id: string; name: string; for: string; check: string; detail: { what: string; by: string; links: { label: string; href: string }[] } }

const OUTPUTS: Output[] = [
  {
    id: 'css', name: 'Stylesheet', for: 'the web products',
    check: 'Made again from the file on every change and compared with the copy kept in the repository, so a hand edit fails.',
    detail: {
      what: 'Light and dark themes as CSS custom properties. Any web technology reads them; a product built on a kit is themed by feeding them to the kit.',
      by: 'scripts/build-tokens.mjs',
      links: [{ label: 'dist/tokens.css', href: `${CDN}/dist/tokens.css` }, { label: 'source', href: `${GH}/scripts/build-tokens.mjs` }],
    },
  },
  {
    id: 'figma', name: 'Figma library', for: 'designers',
    check: 'Its builders are checked on every change. The library itself is read back and compared after each sync, from inside Figma, which gives no outside access to its variables.',
    detail: {
      what: 'Every token as a Figma variable, in collections with light and dark modes, the text styles bound to them, and the component sets. Built by scripts run inside the file, then read back and compared with the token file and the builders.',
      by: 'scripts/sync-figma.mjs · scripts/figma/text-styles.mjs · scripts/figma/build-components.mjs',
      links: [{ label: 'open the library', href: figmaUrl() }, { label: 'drift check', href: `${GH}/scripts/figma-drift.mjs` }, { label: 'component check', href: `${GH}/scripts/figma/check-components.mjs` }],
    },
  },
  {
    id: 'flutter', name: 'Flutter theme', for: 'the Flutter app',
    check: `${checks.flutter} Flutter tests, and Flutter's own check of the code it was given.`,
    detail: {
      what: 'The primitives, a VelaColors theme extension with light and dark, the sizing scale, the type ramp and velaThemeData(Brightness). Widgets are not generated; they are built against the specs.',
      by: 'scripts/build-tokens-dart.mjs',
      links: [{ label: 'flutter/lib/vela_tokens.dart', href: `${CDN}/flutter/lib/vela_tokens.dart` }, { label: 'tests', href: `${GH}/flutter/test/vela_tokens_test.dart` }],
    },
  },
  {
    id: 'mui', name: 'Material UI theme', for: 'products already on Material UI',
    check: 'Every colour and size is traced back to the value it came from, and it is made again to prove nobody edited it.',
    detail: {
      what: 'Palette, typography, shape and transitions for createTheme, so a product already built on Material UI takes the family look with no component touched.',
      by: 'scripts/build-tokens-mui.mjs',
      links: [{ label: 'bridges/vela.mui-theme.json', href: `${CDN}/bridges/vela.mui-theme.json` }, { label: 'see it applied', href: '#/adopt' }],
    },
  },
  {
    id: 'docs', name: 'Documentation', for: 'this site, and AI coding tools',
    check: 'Every spec on this site is read, and may name only tokens that exist.',
    detail: {
      what: 'The component pages on this site, their controls, token tables and rules, are generated from the specs in guidelines/. The same specs ship as docs for AI coding tools.',
      by: 'demo/playground/spec.ts · guidelines/llms.txt',
      links: [{ label: 'guidelines/', href: `${GH}/guidelines` }, { label: 'llms.txt', href: `${CDN}/guidelines/llms.txt` }],
    },
  },
]

const SECTIONS: SectionLink[] = [
  { id: 'written', label: '1 Written once' },
  { id: 'outputs', label: '2 Five outputs' },
  { id: 'checked', label: '3 Each one checked' },
  { id: 'shipped', label: '4 Then it ships' },
  { id: 'details', label: 'In detail' },
]

/**
 * Each idea lands as the reader reaches it, once. Before paint, every step that is still to come is
 * set to wait; a step plays when its top passes four fifths of the window. Off under reduced motion,
 * without IntersectionObserver, and when the address asks for a section.
 */
function useLanding() {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const root = ref.current
    if (!root || typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (/[?&]section=/.test(window.location.hash)) return
    const steps = Array.from(root.querySelectorAll<HTMLElement>('[data-how-step]'))
    for (const s of steps) s.setAttribute('data-how', 'wait')
    const io = new IntersectionObserver((seen) => {
      for (const e of seen) if (e.isIntersecting) { e.target.setAttribute('data-how', 'play'); io.unobserve(e.target) }
    }, { rootMargin: '0px 0px -20% 0px' })
    for (const s of steps) io.observe(s)
    return () => { io.disconnect(); for (const s of steps) s.removeAttribute('data-how') }
  }, [])
  return ref
}

/** A step's order on its own timeline, read by docs.css: `--n`. */
const at = (n: number) => ({ '--n': n }) as CSSProperties

function Step({ id, n, title, line, children }: { id: string; n: number; title: string; line: ReactNode; children: ReactNode }) {
  return (
    <section className="how-step" aria-labelledby={`section-${id}`} data-how-step>
      <header className="how-step__head">
        <span className="how-step__n" aria-hidden="true">{n}</span>
        <div>
          <h2 id={`section-${id}`} className="vela-h3">{title}</h2>
          <p className="vela-body how-step__line">{line}</p>
        </div>
      </header>
      {children}
    </section>
  )
}

/** 1 · The file, and one token as it is written there, light and dark. */
function Written() {
  return (
    <Step id="written" n={1} title="A change is written once" line={<>Every colour, size, font and movement is a value in one plain data file. A person edits that file and nothing else.</>}>
      <figure className="how-file">
        <div className="how-file__card how-land" style={at(0)}>
          <p className="how-file__name">The token file <span>{TOKEN_COUNT} values, light and dark</span></p>
          <pre className="how-file__code"><code>{`"${EXAMPLE}": {\n  "$type": "color",\n  "$value": "${lightValue}"\n}`}</code></pre>
          <pre className="how-file__code how-file__code--dark"><code>{`dark: "${darkValue}"`}</code></pre>
        </div>
        <ul className="how-file__looks" aria-label="How it looks">
          {(['light', 'dark'] as const).map((t, i) => (
            <li key={t} className="how-file__look how-land" style={at(i + 1)} data-theme={t}>
              <span className="how-file__swatch" aria-hidden="true" />
              <span><span className="how-file__link">A link</span> in the {t} theme</span>
            </li>
          ))}
        </ul>
        <figcaption className="vela-meta">One value, the colour of a link, as the file writes it. The two themes each point it at a different shade.</figcaption>
      </figure>
    </Step>
  )
}

/** 2 · The tree: the file, a trunk, a spine, and a branch into each output. It draws along its arrows. */
function Outputs() {
  // From the middle out, upper first: the spine grows from the trunk both ways, so the middle output
  // is reached first, then the next pair, one half fast step apart.
  const order = [3, 1, 0, 2, 4]
  return (
    <Step id="outputs" n={2} title="It becomes five outputs" line={<>A generator per technology reads the file and makes each output from it. Nobody copies a value across by hand.</>}>
      <figure className="how-tree" aria-label="The token file makes five outputs">
        <div className="how-tree__source how-land" style={at(0)}>
          <strong>The token file</strong>
          <span>{TOKEN_COUNT} values</span>
        </div>
        <span className="how-tree__trunk how-draw" aria-hidden="true" />
        <ol className="how-tree__outputs">
          {OUTPUTS.map((o, i) => (
            <li key={o.id} className="how-tree__out" style={at(order[i])}>
              <span className="how-tree__branch how-draw" aria-hidden="true" />
              <span className="how-tree__card how-land">
                <strong>{o.name}</strong>
                <span>{o.for}</span>
              </span>
            </li>
          ))}
        </ol>
      </figure>
    </Step>
  )
}

/** 3 · The checks: the total, what kinds, and what each output is checked by. */
function Checked() {
  const b = checks.browser
  return (
    <Step id="checked" n={3} title="Each output is checked" line={<>On every change, every check runs. A count that went stale would fail too: these numbers are written by the test runs themselves.</>}>
      <div className="how-checks">
        <p className="how-checks__total how-land" style={at(0)}>
          <span className="how-checks__number">{checks.total}</span>
          <span>automated checks on every change</span>
        </p>
        <ul className="how-checks__kinds how-land" style={at(1)}>
          <li><b>{checks.unit}</b> unit tests: closed prop sets, token bindings and accessibility, and {PAIRS} colour pairs held to contrast in both themes</li>
          <li><b>{b.total}</b> tests in a real browser: {b.visual} screenshots against approved pictures, {b.e2e} journeys through this site</li>
          <li><b>{checks.flutter}</b> Flutter tests</li>
        </ul>
        <ul className="how-checks__outputs" aria-label="What each output is checked by">
          {OUTPUTS.map((o, i) => (
            <li key={o.id} className="how-checks__output how-land" style={at(i + 2)}>
              <Icon name="circle-check" className="how-checks__tick" />
              <span><strong>{o.name}</strong> {o.check}</span>
            </li>
          ))}
        </ul>
      </div>
    </Step>
  )
}

/** 4 · The gate: proposed, checked, shipped. Nothing ships until every check passes. */
function Shipped() {
  const nodes = [
    { title: 'Proposed', line: 'A change is opened for review.' },
    { title: 'Checked', line: `All ${checks.total} checks pass.` },
    { title: 'Shipped', line: 'The package goes to npm, signed with where it was built, and this site is rebuilt.' },
  ]
  return (
    <Step id="shipped" n={4} title="Only then does it ship" line={<>A failing check stops the release. Nothing reaches npm or this site until every check has passed.</>}>
      <ol className="how-gate">
        {nodes.map((s, i) => (
          <li key={s.title} className="how-gate__node">
            {i > 0 && <span className="how-gate__wire how-draw" style={at(2 * i - 1)} aria-hidden="true" />}
            <span className="how-gate__card how-land" style={at(2 * i)}>
              <strong>{s.title}</strong>
              <span>{s.line}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="vela-meta how-gate__links">
        The release on <a href={LINKS.npm}>npm</a> · recent runs on <a href={`${LINKS.github}/actions`}>GitHub</a> · counted at {pkg.version}
      </p>
    </Step>
  )
}

/** The deep dive: where each output comes from, folded, as before. */
function Details() {
  const [open, setOpen] = useState(false)
  return (
    <Fold id="details" heading="Where each comes from" count={OUTPUTS.length + 1} open={open} onOpenChange={setOpen}>
      <ScrollRegion label="Where each output comes from, scrollable" className="how-scroll">
        <table className="how-table" aria-label="Generated targets">
          <thead><tr><th scope="col">Output</th><th scope="col">What it is</th><th scope="col">Made by</th><th scope="col">See it</th></tr></thead>
          <tbody>
            <tr>
              <th scope="row">Token file</th>
              <td>The only place a value is written. W3C Design Tokens format, one file, light and dark.</td>
              <td>written by people</td>
              <td><a href={`${GH}/tokens/vela.tokens.json`}>tokens/vela.tokens.json</a> · <a href={`${CDN}/tokens/vela.tokens.json`}>as shipped</a></td>
            </tr>
            {OUTPUTS.map((o) => (
              <tr key={o.id}>
                <th scope="row">{o.name}</th>
                <td>{o.detail.what}</td>
                <td><code>{o.detail.by}</code></td>
                <td>{o.detail.links.map((l, i) => <span key={l.href}>{i > 0 && ' · '}<a href={l.href}>{l.label}</a></span>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollRegion>
    </Fold>
  )
}

export function How() {
  const form = useIndexForm()
  const ref = useLanding()
  return (
    <article className="doc how">
      <header className="page-head">
        <p className="vela-meta page-head__eyebrow">Start</p>
        <h1 className="vela-h2">How it is made</h1>
        <p className="vela-body how__lede">One file, five outputs, every one checked before it ships.</p>
      </header>
      <div className={cn('shell-railpage how__page', form === 'strip' && 'is-narrow')}>
        <div className="shell-railpage__rail">
          <SectionIndex items={SECTIONS} form={form} label="On this page" />
        </div>
        <div ref={ref} className="shell-railpage__main how__steps">
          <Written />
          <Outputs />
          <Checked />
          <Shipped />
          <Details />
          <NextCard eyebrow="See it applied" href={href({ kind: 'adopt' })} title="Adopt without rewrite" line="The Material UI theme on a product already built with Material UI, before and after." />
        </div>
      </div>
    </article>
  )
}
