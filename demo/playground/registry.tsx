import type { ReactNode } from 'react'
import { Button, Toggle, Input, TextArea, ContextualAlert, StatusIndicator, RiskPill, Tabs, Icon, ICON_NAMES } from '../../src'
import type { Severity, Status, Risk, IconName, IconSize, IconTone } from '../../src'
import { Tabs as HeadlessTabs, Checkbox, RadioGroup, Popover, Tooltip, Dialog } from '../../src/headless'
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
import iconMd from '../../guidelines/components/icon.md?raw'
import checkboxMd from '../../guidelines/components/checkbox.md?raw'
import radioGroupMd from '../../guidelines/components/radio-group.md?raw'
import popoverMd from '../../guidelines/components/popover.md?raw'
import tooltipMd from '../../guidelines/components/tooltip.md?raw'
import dialogMd from '../../guidelines/components/dialog.md?raw'

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
  /**
   * Shown as "Dependencies: …". Omitted, it is read from the spec's `**Dependencies:**` line — what a
   * component with a single implementation (Checkbox, Radio Group: headless only) does.
   */
  dependencies?: string
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
  /**
   * The implementations of the spec; absent means the core entry only. Two or more give the page an
   * "Implementation" control; one names the entry a headless-only component ships from.
   */
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
  {
    id: 'checkbox',
    file: 'checkbox.md',
    src: 'Checkbox',
    name: 'Checkbox',
    spec: checkboxMd,
    seed: { label: 'Accept the data-processing terms', defaultChecked: true, description: '', error: '' },
    // `checked` is the controlled arm: on this stage it would freeze the box, so the page drives
    // defaultChecked instead. name and value only mean anything inside a <form> or a Group.
    hide: ['checked'],
    noControl: ['name', 'value'],
    // Headless-born: one implementation, so no Implementation control; the Dependencies line is the spec's.
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
    id: 'radio-group',
    file: 'radio-group.md',
    src: 'RadioGroup',
    name: 'Radio Group',
    spec: radioGroupMd,
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
  // The overlays are headless-born too. Each frame of the stage renders its own trigger, and the
  // overlay it opens is portalled to <body> carrying that frame's data-theme, so the light frame's
  // popover is light and the dark frame's is dark. `open` is the controlled arm (it would pin the
  // stage open or shut); `defaultOpen` would open one overlay per frame on load — documented, not
  // demonstrated.
  {
    id: 'popover',
    file: 'popover.md',
    src: 'Popover',
    name: 'Popover',
    spec: popoverMd,
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
    id: 'tooltip',
    file: 'tooltip.md',
    src: 'Tooltip',
    name: 'Tooltip',
    spec: tooltipMd,
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
    id: 'dialog',
    file: 'dialog.md',
    src: 'Dialog',
    name: 'Dialog',
    spec: dialogMd,
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
]
