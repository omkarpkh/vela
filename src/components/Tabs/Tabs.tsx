import * as React from 'react'
import { cn } from '../../lib/cn'

interface TabsContextValue {
  value: string
  setValue: (v: string) => void
  idPrefix: string
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabs(component: string): TabsContextValue {
  const ctx = React.useContext(TabsContext)
  if (!ctx) {
    throw new Error(`<Tabs.${component}> must be rendered inside <Tabs>.`)
  }
  return ctx
}

export interface TabsProps {
  /** Controlled active value. Omit for uncontrolled. */
  value?: string
  defaultValue: string
  onValueChange?: (value: string) => void
  size?: 'regular' | 'large'
  children: React.ReactNode
  className?: string
}

/**
 * Navigate between DIFFERENT content panels.
 * If the panels show the SAME dataset rendered differently (grid vs. chart),
 * that is a View Switcher, not Tabs.
 */
export function Tabs({
  value,
  defaultValue,
  onValueChange,
  size = 'regular',
  children,
  className,
}: TabsProps) {
  const isControlled = value !== undefined
  const [internal, setInternal] = React.useState(defaultValue)
  const active = isControlled ? value : internal
  const idPrefix = React.useId()

  const setValue = React.useCallback(
    (next: string) => {
      if (!isControlled) setInternal(next)
      onValueChange?.(next)
    },
    [isControlled, onValueChange],
  )

  const ctx = React.useMemo(
    () => ({ value: active, setValue, idPrefix }),
    [active, setValue, idPrefix],
  )

  return (
    <TabsContext.Provider value={ctx}>
      <div className={cn('vela-tabs', `vela-tabs--${size}`, className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export interface TabListProps {
  /** Required: a tablist needs a name to be navigable by screen reader. */
  'aria-label': string
  children: React.ReactNode
  className?: string
}

function TabList({ children, className, ...rest }: TabListProps) {
  const listRef = React.useRef<HTMLDivElement>(null)

  // Roving focus. Reading the tabs off the DOM avoids a child registry that
  // would silently desync whenever a tab is conditionally rendered.
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
    if (!keys.includes(event.key)) return

    const tabs = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)') ?? [],
    )
    if (tabs.length === 0) return

    const current = tabs.indexOf(document.activeElement as HTMLButtonElement)
    let next = current

    if (event.key === 'ArrowRight') next = (current + 1) % tabs.length
    else if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = tabs.length - 1

    event.preventDefault()
    tabs[next]?.focus()
    tabs[next]?.click()
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      onKeyDown={onKeyDown}
      className={cn('vela-tabs__list', className)}
      {...rest}
    >
      {children}
    </div>
  )
}

export interface TabTriggerProps {
  value: string
  children: React.ReactNode
  /** Optional numeric badge, e.g. an alert count. */
  count?: number
  disabled?: boolean
  className?: string
}

function TabTrigger({ value, children, count, disabled, className }: TabTriggerProps) {
  const { value: active, setValue, idPrefix } = useTabs('Trigger')
  const selected = active === value

  return (
    <button
      type="button"
      role="tab"
      id={`${idPrefix}-tab-${value}`}
      aria-selected={selected}
      aria-controls={`${idPrefix}-panel-${value}`}
      // Roving tabindex: one stop for the whole tablist, arrows move within it.
      tabIndex={selected ? 0 : -1}
      disabled={disabled}
      onClick={() => setValue(value)}
      className={cn('vela-tabs__trigger', className)}
    >
      {children}
      {count !== undefined && <span className="vela-tabs__count">{count}</span>}
    </button>
  )
}

export interface TabPanelProps {
  value: string
  children: React.ReactNode
  className?: string
}

function TabPanel({ value, children, className }: TabPanelProps) {
  const { value: active, idPrefix } = useTabs('Panel')
  if (active !== value) return null

  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel-${value}`}
      aria-labelledby={`${idPrefix}-tab-${value}`}
      tabIndex={0}
      className={cn('vela-tabs__panel', className)}
    >
      {children}
    </div>
  )
}

Tabs.List = TabList
Tabs.Trigger = TabTrigger
Tabs.Panel = TabPanel
