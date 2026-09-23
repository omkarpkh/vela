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
      onPointerDown,
      onPointerUp,
      onPointerCancel,
      ...rest
    } = props as SolidButtonProps

    // Anchors the press on the point under the pointer, so the pixel being pressed does not
    // move while the rest of the button scales away from it.
    //
    // The press is driven from here rather than from :active, and that is not a preference.
    // A JS-supplied transform-origin consumed by a CSS :active rule always races: the browser
    // applies :active and paints the scale in the same frame the handler is writing the origin,
    // and when the write loses, the press pivots on the PREVIOUS contact point — the far edge,
    // which is the largest displacement available and strictly worse than the centre scale it
    // replaces. Measured on a 320px button pressed alternately at each edge: 2 losses in 50 on
    // pointerdown, 6 in 50 tracking pointermove. The hit guard cannot cover it either, because
    // the guard inherits the origin and moves with the button instead of holding still.
    //
    // Writing the origin and the pressed flag in the same statement removes the race: there is
    // no frame in which one has landed and the other has not. `vela-btn--js` tells the
    // stylesheet to stop driving the press from :active, so the two paths never both apply.
    const press = (event: React.PointerEvent<HTMLButtonElement>) => {
      const el = event.currentTarget
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        el.style.setProperty('--vela-btn-press-x', `${((event.clientX - rect.left) / rect.width) * 100}%`)
        el.style.setProperty('--vela-btn-press-y', `${((event.clientY - rect.top) / rect.height) * 100}%`)
      }
      el.setAttribute('data-vela-pressed', '')
      // Capture the pointer for the rest of the press. Without it the scale itself moves the
      // button out from under the pointer, which fires pointerleave — ending the press because
      // of the press — and leaves the pointerup to land on whatever is behind. With it every
      // remaining event targets this button, so the release and the click are guaranteed to
      // arrive here whatever the geometry does. Mouse pointers get no implicit capture; touch
      // and pen already have it.
      try { el.setPointerCapture(event.pointerId) } catch { /* capture is best-effort */ }
    }
    // The origin is deliberately left behind: clearing it would snap the pivot to the centre
    // while the release is still running, which is a visible jump for no gain. Only the flag
    // is removed, and the next press overwrites the origin in the same statement that sets it.
    const release = (el: HTMLButtonElement) => el.removeAttribute('data-vela-pressed')

    const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
      press(event)
      onPointerDown?.(event)
    }
    const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
      release(event.currentTarget)
      onPointerUp?.(event)
    }
    const handlePointerCancel = (event: React.PointerEvent<HTMLButtonElement>) => {
      release(event.currentTarget)
      onPointerCancel?.(event)
    }
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
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className={cn(
          'vela-btn',
          // Hands the press to the handlers above; see the note on `press`.
          'vela-btn--js',
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
