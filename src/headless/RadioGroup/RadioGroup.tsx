import * as React from 'react'
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group'
import { Radio as BaseRadio } from '@base-ui/react/radio'
import { cn } from '../../lib/cn'

/**
 * Radio Group on Base UI — born in `@omkarux/vela/headless` alongside Checkbox. The spec is
 * `guidelines/components/radio-group.md`; there is no core implementation.
 *
 * The behaviour — roving tabindex, arrow keys that move focus and selection, disabled radios
 * skipped — is Base UI's. Where its defaults differ from the spec, the mapping is made here and
 * recorded in the spec's "Implementations" section:
 *
 * - **Element.** Each radio renders a `<button>` through `render` with `nativeButton`, so the
 *   native `disabled` attribute lands on it, Base UI's roving focus skips it, and `RadioGroup.css`
 *   keys on `:disabled`.
 * - **Labelling.** Plain elements wired by explicit `aria-labelledby`, not `Field.Label` /
 *   `Fieldset.Legend`.
 * - **Provider guard.** Base UI's `Radio.Root` outside a group renders a standalone radio; this
 *   throws Vela's own named error instead.
 * - **Generics.** Base UI's value is `any`; the spec closes it to `string`.
 * - **Orientation.** Base UI has none (arrows move in both axes, as native radios do); here it is
 *   layout only.
 */

interface RadioGroupBaseProps {
  /** Required. The group's visible label, wired as its accessible name. */
  label: string
  /** Receives the NEXT value. */
  onValueChange?: (value: string) => void
  /** Disables every radio in the group. */
  disabled?: boolean
  /** Layout only; arrow keys move in both axes either way. */
  orientation?: 'vertical' | 'horizontal'
  /** The message. Presence puts the group in the error state; the string is announced. */
  error?: string
  /** Native, forwarded to the hidden `<input type="radio">`s for form submission. */
  name?: string
  /** `RadioGroup.Radio` elements. */
  children?: React.ReactNode
  className?: string
}

/** Controlled and uncontrolled are exclusive; omit both for no selection. */
export type RadioGroupProps = RadioGroupBaseProps &
  (
    | { /** Controlled: the selected radio's `value`. */ value: string; defaultValue?: never }
    | { value?: never; /** Uncontrolled initial selection. */ defaultValue?: string }
  )

export interface RadioProps {
  /** Required. What the group reports when this radio is chosen. */
  value: string
  /** Required. The visible label, also the accessible name. */
  label: string
  /** Native `disabled`: skipped by the arrow keys, out of the tab order. */
  disabled?: boolean
  /** A hint under the label, linked by `aria-describedby`. */
  description?: string
  className?: string
}

// Vela's own provider guard, so the named error is ours (Base UI renders a standalone radio).
const VelaRadioGroupContext = React.createContext<{ disabled: boolean } | null>(null)

const Dot = () => (
  <svg className="vela-radio__dot" viewBox="0 0 6 6" aria-hidden="true" focusable="false">
    <circle cx="3" cy="3" r="3" fill="currentColor" />
  </svg>
)

export function RadioGroup({
  label,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  orientation = 'vertical',
  error,
  name,
  children,
  className,
}: RadioGroupProps) {
  const id = React.useId()
  const labelId = `${id}-label`
  const errorId = `${id}-error`
  const handleValueChange = React.useCallback(
    (next: unknown) => {
      if (typeof next === 'string') onValueChange?.(next)
    },
    [onValueChange],
  )
  const context = React.useMemo(() => ({ disabled }), [disabled])

  return (
    <VelaRadioGroupContext.Provider value={context}>
      <div className={cn('vela-radio-group', `vela-radio-group--${orientation}`, disabled && 'vela-radio-group--disabled', className)}>
        <span id={labelId} className="vela-radio-group__label">
          {label}
        </span>
        <BaseRadioGroup
          value={value}
          defaultValue={defaultValue}
          onValueChange={handleValueChange}
          disabled={disabled || undefined}
          name={name}
          aria-labelledby={labelId}
          // Only reference ids that are rendered — no error, no attribute.
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          className="vela-radio-group__items"
        >
          {children}
        </BaseRadioGroup>
        {error && (
          <span id={errorId} className="vela-radio-group__error" role="alert">
            {error}
          </span>
        )}
      </div>
    </VelaRadioGroupContext.Provider>
  )
}

const Radio = React.forwardRef<HTMLButtonElement, RadioProps>(function Radio(
  { value, label, disabled = false, description, className },
  ref,
) {
  const group = React.useContext(VelaRadioGroupContext)
  if (!group) throw new Error('<RadioGroup.Radio> must be rendered inside <RadioGroup>.')
  const id = React.useId()
  const labelId = `${id}-label`
  const descriptionId = `${id}-description`
  const isDisabled = disabled || group.disabled

  return (
    <span className={cn('vela-radio', isDisabled && 'vela-radio--disabled', className)}>
      <BaseRadio.Root
        ref={ref}
        id={id}
        value={value}
        disabled={disabled}
        nativeButton
        render={<button type="button" />}
        aria-labelledby={labelId}
        aria-describedby={description ? descriptionId : undefined}
        className="vela-radio__circle"
      >
        <BaseRadio.Indicator className="vela-radio__indicator">
          <Dot />
        </BaseRadio.Indicator>
      </BaseRadio.Root>
      <span className="vela-radio__text">
        <label id={labelId} htmlFor={id} className="vela-radio__label">
          {label}
        </label>
        {description && (
          <span id={descriptionId} className="vela-radio__description">
            {description}
          </span>
        )}
      </span>
    </span>
  )
})

RadioGroup.Radio = Radio
