import type { ReactNode } from 'react'
import { Button, Toggle, Input, ContextualAlert, StatusIndicator, RiskPill, Tabs, Icon, ICON_NAMES } from '../../src'
import type { Severity, Status, Risk, IconName, IconSize, IconTone } from '../../src'
import { Tabs as HeadlessTabs } from '../../src/headless'
import { PlusIcon } from '../../src/lib/icons'
import { printJsx, type Control, type Spec } from './spec'
import buttonMd from '../../guidelines/components/button.md?raw'
import toggleMd from '../../guidelines/components/toggle.md?raw'
import inputMd from '../../guidelines/components/input.md?raw'
import alertMd from '../../guidelines/components/contextual-alert.md?raw'
import statusMd from '../../guidelines/components/status-indicator.md?raw'
import riskMd from '../../guidelines/components/risk-pill.md?raw'
import tabsMd from '../../guidelines/components/tabs.md?raw'
import iconMd from '../../guidelines/components/icon.md?raw'

export type Values = Record<string, string | boolean | undefined>

/**
 * One implementation of a spec. Two entry points, one playground (decisions/002): a component
 * that ships from both lists them here, the page gets an "Implementation" control, and `render`
 * reads the choice from `v.implementation` (seeded with the first entry's id).
 */
export interface Implementation {
  id: string
  /** Where a consumer imports it from. */
  entry: '@omkarux/vela' | '@omkarux/vela/headless'
  /** Shown as "Dependencies: …"; a component with one implementation reads this from its spec. */
  dependencies: string
}

export interface Entry {
  id: string
  name: string
  spec: string
  /** Spec file and source folder, for the page's links. */
  file: string
  src: string
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
  /** Alternative implementations of the same spec; absent means the core entry only. */
  implementations?: Implementation[]
  /** Mirrors the type-level rules: invalid combinations do not exist, so they cannot be picked. */
  constrain?: (v: Values) => Values
  /** Which control options are unavailable for the current values (shown, never selectable). */
  unavailable?: (v: Values) => Record<string, string[]>
  render: (v: Values) => ReactNode
  code: (v: Values, spec: Spec) => string
  /** The Token bindings row that applies to the current values, if the spec has one. */
  bindingKey?: (v: Values) => string
  /** Node id of the component set in the Figma library ("12:34"), for the deep link. */
  figma?: string
  /** Or a predicate for which of the spec's tokens the current values bind. */
  highlight?: (v: Values) => (token: string) => boolean
}

const defaultsOf = (spec: Spec) => Object.fromEntries(spec.controls.map((c) => [c.prop, c.default]))
const str = (v: string | boolean | undefined) => (typeof v === 'string' ? v : '')
const bool = (v: string | boolean | undefined) => v === true

export const REGISTRY: Entry[] = [
  {
    id: 'button',
    file: 'button.md',
    src: 'Button',
    name: 'Button',
    spec: buttonMd,
    seed: { children: 'Save Changes', variant: 'primary', icon: true },
    // type changes nothing on the stage: "submit" only means anything inside a <form>, and the
    // spec says so ("submit only for a form's commit button"). Documented, not demonstrated.
    noControl: ['type'],
    constrain: (v) =>
      v.appearance === 'text-link'
        ? { ...v, variant: 'primary', icon: false, size: v.size === 'tiny' ? 'tiny' : 'regular' }
        : v,
    unavailable: (v): Record<string, string[]> =>
      v.appearance === 'text-link'
        ? { variant: ['standard', 'destructive'], size: ['large', 'huge'], icon: ['true'] }
        : {},
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
    id: 'toggle',
    file: 'toggle.md',
    src: 'Toggle',
    name: 'Toggle',
    spec: toggleMd,
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
    id: 'input',
    file: 'input.md',
    src: 'Input',
    name: 'Input',
    spec: inputMd,
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
    id: 'contextual-alert',
    file: 'contextual-alert.md',
    src: 'ContextualAlert',
    name: 'Contextual Alert',
    spec: alertMd,
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
    id: 'status-indicator',
    file: 'status-indicator.md',
    src: 'StatusIndicator',
    name: 'Status Indicator',
    spec: statusMd,
    seed: { status: 'healthy', label: 'api-gateway-01' },
    highlight: (v) => (t) => t.includes(`-status-${str(v.status) || 'unknown'}`),
    render: (v) => <StatusIndicator status={(str(v.status) || 'unknown') as Status} label={str(v.label) || undefined} size={(str(v.size) || 'regular') as 'small' | 'regular'} />,
    code: (v, spec) => printJsx('StatusIndicator', { status: v.status, label: v.label, size: v.size }, defaultsOf(spec)),
  },
  {
    id: 'risk-pill',
    file: 'risk-pill.md',
    src: 'RiskPill',
    name: 'Risk Pill',
    spec: riskMd,
    // An empty label is the default on purpose: the pill then renders the level word, which is
    // what the spec says happens, and the printed code carries no label prop.
    seed: { risk: 'high', label: '' },
    highlight: (v) => (t) => t.includes(`-risk-${str(v.risk) || 'low'}`) || t === '--vela-radius-3',
    render: (v) => <RiskPill risk={(str(v.risk) || 'low') as Risk} label={str(v.label) || undefined} size={(str(v.size) || 'regular') as 'regular' | 'small'} />,
    code: (v, spec) => printJsx('RiskPill', { risk: v.risk, label: v.label, size: v.size }, defaultsOf(spec)),
  },
  {
    id: 'tabs',
    file: 'tabs.md',
    src: 'Tabs',
    name: 'Tabs',
    spec: tabsMd,
    seed: { implementation: 'core' },
    hide: ['defaultValue'],
    // The Phase 1 proving case: the same props through either implementation, against the same
    // spec and the same stylesheet. The values here are the ones tabs.md states under
    // "Implementations"; the spec's own `**Dependencies:**` line is the core's.
    implementations: [
      { id: 'core', entry: '@omkarux/vela', dependencies: 'none' },
      { id: 'headless', entry: '@omkarux/vela/headless', dependencies: '@base-ui/react (optional peer, via /headless)' },
    ],
    render: (v) => {
      const T = v.implementation === 'headless' ? HeadlessTabs : Tabs
      return (
        <T defaultValue="alerts" size={(str(v.size) || 'regular') as 'regular' | 'large'}>
          <T.List aria-label="Views">
            <T.Trigger value="alerts" count={12}>Alerts</T.Trigger>
            <T.Trigger value="assets" count={340}>Assets</T.Trigger>
            <T.Trigger value="audit" disabled>Audit</T.Trigger>
          </T.List>
          <T.Panel value="alerts"><p className="vela-body">Arrow keys move, Home and End jump, Audit is skipped.</p></T.Panel>
          <T.Panel value="assets"><p className="vela-body">Only the active panel is mounted.</p></T.Panel>
        </T>
      )
    },
    code: (v, spec) =>
      `${printJsx('Tabs', { defaultValue: 'alerts', size: v.size }, defaultsOf(spec)).replace(' />', '>')}
  <Tabs.List aria-label="Views">
    <Tabs.Trigger value="alerts" count={12}>Alerts</Tabs.Trigger>
    <Tabs.Trigger value="assets" count={340}>Assets</Tabs.Trigger>
    <Tabs.Trigger value="audit" disabled>Audit</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Panel value="alerts">…</Tabs.Panel>
  <Tabs.Panel value="assets">…</Tabs.Panel>
</Tabs>`,
  },
  {
    id: 'icon',
    file: 'icon.md',
    src: 'Icon',
    name: 'Icon',
    spec: iconMd,
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
]
