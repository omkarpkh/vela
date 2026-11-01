import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StatusIndicator } from './StatusIndicator'

describe('StatusIndicator', () => {
  // [[rule: status-never-colour-only]]
  it('falls back to a text alternative when there is no visible label', () => {
    render(<StatusIndicator status="unhealthy" />)
    // WCAG 1.4.1: the dot must not convey status through colour alone.
    expect(screen.getByRole('img', { name: 'Unhealthy' })).toBeInTheDocument()
  })

  // [[rule: status-never-colour-only]]
  it('uses the visible label instead of duplicating it for screen readers', () => {
    const { container } = render(<StatusIndicator status="healthy" label="All systems normal" />)
    const el = container.firstChild as HTMLElement
    expect(el).not.toHaveAttribute('aria-label')
    expect(el).toHaveTextContent('All systems normal')
    // No image role: an image takes its name only from aria-label, so with a visible label and
    // role="img" the indicator had no name at all (axe, role-img-alt). The text is read as text.
    expect(screen.queryByRole('img')).toBeNull()
    expect(el.querySelector('.vela-status__dot')).toHaveAttribute('aria-hidden', 'true')
  })

  it.each(['unknown', 'healthy', 'warning', 'medium', 'unhealthy'] as const)(
    'binds the %s status class', (status) => {
      const { container } = render(<StatusIndicator status={status} />)
      expect(container.firstChild).toHaveClass(`vela-status--${status}`)
    },
  )
})
