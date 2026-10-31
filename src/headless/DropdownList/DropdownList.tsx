import * as React from 'react'
import { Menu } from '@base-ui/react/menu'
import { Icon } from '../../components/Icon'
import { cn } from '../../lib/cn'
import { isDev } from '../../lib/dev'
import { fromKeyboard, useOverlayPortal } from '../overlay'

/**
 * Dropdown List on Base UI's Menu — headless-born (`guidelines/components/dropdown-list.md`); no
 * core implementation.
 *
 * Where Base UI's defaults differ from the spec, the mapping is made here and recorded in the
 * spec's "Implementations" section:
 *
 * - **Focus on open.** Base UI 1.9's MenuRoot passes no `selectedIndex` to its list navigation, so
 *   it highlights the FIRST item on a keyboard open (the last on Arrow Up), and on a pointer open
 *   the popup itself takes focus. The spec lands on the CURRENT item (`dropdown-list-focus-current`).
 *   Until the person first presses a key or moves the pointer in the list, every focus Base UI
 *   sends to anything other than the current item is stopped and sent to the current item
 *   instead. Focusing the item runs Base UI's own item focus handler, which moves the list's
 *   `activeIndex` there too, so the next arrow key continues from the current item — not from
 *   wherever Base UI would have started — and a late, deferred focus to the first item is caught
 *   the same way.
 * - **The current one.** Base UI's radio group reports a choice of the item that is already
 *   checked; the spec does not (`onValueChange` is "not called for the current one"). Choosing it
 *   still closes the list.
 * - **Closing.** Base UI's radio items stay open when chosen; here `closeOnClick` is set, so a
 *   choice closes the list and Base UI returns focus to the trigger.
 * - **Modality.** Base UI's menu is modal by default (the page's scroll is locked and outside
 *   presses are swallowed). A Dropdown List is not (`dropdown-list-non-modal`): the page keeps its
 *   scroll and its accessibility tree, Tab leaves the list, and a press outside closes the list
 *   and still reaches what it landed on.
 * - **Trigger, offset and portal** are mapped as on Popover (`../overlay`).
 */

interface DropdownListItemBase {
  /** What `onValueChange` reports. Unique within the list. */
  value: string
  /** The name, shown and announced in full; it wraps, never truncates. Typeahead matches it. */
  label: string
}

/**
 * One option. These four fields only (`dropdown-list-item-closed`): `value`, `label`, and either
 * `meta` or `locked`, never both, because the two share one slot at the end of the row.
 */
export type DropdownListItem = DropdownListItemBase &
  (
    | {
        /** Words at the end of the row — "1 new", "3 open". Never a colour, never a taxonomy. */
        meta?: string
        locked?: never
      }
    | {
        meta?: never
        /**
         * Reachable and read, never chosen (DESIGN.md, States, Locked). `reason` names the setting
         * or the policy that rules it out, in words a person can act on, and shows where `meta`
         * would. A value the person's role may never have is not listed at all.
         */
        locked: { reason: string }
      }
  )

/** Which edge of the trigger the list lines up with. These two only (`dropdown-list-align-closed`). */
export type DropdownListAlign = 'start' | 'end'

interface DropdownListBaseProps {
  /** Required. Names the list for assistive technology ("All tabs"). Not shown. */
  label: string
  /** Required. One `<button>` element; it gets `aria-haspopup="menu"`, `aria-expanded` and `aria-controls`. */
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

/**
 * The words `meta` must never be (`dropdown-list-meta-not-a-taxonomy-label`): every value and
 * every shown label of the Severity, Risk and Status taxonomies (DESIGN.md, "Three taxonomies";
 * the labels are Risk Pill's and Status Indicator's), and the Verdict values
 * (guidelines/proposals/verdict-card.md). Compared ignoring case.
 */
const TAXONOMY_WORDS: Record<string, readonly string[]> = {
  Severity: ['success', 'info', 'warning', 'minor', 'major', 'critical'],
  Risk: ['low', 'medium', 'high'],
  Status: ['unknown', 'healthy', 'warning', 'medium', 'unhealthy', 'status unknown', 'degraded'],
  Verdict: ['malicious', 'suspicious', 'benign', 'inconclusive'],
}
const taxonomiesOf = (meta: string) => {
  const word = meta.trim().toLowerCase()
  return Object.keys(TAXONOMY_WORDS).filter((t) => TAXONOMY_WORDS[t].includes(word))
}

/** The words at the end of the row: a locked item's reason, or its meta. */
const endOf = (item: DropdownListItem) => item.locked?.reason ?? item.meta

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
  // dropdown-list-trigger-instant-from-keyboard: the last open or close came from the keyboard.
  // The popup skips its transition, and the trigger carries it for its owner, until a pointer
  // next touches the trigger or the list.
  const [instant, setInstant] = React.useState(false)
  // The last input in the list was the pointer: a disabled item it rests on shows no highlight.
  const [pointer, setPointer] = React.useState(false)
  const [inner, setInner] = React.useState(defaultValue)
  const current = value !== undefined ? value : inner

  // dropdown-list-value-exists: a list with nothing marked is not a Dropdown List.
  if (current === undefined || !items.some((i) => i.value === current)) {
    throw new Error(
      `<DropdownList label="${label}">: ${current === undefined ? 'no current option — pass `value` or `defaultValue`' : `the current value "${current}" matches no item`}. ` +
        `One of the items' values is always current (guidelines/components/dropdown-list.md).`,
    )
  }

  // The trigger must be a real button: the menu's keys, its name and its disabled state come from it.
  React.useLayoutEffect(() => {
    if (!isDev()) return
    const el = anchor.current
    if (el && el.tagName !== 'BUTTON') {
      throw new Error(
        `<DropdownList label="${label}">: the trigger renders a <${el.tagName.toLowerCase()}>, not a <button>. ` +
          'Pass one button element as `trigger` (guidelines/components/dropdown-list.md).',
      )
    }
  }, [label])

  // dropdown-list-meta-not-a-taxonomy-label: meta is words, never a severity, a risk, a status or a verdict.
  React.useEffect(() => {
    if (!isDev()) return
    for (const item of items) {
      if (!item.meta) continue
      const hit = taxonomiesOf(item.meta)
      if (hit.length) {
        console.warn(
          `<DropdownList label="${label}">: item "${item.label}" has meta "${item.meta}", a ${hit.join(' and ')} word. ` +
            'Meta is words such as "1 new" or "3 open", never a taxonomy label (guidelines/components/dropdown-list.md).',
        )
      }
    }
  }, [items, label])

  // Each item's element, so focus can be sent to the current one while the list is landing.
  const elements = React.useRef(new Map<string, HTMLElement>())
  const landing = React.useRef(Boolean(open ?? defaultOpen))
  React.useLayoutEffect(() => {
    if (open) landing.current = true
  }, [open])
  const landed = React.useCallback(() => {
    landing.current = false
  }, [])

  const handleOpenChange = React.useCallback(
    (next: boolean, details: Menu.Root.ChangeEventDetails) => {
      setInstant(fromKeyboard(details))
      if (next) {
        landing.current = true
        setPointer(false)
      }
      onOpenChange?.(next)
    },
    [onOpenChange],
  )

  // dropdown-list-focus-current: while the list is landing, a focus Base UI sends anywhere but the
  // current item — the popup on a pointer open, the first or last item on a keyboard open, now or
  // a frame later — is stopped before Base UI records it, and the current item is focused instead.
  // Its own focus event then makes it Base UI's active item.
  const handleFocusCapture = React.useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      if (!landing.current) return
      const target = elements.current.get(current)
      if (!target || event.target === target) return
      event.stopPropagation()
      target.focus({ preventScroll: true })
      target.scrollIntoView?.({ block: 'nearest' })
    },
    [current],
  )

  const fromPointer = React.useCallback(() => {
    landed()
    setPointer(true)
    setInstant(false)
  }, [landed])
  const fromKeys = React.useCallback(() => {
    landed()
    setPointer(false)
  }, [landed])

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
      <Menu.Trigger
        ref={anchor}
        render={trigger}
        data-vela-instant={instant || undefined}
        onPointerDown={() => setInstant(false)}
        onPointerMove={() => setInstant(false)}
      />
      <Menu.Portal {...portal}>
        <Menu.Positioner side="bottom" align={align} className="vela-dropdown-list__positioner">
          <Menu.Popup
            aria-label={label}
            className={cn('vela-dropdown-list', className)}
            data-vela-instant={instant || undefined}
            data-vela-pointer={pointer || undefined}
            onFocusCapture={handleFocusCapture}
            onKeyDownCapture={fromKeys}
            onPointerMoveCapture={fromPointer}
            onPointerDownCapture={fromPointer}
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
                  // Typeahead matches the name alone, not the meta.
                  label={item.label}
                  disabled={item.locked !== undefined}
                  closeOnClick
                  // dropdown-list-meta-in-name: what is seen is what is heard, the reason included.
                  aria-label={endOf(item) ? `${item.label}, ${endOf(item)}` : item.label}
                  className="vela-dropdown-list__item"
                >
                  <span className="vela-dropdown-list__check" aria-hidden="true">
                    <Menu.RadioItemIndicator className="vela-dropdown-list__indicator">
                      <Icon name="check" tone="inherit" />
                    </Menu.RadioItemIndicator>
                  </span>
                  <span className="vela-dropdown-list__text">
                    <span className="vela-dropdown-list__label">
                      {/* Icon's lock never appears without its written reason (icon-lock-has-written-reason);
                          the reason is in this row. It is the component's own glyph, not an item icon. */}
                      {item.locked ? <Icon name="lock" size="regular" tone="default" className="vela-dropdown-list__lock" /> : null}
                      {item.label}
                    </span>
                    {endOf(item) ? <span className="vela-dropdown-list__meta">{endOf(item)}</span> : null}
                  </span>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
