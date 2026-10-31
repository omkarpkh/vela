import * as React from 'react'

/**
 * "From the keyboard, nothing animates" (foundations/motion.md) for a control that owns a state.
 *
 * A key pressed inside the control marks it `instant` — its next change of state (Space on a
 * Checkbox or a Toggle, an arrow key in a Radio Group) lands with no transition. A pointer pressed
 * on it, or moving over it, clears the mark, so a pointer change animates and the hover fades come
 * back. The handlers run in the capture phase, so the mark is committed before the control's own
 * handler changes the state: a key event and the click it produces are separate events, and React
 * commits each one before the next.
 *
 * The mark is written as `data-vela-instant` on the element the handlers are spread on, the
 * repository's convention for "this change came from the keyboard". Internal; not exported.
 */
export function useKeyboardInstant() {
  const [instant, setInstant] = React.useState(false)
  const current = React.useRef(false)
  const set = React.useCallback((next: boolean) => {
    if (current.current === next) return
    current.current = next
    setInstant(next)
  }, [])
  const handlers = React.useMemo(
    () => ({
      onKeyDownCapture: () => set(true),
      onPointerDownCapture: () => set(false),
      onPointerMoveCapture: () => set(false),
    }),
    [set],
  )
  return { instant, handlers }
}
