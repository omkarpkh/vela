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
import { Button, Toggle, Input, TextArea, ContextualAlert, StatusIndicator, RiskPill, Tabs, Icon, ICON_NAMES, Table } from '@omkarux/vela'
import type { Severity, Status, Risk, ButtonProps, IconName, TableProps, TableRowProps, TableHeaderCellProps, TableCellProps, TableEmptyProps, TableSort, TableSortDirection } from '@omkarux/vela'

export const A = () => <Button variant="primary" appearance="filled" size="huge">Save Changes</Button>
export const B = () => <Button variant="primary" appearance="text-link" size="tiny">Learn More</Button>
export const C = () => <Button variant="destructive" appearance="hollow" loading>Delete Account</Button>
export const D = () => <Toggle label="Email alerts" onChange={(v: boolean) => v} />
export const E = () => <Input label="Tenant" hint="Lowercase only" error="Taken" size="large" />
export const E2 = () => <TextArea label="Justification" hint="Shown to the approver" error="Required" size="tiny" rows={4} maxLength={280} resize="none" defaultValue="" />
export const E3 = (v: string) => <TextArea label="Notes" value={v} onChange={(e) => e.target.value} name="notes" readOnly required />
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

  // -- the headless overlays: every documented shape compiles --
  // As above: the rejection fixtures for Popover, Tooltip and Dialog prove nothing unless the
  // documented shapes compile against the same shipped .d.ts — a Button trigger from the core
  // entry included, since that is the trigger the specs show.
  writeFileSync(join(app, 'valid-overlays.tsx'), `
import { Button } from '@omkarux/vela'
import { Popover, Tooltip, Dialog } from '@omkarux/vela/headless'
import type { PopoverProps, TooltipProps, DialogProps, DialogCloseProps } from '@omkarux/vela/headless'

export const A = () => (
  <Popover trigger={<Button>Filters</Button>} title="Filter alerts" placement="bottom" align="start" size="wide" onOpenChange={(o: boolean) => o}>
    <p>Body</p>
  </Popover>
)
export const B = () => <Popover trigger={<button type="button">Filters</button>} title="Filter alerts" open={false} placement="end">Body</Popover>
export const C = () => <Popover trigger={<Button>Filters</Button>} title="Filter alerts" defaultOpen placement="start" align="center" />
export const D = () => <Tooltip content="Download the last 24 hours as CSV" placement="top" align="end"><Button>Export</Button></Tooltip>
export const E = () => <Tooltip content="Delete the rule"><button type="button" aria-label="Delete">×</button></Tooltip>
export const F = () => (
  <Dialog trigger={<Button>Edit Policy</Button>} title="Edit policy" description="Changes apply on save." size="wide" closeLabel="Close"
    footer={<><Dialog.Close><Button>Cancel</Button></Dialog.Close><Button variant="primary">Save Changes</Button></>}>
    <p>Body</p>
  </Dialog>
)
export const G = () => <Dialog open title="Session expired" onOpenChange={(o: boolean) => o} variant="standard" />
export const H = () => (
  <Dialog variant="alert" trigger={<Button variant="destructive">Delete Policy</Button>} title="Delete policy?"
    description="This cannot be undone." cancelLabel="Keep Policy" confirmLabel="Delete Policy" onConfirm={() => {}} defaultOpen={false} />
)
export const props: [PopoverProps, TooltipProps, DialogProps, DialogProps, DialogCloseProps] = [
  { trigger: <Button>F</Button>, title: 'F' },
  { content: 'C', children: <Button>T</Button> },
  { title: 'D' },
  { variant: 'alert', title: 'A', cancelLabel: 'Keep', confirmLabel: 'Delete', onConfirm: () => {} },
  { children: <Button>Cancel</Button> },
]
`)
  let overlaysOk = true
  try { run(tsc, ['--noEmit', '-p', 'tsconfig.json'], app) } catch (e) {
    overlaysOk = false
    console.log((e.stdout || '').toString().split('\n').slice(0, 8).join('\n'))
  }
  check(overlaysOk, 'headless Popover, Tooltip and Dialog (standard and alert) typecheck in every documented shape')
  rmSync(join(app, 'valid-overlays.tsx'))

  // -- the headless Toast: every documented shape compiles --
  // The Toast fixtures call `useToast().add(…)`; they prove nothing unless a valid call compiles, the
  // Severity subset is assignable to the core's Severity, and the provider takes its closed props.
  writeFileSync(join(app, 'valid-toast.tsx'), `
import { Button } from '@omkarux/vela'
import type { Severity } from '@omkarux/vela'
import { ToastProvider, useToast } from '@omkarux/vela/headless'
import type { ToastProviderProps, ToastOptions, ToastAction, ToastApi, ToastSeverity, ToastPlacement, ToastLimit } from '@omkarux/vela/headless'

export const A = () => <ToastProvider><Button>Save</Button></ToastProvider>
export const B = () => <ToastProvider placement="top-end" limit={1} label="Notifications" dismissLabel="Dismiss"><span /></ToastProvider>
export const C = () => <ToastProvider placement="bottom-center" limit={2}><span /></ToastProvider>
export function D() {
  const toast: ToastApi = useToast()
  const id: string = toast.add({ title: 'Policy saved' })
  toast.add({ title: 'Policy saved', description: 'Applies to 14 tenants.', severity: 'success' })
  toast.add({ title: 'Saved with 2 rules skipped', severity: 'warning' })
  toast.add({ title: 'Policy archived', severity: 'info', action: { label: 'Undo', onClick: () => {} } })
  toast.dismiss(id)
  return null
}
export const sub = (s: ToastSeverity): Severity => s
export const shapes: [ToastProviderProps, ToastOptions, ToastAction, ToastPlacement, ToastLimit] = [
  { children: null }, { title: 'T' }, { label: 'Undo', onClick: () => {} }, 'bottom-end', 3,
]
`)
  let toastOk = true
  try { run(tsc, ['--noEmit', '-p', 'tsconfig.json'], app) } catch (e) {
    toastOk = false
    console.log((e.stdout || '').toString().split('\n').slice(0, 8).join('\n'))
  }
  check(toastOk, 'headless ToastProvider and useToast() typecheck in every documented shape, and ToastSeverity is a Severity')
  rmSync(join(app, 'valid-toast.tsx'))

  // -- the headless Dropdown List: every documented shape compiles --
  // The rejection fixtures below prove nothing unless a valid list compiles: controlled and
  // uncontrolled value and open, both alignments, the four item fields, and a Button trigger.
  writeFileSync(join(app, 'valid-dropdown-list.tsx'), `
import { Button } from '@omkarux/vela'
import { DropdownList } from '@omkarux/vela/headless'
import type { DropdownListProps, DropdownListItem, DropdownListAlign } from '@omkarux/vela/headless'

const items: [DropdownListItem, ...DropdownListItem[]] = [
  { value: 'alerts', label: 'Alerts' },
  { value: 'firewall', label: 'Firewall', meta: '1 new' },
  { value: 'archive', label: 'Archive', locked: { reason: 'Needs retention on' } },
]
export const A = () => (
  <DropdownList label="All tabs" trigger={<button type="button">6 more · 1 new</button>} items={items}
    value="firewall" onValueChange={(v: string) => v} align="end" />
)
export const B = () => <DropdownList label="All tabs" trigger={<Button>6 more</Button>} items={[{ value: 'a', label: 'A' }]} defaultValue="a" defaultOpen />
export const C = () => <DropdownList label="Views" trigger={<Button>Views</Button>} items={items} defaultValue="alerts" open={false} onOpenChange={(o: boolean) => o} align="start" />
export const D = () => <DropdownList label="Views" trigger={<Button>Views</Button>} items={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] as const} value="b" />
export const shapes: [DropdownListProps, DropdownListAlign] = [{ label: 'L', trigger: <Button>T</Button>, items, value: 'alerts' }, 'end']
`)
  let dropdownOk = true
  try { run(tsc, ['--noEmit', '-p', 'tsconfig.json'], app) } catch (e) {
    dropdownOk = false
    console.log((e.stdout || '').toString().split('\n').slice(0, 8).join('\n'))
  }
  check(dropdownOk, 'headless DropdownList typechecks in every documented shape')
  rmSync(join(app, 'valid-dropdown-list.tsx'))

  // -- Filter Grammar: every documented shape compiles --
  // The grammar fixtures below prove nothing unless a valid schema and query compile against the same
  // shipped .d.ts: every type, `many`, all three trusts, each value shape, a nested group, a Positive
  // Conjunction, and the eight functions with their result types. Two shapes the types must refuse are
  // asserted here with @ts-expect-error, so a type that accepted them would fail this file too.
  writeFileSync(join(app, 'valid-grammar.tsx'), `
import { defineFields, parseQuery, validateQuery, normalise, queryToText, readback, evaluate, leftOutQuery } from '@omkarux/vela'
import type { Fields, FieldName, FieldSpec, FieldTrust, Query, Group, Node, Condition, PositiveConjunction, ParseResult, ParseError, Evaluation, ReadbackStrings } from '@omkarux/vela'

const SEVERITY_VALUES = [{ value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' }] as const
const fields = defineFields({
  'sender.domain': { label: 'Authenticated sender domain', type: 'domain', trust: { kind: 'system-record', source: 'Mail gateway' } },
  'subject': { label: 'Subject', type: 'text', trust: { kind: 'untrusted', writtenBy: "the email's sender" } },
  'account': { label: 'Account', type: 'identifier', trust: { kind: 'agent-output', writtenBy: 'the triage agent' } },
  'vendor.listed': { label: 'Payment account on the vendor list', type: 'boolean', trust: { kind: 'system-record', source: 'Vendor master' } },
  'severity': { label: 'Severity', type: 'enum', values: SEVERITY_VALUES, trust: { kind: 'system-record', source: 'Detection pipeline' } },
  'first_seen': { label: 'First seen', type: 'time', trust: { kind: 'system-record', source: 'Sensor clock' } },
  'source.ip': { label: 'Source IP', type: 'ip', many: true, trust: { kind: 'system-record', source: 'Firewall log' } },
  'size': { label: 'Size', type: 'number', unit: 'MB', trust: { kind: 'system-record', source: 'Mail gateway' } },
})
type F = typeof fields
const name: FieldName<F> = 'sender.domain'
const q: Query<F> = { grammar: 1, root: { kind: 'group', join: 'and', items: [
  { kind: 'condition', field: name, operator: 'is-subdomain-of', value: 'northwind.example' },
  { kind: 'condition', field: 'subject', operator: 'contains', value: 'Invoice' },
  { kind: 'group', join: 'or', items: [
    { kind: 'condition', field: 'severity', operator: 'is-one-of', value: ['high', 'critical'] },
    { kind: 'condition', field: 'first_seen', operator: 'within-last', value: '7d' },
    { kind: 'condition', field: 'source.ip', operator: 'in-range', value: '10.0.0.0/8' },
    { kind: 'condition', field: 'size', operator: 'between', value: { from: 1, to: 10 } },
    { kind: 'condition', field: 'vendor.listed', operator: 'is', value: false },
    { kind: 'condition', field: 'account', operator: 'is-not-set' },
  ] },
] } }
const lesson: PositiveConjunction<F> = { grammar: 1, root: { kind: 'group', join: 'and', items: [{ kind: 'condition', field: 'sender.domain', operator: 'is', value: 'northwind.example' }] } }
// @ts-expect-error a Positive Conjunction takes no negation
export const negated: PositiveConjunction<F> = { grammar: 1, root: { kind: 'group', join: 'and', items: [{ kind: 'condition', field: 'severity', operator: 'is-not', value: 'high' }] } }
// @ts-expect-error a Positive Conjunction is joined by 'and'
export const either: PositiveConjunction<F> = { grammar: 1, root: { kind: 'group', join: 'or', items: [{ kind: 'condition', field: 'severity', operator: 'is', value: 'high' }] } }
const parsed: ParseResult<F> = parseQuery('severity is high', fields)
const checked: ParseResult<F> = validateQuery(JSON.parse('{}'), fields)
const errors: ParseError[] = parsed.ok ? [] : parsed.errors
const now = new Date('2026-10-31T14:15:00Z')
const result: Evaluation = evaluate(q, { 'sender.domain': 'mail.northwind.example' }, fields, { now })
const left: Query<F> = leftOutQuery(lesson, fields)
const words: Partial<ReadbackStrings> = { and: 'and' }
export const all = [checked, errors, result, left, words, normalise(q, fields), queryToText(lesson, fields),
  readback(q, fields, { now, timeZone: 'Asia/Kolkata', full: true, markTrust: true, strings: { operators: { 'is-one-of': 'is one of' } } })]
export const shapes: [Fields, FieldSpec, FieldTrust, Group<F>, Node<F>, Condition<F>] = [
  fields, fields.severity, { kind: 'untrusted', writtenBy: 'x' }, q.root, lesson.root.items[0], lesson.root.items[0],
]
`)
  let grammarOk = true
  try { run(tsc, ['--noEmit', '-p', 'tsconfig.json'], app) } catch (e) {
    grammarOk = false
    console.log((e.stdout || '').toString().split('\n').slice(0, 8).join('\n'))
  }
  check(grammarOk, 'Filter Grammar typechecks in every documented shape, and refuses a negated or an or-joined Positive Conjunction')
  rmSync(join(app, 'valid-grammar.tsx'))

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
    ['text-area-label-required', 'text area with no label', `<TextArea />`],
    ['text-area-controlled-exclusive', 'text area both controlled and uncontrolled', `<TextArea label="Notes" value="a" defaultValue="a" />`],
    ['text-area-error-is-a-message', 'text area error as a boolean', `<TextArea label="Notes" error />`],
    ['text-area-resize-closed', 'horizontal resize', `<TextArea label="Notes" resize="horizontal" />`],
    ['text-area-resize-closed', 'resize in both directions', `<TextArea label="Notes" resize="both" />`],
    ['text-area-size-closed', 'invented text area size', `<TextArea label="Notes" size="medium" />`],
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
    // Popover, Tooltip and Dialog ship from `@omkarux/vela/headless` only, like Checkbox and Radio Group.
    ['popover-title-required', 'popover with no title', `<Popover trigger={<Button>Filters</Button>}>Body</Popover>`],
    ['popover-title-required', 'popover title as a node', `<Popover trigger={<Button>Filters</Button>} title={<b>Filters</b>}>Body</Popover>`],
    ['popover-trigger-required', 'popover with no trigger', `<Popover title="Filter alerts">Body</Popover>`],
    ['popover-controlled-exclusive', 'popover both controlled and uncontrolled', `<Popover trigger={<Button>Filters</Button>} title="Filter alerts" open defaultOpen>Body</Popover>`],
    ['popover-placement-closed', 'physical popover placement', `<Popover trigger={<Button>Filters</Button>} title="Filter alerts" placement="left">Body</Popover>`],
    ['popover-placement-closed', 'invented popover alignment', `<Popover trigger={<Button>Filters</Button>} title="Filter alerts" align="middle">Body</Popover>`],
    ['popover-sizes-closed', 'invented popover size', `<Popover trigger={<Button>Filters</Button>} title="Filter alerts" size="small">Body</Popover>`],
    ['tooltip-content-is-text', 'tooltip content as a link', `<Tooltip content={<a href="/docs">Docs</a>}><Button>Export</Button></Tooltip>`],
    ['tooltip-content-is-text', 'tooltip with no content', `<Tooltip><Button>Export</Button></Tooltip>`],
    ['tooltip-wraps-one-element', 'tooltip around a bare string', `<Tooltip content="Download as CSV">Export</Tooltip>`],
    ['tooltip-wraps-one-element', 'tooltip around two elements', `<Tooltip content="Download as CSV"><Button>Export</Button><Button>Print</Button></Tooltip>`],
    ['tooltip-placement-closed', 'invented tooltip placement', `<Tooltip content="Download as CSV" placement="auto"><Button>Export</Button></Tooltip>`],
    ['dialog-title-required', 'dialog with no title', `<Dialog trigger={<Button>Edit Policy</Button>}>Body</Dialog>`],
    ['dialog-title-required', 'dialog title as a node', `<Dialog trigger={<Button>Edit Policy</Button>} title={<b>Edit</b>}>Body</Dialog>`],
    ['dialog-description-is-text', 'dialog description holding a control', `<Dialog title="Edit policy" description={<Button>Undo</Button>}>Body</Dialog>`],
    ['dialog-controlled-exclusive', 'dialog both controlled and uncontrolled', `<Dialog title="Edit policy" open defaultOpen>Body</Dialog>`],
    ['dialog-props-closed', 'invented dialog size', `<Dialog title="Edit policy" size="fullscreen">Body</Dialog>`],
    ['dialog-props-closed', 'invented dialog variant', `<Dialog title="Edit policy" variant="sheet">Body</Dialog>`],
    ['alert-dialog-requires-cancel-and-confirm', 'alert with no cancel', `<Dialog variant="alert" title="Delete policy?" confirmLabel="Delete Policy" onConfirm={() => {}} />`],
    ['alert-dialog-requires-cancel-and-confirm', 'alert with no confirm label', `<Dialog variant="alert" title="Delete policy?" cancelLabel="Keep Policy" onConfirm={() => {}} />`],
    ['alert-dialog-requires-cancel-and-confirm', 'alert with no onConfirm', `<Dialog variant="alert" title="Delete policy?" cancelLabel="Keep Policy" confirmLabel="Delete Policy" />`],
    ['alert-dialog-actions-are-fixed', 'alert with its own footer', `<Dialog variant="alert" title="Delete policy?" cancelLabel="Keep" confirmLabel="Delete Policy" onConfirm={() => {}} footer={<Button>Delete</Button>} />`],
    ['alert-dialog-actions-are-fixed', 'alert with a close button label', `<Dialog variant="alert" title="Delete policy?" cancelLabel="Keep" confirmLabel="Delete Policy" onConfirm={() => {}} closeLabel="Close" />`],
    // Dropdown List ships from `@omkarux/vela/headless` only. Every fixture is valid apart from the rule it names.
    ['dropdown-list-label-required', 'dropdown list with no label', `<DropdownList trigger={<Button>6 more</Button>} items={[{ value: 'alerts', label: 'Alerts' }]} defaultValue="alerts" />`],
    ['dropdown-list-label-required', 'dropdown list label as a node', `<DropdownList label={<b>All tabs</b>} trigger={<Button>6 more</Button>} items={[{ value: 'alerts', label: 'Alerts' }]} defaultValue="alerts" />`],
    ['dropdown-list-items-required', 'dropdown list with no trigger', `<DropdownList label="All tabs" items={[{ value: 'alerts', label: 'Alerts' }]} defaultValue="alerts" />`],
    ['dropdown-list-items-required', 'dropdown list with no items', `<DropdownList label="All tabs" trigger={<Button>6 more</Button>} defaultValue="alerts" />`],
    ['dropdown-list-items-required', 'dropdown list with an empty items list', `<DropdownList label="All tabs" trigger={<Button>6 more</Button>} items={[]} defaultValue="alerts" />`],
    ['dropdown-list-controlled-exclusive', 'dropdown list value both controlled and uncontrolled', `<DropdownList label="All tabs" trigger={<Button>6 more</Button>} items={[{ value: 'alerts', label: 'Alerts' }]} value="alerts" defaultValue="alerts" />`],
    ['dropdown-list-controlled-exclusive', 'dropdown list open both controlled and uncontrolled', `<DropdownList label="All tabs" trigger={<Button>6 more</Button>} items={[{ value: 'alerts', label: 'Alerts' }]} defaultValue="alerts" open defaultOpen />`],
    ['dropdown-list-align-closed', 'centred dropdown list', `<DropdownList label="All tabs" trigger={<Button>6 more</Button>} items={[{ value: 'alerts', label: 'Alerts' }]} defaultValue="alerts" align="center" />`],
    ['dropdown-list-align-closed', 'physical dropdown list alignment', `<DropdownList label="All tabs" trigger={<Button>6 more</Button>} items={[{ value: 'alerts', label: 'Alerts' }]} defaultValue="alerts" align="left" />`],
    ['dropdown-list-item-closed', 'dropdown list item with an icon', `<DropdownList label="All tabs" trigger={<Button>6 more</Button>} items={[{ value: 'alerts', label: 'Alerts', icon: <svg /> }]} defaultValue="alerts" />`],
    ['dropdown-list-item-closed', 'dropdown list item with a description', `<DropdownList label="All tabs" trigger={<Button>6 more</Button>} items={[{ value: 'alerts', label: 'Alerts', description: 'Every alert' }]} defaultValue="alerts" />`],
    ['dropdown-list-item-closed', 'dropdown list item with its own click handler', `<DropdownList label="All tabs" trigger={<Button>6 more</Button>} items={[{ value: 'alerts', label: 'Alerts', onClick: () => {} }]} defaultValue="alerts" />`],
    ['dropdown-list-item-closed', 'dropdown list item label as a node', `<DropdownList label="All tabs" trigger={<Button>6 more</Button>} items={[{ value: 'alerts', label: <b>Alerts</b> }]} defaultValue="alerts" />`],
    ['dropdown-list-item-closed', 'dropdown list item disabled, the 0.14.0 field', `<DropdownList label="All tabs" trigger={<Button>6 more</Button>} items={[{ value: 'alerts', label: 'Alerts' }, { value: 'archive', label: 'Archive', disabled: true }]} defaultValue="alerts" />`],
    ['dropdown-list-item-closed', 'dropdown list item locked with no reason', `<DropdownList label="All tabs" trigger={<Button>6 more</Button>} items={[{ value: 'alerts', label: 'Alerts' }, { value: 'archive', label: 'Archive', locked: {} }]} defaultValue="alerts" />`],
    ['dropdown-list-item-closed', 'dropdown list item locked as a boolean', `<DropdownList label="All tabs" trigger={<Button>6 more</Button>} items={[{ value: 'alerts', label: 'Alerts' }, { value: 'archive', label: 'Archive', locked: true }]} defaultValue="alerts" />`],
    ['dropdown-list-item-closed', 'dropdown list item with both meta and locked', `<DropdownList label="All tabs" trigger={<Button>6 more</Button>} items={[{ value: 'alerts', label: 'Alerts' }, { value: 'archive', label: 'Archive', meta: '2 open', locked: { reason: 'Needs retention on' } }]} defaultValue="alerts" />`],
    // Toast ships from `@omkarux/vela/headless` only. `add` is called on the hook's result, so each
    // fixture is an expression; every one carries a valid title unless the title is the point.
    ['toast-title-required', 'toast with no title', `useToast().add({ severity: "success" })`],
    ['toast-title-required', 'toast title as a node', `useToast().add({ title: <b>Policy saved</b> })`],
    ['toast-description-is-text', 'toast description holding a link', `useToast().add({ title: "Report ready", description: <a href="/reports">Open</a> })`],
    ['toast-severity-closed', 'critical toast', `useToast().add({ title: "Data loss detected", severity: "critical" })`],
    ['toast-severity-closed', 'major toast', `useToast().add({ title: "Scan failed", severity: "major" })`],
    ['toast-severity-closed', 'invented toast severity', `useToast().add({ title: "Save failed", severity: "error" })`],
    ['toast-severity-closed', 'risk used as a toast severity', `useToast().add({ title: "Policy saved", severity: "high" })`],
    ['toast-severity-closed', 'status used as a toast severity', `useToast().add({ title: "Node restarted", severity: "unhealthy" })`],
    ['toast-one-action-with-label', 'toast action with no label', `useToast().add({ title: "Policy archived", action: { onClick: () => {} } })`],
    ['toast-one-action-with-label', 'toast with two actions', `useToast().add({ title: "Policy archived", action: [{ label: "Undo", onClick: () => {} }, { label: "View", onClick: () => {} }] })`],
    ['toast-one-action-with-label', 'toast action label as an icon', `useToast().add({ title: "Policy archived", action: { label: <svg />, onClick: () => {} } })`],
    ['toast-options-closed', 'toast with its own timeout', `useToast().add({ title: "Policy saved", timeout: 2000 })`],
    ['toast-options-closed', 'toast with its own priority', `useToast().add({ title: "Policy saved", priority: "high" })`],
    ['toast-options-closed', 'toast with its own id', `useToast().add({ title: "Policy saved", id: "saved" })`],
    ['toast-placement-closed', 'physical toast placement', `<ToastProvider placement="bottom-right"><span /></ToastProvider>`],
    ['toast-placement-closed', 'invented toast placement', `<ToastProvider placement="top-center"><span /></ToastProvider>`],
    ['toast-limit-closed', 'toast limit above three', `<ToastProvider limit={5}><span /></ToastProvider>`],
    ['toast-limit-closed', 'toast limit of zero', `<ToastProvider limit={0}><span /></ToastProvider>`],
    // Filter Grammar (guidelines/contracts/filter-grammar.md) ships from the core entry. Each fixture is valid
    // apart from the rule it names; valid-grammar.ts, above, compiles the same shapes done right.
    ['grammar-types-closed', 'invented field type', `defineFields({ c: { label: "Colour", type: "colour", trust: { kind: "system-record", source: "Paint" } } })`],
    ['grammar-types-closed', 'contains on a domain', `queryToText({ grammar: 1, root: { kind: "group", join: "and", items: [{ kind: "condition", field: "d", operator: "contains", value: "northwind" }] } }, defineFields({ d: { label: "Domain", type: "domain", trust: { kind: "system-record", source: "Gateway" } } }))`],
    ['grammar-types-closed', 'ends-with on a domain', `queryToText({ grammar: 1, root: { kind: "group", join: "and", items: [{ kind: "condition", field: "d", operator: "ends-with", value: "northwind.example" }] } }, defineFields({ d: { label: "Domain", type: "domain", trust: { kind: "system-record", source: "Gateway" } } }))`],
    ['grammar-types-closed', 'between on an enum', `queryToText({ grammar: 1, root: { kind: "group", join: "and", items: [{ kind: "condition", field: "s", operator: "between", value: { from: "high", to: "high" } }] } }, defineFields({ s: { label: "Severity", type: "enum", values: [{ value: "high", label: "High" }], trust: { kind: "system-record", source: "Pipeline" } } }))`],
    ['grammar-types-closed', 'a list for is', `queryToText({ grammar: 1, root: { kind: "group", join: "and", items: [{ kind: "condition", field: "s", operator: "is", value: ["high"] }] } }, defineFields({ s: { label: "Severity", type: "enum", values: [{ value: "high", label: "High" }], trust: { kind: "system-record", source: "Pipeline" } } }))`],
    ['grammar-types-closed', 'an enum value not in values', `queryToText({ grammar: 1, root: { kind: "group", join: "and", items: [{ kind: "condition", field: "s", operator: "is", value: "medium" }] } }, defineFields({ s: { label: "Severity", type: "enum", values: [{ value: "high", label: "High" }], trust: { kind: "system-record", source: "Pipeline" } } }))`],
    ['grammar-types-closed', 'an invented operator', `queryToText({ grammar: 1, root: { kind: "group", join: "and", items: [{ kind: "condition", field: "d", operator: "equals", value: "northwind.example" }] } }, defineFields({ d: { label: "Domain", type: "domain", trust: { kind: "system-record", source: "Gateway" } } }))`],
    ['grammar-fields-declared', 'an undeclared field', `queryToText({ grammar: 1, root: { kind: "group", join: "and", items: [{ kind: "condition", field: "sender_domain", operator: "is", value: "northwind.example" }] } }, defineFields({ "sender.domain": { label: "Authenticated sender domain", type: "domain", trust: { kind: "system-record", source: "Gateway" } } }))`],
    ['grammar-trust-declared', 'a field without trust', `defineFields({ d: { label: "Domain", type: "domain" } })`],
    ['grammar-trust-declared', 'an unknown trust', `defineFields({ d: { label: "Domain", type: "domain", trust: { kind: "unknown" } } })`],
    ['grammar-trust-declared', 'a system record without its source', `defineFields({ d: { label: "Domain", type: "domain", trust: { kind: "system-record" } } })`],
    ['grammar-trust-declared', 'untrusted without its writer', `defineFields({ s: { label: "Subject", type: "text", trust: { kind: "untrusted" } } })`],
    ['grammar-groups-explicit', 'a group with no join', `queryToText({ grammar: 1, root: { kind: "group", items: [{ kind: "condition", field: "d", operator: "is", value: "northwind.example" }] } }, defineFields({ d: { label: "Domain", type: "domain", trust: { kind: "system-record", source: "Gateway" } } }))`],
    ['grammar-groups-explicit', 'a group with no items', `queryToText({ grammar: 1, root: { kind: "group", join: "and", items: [] } }, defineFields({ d: { label: "Domain", type: "domain", trust: { kind: "system-record", source: "Gateway" } } }))`],
    ['grammar-groups-explicit', 'a top-level list without a group', `queryToText({ grammar: 1, root: [{ kind: "condition", field: "d", operator: "is", value: "northwind.example" }] }, defineFields({ d: { label: "Domain", type: "domain", trust: { kind: "system-record", source: "Gateway" } } }))`],
    ['grammar-groups-explicit', 'a condition as the root', `queryToText({ grammar: 1, root: { kind: "condition", field: "d", operator: "is", value: "northwind.example" } }, defineFields({ d: { label: "Domain", type: "domain", trust: { kind: "system-record", source: "Gateway" } } }))`],
  ]
  for (const [id, name, snippet] of violations) {
    writeFileSync(join(app, 'invalid.tsx'),
      `import { Button, ContextualAlert, Icon, Input, RiskPill, StatusIndicator, Table, Tabs, TextArea, Toggle } from '@omkarux/vela'\n` +
      `import { defineFields, parseQuery, validateQuery, normalise, queryToText, readback, evaluate, leftOutQuery } from '@omkarux/vela'\n` +
      `import { Checkbox, RadioGroup, Popover, Tooltip, Dialog, ToastProvider, useToast, DropdownList } from '@omkarux/vela/headless'\nexport const X = () => (${snippet})\n`)
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

  // -- Filter Grammar runs in Node, from the installed package, with no DOM --
  // The grammar is for a backend as much as the console. Import the shipped module in plain Node
  // and run a parse, a readback and an evaluate from the package root, as a backend would: a DOM
  // global touched at import or in the grammar would fail here.
  writeFileSync(join(app, 'grammar-node.mjs'), `
import { defineFields, parseQuery, readback, evaluate } from '@omkarux/vela'
const fields = defineFields({ 'sender.domain': { label: 'Authenticated sender domain', type: 'domain', trust: { kind: 'system-record', source: 'Gateway' } } })
const r = parseQuery('sender.domain is-subdomain-of "northwind.example"', fields)
if (!r.ok) throw new Error(r.errors[0].message)
console.log(readback(r.query, fields), '|', evaluate(r.query, { 'sender.domain': 'evilnorthwind.example' }, fields))
`)
  let nodeOut = ''
  try { nodeOut = run('node', ['grammar-node.mjs'], app).trim() } catch (e) { nodeOut = String(e.stderr || e.message).split('\n')[0] }
  check(nodeOut === 'Authenticated sender domain is northwind.example or one of its subdomains | no-match',
    `Filter Grammar runs in Node from the package, with no DOM (${nodeOut})`)

  // 3. the stylesheet a consumer actually imports ---------------------------
  const css = readFileSync(join(app, 'node_modules/@omkarux/vela/dist/vela.css'), 'utf8')
  check(css.includes('--vela-text-default'), 'shipped CSS defines semantic tokens')
  check(css.includes('[data-theme="dark"]'), 'shipped CSS carries the explicit dark theme')
  check(css.includes('prefers-color-scheme: dark'), 'shipped CSS respects the OS preference')
  check(css.includes('.vela-checkbox__box') && css.includes('.vela-radio__circle'),
    'shipped CSS carries the headless-born Checkbox and Radio Group styles')
  check(css.includes('.vela-table__region') && css.includes('--vela-bg-row-selected:'),
    'shipped CSS carries the Table styles and the row tokens they bind')
  check(css.includes('.vela-popover') && css.includes('.vela-tooltip') && css.includes('.vela-dialog__backdrop') && css.includes('--vela-layer-overlay:'),
    'shipped CSS carries the overlay styles and the tokens they bind')
  check(css.includes('.vela-toast-region') && css.includes('--vela-toast-width:') && css.includes('--vela-duration-toast:'),
    'shipped CSS carries the Toast styles, its width and its dwell')
  check(css.includes('.vela-dropdown-list__item') && css.includes('--vela-bg-raised-hover:') && css.includes('--vela-dropdown-list-width-min:'),
    'shipped CSS carries the Dropdown List styles, the highlight token and the minimum width they bind')
} finally {
  rmSync(app, { recursive: true, force: true })
  rmSync(tarball, { force: true })
}

console.log(`\n  ${failures === 0 ? 'Package installs, typechecks and enforces its own rules.' : `${failures} check(s) failed.`}\n`)
process.exit(failures === 0 ? 0 : 1)
