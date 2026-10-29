import * as React from 'react'
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip'
import { cn } from '../../lib/cn'
import { fromKeyboard, sideOf, useOverlayPortal, type OverlayAlign, type OverlayPlacement } from '../overlay'

/**
 * Tooltip on Base UI — headless-born (`guidelines/components/tooltip.md`); no core implementation.
 *
 * Where Base UI's defaults differ from the spec, the mapping is made here and recorded in the
 * spec's "Implementations" section:
 *
 * - **Accessibility wiring.** Base UI treats a tooltip as visual-only: no role, nothing on the
 *   trigger. The spec makes it a description: the popup is `role="tooltip"` and, while it is
 *   rendered, the trigger carries `aria-describedby` pointing at it. The trigger's NAME stays its
 *   own (`aria-label` or text) — the component throws when the trigger has none.
 * - **Delay.** Base UI's `delay` is a number in JS. The spec's is the `--vela-delay-tooltip` token,
 *   read from the trigger's computed style; when no stylesheet is loaded Base UI's own default
 *   applies, which is the token's value.
 * - **Content.** Base UI's popup takes any node. The spec's `content` is a `string`: a tooltip
 *   holds no links, no buttons, nothing a pointer could not reach before it closed.
 */

export type TooltipPlacement = OverlayPlacement
export type TooltipAlign = OverlayAlign

export interface TooltipProps {
  /** Required. The text. A string, so a tooltip can never hold a link, a button or a list. */
  content: string
  /**
   * Required. The ONE element the tooltip describes — a Button, a native `<button>`, a link. It
   * keeps its own accessible name; the tooltip is wired to it as a description.
   */
  children: React.ReactElement
  /** The side of the trigger it opens on. */
  placement?: TooltipPlacement
  /** Where it lines up along that side. */
  align?: TooltipAlign
  className?: string
}

/** `600ms`, `0.6s` → milliseconds; anything else → undefined (Base UI's default then applies). */
const readDelay = (el: Element) => {
  const raw = getComputedStyle(el).getPropertyValue('--vela-delay-tooltip').trim()
  const m = /^(\d*\.?\d+)(ms|s)$/.exec(raw)
  return m ? Number(m[1]) * (m[2] === 's' ? 1000 : 1) : undefined
}

/** Whether an element has an accessible name of its own: aria-label(ledby), a <label>, text or a title. */
const hasOwnName = (el: Element) =>
  !!(
    el.getAttribute('aria-label')?.trim() ||
    el.getAttribute('aria-labelledby')?.trim() ||
    ((el as HTMLInputElement).labels?.length ?? 0) > 0 ||
    el.textContent?.trim() ||
    el.getAttribute('title')?.trim()
  )

/** A short supplementary label on hover and keyboard focus. Never the only place information lives. */
export function Tooltip({ content, children, placement = 'top', align = 'center', className }: TooltipProps) {
  const anchor = React.useRef<HTMLButtonElement | null>(null)
  const portal = useOverlayPortal(anchor)
  const popupId = `${React.useId()}-tooltip`
  const [open, setOpen] = React.useState(false)
  const [instant, setInstant] = React.useState(false)
  const [delay, setDelay] = React.useState<number | undefined>(undefined)

  React.useLayoutEffect(() => {
    const el = anchor.current
    if (!el) return
    if (!hasOwnName(el)) {
      throw new Error(
        '<Tooltip> trigger has no accessible name of its own. Give it an aria-label (or visible text): the tooltip describes the control, it does not name it.',
      )
    }
    setDelay(readDelay(el))
  }, [])

  const handleOpenChange = React.useCallback((next: boolean, details: BaseTooltip.Root.ChangeEventDetails) => {
    setInstant(fromKeyboard(details))
    setOpen(next)
  }, [])

  // The description is wired only while the tooltip is rendered: a dangling aria-describedby is
  // worse than none. Whatever the element already described is kept.
  const own = (children.props as { 'aria-describedby'?: string })['aria-describedby']
  const describedBy = [own, open ? popupId : null].filter(Boolean).join(' ') || undefined
  const trigger = React.cloneElement(children as React.ReactElement<Record<string, unknown>>, { 'aria-describedby': describedBy })

  return (
    <BaseTooltip.Root onOpenChange={handleOpenChange}>
      <BaseTooltip.Trigger ref={anchor} delay={delay} render={trigger} />
      <BaseTooltip.Portal {...portal}>
        <BaseTooltip.Positioner side={sideOf(placement)} align={align} className="vela-tooltip__positioner">
          <BaseTooltip.Popup
            id={popupId}
            role="tooltip"
            className={cn('vela-tooltip', className)}
            data-vela-instant={instant || undefined}
          >
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  )
}
