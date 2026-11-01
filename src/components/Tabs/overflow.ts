import * as React from 'react'

/**
 * Tabs overflow (guidelines/components/tabs.md, "Overflow"), shared by both implementations. What
 * happens when the triggers no longer fit the row:
 *
 * - **Both.** The row still scrolls sideways. Any tab that is clicked, focused or opened is scrolled
 *   wholly into view, its focus ring included, clear of the fades. The edge where more tabs are
 *   fades (each trigger is masked where it passes the edge, so the list rule stays one unbroken
 *   line), and in forced colours the fade, which the system removes, becomes a 1px `CanvasText`
 *   line at that edge. A tab that is not wholly in view shows no Seed, so the Seed is never cut.
 * - **Headless only** (`sticky`). The open tab sticks to the edge it would leave by, at the focus
 *   ring's distance, and the tabs that pass under it fade out where they meet it; the "N more"
 *   control (the Dropdown List) sits outside the scroller at the row's end. Its count and news are
 *   measured here and reported to the component.
 *
 * Nothing here is a prop and nothing here is a token: the geometry is measured, and what the
 * stylesheet needs is one internal custom property per trigger (`--vela-tabs-fade`, its mask) and a
 * few data attributes (`data-vela-more-start`, `data-vela-more-end`, `data-vela-stuck`,
 * `data-vela-cut`, and `data-vela-overflow` on the headless row), like the Seed's
 * `--vela-tabs-preview-scale`. Every value the arithmetic needs
 * is read from the stylesheet's own tokens on the list: the gap, the focus ring's width and offset
 * and the fade's width (`--vela-space-20`), so each has one source.
 */

/** One trigger, as the row arithmetic needs it: its border-box width and its state. */
export interface RowTab {
  width: number
  selected: boolean
  disabled: boolean
  unseen: boolean
}

/** The row's geometry, read off the DOM by `readRow` (or written by a unit test). */
export interface RowInput {
  tabs: RowTab[]
  /** The scroller's visible width (clientWidth). */
  view: number
  /** Its scroll position (scrollLeft). */
  scroll: number
  /** Its padding at the start, where the first tab begins in scroll coordinates. */
  padStart: number
  /** The gap between triggers. */
  gap: number
  /** The focus ring's reach outside a trigger: its width plus its offset. */
  ring: number
  /** The fade's width. */
  fade: number
  /** The width the whole row has, the control included: everything fits when the tabs do. */
  room: number
  /** Headless: the open tab sticks to the edge it would leave by. */
  sticky: boolean
}

export interface RowTabResult {
  /** Not wholly in view: cut by an edge, faded, or under the stuck open tab. */
  hidden: boolean
  /** The mask image for this trigger's fade, or `none`. */
  fade: string
  /** Where it is drawn, from the scroller's start edge. */
  start: number
}

export interface RowResult {
  /** The tabs do not fit the row. When false nothing appears: the row is exactly today's. */
  overflow: boolean
  /** More tabs lie past the start edge, and past the end edge. */
  moreStart: boolean
  moreEnd: boolean
  /** Where each fade begins, measured in from its edge (0, or past the stuck open tab). */
  edgeStart: number
  edgeEnd: number
  /** The window a tab must lie in to be wholly in view, from the scroller's start edge. */
  winStart: number
  winEnd: number
  /** The furthest the row scrolls. */
  max: number
  /** The open tab is stuck at the start or the end edge. */
  stuck: 'start' | 'end' | null
  tabs: RowTabResult[]
  /** How many tabs are not wholly in view. */
  hiddenCount: number
  /** How many of those carry `unseen`. */
  unseenHidden: number
}

const EPS = 0.5
const NO_FADE = 'none'

/** Natural positions in scroll coordinates: where each trigger sits with nothing stuck. */
const naturalStarts = (input: RowInput) => {
  const out: number[] = []
  let x = input.padStart
  for (const t of input.tabs) {
    out.push(x)
    x += t.width + input.gap
  }
  return out
}

const contentWidth = (input: RowInput) =>
  input.tabs.reduce((sum, t) => sum + t.width, 0) + Math.max(0, input.tabs.length - 1) * input.gap

/**
 * The row at one scroll position: which tabs are hidden, where the fades are, whether the open tab
 * is stuck, and how many hidden tabs carry news. Pure, so the unit tests read the same answers the
 * browser does.
 */
export function measureRow(input: RowInput): RowResult {
  const { tabs, view, scroll, gap, ring, fade, sticky } = input
  const fits = view <= 0 || contentWidth(input) <= input.room + EPS
  const empty: RowResult = {
    overflow: false, moreStart: false, moreEnd: false, edgeStart: 0, edgeEnd: 0, winStart: 0, winEnd: view, max: 0, stuck: null,
    tabs: tabs.map(() => ({ hidden: false, fade: NO_FADE, start: 0 })),
    hiddenCount: 0, unseenHidden: 0,
  }
  if (fits) return empty

  const starts = naturalStarts(input)
  const scrollWidth = starts.length ? starts[starts.length - 1] + tabs[tabs.length - 1].width + input.padStart : 0
  const max = Math.max(0, scrollWidth - view)
  const moreStart = scroll > EPS
  const moreEnd = max - scroll > EPS

  // The open tab, and whether it is stuck. It sticks `ring` in from the edge it would leave by, so
  // its own focus ring shows (position: sticky on both sides). Within a fade's width of that point it
  // counts as stuck already: the fade then starts past it, so it is never faded, and the sliver of the
  // tab before it is cut.
  const k = tabs.findIndex((t) => t.selected)
  let stuck: RowResult['stuck'] = null
  let edgeStart = 0
  let edgeEnd = 0
  if (sticky && k >= 0) {
    const v = starts[k] - scroll
    const w = tabs[k].width
    const at = Math.min(Math.max(v, ring), view - ring - w)
    if (moreStart && v < ring + fade - EPS) stuck = 'start'
    else if (moreEnd && v + w > view - ring - fade + EPS) stuck = 'end'
    // The stuck tab's edge is half a gap past it: the fade, and in forced colours the line, start there.
    if (stuck === 'start') edgeStart = at + w + gap / 2
    if (stuck === 'end') edgeEnd = view - at + gap / 2
  }

  // The window a tab must lie in to be wholly in view: inside the edges, past any fade.
  const winStart = edgeStart + (moreStart ? fade : 0)
  const winEnd = view - edgeEnd - (moreEnd ? fade : 0)

  const out: RowTabResult[] = tabs.map((t, i) => {
    // The open tab never hides on the headless row: it sticks, and it is never faded.
    if (sticky && i === k) return { hidden: false, fade: NO_FADE, start: Math.min(Math.max(starts[i] - scroll, ring), view - ring - t.width) }
    const v = starts[i] - scroll
    const end = v + t.width
    const hidden = v < winStart - EPS || end > winEnd + EPS
    // The fade, in the trigger's own coordinates: transparent at the edge, opaque a fade's width in.
    const inStartFade = moreStart && v < winStart
    const inEndFade = moreEnd && end > winEnd
    let image = NO_FADE
    if (inStartFade || inEndFade) {
      const r = (n: number) => `${Math.round(n * 100) / 100}px`
      const a = inStartFade ? edgeStart - v : -1
      const b = inStartFade ? winStart - v : -1
      const c = inEndFade ? winEnd - v : t.width + 1
      const d = inEndFade ? view - edgeEnd - v : t.width + 1
      image = `linear-gradient(to right, transparent ${r(a)}, currentColor ${r(b)}, currentColor ${r(c)}, transparent ${r(d)})`
    }
    return { hidden, fade: image, start: v }
  })

  const hiddenCount = out.filter((t) => t.hidden).length
  const unseenHidden = out.filter((t, i) => t.hidden && tabs[i].unseen).length
  return { overflow: true, moreStart, moreEnd, edgeStart, edgeEnd, winStart, winEnd, max, stuck, tabs: out, hiddenCount, unseenHidden }
}

/**
 * Whether tab `j` is wholly in view at this result, its focus ring included: inside the window, clear
 * of the fades and of a stuck open tab. At an end of the row the ring's outer side lies outside the
 * scroller, which clips it, and no scroll can change that (tabs.md, Overflow, names the gap).
 */
export function inViewWithRing(result: RowResult, input: RowInput, j: number): boolean {
  const t = result.tabs[j]
  if (!t) return false
  const w = input.tabs[j].width
  const startOk = t.start - (result.moreStart ? input.ring : 0) >= result.winStart - EPS
  const endOk = t.start + w + (result.moreEnd ? input.ring : 0) <= result.winEnd + EPS
  return startOk && endOk
}

/**
 * The scroll position that brings tab `j` wholly into view, its focus ring included, clear of the
 * fades and of the open tab if that is stuck there, moving the row as little as possible. The
 * candidates are the few scroll positions where one of those limits is met exactly; the nearest
 * that works wins. Clamped to the row's ends.
 */
export function revealScroll(input: RowInput, j: number): number {
  const { tabs, view, scroll, gap, ring, fade, sticky } = input
  if (j < 0 || j >= tabs.length || view <= 0) return scroll
  const first = measureRow(input)
  if (!first.overflow) return scroll
  const max = first.max
  const starts = naturalStarts(input)
  const x = starts[j]
  const w = tabs[j].width
  const clamp = (s: number) => Math.min(max, Math.max(0, s))
  const lo = x + w + ring + fade - view
  const hi = x - ring - fade
  const candidates = [scroll, lo, hi, 0, max]
  const k = tabs.findIndex((t) => t.selected)
  if (sticky && k >= 0 && k !== j) {
    const wk = tabs[k].width
    const reserve = ring + wk + gap / 2
    // The open tab stuck at the start, this tab clear of it and its fade; or the open tab just out of
    // its sticking zone. And the same at the end.
    candidates.push(hi - reserve, starts[k] - ring - fade - 1, lo + reserve, starts[k] + wk + ring + fade + 1 - view)
  }
  // The open tab itself is brought to its own place, not left stuck at an edge over the tabs beside it.
  const own = sticky && j === k ? { ...input, sticky: false } : input
  let best: number | null = null
  for (const c of candidates.map(clamp)) {
    const at = { ...own, scroll: c }
    if (!inViewWithRing(measureRow(at), at, j)) continue
    if (best === null || Math.abs(c - scroll) < Math.abs(best - scroll)) best = c
  }
  // A row narrower than the tab and its margins: show the tab's start.
  return best ?? clamp(hi)
}

/** A length custom property or computed length in px, 0 when it is not a px value. */
const px = (value: string) => {
  const m = /^(-?\d*\.?\d+)px$/.exec(value.trim())
  return m ? Number(m[1]) : 0
}

/** The triggers of a list, in row order: its own children with the tab role. */
export const triggersOf = (list: HTMLElement) =>
  [...list.children].filter((c): c is HTMLElement => c instanceof HTMLElement && c.getAttribute('role') === 'tab')

/** Reads the row's geometry off the DOM. `room` is the row's own width (headless) or the list's (core). */
export function readRow(list: HTMLElement, row: HTMLElement | null, sticky: boolean): RowInput {
  const cs = getComputedStyle(list)
  const tabs = triggersOf(list).map((t) => ({
    width: t.getBoundingClientRect().width,
    selected: t.getAttribute('aria-selected') === 'true',
    disabled: (t as HTMLButtonElement).disabled === true,
    unseen: t.hasAttribute('data-vela-unseen'),
  }))
  return {
    tabs,
    view: list.clientWidth,
    scroll: list.scrollLeft,
    padStart: px(cs.paddingLeft),
    gap: px(cs.columnGap),
    ring: px(cs.getPropertyValue('--vela-focus-ring-width')) + px(cs.getPropertyValue('--vela-focus-ring-offset')),
    fade: px(cs.getPropertyValue('--vela-space-20')),
    room: row ? row.clientWidth : list.clientWidth,
    sticky,
  }
}

/** Writes the result where Tabs.css reads it. Only what changed is written. */
export function applyRow(list: HTMLElement, result: RowResult) {
  const flag = (el: HTMLElement, name: string, on: boolean) => {
    if (on !== el.hasAttribute(name)) el.toggleAttribute(name, on)
  }
  const attr = (el: HTMLElement, name: string, value: string | null) => {
    if (el.getAttribute(name) === value) return
    if (value === null) el.removeAttribute(name)
    else el.setAttribute(name, value)
  }
  flag(list, 'data-vela-more-start', result.moreStart)
  flag(list, 'data-vela-more-end', result.moreEnd)
  attr(list, 'data-vela-stuck', result.stuck)
  triggersOf(list).forEach((t, i) => {
    const r = result.tabs[i]
    if (!r) return
    flag(t, 'data-vela-cut', r.hidden)
    // The open tab, stuck: in forced colours it carries the edge (a gap of Canvas, one CanvasText line).
    attr(t, 'data-vela-stuck', result.stuck && t.getAttribute('aria-selected') === 'true' ? result.stuck : null)
    const fade = r.fade === NO_FADE ? '' : r.fade
    if (t.style.getPropertyValue('--vela-tabs-fade') !== fade) {
      if (fade) t.style.setProperty('--vela-tabs-fade', fade)
      else t.style.removeProperty('--vela-tabs-fade')
    }
  })
}

/** One tab as the headless control's list shows it. */
export interface RowItem {
  value: string
  label: string
  selected: boolean
  disabled: boolean
  unseen: boolean
}

/** What the headless control needs to know: the count, the news, and every tab for the list. */
export interface RowReport {
  overflow: boolean
  hidden: number
  unseenHidden: number
  items: RowItem[]
}

const SAME = (a: RowReport, b: RowReport) =>
  a.overflow === b.overflow && a.hidden === b.hidden && a.unseenHidden === b.unseenHidden && JSON.stringify(a.items) === JSON.stringify(b.items)
export const NO_OVERFLOW: RowReport = { overflow: false, hidden: 0, unseenHidden: 0, items: [] }

/** Every tab in row order, by the value each trigger carries (`data-vela-value`) and its own words. */
export const itemsOf = (list: HTMLElement): RowItem[] =>
  triggersOf(list).map((t) => ({
    value: t.getAttribute('data-vela-value') ?? '',
    label: labelOf(t),
    selected: t.getAttribute('aria-selected') === 'true',
    disabled: (t as HTMLButtonElement).disabled === true,
    unseen: t.hasAttribute('data-vela-unseen'),
  }))

/**
 * Keeps the row honest: measures on mount, on scroll, when anything in it is resized, and when a
 * tab's selection, news or disabled state changes; brings the open tab into view whenever it
 * changes, and a focused or clicked tab whenever it gets focus. A press is never scrolled under
 * the pointer: a reveal asked for while a pointer is down waits for it to come up, so the click
 * still lands on the tab it started on. Scrolling is instant, from every input: it answers the
 * person's own action, and from the keyboard nothing animates.
 *
 * Returns the report the headless control renders from; the core passes `report: false` and the
 * hook never sets state.
 */
export function useRowOverflow(
  listRef: React.RefObject<HTMLElement | null>,
  rowRef: React.RefObject<HTMLElement | null> | null,
  { sticky, report }: { sticky: boolean; report: boolean },
): RowReport {
  const [state, setState] = React.useState<RowReport>(NO_OVERFLOW)
  const last = React.useRef<RowReport>(NO_OVERFLOW)

  React.useLayoutEffect(() => {
    const list = listRef.current
    const row = rowRef?.current ?? null
    if (!list) return
    let frame = 0
    let pressing = false
    let pending: HTMLElement | null = null
    let selected: Element | null = null

    const measure = () => {
      const result = measureRow(readRow(list, row, sticky))
      applyRow(list, result)
      if (row) {
        if (result.overflow !== row.hasAttribute('data-vela-overflow')) row.toggleAttribute('data-vela-overflow', result.overflow)
      }
      if (report) {
        const next = { overflow: result.overflow, hidden: result.hiddenCount, unseenHidden: result.unseenHidden, items: result.overflow ? itemsOf(list) : [] }
        if (!SAME(next, last.current)) { last.current = next; setState(next) }
      }
    }
    const schedule = () => {
      if (frame) return
      frame = requestAnimationFrame(() => { frame = 0; measure() })
    }

    const reveal = (tab: HTMLElement) => {
      if (pressing) { pending = tab; return }
      const tabs = triggersOf(list)
      const j = tabs.indexOf(tab)
      if (j < 0) return
      const input = readRow(list, row, sticky)
      if (!measureRow(input).overflow) return
      const to = revealScroll(input, j)
      if (Math.abs(to - list.scrollLeft) > EPS) list.scrollLeft = to
      measure()
    }
    const revealSelected = () => {
      const now = triggersOf(list).find((t) => t.getAttribute('aria-selected') === 'true') ?? null
      if (now && now !== selected) reveal(now)
      selected = now
    }

    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement
      if (t.parentElement === list && t.getAttribute('role') === 'tab') reveal(t)
    }
    const onPointerDown = () => { pressing = true }
    const onPointerUp = () => {
      if (!pressing) return
      pressing = false
      // After the click: it is dispatched in the same task as the pointer coming up, before this frame.
      requestAnimationFrame(() => {
        const t = pending
        pending = null
        if (t && t.isConnected) reveal(t)
        revealSelected()
      })
    }

    measure()
    revealSelected()
    list.addEventListener('scroll', schedule, { passive: true })
    list.addEventListener('focusin', onFocusIn)
    list.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('pointerup', onPointerUp, true)
    document.addEventListener('pointercancel', onPointerUp, true)

    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule)
    const observeAll = () => {
      if (!resize) return
      resize.disconnect()
      resize.observe(list)
      if (row) resize.observe(row)
      triggersOf(list).forEach((t) => resize.observe(t))
    }
    observeAll()
    const mutation = typeof MutationObserver === 'undefined' ? null : new MutationObserver((records) => {
      if (records.some((r) => r.type === 'childList')) observeAll()
      revealSelected()
      schedule()
    })
    mutation?.observe(list, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-selected', 'disabled', 'data-vela-unseen'] })
    // A web font arriving changes every tab's width; the ResizeObserver sees that too, this is belt and braces.
    document.fonts?.ready.then(() => list.isConnected && schedule())

    return () => {
      if (frame) cancelAnimationFrame(frame)
      list.removeEventListener('scroll', schedule)
      list.removeEventListener('focusin', onFocusIn)
      list.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('pointerup', onPointerUp, true)
      document.removeEventListener('pointercancel', onPointerUp, true)
      resize?.disconnect()
      mutation?.disconnect()
    }
  }, [listRef, rowRef, sticky, report])

  return state
}

/** A trigger's name for the list: its own words, without the count badge or the decorative layers. */
export function labelOf(tab: HTMLElement): string {
  let text = ''
  tab.childNodes.forEach((n) => {
    if (n instanceof Element && n.matches('.vela-tabs__count, .vela-tabs__seed, .vela-tabs__line')) return
    text += n.textContent ?? ''
  })
  return text.replace(/\s+/g, ' ').trim()
}
