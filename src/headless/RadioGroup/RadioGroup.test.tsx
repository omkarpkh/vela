import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { RadioGroup } from './RadioGroup'

// The spec is guidelines/components/radio-group.md. Radio Group ships from
// `@omkarux/vela/headless` only, on Base UI 1.9; these tests are the spec's, not Base UI's.
const focus = (el: HTMLElement) => act(() => el.focus())

function Enforcement(props: { onValueChange?: (v: string) => void; error?: string; defaultValue?: string; disabled?: boolean }) {
  return (
    <RadioGroup
      label="Enforcement"
      defaultValue={props.defaultValue ?? 'block'}
      onValueChange={props.onValueChange}
      error={props.error}
      disabled={props.disabled}
      name="mode"
    >
      <RadioGroup.Radio value="monitor" label="Monitor" description="Log the match, allow the traffic" />
      <RadioGroup.Radio value="block" label="Block" />
      <RadioGroup.Radio value="isolate" label="Isolate" disabled />
      <RadioGroup.Radio value="quarantine" label="Quarantine" />
    </RadioGroup>
  )
}

describe('RadioGroup (headless)', () => {
  it('is role="radiogroup" named by its visible label; each radio a native <button role="radio">', () => {
    render(<Enforcement />)
    expect(screen.getByRole('radiogroup', { name: 'Enforcement' })).toBeInTheDocument()
    const block = screen.getByRole('radio', { name: 'Block' })
    expect(block.tagName).toBe('BUTTON')
    expect(block).toHaveAttribute('type', 'button')
    expect(block).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Monitor' })).toHaveAttribute('aria-checked', 'false')
    const label = screen.getByText('Block')
    expect(label.tagName).toBe('LABEL')
    expect(label).toHaveAttribute('for', block.id)
  })

  it('selects on click and reports the next value', async () => {
    const onValueChange = vi.fn()
    render(<Enforcement onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole('radio', { name: /Monitor/ }))
    expect(onValueChange).toHaveBeenLastCalledWith('monitor')
    expect(screen.getByRole('radio', { name: /Monitor/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Block' })).toHaveAttribute('aria-checked', 'false')
  })

  it('clicking a label selects its radio', async () => {
    render(<Enforcement />)
    await userEvent.click(screen.getByText('Quarantine'))
    expect(screen.getByRole('radio', { name: 'Quarantine' })).toHaveAttribute('aria-checked', 'true')
  })

  it('does not self-update when controlled', async () => {
    const onValueChange = vi.fn()
    render(
      <RadioGroup label="Enforcement" value="block" onValueChange={onValueChange}>
        <RadioGroup.Radio value="monitor" label="Monitor" />
        <RadioGroup.Radio value="block" label="Block" />
      </RadioGroup>,
    )
    await userEvent.click(screen.getByRole('radio', { name: 'Monitor' }))
    expect(onValueChange).toHaveBeenCalledWith('monitor')
    expect(screen.getByRole('radio', { name: 'Block' })).toHaveAttribute('aria-checked', 'true')
  })

  it('has no selection when neither value nor defaultValue is passed, and is still one tab stop', async () => {
    render(
      <RadioGroup label="Retention">
        <RadioGroup.Radio value="30" label="30 days" />
        <RadioGroup.Radio value="90" label="90 days" />
      </RadioGroup>,
    )
    for (const r of screen.getAllByRole('radio')) expect(r).toHaveAttribute('aria-checked', 'false')
    await userEvent.tab()
    expect(screen.getByRole('radio', { name: '30 days' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('radio', { name: '90 days' })).not.toHaveFocus()
  })

  it('is one tab stop: the selected radio', () => {
    render(<Enforcement />)
    expect(screen.getByRole('radio', { name: 'Block' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('radio', { name: /Monitor/ })).toHaveAttribute('tabindex', '-1')
  })

  it('arrow keys move focus and selection, in both axes', async () => {
    const onValueChange = vi.fn()
    render(<Enforcement onValueChange={onValueChange} defaultValue="monitor" />)
    await focus(screen.getByRole('radio', { name: /Monitor/ }))
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('radio', { name: 'Block' })).toHaveFocus()
    expect(screen.getByRole('radio', { name: 'Block' })).toHaveAttribute('aria-checked', 'true')
    expect(onValueChange).toHaveBeenLastCalledWith('block')
    await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getByRole('radio', { name: /Monitor/ })).toHaveFocus()
    expect(screen.getByRole('radio', { name: /Monitor/ })).toHaveAttribute('aria-checked', 'true')
  })

  // [[rule: radio-disabled-is-skipped]]
  it('skips a disabled radio with the arrow keys and leaves it out of the tab order', async () => {
    const onValueChange = vi.fn()
    render(<Enforcement onValueChange={onValueChange} />)
    const isolate = screen.getByRole('radio', { name: 'Isolate' })
    expect(isolate).toBeDisabled()
    expect(isolate).toHaveAttribute('disabled')
    await focus(screen.getByRole('radio', { name: 'Block' }))
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('radio', { name: 'Quarantine' })).toHaveFocus()
    expect(screen.getByRole('radio', { name: 'Quarantine' })).toHaveAttribute('aria-checked', 'true')
    await userEvent.keyboard('{ArrowUp}')
    expect(screen.getByRole('radio', { name: 'Block' })).toHaveFocus()
    expect(onValueChange).not.toHaveBeenCalledWith('isolate')
    await userEvent.click(isolate)
    expect(isolate).toHaveAttribute('aria-checked', 'false')
  })

  it('Space selects the focused radio; Enter does not', async () => {
    render(
      <RadioGroup label="Retention">
        <RadioGroup.Radio value="30" label="30 days" />
        <RadioGroup.Radio value="90" label="90 days" />
      </RadioGroup>,
    )
    await userEvent.tab()
    const first = screen.getByRole('radio', { name: '30 days' })
    expect(first).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(first).toHaveAttribute('aria-checked', 'false')
    await userEvent.keyboard(' ')
    expect(first).toHaveAttribute('aria-checked', 'true')
  })

  it('disabled on the group disables every radio', () => {
    render(<Enforcement disabled />)
    for (const r of screen.getAllByRole('radio')) expect(r).toBeDisabled()
  })

  // [[rule: radio-group-describedby-only-rendered]]
  it('links a description and the error by aria-describedby, and only when they render', () => {
    const { rerender } = render(<Enforcement />)
    const group = screen.getByRole('radiogroup')
    expect(group).not.toHaveAttribute('aria-describedby')
    expect(group).not.toHaveAttribute('aria-invalid')
    expect(screen.getByRole('radio', { name: 'Block' })).not.toHaveAttribute('aria-describedby')
    expect(screen.getByRole('radio', { name: /Monitor/ })).toHaveAccessibleDescription('Log the match, allow the traffic')

    rerender(<Enforcement error="Choose how matches are handled" />)
    const ref = screen.getByRole('radiogroup').getAttribute('aria-describedby')!
    expect(document.getElementById(ref)).toHaveTextContent('Choose how matches are handled')
    expect(screen.getByRole('radiogroup')).toHaveAccessibleDescription('Choose how matches are handled')
  })

  it('error is a message: it is announced and puts the group in the error state', () => {
    render(<Enforcement error="Choose how matches are handled" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Choose how matches are handled')
    expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-invalid', 'true')
  })

  it('forwards name to the hidden inputs so a plain <form> submits the selection', () => {
    const { container } = render(
      <form>
        <Enforcement />
      </form>,
    )
    expect(new FormData(container.querySelector('form')!).get('mode')).toBe('block')
  })

  it('renders the dot only on the selected radio', () => {
    render(<Enforcement />)
    expect(screen.getByRole('radio', { name: 'Block' }).querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('radio', { name: /Monitor/ }).querySelector('svg')).toBeNull()
  })

  it('takes the orientation class', () => {
    const { container } = render(
      <RadioGroup label="Mode" orientation="horizontal">
        <RadioGroup.Radio value="a" label="A" />
      </RadioGroup>,
    )
    expect(container.firstElementChild).toHaveClass('vela-radio-group', 'vela-radio-group--horizontal')
  })

  // [[rule: radio-requires-group]]
  it('throws a named error for a RadioGroup.Radio outside a RadioGroup', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<RadioGroup.Radio value="a" label="A" />)).toThrow('<RadioGroup.Radio> must be rendered inside <RadioGroup>.')
    spy.mockRestore()
  })
})
