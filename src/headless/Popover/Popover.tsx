import * as React from 'react'
import { Popover as BasePopover } from '@base-ui/react/popover'
import { cn } from '../../lib/cn'
import { fromKeyboard, sideOf, useOverlayPortal, type OverlayAlign, type OverlayPlacement } from '../overlay'

/**
 * Popover on Base UI — headless-born (`guidelines/components/popover.md`); no core implementation.
 *
 * Where Base UI's defaults differ from the spec, the mapping is made here and recorded in the
 * spec's "Implementations" section:
 *
 * - **Trigger.** Base UI's compound `Popover.Trigger` is not exposed: `trigger` is one element,
 *   rendered through the Trigger's `render` prop, so the element keeps its own props and Base UI
 *   adds `aria-expanded`, `aria-haspopup` and the toggle.
 * - **Placement.** Base UI's `side` takes physical and logical values; the spec's four are logical
 *   (`start` / `end` are `inline-start` / `inline-end`). The gap to the trigger is not Base UI's
 *   `sideOffset` (a number in JS) but padding on the positioner bound to `--vela-space-5`, so the
 *   spacing scale stays the only place the value is written.
 * - **Portal.** The portal element carries `vela-root` and the trigger's theme (`../overlay`).
 */

export type PopoverPlacement = OverlayPlacement
export type PopoverAlign = OverlayAlign
export type PopoverSize = 'regular' | 'wide'

interface PopoverBaseProps {
  /** Required. The element that opens the popover — a Button or a native `<button>`. */
  trigger: React.ReactElement
  /** Required. Rendered as the popover's heading and wired as its accessible name. */
  title: string
  /** The side of the trigger it opens on. */
  placement?: PopoverPlacement
  /** Where it lines up along that side. */
  align?: PopoverAlign
  /** The popup width: `--vela-popover-width` or `--vela-popover-width-wide`. */
  size?: PopoverSize
  /** Receives the NEXT open state. */
  onOpenChange?: (open: boolean) => void
  /** The body. Never the only copy of information the page needs (popover.md). */
  children?: React.ReactNode
  className?: string
}

/** Controlled and uncontrolled are exclusive: `open` drives it, `defaultOpen` seeds it once. */
export type PopoverProps = PopoverBaseProps &
  (
    | { /** Controlled. */ open: boolean; defaultOpen?: never }
    | { open?: never; /** Uncontrolled initial state. */ defaultOpen?: boolean }
  )

/** A non-modal panel anchored to its trigger. For a decision that blocks the task, use Dialog. */
export function Popover({
  trigger,
  title,
  placement = 'bottom',
  align = 'center',
  size = 'regular',
  open,
  defaultOpen,
  onOpenChange,
  children,
  className,
}: PopoverProps) {
  const anchor = React.useRef<HTMLButtonElement | null>(null)
  const portal = useOverlayPortal(anchor)
  const [instant, setInstant] = React.useState(false)
  const handleOpenChange = React.useCallback(
    (next: boolean, details: BasePopover.Root.ChangeEventDetails) => {
      setInstant(fromKeyboard(details))
      onOpenChange?.(next)
    },
    [onOpenChange],
  )
  return (
    <BasePopover.Root open={open} defaultOpen={defaultOpen} onOpenChange={handleOpenChange}>
      <BasePopover.Trigger ref={anchor} render={trigger} />
      <BasePopover.Portal {...portal}>
        <BasePopover.Positioner side={sideOf(placement)} align={align} className="vela-popover__positioner">
          <BasePopover.Popup
            className={cn('vela-popover', `vela-popover--${size}`, className)}
            data-vela-instant={instant || undefined}
          >
            <BasePopover.Title className="vela-popover__title">{title}</BasePopover.Title>
            <div className="vela-popover__body">{children}</div>
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  )
}
