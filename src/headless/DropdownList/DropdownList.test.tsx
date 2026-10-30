import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { DropdownList, type DropdownListProps } from './DropdownList'

// The spec is guidelines/components/dropdown-list.md. Dropdown List ships from
// `@omkarux/vela/headless` only, on Base UI 1.9's Menu; these tests are the spec's, not Base UI's.
const settle = () => act(() => new Promise((r) => setTimeout(r, 30)))

const ITEMS = [
  { value: 'alerts', label: 'Alerts' },
  { value: 'firewall', label: 'Firewall', meta: '1 new' },
  { value: 'archive', label: 'Archive', disabled: true, meta: 'No access' },
  { value: 'reports', label: 'Reports' },
] as const satisfies DropdownListProps['items']

function AllTabs(props: Partial<DropdownListProps>) {
  return (
    <div>
      <DropdownList
        label="All tabs"
        trigger={<button type="button">6 more</button>}
        items={ITEMS}
        {...({ defaultValue: 'firewall', ...props } as object)}
      />
      <button type="button">After</button>
    </div>
  )
}

const trigger = () => screen.getByRole('button', { name: '6 more' })
const item = (name: string | RegExp) => screen.getByRole('menuitemradio', { name })
const openWithClick = async () => {
  await userEvent.click(trigger())
  await settle()
}

describe('Dropdown List (headless)', () => {
  // [[rule: dropdown-list-menu-radio]]
  it('is a role="menu" named by label, of menuitemradio items with exactly the current one checked', async () => {
    render(<AllTabs />)
    expect(trigger()).toHaveAttribute('aria-haspopup', 'menu')
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    await openWithClick()
    const menu = screen.getByRole('menu', { name: 'All tabs' })
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
    expect(trigger()).toHaveAttribute('aria-controls', menu.id)
    const radios = screen.getAllByRole('menuitemradio')
    expect(radios).toHaveLength(4)
    expect(radios.filter((r) => r.getAttribute('aria-checked') === 'true')).toEqual([item(/^Firewall/)])
    for (const r of radios) expect(menu).toContainElement(r)
    // The check is drawn only on the current item; every item keeps the slot.
    expect(item(/^Firewall/).querySelector('.vela-dropdown-list__check svg')).not.toBeNull()
    expect(item('Alerts').querySelector('.vela-dropdown-list__check')).not.toBeNull()
    expect(item('Alerts').querySelector('.vela-dropdown-list__check svg')).toBeNull()
  })

  // [[rule: dropdown-list-meta-in-name]]
  it('names each item by its whole text, meta included', async () => {
    render(<AllTabs />)
    await openWithClick()
    expect(item('Firewall, 1 new')).toHaveTextContent('Firewall1 new')
    expect(item('Archive, No access')).toBeInTheDocument()
    expect(item('Alerts')).toBeInTheDocument()
  })

  // [[rule: dropdown-list-value-exists]]
  it('throws a named error when the current value matches no item, or there is none', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(() => render(<AllTabs value="policies" />)).toThrow(/<DropdownList label="All tabs">: the current value "policies" matches no item/)
      expect(() => render(<AllTabs defaultValue="policies" />)).toThrow(/matches no item/)
      expect(() => render(<AllTabs defaultValue={undefined} />)).toThrow(/no current option/)
    } finally {
      quiet.mockRestore()
    }
  })

  // [[rule: dropdown-list-choose-closes]]
  it('a click on another item calls onValueChange, closes the list and returns focus to the trigger', async () => {
    const onValueChange = vi.fn()
    render(<AllTabs onValueChange={onValueChange} />)
    await openWithClick()
    await userEvent.click(item('Reports'))
    await settle()
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith('reports')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(trigger()).toHaveFocus()
    // Uncontrolled: the choice is now the current one.
    await openWithClick()
    expect(item('Reports')).toHaveAttribute('aria-checked', 'true')
    expect(item(/^Firewall/)).toHaveAttribute('aria-checked', 'false')
  })

  // [[rule: dropdown-list-choose-closes]]
  it('Enter and Space choose from the keyboard, close the list and return focus', async () => {
    for (const key of ['{Enter}', ' ']) {
      const onValueChange = vi.fn()
      const { unmount } = render(<AllTabs onValueChange={onValueChange} />)
      trigger().focus()
      await userEvent.keyboard('{ArrowDown}')
      await settle()
      expect(item(/^Firewall/)).toHaveFocus()
      await userEvent.keyboard('{ArrowUp}')
      expect(item('Alerts')).toHaveFocus()
      await userEvent.keyboard(key)
      await settle()
      expect(onValueChange, key).toHaveBeenCalledExactlyOnceWith('alerts')
      expect(screen.queryByRole('menu')).toBeNull()
      expect(trigger()).toHaveFocus()
      unmount()
    }
  })

  // [[rule: dropdown-list-choose-closes]]
  it('choosing the current item closes the list without calling onValueChange', async () => {
    const onValueChange = vi.fn()
    render(<AllTabs onValueChange={onValueChange} />)
    await openWithClick()
    await userEvent.click(item(/^Firewall/))
    await settle()
    expect(onValueChange).not.toHaveBeenCalled()
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('is controlled by value: it reports the choice and shows what it is given', async () => {
    const onValueChange = vi.fn()
    const { rerender } = render(<AllTabs value="alerts" onValueChange={onValueChange} />)
    await openWithClick()
    await userEvent.click(item('Reports'))
    await settle()
    expect(onValueChange).toHaveBeenCalledWith('reports')
    await openWithClick()
    expect(item('Alerts')).toHaveAttribute('aria-checked', 'true')
    rerender(<AllTabs value="reports" onValueChange={onValueChange} />)
    expect(item('Reports')).toHaveAttribute('aria-checked', 'true')
  })

  // [[rule: dropdown-list-focus-current]]
  it('lands on the current item on open — by pointer, Enter, Space, Arrow Down and Arrow Up — not the first or last', async () => {
    const opens: [string, () => Promise<void>][] = [
      ['click', () => userEvent.click(trigger())],
      ['Enter', async () => { trigger().focus(); await userEvent.keyboard('{Enter}') }],
      ['Space', async () => { trigger().focus(); await userEvent.keyboard(' ') }],
      ['ArrowDown', async () => { trigger().focus(); await userEvent.keyboard('{ArrowDown}') }],
      ['ArrowUp', async () => { trigger().focus(); await userEvent.keyboard('{ArrowUp}') }],
    ]
    for (const [how, open] of opens) {
      const { unmount } = render(<AllTabs defaultValue="firewall" />)
      await open()
      await settle()
      await settle()
      expect(item(/^Firewall/), how).toHaveFocus()
      expect(item(/^Firewall/), how).toHaveAttribute('data-highlighted')
      expect(screen.getAllByRole('menuitemradio').filter((r) => r.hasAttribute('data-highlighted')), how).toHaveLength(1)
      // The arrow keys move on from where it landed.
      await userEvent.keyboard('{ArrowDown}')
      expect(item(/^Archive/), how).toHaveFocus()
      unmount()
    }
  })

  // [[rule: dropdown-list-focus-current]]
  it('lands on the current item each time it opens, after the current one has changed', async () => {
    render(<AllTabs defaultValue="alerts" />)
    await openWithClick()
    expect(item('Alerts')).toHaveFocus()
    await userEvent.click(item('Reports'))
    await settle()
    trigger().focus()
    await userEvent.keyboard('{Enter}')
    await settle()
    expect(item('Reports')).toHaveFocus()
  })

  // [[rule: dropdown-list-dismiss]]
  it('Escape closes it and returns focus to the trigger', async () => {
    const onOpenChange = vi.fn()
    render(<AllTabs onOpenChange={onOpenChange} />)
    await openWithClick()
    expect(onOpenChange).toHaveBeenLastCalledWith(true)
    await userEvent.keyboard('{Escape}')
    await settle()
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
    expect(screen.queryByRole('menu')).toBeNull()
    expect(trigger()).toHaveFocus()
  })

  // [[rule: dropdown-list-dismiss]]
  it('Tab closes it and moves on through the page', async () => {
    render(<AllTabs />)
    trigger().focus()
    await userEvent.keyboard('{Enter}')
    await settle()
    expect(item(/^Firewall/)).toHaveFocus()
    await userEvent.tab()
    await settle()
    expect(screen.queryByRole('menu')).toBeNull()
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
  })

  // [[rule: dropdown-list-dismiss]]
  it('a press outside closes it, and the page behind is neither hidden nor scroll-locked', async () => {
    const onOpenChange = vi.fn()
    render(<AllTabs onOpenChange={onOpenChange} />)
    await openWithClick()
    const after = screen.getByRole('button', { name: 'After' })
    expect(after.closest('[aria-hidden="true"]')).toBeNull()
    expect(after.closest('[inert]')).toBeNull()
    for (const el of [document.documentElement, document.body]) expect(el.style.overflow).not.toBe('hidden')
    await userEvent.click(after)
    await settle()
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  // [[rule: dropdown-list-disabled-not-chosen]]
  it('a disabled item is reached by the arrow keys and read, but choosing it does nothing', async () => {
    const onValueChange = vi.fn()
    render(<AllTabs onValueChange={onValueChange} />)
    trigger().focus()
    await userEvent.keyboard('{Enter}')
    await settle()
    await userEvent.keyboard('{ArrowDown}')
    const archive = item('Archive, No access')
    expect(archive).toHaveFocus()
    expect(archive).toHaveAttribute('aria-disabled', 'true')
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard(' ')
    await settle()
    expect(onValueChange).not.toHaveBeenCalled()
    expect(screen.getByRole('menu')).toBeInTheDocument()
    await userEvent.click(archive)
    await settle()
    expect(onValueChange).not.toHaveBeenCalled()
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(item(/^Firewall/)).toHaveAttribute('aria-checked', 'true')
    // And past it the keys carry on.
    await userEvent.keyboard('{ArrowDown}')
    expect(item('Reports')).toHaveFocus()
  })

  it('jumps by typing a letter, and Home and End go to the ends', async () => {
    render(<AllTabs />)
    await openWithClick()
    await userEvent.keyboard('r')
    expect(item('Reports')).toHaveFocus()
    await userEvent.keyboard('{Home}')
    expect(item('Alerts')).toHaveFocus()
    await userEvent.keyboard('{End}')
    expect(item('Reports')).toHaveFocus()
  })

  it('opens below the trigger, lined up with the edge align names', async () => {
    render(<AllTabs defaultOpen align="end" />)
    await settle()
    const menu = screen.getByRole('menu', { name: 'All tabs' })
    expect(menu).toHaveClass('vela-dropdown-list')
    expect(menu).toHaveAttribute('data-side', 'bottom')
    expect(menu).toHaveAttribute('data-align', 'end')
  })

  it('does not self-open when open is controlled, and reports the request', async () => {
    const onOpenChange = vi.fn()
    render(<AllTabs open={false} onOpenChange={onOpenChange} />)
    await userEvent.click(trigger())
    await settle()
    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('portals into an element that carries vela-root and the theme of the trigger', async () => {
    render(
      <div data-theme="dark">
        <AllTabs defaultOpen />
      </div>,
    )
    await settle()
    const portal = screen.getByRole('menu').closest('.vela-overlay-portal')
    expect(portal).toHaveClass('vela-root')
    expect(portal).toHaveAttribute('data-theme', 'dark')
  })

  it('marks an open from the keyboard instant, so nothing animates', async () => {
    render(<AllTabs />)
    trigger().focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('menu')).toHaveAttribute('data-vela-instant')
  })
})
