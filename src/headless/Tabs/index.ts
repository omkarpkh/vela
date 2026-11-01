export { Tabs } from './Tabs'
// The same prop types as the core implementation, on purpose: one API, two implementations. The
// trigger is the one difference: the headless one adds `unseen` for its overflow control.
export type { TabsProps, TabListProps, TabPanelProps } from '../../components/Tabs/Tabs'
export type { TabTriggerProps } from './Tabs'
