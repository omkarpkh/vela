import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { RiskPill } from './RiskPill'

describe('RiskPill', () => {
  // [[rule: risk-never-colour-only]]
  it.each([
    ['low', 'Low'],
    ['medium', 'Medium'],
    ['high', 'High'],
  ] as const)('renders the %s level word when no label is given', (risk, word) => {
    render(<RiskPill risk={risk} />)
    // WCAG 1.4.1: the pill must not convey the level through colour alone, so
    // it is never an empty coloured box — the level word is the default text.
    expect(screen.getByText(word)).toBeInTheDocument()
  })

  it('renders a custom label in place of the level word', () => {
    render(<RiskPill risk="high" label="High · 87" />)
    expect(screen.getByText('High · 87')).toBeInTheDocument()
    expect(screen.queryByText('High')).not.toBeInTheDocument()
  })

  // [[rule: risk-pill-is-not-interactive]]
  it('is a label, not a control: no interactive role, nothing in the tab order', () => {
    const { container } = render(<RiskPill risk="medium" />)
    expect(container.firstChild?.nodeName).toBe('SPAN')
    expect(container.querySelector('button, a, input, [tabindex], [role]')).toBeNull()
  })

  it.each(['low', 'medium', 'high'] as const)('binds the %s risk class and never a severity or status class', (risk) => {
    const { container } = render(<RiskPill risk={risk} />)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveClass(`vela-risk--${risk}`)
    expect(el.className).not.toMatch(/severity|status/)
  })

  it('defaults to the regular size and accepts small', () => {
    const { container, rerender } = render(<RiskPill risk="low" />)
    expect(container.firstChild).toHaveClass('vela-risk--regular')
    rerender(<RiskPill risk="low" size="small" />)
    expect(container.firstChild).toHaveClass('vela-risk--small')
  })
})
