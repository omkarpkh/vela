import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ContextualAlert } from './ContextualAlert'

describe('ContextualAlert', () => {
  it('uses a polite live region for low-urgency severities', () => {
    render(<ContextualAlert severity="info">Scan scheduled.</ContextualAlert>)
    const el = screen.getByRole('status')
    expect(el).toHaveAttribute('aria-live', 'polite')
  })

  it.each(['major', 'critical'] as const)('interrupts for %s', (severity) => {
    render(<ContextualAlert severity={severity}>Data loss detected.</ContextualAlert>)
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive')
  })

  it('binds the severity class so it reads from severity tokens only', () => {
    const { container } = render(<ContextualAlert severity="minor">Degraded.</ContextualAlert>)
    expect(container.firstChild).toHaveClass('vela-alert--minor')
  })

  it('gives the dismiss control a name and fires the handler', async () => {
    const onDismiss = vi.fn()
    render(<ContextualAlert severity="warning" onDismiss={onDismiss}>Check config.</ContextualAlert>)
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('renders no dismiss control unless a handler is supplied', () => {
    render(<ContextualAlert severity="critical">Cannot be cleared.</ContextualAlert>)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
