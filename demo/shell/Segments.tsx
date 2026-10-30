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
 * - Locked values (slice 2; specs/segmented-control.md, "Locked, the state"): a value the other
 *   settings rule out stays a tab stop with aria-disabled="true", its reason as its accessible
 *   description, default text with a dashed edge, never faded, and no glyph. Pressing it selects
 *   nothing and calls onLockedPress. The word "locked" is never on screen or in a name.
 */
import { Fragment, useId } from 'react'
import { cn } from '../../src'
import './shell.css'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  /** Can't be chosen with the other settings as they are; the reason is one sentence a person can act on. */
  locked?: { reason: string }
}

export interface SegmentsProps<T extends string> {
  /** The group's accessible name ("Theme", "Stage", "Implementation"). */
  label: string
  value: T
  options: readonly SegmentOption<T>[]
  onChange: (value: T) => void
  /** Called when a locked value is pressed: open the panel that says the rule and the legal moves. */
  onLockedPress?: (value: T) => void
  className?: string
}

export function Segments<T extends string>({ label, value, options, onChange, onLockedPress, className }: SegmentsProps<T>) {
  const id = useId()
  return (
    <div className={cn('shell-segments', className)} role="group" aria-label={label}>
      {options.map((o, i) => (
        <Fragment key={o.value}>
        <button
          type="button"
          className={cn('shell-segment', o.locked && 'is-locked')}
          data-value={o.value}
          aria-current={o.value === value ? 'true' : undefined}
          aria-disabled={o.locked ? 'true' : undefined}
          aria-describedby={o.locked ? `${id}-r${i}` : undefined}
          onClick={() => {
            if (o.locked) onLockedPress?.(o.value)
            else if (o.value !== value) onChange(o.value)
          }}
        >
          {o.label}
        </button>
        {/* The reason sits beside the button, not in it, so it is the description and never the name. */}
        {o.locked && <span id={`${id}-r${i}`} className="vela-sr-only">{o.locked.reason}</span>}
        </Fragment>
      ))}
    </div>
  )
}
