import * as React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { TextArea } from './TextArea'

const live = (container: HTMLElement) => container.querySelector('[aria-live]') as HTMLElement

describe('TextArea', () => {
  it('associates the label with a textarea', () => {
    render(<TextArea label="Justification" />)
    expect(screen.getByLabelText('Justification')).toBeInstanceOf(HTMLTextAreaElement)
  })

  it('describes the field with its hint', () => {
    render(<TextArea label="Justification" hint="Shown to the approver" />)
    expect(screen.getByLabelText('Justification')).toHaveAccessibleDescription('Shown to the approver')
  })

  it('marks the field invalid and announces the error', () => {
    render(<TextArea label="Justification" error="A justification is required" />)
    expect(screen.getByLabelText('Justification')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('A justification is required')
  })

  it('renders the required mark hidden and sets the native attribute', () => {
    const { container } = render(<TextArea label="Justification" required />)
    expect(screen.getByRole('textbox', { name: 'Justification' })).toBeRequired()
    expect(container.querySelector('.vela-field__required')).toHaveAttribute('aria-hidden', 'true')
  })

  it('sets rows, defaults to three, and carries the size and resize classes', () => {
    const { rerender } = render(<TextArea label="Notes" />)
    const field = screen.getByLabelText('Notes')
    expect(field).toHaveAttribute('rows', '3')
    expect(field).toHaveClass('vela-text-area--regular', 'vela-text-area--resize-vertical')
    rerender(<TextArea label="Notes" rows={6} size="large" resize="none" />)
    expect(field).toHaveAttribute('rows', '6')
    expect(field.style.getPropertyValue('--vela-text-area-rows')).toBe('6')
    expect(field).toHaveClass('vela-text-area--large', 'vela-text-area--resize-none')
  })

  it('forwards name, id, readOnly and disabled, and the ref lands on the textarea', () => {
    const ref = React.createRef<HTMLTextAreaElement>()
    render(<TextArea ref={ref} label="Notes" name="notes" id="incident-notes" readOnly disabled />)
    const field = screen.getByLabelText('Notes')
    expect(ref.current).toBe(field)
    expect(field).toHaveAttribute('name', 'notes')
    expect(field).toHaveAttribute('id', 'incident-notes')
    expect(field).toHaveAttribute('readonly')
    expect(field).toBeDisabled()
  })

  it('is uncontrolled from defaultValue and reports each change', async () => {
    const onChange = vi.fn()
    render(<TextArea label="Notes" defaultValue="Host" onChange={onChange} />)
    const field = screen.getByLabelText('Notes')
    await userEvent.type(field, ' 12')
    expect(field).toHaveValue('Host 12')
    expect(onChange).toHaveBeenCalledTimes(3)
  })

  it('does not self-update when controlled', async () => {
    const onChange = vi.fn()
    render(<TextArea label="Notes" value="Fixed" onChange={onChange} />)
    const field = screen.getByLabelText('Notes')
    await userEvent.type(field, 'x')
    expect(onChange).toHaveBeenCalled()
    expect(field).toHaveValue('Fixed')
  })

  // [[rule: text-area-describedby-only-rendered]]
  it('never points aria-describedby at an element that is not rendered', () => {
    const { rerender } = render(<TextArea label="Notes" />)
    const field = screen.getByLabelText('Notes')
    expect(field).not.toHaveAttribute('aria-describedby')

    rerender(<TextArea label="Notes" hint="Markdown is not rendered" error="Too vague" maxLength={140} />)
    const ids = field.getAttribute('aria-describedby')!.split(' ')
    expect(ids).toHaveLength(3)
    ids.forEach((id) => expect(document.getElementById(id)).not.toBeNull())

    rerender(<TextArea label="Notes" maxLength={140} />)
    const only = field.getAttribute('aria-describedby')!.split(' ')
    expect(only).toHaveLength(1)
    expect(document.getElementById(only[0])).toHaveTextContent('0 / 140')
  })

  // [[rule: text-area-count-in-code-points]]
  it('counts characters in code points, so an emoji is one character', async () => {
    const { container } = render(<TextArea label="Notes" maxLength={10} />)
    const field = screen.getByLabelText('Notes')
    await userEvent.type(field, 'ok 🔒')
    expect(container.querySelector('.vela-text-area__count')).toHaveTextContent('4 / 10')
    expect('ok 🔒'.length).toBe(5) // what a UTF-16 count — and the native maxlength — would say
  })

  // [[rule: text-area-count-in-code-points]]
  it('enforces the limit in the same unit: a paste past it keeps the first maxLength characters', () => {
    const onChange = vi.fn((e: React.ChangeEvent<HTMLTextAreaElement>) => e.target.value)
    const { container } = render(<TextArea label="Notes" maxLength={5} onChange={onChange} />)
    const field = screen.getByLabelText('Notes') as HTMLTextAreaElement
    // No native maxlength: it counts UTF-16 units and would disagree with the visible count.
    expect(field).not.toHaveAttribute('maxlength')
    fireEvent.change(field, { target: { value: '🔒🔒🔒🔒🔒🔒🔒' } })
    expect(field.value).toBe('🔒🔒🔒🔒🔒')
    expect(onChange.mock.results[0].value).toBe('🔒🔒🔒🔒🔒')
    expect(container.querySelector('.vela-text-area__count')).toHaveTextContent('5 / 5')
  })

  // [[rule: text-area-count-in-code-points]]
  it('clips in controlled mode too: the consumer receives a value within the limit', () => {
    function Controlled() {
      const [v, setV] = React.useState('')
      return <TextArea label="Notes" maxLength={3} value={v} onChange={(e) => setV(e.target.value)} />
    }
    render(<Controlled />)
    const field = screen.getByLabelText('Notes') as HTMLTextAreaElement
    fireEvent.change(field, { target: { value: 'abcdef' } })
    expect(field.value).toBe('abc')
  })

  // [[rule: text-area-count-announced-near-limit]]
  it('announces the count politely, and only once 10% or less of the limit remains', () => {
    const { container } = render(<TextArea label="Notes" maxLength={100} />)
    const field = screen.getByLabelText('Notes')
    const region = live(container)
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).not.toHaveAttribute('role', 'alert')
    expect(container.querySelector('[role="alert"]')).toBeNull()

    fireEvent.change(field, { target: { value: 'x'.repeat(89) } })
    expect(region).toHaveTextContent(/^$/) // 11 left: silent
    fireEvent.change(field, { target: { value: 'x'.repeat(90) } })
    expect(region).toHaveTextContent('10 characters left')
    fireEvent.change(field, { target: { value: 'x'.repeat(99) } })
    expect(region).toHaveTextContent('1 character left')
    fireEvent.change(field, { target: { value: 'x'.repeat(100) } })
    expect(region).toHaveTextContent('Character limit reached')
  })

  // [[rule: text-area-count-announced-near-limit]]
  it('has no live region and no count without maxLength', () => {
    const { container } = render(<TextArea label="Notes" />)
    expect(live(container)).toBeNull()
    expect(container.querySelector('.vela-text-area__count')).toBeNull()
  })
})
