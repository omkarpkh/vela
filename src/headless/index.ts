/**
 * @omkarux/vela/headless — the Base UI-backed entry point. Experimental (GOVERNANCE.md).
 *
 * Same specs, same CSS, same tests as `@omkarux/vela` where a component ships from both (Tabs);
 * Checkbox, Radio Group and the three overlays (Popover, Tooltip, Dialog) were born here and ship
 * from this entry only. The behaviour comes from Base UI
 * (`@base-ui/react`, MIT), which is an OPTIONAL peer dependency: install it to import from here.
 * The default entry point `@omkarux/vela` does not import this module and keeps zero runtime
 * dependencies — `scripts/verify-pack.mjs` asserts that against the built output.
 *
 * Styles are not imported here either; `import '@omkarux/vela/styles.css'` once, as usual.
 *
 * See `decisions/002-agent-ready-direction` for why two entry points, and each component's
 * spec ("Implementations") for where this implementation and the core one differ.
 */

export { Tabs } from './Tabs'
export type { TabsProps, TabListProps, TabTriggerProps, TabPanelProps } from './Tabs'

// Headless-born: no core implementation (guidelines/components/checkbox.md, radio-group.md).
export { Checkbox } from './Checkbox'
export type { CheckboxProps, CheckboxGroupProps, CheckboxSize } from './Checkbox'
export { RadioGroup } from './RadioGroup'
export type { RadioGroupProps, RadioProps } from './RadioGroup'

// Overlays, headless-born (guidelines/components/popover.md, tooltip.md, dialog.md).
export { Popover } from './Popover'
export type { PopoverProps, PopoverPlacement, PopoverAlign, PopoverSize } from './Popover'
export { Tooltip } from './Tooltip'
export type { TooltipProps, TooltipPlacement, TooltipAlign } from './Tooltip'
export { Dialog } from './Dialog'
export type { DialogProps, DialogCloseProps, DialogSize, DialogVariant } from './Dialog'
