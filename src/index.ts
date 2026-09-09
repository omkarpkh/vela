/**
 * @omkarux/vela — public API.
 *
 * Everything exported here is a promise: renaming or removing any of it is a
 * MAJOR version. Anything not exported here is internal and free to change.
 *
 * Styles are NOT imported by this file. Consumers import them explicitly:
 *   import '@omkarux/vela/styles.css'
 * That keeps the JS bundle free of CSS side effects and leaves SSR and
 * style ordering under the consuming app's control.
 */

export { Button } from './components/Button'
export type {
  ButtonProps,
  ButtonVariant,
  ButtonSize,
  SolidButtonProps,
  TextLinkButtonProps,
} from './components/Button'

export { Toggle } from './components/Toggle'
export type { ToggleProps } from './components/Toggle'

export { Input } from './components/Input'
export type { InputProps } from './components/Input'

export { ContextualAlert } from './components/ContextualAlert'
export type { ContextualAlertProps, Severity } from './components/ContextualAlert'

export { StatusIndicator } from './components/StatusIndicator'
export type { StatusIndicatorProps, Status } from './components/StatusIndicator'

export { Tabs } from './components/Tabs'
export type { TabsProps, TabListProps, TabTriggerProps, TabPanelProps } from './components/Tabs'

export { cn } from './lib/cn'
