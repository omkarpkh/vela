import * as React from 'react'

/**
 * What Popover, Tooltip and Dialog share: the closed placement set, the portal that keeps an
 * overlay inside the kit's styling and theme, and the "from the keyboard, nothing animates" check.
 * Internal to `@omkarux/vela/headless`; not exported from the entry.
 */

/** Which side of the trigger the overlay opens on. Logical, so `start` / `end` follow the writing direction. */
export type OverlayPlacement = 'top' | 'bottom' | 'start' | 'end'
/** Where the overlay lines up along that side. */
export type OverlayAlign = 'start' | 'center' | 'end'

/** Vela's closed placement → Base UI's `side`. `start` / `end` are the logical inline sides. */
export const sideOf = (placement: OverlayPlacement) =>
  placement === 'start' ? 'inline-start' : placement === 'end' ? 'inline-end' : placement

/**
 * The portal element. Base UI portals every overlay to `<body>`, outside the `.vela-root` the
 * trigger sits in — and so outside the kit's base styles (font, the global focus ring, the
 * reduced-motion collapse) and outside any `data-theme` subtree. The portal therefore carries
 * `vela-root` itself, and on mount copies the theme of the nearest `[data-theme]` ancestor of
 * `anchor`, so a popover opened from a dark sidebar in a light app is dark. Without a themed
 * ancestor it sets nothing and inherits the document's theme, as any other element would.
 */
export function useOverlayPortal(anchor: React.RefObject<HTMLElement | null>) {
  const ref = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return
      const theme = anchor.current?.closest('[data-theme]')?.getAttribute('data-theme')
      if (theme) node.setAttribute('data-theme', theme)
      else node.removeAttribute('data-theme')
    },
    [anchor],
  )
  return { ref, className: 'vela-root vela-overlay-portal' }
}

/**
 * Whether an open/close came from the keyboard: Escape, a key event, or a click the browser
 * synthesised from Enter or Space on a button (`detail === 0`). The overlay then carries
 * `data-vela-instant` and its CSS skips the transition (foundations/motion.md: from the keyboard,
 * nothing animates).
 */
export function fromKeyboard(details: { reason?: string; event?: Event } | undefined): boolean {
  if (!details) return false
  if (details.reason === 'escape-key') return true
  const e = details.event
  if (typeof KeyboardEvent !== 'undefined' && e instanceof KeyboardEvent) return true
  if (typeof MouseEvent !== 'undefined' && e instanceof MouseEvent && e.type === 'click' && e.detail === 0) return true
  return false
}
