/**
 * Publish gate.
 *
 * Builds the real tarball, installs it into a throwaway app, and proves four
 * things that a green `npm run build` does NOT prove:
 *   1. the exports map resolves (`import { Button } from '@omkarux/vela'`)
 *   2. the shipped .d.ts typechecks under `strict`
 *   3. the closed prop sets are enforced by the COMPILER, not by review
 *   4. no source or test files leaked into the tarball
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
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
check(files.includes('dist/vela.css'), 'tarball contains dist/vela.css')
check(files.includes('dist/tokens.css'), 'tarball contains dist/tokens.css')
check(files.some((f) => f.startsWith('guidelines/')), 'tarball contains guidelines/')
check(!files.some((f) => f.startsWith('src/')), 'no src/ leaked into the tarball')
check(!files.some((f) => f.includes('.test.')), 'no test files leaked into the tarball')
console.log(`  ....  ${files.length} files, ${(packed.size / 1024).toFixed(1)} kB packed`)

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

  run('npm', ['install', tarball, 'react@19', 'react-dom@19', '@types/react@19',
    '--no-audit', '--no-fund', '--silent'], app, { stdio: 'ignore' })
  check(true, 'npm install of the tarball succeeded')

  // -- valid usage must compile --
  mkdirSync(join(app, 'src'), { recursive: true })
  writeFileSync(join(app, 'valid.tsx'), `
import { Button, Toggle, Input, ContextualAlert, StatusIndicator, Tabs } from '@omkarux/vela'
import type { Severity, Status, ButtonProps } from '@omkarux/vela'

export const A = () => <Button variant="primary" appearance="filled" size="huge">Save Changes</Button>
export const B = () => <Button variant="primary" appearance="text-link" size="tiny">Learn More</Button>
export const C = () => <Button variant="destructive" appearance="hollow" loading>Delete Account</Button>
export const D = () => <Toggle label="Email alerts" onChange={(v: boolean) => v} />
export const E = () => <Input label="Tenant" hint="Lowercase only" error="Taken" size="large" />
export const F = (s: Severity) => <ContextualAlert severity={s}>Body</ContextualAlert>
export const G = (s: Status) => <StatusIndicator status={s} label="Node 1" />
export const H = () => (
  <Tabs defaultValue="a">
    <Tabs.List aria-label="Views"><Tabs.Trigger value="a" count={3}>Alerts</Tabs.Trigger></Tabs.List>
    <Tabs.Panel value="a">Panel</Tabs.Panel>
  </Tabs>
)
export const props: ButtonProps = { variant: 'standard', children: 'OK' }
`)
  const tsc = join(root, 'node_modules', '.bin', 'tsc')
  let validOk = true
  try { run(tsc, ['--noEmit', '-p', 'tsconfig.json'], app) } catch (e) {
    validOk = false
    console.log((e.stdout || '').toString().split('\n').slice(0, 8).join('\n'))
  }
  check(validOk, 'valid usage typechecks against the shipped .d.ts')

  // -- invalid usage must NOT compile --
  // Each of these is a rule from the guidelines. If any compiles, the design
  // constraint is documentation only, which is how systems drift.
  const violations = [
    ['destructive text-link', `<Button variant="destructive" appearance="text-link">Delete</Button>`],
    ['text-link at size huge', `<Button variant="primary" appearance="text-link" size="huge">Go</Button>`],
    ['text-link carrying an icon', `<Button variant="primary" appearance="text-link" icon={<svg />}>Go</Button>`],
    ['invented button size', `<Button size="medium">Go</Button>`],
    ['invented severity', `<ContextualAlert severity="high">Body</ContextualAlert>`],
    ['severity used as a status', `<StatusIndicator status="critical" />`],
    ['tablist with no accessible name', `<Tabs defaultValue="a"><Tabs.List><Tabs.Trigger value="a">A</Tabs.Trigger></Tabs.List></Tabs>`],
    ['toggle with no label', `<Toggle />`],
  ]
  for (const [name, snippet] of violations) {
    writeFileSync(join(app, 'invalid.tsx'),
      `import { Button, ContextualAlert, StatusIndicator, Tabs, Toggle } from '@omkarux/vela'\nexport const X = () => (${snippet})\n`)
    let rejected = false
    try { run(tsc, ['--noEmit', '-p', 'tsconfig.json'], app) } catch { rejected = true }
    check(rejected, `compiler rejects: ${name}`)
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
