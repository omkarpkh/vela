import { useState, type ReactNode } from 'react'
import { Button, Toggle, Input, TextArea, ContextualAlert, StatusIndicator, RiskPill, Tabs, Icon, ICON_NAMES, Table } from '../../src'
import type { Severity, Status, Risk, IconName, IconSize, IconTone, TableSortDirection } from '../../src'
import { Tabs as HeadlessTabs, Checkbox, RadioGroup, Popover, Tooltip, Dialog, ToastProvider, useToast, DropdownList } from '../../src/headless'
import type { ToastLimit, ToastPlacement, ToastSeverity, DropdownListAlign, DropdownListItem } from '../../src/headless'
import { PlusIcon } from '../../src/lib/icons'
import { printJsx, type Control, type Spec } from './spec'
import { catalogEntry, type CatalogEntry } from './catalog'

export type Values = Record<string, string | boolean | undefined>

/**
 * One implementation of a spec. Two entry points, one playground (decisions/002): a component
 * that ships from both lists them here, the page gets an "Implementation" control, and `render`
 * reads the choice from `v.implementation` (seeded with the first entry's id).
 */
export interface Implementation {
  id: string
  /** Where a consumer imports it from; the install command follows (demo/playground/install.ts). */
  entry: '@omkarux/vela' | '@omkarux/vela/headless'
}

/**
 * The nav group, by job (playground spec, section 2). It lives here, never in a spec field (A23, C4).
 * Inputs: a value a form keeps and submits. Overlays: opens over the page from a trigger and closes
 * again. The rest follow the approved canvas.
 */
export { GROUPS, type Group } from './catalog'

/** Why a value can't be chosen now, and what would let it be. "Locked" is never shown or spoken. */
export interface Lock {
  /** The panel's heading: the value and the setting, e.g. "text-link needs primary". */
  heading: string
  /** One sentence a person can act on, e.g. "text-link is primary only." */
  reason: string
  /** The spec rule that forbids it. */
  rule: string
  /** Legal moves: each sets every prop it names, together, so the result is always legal. */
  moves: { label: string; patch: Values }[]
  /** The way out that changes nothing, naming what stays: "Keep the icon" (spec v1.2, section 5). */
  keep: string
}

export interface Entry extends CatalogEntry {
  /** Starting values for controls the spec does not default (label text, children). */
  seed: Values
  /** Controls the Props table cannot express (a callback becomes a boolean "present"). */
  extra?: Control[]
  /** Controls the table declares but the playground fixes (Tabs' children are a fixed example). */
  hide?: string[]
  /**
   * Props the playground documents but does not demonstrate: they change nothing you can see
   * here, so a control would be a switch with no consequence. Unlike `hide` they keep their
   * row under "Also in the API" — the prop is real, the demonstration is not.
   */
  noControl?: string[]
  /**
   * The implementations of the spec; absent means the core entry only. Two or more give the page an
   * "Implementation" control; one names the entry a headless-only component ships from.
   */
  implementations?: Implementation[]
  /**
   * The spec describes this component's layout by its container's width, so the page offers the
   * stage width control (playground spec, section 5, "Stage width"; A23). Reviewed in the PR, never
   * a spec field (C4).
   */
  containerResponsive?: boolean
  /** A line under the stage toolbar about how this implementation responds to its width, when it differs. */
  widthNote?: (v: Values) => string | undefined
  /** Mirrors the type-level rules: invalid combinations do not exist, so they cannot be picked. */
  constrain?: (v: Values) => Values
  /**
   * The values the spec's rules lock with the current settings (playground spec, section 5,
   * "Locked values"; specs/segmented-control.md). By prop, then by value (`'true'` for a switch).
   * A locked value stays in view and reachable, says its rule, and offers the legal moves.
   */
  locks?: (v: Values) => Record<string, Record<string, Lock>>
  /** Plain words for a prop under "Also in the API", where the spec's Notes are too terse to stand alone. */
  explain?: Record<string, string>
  render: (v: Values) => ReactNode
  code: (v: Values, spec: Spec) => string
  /** The Token bindings row that applies to the current values, if the spec has one. */
  bindingKey?: (v: Values) => string
  /** Node id of the component set in the Figma library ("12:34"), for the deep link. */
  figma?: string
  /** Or a predicate for which of the spec's tokens the current values bind. */
  highlight?: (v: Values) => (token: string) => boolean
}

// The Table page's stage: a host that owns the rows, the sort and the selection, as the spec says
// a host must. The table itself holds none of it.
const ASSETS: { name: string; status: Status; statusLabel: string; risk: Risk; findings: number; seen: string }[] = [
  { name: 'api-gateway-01', status: 'healthy', statusLabel: 'Healthy', risk: 'low', findings: 2, seen: '2026-10-29 08:12' },
  { name: 'db-primary-eu-west-1', status: 'warning', statusLabel: 'Warning', risk: 'high', findings: 41, seen: '2026-10-29 07:58' },
  { name: 'vpn-edge-02', status: 'unhealthy', statusLabel: 'Unreachable', risk: 'high', findings: 17, seen: '2026-10-28 23:40' },
  { name: 'build-runner-14', status: 'medium', statusLabel: 'Degraded', risk: 'medium', findings: 9, seen: '2026-10-29 06:03' },
  { name: 'laptop-omk-7f3a9c2e', status: 'unknown', statusLabel: 'No agent', risk: 'medium', findings: 0, seen: '2026-10-21 17:30' },
  { name: 'k8s-node-pool-b-3', status: 'healthy', statusLabel: 'Healthy', risk: 'low', findings: 1204, seen: '2026-10-29 08:10' },
  { name: 'mail-relay-01', status: 'healthy', statusLabel: 'Healthy', risk: 'low', findings: 3, seen: '2026-10-29 08:01' },
]
type AssetKey = 'name' | 'findings' | 'seen'

function TableStage({ v }: { v: Values }) {
  const [sort, setSort] = useState<{ key: AssetKey; direction: TableSortDirection }>({ key: 'name', direction: 'ascending' })
  const [picked, setPicked] = useState<Set<string>>(() => new Set(['db-primary-eu-west-1']))
  const rows = [...ASSETS].sort((a, b) => {
    const d = sort.key === 'findings' ? a.findings - b.findings : String(a[sort.key]).localeCompare(String(b[sort.key]))
    return sort.direction === 'descending' ? -d : d
  })
  const sortOf = (key: AssetKey) => ({
    direction: sort.key === key ? sort.direction : ('none' as const),
    onSort: (next: 'ascending' | 'descending') => setSort({ key, direction: next }),
  })
  const empty = bool(v.empty)
  return (
    <Table
      caption={str(v.caption) || 'Assets'}
      captionHidden={bool(v.captionHidden)}
      density={(str(v.density) || 'comfortable') as 'comfortable' | 'compact'}
      layout={(str(v.layout) || 'auto') as 'auto' | 'fixed'}
      stickyHeader={bool(v.stickyHeader)}
      className={bool(v.stickyHeader) ? 'pg-table-bounded' : undefined}
    >
      <Table.Head>
        <Table.Row>
          <Table.HeaderCell><span className="vela-sr-only">Selected</span></Table.HeaderCell>
          <Table.HeaderCell sort={sortOf('name')}>Asset</Table.HeaderCell>
          <Table.HeaderCell>Status</Table.HeaderCell>
          <Table.HeaderCell>Risk</Table.HeaderCell>
          <Table.HeaderCell align="end" sort={sortOf('findings')}>Open findings</Table.HeaderCell>
          <Table.HeaderCell sort={sortOf('seen')}>Last seen</Table.HeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {empty ? (
          <Table.Empty colSpan={6}>No assets match these filters</Table.Empty>
        ) : (
          rows.map((r) => (
            <Table.Row key={r.name} selected={picked.has(r.name)}>
              <Table.Cell>
                <Checkbox
                  label={`Select ${r.name}`}
                  size="tiny"
                  checked={picked.has(r.name)}
                  onCheckedChange={(on) => setPicked((p) => { const n = new Set(p); if (on) n.add(r.name); else n.delete(r.name); return n })}
                />
              </Table.Cell>
              <Table.HeaderCell scope="row">{r.name}</Table.HeaderCell>
              <Table.Cell><StatusIndicator status={r.status} label={r.statusLabel} /></Table.Cell>
              <Table.Cell><RiskPill risk={r.risk} size="small" /></Table.Cell>
              <Table.Cell numeric>{r.findings.toLocaleString('en-US')}</Table.Cell>
              <Table.Cell>{r.seen}</Table.Cell>
            </Table.Row>
          ))
        )}
      </Table.Body>
    </Table>
  )
}

const defaultsOf = (spec: Spec) => Object.fromEntries(spec.controls.map((c) => [c.prop, c.default]))
const str = (v: string | boolean | undefined) => (typeof v === 'string' ? v : '')
const bool = (v: string | boolean | undefined) => v === true

/**
 * The Toast stage: a Save button that raises a toast with the page's current options. The page
 * keeps its own record of every save, and the Undo the toast offers is the same Undo the page
 * shows — a toast is never the only record and never the only Undo (toast.md).
 */
function ToastStage({ v }: { v: Values }) {
  const toast = useToast()
  const [saves, setSaves] = useState(0)
  const severity = (str(v.severity) || 'info') as ToastSeverity
  const undo = () => setSaves((n) => Math.max(0, n - 1))
  return (
    <div className="pg-toast-stage">
      <Button
        onClick={() => {
          setSaves((n) => n + 1)
          toast.add({
            severity,
            title: str(v.title) || 'Title',
            description: str(v.description) || undefined,
            action: bool(v.action) ? { label: 'Undo', onClick: undo } : undefined,
          })
        }}
      >
        Save Changes
      </Button>
      <p className="vela-body pg-overlay-copy">
        {saves === 0 ? 'Nothing saved yet.' : `Saved ${saves} ${saves === 1 ? 'time' : 'times'} — the page keeps the record.`}
      </p>
      {saves > 0 && (
        <Button size="tiny" onClick={undo}>
          Undo Last Save
        </Button>
      )}
    </div>
  )
}

/**
 * The Dropdown List stage: a host that owns the current view, as the spec's controlled example
 * does, and shows it on the page. One name is long enough to wrap, one is a single unbroken string
 * whose meta drops under it, three items have meta, and one is locked, with the setting that rules it out as its reason.
 */
const VIEWS: [DropdownListItem, ...DropdownListItem[]] = [
  { value: 'alerts', label: 'All alerts' },
  { value: 'firewall', label: 'Firewall', meta: '1 new' },
  { value: 'dlp', label: 'Data loss prevention — policy violations across every connected SaaS tenant' },
  { value: 'pipeline', label: 'customer-ingest-pipeline-eu-west-2', meta: '2 new' },
  { value: 'archive', label: 'Archive', locked: { reason: 'Needs retention on' } },
  { value: 'reports', label: 'Reports', meta: '3 open' },
]

function DropdownListStage({ v }: { v: Values }) {
  const [view, setView] = useState('firewall')
  const current = VIEWS.find((i) => i.value === view)!
  return (
    <div className="pg-dropdown-stage">
      <DropdownList
        label={str(v.label) || 'Views'}
        trigger={<Button>Switch View</Button>}
        items={VIEWS}
        value={view}
        onValueChange={setView}
        align={(str(v.align) || 'start') as DropdownListAlign}
      />
      <p className="vela-body pg-overlay-copy">Showing {current.label}</p>
    </div>
  )
}

// The Tabs stage's example: ten security views, so narrowing the stage width shows tabs leaving the
// row for the "more" control (playground spec, section 5; the playground thread's list, 1 Nov 2026).
const TAB_EXAMPLE: { value: string; label: string; count?: number; disabled?: boolean; panel: string }[] = [
  { value: 'overview', label: 'Overview', panel: 'Everything at a glance.' },
  { value: 'alerts', label: 'Alerts', count: 12, panel: 'Arrow keys move, Home and End jump, Audit log is skipped.' },
  { value: 'assets', label: 'Assets', count: 340, panel: 'Only the active panel is mounted.' },
  { value: 'identities', label: 'Identities', panel: 'People and service accounts.' },
  { value: 'policies', label: 'Policies', panel: 'What is allowed, and where.' },
  { value: 'devices', label: 'Devices', panel: 'Laptops, phones and servers.' },
  { value: 'reports', label: 'Reports', panel: 'Scheduled and saved reports.' },
  { value: 'audit', label: 'Audit log', disabled: true, panel: '' },
  { value: 'sessions', label: 'Sessions', panel: 'Who is signed in now.' },
  { value: 'integrations', label: 'Integrations', panel: 'Connected tools.' },
]

export const REGISTRY: Entry[] = [
  {
    ...catalogEntry('button'),
    seed: { children: 'Save Changes', variant: 'primary', icon: true },
    // type changes nothing on the stage: "submit" only means anything inside a <form>, and the
    // spec says so ("submit only for a form's commit button"). Documented, not demonstrated.
    noControl: ['type'],
    explain: {
      type: '`type` sets what a click does when the button sits inside a form. With "submit", clicking it sends the form. With "button" (the default), clicking it only runs your own code. It is not the label.',
    },
    // The spec's two text-link rules, as locks rather than silent corrections: text-link is primary
    // only (button-text-link-requires-primary), and tiny or regular with no icon
    // (button-text-link-size-and-icon). Each locked value says which rule, and how to get there.
    locks: (v) => {
      const out: Record<string, Record<string, Lock>> = {}
      const PRIMARY = { reason: 'text-link is primary only.', rule: 'button-text-link-requires-primary' }
      const SIZE = { reason: 'text-link is tiny or regular only.', rule: 'button-text-link-size-and-icon' }
      const ICON = { reason: 'text-link never carries an icon.', rule: 'button-text-link-size-and-icon' }
      if (v.appearance === 'text-link') {
        out.variant = Object.fromEntries((['standard', 'destructive'] as const).map((x) => [x, {
          heading: `${x} needs filled or hollow`, ...PRIMARY, keep: 'Keep text-link',
          moves: [{ label: `Use ${x}, filled`, patch: { variant: x, appearance: 'filled' } }, { label: `Use ${x}, hollow`, patch: { variant: x, appearance: 'hollow' } }],
        }]))
        out.size = Object.fromEntries((['large', 'huge'] as const).map((x) => [x, {
          heading: `${x} needs filled or hollow`, ...SIZE, keep: 'Keep text-link',
          moves: [{ label: `Use ${x}, filled`, patch: { size: x, appearance: 'filled' } }, { label: `Use ${x}, hollow`, patch: { size: x, appearance: 'hollow' } }],
        }]))
        out.icon = { true: { heading: 'An icon needs filled or hollow', ...ICON, keep: 'Keep text-link', moves: [{ label: 'Add the icon, filled', patch: { icon: true, appearance: 'filled' } }] } }
        return out
      }
      // text-link from here: everything it needs, named, and one move that sets it all at once.
      const needs: { what: string; stays: string; reason: string; rule: string; patch: Values }[] = []
      if (v.variant !== 'primary') needs.push({ what: 'primary', stays: String(v.variant), ...PRIMARY, patch: { variant: 'primary' } })
      if (v.size === 'large' || v.size === 'huge') needs.push({ what: 'regular size', stays: String(v.size), ...SIZE, patch: { size: 'regular' } })
      if (v.icon === true) needs.push({ what: 'no icon', stays: 'the icon', ...ICON, patch: { icon: false } })
      if (needs.length > 0) {
        const patch = Object.assign({ appearance: 'text-link' }, ...needs.map((n) => n.patch)) as Values
        out.appearance = { 'text-link': {
          heading: `text-link needs ${needs.map((n) => n.what).join(' and ')}`,
          reason: needs.map((n) => n.reason).join(' '), rule: needs[0].rule,
          keep: `Keep ${needs.map((n) => n.stays).join(' and ')}`,
          moves: [{ label: `Switch to ${needs.map((n) => n.what).join(', ')}, text-link`, patch }],
        } }
      }
      return out
    },
    render: (v) => (
      <Button
        variant={(str(v.variant) || 'standard') as 'primary' | 'standard' | 'destructive'}
        appearance={(str(v.appearance) || 'filled') as 'filled' | 'hollow'}
        size={(str(v.size) || 'regular') as 'tiny' | 'regular' | 'large' | 'huge'}
        disabled={bool(v.disabled)}
        loading={bool(v.loading)}
        icon={bool(v.icon) ? <PlusIcon /> : undefined}
      >
        {str(v.children) || 'Label'}
      </Button>
    ),
    code: (v, spec) =>
      printJsx(
        'Button',
        { variant: v.variant, appearance: v.appearance, size: v.size, disabled: v.disabled, loading: v.loading, type: v.type },
        defaultsOf(spec),
        str(v.children) || 'Label',
        bool(v.icon) ? { icon: '<PlusIcon />' } : {},
      ),
    bindingKey: (v) => (bool(v.disabled) ? 'disabled (any)' : `${str(v.variant) || 'standard'} · ${str(v.appearance) || 'filled'}`),
  },
  {
    ...catalogEntry('toggle'),
    seed: { label: 'Email alerts', defaultChecked: true },
    render: (v) => (
      <Toggle
        key={String(v.defaultChecked)}
        label={str(v.label) || 'Label'}
        defaultChecked={bool(v.defaultChecked)}
        disabled={bool(v.disabled)}
        labelPosition={(str(v.labelPosition) || 'right') as 'right' | 'left'}
        size={(str(v.size) || 'regular') as 'tiny' | 'regular'}
      />
    ),
    code: (v, spec) =>
      printJsx('Toggle', { label: v.label, defaultChecked: v.defaultChecked, disabled: v.disabled, labelPosition: v.labelPosition, size: v.size }, defaultsOf(spec)),
  },
  {
    ...catalogEntry('input'),
    seed: { label: 'Tenant name', hint: 'Lowercase letters only', error: '' },
    render: (v) => (
      <Input
        label={str(v.label) || 'Label'}
        hint={str(v.hint) || undefined}
        error={str(v.error) || undefined}
        size={(str(v.size) || 'regular') as 'tiny' | 'regular' | 'large'}
        required={bool(v.required)}
        placeholder="acme-prod"
      />
    ),
    code: (v, spec) => printJsx('Input', { label: v.label, hint: v.hint, error: v.error, size: v.size, required: v.required }, defaultsOf(spec)),
  },
  {
    ...catalogEntry('text-area'),
    seed: { label: 'Justification', hint: 'Shown to the approver', error: '', defaultValue: 'Blocking the transfer: the destination bucket is public.' },
    // `value` is the controlled arm: on this stage it would freeze the field, so the page drives
    // defaultValue instead. rows and maxLength are numbers, so they become selects of a few values.
    hide: ['value'],
    extra: [
      { prop: 'rows', kind: 'select', type: 'number', options: ['2', '3', '5'], default: '3', notes: 'Minimum height, in lines.' },
      { prop: 'maxLength', kind: 'select', type: 'number', options: ['none', '140', '280'], default: '140', notes: 'The limit, in characters; shows the live count.' },
    ],
    render: (v) => (
      <TextArea
        label={str(v.label) || 'Label'}
        defaultValue={str(v.defaultValue)}
        hint={str(v.hint) || undefined}
        error={str(v.error) || undefined}
        size={(str(v.size) || 'regular') as 'tiny' | 'regular' | 'large'}
        rows={Number(str(v.rows) || 3)}
        maxLength={str(v.maxLength) && v.maxLength !== 'none' ? Number(v.maxLength) : undefined}
        resize={(str(v.resize) || 'vertical') as 'vertical' | 'none'}
        disabled={bool(v.disabled)}
        readOnly={bool(v.readOnly)}
        required={bool(v.required)}
        placeholder="Why is this action needed?"
      />
    ),
    code: (v, spec) =>
      printJsx(
        'TextArea',
        { label: v.label, hint: v.hint, error: v.error, size: v.size, resize: v.resize, disabled: v.disabled, readOnly: v.readOnly, required: v.required },
        defaultsOf(spec),
        undefined,
        {
          ...(str(v.rows) && v.rows !== '3' ? { rows: str(v.rows) } : {}),
          ...(str(v.maxLength) && v.maxLength !== 'none' ? { maxLength: str(v.maxLength) } : {}),
        },
      ),
  },
  {
    ...catalogEntry('contextual-alert'),
    seed: { severity: 'warning', title: 'Scan incomplete', children: 'The scan could not reach 3 of 12 hosts.', onDismiss: true },
    extra: [{ prop: 'onDismiss', kind: 'boolean', type: '() => void', default: false, notes: 'Present → the alert can be dismissed.' }],
    render: (v) => (
      <ContextualAlert
        severity={(str(v.severity) || 'info') as Severity}
        title={str(v.title) || undefined}
        onDismiss={bool(v.onDismiss) ? () => {} : undefined}
        dismissLabel={str(v.dismissLabel) || undefined}
      >
        {str(v.children) || 'Body text.'}
      </ContextualAlert>
    ),
    highlight: (v) => (t) => t.includes(`-severity-${str(v.severity) || 'info'}`),
    code: (v, spec) =>
      printJsx('ContextualAlert', { severity: v.severity, title: v.title, dismissLabel: v.dismissLabel }, defaultsOf(spec), str(v.children), bool(v.onDismiss) ? { onDismiss: 'close' } : {}),
  },
  {
    ...catalogEntry('status-indicator'),
    seed: { status: 'healthy', label: 'api-gateway-01' },
    highlight: (v) => (t) => t.includes(`-status-${str(v.status) || 'unknown'}`),
    render: (v) => <StatusIndicator status={(str(v.status) || 'unknown') as Status} label={str(v.label) || undefined} size={(str(v.size) || 'regular') as 'small' | 'regular'} />,
    code: (v, spec) => printJsx('StatusIndicator', { status: v.status, label: v.label, size: v.size }, defaultsOf(spec)),
  },
  {
    ...catalogEntry('risk-pill'),
    // An empty label is the default on purpose: the pill then renders the level word, which is
    // what the spec says happens, and the printed code carries no label prop.
    seed: { risk: 'high', label: '' },
    highlight: (v) => (t) => t.includes(`-risk-${str(v.risk) || 'low'}`) || t === '--vela-radius-3',
    render: (v) => <RiskPill risk={(str(v.risk) || 'low') as Risk} label={str(v.label) || undefined} size={(str(v.size) || 'regular') as 'regular' | 'small'} />,
    code: (v, spec) => printJsx('RiskPill', { risk: v.risk, label: v.label, size: v.size }, defaultsOf(spec)),
  },
  {
    ...catalogEntry('tabs'),
    // The spec's Props table gives size no default; the code's is regular. Seeded so a current value
    // shows (a segment row with nothing current is not a legal state); the gap goes to the spec thread.
    seed: { implementation: 'core', size: 'regular' },
    containerResponsive: true,
    // Overflow will be headless only (Omkar, 30 Oct), but the "more" control is designed, not built
    // (motion/tabs-overflow-control.md): today both implementations scroll the row. Say so.
    widthNote: (v) => (v.implementation === 'headless'
      ? 'Tabs scrolls the row sideways when it is full. The "more" control for the headless Tabs is designed but not built yet.'
      : 'Core Tabs scrolls the row sideways when it is full. The "more" control will be in the headless Tabs; it is designed but not built yet.'),
    hide: ['defaultValue'],
    // The Phase 1 proving case: the same props through either implementation, against the same
    // spec and the same stylesheet. The entries are the ones tabs.md states under "Implementations".
    implementations: [
      { id: 'core', entry: '@omkarux/vela' },
      { id: 'headless', entry: '@omkarux/vela/headless' },
    ],
    render: (v) => {
      const T = v.implementation === 'headless' ? HeadlessTabs : Tabs
      return (
        <T defaultValue="alerts" size={(str(v.size) || 'regular') as 'regular' | 'large'}>
          <T.List aria-label="Views">
            {TAB_EXAMPLE.map((t) => <T.Trigger key={t.value} value={t.value} count={t.count} disabled={t.disabled}>{t.label}</T.Trigger>)}
          </T.List>
          {TAB_EXAMPLE.filter((t) => !t.disabled).map((t) => (
            <T.Panel key={t.value} value={t.value}><p className="vela-body">{t.panel}</p></T.Panel>
          ))}
        </T>
      )
    },
    code: (v, spec) =>
      `${printJsx('Tabs', { defaultValue: 'alerts', size: v.size }, defaultsOf(spec)).replace(' />', '>')}
  <Tabs.List aria-label="Views">
${TAB_EXAMPLE.map((t) => `    <Tabs.Trigger value="${t.value}"${t.count !== undefined ? ` count={${t.count}}` : ''}${t.disabled ? ' disabled' : ''}>${t.label}</Tabs.Trigger>`).join('\n')}
  </Tabs.List>
${TAB_EXAMPLE.filter((t) => !t.disabled).map((t) => `  <Tabs.Panel value="${t.value}">…</Tabs.Panel>`).join('\n')}
</Tabs>`,
  },
  {
    ...catalogEntry('icon'),
    seed: { name: 'shield-x', label: '' },
    // `name` is the IconName union — fifty literals the Props table names by type rather than
    // spelling out — so its control is built here from ICON_NAMES, the same list the type is.
    extra: [{ prop: 'name', kind: 'select', type: 'IconName', options: [...ICON_NAMES], default: 'shield-x', notes: 'One of the fifty curated glyphs.' }],
    // className is layout for the host page; it changes nothing on this stage.
    noControl: ['className'],
    highlight: (v) => (t) =>
      t === ({ small: '--vela-icon-size-small', regular: '--vela-icon-size', large: '--vela-icon-size-large' }[str(v.size) || 'regular']) ||
      t === '--vela-icon-stroke' ||
      t === ({ default: '--vela-icon-strong', muted: '--vela-icon-default', inherit: '' }[str(v.tone) || 'default']),
    render: (v) => {
      const size = (str(v.size) || 'regular') as IconSize
      const tone = (str(v.tone) || 'default') as IconTone
      return (
        <div className="pg-icon">
          <p className="vela-body pg-icon__lead">
            <Icon name={(str(v.name) || 'shield-x') as IconName} size={size} tone={tone} label={str(v.label) || undefined} />
            <span>{str(v.name) || 'shield-x'}</span>
          </p>
          <ul className="pg-icon__grid" aria-label="Every glyph at this size and tone">
            {ICON_NAMES.map((n) => (
              <li key={n} className="vela-meta pg-icon__cell" title={n}>
                <Icon name={n} size={size} tone={tone} />
                <span className="pg-icon__name">{n}</span>
              </li>
            ))}
          </ul>
        </div>
      )
    },
    code: (v, spec) => printJsx('Icon', { name: str(v.name) || 'shield-x', size: v.size, tone: v.tone, label: v.label }, defaultsOf(spec)),
  },
  {
    ...catalogEntry('checkbox'),
    seed: { label: 'Accept the data-processing terms', defaultChecked: true, description: '', error: '' },
    // `checked` is the controlled arm: on this stage it would freeze the box, so the page drives
    // defaultChecked instead. name and value only mean anything inside a <form> or a Group.
    hide: ['checked'],
    noControl: ['name', 'value'],
    // Headless-born: one implementation, so no Implementation control; the install names Base UI.
    implementations: [{ id: 'headless', entry: '@omkarux/vela/headless' }],
    render: (v) => (
      <Checkbox
        label={str(v.label) || 'Label'}
        defaultChecked={bool(v.defaultChecked)}
        indeterminate={bool(v.indeterminate)}
        disabled={bool(v.disabled)}
        size={(str(v.size) || 'regular') as 'regular' | 'tiny'}
        description={str(v.description) || undefined}
        error={str(v.error) || undefined}
      />
    ),
    code: (v, spec) =>
      printJsx(
        'Checkbox',
        { label: v.label, defaultChecked: v.defaultChecked, indeterminate: v.indeterminate, disabled: v.disabled, size: v.size, description: v.description, error: v.error },
        defaultsOf(spec),
      ),
    bindingKey: (v) =>
      bool(v.disabled) ? 'disabled (any)' : str(v.error) ? 'error (any)' : bool(v.defaultChecked) || bool(v.indeterminate) ? 'checked / indeterminate' : 'unchecked',
  },
  {
    ...catalogEntry('radio-group'),
    seed: { label: 'Enforcement', defaultValue: 'block', error: '' },
    // `value` is the controlled arm (it would freeze the stage); `defaultValue` becomes a select of
    // the three enabled options below. name only means anything inside a <form>.
    hide: ['value', 'defaultValue'],
    noControl: ['name'],
    extra: [{ prop: 'defaultValue', kind: 'select', type: 'string', options: ['monitor', 'block', 'quarantine'], default: 'block', notes: 'Uncontrolled initial selection.' }],
    implementations: [{ id: 'headless', entry: '@omkarux/vela/headless' }],
    render: (v) => (
      <RadioGroup
        label={str(v.label) || 'Label'}
        defaultValue={str(v.defaultValue) || undefined}
        disabled={bool(v.disabled)}
        orientation={(str(v.orientation) || 'vertical') as 'vertical' | 'horizontal'}
        error={str(v.error) || undefined}
      >
        <RadioGroup.Radio value="monitor" label="Monitor" description="Log the match, allow the traffic" />
        <RadioGroup.Radio value="block" label="Block" />
        <RadioGroup.Radio value="isolate" label="Isolate" disabled />
        <RadioGroup.Radio value="quarantine" label="Quarantine" />
      </RadioGroup>
    ),
    code: (v, spec) =>
      `${printJsx('RadioGroup', { label: v.label, defaultValue: v.defaultValue, disabled: v.disabled, orientation: v.orientation, error: v.error }, defaultsOf(spec)).replace(' />', '>')}
  <RadioGroup.Radio value="monitor" label="Monitor" description="Log the match, allow the traffic" />
  <RadioGroup.Radio value="block" label="Block" />
  <RadioGroup.Radio value="isolate" label="Isolate" disabled />
  <RadioGroup.Radio value="quarantine" label="Quarantine" />
</RadioGroup>`,
    bindingKey: (v) => (bool(v.disabled) ? 'disabled (any)' : str(v.error) ? 'error (any)' : str(v.defaultValue) ? 'selected' : 'unselected'),
  },
  {
    ...catalogEntry('table'),
    seed: { caption: 'Assets' },
    // children is the composition below, not a value a control can hold.
    hide: ['children'],
    extra: [{ prop: 'empty', kind: 'boolean', type: 'boolean', default: false, notes: 'Stage only: render Table.Empty instead of the rows.' }],
    render: (v) => <TableStage v={v} />,
    highlight: () => (t) => /--vela-(bg-row-|bg-global|border-(default|subtle|active)|text-default|icon-default)/.test(t),
    code: (v, spec) =>
      `${printJsx('Table', { caption: v.caption, captionHidden: v.captionHidden, density: v.density, layout: v.layout, stickyHeader: v.stickyHeader }, defaultsOf(spec)).replace(' />', '>')}
  <Table.Head>
    <Table.Row>
      <Table.HeaderCell sort={{ direction: sort.name, onSort: (next) => setSort({ name: next }) }}>Asset</Table.HeaderCell>
      <Table.HeaderCell>Status</Table.HeaderCell>
      <Table.HeaderCell align="end" sort={…}>Open findings</Table.HeaderCell>
    </Table.Row>
  </Table.Head>
  <Table.Body>
    ${bool(v.empty) ? '<Table.Empty colSpan={6}>No assets match these filters</Table.Empty>' : `{rows.map((r) => (
      <Table.Row key={r.id} selected={picked.has(r.id)}>
        <Table.Cell><Checkbox label={\`Select \${r.name}\`} size="tiny" … /></Table.Cell>
        <Table.HeaderCell scope="row">{r.name}</Table.HeaderCell>
        <Table.Cell><StatusIndicator status={r.status} label={r.statusLabel} /></Table.Cell>
        <Table.Cell numeric>{r.findings}</Table.Cell>
      </Table.Row>
    ))}`}
  </Table.Body>
</Table>`,
  },
  // The overlays are headless-born too. Each frame of the stage renders its own trigger, and the
  // overlay it opens is portalled to <body> carrying that frame's data-theme, so the light frame's
  // popover is light and the dark frame's is dark. `open` is the controlled arm (it would pin the
  // stage open or shut); `defaultOpen` would open one overlay per frame on load — documented, not
  // demonstrated.
  {
    ...catalogEntry('popover'),
    seed: { title: 'Filter alerts', children: 'Show alerts from the last 24 hours, critical and major only.' },
    hide: ['open'],
    noControl: ['defaultOpen'],
    implementations: [{ id: 'headless', entry: '@omkarux/vela/headless' }],
    render: (v) => (
      <Popover
        trigger={<Button>Filters</Button>}
        title={str(v.title) || 'Title'}
        placement={(str(v.placement) || 'bottom') as 'top' | 'bottom' | 'start' | 'end'}
        align={(str(v.align) || 'center') as 'start' | 'center' | 'end'}
        size={(str(v.size) || 'regular') as 'regular' | 'wide'}
      >
        <p className="vela-body pg-overlay-copy">{str(v.children) || 'Body text.'}</p>
        <Button size="tiny">Apply Filters</Button>
      </Popover>
    ),
    code: (v, spec) =>
      `${printJsx('Popover', { title: v.title, placement: v.placement, align: v.align, size: v.size }, defaultsOf(spec), undefined, { trigger: '<Button>Filters</Button>' }).replace(' />', '>')}
  <p>${str(v.children) || 'Body text.'}</p>
  <Button size="tiny">Apply Filters</Button>
</Popover>`,
  },
  {
    ...catalogEntry('tooltip'),
    seed: { content: 'Download the last 24 hours as CSV' },
    implementations: [{ id: 'headless', entry: '@omkarux/vela/headless' }],
    render: (v) => (
      <Tooltip
        content={str(v.content) || 'Label'}
        placement={(str(v.placement) || 'top') as 'top' | 'bottom' | 'start' | 'end'}
        align={(str(v.align) || 'center') as 'start' | 'center' | 'end'}
      >
        <Button>Export</Button>
      </Tooltip>
    ),
    code: (v, spec) =>
      `${printJsx('Tooltip', { content: v.content, placement: v.placement, align: v.align }, defaultsOf(spec)).replace(' />', '>')}
  <Button>Export</Button>
</Tooltip>`,
  },
  {
    ...catalogEntry('dialog'),
    seed: {
      variant: 'standard',
      title: 'Edit policy',
      description: 'Changes apply to every tenant on save.',
      children: 'Rules in this policy apply in the order they are listed.',
      cancelLabel: 'Keep Policy',
      confirmLabel: 'Delete Policy',
    },
    hide: ['open'],
    noControl: ['defaultOpen'],
    implementations: [{ id: 'headless', entry: '@omkarux/vela/headless' }],
    render: (v) => {
      const common = {
        title: str(v.title) || 'Title',
        description: str(v.description) || undefined,
        size: (str(v.size) || 'regular') as 'regular' | 'wide',
      }
      return v.variant === 'alert' ? (
        <Dialog
          {...common}
          variant="alert"
          trigger={<Button variant="destructive">Delete Policy</Button>}
          cancelLabel={str(v.cancelLabel) || 'Cancel'}
          confirmLabel={str(v.confirmLabel) || 'Delete'}
          onConfirm={() => {}}
        />
      ) : (
        <Dialog
          {...common}
          trigger={<Button>Edit Policy</Button>}
          closeLabel={str(v.closeLabel) || undefined}
          footer={
            <>
              <Dialog.Close><Button>Cancel</Button></Dialog.Close>
              <Dialog.Close><Button variant="primary">Save Changes</Button></Dialog.Close>
            </>
          }
        >
          <p className="vela-body pg-overlay-copy">{str(v.children) || 'Body text.'}</p>
          <Input label="Policy name" defaultValue="Block legacy TLS" />
        </Dialog>
      )
    },
    code: (v, spec) =>
      v.variant === 'alert'
        ? printJsx(
            'Dialog',
            { variant: 'alert', title: v.title, description: v.description, size: v.size, cancelLabel: v.cancelLabel, confirmLabel: v.confirmLabel },
            defaultsOf(spec),
            undefined,
            { trigger: '<Button variant="destructive">Delete Policy</Button>', onConfirm: 'deletePolicy' },
          )
        : `${printJsx('Dialog', { title: v.title, description: v.description, size: v.size, closeLabel: v.closeLabel }, defaultsOf(spec), undefined, {
            trigger: '<Button>Edit Policy</Button>',
            footer: '<><Dialog.Close><Button>Cancel</Button></Dialog.Close><Button variant="primary" onClick={save}>Save Changes</Button></>',
          }).replace(' />', '>')}
  <p>${str(v.children) || 'Body text.'}</p>
  <Input label="Policy name" defaultValue="Block legacy TLS" />
</Dialog>`,
  },
  // Toast is headless-born. Each frame renders its own ToastProvider, so a toast raised from the
  // dark frame is portalled carrying that frame's theme. The spec's root part is `Toast` — the
  // options `add` takes — so those are the generated controls; the provider's placement and limit
  // and the presence of an action are extras. `label` and `dismissLabel` change only accessible
  // names: documented, not demonstrated.
  {
    ...catalogEntry('toast'),
    seed: { severity: 'success', title: 'Policy saved', description: 'Block legacy TLS now applies to 14 tenants.', action: false },
    extra: [
      { prop: 'action', kind: 'boolean', type: '{ label: string; onClick: () => void }', default: false, notes: 'Present → an Undo, a shortcut to the Undo on the page. A toast with an action never times out.' },
      { prop: 'placement', kind: 'select', type: '"bottom-end" | "top-end" | "bottom-center"', options: ['bottom-end', 'top-end', 'bottom-center'], default: 'bottom-end', notes: 'ToastProvider: where the region sits.' },
      { prop: 'limit', kind: 'select', type: '1 | 2 | 3', options: ['1', '2', '3'], default: '3', notes: 'ToastProvider: how many toasts show at once.' },
    ],
    noControl: ['label', 'dismissLabel'],
    implementations: [{ id: 'headless', entry: '@omkarux/vela/headless' }],
    highlight: (v) => (t) => t === `--vela-icon-severity-${str(v.severity) || 'info'}` || t === '--vela-bg-raised' || t === '--vela-toast-width',
    render: (v) => (
      <ToastProvider
        placement={(str(v.placement) || 'bottom-end') as ToastPlacement}
        limit={Number(str(v.limit) || '3') as ToastLimit}
      >
        <ToastStage v={v} />
      </ToastProvider>
    ),
    code: (v) => {
      const provider = [
        str(v.placement) && v.placement !== 'bottom-end' ? ` placement="${v.placement}"` : '',
        str(v.limit) && v.limit !== '3' ? ` limit={${v.limit}}` : '',
      ].join('')
      const opts = [
        str(v.severity) && v.severity !== 'info' ? `severity: '${v.severity}'` : '',
        `title: '${str(v.title) || 'Title'}'`,
        str(v.description) ? `description: '${v.description}'` : '',
        bool(v.action) ? `action: { label: 'Undo', onClick: undoSave }` : '',
      ].filter(Boolean).join(', ')
      return `<ToastProvider${provider}>
  <App />
</ToastProvider>

// in App, after the save has landed and the page shows it:
const toast = useToast()
toast.add({ ${opts} })`
    },
  },
  // Dropdown List is headless-born, on Base UI's Menu. The stage is a host that owns the current
  // view, so `value` is the controlled arm the stage uses; `defaultValue` and `defaultOpen` would
  // seed one list per frame and `open` would pin it — documented, not demonstrated.
  {
    ...catalogEntry('dropdown-list'),
    seed: { label: 'Views' },
    hide: ['value', 'open'],
    noControl: ['defaultValue', 'defaultOpen'],
    implementations: [{ id: 'headless', entry: '@omkarux/vela/headless' }],
    highlight: () => (t) => /--vela-(bg-raised|border-default|text-(default|link|inactive)|popover-width|dropdown-list-width-min)/.test(t),
    render: (v) => <DropdownListStage v={v} />,
    code: (v, spec) =>
      printJsx('DropdownList', { label: v.label, align: v.align }, defaultsOf(spec), undefined, {
        trigger: '<Button>Switch View</Button>',
        items: 'views',
        value: 'view',
        onValueChange: 'setView',
      }),
  },
]
