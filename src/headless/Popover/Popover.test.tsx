import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Popover } from './Popover'
import { Button } from '../../components/Button'

// The spec is guidelines/components/popover.md. Popover ships from `@omkarux/vela/headless` only,
// on Base UI 1.9; these tests are the spec's, not Base UI's.
const settle = () => act(() => new Promise((r) => setTimeout(r, 20)))

function Filters(props: Partial<React.ComponentProps<typeof Popover>> & { withControl?: boolean }) {
  const { withControl = true, ...rest } = props
  return (
    <div>
      <Popover trigger={<Button>Filters</Button>} title="Filter alerts" {...(rest as object)}>
        {withControl ? <button type="button">Apply</button> : <p>Nothing to act on.</p>}
      </Popover>
      <button type="button">Outside</button>
    </div>
  )
}

describe('Popover (headless)', () => {
  // [[rule: popover-named-by-title]]
  it('opens a role="dialog" named by its rendered title, from the trigger it was given', async () => {
    render(<Filters />)
    const trigger = screen.getByRole('button', { name: 'Filters' })
    // The trigger is the Vela Button it was given, with the popup ARIA added.
    expect(trigger).toHaveClass('vela-btn')
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(trigger)
    await settle()
    const popup = screen.getByRole('dialog', { name: 'Filter alerts' })
    const title = screen.getByRole('heading', { name: 'Filter alerts' })
    expect(popup).toHaveAttribute('aria-labelledby', title.id)
    expect(popup).toHaveClass('vela-popover', 'vela-popover--regular')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  // [[rule: popover-focus-in-and-back]]
  it('moves focus to the first control on open and back to the trigger on close', async () => {
    render(<Filters />)
    const trigger = screen.getByRole('button', { name: 'Filters' })
    await userEvent.click(trigger)
    await settle()
    expect(screen.getByRole('button', { name: 'Apply' })).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(trigger).toHaveFocus()
  })

  // [[rule: popover-focus-in-and-back]]
  it('focuses the popup itself when it holds no control', async () => {
    render(<Filters withControl={false} />)
    await userEvent.click(screen.getByRole('button', { name: 'Filters' }))
    await settle()
    expect(screen.getByRole('dialog', { name: 'Filter alerts' })).toHaveFocus()
  })

  // [[rule: popover-dismiss-escape-outside]]
  it('closes on Escape and on a press outside, reporting the next state each time', async () => {
    const onOpenChange = vi.fn()
    render(<Filters onOpenChange={onOpenChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Filters' }))
    await settle()
    expect(onOpenChange).toHaveBeenLastCalledWith(true)
    await userEvent.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
    expect(screen.queryByRole('dialog')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }))
    await settle()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Outside' }))
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  // [[rule: popover-is-non-modal]]
  it('is non-modal: the page keeps its accessibility tree and its scroll, and Tab leaves the popover', async () => {
    render(<Filters />)
    await userEvent.click(screen.getByRole('button', { name: 'Filters' }))
    await settle()
    const outside = screen.getByRole('button', { name: 'Outside' })
    expect(outside.closest('[aria-hidden="true"]')).toBeNull()
    expect(outside.closest('[inert]')).toBeNull()
    expect(document.documentElement.style.overflow).not.toBe('hidden')
    expect(document.documentElement.style.overflowY).not.toBe('hidden')
    // Not trapped: Tab from the last control moves on to the page, and the popover closes behind it.
    expect(screen.getByRole('button', { name: 'Apply' })).toHaveFocus()
    await userEvent.tab()
    await settle()
    expect(document.activeElement?.closest('.vela-popover')).toBeNull()
    expect(document.activeElement).not.toBe(document.body)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('does not self-open when controlled, and reports the request', async () => {
    const onOpenChange = vi.fn()
    render(<Filters open={false} onOpenChange={onOpenChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Filters' }))
    await settle()
    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('maps the logical placements and the sizes onto the popup', async () => {
    render(<Filters defaultOpen placement="start" align="end" size="wide" />)
    const popup = screen.getByRole('dialog', { name: 'Filter alerts' })
    expect(popup).toHaveClass('vela-popover--wide')
    expect(popup).toHaveAttribute('data-side', 'inline-start')
    expect(popup).toHaveAttribute('data-align', 'end')
  })

  it('portals into an element that carries vela-root and the theme of the trigger', async () => {
    render(
      <div data-theme="dark">
        <Filters defaultOpen />
      </div>,
    )
    const portal = screen.getByRole('dialog').closest('.vela-overlay-portal')
    expect(portal).toHaveClass('vela-root')
    expect(portal).toHaveAttribute('data-theme', 'dark')
  })

  it('marks an open from the keyboard instant, so nothing animates', async () => {
    render(<Filters />)
    screen.getByRole('button', { name: 'Filters' }).focus()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('dialog')).toHaveAttribute('data-vela-instant')
  })
})
