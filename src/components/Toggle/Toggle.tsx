import * as React from 'react'
import { cn } from '../../lib/cn'

export interface ToggleProps {
  /** Controlled state. Omit for uncontrolled. */
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  /**
   * Required. A switch with no accessible name is unusable with a screen
   * reader, so the API does not allow one to exist.
   */
  label: string
  labelPosition?: 'right' | 'left'
  size?: 'tiny' | 'regular'
  id?: string
  name?: string
  className?: string
}

/**
 * A binary setting that takes effect IMMEDIATELY.
 * If the change only takes effect after a Save click, use Checkbox instead.
 */
export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  function Toggle(
    {
      checked,
      defaultChecked = false,
      onChange,
      disabled = false,
      label,
      labelPosition = 'right',
      size = 'regular',
      id,
      name,
      className,
    },
    ref,
  ) {
    const isControlled = checked !== undefined
    const [internal, setInternal] = React.useState(defaultChecked)
    const value = isControlled ? checked : internal
    const reactId = React.useId()
    const labelId = `${id ?? reactId}-label`

    const toggle = () => {
      if (disabled) return
      if (!isControlled) setInternal(!value)
      onChange?.(!value)
    }

    return (
      <span
        className={cn(
          'vela-toggle',
          `vela-toggle--${size}`,
          labelPosition === 'left' && 'vela-toggle--left',
          disabled && 'vela-toggle--disabled',
          className,
        )}
      >
        <button
          ref={ref}
          id={id}
          name={name}
          type="button"
          role="switch"
          aria-checked={value}
          aria-labelledby={labelId}
          disabled={disabled}
          onClick={toggle}
          className="vela-toggle__track"
        >
          <span className="vela-toggle__knob" />
        </button>
        <span id={labelId} className="vela-toggle__label" onClick={toggle}>
          {label}
        </span>
      </span>
    )
  },
)
