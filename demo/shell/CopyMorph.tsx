/**
 * Copy Morph: a shell part of the Vela site, not a kit component. It is never exported from the
 * package, and it is deleted when the kit's part lands.
 *
 * Stands in for: Copy Button (`specs/copy-button.md`, specified, not built), and the copy control
 * inside Copyable Value (`specs/copyable-value.md`). Ported from the icon thread's lab, "Copy Lab
 * Stage 2" (30 Oct 2026), for the Copy pattern page (`guidelines/patterns/copy.md`; playground spec,
 * section 12). Every page that shows it labels it "Experimental, not yet in the kit".
 *
 * The contract it follows:
 * - The copy mark becomes a tick: one 24-unit SVG of eleven parts (the back sheet; the press, move
 *   and turn groups; two telescoping segments per arm; the corner arc; two leftover outlines). CSS
 *   transitions only, so every motion turns from wherever it is; this file sets states and timers.
 *   Geometry: Lucide `copy` and `check` (ISC). Stroke and size follow Icon (`.vela-icon`).
 * - States are attributes: `data-state` idle · hover · copied · failed · busy, `data-press` while a
 *   pointer is down, `data-ret` while the tick hands back, `data-instant` when the copy came from
 *   the keyboard, so nothing animates.
 * - The tick only once the write has resolved. It holds for 1.5s, and the hold waits while the page
 *   is hidden or the window has lost focus; on the return it hands back at once.
 * - The name is "Copy <what>" in every state. The host announces the outcome (once, politely) and
 *   owns the failure words; this part reports what happened through `onResult`.
 * - Copy again, always: the control is never disabled by its own success.
 * - Reduced motion (the system setting, or the page's own switch through `.shell-cm-reduced`): the
 *   tick lands in one frame and there is no lean. The hold is a wait, not motion, so it stays.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn, Icon } from '../../src'
import { copyText, type CopyResult, type CopySimulation } from './Copy'
import './shell.css'

export type MorphState = 'idle' | 'hover' | 'copied' | 'failed' | 'busy'
/** A pose the host can put the control in: the Copy page's state scrubber and its "Show me" buttons. */
export interface MorphPose { state: MorphState; press?: boolean; ret?: boolean; instant?: boolean }

/** The tick's hold, before it hands back (copy.md, section 2, "Away"). */
export const HOLD_MS = 1500

/** The glyph: eleven parts on Lucide's 24-unit grid. Decorative; the button carries the name. */
export function MorphGlyph() {
  return (
    <svg className="vela-icon shell-cm__glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <g className="press">
        <path className="back" d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        <g className="move">
          <g className="turn">
            <g className="lB">
              <path className="chain" pathLength={1} d="M22 10a2 2 0 0 0-2-2H10a2 2 0 0 0-1.414.586" />
              <path d="M22 18V10" />
            </g>
            <path className="lA" d="M22 20V12" />
            <g className="sB">
              <path className="chain" pathLength={1} d="M10 22a2 2 0 0 1-2-2V10a2 2 0 0 1 .586-1.414" />
              <path d="M15 22H10" />
            </g>
            <path className="sA" d="M20 22H15" />
            <path className="arc" d="M22 20a2 2 0 0 1-2 2" />
          </g>
        </g>
      </g>
    </svg>
  )
}

export interface CopyMorphProps {
  /** What it copies, in words: the name is "Copy " + this ("Copy request id"). */
  what: string
  /** The value, or a fetch for one (a secret is fetched at the press, never kept in the page). */
  text: string | (() => Promise<string>)
  /** The element that shows the value: the fallback copies from it, and a failure leaves it selected. */
  shownId?: string
  /** The box: 24px, 35px, or the page's large preview. The glyph stays 16px in both real boxes. */
  box?: 'small' | 'regular' | 'preview'
  /** A pose to show; a new pose replaces the current state, and the control still works from it. */
  pose?: MorphPose
  /** The Copy page's simulated refusals. They replace this copy's own calls, never the browser's settings. */
  simulate?: CopySimulation
  /** What happened, with the text that was written when it was copied (a fetched secret included, for its receipt). */
  onResult?: (result: CopyResult, written?: string) => void
  /** The Copy page's Keyboard switch: every press is treated as one from the keyboard, so nothing animates. */
  keyboard?: boolean
  /** The tick has handed back: the host may now show its "Copied" mark. */
  onHandBack?: () => void
  /** Ids of the host's words that describe the control (a failure, "Copied here earlier"). */
  describedBy?: string
  className?: string
}

export function CopyMorph({ what, text, shownId, box = 'small', pose, simulate, onResult, onHandBack, describedBy, keyboard, className }: CopyMorphProps) {
  const [state, setState] = useState<MorphState>(pose?.state ?? 'idle')
  const [press, setPress] = useState(!!pose?.press)
  const [ret, setRet] = useState(!!pose?.ret)
  const [instant, setInstant] = useState(!!pose?.instant)
  const inside = useRef(false)
  const kbd = useRef(false)
  const hold = useRef<{ timer?: number; left: number; since: number } | null>(null)
  const retTimer = useRef<number | undefined>(undefined)
  const stateRef = useRef(state)
  stateRef.current = state
  const results = useRef(onResult)
  results.current = onResult
  const handBacks = useRef(onHandBack)
  handBacks.current = onHandBack

  const clearHold = () => { if (hold.current?.timer) window.clearTimeout(hold.current.timer); hold.current = null }

  const handBack = useCallback((fast: boolean) => {
    clearHold()
    if (fast) setInstant(true)
    setRet(true)
    setState(inside.current ? 'hover' : 'idle')
    window.clearTimeout(retTimer.current)
    retTimer.current = window.setTimeout(() => { setRet(false); setInstant(false) }, fast ? 20 : 200)
    handBacks.current?.()
  }, [])

  // The page or the window is away: the hold waits for you.
  const away = () => document.hidden || !document.hasFocus()
  const runHold = useCallback((ms: number) => {
    clearHold()
    const h = { left: ms, since: performance.now(), timer: undefined as number | undefined }
    hold.current = h
    if (!away()) h.timer = window.setTimeout(() => handBack(kbd.current), ms)
  }, [handBack])

  useEffect(() => {
    const pause = () => {
      const h = hold.current
      if (!h || h.timer === undefined) return
      window.clearTimeout(h.timer)
      h.timer = undefined
      h.left = Math.max(0, h.left - (performance.now() - h.since))
    }
    // On the return, the tick hands back at once, where you can see it.
    const back = () => { if (hold.current && !away()) handBack(true) }
    const onVisibility = () => (document.hidden ? pause() : back())
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', pause)
    window.addEventListener('focus', back)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', pause)
      window.removeEventListener('focus', back)
    }
  }, [handBack])

  useEffect(() => () => { clearHold(); window.clearTimeout(retTimer.current) }, [])

  // A pose from the host: shown as it is, with no hold running.
  useEffect(() => {
    if (!pose) return
    clearHold()
    window.clearTimeout(retTimer.current)
    setState(pose.state)
    setPress(!!pose.press)
    setRet(!!pose.ret)
    setInstant(!!pose.instant)
  }, [pose])

  const succeed = useCallback((written?: string) => {
    setInstant(kbd.current)
    setState('copied')
    runHold(HOLD_MS)
    results.current?.('copied', written)
  }, [runHold])

  // After a failure, the person may copy the selection themselves: the page sees it, and the alert
  // turns into the tick (copy.md, section 4).
  useEffect(() => {
    if (state !== 'failed' || !shownId) return
    const onCopy = () => {
      const shown = document.getElementById(shownId)
      const sel = window.getSelection()
      if (shown && sel && sel.rangeCount && shown.contains(sel.getRangeAt(0).commonAncestorContainer) && sel.toString()) {
        kbd.current = true
        succeed(sel.toString())
      }
    }
    document.addEventListener('copy', onCopy)
    return () => document.removeEventListener('copy', onCopy)
  }, [state, shownId, succeed])

  const onClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (stateRef.current === 'busy') return
    kbd.current = keyboard || e.detail === 0
    setRet(false)
    window.clearTimeout(retTimer.current)
    let value: string
    if (typeof text === 'string') value = text
    else {
      setState('busy')
      try { value = await text() } catch { setPress(false); setState('failed'); results.current?.('none'); return }
    }
    const result = await copyText(value, shownId ? document.getElementById(shownId) : null, simulate)
    setPress(false)
    if (result === 'copied') { succeed(value); return }
    clearHold()
    setInstant(true)
    setState('failed')
    results.current?.(result)
  }

  return (
    <button
      type="button"
      className={cn('shell-cm', `shell-cm--${box}`, className)}
      aria-label={`Copy ${what}`}
      aria-describedby={describedBy}
      aria-busy={state === 'busy' ? true : undefined}
      data-state={state}
      data-press={press ? '' : undefined}
      data-ret={ret ? '' : undefined}
      data-instant={instant ? '' : undefined}
      data-forced={pose ? '' : undefined}
      onPointerEnter={(e) => {
        if (e.pointerType === 'touch') return
        inside.current = true
        if (stateRef.current === 'copied' && hold.current) handBack(kbd.current)
        else if (!ret && stateRef.current === 'idle') setState('hover')
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'touch') return
        inside.current = false
        setPress(false)
        if (stateRef.current === 'hover') setState('idle')
      }}
      onPointerDown={() => { if (!keyboard) { setInstant(false); setPress(true) } }}
      onPointerCancel={() => setPress(false)}
      onPointerUp={(e) => { if (e.pointerType === 'touch') window.setTimeout(() => { if (stateRef.current !== 'copied') setPress(false) }, 400) }}
      onClick={onClick}
    >
      {state === 'failed' || state === 'busy'
        ? <span className="shell-cm__alt"><Icon name={state === 'failed' ? 'circle-alert' : 'loader-circle'} size="regular" tone="inherit" /></span>
        : <MorphGlyph />}
    </button>
  )
}
