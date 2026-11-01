/**
 * ActionLink: a shell part of the Vela site, not a kit component, never exported from the package.
 *
 * Stands in for: a link drawn as a Button. The Button spec sends navigation to a link ("Navigates to
 * another page → a router <Link>, not a Button", button.md, When to use), and the kit has no link
 * with a Button's weight. The Overview's two calls to action go to other pages, so they are links.
 * Not in the kit, so flagged rather than invented (DESIGN.md, "Not in the kit").
 *
 * - `primary` is the primary filled Button's look; `secondary` is the primary hollow Button's. The
 *   tokens are the Button's own (`--vela-btn-primary-*`, `--vela-btn-hollow-primary-*`), so the
 *   label pairs are the ones PAIRS asserts for the Button ("Primary button label", "Hollow primary
 *   label", each also hovered).
 * - Regular size: the Button's 35px height token and its padding, and it hugs its words.
 * - One `primary` per page, as the Button's own rule says (button-one-primary-filled-per-page is a
 *   convention: review checks it).
 * - Hover changes colour only, under `@media (hover: hover)`. It has no press scale: a link is not a
 *   control that is pressed, and the browser's own tap feedback stays.
 */
import type { ReactNode } from 'react'
import { cn } from '../../src'
import './shell.css'

export function ActionLink({ href, weight, children }: { href: string; weight: 'primary' | 'secondary'; children: ReactNode }) {
  return <a href={href} className={cn('shell-action', `shell-action--${weight}`)}>{children}</a>
}
