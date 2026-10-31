/**
 * What every page needs to know about a built component, without its stage: its name, group,
 * search aliases and spec. The nav, search and status pages read this, in the first chunk; the
 * stage code (registry.tsx) loads with the component's page (playground spec, B8).
 */
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
import tableMd from '../../guidelines/components/table.md?raw'
import popoverMd from '../../guidelines/components/popover.md?raw'
import tooltipMd from '../../guidelines/components/tooltip.md?raw'
import dialogMd from '../../guidelines/components/dialog.md?raw'
import toastMd from '../../guidelines/components/toast.md?raw'
import dropdownListMd from '../../guidelines/components/dropdown-list.md?raw'

export type Group = 'Actions' | 'Inputs' | 'Feedback' | 'Overlays' | 'Data'
export const GROUPS: Group[] = ['Actions', 'Inputs', 'Feedback', 'Overlays', 'Data']

export interface CatalogEntry {
  id: string
  name: string
  group: Group
  /**
   * Other names people search for (playground spec, section 10): first the names the spec's own
   * "When to use" gives, then the common names in other systems. Search only; never shown as a title.
   * An alias points only to a component whose own "When to use" covers that job (spec v1.2): a name
   * Vela has nothing for goes in search.ts's MISSING, with the nearest component, instead.
   */
  aliases: string[]
  spec: string
  /** Spec file and source folder, for the page's links. */
  file: string
  src: string
  /** What the import line names, when it is not the source folder's name (Toast: a provider and a hook). */
  imports?: string
}

export const CATALOG: CatalogEntry[] = [
  { id: 'button', file: 'button.md', src: 'Button', name: 'Button', group: 'Actions', aliases: ['action', 'call to action', 'cta'], spec: buttonMd },
  { id: 'toggle', file: 'toggle.md', src: 'Toggle', name: 'Toggle', group: 'Inputs', aliases: ['switch', 'on/off', 'toggle switch'], spec: toggleMd },
  { id: 'input', file: 'input.md', src: 'Input', name: 'Input', group: 'Inputs', aliases: ['text field', 'textbox', 'text input', 'field'], spec: inputMd },
  { id: 'text-area', file: 'text-area.md', src: 'TextArea', name: 'Text Area', group: 'Inputs', aliases: ['textarea', 'multiline', 'comment box'], spec: textAreaMd },
  { id: 'contextual-alert', file: 'contextual-alert.md', src: 'ContextualAlert', name: 'Contextual Alert', group: 'Feedback', aliases: ['banner', 'callout', 'inline alert', 'inline message', 'severity'], spec: alertMd },
  { id: 'status-indicator', file: 'status-indicator.md', src: 'StatusIndicator', name: 'Status Indicator', group: 'Feedback', aliases: ['status', 'status dot', 'health'], spec: statusMd },
  { id: 'risk-pill', file: 'risk-pill.md', src: 'RiskPill', name: 'Risk Pill', group: 'Feedback', aliases: ['risk', 'risk badge', 'risk level'], spec: riskMd },
  { id: 'tabs', file: 'tabs.md', src: 'Tabs', name: 'Tabs', group: 'Data', aliases: ['tab', 'tab bar', 'tab list'], spec: tabsMd },
  { id: 'icon', file: 'icon.md', src: 'Icon', name: 'Icon', group: 'Data', aliases: ['glyph', 'symbol', 'icons'], spec: iconMd },
  { id: 'checkbox', file: 'checkbox.md', src: 'Checkbox', name: 'Checkbox', group: 'Inputs', aliases: ['check box', 'tick box'], spec: checkboxMd },
  { id: 'radio-group', file: 'radio-group.md', src: 'RadioGroup', name: 'Radio Group', group: 'Inputs', aliases: ['radio', 'radio button', 'option buttons'], spec: radioGroupMd },
  { id: 'table', file: 'table.md', src: 'Table', name: 'Table', group: 'Data', aliases: ['data table', 'grid', 'data grid'], spec: tableMd },
  { id: 'popover', file: 'popover.md', src: 'Popover', name: 'Popover', group: 'Overlays', aliases: ['flyout', 'popup', 'pop-up'], spec: popoverMd },
  { id: 'tooltip', file: 'tooltip.md', src: 'Tooltip', name: 'Tooltip', group: 'Overlays', aliases: ['hint', 'tip', 'hover text'], spec: tooltipMd },
  { id: 'dialog', file: 'dialog.md', src: 'Dialog', name: 'Dialog', group: 'Overlays', aliases: ['modal', 'confirm', 'alert dialog', 'confirmation'], spec: dialogMd },
  { id: 'toast', file: 'toast.md', src: 'Toast', imports: 'ToastProvider, useToast', name: 'Toast', group: 'Feedback', aliases: ['snackbar', 'notification', 'flash message', 'severity'], spec: toastMd },
  { id: 'dropdown-list', file: 'dropdown-list.md', src: 'DropdownList', name: 'Dropdown List', group: 'Overlays', aliases: ['dropdown', 'menu', 'overflow menu', 'view switcher'], spec: dropdownListMd },
]

export function catalogEntry(id: string): CatalogEntry {
  const e = CATALOG.find((c) => c.id === id)
  if (!e) throw new Error(`No catalog entry for "${id}"`)
  return e
}
