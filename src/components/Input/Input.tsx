import * as React from 'react'
import { cn } from '../../lib/cn'

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Required — an input without a visible label is a support ticket. */
  label: string
  /** Helper text below the field. Announced via aria-describedby. */
  hint?: string
  /** Presence puts the field in the error state; the string is the message. */
  error?: string
  size?: 'tiny' | 'regular' | 'large'
  className?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    { label, hint, error, size = 'regular', id, required, className, ...rest },
    ref,
  ) {
    const reactId = React.useId()
    const inputId = id ?? reactId
    const hintId = `${inputId}-hint`
    const errorId = `${inputId}-error`

    // Only reference IDs that are actually rendered — a dangling
    // aria-describedby is worse than none at all.
    const describedBy =
      [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined

    return (
      <div className={cn('vela-field', className)}>
        <label className="vela-field__label" htmlFor={inputId}>
          {label}
          {required && (
            <span className="vela-field__required" aria-hidden="true">
              *
            </span>
          )}
        </label>
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn('vela-input', `vela-input--${size}`)}
          {...rest}
        />
        {hint && (
          <span id={hintId} className="vela-field__hint">
            {hint}
          </span>
        )}
        {error && (
          <span id={errorId} className="vela-field__error" role="alert">
            {error}
          </span>
        )}
      </div>
    )
  },
)
