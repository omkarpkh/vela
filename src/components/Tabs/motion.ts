import * as React from 'react'

/**
 * The underline's motion and the hover preview's size, shared by both implementations (core and
 * headless). Every movement is CSS (Tabs.css); this module only sets the marks the stylesheet keys
 * on and one custom property per trigger.
 *
 * Each trigger carries two decorative layers in the underline's place (guidelines/components/
 * tabs.md#motion): the Seed, a soft-ended bar a third of the tab wide that previews where a click
 * will land, and the line, the square-ended underline the Seed grows into. At rest the underline
 * is the selected trigger's own bottom border, exactly as before; the selected trigger's line lies
 * on that border at full strength, pixel for pixel, so that it can shrink away when another tab is
 * pressed. A pointer press grows the pressed tab's Seed and line into the underline where they are;
 * nothing travels across the row:
 *
 *   1. a pointer press on the list records the modality (capture phase, so it is known before
 *      either implementation activates the tab);
 *   2. the change that follows marks the list `data-vela-moving` in the event itself, before React
 *      commits the new selection, and sets `moving` so React keeps the mark. The new tab's border is
 *      hidden, its Seed and line grow from where they are, the old tab's line shrinks. The mark is
 *      written to the DOM first on purpose: React updates the tabs before their list, and changing
 *      the focused tab's tabindex makes Chromium recalculate style in the middle of that commit. A
 *      recalculation that saw the new selection without the mark started the line's change with no
 *      transition, so the underline jumped to full instead of growing;
 *   3. when every animation on those layers has finished — not after a timer, so a slowed review
 *      playback still ends at the right moment — `moving` clears and the border takes over again.
 *
 * A keyboard change sets `instant` instead: no transition anywhere in the Tabs and no Seed, because
 * from the keyboard nothing animates (foundations/motion.md). A second press mid-flight simply
 * changes every layer's target; CSS transitions retarget from wherever they are, and only the
 * latest change can end the flight.
 */
export interface TabsMotion {
  /** A pointer-initiated switch is in flight: the selected tab's border is hidden while its layers grow. */
  moving: boolean
  /** The last change came from the keyboard (or from code): nothing in the Tabs transitions, and no Seed shows. */
  instant: boolean
  /** Counts changes, so a layout effect can run after each one even when `moving` stays true. */
  changes: number
  /** Call from the change handler, inside the event that changes the value. */
  onChange: () => void
  /** Capture-phase handlers for the tab list element. */
  listProps: {
    onPointerDownCapture: (event: React.PointerEvent<HTMLElement>) => void
    onPointerMoveCapture: () => void
    onKeyDownCapture: () => void
  }
  /** Ends the flight once the layers' animations finish. Call from a layout effect that runs after the selection changed. */
  settle: (list: HTMLElement | null) => void
}

/** The decorative layers inside each trigger, as Tabs.css names them. */
export const LAYERS = '.vela-tabs__seed, .vela-tabs__line'

export function useTabsMotion(): TabsMotion {
  const modality = React.useRef<'pointer' | 'keyboard' | null>(null)
  // The tab list, as the last pointer press on it found it: the element the mark goes on.
  const list = React.useRef<HTMLElement | null>(null)
  const generation = React.useRef(0)
  const [moving, setMoving] = React.useState(false)
  const [instant, setInstant] = React.useState(false)
  const [changes, setChanges] = React.useState(0)
  const instantRef = React.useRef(instant)
  instantRef.current = instant

  const onChange = React.useCallback(() => {
    const pointer = modality.current === 'pointer'
    modality.current = null
    // Before React commits the new selection (see step 2 above).
    if (pointer) list.current?.setAttribute('data-vela-moving', '')
    generation.current++
    setChanges((n) => n + 1)
    setMoving(pointer)
    setInstant(!pointer)
  }, [])

  const listProps = React.useMemo(
    () => ({
      onPointerDownCapture: (event: React.PointerEvent<HTMLElement>) => {
        modality.current = 'pointer'
        list.current = event.currentTarget
        if (instantRef.current) setInstant(false)
      },
      // A pointer back on the list restores the hover fades, and the Seed, after a keyboard switch.
      onPointerMoveCapture: () => {
        if (instantRef.current) setInstant(false)
      },
      onKeyDownCapture: () => {
        modality.current = 'keyboard'
      },
    }),
    [],
  )

  const settle = React.useCallback((list: HTMLElement | null) => {
    const gen = generation.current
    // jsdom has no Web Animations; a list that is not rendered has no animations either. Reading
    // the animations flushes the style change, so the transitions this commit started are there.
    const animations =
      list && typeof list.getAnimations === 'function'
        ? list.getAnimations({ subtree: true }).filter((a) => {
            const target = (a.effect as KeyframeEffect | null)?.target
            return target instanceof Element && target.matches(LAYERS)
          })
        : []
    if (animations.length === 0) {
      setMoving(false)
      return
    }
    Promise.all(animations.map((a) => a.finished)).then(
      () => {
        if (generation.current === gen) setMoving(false)
      },
      // Cancelled: a newer change retargeted the transition, and its own settle ends the flight.
      () => {},
    )
  }, [])

  return React.useMemo(
    () => ({ moving, instant, changes, onChange, listProps, settle }),
    [moving, instant, changes, onChange, listProps, settle],
  )
}

/**
 * The Seed's width as a fraction of its tab's: a third, never under `min` pixels, never wider than
 * the tab. A tab with no width yet (not laid out) gets the third.
 */
export function previewScale(tabWidth: number, min: number): number {
  if (!(tabWidth > 0)) return 1 / 3
  return Math.min(1, Math.max(1 / 3, min / tabWidth))
}

/** `--vela-tab-preview-width-min` from an element's computed style, in px; 0 when no stylesheet is loaded. */
const readMin = (el: Element) => {
  const m = /^(\d*\.?\d+)px$/.exec(getComputedStyle(el).getPropertyValue('--vela-tab-preview-width-min').trim())
  return m ? Number(m[1]) : 0
}

/** The custom property Tabs.css scales the Seed and the line by. Internal; not part of the API. */
export const PREVIEW_SCALE = '--vela-tabs-preview-scale'

/**
 * Keeps each trigger's `--vela-tabs-preview-scale` current: set on mount and whenever a tab is
 * resized (a web font arriving changes every tab's width). The floor is the token, read from the
 * stylesheet like the Tooltip's delay, so it has one source. Re-run when the tabs change.
 */
export function usePreviewScale(listRef: React.RefObject<HTMLElement | null>, tabsKey: unknown) {
  React.useEffect(() => {
    const list = listRef.current
    if (!list) return
    const tabs = [...list.querySelectorAll<HTMLElement>('[role="tab"]')]
    const set = (tab: HTMLElement) => tab.style.setProperty(PREVIEW_SCALE, String(previewScale(tab.offsetWidth, readMin(tab))))
    tabs.forEach(set)
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => entries.forEach((e) => set(e.target as HTMLElement)))
    tabs.forEach((t) => observer.observe(t))
    return () => observer.disconnect()
  }, [listRef, tabsKey])
}
