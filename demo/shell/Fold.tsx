/**
 * Fold, and Show more: shell parts of the Vela site, not kit components, never exported from the
 * package. Slice 2 of the playground uplift (s5-tabs; Omkar's review comment 3: long pages fold).
 * Vela has no disclosure group or accordion; these stand in, flagged, not a kit part (DESIGN.md,
 * "Not in the kit").
 *
 * - A fold is a section whose heading is a disclosure button: a chevron, the words, the count, and a
 *   line under it. Nothing starts closed; "Collapse all" closes every fold on the tab.
 * - Its heading is the section index's target: a jump focuses it, and a closed fold opens.
 * - Folded content is `hidden="until-found"`, so the browser's own find still reaches it and opens
 *   it (sweep T75); print opens everything (T76).
 * - Show more: a group of more than six shows six, then "Show N more". The rest are hidden until
 *   found, the same way; a deep link to one of them reveals the group (T12).
 */
import { useEffect, useId, useLayoutEffect, useRef, type ReactNode } from 'react'
import { cn, Icon } from '../../src'
import './shell.css'

/** Hidden until found where the browser has it (Chromium); plain hidden where it doesn't. */
export function useUntilFound<T extends HTMLElement>(hidden: boolean, onFound: () => void) {
  const ref = useRef<T>(null)
  const found = useRef(onFound)
  found.current = onFound
  // Before paint, so a row revealed for a link can take focus in the next frame.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // A table's row group can't be hidden until found (content-visibility does not apply to it), so it is plainly hidden.
    if (hidden) el.setAttribute('hidden', 'onbeforematch' in el && el.tagName !== 'TBODY' ? 'until-found' : '')
    else el.removeAttribute('hidden')
  }, [hidden])
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const on = () => found.current()
    el.addEventListener('beforematch', on)
    return () => el.removeEventListener('beforematch', on)
  }, [])
  return ref
}

export interface FoldProps {
  /** The section's id: its heading is `section-<id>`, the index's target. */
  id: string
  heading: ReactNode
  count?: number
  /** Words after the heading, quieter: "primary · filled · regular". */
  aside?: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  className?: string
  children: ReactNode
}

export function Fold({ id, heading, count, aside, open, onOpenChange, className, children }: FoldProps) {
  const body = useId()
  const ref = useUntilFound<HTMLDivElement>(!open, () => onOpenChange(true))
  return (
    <section className={cn('shell-fold', className)} aria-labelledby={`section-${id}`} data-fold={id}>
      {/* The index jumps to the heading and focuses it: a closed fold opens to show what it holds. */}
      <h2 id={`section-${id}`} className="shell-fold__head" tabIndex={-1} onFocus={(e) => { if (e.target === e.currentTarget && !open) onOpenChange(true) }}>
        <button type="button" className="shell-fold__toggle" aria-expanded={open} aria-controls={body} onClick={() => onOpenChange(!open)}>
          <Icon name={open ? 'chevron-down' : 'chevron-right'} size="small" />
          <span className="shell-fold__words">{heading}</span>
          {count !== undefined && <span className="shell-fold__count">{count}</span>}
        </button>
        {aside && <span className="shell-fold__aside">{aside}</span>}
      </h2>
      <div id={body} ref={ref} className="shell-fold__body">{children}</div>
    </section>
  )
}

/** The first six, then "Show N more"; the rest hidden until found. */
export const SHOW_FIRST = 6

export function ShowMore({ more, onShow }: { more: number; onShow: () => void }) {
  if (more <= 0) return null
  return (
    <button type="button" className="shell-more" onClick={onShow}>
      <Icon name="chevron-down" size="small" />
      Show {more} more
    </button>
  )
}

/** Rows past the first six: hidden until found, or shown. `onFound` reveals them all. */
export function Rest({ shown, onFound, children, as = 'div', className }: { shown: boolean; onFound: () => void; children: ReactNode; as?: 'div' | 'tbody' | 'ul'; className?: string }) {
  const ref = useUntilFound<HTMLElement>(!shown, onFound)
  const Tag = as as 'div'
  return <Tag ref={ref as React.RefObject<HTMLDivElement>} className={className}>{children}</Tag>
}
