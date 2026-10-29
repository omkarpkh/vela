import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Checkbox } from './Checkbox'

// The spec is guidelines/components/checkbox.md. Checkbox ships from `@omkarux/vela/headless`
// only, on Base UI 1.9; these tests are the spec's, not Base UI's.
describe('Checkbox (headless)', () => {
  it('is a native <button role="checkbox"> named by its visible label', () => {
    render(<Checkbox label="Accept the terms" />)
    const box = screen.getByRole('checkbox', { name: 'Accept the terms' })
    expect(box.tagName).toBe('BUTTON')
    expect(box).toHaveAttribute('type', 'button')
    expect(box).toHaveAttribute('aria-checked', 'false')
    // The label is a <label htmlFor> AND the explicit aria-labelledby.
    const label = screen.getByText('Accept the terms')
    expect(label.tagName).toBe('LABEL')
    expect(label).toHaveAttribute('for', box.id)
    expect(box).toHaveAttribute('aria-labelledby', label.id)
  })

  it('toggles when uncontrolled and reports the next value', async () => {
    const onCheckedChange = vi.fn()
    render(<Checkbox label="Accept" onCheckedChange={onCheckedChange} />)
    const box = screen.getByRole('checkbox')
    await userEvent.click(box)
    expect(onCheckedChange).toHaveBeenLastCalledWith(true)
    expect(box).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(box)
    expect(onCheckedChange).toHaveBeenLastCalledWith(false)
    expect(box).toHaveAttribute('aria-checked', 'false')
  })

  it('starts from defaultChecked', () => {
    render(<Checkbox label="Accept" defaultChecked />)
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true')
  })

  it('does not self-update when controlled', async () => {
    const onCheckedChange = vi.fn()
    render(<Checkbox label="Accept" checked={false} onCheckedChange={onCheckedChange} />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(onCheckedChange).toHaveBeenCalledWith(true)
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'false')
  })

  it('clicking the label toggles the box', async () => {
    render(<Checkbox label="Accept" />)
    await userEvent.click(screen.getByText('Accept'))
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true')
  })

  it('Space toggles; Enter does not', async () => {
    render(<Checkbox label="Accept" />)
    await userEvent.tab()
    const box = screen.getByRole('checkbox')
    expect(box).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(box).toHaveAttribute('aria-checked', 'false')
    await userEvent.keyboard(' ')
    expect(box).toHaveAttribute('aria-checked', 'true')
  })

  it('disabled is the native attribute: out of the tab order, clicks swallowed', async () => {
    const onCheckedChange = vi.fn()
    render(
      <>
        <Checkbox label="Accept" disabled onCheckedChange={onCheckedChange} />
        <button type="button">After</button>
      </>,
    )
    const box = screen.getByRole('checkbox')
    expect(box).toBeDisabled()
    expect(box).toHaveAttribute('disabled')
    await userEvent.click(box)
    expect(onCheckedChange).not.toHaveBeenCalled()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
  })

  // [[rule: checkbox-indeterminate-is-mixed]]
  it('indeterminate is aria-checked="mixed" with a visible dash', () => {
    const { container } = render(<Checkbox label="Select all" indeterminate />)
    const box = screen.getByRole('checkbox')
    expect(box).toHaveAttribute('aria-checked', 'mixed')
    const glyph = box.querySelector('svg')
    expect(glyph).not.toBeNull()
    expect(glyph).toHaveAttribute('aria-hidden', 'true')
    // The dash is one horizontal stroke, not the tick.
    expect(glyph!.querySelector('path')!.getAttribute('d')).toBe('M4 8h8')
    expect(container.querySelectorAll('svg')).toHaveLength(1)
  })

  it('renders the tick only while checked: an unchecked box has no glyph in the DOM', async () => {
    render(<Checkbox label="Accept" />)
    const box = screen.getByRole('checkbox')
    expect(box.querySelector('svg')).toBeNull()
    await userEvent.click(box)
    expect(box.querySelector('svg path')!.getAttribute('d')).toBe('M3.5 8.5l3 3 6-7')
  })

  // [[rule: checkbox-describedby-only-rendered]]
  it('links description and error by aria-describedby, and only when they render', () => {
    const { rerender } = render(<Checkbox label="Accept" />)
    expect(screen.getByRole('checkbox')).not.toHaveAttribute('aria-describedby')
    expect(screen.getByRole('checkbox')).not.toHaveAttribute('aria-invalid')

    rerender(<Checkbox label="Accept" description="Required to continue" />)
    expect(screen.getByRole('checkbox')).toHaveAccessibleDescription('Required to continue')

    rerender(<Checkbox label="Accept" description="Required to continue" error="Accept the terms to continue" />)
    const box = screen.getByRole('checkbox')
    const ids = box.getAttribute('aria-describedby')!.split(' ')
    expect(ids).toHaveLength(2)
    for (const id of ids) expect(document.getElementById(id)).not.toBeNull()
    expect(box).toHaveAccessibleDescription('Required to continue Accept the terms to continue')
  })

  it('error is a message: it is announced and puts the box in the error state', () => {
    render(<Checkbox label="Accept" error="Accept the terms to continue" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Accept the terms to continue')
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true')
  })

  it('forwards name and value to the hidden input so a plain <form> submits them', async () => {
    const { container } = render(
      <form>
        <Checkbox label="Accept" name="terms" value="yes" defaultChecked />
      </form>,
    )
    const form = container.querySelector('form')!
    expect(new FormData(form).get('terms')).toBe('yes')
  })

  it('takes the size class, and no other', () => {
    const { container, rerender } = render(<Checkbox label="Accept" />)
    expect(container.firstElementChild).toHaveClass('vela-checkbox', 'vela-checkbox--regular')
    rerender(<Checkbox label="Accept" size="tiny" />)
    expect(container.firstElementChild).toHaveClass('vela-checkbox--tiny')
  })
})

describe('Checkbox.Group (headless)', () => {
  function Scope(props: { onValueChange?: (v: string[]) => void; disabled?: boolean }) {
    return (
      <Checkbox.Group label="Scan scope" defaultValue={['users']} onValueChange={props.onValueChange} disabled={props.disabled}>
        <Checkbox value="users" label="Users" />
        <Checkbox value="devices" label="Devices" description="Managed endpoints only" />
        <Checkbox value="apps" label="Applications" disabled />
      </Checkbox.Group>
    )
  }

  it('is role="group" named by its visible label', () => {
    render(<Scope />)
    expect(screen.getByRole('group', { name: 'Scan scope' })).toBeInTheDocument()
    expect(screen.getByText('Scan scope')).toBeVisible()
  })

  it('owns the state: defaultValue checks the boxes, a click reports the next array', async () => {
    const onValueChange = vi.fn()
    render(<Scope onValueChange={onValueChange} />)
    expect(screen.getByRole('checkbox', { name: 'Users' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('checkbox', { name: 'Devices' })).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Devices' }))
    expect(onValueChange).toHaveBeenLastCalledWith(['users', 'devices'])
    expect(screen.getByRole('checkbox', { name: 'Devices' })).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Users' }))
    expect(onValueChange).toHaveBeenLastCalledWith(['devices'])
  })

  it('does not self-update when controlled', async () => {
    const onValueChange = vi.fn()
    render(
      <Checkbox.Group label="Scan scope" value={['users']} onValueChange={onValueChange}>
        <Checkbox value="users" label="Users" />
        <Checkbox value="devices" label="Devices" />
      </Checkbox.Group>,
    )
    await userEvent.click(screen.getByRole('checkbox', { name: 'Devices' }))
    expect(onValueChange).toHaveBeenCalledWith(['users', 'devices'])
    expect(screen.getByRole('checkbox', { name: 'Devices' })).toHaveAttribute('aria-checked', 'false')
  })

  it('a disabled box in the group is skipped by Tab and ignores clicks', async () => {
    const onValueChange = vi.fn()
    render(<Scope onValueChange={onValueChange} />)
    const apps = screen.getByRole('checkbox', { name: 'Applications' })
    expect(apps).toBeDisabled()
    await userEvent.click(apps)
    expect(onValueChange).not.toHaveBeenCalled()
    await userEvent.tab()
    await userEvent.tab()
    expect(screen.getByRole('checkbox', { name: 'Devices' })).toHaveFocus()
    await userEvent.tab()
    expect(apps).not.toHaveFocus()
  })

  it('disabled on the group disables every box', () => {
    render(<Scope disabled />)
    for (const box of screen.getAllByRole('checkbox')) expect(box).toBeDisabled()
  })

  it('takes the orientation class', () => {
    const { container } = render(
      <Checkbox.Group label="Scope" orientation="horizontal">
        <Checkbox value="a" label="A" />
      </Checkbox.Group>,
    )
    expect(container.firstElementChild).toHaveClass('vela-checkbox-group', 'vela-checkbox-group--horizontal')
  })

  // [[rule: checkbox-in-group-requires-value]]
  it('throws a named error for a box in a group with no value', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() =>
      render(
        <Checkbox.Group label="Scope">
          <Checkbox label="No value" />
        </Checkbox.Group>,
      ),
    ).toThrow('<Checkbox> inside <Checkbox.Group> must carry a `value`')
    spy.mockRestore()
  })
})
