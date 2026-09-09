import * as React from 'react'
import { cn } from '../../lib/cn'

export type ButtonVariant = 'primary' | 'standard' | 'destructive'
export type ButtonSize = 'tiny' | 'regular' | 'large' | 'huge'

interface ButtonCommon
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'children'> {
  /** Label. Verb-first, Title Case: "Save Changes", not "Information". */
  children: React.ReactNode
  disabled?: boolean
  /** Shows an indicator and sets aria-busy. Clicks are ignored while true. */
  loading?: boolean
  type?: 'button' | 'submit'
}

export interface SolidButtonProps extends ButtonCommon {
  variant?: ButtonVariant
  appearance?: 'filled' | 'hollow'
  size?: ButtonSize
  /** Optional icon, always rendered LEFT of the label. There is no trailing slot. */
  icon?: React.ReactNode
}

/**
 * The text-link appearance is deliberately narrower than the others.
 * `icon?: never` and the closed `size` union mean the compiler — not a code
 * review — rejects `<Button appearance="text-link" variant="destructive" />`.
 */
export interface TextLinkButtonProps extends ButtonCommon {
  variant: 'primary'
  appearance: 'text-link'
  size?: 'tiny' | 'regular'
  icon?: never
}

export type ButtonProps = SolidButtonProps | TextLinkButtonProps

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(props, ref) {
    const {
      variant = 'standard',
      appearance = 'filled',
      size = 'regular',
      disabled = false,
      loading = false,
      type = 'button',
      icon,
      children,
      className,
      onClick,
      ...rest
    } = props as SolidButtonProps

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (loading) {
        event.preventDefault()
        return
      }
      onClick?.(event)
    }

    return (
      <button
        ref={ref}
        type={type}
        // Intentionally NOT disabled while loading: a disabled button leaves the
        // tab order and drops focus mid-interaction. aria-busy communicates the
        // state while the control stays reachable.
        disabled={disabled}
        aria-busy={loading || undefined}
        onClick={handleClick}
        className={cn(
          'vela-btn',
          `vela-btn--${variant}`,
          `vela-btn--${appearance}`,
          `vela-btn--${size}`,
          className,
        )}
        {...rest}
      >
        {loading ? (
          <span className="vela-btn__spinner" aria-hidden="true" />
        ) : icon ? (
          <span className="vela-btn__icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className="vela-btn__label">{children}</span>
      </button>
    )
  },
)
