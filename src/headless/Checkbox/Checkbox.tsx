import * as React from 'react'
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox'
import { CheckboxGroup as BaseCheckboxGroup } from '@base-ui/react/checkbox-group'
import { cn } from '../../lib/cn'

/**
 * Checkbox and Checkbox.Group on Base UI — the first component born in `@omkarux/vela/headless`.
 * The spec is `guidelines/components/checkbox.md`; there is no core implementation.
 *
 * Where Base UI's defaults differ from the spec, the mapping is made here and recorded in the
 * spec's "Implementations" section:
 *
 * - **Element.** Base UI renders a `<span role="checkbox">`. The root renders a `<button>`
 *   through `render` with `nativeButton`, so the native `disabled` attribute lands on it and
 *   `Checkbox.css` keys on `:disabled` and the global `:focus-visible` ring.
 * - **Labelling.** A plain `<label htmlFor>` plus an explicit `aria-labelledby`, not Base UI's
 *   `Field.Label`; Base UI honours the explicit attribute over its fallback.
 * - **Group value.** Base UI identifies a grouped box by `value`, falling back to `name`. The spec
 *   requires `value` inside a group and this throws without one — Vela's own context guard.
 * - **Parent checkbox.** Base UI's `parent` / `allValues` are not exposed: `indeterminate` is a
 *   prop you set.
 */

export type CheckboxSize = 'regular' | 'tiny'

interface CheckboxBaseProps {
  /**
   * Required. The visible label, also the accessible name. A box with no name is unusable by
   * screen reader, so the type makes one impossible.
   */
  label: string
  /** Receives the NEXT value. */
  onCheckedChange?: (checked: boolean) => void
  /** "Some of the set": `aria-checked="mixed"` and a dash. Visual only. */
  indeterminate?: boolean
  /** Native `disabled`: leaves the tab order, swallows clicks. */
  disabled?: boolean
  size?: CheckboxSize
  /** A hint under the label, linked by `aria-describedby`. */
  description?: string
  /** The message. Presence puts the box in the error state; the string is announced. */
  error?: string
  /** Native, forwarded to the hidden `<input>` for form submission. */
  name?: string
  /** Native, forwarded. Required inside a Checkbox.Group — it is how the group knows the box. */
  value?: string
  className?: string
}

/**
 * Controlled and uncontrolled are exclusive, so the union says it: `checked` drives the box from
 * outside, `defaultChecked` seeds it once, and the other arm's prop is `never`.
 */
export type CheckboxProps = CheckboxBaseProps &
  (
    | { /** Controlled. Ignored inside a Group, which owns the state. */ checked: boolean; defaultChecked?: never }
    | { checked?: never; /** Uncontrolled initial state. */ defaultChecked?: boolean }
  )

interface CheckboxGroupBaseProps {
  /** Required. The group's visible label, wired as its accessible name. */
  label: string
  /** Receives the NEXT array of checked `value`s. */
  onValueChange?: (value: string[]) => void
  /** Disables every box in the group. */
  disabled?: boolean
  /** Layout only; keyboard order is document order either way. */
  orientation?: 'vertical' | 'horizontal'
  /** `Checkbox` elements, each with a `value`. */
  children?: React.ReactNode
  className?: string
}

export type CheckboxGroupProps = CheckboxGroupBaseProps &
  (
    | { /** Controlled: the `value`s of the checked boxes. */ value: string[]; defaultValue?: never }
    | { value?: never; /** Uncontrolled initial state. */ defaultValue?: string[] }
  )

// Vela's own group context: the Base UI group context is internal, and the spec's named error
// (`checkbox-in-group-requires-value`) and the disabled label colour both need to know.
const VelaCheckboxGroupContext = React.createContext<{ disabled: boolean } | null>(null)

const CheckIcon = () => (
  <svg className="vela-checkbox__glyph" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
    <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const DashIcon = () => (
  <svg className="vela-checkbox__glyph" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
    <path d="M4 8h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const CheckboxRoot = React.forwardRef<HTMLButtonElement, CheckboxProps>(function Checkbox(
  {
    label,
    checked,
    defaultChecked,
    onCheckedChange,
    indeterminate = false,
    disabled = false,
    size = 'regular',
    description,
    error,
    name,
    value,
    className,
  },
  ref,
) {
  const group = React.useContext(VelaCheckboxGroupContext)
  if (group && value === undefined) {
    throw new Error('<Checkbox> inside <Checkbox.Group> must carry a `value`: it is how the group knows the box.')
  }
  const id = React.useId()
  const labelId = `${id}-label`
  const descriptionId = `${id}-description`
  const errorId = `${id}-error`
  // Only reference ids that are rendered — a dangling aria-describedby is worse than none.
  const describedBy = [description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined
  const isDisabled = disabled || !!group?.disabled

  const handleChange = React.useCallback((next: boolean) => onCheckedChange?.(next), [onCheckedChange])

  return (
    <span className={cn('vela-checkbox', `vela-checkbox--${size}`, isDisabled && 'vela-checkbox--disabled', className)}>
      <BaseCheckbox.Root
        ref={ref}
        id={id}
        // Inside a group the group owns the state; the box's own props are ignored, as the spec says.
        checked={group ? undefined : checked}
        defaultChecked={group ? undefined : defaultChecked}
        onCheckedChange={handleChange}
        indeterminate={indeterminate}
        disabled={disabled}
        name={name}
        value={value}
        nativeButton
        render={<button type="button" />}
        aria-labelledby={labelId}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className="vela-checkbox__box"
      >
        <BaseCheckbox.Indicator className="vela-checkbox__indicator">
          {indeterminate ? <DashIcon /> : <CheckIcon />}
        </BaseCheckbox.Indicator>
      </BaseCheckbox.Root>
      <span className="vela-checkbox__text">
        <label id={labelId} htmlFor={id} className="vela-checkbox__label">
          {label}
        </label>
        {description && (
          <span id={descriptionId} className="vela-checkbox__description">
            {description}
          </span>
        )}
        {error && (
          <span id={errorId} className="vela-checkbox__error" role="alert">
            {error}
          </span>
        )}
      </span>
    </span>
  )
})

function CheckboxGroup({
  label,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  orientation = 'vertical',
  children,
  className,
}: CheckboxGroupProps) {
  const labelId = `${React.useId()}-label`
  const handleValueChange = React.useCallback((next: string[]) => onValueChange?.(next), [onValueChange])
  const context = React.useMemo(() => ({ disabled }), [disabled])
  return (
    <VelaCheckboxGroupContext.Provider value={context}>
      <div className={cn('vela-checkbox-group', `vela-checkbox-group--${orientation}`, disabled && 'vela-checkbox-group--disabled', className)}>
        <span id={labelId} className="vela-checkbox-group__label">
          {label}
        </span>
        <BaseCheckboxGroup
          value={value}
          defaultValue={defaultValue}
          onValueChange={handleValueChange}
          disabled={disabled}
          aria-labelledby={labelId}
          className="vela-checkbox-group__items"
        >
          {children}
        </BaseCheckboxGroup>
      </div>
    </VelaCheckboxGroupContext.Provider>
  )
}

/** A box that records intent, committed by a Save. If the change is live already, use Toggle. */
export const Checkbox = Object.assign(CheckboxRoot, { Group: CheckboxGroup })
