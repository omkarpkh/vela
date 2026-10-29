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
check(files.includes('NOTICE'), 'tarball contains NOTICE (the Lucide ISC notice travels with every copy)')
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
import { Button, Toggle, Input, ContextualAlert, StatusIndicator, RiskPill, Tabs, Icon, ICON_NAMES, Table } from '@omkarux/vela'
import type { Severity, Status, Risk, ButtonProps, IconName, TableProps, TableRowProps, TableHeaderCellProps, TableCellProps, TableEmptyProps, TableSort, TableSortDirection } from '@omkarux/vela'

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
export const K = () => <Icon name="shield-x" />
export const K2 = () => <Icon name="rotate-ccw-clock" size="large" tone="muted" label="Audit history" />
export const K3 = () => <Button icon={<Icon name="plus" tone="inherit" />}>Add rule</Button>
export const K4 = (n: IconName) => <Icon name={n} size="small" />
export const names: readonly IconName[] = ICON_NAMES
// Table: every documented shape compiles, so the table fixtures are rejected for the right reason.
export const T = (direction: TableSortDirection, isNumeric: boolean) => (
  <Table caption="Assets" captionHidden density="compact" layout="fixed" stickyHeader className="t">
    <Table.Head>
      <Table.Row>
        <Table.HeaderCell sort={{ direction, onSort: (next: 'ascending' | 'descending') => next }}>Asset</Table.HeaderCell>
        <Table.HeaderCell sort={{ direction: 'none', onSort: () => {} }} align="end">Findings</Table.HeaderCell>
        <Table.HeaderCell scope="col">Status</Table.HeaderCell>
      </Table.Row>
    </Table.Head>
    <Table.Body>
      <Table.Empty colSpan={3}>No assets match these filters</Table.Empty>
      <Table.Row selected aria-current="true">
        <Table.HeaderCell scope="row">api-01</Table.HeaderCell>
        <Table.Cell numeric>42</Table.Cell>
        <Table.Cell numeric={isNumeric}>7</Table.Cell>
        <Table.Cell align="end">x</Table.Cell>
        <Table.Cell><StatusIndicator status="healthy" label="Healthy" /></Table.Cell>
      </Table.Row>
    </Table.Body>
  </Table>
)
export const tableProps: [TableProps, TableRowProps, TableHeaderCellProps, TableCellProps, TableEmptyProps, TableSort] = [
  { caption: 'A', children: null }, { children: null }, { children: 'A' }, {}, { colSpan: 1, children: 'None' },
  { direction: 'none', onSort: () => {} },
]
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

  // -- the headless-born components: every documented shape compiles --
  // Checkbox and Radio Group exist only on `/headless`. Their rejection fixtures below are only
  // meaningful if the valid shapes compile against the same .d.ts — an import that failed to
  // resolve would make every fixture "rejected" for the wrong reason.
  writeFileSync(join(app, 'valid-born-headless.tsx'), `
import { Checkbox, RadioGroup } from '@omkarux/vela/headless'
import type { CheckboxProps, CheckboxGroupProps, RadioGroupProps, RadioProps } from '@omkarux/vela/headless'

export const A = () => <Checkbox label="Accept the terms" defaultChecked onCheckedChange={(v: boolean) => v} />
export const B = () => <Checkbox label="Accept" checked={false} size="tiny" description="Required" error="Accept to continue" name="terms" value="yes" />
export const C = () => <Checkbox label="Select all" indeterminate disabled />
export const D = () => (
  <Checkbox.Group label="Scan scope" defaultValue={['users']} onValueChange={(v: string[]) => v} orientation="horizontal">
    <Checkbox value="users" label="Users" />
    <Checkbox value="apps" label="Applications" disabled />
  </Checkbox.Group>
)
export const E = () => <Checkbox.Group label="Scope" value={[]} disabled><Checkbox value="a" label="A" /></Checkbox.Group>
export const F = () => (
  <RadioGroup label="Enforcement" defaultValue="block" onValueChange={(v: string) => v} name="mode" error="Choose one" orientation="horizontal">
    <RadioGroup.Radio value="monitor" label="Monitor" description="Log the match" />
    <RadioGroup.Radio value="block" label="Block" disabled />
  </RadioGroup>
)
export const G = () => <RadioGroup label="Retention" value="30" disabled><RadioGroup.Radio value="30" label="30 days" /></RadioGroup>
export const H = () => <RadioGroup label="Retention"><RadioGroup.Radio value="30" label="30 days" /></RadioGroup>
export const props: [CheckboxProps, CheckboxGroupProps, RadioGroupProps, RadioProps] = [
  { label: 'A' }, { label: 'G' }, { label: 'R' }, { value: 'a', label: 'A' },
]
`)
  let bornOk = true
  try { run(tsc, ['--noEmit', '-p', 'tsconfig.json'], app) } catch (e) {
    bornOk = false
    console.log((e.stdout || '').toString().split('\n').slice(0, 8).join('\n'))
  }
  check(bornOk, 'headless Checkbox, Checkbox.Group and RadioGroup typecheck in every documented shape')
  rmSync(join(app, 'valid-born-headless.tsx'))

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
    // Checkbox and Radio Group ship from `@omkarux/vela/headless` only; the fixture file imports them from there.
    ['checkbox-label-required', 'checkbox with no label', `<Checkbox />`],
    ['checkbox-label-required', 'checkbox label as a node', `<Checkbox label={<b>Accept</b>} />`],
    ['checkbox-controlled-exclusive', 'checkbox both controlled and uncontrolled', `<Checkbox label="Accept" checked defaultChecked />`],
    ['checkbox-sizes-closed', 'invented checkbox size', `<Checkbox label="Accept" size="small" />`],
    ['checkbox-error-is-a-message', 'checkbox error as a boolean', `<Checkbox label="Accept" error />`],
    ['checkbox-group-label-required', 'checkbox group with no label', `<Checkbox.Group><Checkbox value="a" label="A" /></Checkbox.Group>`],
    ['checkbox-group-controlled-exclusive', 'checkbox group both controlled and uncontrolled', `<Checkbox.Group label="Scope" value={['a']} defaultValue={['a']}><Checkbox value="a" label="A" /></Checkbox.Group>`],
    ['radio-group-label-required', 'radio group with no label', `<RadioGroup><RadioGroup.Radio value="a" label="A" /></RadioGroup>`],
    ['radio-group-controlled-exclusive', 'radio group both controlled and uncontrolled', `<RadioGroup label="Mode" value="a" defaultValue="a"><RadioGroup.Radio value="a" label="A" /></RadioGroup>`],
    ['radio-group-error-is-a-message', 'radio group error as a boolean', `<RadioGroup label="Mode" error><RadioGroup.Radio value="a" label="A" /></RadioGroup>`],
    ['radio-group-orientation-closed', 'invented radio group orientation', `<RadioGroup label="Mode" orientation="grid"><RadioGroup.Radio value="a" label="A" /></RadioGroup>`],
    ['radio-value-required', 'radio with no value', `<RadioGroup label="Mode"><RadioGroup.Radio label="A" /></RadioGroup>`],
    ['radio-label-required', 'radio with no label', `<RadioGroup label="Mode"><RadioGroup.Radio value="a" /></RadioGroup>`],
    ['radio-label-required', 'radio label as a node', `<RadioGroup label="Mode"><RadioGroup.Radio value="a" label={<b>A</b>} /></RadioGroup>`],
    ['icon-name-closed-set', 'unknown icon name', `<Icon name="shield" />`],
    ['icon-name-closed-set', 'a Lucide glyph outside the curated set', `<Icon name="airplay" />`],
    ['icon-name-closed-set', 'a Lucide alias instead of the canonical name', `<Icon name="trash-2" />`],
    ['icon-name-closed-set', 'icon with no name', `<Icon />`],
    ['icon-size-closed-set', 'invalid icon size', `<Icon name="check" size="medium" />`],
    ['icon-size-closed-set', 'icon size as a number', `<Icon name="check" size={16} />`],
    ['icon-tone-closed-set', 'severity used as an icon tone', `<Icon name="shield-x" tone="critical" />`],
    ['icon-tone-closed-set', 'risk used as an icon tone', `<Icon name="shield-alert" tone="high" />`],
    ['icon-not-interactive', 'icon with a click handler', `<Icon name="x" onClick={() => {}} />`],
    ['icon-not-interactive', 'icon in the tab order', `<Icon name="copy" tabIndex={0} />`],
    ['table-caption-required', 'table with no caption', `<Table><Table.Body><Table.Empty colSpan={1}>None</Table.Empty></Table.Body></Table>`],
    ['table-caption-required', 'table caption as a node', `<Table caption={<b>Assets</b>}><Table.Body><Table.Empty colSpan={1}>None</Table.Empty></Table.Body></Table>`],
    ['table-density-closed', 'size word used as a table density', `<Table caption="Assets" density="regular"><Table.Body><Table.Empty colSpan={1}>None</Table.Empty></Table.Body></Table>`],
    ['table-layout-closed', 'invented table layout', `<Table caption="Assets" layout="grid"><Table.Body><Table.Empty colSpan={1}>None</Table.Empty></Table.Body></Table>`],
    ['table-header-scope-closed', 'invented header scope', `<Table.HeaderCell scope="colgroup">Asset</Table.HeaderCell>`],
    ['table-sort-direction-closed', 'invented sort direction', `<Table.HeaderCell sort={{ direction: 'asc', onSort: () => {} }}>Asset</Table.HeaderCell>`],
    ['table-sort-column-headers-only', 'sort on a row header', `<Table.HeaderCell scope="row" sort={{ direction: 'none', onSort: () => {} }}>api-01</Table.HeaderCell>`],
    ['table-sort-label-is-a-string', 'sortable header labelled with a node', `<Table.HeaderCell sort={{ direction: 'none', onSort: () => {} }}><b>Asset</b></Table.HeaderCell>`],
    ['table-align-closed', 'invented cell alignment', `<Table.Cell align="center">42</Table.Cell>`],
    ['table-align-closed', 'numeric cell aligned to the start', `<Table.Cell numeric align="start">42</Table.Cell>`],
    ['table-empty-requires-text', 'empty state with no message', `<Table.Empty colSpan={3} />`],
    ['table-empty-requires-text', 'empty state message as a node', `<Table.Empty colSpan={3}><b>None</b></Table.Empty>`],
  ]
  for (const [id, name, snippet] of violations) {
    writeFileSync(join(app, 'invalid.tsx'),
      `import { Button, ContextualAlert, Icon, Input, RiskPill, StatusIndicator, Table, Tabs, Toggle } from '@omkarux/vela'\n` +
      `import { Checkbox, RadioGroup } from '@omkarux/vela/headless'\nexport const X = () => (${snippet})\n`)
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
  check(css.includes('.vela-checkbox__box') && css.includes('.vela-radio__circle'),
    'shipped CSS carries the headless-born Checkbox and Radio Group styles')
  check(css.includes('.vela-table__region') && css.includes('--vela-bg-row-selected:'),
    'shipped CSS carries the Table styles and the row tokens they bind')
} finally {
  rmSync(app, { recursive: true, force: true })
  rmSync(tarball, { force: true })
}

console.log(`\n  ${failures === 0 ? 'Package installs, typechecks and enforces its own rules.' : `${failures} check(s) failed.`}\n`)
process.exit(failures === 0 ? 0 : 1)
