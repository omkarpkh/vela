import * as React from 'react'
import { Tabs as BaseTabs } from '@base-ui/react/tabs'
import { cn } from '../../lib/cn'
import type {
  TabsProps,
  TabListProps,
  TabTriggerProps as CoreTabTriggerProps,
  TabPanelProps,
} from '../../components/Tabs/Tabs'
import { TabLayers } from '../../components/Tabs/layers'
import { useTabsMotion, usePreviewScale, type TabsMotion } from '../../components/Tabs/motion'
import { useRowOverflow, triggersOf, type RowItem } from '../../components/Tabs/overflow'
import { DropdownList, type DropdownListItem } from '../DropdownList'
import { Icon } from '../../components/Icon'

/**
 * The headless trigger: the core's props, plus `unseen`, which only the headless Tabs has, because
 * only it has the overflow control that shows it (tabs.md, Overflow; `tabs-unseen-headless-only`).
 */
export interface TabTriggerProps extends CoreTabTriggerProps {
  /**
   * This tab holds changes the person has not seen. Set it when they arrive and clear it when the
   * tab is opened. A hidden tab with `unseen` adds "· 1 new" to the "N more" control; the tab
   * itself shows nothing.
   */
  unseen?: boolean
}

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
 * - **Overflow** (headless only). The list sits in a row with the "N more" control at its end,
 *   outside the scroller: a Dropdown List of every tab. The count and the news are measured, never
 *   props (`components/Tabs/overflow.ts`, shared with the core's fades and its scrolling into view).
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

/** The tabs the list offers: every one that can be opened, in row order, and the open one whatever it is. */
const listItems = (items: RowItem[]): DropdownListItem[] =>
  items
    .filter((i) => !i.disabled || i.selected)
    .map((i) => (i.selected ? { value: i.value, label: i.label, meta: 'open' } : i.unseen ? { value: i.value, label: i.label, meta: 'new' } : { value: i.value, label: i.label }))

/** The control's spoken name: what the words say, in full. */
export const moreName = (hidden: number, news: number) =>
  `All tabs, ${hidden} hidden${news > 0 ? `, ${news} with new items` : ''}`

function TabList({ children, className, ...rest }: TabListProps) {
  const { moving, changes, settle, listProps } = useVelaTabs('List')
  const listRef = React.useRef<HTMLDivElement>(null)
  const rowRef = React.useRef<HTMLDivElement>(null)

  // Base UI writes the new aria-selected during the commit that changes the selection; this runs
  // after it, so the layers' transitions already exist when settle() asks for them.
  React.useLayoutEffect(() => {
    if (moving) settle(listRef.current)
  }, [moving, changes, settle])

  // Each trigger's Seed is a third of its width with a floor, so it is measured per tab.
  usePreviewScale(listRef, children)

  // tabs-overflow-count-measured: the count and the news are measured, never props.
  const row = useRowOverflow(listRef, rowRef, { sticky: true, report: true })
  const items = listItems(row.items)
  const open = row.items.find((i) => i.selected)?.value

  // tabs-overflow-announce-news: announced once, politely, when news arrives in a hidden tab.
  const [announcement, setAnnouncement] = React.useState('')
  const lastNews = React.useRef(0)
  React.useEffect(() => {
    const news = row.overflow ? row.unseenHidden : 0
    if (news > lastNews.current) setAnnouncement(`All tabs, ${news} with new items`)
    else if (news === 0) setAnnouncement('')
    lastNews.current = news
  }, [row.overflow, row.unseenHidden])

  // Choosing a tab in the list opens it as a click on it would; the row then scrolls it into view.
  const choose = React.useCallback((value: string) => {
    const list = listRef.current
    if (!list) return
    triggersOf(list).find((t) => t.getAttribute('data-vela-value') === value)?.click()
  }, [])

  const showControl = row.overflow && row.hidden > 0 && open !== undefined && items.length > 0

  return (
    <div ref={rowRef} className="vela-tabs__row">
      {/* activateOnFocus: the spec's automatic activation — an arrow key both moves focus and
          selects. loopFocus (Base UI's default) is the spec's "the list wraps". */}
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
      {showControl ? (
        <DropdownList
          label="All tabs"
          align="end"
          items={items as [DropdownListItem, ...DropdownListItem[]]}
          value={open}
          onValueChange={choose}
          trigger={
            <button type="button" className="vela-tabs__more" aria-label={moreName(row.hidden, row.unseenHidden)}>
              <span className="vela-tabs__more-label">
                {row.hidden} more
                {row.unseenHidden > 0 ? <span className="vela-tabs__more-news"> · {row.unseenHidden} new</span> : null}
              </span>
              <Icon name="chevron-down" tone="inherit" />
            </button>
          }
        />
      ) : null}
      <span className="vela-sr-only" aria-live="polite">{announcement}</span>
    </div>
  )
}

function TabTrigger({ value, children, count, disabled, unseen, className }: TabTriggerProps) {
  useVelaTabs('Trigger')
  return (
    <BaseTabs.Tab
      value={value}
      className={cn('vela-tabs__trigger', className)}
      // For the overflow control: which tab this is, and whether it holds news. Read off the DOM by
      // components/Tabs/overflow.ts, never styled.
      data-vela-value={value}
      data-vela-unseen={unseen || undefined}
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
