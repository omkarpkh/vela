import type { ReactNode } from 'react'
import { Button, Toggle, Input, TextArea, ContextualAlert, StatusIndicator, RiskPill, Tabs } from '../../src'
import type { Severity, Status, Risk } from '../../src'
import { PlusIcon } from '../../src/lib/icons'
import { printJsx, type Control, type Spec } from './spec'
import buttonMd from '../../guidelines/components/button.md?raw'
import toggleMd from '../../guidelines/components/toggle.md?raw'
import inputMd from '../../guidelines/components/input.md?raw'
import textAreaMd from '../../guidelines/components/text-area.md?raw'
import alertMd from '../../guidelines/components/contextual-alert.md?raw'
import statusMd from '../../guidelines/components/status-indicator.md?raw'
import riskMd from '../../guidelines/components/risk-pill.md?raw'
import tabsMd from '../../guidelines/components/tabs.md?raw'

export type Values = Record<string, string | boolean | undefined>

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
    id: 'text-area',
    file: 'text-area.md',
    src: 'TextArea',
    name: 'Text Area',
    spec: textAreaMd,
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
    seed: {},
    hide: ['defaultValue'],
    render: (v) => (
      <Tabs defaultValue="alerts" size={(str(v.size) || 'regular') as 'regular' | 'large'}>
        <Tabs.List aria-label="Views">
          <Tabs.Trigger value="alerts" count={12}>Alerts</Tabs.Trigger>
          <Tabs.Trigger value="assets" count={340}>Assets</Tabs.Trigger>
          <Tabs.Trigger value="audit" disabled>Audit</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Panel value="alerts"><p className="vela-body">Arrow keys move, Home and End jump, Audit is skipped.</p></Tabs.Panel>
        <Tabs.Panel value="assets"><p className="vela-body">Only the active panel is mounted.</p></Tabs.Panel>
      </Tabs>
    ),
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
]
