/**
 * Segments: a shell part of the Vela site, not a kit component. It is never exported from the
 * package, and it is deleted when the kit's part lands.
 *
 * Stands in for: Segmented Control. The kit has none yet; it is a gap, flagged rather than
 * invented (DESIGN.md, "Not in the kit"). Spec: the playground spec, section 5 (D4, "Segments")
 * and section 13 (forced colours). Built in slice 0 of the playground redesign.
 *
 * The contract it follows:
 * - Each value is a button. Tab moves to each one; Enter or Space selects it; arrow keys do
 *   nothing, so there is no roving tabindex to learn.
 * - The selected value has aria-current="true", and a change applies at once.
 * - No primary filled Button stands for "selected": the selected segment is a neutral surface
 *   (--vela-bg-selected) with a 2px active edge, so the signal is shape as well as colour.
 * - Under forced colours the selected segment is Highlight / HighlightText with a 2px border, with
 *   forced-color-adjust: none on that element only (shell.css).
 * - Locked values (focusable, aria-disabled, a lock panel) are slice 2 and are not here.
 */
import { cn } from '../../src'
import './shell.css'

export interface SegmentOption<T extends string> {
  value: T
  label: string
}

export interface SegmentsProps<T extends string> {
  /** The group's accessible name ("Theme", "Stage", "Implementation"). */
  label: string
  value: T
  options: readonly SegmentOption<T>[]
  onChange: (value: T) => void
  className?: string
}

export function Segments<T extends string>({ label, value, options, onChange, className }: SegmentsProps<T>) {
  return (
    <div className={cn('shell-segments', className)} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="shell-segment"
          aria-current={o.value === value ? 'true' : undefined}
          onClick={() => { if (o.value !== value) onChange(o.value) }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
