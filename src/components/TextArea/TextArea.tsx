import * as React from 'react'
import { cn } from '../../lib/cn'

/** Characters as a person counts them: code points, not UTF-16 units. */
const length = (s: string) => [...s].length
const clip = (s: string, max: number) => (length(s) > max ? [...s].slice(0, max).join('') : s)
/** "Near the limit": 10% or less of it remains. */
const nearLimit = (count: number, max: number) => max - count <= Math.max(1, Math.ceil(max * 0.1))

interface TextAreaBaseProps
  extends Omit<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    'value' | 'defaultValue' | 'onChange' | 'rows' | 'cols' | 'maxLength' | 'children'
  > {
  /** Required — a text area without a visible label is a support ticket. */
  label: string
  /** Helper text below the field. Announced via aria-describedby. */
  hint?: string
  /** Presence puts the field in the error state; the string is the message. */
  error?: string
  size?: 'tiny' | 'regular' | 'large'
  /** Minimum height, in lines. */
  rows?: number
  /** The limit in characters (code points); shows a live "n / max" count. */
  maxLength?: number
  /** Vertical or not at all. There is no horizontal resize. */
  resize?: 'vertical' | 'none'
  /** The native change event; with maxLength, event.target.value is already within the limit. */
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
  className?: string
}

/**
 * Controlled and uncontrolled are exclusive, so the union says it: `value` drives the field
 * from outside, `defaultValue` seeds it once, and the other arm's prop is `never`.
 */
export type TextAreaProps = TextAreaBaseProps &
  (
    | { /** Controlled text. */ value: string; defaultValue?: never }
    | { value?: never; /** Uncontrolled initial text. */ defaultValue?: string }
  )

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea(
    {
      label,
      hint,
      error,
      size = 'regular',
      rows = 3,
      maxLength,
      resize = 'vertical',
      value,
      defaultValue,
      onChange,
      id,
      required,
      className,
      style,
      ...rest
    },
    ref,
  ) {
    const reactId = React.useId()
    const fieldId = id ?? reactId
    const hintId = `${fieldId}-hint`
    const errorId = `${fieldId}-error`
    const countId = `${fieldId}-count`

    const isControlled = value !== undefined
    const [internal, setInternal] = React.useState(() =>
      maxLength === undefined ? defaultValue ?? '' : clip(defaultValue ?? '', maxLength),
    )
    const current = isControlled ? value : internal

    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      // The limit is enforced here, in code points, rather than with the native maxlength —
      // which counts UTF-16 units and would stop an emoji before the visible count said so.
      if (maxLength !== undefined) {
        const clipped = clip(event.target.value, maxLength)
        if (clipped !== event.target.value) event.target.value = clipped
      }
      if (!isControlled) setInternal(event.target.value)
      onChange?.(event)
    }

    const hasCount = maxLength !== undefined
    const count = length(current)
    const remaining = hasCount ? maxLength - count : 0
    const announcement = !hasCount || !nearLimit(count, maxLength)
      ? ''
      : remaining <= 0
        ? 'Character limit reached'
        : `${remaining} ${remaining === 1 ? 'character' : 'characters'} left`

    // Only reference IDs that are actually rendered — a dangling
    // aria-describedby is worse than none at all.
    const describedBy =
      [hint ? hintId : null, error ? errorId : null, hasCount ? countId : null].filter(Boolean).join(' ') ||
      undefined

    return (
      <div className={cn('vela-field', className)}>
        <label className="vela-field__label" htmlFor={fieldId}>
          {label}
          {required && (
            <span className="vela-field__required" aria-hidden="true">
              *
            </span>
          )}
        </label>
        <textarea
          {...rest}
          ref={ref}
          id={fieldId}
          rows={rows}
          required={required}
          value={current}
          onChange={handleChange}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn('vela-text-area', `vela-text-area--${size}`, `vela-text-area--resize-${resize}`)}
          style={{ ...style, ['--vela-text-area-rows' as string]: rows }}
        />
        {(hint || hasCount) && (
          <div className="vela-text-area__footer">
            {hint && (
              <span id={hintId} className="vela-field__hint">
                {hint}
              </span>
            )}
            {hasCount && (
              <span id={countId} className="vela-text-area__count">
                {count} / {maxLength}
              </span>
            )}
          </div>
        )}
        {error && (
          <span id={errorId} className="vela-field__error" role="alert">
            {error}
          </span>
        )}
        {hasCount && (
          <span className="vela-sr-only" aria-live="polite">
            {announcement}
          </span>
        )}
      </div>
    )
  },
)
