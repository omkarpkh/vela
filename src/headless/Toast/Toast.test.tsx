import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { ToastProvider, useToast, type ToastApi, type ToastProviderProps } from './Toast'

// The spec is guidelines/components/toast.md. Toast ships from `@omkarux/vela/headless` only, on
// Base UI 1.9; these tests are the spec's, not Base UI's.
const wait = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)))

// jsdom loads no stylesheet, so the dwell token is declared here, on the provider's marker, the way
// dist/vela.css declares it on :root. A short value keeps the suite fast; the test is that the
// component reads the token at all, and that only a plain confirmation is timed.
function withDurationToken(value: string) {
  const style = document.createElement('style')
  style.textContent = `.vela-toast__anchor { --vela-duration-toast: ${value}; }`
  document.head.appendChild(style)
}
afterEach(() => document.head.querySelectorAll('style').forEach((s) => s.remove()))

let toast: ToastApi
function App() {
  toast = useToast()
  return <button type="button">Save Changes</button>
}
const setup = (props: Partial<ToastProviderProps> = {}) =>
  render(
    <ToastProvider {...props}>
      <App />
    </ToastProvider>,
  )
const add = (...args: Parameters<ToastApi['add']>) => {
  let id = ''
  act(() => {
    id = toast.add(...args)
  })
  return id
}
const region = () => screen.getByRole('region', { name: 'Notifications' })
const toastNamed = (name: string) => screen.queryByRole('dialog', { name })

describe('Toast (headless)', () => {
  // [[rule: toast-timing-by-severity]]
  it('a success or info toast with no action leaves after --vela-duration-toast', async () => {
    withDurationToken('150ms')
    setup()
    add({ severity: 'success', title: 'Policy saved' })
    add({ title: 'Export started' }) // info, the default
    expect(toastNamed('Policy saved')).toBeInTheDocument()
    expect(toastNamed('Export started')).toBeInTheDocument()
    await wait(450)
    expect(toastNamed('Policy saved')).toBeNull()
    expect(toastNamed('Export started')).toBeNull()
  })

  // [[rule: toast-timing-by-severity]]
  it('a warning, and any toast with an action, never times out', async () => {
    withDurationToken('100ms')
    setup()
    add({ severity: 'warning', title: 'Policy saved with 2 rules skipped' })
    add({ severity: 'success', title: 'Policy archived', action: { label: 'Undo', onClick: () => {} } })
    add({ severity: 'info', title: 'Report ready', action: { label: 'View', onClick: () => {} } })
    await wait(450)
    expect(toastNamed('Policy saved with 2 rules skipped')).toBeInTheDocument()
    expect(toastNamed('Policy archived')).toBeInTheDocument()
    expect(toastNamed('Report ready')).toBeInTheDocument()
  })

  // [[rule: toast-pauses-on-hover-and-focus]]
  it('hovering the region pauses the timer, and leaving resumes it with the time it had left', async () => {
    withDurationToken('400ms')
    setup()
    add({ severity: 'success', title: 'Policy saved' })
    await wait(250)
    await userEvent.hover(region())
    await wait(600) // well past the dwell: paused
    expect(toastNamed('Policy saved')).toBeInTheDocument()
    await userEvent.unhover(region())
    // ~150ms were left. A fresh timer would need 400; it is gone well before that.
    await wait(300)
    expect(toastNamed('Policy saved')).toBeNull()
  })

  // [[rule: toast-pauses-on-hover-and-focus]]
  // [[rule: toast-region-reachable-f6]]
  it('F6 moves focus to the region and pauses it; Shift+Tab returns focus and resumes it', async () => {
    withDurationToken('200ms')
    setup()
    const save = screen.getByRole('button', { name: 'Save Changes' })
    save.focus()
    add({ severity: 'success', title: 'Policy saved' })
    await userEvent.keyboard('{F6}')
    expect(region()).toHaveFocus()
    await wait(500) // focus is in the region: paused
    expect(toastNamed('Policy saved')).toBeInTheDocument()
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}')
    expect(save).toHaveFocus()
    await wait(450)
    expect(toastNamed('Policy saved')).toBeNull()
  })

  // [[rule: toast-region-reachable-f6]]
  it('from the region, Tab moves into the toasts and their buttons', async () => {
    setup()
    screen.getByRole('button', { name: 'Save Changes' }).focus()
    add({ severity: 'warning', title: 'Policy saved with 2 rules skipped' })
    await userEvent.keyboard('{F6}')
    await userEvent.tab()
    const t = toastNamed('Policy saved with 2 rules skipped')!
    expect(t.contains(document.activeElement)).toBe(true)
    await userEvent.tab()
    expect(within(t).getByRole('button', { name: 'Dismiss' })).toHaveFocus()
  })

  // [[rule: toast-polite-live-region]]
  it('the region is a named, polite live region, and no toast is an alert', () => {
    setup()
    add({ severity: 'warning', title: 'Policy saved with 2 rules skipped' })
    add({ severity: 'success', title: 'Policy saved' })
    expect(region()).toHaveAttribute('aria-live', 'polite')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(document.querySelector('[aria-live="assertive"]')).toBeNull()
    // Each toast is a non-modal dialog named by its title and described by its description.
    add({ title: 'Export started', description: 'Find it in Reports when it finishes.' })
    const t = toastNamed('Export started')!
    expect(t).toHaveAttribute('aria-modal', 'false')
    expect(t).toHaveAccessibleDescription('Find it in Reports when it finishes.')
  })

  // [[rule: toast-polite-live-region]]
  it('names the region by `label`', () => {
    setup({ label: 'Benachrichtigungen' })
    expect(screen.getByRole('region', { name: 'Benachrichtigungen' })).toHaveAttribute('aria-live', 'polite')
  })

  // [[rule: toast-never-steals-focus]]
  it('adding a toast moves no focus', () => {
    setup()
    const save = screen.getByRole('button', { name: 'Save Changes' })
    save.focus()
    add({ severity: 'success', title: 'Policy saved' })
    add({ title: 'Policy archived', action: { label: 'Undo', onClick: () => {} } })
    expect(save).toHaveFocus()
  })

  // [[rule: toast-escape-dismisses]]
  it('Escape dismisses the focused toast only, and focus moves to the next one', async () => {
    setup()
    screen.getByRole('button', { name: 'Save Changes' }).focus()
    add({ severity: 'warning', title: 'First warning' })
    add({ severity: 'warning', title: 'Second warning' })
    await userEvent.keyboard('{F6}')
    await userEvent.tab()
    const focused = [toastNamed('First warning')!, toastNamed('Second warning')!].find((t) => t.contains(document.activeElement))!
    const other = focused === toastNamed('First warning') ? 'Second warning' : 'First warning'
    const name = focused.getAttribute('aria-labelledby') && document.getElementById(focused.getAttribute('aria-labelledby')!)!.textContent!
    await userEvent.keyboard('{Escape}')
    await wait(20)
    expect(toastNamed(name as string)).toBeNull()
    expect(toastNamed(other)).toBeInTheDocument()
    expect(toastNamed(other)!.contains(document.activeElement)).toBe(true)
    // A toast dismissed from the keyboard leaves at once (from the keyboard, nothing animates).
  })

  // [[rule: toast-always-dismissible]]
  it.each(['success', 'info', 'warning'] as const)('a %s toast has a close button named by dismissLabel', async (severity) => {
    setup()
    add({ severity, title: 'Done' })
    const close = within(toastNamed('Done')!).getByRole('button', { name: 'Dismiss' })
    expect(close).not.toHaveAttribute('aria-hidden')
    await userEvent.click(close)
    await wait(20)
    expect(toastNamed('Done')).toBeNull()
  })

  // [[rule: toast-always-dismissible]]
  it('names the close button by `dismissLabel`, and dismiss(id) removes that toast', async () => {
    setup({ dismissLabel: 'Close notification' })
    const id = add({ severity: 'warning', title: 'Kept' })
    add({ severity: 'warning', title: 'Other' })
    expect(within(toastNamed('Kept')!).getByRole('button', { name: 'Close notification' })).toBeInTheDocument()
    act(() => toast.dismiss(id))
    await wait(20)
    expect(toastNamed('Kept')).toBeNull()
    expect(toastNamed('Other')).toBeInTheDocument()
  })

  // [[rule: toast-action-runs-and-dismisses]]
  it('the action is a tiny standard Button named by its label; it runs once and dismisses the toast', async () => {
    setup()
    const onClick = vi.fn()
    add({ title: 'Policy archived', action: { label: 'Undo', onClick } })
    const undo = within(toastNamed('Policy archived')!).getByRole('button', { name: 'Undo' })
    expect(undo).toHaveClass('vela-btn', 'vela-btn--standard', 'vela-btn--tiny')
    await userEvent.click(undo)
    await wait(20)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(toastNamed('Policy archived')).toBeNull()
  })

  // [[rule: toast-requires-provider]]
  it('useToast() outside a ToastProvider throws a named error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<App />)).toThrow('useToast() must be called inside <ToastProvider>')
    spy.mockRestore()
  })

  // [[rule: toast-icon-is-decorative]]
  it.each(['success', 'info', 'warning'] as const)('gives a %s toast a severity mark the screen reader skips', (severity) => {
    setup()
    add({ severity, title: 'Done' })
    const t = toastNamed('Done')!
    expect(t).toHaveClass(`vela-toast--${severity}`)
    const mark = t.querySelector('.vela-toast__mark')
    expect(mark).toHaveAttribute('aria-hidden', 'true')
    expect(mark!.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    // The title, not the icon, is what is announced.
    expect(t).toHaveAccessibleName('Done')
  })

  it('shows at most `limit` toasts; an older one waits, hidden and inert, and returns when a newer one leaves', async () => {
    setup({ limit: 2 })
    add({ severity: 'warning', title: 'One' })
    add({ severity: 'warning', title: 'Two' })
    const three = add({ severity: 'warning', title: 'Three' })
    const one = screen.getAllByRole('dialog', { hidden: true }).find((d) => d.textContent?.includes('One'))!
    expect(one).toHaveAttribute('data-limited')
    expect(one).toHaveAttribute('inert')
    act(() => toast.dismiss(three))
    await wait(20)
    expect(one).not.toHaveAttribute('data-limited')
  })

  it('the region is portalled with vela-root and the theme of where the provider is rendered', () => {
    render(
      <div data-theme="dark">
        <ToastProvider placement="top-end">
          <App />
        </ToastProvider>
      </div>,
    )
    add({ title: 'Export started' })
    const portal = region().closest('.vela-overlay-portal')!
    expect(portal).toHaveClass('vela-root')
    expect(portal).toHaveAttribute('data-theme', 'dark')
    expect(region()).toHaveClass('vela-toast-region--top-end')
  })
})
