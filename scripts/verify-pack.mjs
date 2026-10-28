/**
 * Publish gate.
 *
 * Builds the real tarball, installs it into a throwaway app, and proves five
 * things that a green `npm run build` does NOT prove:
 *   1. the exports map resolves (`import { Button } from '@omkarux/vela'`, and
 *      `import { Tabs } from '@omkarux/vela/headless'` once the optional peer is installed)
 *   2. the shipped .d.ts typechecks under `strict`
 *   3. the closed prop sets are enforced by the COMPILER, not by review — on both entry points
 *   4. no source or test files leaked into the tarball
 *   5. the core entry point imports no peer but React: "zero runtime dependencies" is asserted
 *      against the built module graph, not promised in prose
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const run = (cmd, args, cwd, opts = {}) =>
  execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: 'pipe', ...opts })

const log = (ok, msg) => console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${msg}`)
let failures = 0
const check = (cond, msg) => { if (!cond) failures++; log(cond, msg) }

console.log('\n  PACK & CONSUME\n  ' + '-'.repeat(58))

// 1. real tarball -----------------------------------------------------------
// `npm pack --json` is not as stable as it looks: it returns an array normally,
// but the shape differs when npm invokes it from inside a lifecycle script, and
// warnings can precede the JSON. Parse defensively and fail with the actual
// output rather than a TypeError three lines later.
function parsePack(raw) {
  const start = raw.search(/[[{]/)
  if (start === -1) throw new Error('npm pack --json produced no JSON:\n' + raw.slice(0, 400))
  const parsed = JSON.parse(raw.slice(start))
  const entry = Array.isArray(parsed) ? parsed[0] : parsed
  if (!entry || !entry.filename || !Array.isArray(entry.files)) {
    throw new Error('npm pack --json returned an unexpected shape: ' + JSON.stringify(parsed).slice(0, 300))
  }
  return entry
}

const packed = parsePack(run('npm', ['pack', '--json', '--pack-destination', root], root))
const tarball = join(root, packed.filename)
const files = packed.files.map((f) => f.path)

check(files.includes('dist/index.js'), 'tarball contains dist/index.js')
check(files.includes('dist/index.d.ts'), 'tarball contains dist/index.d.ts')
check(files.includes('dist/headless/index.js'), 'tarball contains dist/headless/index.js')
check(files.includes('dist/headless/index.d.ts'), 'tarball contains dist/headless/index.d.ts')
check(files.includes('dist/vela.css'), 'tarball contains dist/vela.css')
check(files.includes('dist/tokens.css'), 'tarball contains dist/tokens.css')
check(files.includes('tokens/vela.tokens.json'), 'tarball contains tokens/vela.tokens.json')
check(files.includes('flutter/lib/vela_tokens.dart'), 'tarball contains flutter/lib/vela_tokens.dart')
check(files.includes('bridges/vela.mui-theme.json'), 'tarball contains bridges/vela.mui-theme.json')
check(files.some((f) => f.startsWith('guidelines/')), 'tarball contains guidelines/')
check(!files.some((f) => f.startsWith('src/')), 'no src/ leaked into the tarball')
check(!files.some((f) => f.includes('.test.')), 'no test files leaked into the tarball')
console.log(`  ....  ${files.length} files, ${(packed.size / 1024).toFixed(1)} kB packed`)

// 1b. the core entry's module graph ------------------------------------------
// `@omkarux/vela` promises zero runtime dependencies (README, llms.txt, setup.md, the npm
// description, decisions/002). The headless entry carries Base UI as an optional peer, and with
// preserveModules both entries sit in one dist/, so the promise is only as good as the imports
// reachable from dist/index.js. Walk them: every bare specifier must be React.
function importGraph(entry) {
  const seen = new Set()
  const bare = new Set()
  const walk = (file) => {
    if (seen.has(file)) return
    seen.add(file)
    const src = readFileSync(file, 'utf8')
    for (const m of src.matchAll(/^\s*(?:import|export)\b[^'"]*?from\s*['"]([^'"]+)['"]/gm)) {
      const spec = m[1]
      if (spec.startsWith('.')) walk(join(dirname(file), spec))
      else bare.add(spec)
    }
  }
  walk(entry)
  return { modules: seen, bare }
}
const CORE_PEERS_ONLY = ['react', 'react-dom', 'react/jsx-runtime']
const core = importGraph(join(root, 'dist/index.js'))
const corePeerLeak = [...core.bare].filter((s) => !CORE_PEERS_ONLY.includes(s))
check(corePeerLeak.length === 0,
  `core entry imports no peer${corePeerLeak.length ? `: found ${corePeerLeak.join(', ')}` : ` (${core.modules.size} modules, bare imports: ${[...core.bare].join(', ')})`}`)
check(![...core.modules].some((f) => f.includes(`${sep}headless${sep}`)), 'core entry reaches nothing under dist/headless/')
const headless = importGraph(join(root, 'dist/headless/index.js'))
check([...headless.bare].some((s) => s.startsWith('@base-ui/react/')),
  `headless entry imports Base UI by per-component subpath (${[...headless.bare].filter((s) => s.startsWith('@base-ui')).join(', ')})`)

// 2. throwaway consumer -----------------------------------------------------
const app = mkdtempSync(join(tmpdir(), 'vela-consumer-'))
try {
  writeFileSync(join(app, 'package.json'), JSON.stringify({
    name: 'vela-consumer', private: true, version: '1.0.0', type: 'module',
  }, null, 2))
  writeFileSync(join(app, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2022', lib: ['ES2022', 'DOM'], module: 'ESNext',
      moduleResolution: 'bundler', jsx: 'react-jsx', strict: true,
      noEmit: true, skipLibCheck: true,
    },
    include: ['*.tsx'],
  }, null, 2))

  // The optional peer is installed too, as a consumer of `/headless` would install it. The same
  // pinned version the repository develops against (package.json devDependencies), so the gate
  // proves the pairing that was actually tested rather than whatever 1.9.x npm resolves today.
  const baseUi = `@base-ui/react@${JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).devDependencies['@base-ui/react']}`
  run('npm', ['install', tarball, 'react@19', 'react-dom@19', '@types/react@19', baseUi,
    '--no-audit', '--no-fund', '--silent'], app, { stdio: 'ignore' })
  check(true, `npm install of the tarball succeeded (with ${baseUi} for the headless entry)`)

  // -- valid usage must compile --
  mkdirSync(join(app, 'src'), { recursive: true })
  writeFileSync(join(app, 'valid.tsx'), `
import { Button, Toggle, Input, ContextualAlert, StatusIndicator, RiskPill, Tabs } from '@omkarux/vela'
import type { Severity, Status, Risk, ButtonProps } from '@omkarux/vela'

export const A = () => <Button variant="primary" appearance="filled" size="huge">Save Changes</Button>
export const B = () => <Button variant="primary" appearance="text-link" size="tiny">Learn More</Button>
export const C = () => <Button variant="destructive" appearance="hollow" loading>Delete Account</Button>
export const D = () => <Toggle label="Email alerts" onChange={(v: boolean) => v} />
export const E = () => <Input label="Tenant" hint="Lowercase only" error="Taken" size="large" />
export const F = (s: Severity) => <ContextualAlert severity={s}>Body</ContextualAlert>
export const G = (s: Status) => <StatusIndicator status={s} label="Node 1" />
export const G2 = (r: Risk) => <RiskPill risk={r} label="High · 87" size="small" />
export const H = () => (
  <Tabs defaultValue="a">
    <Tabs.List aria-label="Views"><Tabs.Trigger value="a" count={3}>Alerts</Tabs.Trigger></Tabs.List>
    <Tabs.Panel value="a">Panel</Tabs.Panel>
  </Tabs>
)
// Controlled mode must compile WITHOUT defaultValue. Until the union landed, TabsProps
// required defaultValue outright, so the type forced the very state the spec forbids.
export const I = () => (
  <Tabs value="a" onValueChange={(v: string) => v}>
    <Tabs.List aria-label="Views"><Tabs.Trigger value="a">Alerts</Tabs.Trigger></Tabs.List>
    <Tabs.Panel value="a">Panel</Tabs.Panel>
  </Tabs>
)
export const J = () => <Toggle label="Email alerts" checked onChange={(v: boolean) => v} />
export const props: ButtonProps = { variant: 'standard', children: 'OK' }
`)
  const tsc = join(root, 'node_modules', '.bin', 'tsc')
  let validOk = true
  try { run(tsc, ['--noEmit', '-p', 'tsconfig.json'], app) } catch (e) {
    validOk = false
    console.log((e.stdout || '').toString().split('\n').slice(0, 8).join('\n'))
  }
  check(validOk, 'valid usage typechecks against the shipped .d.ts')

  // -- the headless entry resolves and carries the same API --
  // Same spec, same prop types: what compiles against `@omkarux/vela` compiles against
  // `@omkarux/vela/headless`, and a TabsProps from one is assignable to the other.
  writeFileSync(join(app, 'valid-headless.tsx'), `
import { Tabs } from '@omkarux/vela/headless'
import type { TabsProps as CoreTabsProps } from '@omkarux/vela'
import type { TabsProps as HeadlessTabsProps } from '@omkarux/vela/headless'

export const H = () => (
  <Tabs defaultValue="a" size="large">
    <Tabs.List aria-label="Views"><Tabs.Trigger value="a" count={3}>Alerts</Tabs.Trigger><Tabs.Trigger value="b" disabled>Audit</Tabs.Trigger></Tabs.List>
    <Tabs.Panel value="a">Panel</Tabs.Panel>
  </Tabs>
)
export const I = () => (
  <Tabs value="a" onValueChange={(v: string) => v}>
    <Tabs.List aria-label="Views"><Tabs.Trigger value="a">Alerts</Tabs.Trigger></Tabs.List>
    <Tabs.Panel value="a">Panel</Tabs.Panel>
  </Tabs>
)
export const same = (p: CoreTabsProps): HeadlessTabsProps => p
export const back = (p: HeadlessTabsProps): CoreTabsProps => p
`)
  let headlessOk = true
  try { run(tsc, ['--noEmit', '-p', 'tsconfig.json'], app) } catch (e) {
    headlessOk = false
    console.log((e.stdout || '').toString().split('\n').slice(0, 8).join('\n'))
  }
  check(headlessOk, 'headless entry resolves, typechecks, and its Tabs API is the core API')
  rmSync(join(app, 'valid-headless.tsx'))

  // -- invalid usage must NOT compile --
  // Each of these is a rule from the guidelines. If any compiles, the design
  // constraint is documentation only, which is how systems drift.
  //
  // The first field is the rule id carried by that rule's `[[rule: …]]` tag in
  // guidelines/components/*.md; scripts/check-rules.mjs fails the build if a rule
  // tagged `compiler` has no entry here, or an entry names no rule. These snippets
  // stay HAND-WRITTEN: a fixture generated from the annotation would share a source
  // with the thing it is testing and prove nothing.
  const violations = [
    ['button-text-link-requires-primary', 'destructive text-link', `<Button variant="destructive" appearance="text-link">Delete</Button>`],
    ['button-text-link-size-and-icon', 'text-link at size huge', `<Button variant="primary" appearance="text-link" size="huge">Go</Button>`],
    ['button-text-link-size-and-icon', 'text-link carrying an icon', `<Button variant="primary" appearance="text-link" icon={<svg />}>Go</Button>`],
    ['button-prop-sets-closed', 'invented button size', `<Button size="medium">Go</Button>`],
    ['alert-severity-closed-set', 'invented severity', `<ContextualAlert severity="high">Body</ContextualAlert>`],
    ['status-closed-set', 'severity used as a status', `<StatusIndicator status="critical" />`],
    ['risk-closed-set', 'invented risk', `<RiskPill risk="severe" />`],
    ['risk-closed-set', 'severity used as a risk', `<RiskPill risk="critical" />`],
    ['risk-closed-set', 'status used as a risk', `<RiskPill risk="unhealthy" />`],
    ['risk-closed-set', 'pill with no level', `<RiskPill label="High" />`],
    ['risk-pill-sizes-closed', 'invented risk pill size', `<RiskPill risk="low" size="large" />`],
    ['tabs-list-requires-aria-label', 'tablist with no accessible name', `<Tabs defaultValue="a"><Tabs.List><Tabs.Trigger value="a">A</Tabs.Trigger></Tabs.List></Tabs>`],
    ['toggle-label-required', 'toggle with no label', `<Toggle />`],
    ['input-label-required', 'input with no label', `<Input />`],
    ['input-error-is-a-message', 'error as a boolean', `<Input label="Tenant" error />`],
    ['tabs-controlled-exclusive', 'tabs both controlled and uncontrolled', `<Tabs value="a" defaultValue="a"><Tabs.List aria-label="V"><Tabs.Trigger value="a">A</Tabs.Trigger></Tabs.List></Tabs>`],
    ['toggle-controlled-exclusive', 'toggle both controlled and uncontrolled', `<Toggle label="Alerts" checked defaultChecked />`],
  ]
  for (const [id, name, snippet] of violations) {
    writeFileSync(join(app, 'invalid.tsx'),
      `import { Button, ContextualAlert, Input, RiskPill, StatusIndicator, Tabs, Toggle } from '@omkarux/vela'\nexport const X = () => (${snippet})\n`)
    let rejected = false
    try { run(tsc, ['--noEmit', '-p', 'tsconfig.json'], app) } catch { rejected = true }
    check(rejected, `compiler rejects: ${name}  [${id}]`)
  }
  // The same Tabs fixtures against the headless export. One spec, two implementations: a rule the
  // core's types reject and the headless types accept would be a rule enforced by one entry point.
  for (const [id, name, snippet] of violations.filter(([id]) => id.startsWith('tabs-'))) {
    writeFileSync(join(app, 'invalid.tsx'),
      `import { Tabs } from '@omkarux/vela/headless'\nexport const X = () => (${snippet})\n`)
    let rejected = false
    try { run(tsc, ['--noEmit', '-p', 'tsconfig.json'], app) } catch { rejected = true }
    check(rejected, `compiler rejects on the headless entry too: ${name}  [${id}]`)
  }
  rmSync(join(app, 'invalid.tsx'))

  // 3. the stylesheet a consumer actually imports ---------------------------
  const css = readFileSync(join(app, 'node_modules/@omkarux/vela/dist/vela.css'), 'utf8')
  check(css.includes('--vela-text-default'), 'shipped CSS defines semantic tokens')
  check(css.includes('[data-theme="dark"]'), 'shipped CSS carries the explicit dark theme')
  check(css.includes('prefers-color-scheme: dark'), 'shipped CSS respects the OS preference')
} finally {
  rmSync(app, { recursive: true, force: true })
  rmSync(tarball, { force: true })
}

console.log(`\n  ${failures === 0 ? 'Package installs, typechecks and enforces its own rules.' : `${failures} check(s) failed.`}\n`)
process.exit(failures === 0 ? 0 : 1)
