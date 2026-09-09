import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Toggle } from './Toggle'

describe('Toggle', () => {
  it('exposes role="switch" with an accessible name', () => {
    render(<Toggle label="Email alerts" />)
    const sw = screen.getByRole('switch', { name: 'Email alerts' })
    expect(sw).toHaveAttribute('aria-checked', 'false')
  })

  it('flips when uncontrolled and reports the new value', async () => {
    const onChange = vi.fn()
    render(<Toggle label="Email alerts" onChange={onChange} />)
    await userEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('does not self-update when controlled', async () => {
    const onChange = vi.fn()
    render(<Toggle label="Email alerts" checked={false} onChange={onChange} />)
    await userEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  })

  it('is operable with the keyboard', async () => {
    render(<Toggle label="Email alerts" />)
    await userEvent.tab()
    expect(screen.getByRole('switch')).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('ignores interaction when disabled', async () => {
    const onChange = vi.fn()
    render(<Toggle label="Email alerts" disabled onChange={onChange} />)
    await userEvent.click(screen.getByRole('switch'))
    expect(onChange).not.toHaveBeenCalled()
  })
})
