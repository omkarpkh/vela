import * as React from 'react'
import { Menu } from '@base-ui/react/menu'
import { Icon } from '../../components/Icon'
import { cn } from '../../lib/cn'
import { fromKeyboard, useOverlayPortal } from '../overlay'

/**
 * Dropdown List on Base UI's Menu — headless-born (`guidelines/components/dropdown-list.md`); no
 * core implementation.
 *
 * Where Base UI's defaults differ from the spec, the mapping is made here and recorded in the
 * spec's "Implementations" section:
 *
 * - **Focus on open.** Base UI highlights the FIRST item on a keyboard open (the last on Arrow Up)
 *   and focuses the popup itself on a pointer open. The spec lands on the CURRENT item
 *   (`dropdown-list-focus-current`): the first focus that arrives inside the popup after it opens
 *   is redirected to the current item, whichever element Base UI chose.
 * - **The current one.** Base UI's radio group reports a choice of the item that is already
 *   checked; the spec does not (`onValueChange` is "not called for the current one"). Choosing it
 *   still closes the list.
 * - **Closing.** Base UI's radio items stay open when chosen; here `closeOnClick` is set, so a
 *   choice closes the list and Base UI returns focus to the trigger.
 * - **Modality.** Base UI's menu is modal by default (the page's scroll is locked and outside
 *   presses are swallowed). A Dropdown List is not: the page keeps its scroll, and a press outside
 *   closes the list and still reaches what it landed on.
 * - **Trigger, offset and portal** are mapped as on Popover (`../overlay`).
 */

/** One option. These four fields only (`dropdown-list-item-closed`). */
export interface DropdownListItem {
  /** What `onValueChange` reports. Unique within the list. */
  value: string
  /** The name, shown and announced in full; it wraps, never truncates. */
  label: string
  /** Words at the end of the row — "1 new", "No access". Never a colour, never a taxonomy. */
  meta?: string
  /** Reachable and read, never chosen. Its `meta` can say why. */
  disabled?: boolean
}

/** Which edge of the trigger the list lines up with. These two only (`dropdown-list-align-closed`). */
export type DropdownListAlign = 'start' | 'end'

interface DropdownListBaseProps {
  /** Required. Names the list for assistive technology ("All tabs"). Not shown. */
  label: string
  /** Required. One button element; it gets `aria-haspopup="menu"`, `aria-expanded` and `aria-controls`. */
  trigger: React.ReactElement
  /** Required, at least one, in display order. */
  items: readonly [DropdownListItem, ...DropdownListItem[]]
  /** Called when an option other than the current one is chosen. */
  onValueChange?: (value: string) => void
  /** Receives the NEXT open state. */
  onOpenChange?: (open: boolean) => void
  /** Which edge of the trigger the list lines up with. */
  align?: DropdownListAlign
  className?: string
}

/** Controlled and uncontrolled are exclusive, for the value and for open (`dropdown-list-controlled-exclusive`). */
type ValueProps =
  | { /** The current option (controlled). */ value: string; defaultValue?: never }
  | { value?: never; /** The current option (uncontrolled). */ defaultValue?: string }
type OpenProps =
  | { /** Controlled. */ open: boolean; defaultOpen?: never }
  | { open?: never; /** Uncontrolled initial state. */ defaultOpen?: boolean }

export type DropdownListProps = DropdownListBaseProps & ValueProps & OpenProps

/** A short list from a button: one option is current, choosing another acts at once and closes it. */
export function DropdownList({
  label,
  trigger,
  items,
  value,
  defaultValue,
  onValueChange,
  open,
  defaultOpen,
  onOpenChange,
  align = 'start',
  className,
}: DropdownListProps) {
  const anchor = React.useRef<HTMLButtonElement | null>(null)
  const portal = useOverlayPortal(anchor)
  const [instant, setInstant] = React.useState(false)
  const [inner, setInner] = React.useState(defaultValue)
  const current = value !== undefined ? value : inner

  // dropdown-list-value-exists: a list with nothing marked is not a Dropdown List.
  if (current === undefined || !items.some((i) => i.value === current)) {
    throw new Error(
      `<DropdownList label="${label}">: ${current === undefined ? 'no current option — pass `value` or `defaultValue`' : `the current value "${current}" matches no item`}. ` +
        `One of the items' values is always current (guidelines/components/dropdown-list.md).`,
    )
  }

  // Each item's element, so the first focus after opening can be redirected to the current one.
  const elements = React.useRef(new Map<string, HTMLElement>())
  const landing = React.useRef(Boolean(open ?? defaultOpen))
  React.useLayoutEffect(() => {
    if (open) landing.current = true
  }, [open])

  const handleOpenChange = React.useCallback(
    (next: boolean, details: Menu.Root.ChangeEventDetails) => {
      setInstant(fromKeyboard(details))
      if (next) landing.current = true
      onOpenChange?.(next)
    },
    [onOpenChange],
  )

  // The first focus to arrive inside the popup after it opens — the popup itself on a pointer open,
  // the first or last item on a keyboard open — goes to the current item instead. Stopping the
  // event keeps Base UI from recording the element it chose; the current item's own focus event
  // then makes it the highlighted one.
  const handleFocusCapture = React.useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      if (!landing.current) return
      landing.current = false
      const target = elements.current.get(current)
      if (!target || event.target === target) return
      event.stopPropagation()
      target.focus({ preventScroll: true })
      target.scrollIntoView?.({ block: 'nearest' })
    },
    [current],
  )

  const handleValueChange = React.useCallback(
    (next: string) => {
      if (next === current) return
      if (value === undefined) setInner(next)
      onValueChange?.(next)
    },
    [current, value, onValueChange],
  )

  return (
    <Menu.Root open={open} defaultOpen={defaultOpen} onOpenChange={handleOpenChange} modal={false}>
      <Menu.Trigger ref={anchor} render={trigger} />
      <Menu.Portal {...portal}>
        <Menu.Positioner side="bottom" align={align} className="vela-dropdown-list__positioner">
          <Menu.Popup
            aria-label={label}
            className={cn('vela-dropdown-list', className)}
            data-vela-instant={instant || undefined}
            onFocusCapture={handleFocusCapture}
          >
            <Menu.RadioGroup value={current} onValueChange={handleValueChange} className="vela-dropdown-list__group">
              {items.map((item) => (
                <Menu.RadioItem
                  key={item.value}
                  ref={(el: HTMLElement | null) => {
                    if (el) elements.current.set(item.value, el)
                    else elements.current.delete(item.value)
                  }}
                  value={item.value}
                  label={item.label}
                  disabled={item.disabled}
                  closeOnClick
                  // dropdown-list-meta-in-name: what is seen is what is heard.
                  aria-label={item.meta ? `${item.label}, ${item.meta}` : item.label}
                  className="vela-dropdown-list__item"
                >
                  <span className="vela-dropdown-list__check" aria-hidden="true">
                    <Menu.RadioItemIndicator className="vela-dropdown-list__indicator">
                      <Icon name="check" tone="inherit" />
                    </Menu.RadioItemIndicator>
                  </span>
                  <span className="vela-dropdown-list__label">{item.label}</span>
                  {item.meta ? <span className="vela-dropdown-list__meta">{item.meta}</span> : null}
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
