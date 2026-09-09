import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders a native button defaulting to type="button"', () => {
    render(<Button>Save Changes</Button>)
    const btn = screen.getByRole('button', { name: 'Save Changes' })
    expect(btn.tagName).toBe('BUTTON')
    expect(btn).toHaveAttribute('type', 'button')
  })

  it('applies variant, appearance and size as closed-set classes', () => {
    render(<Button variant="destructive" appearance="hollow" size="huge">Delete Account</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('vela-btn--destructive')
    expect(btn.className).toContain('vela-btn--hollow')
    expect(btn.className).toContain('vela-btn--huge')
  })

  it('keeps its accessible name while loading', async () => {
    render(<Button loading>Save Changes</Button>)
    // The label must survive: swapping it for a spinner would leave the
    // control nameless to a screen reader mid-request.
    const btn = screen.getByRole('button', { name: 'Save Changes' })
    expect(btn).toHaveAttribute('aria-busy', 'true')
  })

  it('stays focusable while loading but ignores clicks', async () => {
    const onClick = vi.fn()
    render(<Button loading onClick={onClick}>Save Changes</Button>)
    const btn = screen.getByRole('button')
    expect(btn).not.toBeDisabled()
    await userEvent.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('leaves the tab order when disabled', async () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Save Changes</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('hides the decorative icon from assistive tech', () => {
    render(<Button icon={<svg data-testid="i" />}>Add Rule</Button>)
    expect(screen.getByRole('button')).toHaveAccessibleName('Add Rule')
    expect(screen.getByTestId('i').parentElement).toHaveAttribute('aria-hidden', 'true')
  })

  it('forwards a ref to the underlying button', () => {
    let el: HTMLButtonElement | null = null
    render(<Button ref={(n) => { el = n }}>Apply</Button>)
    expect(el).toBeInstanceOf(HTMLButtonElement)
  })
})
