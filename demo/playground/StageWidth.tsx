/**
 * The stage width control (playground spec, section 5, "Stage width"; slice 2b). For components whose
 * spec describes their layout by container width (`containerResponsive` on the registry entry), it
 * narrows the frame the component sits in, so the reader can watch it respond. Tabs is the first.
 *
 * - A number field and a slider set the same value. On the slider, the arrows move 10px, Page Up and
 *   Page Down 50px (set here: native steps would stop short of the range's ends), Home and End go
 *   to the ends. A drag handle on the frame's edge does the same for a pointer, and is never the
 *   only way (WCAG 2.5.7). On a phone, the field alone.
 * - The field applies a value as soon as it is in range, and clamps what is left on leaving it, so
 *   typing "480" is never cut short at "4".
 * - The range runs from the spec's stated minimum (320px when it states none, WCAG 1.4.10's reflow
 *   width) to the width the stage gives. `undefined` means the full width.
 * - Only the frame moves: the stage keeps its size and place. Nothing animates.
 * - The slider is a native range input: a stand-in for Slider, which the kit doesn't have yet.
 */
import { useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

export const STEP = 10
export const PAGE_STEP = 50
/** WCAG 1.4.10's reflow width: the floor when the spec states no minimum. */
export const FLOOR = 320

export const clampWidth = (w: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(w)))

export function StageWidth({ min, max, width, onChange, phone, marks }: {
  min: number
  max: number
  /** The chosen width, or undefined for the full width. */
  width: number | undefined
  onChange: (w: number | undefined) => void
  phone: boolean
  /** Widths worth stopping at, drawn as ticks on the slider (the Copy page's 160px and 280px). */
  marks?: number[]
}) {
  const id = useId()
  const value = width ?? max
  const [draft, setDraft] = useState<string | null>(null)
  // A value at or past the stage's own width is the full width: nothing to narrow.
  const set = (w: number) => { const c = clampWidth(w, min, max); onChange(c >= max ? undefined : c) }
  return (
    <span className="pg-toolbar__group pg-width">
      <label className="pg-toolbar__label" htmlFor={`${id}-n`}>Container width</label>
      <input
        id={`${id}-n`}
        className="pg-width__field"
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={draft ?? value}
        onChange={(e) => {
          setDraft(e.target.value)
          const n = e.target.valueAsNumber
          if (Number.isFinite(n) && n >= min && n <= max) set(n)
        }}
        onBlur={() => {
          if (draft !== null) { const n = Number(draft); if (draft !== '' && Number.isFinite(n)) set(n) }
          setDraft(null)
        }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
      />
      <span className="pg-width__unit" aria-hidden="true">px</span>
      {!phone && (
        <input
          className="pg-width__slider"
          type="range"
          aria-label="Container width"
          aria-valuetext={`${value} pixels`}
          min={min}
          max={max}
          // Step 1, so the ends are exactly the range's ends (a step of 10 would stop short of a
          // stage 718px wide); the keys move 10 and 50 themselves.
          step={1}
          list={marks ? `${id}-marks` : undefined}
          value={value}
          onChange={(e) => set(e.target.valueAsNumber)}
          onKeyDown={(e) => {
            const by = { ArrowRight: STEP, ArrowUp: STEP, ArrowLeft: -STEP, ArrowDown: -STEP, PageUp: PAGE_STEP, PageDown: -PAGE_STEP }[e.key]
            if (by !== undefined) { e.preventDefault(); set(value + by) }
          }}
        />
      )}
      {!phone && marks && (
        <datalist id={`${id}-marks`}>{marks.map((m) => <option key={m} value={m} label={`${m}px`} />)}</datalist>
      )}
    </span>
  )
}

/** The pointer's way to the same value: a handle on the frame's right edge. Hidden from assistive tech. */
export function WidthHandle({ width, min, max, onChange }: { width: number; min: number; max: number; onChange: (w: number | undefined) => void }) {
  const start = useRef<{ x: number; w: number } | null>(null)
  const move = (e: ReactPointerEvent) => {
    if (!start.current) return
    const c = clampWidth(start.current.w + e.clientX - start.current.x, min, max)
    onChange(c >= max ? undefined : c)
  }
  return (
    <span
      className="pg-width__handle"
      aria-hidden="true"
      onPointerDown={(e) => { start.current = { x: e.clientX, w: width }; e.currentTarget.setPointerCapture(e.pointerId) }}
      onPointerMove={move}
      onPointerUp={() => { start.current = null }}
      onPointerCancel={() => { start.current = null }}
    />
  )
}
