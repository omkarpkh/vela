import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StatusIndicator } from './StatusIndicator'

describe('StatusIndicator', () => {
  it('falls back to a text alternative when there is no visible label', () => {
    render(<StatusIndicator status="unhealthy" />)
    // WCAG 1.4.1: the dot must not convey status through colour alone.
    expect(screen.getByRole('img', { name: 'Unhealthy' })).toBeInTheDocument()
  })

  it('uses the visible label instead of duplicating it for screen readers', () => {
    render(<StatusIndicator status="healthy" label="All systems normal" />)
    const el = screen.getByRole('img')
    expect(el).not.toHaveAttribute('aria-label')
    expect(el).toHaveTextContent('All systems normal')
  })

  it.each(['unknown', 'healthy', 'warning', 'medium', 'unhealthy'] as const)(
    'binds the %s status class', (status) => {
      const { container } = render(<StatusIndicator status={status} />)
      expect(container.firstChild).toHaveClass(`vela-status--${status}`)
    },
  )
})
