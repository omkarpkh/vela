import pkg from '../../package.json'
import checks from '../checks.json'
import { LINKS, figmaUrl } from '../links'

// The claim the whole repository makes, on one page: one token file, five generated targets,
// and a count of the checks that keep them honest. The count comes from the test runners
// (scripts/count-checks.mjs) and is diffed in `verify`, so this page cannot quietly go stale.
const GH = `${LINKS.github}/blob/main`
const CDN = `https://cdn.jsdelivr.net/npm/@omkarux/vela@${pkg.version}`

type Target = { name: string; what: string; by: string; links: { label: string; href: string }[] }

const SOURCE: Target = {
  name: 'Token file',
  what: 'The only place a value is written. W3C Design Tokens format, one file, light and dark.',
  by: 'written by people',
  links: [
    { label: 'tokens/vela.tokens.json', href: `${GH}/tokens/vela.tokens.json` },
    { label: 'as shipped', href: `${CDN}/tokens/vela.tokens.json` },
  ],
}

const TARGETS: Target[] = [
  {
    name: 'Stylesheet',
    what: 'Light and dark themes as CSS custom properties. Any web technology reads them; a product built on a kit is themed by feeding them to the kit.',
    by: 'scripts/build-tokens.mjs',
    links: [{ label: 'dist/tokens.css', href: `${CDN}/dist/tokens.css` }, { label: 'source', href: `${GH}/scripts/build-tokens.mjs` }],
  },
  {
    name: 'Figma library',
    what: 'Every token as a Figma variable, in collections with light and dark modes, plus the six component sets. Built by scripts run inside the file, then read back and compared with the token file.',
    by: 'scripts/sync-figma.mjs · scripts/figma/build-components.mjs',
    links: [{ label: 'open the library', href: figmaUrl() }, { label: 'drift check', href: `${GH}/scripts/figma-drift.mjs` }],
  },
  {
    name: 'Flutter theme',
    what: 'The primitives, a VelaColors theme extension with light and dark, the sizing scale, the type ramp and velaThemeData(Brightness). Widgets are not generated; they are built against the specs.',
    by: 'scripts/build-tokens-dart.mjs',
    links: [{ label: 'flutter/lib/vela_tokens.dart', href: `${CDN}/flutter/lib/vela_tokens.dart` }, { label: 'tests', href: `${GH}/flutter/test/vela_tokens_test.dart` }],
  },
  {
    name: 'Material UI theme',
    what: 'Palette, typography, shape and transitions for createTheme, so a product already built on Material UI takes the family look with no component touched.',
    by: 'scripts/build-tokens-mui.mjs',
    links: [{ label: 'bridges/vela.mui-theme.json', href: `${CDN}/bridges/vela.mui-theme.json` }, { label: 'see it applied', href: '#/adopt' }],
  },
  {
    name: 'Documentation',
    what: 'The component pages on this site, their controls, token tables and rules, are generated from the specs in guidelines/. The same specs ship as docs for AI coding tools.',
    by: 'demo/playground/spec.ts · guidelines/llms.txt',
    links: [{ label: 'guidelines/', href: `${GH}/guidelines` }, { label: 'llms.txt', href: `${CDN}/guidelines/llms.txt` }],
  },
]

const rows: { y: number; title: string; sub: string }[] = [
  { y: 8, title: 'Stylesheet', sub: 'the web products' },
  { y: 54, title: 'Figma library', sub: 'variables, modes, component sets' },
  { y: 100, title: 'Flutter theme', sub: 'the Flutter app' },
  { y: 146, title: 'Material UI theme', sub: 'a product built on the kit' },
  { y: 192, title: 'Documentation', sub: 'this site, and AI coding tools' },
]

function Diagram() {
  return (
    <svg viewBox="0 0 660 244" role="img" aria-label="One design-token file generates the stylesheet, the Figma library, the Flutter theme, the Material UI theme and the documentation, and each is checked against the file on every change.">
      <defs>
        <marker id="how-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
        </marker>
      </defs>
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        <rect x="20" y="78" width="220" height="84" rx="4" fill="var(--vela-bg-container)" stroke="var(--vela-btn-primary-bg)" />
        {rows.map((r) => <rect key={r.title} x="400" y={r.y} width="244" height="38" rx="4" />)}
        {rows.map((r) => <path key={r.title} d={`M240,120 L400,${r.y + 19}`} markerEnd="url(#how-arrow)" />)}
      </g>
      <g fill="currentColor" fontSize="12">
        <text x="130" y="103" textAnchor="middle" fontWeight="600">Design-token file</text>
        <text x="130" y="121" textAnchor="middle" fontSize="10.5" opacity=".75">colours · fonts · spacing · sizing</text>
        <text x="130" y="135" textAnchor="middle" fontSize="10.5" opacity=".75">radius · motion · light and dark</text>
        <text x="130" y="152" textAnchor="middle" fontSize="10.5" opacity=".75">one plain data file, the master copy</text>
        <text x="130" y="184" textAnchor="middle" fontSize="10.5" opacity=".75">every output is checked against it</text>
        <text x="130" y="198" textAnchor="middle" fontSize="10.5" opacity=".75">on every change</text>
        {rows.map((r) => (
          <g key={r.title}>
            <text x="412" y={r.y + 15}>{r.title}</text>
            <text x="412" y={r.y + 30} fontSize="10.5" opacity=".75">{r.sub}</text>
          </g>
        ))}
        <text x="318" y="124" textAnchor="middle" fontSize="10.5" opacity=".85" stroke="var(--vela-bg-global)" strokeWidth="4" paintOrder="stroke">generated automatically</text>
      </g>
    </svg>
  )
}

function Row({ t }: { t: Target }) {
  return (
    <tr>
      <th scope="row">{t.name}</th>
      <td>{t.what}</td>
      <td><code>{t.by}</code></td>
      <td>{t.links.map((l, i) => <span key={l.href}>{i > 0 && ' · '}<a href={l.href}>{l.label}</a></span>)}</td>
    </tr>
  )
}

export function How() {
  const b = checks.browser
  return (
    <>
      <header className="page-head">
        <p className="vela-meta page-head__eyebrow">Start</p>
        <h1 className="vela-h2">One file, five targets</h1>
        <p className="vela-meta">Every value is written once, in the token file. The stylesheet, the Figma library, the Flutter theme, the Material UI theme and the documentation are generated from it, and checked against it, so they cannot drift apart.</p>
      </header>

      <figure className="how-figure">
        <Diagram />
        <figcaption className="vela-meta">The pipeline behind this site and the package. The same shape works for any product estate: one file, and a generator per technology already in use.</figcaption>
      </figure>

      <section className="demo-section">
        <h2 className="vela-h3">The targets</h2>
        <div className="how-scroll">
          <table className="how-table" aria-label="Generated targets">
            <thead><tr><th scope="col">Target</th><th scope="col">What it is</th><th scope="col">Generated by</th><th scope="col">See it</th></tr></thead>
            <tbody>
              <Row t={SOURCE} />
              {TARGETS.map((t) => <Row key={t.name} t={t} />)}
            </tbody>
          </table>
        </div>
      </section>

      <section className="demo-section">
        <h2 className="vela-h3">{checks.total} automated checks on every change</h2>
        <ul className="how-list vela-body">
          <li><b>{checks.unit}</b> unit and contract tests, Vitest: every component's closed prop sets, token bindings and accessibility; every spec on this site parses and names only tokens that exist; 76 contrast pairs hold in both themes.</li>
          <li><b>{b.total}</b> browser tests, Playwright: {b.visual} visual regression screenshots against approved baselines, {b.e2e} end-to-end journeys through this site, {b.docs} documentation screenshots.</li>
          <li><b>{checks.flutter}</b> Flutter tests plus <code>flutter analyze</code> on the generated Dart.</li>
          <li>The generated stylesheet, Dart and Material UI theme are regenerated in CI and diffed against the token file; a hand edit fails the build. The Figma variables are read back and compared on every sync, from inside the file, because the plan has no API access to variables.</li>
          <li>The numbers above are written by <code>scripts/count-checks.mjs</code> from the runners' own output and diffed in <code>verify</code>, so this page cannot go stale without failing the build. Counted at {pkg.version}.</li>
        </ul>
        <p className="vela-meta">The workflow: <a href={`${GH}/.github/workflows/ci.yml`}>ci.yml</a> · recent runs: <a href={`${LINKS.github}/actions`}>GitHub Actions</a> · the release on <a href={LINKS.npm}>npm</a>, published with provenance.</p>
      </section>
    </>
  )
}
