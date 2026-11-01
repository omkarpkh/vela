/**
 * Component thumbnails: a shell part of the Vela site, not a kit component, never exported from the
 * package. Slice 5 of the playground uplift (the Status table and Not found's cards).
 *
 * Each picture is the real component, at its real size, never a hand drawing (Omkar's review rule 4)
 * and never scaled, so its words stay at 12px or more. It sits in a fixed frame that clips it, inert
 * and hidden from assistive technology (the caller's `Card` or row does that), so its controls are
 * never reached by Tab or heard as actions.
 *
 * The five overlays (Popover, Tooltip, Dialog, Toast, Dropdown List) have no picture: each opens
 * from a trigger into a layer over the page, so a still of it here would be either just a button or a
 * drawing. A row without a picture shows none, never a placeholder; the Status page says why once.
 */
import type { ReactNode } from 'react'
import { Button, Toggle, Input, TextArea, ContextualAlert, StatusIndicator, RiskPill, Tabs, Icon, Table, BrandMark } from '../../src'
import { Checkbox, RadioGroup, IconButton } from '../../src/headless'
import { PlusIcon } from '../../src/lib/icons'

const none = () => {}

const THUMBS: Record<string, () => ReactNode> = {
  button: () => <Button variant="primary" icon={<PlusIcon />}>Add Rule</Button>,
  'icon-button': () => <span className="shell-thumb__row"><IconButton label="Search" icon="search" onClick={none} /><IconButton label="Close" icon="x" onClick={none} /></span>,
  toggle: () => <Toggle label="Email alerts" checked onChange={none} />,
  input: () => <Input label="Tenant name" defaultValue="acme-prod" />,
  'text-area': () => <TextArea label="Justification" defaultValue="Approved for the audit window." rows={2} />,
  checkbox: () => <Checkbox label="Users" defaultChecked />,
  'radio-group': () => (
    <RadioGroup label="Enforcement" defaultValue="block">
      <RadioGroup.Radio value="monitor" label="Monitor" />
      <RadioGroup.Radio value="block" label="Block" />
    </RadioGroup>
  ),
  'contextual-alert': () => <ContextualAlert severity="major" title="Sync failed">Retrying in 5 minutes.</ContextualAlert>,
  'status-indicator': () => <span className="shell-thumb__col"><StatusIndicator status="healthy" label="Healthy" /><StatusIndicator status="unhealthy" label="Unhealthy" /></span>,
  'risk-pill': () => <span className="shell-thumb__row"><RiskPill risk="low" /><RiskPill risk="high" /></span>,
  tabs: () => (
    <Tabs defaultValue="alerts">
      <Tabs.List aria-label="Views">
        <Tabs.Trigger value="alerts" count={12}>Alerts</Tabs.Trigger>
        <Tabs.Trigger value="assets">Assets</Tabs.Trigger>
      </Tabs.List>
    </Tabs>
  ),
  icon: () => <span className="shell-thumb__row"><Icon name="shield-x" /><Icon name="search" /><Icon name="lock" /></span>,
  table: () => (
    <Table caption="Assets" density="compact">
      <Table.Head>
        <Table.Row><Table.HeaderCell>Asset</Table.HeaderCell><Table.HeaderCell>Risk</Table.HeaderCell></Table.Row>
      </Table.Head>
      <Table.Body>
        <Table.Row><Table.HeaderCell scope="row">vpn-edge-02</Table.HeaderCell><Table.Cell><RiskPill risk="high" size="small" /></Table.Cell></Table.Row>
      </Table.Body>
    </Table>
  ),
  'brand-mark': () => <span className="shell-thumb__row"><BrandMark name="github" label="GitHub" /><BrandMark name="figma" label="Figma" /></span>,
}

/** True when the component has a still picture. */
export const hasThumb = (id: string) => id in THUMBS

/** The real component, in a frame that clips it. Render it inside something inert and hidden from assistive technology. */
export function ComponentThumb({ id }: { id: string }) {
  const draw = THUMBS[id]
  if (!draw) return null
  return <div className="shell-thumb">{draw()}</div>
}
