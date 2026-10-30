import * as React from 'react'
import { Tabs as BaseTabs } from '@base-ui/react/tabs'
import { cn } from '../../lib/cn'
import type {
  TabsProps,
  TabListProps,
  TabTriggerProps,
  TabPanelProps,
} from '../../components/Tabs/Tabs'
import { TabLayers } from '../../components/Tabs/layers'
import { useTabsMotion, usePreviewScale, type TabsMotion } from '../../components/Tabs/motion'

/**
 * Tabs on Base UI — the Phase 1 proving case for `@omkarux/vela/headless`.
 *
 * Same public API as `@omkarux/vela`'s Tabs (the prop types are imported from it, so the two
 * cannot drift), same class names (so `Tabs.css` styles both), same spec
 * (`guidelines/components/tabs.md`) and the same unit tests. The behaviour — roving tabindex,
 * arrow/Home/End, `aria-controls`/`aria-labelledby` wiring — comes from Base UI's Tabs.
 *
 * Where Base UI's defaults differ from the spec, the mapping is made here and recorded in the
 * spec's "Implementations" section:
 *
 * - **Activation.** Base UI activates on Enter/Space by default (`activateOnFocus: false`); the
 *   spec says arrow keys select, so `Tabs.List` sets `activateOnFocus`.
 * - **Disabled tabs.** Base UI's own `disabled` prop makes a tab focusable-while-disabled
 *   (`aria-disabled`, no native attribute, arrow keys land on it). The spec says a disabled tab
 *   is skipped and `Tabs.css` keys on `:disabled`, so the trigger renders the native `disabled`
 *   attribute through Base UI's `render` prop instead; Base UI's roving focus skips a natively
 *   disabled element, the browser keeps it out of the tab order and swallows its clicks.
 * - **The underline and the hover preview.** Base UI's `Tabs.Indicator` (a bar that travels to
 *   the selected tab) is not used: the spec grows the underline in place under the pressed tab.
 *   Each trigger renders the same two decorative layers as the core (the Seed and the line it grows
 *   into), and the motion state — pointer grows in place, keyboard is instant — and the Seed's
 *   measured size are the same hooks the core uses (`components/Tabs/motion.ts`).
 */

// Vela's own provider guard, so the named error is the same one the core implementation throws
// (Base UI's message is different, and in a production build it is an error code). It also
// carries the underline's motion state, which Base UI has no notion of.
const VelaTabsContext = React.createContext<TabsMotion | null>(null)

function useVelaTabs(component: string): TabsMotion {
  const motion = React.useContext(VelaTabsContext)
  if (!motion) {
    throw new Error(`<Tabs.${component}> must be rendered inside <Tabs>.`)
  }
  return motion
}

export function Tabs({
  value,
  defaultValue,
  onValueChange,
  size = 'regular',
  children,
  className,
}: TabsProps) {
  const motion = useTabsMotion()
  const { onChange } = motion
  const handleValueChange = React.useCallback(
    (next: unknown, details?: { event?: Event }) => {
      // A person's change carries its event; Base UI's own automatic changes (an initial or a
      // missing value) do not, and they are not a switch the underline should answer.
      if (details?.event) onChange()
      // Vela tab values are strings; Base UI's are `any` (and `null` when nothing is active).
      if (typeof next === 'string') onValueChange?.(next)
    },
    [onValueChange, onChange],
  )

  return (
    <VelaTabsContext.Provider value={motion}>
      <BaseTabs.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={handleValueChange}
        className={cn('vela-tabs', `vela-tabs--${size}`, className)}
        data-vela-instant={motion.instant || undefined}
      >
        {children}
      </BaseTabs.Root>
    </VelaTabsContext.Provider>
  )
}

function TabList({ children, className, ...rest }: TabListProps) {
  const { moving, changes, settle, listProps } = useVelaTabs('List')
  const listRef = React.useRef<HTMLDivElement>(null)

  // Base UI writes the new aria-selected during the commit that changes the selection; this runs
  // after it, so the layers' transitions already exist when settle() asks for them.
  React.useLayoutEffect(() => {
    if (moving) settle(listRef.current)
  }, [moving, changes, settle])

  // Each trigger's Seed is a third of its width with a floor, so it is measured per tab.
  usePreviewScale(listRef, children)

  return (
    // activateOnFocus: the spec's automatic activation — an arrow key both moves focus and
    // selects. loopFocus (Base UI's default) is the spec's "the list wraps".
    <BaseTabs.List
      ref={listRef}
      activateOnFocus
      {...listProps}
      data-vela-moving={moving || undefined}
      className={cn('vela-tabs__list', className)}
      {...rest}
    >
      {children}
    </BaseTabs.List>
  )
}

function TabTrigger({ value, children, count, disabled, className }: TabTriggerProps) {
  useVelaTabs('Trigger')
  return (
    <BaseTabs.Tab
      value={value}
      className={cn('vela-tabs__trigger', className)}
      // The native attribute, not Base UI's `disabled` prop — see the note at the top. Base UI
      // stamps `aria-disabled="false"` on every tab it believes is enabled; passing our own value
      // last clears that on enabled tabs and keeps the disabled one consistent with its attribute.
      render={<button type="button" disabled={disabled || undefined} aria-disabled={disabled || undefined} />}
    >
      {children}
      {count !== undefined && <span className="vela-tabs__count">{count}</span>}
      <TabLayers />
    </BaseTabs.Tab>
  )
}

function TabPanel({ value, children, className }: TabPanelProps) {
  useVelaTabs('Panel')
  // keepMounted stays at Base UI's default (false): only the active panel renders.
  return (
    <BaseTabs.Panel value={value} className={cn('vela-tabs__panel', className)}>
      {children}
    </BaseTabs.Panel>
  )
}

Tabs.List = TabList
Tabs.Trigger = TabTrigger
Tabs.Panel = TabPanel
