import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Input } from './Input'

describe('Input', () => {
  it('associates the label with the control', () => {
    render(<Input label="Tenant name" />)
    expect(screen.getByLabelText('Tenant name')).toBeInstanceOf(HTMLInputElement)
  })

  it('describes the field with its hint', () => {
    render(<Input label="Tenant name" hint="Lowercase letters only" />)
    expect(screen.getByLabelText('Tenant name')).toHaveAccessibleDescription('Lowercase letters only')
  })

  it('marks the field invalid and announces the error', () => {
    render(<Input label="Tenant name" error="This tenant already exists" />)
    expect(screen.getByLabelText('Tenant name')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('This tenant already exists')
  })

  it('never points aria-describedby at an element that is not rendered', () => {
    render(<Input label="Tenant name" />)
    expect(screen.getByLabelText('Tenant name')).not.toHaveAttribute('aria-describedby')
  })

  it('describes with both hint and error when both are present', () => {
    render(<Input label="Tenant name" hint="Lowercase only" error="Already exists" />)
    const input = screen.getByLabelText('Tenant name')
    const ids = input.getAttribute('aria-describedby')!.split(' ')
    expect(ids).toHaveLength(2)
    ids.forEach((id) => expect(document.getElementById(id)).not.toBeNull())
  })
})
