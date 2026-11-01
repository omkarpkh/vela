/**
 * Section index: a shell part of the Vela site, not a kit component. It is never exported from the
 * package.
 *
 * Stands in for: an in-page index. Vela has no component for it; this is a gap, flagged rather than
 * invented (DESIGN.md, "Not in the kit"). If products need one, it goes through DESIGN.md's "How to
 * add a component", not from the site. Built in slice 1 of the playground uplift (s5-tabs, level 2).
 *
 * The contract it follows:
 * - Links, never tabs: it moves you within one page, so it marks a place, not a choice. A nav named
 *   "On this tab" (under page tabs) or "On this page" (the rail, on a page without page tabs).
 * - Where you are is `aria-current="location"` and an ink line (--vela-border-action), never teal,
 *   which is kept for choices. A real border, so it survives forced colours.
 * - A jump is instant (a smooth scroll over thousands of pixels sweeps the page) and moves focus to
 *   the section's heading.
 * - The site's routes live in the hash, so a link writes `?section=<id>` with replaceState: Back
 *   leaves the page, not the section, and a reload keeps the place. Each link is a real link with the
 *   full route, so it still works without script.
 * - Under 600px wide it is one button that says where you are ("On this tab: Compiler 3") and opens
 *   the list.
 * - A page with three sections or fewer has no index: the sections are already in view.
 */
import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { cn, Icon } from '../../src'
import './shell.css'

export interface SectionLink {
  /** The section's name in the address, `?section=<id>`. */
  id: string
  label: string
  /** How many items the section holds, when it holds a count worth saying. */
  count?: number
  /** The id of the section's heading. Defaults to `section-<id>`. */
  target?: string
  /** A thin rule before this item: the tab's own groups, then the spec's sections. */
  sep?: boolean
}

export interface SectionIndexProps {
  items: readonly SectionLink[]
  /** `strip` sits under page tabs; `rail` sits beside the content on a page without them. */
  form?: 'strip' | 'rail'
  /** The visible name and the nav's name. Defaults to "On this tab" for a strip, "On this page" for a rail. */
  label?: string
  /** False until the sections are on the page; a link that arrived with `?section=` jumps once it is true. */
  ready?: boolean
  /** The tab's own tools at the strip's end (Find, Collapse all); inside the list when it is one button. */
  tools?: ReactNode
}

/** The fewest sections that earn an index. */
export const INDEX_MIN = 4

export const targetOf = (s: SectionLink) => s.target ?? `section-${s.id}`

/** The `section` parameter of the hash's query, if any. */
export function sectionOf(hash: string): string | null {
  const q = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : ''
  return new URLSearchParams(q).get('section')
}

/** The hash with `section` set to `id`, every other parameter kept. */
export function withSection(hash: string, id: string): string {
  const at = hash.indexOf('?')
  const path = at === -1 ? hash : hash.slice(0, at)
  const params = new URLSearchParams(at === -1 ? '' : hash.slice(at + 1))
  params.set('section', id)
  return `${path || '#/'}?${params.toString()}`
}

/** Moves to a section at once and gives its heading focus. */
export function jumpTo(s: SectionLink): boolean {
  const el = document.getElementById(targetOf(s))
  if (!el) return false
  if (!el.hasAttribute('tabindex')) el.tabIndex = -1
  el.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior })
  el.focus({ preventScroll: true })
  return true
}

/** What sticks above the content: the page's scroll-padding-top, in pixels. */
const stuck = () => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0

export function SectionIndex({ items, form = 'strip', label, ready = true, tools }: SectionIndexProps) {
  const name = label ?? (form === 'strip' ? 'On this tab' : 'On this page')
  const nameId = useId()
  const hereId = useId()
  const listId = useId()
  const toggle = useRef<HTMLButtonElement>(null)
  const [current, setCurrent] = useState<string>(() => {
    const asked = sectionOf(window.location.hash)
    return items.some((s) => s.id === asked) ? asked! : items[0]?.id ?? ''
  })
  const [open, setOpen] = useState(false)
  // A jump moves the page, and the scroll it fires must not move the mark off the section chosen.
  const quietUntil = useRef(0)
  const arrived = useRef(false)

  // Arriving with ?section=: jump once the sections are on the page.
  useEffect(() => {
    if (!ready || arrived.current) return
    arrived.current = true
    const asked = sectionOf(window.location.hash)
    const s = items.find((x) => x.id === asked)
    if (s && jumpTo(s)) { setCurrent(s.id); quietUntil.current = performance.now() + 150 }
  }, [ready, items])

  // The ink line follows the reading position: the last section whose heading has reached what sticks.
  useEffect(() => {
    let frame = 0
    const read = () => {
      frame = 0
      if (performance.now() < quietUntil.current) return
      const line = stuck() + 1
      let at = items[0]?.id ?? ''
      for (const s of items) {
        const el = document.getElementById(targetOf(s))
        if (el && el.getBoundingClientRect().top <= line) at = s.id
      }
      // At the foot of the page the last section is in view even if its heading never reaches the top.
      const foot = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      const last = items[items.length - 1]
      if (foot && last && document.getElementById(targetOf(last))) at = last.id
      setCurrent(at)
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(read) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); if (frame) cancelAnimationFrame(frame) }
  }, [items])

  if (items.length < INDEX_MIN) return null

  const go = (e: MouseEvent<HTMLAnchorElement>, s: SectionLink) => {
    // A new tab or window opens the link as it is.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    window.history.replaceState(window.history.state, '', withSection(window.location.hash, s.id))
    setCurrent(s.id)
    setOpen(false)
    quietUntil.current = performance.now() + 150
    jumpTo(s)
  }
  // The sections can change under the index (a filter, or the proofs arriving): the place falls back to the first.
  const here = items.find((s) => s.id === current) ?? items[0]
  const text = (s: SectionLink) => (s.count !== undefined ? `${s.label} ${s.count}` : s.label)
  // The words keep the width they have in semibold (shell.css), so the row never shifts as the place moves.
  const words = (s: SectionLink) => <span className="shell-index__words" data-words={text(s)}>{text(s)}</span>

  return (
    <nav
      className={cn('shell-index', `shell-index--${form}`, open && 'is-open')}
      aria-labelledby={nameId}
      // The arrival's second step: it follows the lead, one step behind (demo/shell/arrival.ts).
      data-arrive="2"
      onKeyDown={(e) => { if (e.key === 'Escape' && open) { setOpen(false); toggle.current?.focus() } }}
    >
      <span id={nameId} className="shell-index__name">{name}</span>
      {/* The narrow form: one button that says where you are and opens the list (hidden by CSS when wide). */}
      <button
        ref={toggle}
        type="button"
        className="shell-index__toggle"
        aria-labelledby={`${nameId} ${hereId}`}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
      >
        <span id={hereId} className="shell-index__here">{words(here)}</span>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size="small" />
      </button>
      <div className="shell-index__panel">
      <ul id={listId} className="shell-index__list">
        {items.map((s) => (
          <li key={s.id} className={s.sep ? 'shell-index__sep' : undefined}>
            <a
              className="shell-index__link"
              href={withSection(window.location.hash, s.id)}
              aria-current={s.id === here.id ? 'location' : undefined}
              onClick={(e) => go(e, s)}
            >
              {words(s)}
            </a>
          </li>
        ))}
      </ul>
      {tools && <div className="shell-index__tools">{tools}</div>}
      </div>
    </nav>
  )
}
