import * as React from 'react'

/**
 * The selected indicator's motion, shared by both implementations (core and headless).
 *
 * At rest the selected underline is the selected trigger's own bottom border, exactly as it was
 * before the indicator existed. The indicator — one absolutely positioned bar inside the tab list
 * that always sits under the selected tab, invisible — stands in for that border only while a
 * pointer-initiated switch is in flight:
 *
 *   1. a pointer press on the list records the modality (capture phase, so it is known before
 *      either implementation activates the tab);
 *   2. the change that follows sets `moving` in the same React commit as the new selection, so the
 *      list carries `data-vela-moving` in the very style change that moves the indicator's
 *      transform: the transition starts from where the bar was, the new trigger's border is
 *      hidden, the bar is shown;
 *   3. when every animation on the bar has finished — not after a timer, so a slowed review
 *      playback still ends at the right moment — `moving` clears and the border takes over again.
 *
 * A keyboard change sets `instant` instead: no transition on the bar or on the triggers' colours,
 * because from the keyboard nothing animates (foundations/motion.md). A second press mid-flight
 * simply moves the transform's target; CSS transitions retarget from wherever the bar is, and the
 * earlier animation's `finished` promise rejects, so only the latest change can end the flight.
 */
export interface IndicatorMotion {
  /** A pointer-initiated switch is in flight: the indicator is visible and transitions its transform. */
  moving: boolean
  /** The last change came from the keyboard (or from code): the triggers change colour without a transition. */
  instant: boolean
  /** Counts changes, so a layout effect can run after each one even when `moving` stays true. */
  changes: number
  /** Call from the change handler, inside the event that changes the value. */
  onChange: () => void
  /** Capture-phase handlers for the tab list element. */
  listProps: {
    onPointerDownCapture: () => void
    onPointerMoveCapture: () => void
    onKeyDownCapture: () => void
  }
  /** Ends the flight once the indicator's animations finish. Call from a layout effect that runs after the indicator moved. */
  settle: (indicator: HTMLElement | null) => void
}

export function useIndicatorMotion(): IndicatorMotion {
  const modality = React.useRef<'pointer' | 'keyboard' | null>(null)
  const generation = React.useRef(0)
  const [moving, setMoving] = React.useState(false)
  const [instant, setInstant] = React.useState(false)
  const [changes, setChanges] = React.useState(0)
  const instantRef = React.useRef(instant)
  instantRef.current = instant

  const onChange = React.useCallback(() => {
    const pointer = modality.current === 'pointer'
    modality.current = null
    generation.current++
    setChanges((n) => n + 1)
    setMoving(pointer)
    setInstant(!pointer)
  }, [])

  const listProps = React.useMemo(
    () => ({
      onPointerDownCapture: () => {
        modality.current = 'pointer'
        if (instantRef.current) setInstant(false)
      },
      // A pointer back on the list restores the triggers' hover fades after a keyboard switch.
      onPointerMoveCapture: () => {
        if (instantRef.current) setInstant(false)
      },
      onKeyDownCapture: () => {
        modality.current = 'keyboard'
      },
    }),
    [],
  )

  const settle = React.useCallback((indicator: HTMLElement | null) => {
    const gen = generation.current
    // jsdom has no Web Animations; an element that is not rendered has no animations either.
    const animations = indicator && typeof indicator.getAnimations === 'function' ? indicator.getAnimations() : []
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
 * Where the indicator goes, as the two custom properties Tabs.css reads: the selected tab's left
 * edge in the list's scrolling coordinates, and its width as a fraction of the list's width (the
 * bar is the list's full width, scaled down from its left edge, so its geometry moves only by
 * transform). Measured with getBoundingClientRect for sub-pixel precision, and divided by the
 * list's own rendered scale so a transformed ancestor does not distort it.
 */
export function measureIndicator(list: HTMLElement, tab: HTMLElement | null) {
  if (!tab || list.offsetWidth === 0 || list.clientWidth === 0) return null
  const l = list.getBoundingClientRect()
  const t = tab.getBoundingClientRect()
  const zoom = l.width / list.offsetWidth || 1
  return {
    x: (t.left - l.left) / zoom + list.scrollLeft - list.clientLeft,
    scale: t.width / zoom / list.clientWidth,
  }
}

/** The custom properties Tabs.css reads, as a style object (headless) or set on the element (core). */
export const indicatorVars = (x: string, scale: number) => ({
  '--vela-tabs-indicator-x': x,
  '--vela-tabs-indicator-scale': String(scale),
})
