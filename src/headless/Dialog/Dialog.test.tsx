import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Dialog } from './Dialog'
import { Button } from '../../components/Button'

// The spec is guidelines/components/dialog.md. Dialog ships from `@omkarux/vela/headless` only, on
// Base UI 1.9 (`Dialog`, and `AlertDialog` for variant="alert"); these tests are the spec's.
// Base UI's focus guards hand focus on in a task after the Tab lands, so a Tab is followed by a settle.
const settle = () => act(() => new Promise((r) => setTimeout(r, 30)))

function EditPolicy(props: { body?: boolean; footer?: boolean; description?: string; onOpenChange?: (o: boolean) => void }) {
  const { body = true, footer = true, description = 'Changes apply on save.', onOpenChange } = props
  return (
    <div data-testid="page">
      <Dialog
        trigger={<Button>Edit Policy</Button>}
        title="Edit policy"
        description={description || undefined}
        onOpenChange={onOpenChange}
        footer={
          footer ? (
            <>
              <Dialog.Close>
                <Button>Cancel</Button>
              </Dialog.Close>
              <Button variant="primary">Save Changes</Button>
            </>
          ) : undefined
        }
      >
        {body ? <input aria-label="Policy name" /> : undefined}
      </Dialog>
      <button type="button">Outside</button>
    </div>
  )
}

function DeletePolicy(props: { onConfirm?: () => void; onOpenChange?: (o: boolean) => void }) {
  return (
    <div data-testid="page">
      <Dialog
        variant="alert"
        trigger={<Button variant="destructive">Delete Policy</Button>}
        title="Delete “Block legacy TLS”?"
        description="Its 14 rules stop applying at once."
        cancelLabel="Keep Policy"
        confirmLabel="Delete Now"
        onConfirm={props.onConfirm ?? (() => {})}
        onOpenChange={props.onOpenChange}
      />
    </div>
  )
}

describe('Dialog (headless)', () => {
  it('is a role="dialog" named by its title and described by its description', async () => {
    render(<EditPolicy />)
    await userEvent.click(screen.getByRole('button', { name: 'Edit Policy' }))
    await settle()
    const dialog = screen.getByRole('dialog', { name: 'Edit policy' })
    expect(dialog).toHaveAccessibleDescription('Changes apply on save.')
    expect(dialog).toHaveClass('vela-dialog', 'vela-dialog--regular')
    expect(screen.getByRole('button', { name: 'Close' })).toHaveClass('vela-dialog__close')
  })

  // [[rule: dialog-describedby-only-rendered]]
  it('has no aria-describedby without a description', async () => {
    render(<EditPolicy description="" />)
    await userEvent.click(screen.getByRole('button', { name: 'Edit Policy' }))
    await settle()
    expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-describedby')
  })

  // [[rule: dialog-traps-focus-and-returns]]
  it('moves focus to the first control in the body, cycles Tab inside, and returns focus to the trigger', async () => {
    render(<EditPolicy />)
    const trigger = screen.getByRole('button', { name: 'Edit Policy' })
    await userEvent.click(trigger)
    await settle()
    const name = screen.getByRole('textbox', { name: 'Policy name' })
    expect(name).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Save Changes' })).toHaveFocus()
    // Past the last control, focus wraps to the first one in the dialog — never out to the page.
    await userEvent.tab()
    await settle()
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
    await userEvent.tab({ shift: true })
    await settle()
    expect(document.activeElement?.closest('.vela-dialog')).not.toBeNull()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(trigger).toHaveFocus()
  })

  // [[rule: dialog-traps-focus-and-returns]]
  it('falls back to the footer, then to the close button, when the body has no control', async () => {
    const { unmount } = render(<EditPolicy body={false} />)
    await userEvent.click(screen.getByRole('button', { name: 'Edit Policy' }))
    await settle()
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
    unmount()
    render(<EditPolicy body={false} footer={false} />)
    await userEvent.click(screen.getByRole('button', { name: 'Edit Policy' }))
    await settle()
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
  })

  // [[rule: dialog-inert-and-scroll-locked]]
  it('hides the page from assistive technology and locks its scroll while open, and releases both on close', async () => {
    render(<EditPolicy />)
    const outside = screen.getByRole('button', { name: 'Outside' })
    await userEvent.click(screen.getByRole('button', { name: 'Edit Policy' }))
    await settle()
    expect(outside.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Outside' })).toBeNull() // gone from the accessibility tree
    // Base UI locks whichever of <html> and <body> scrolls the viewport; in jsdom that is <html>.
    const locked = () => [document.documentElement, document.body].some((el) => el.style.overflowY === 'hidden')
    expect(locked()).toBe(true)
    await userEvent.keyboard('{Escape}')
    await settle()
    expect(outside.closest('[aria-hidden="true"]')).toBeNull()
    expect(locked()).toBe(false)
  })

  // [[rule: dialog-dismissal]]
  it('a standard dialog closes on Escape, on a press on the backdrop, and on Dialog.Close', async () => {
    const onOpenChange = vi.fn()
    render(<EditPolicy onOpenChange={onOpenChange} />)
    const trigger = screen.getByRole('button', { name: 'Edit Policy' })

    await userEvent.click(trigger)
    await settle()
    await userEvent.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
    expect(screen.queryByRole('dialog')).toBeNull()

    await userEvent.click(trigger)
    await settle()
    await userEvent.click(document.querySelector('.vela-dialog__backdrop')!)
    expect(screen.queryByRole('dialog')).toBeNull()

    await userEvent.click(trigger)
    await settle()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  // [[rule: dialog-dismissal]]
  it('an alert ignores a press on the backdrop, and Escape is the cancel', async () => {
    const onConfirm = vi.fn()
    render(<DeletePolicy onConfirm={onConfirm} />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete Policy' }))
    await settle()
    await userEvent.click(document.querySelector('.vela-dialog__backdrop')!)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  // [[rule: alert-dialog-cancel-first]]
  it('an alert is a role="alertdialog" whose confirm is destructive and whose cancel takes focus', async () => {
    const onConfirm = vi.fn()
    render(<DeletePolicy onConfirm={onConfirm} />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete Policy' }))
    await settle()
    const alert = screen.getByRole('alertdialog', { name: 'Delete “Block legacy TLS”?' })
    expect(alert).toHaveAccessibleDescription('Its 14 rules stop applying at once.')
    const cancel = screen.getByRole('button', { name: 'Keep Policy' })
    const confirm = screen.getByRole('button', { name: 'Delete Now' })
    expect(cancel).toHaveFocus()
    expect(confirm).toHaveClass('vela-btn--destructive', 'vela-btn--filled')
    expect(cancel).not.toHaveClass('vela-btn--destructive')
    // An alert has no header close button: the cancel is the way out.
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
    // Enter on a dialog that just appeared presses the cancel, never the confirm.
    await userEvent.keyboard('{Enter}')
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  // [[rule: alert-dialog-cancel-first]]
  it('the confirm calls onConfirm and closes the alert', async () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    render(<DeletePolicy onConfirm={onConfirm} onOpenChange={onOpenChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete Policy' }))
    await settle()
    await userEvent.click(screen.getByRole('button', { name: 'Delete Now' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  // [[rule: dialog-close-requires-dialog]]
  it('Dialog.Close outside a Dialog throws a named error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() =>
      render(
        <Dialog.Close>
          <Button>Cancel</Button>
        </Dialog.Close>,
      ),
    ).toThrow('<Dialog.Close> must be rendered inside <Dialog>.')
    spy.mockRestore()
  })

  it('opens without a trigger when controlled, in the theme of where it is rendered', async () => {
    const onOpenChange = vi.fn()
    render(
      <div data-theme="dark">
        <Dialog open title="Session expired" onOpenChange={onOpenChange} size="wide">
          <p>Sign in again to continue.</p>
        </Dialog>
      </div>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Session expired' })
    expect(dialog).toHaveClass('vela-dialog--wide')
    const portal = dialog.closest('.vela-overlay-portal')
    expect(portal).toHaveClass('vela-root')
    expect(portal).toHaveAttribute('data-theme', 'dark')
    // Controlled: Escape asks, the parent decides.
    await userEvent.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('marks an open from the keyboard instant, so nothing animates', async () => {
    render(<EditPolicy />)
    screen.getByRole('button', { name: 'Edit Policy' }).focus()
    await userEvent.keyboard('{Enter}')
    await settle()
    expect(screen.getByRole('dialog')).toHaveAttribute('data-vela-instant')
    expect(document.querySelector('.vela-dialog__backdrop')).toHaveAttribute('data-vela-instant')
  })
})
