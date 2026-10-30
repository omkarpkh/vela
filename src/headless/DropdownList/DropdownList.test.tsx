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

  // [[rule: dropdown-list-menu-radio]]
  it('throws a named error when the trigger does not render a <button>', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(() => render(<AllTabs trigger={<span>6 more</span>} />)).toThrow(/<DropdownList label="All tabs">: the trigger renders a <span>, not a <button>/)
      expect(() => render(<AllTabs trigger={<div role="button">6 more</div>} />)).toThrow(/renders a <div>/)
    } finally {
      quiet.mockRestore()
    }
  })

  // [[rule: dropdown-list-meta-not-a-taxonomy-label]]
  it('warns in development when meta is a Severity, Risk, Status or Verdict word, ignoring case', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      render(
        <DropdownList
          label="Views"
          trigger={<button type="button">Views</button>}
          defaultValue="a"
          items={[
            { value: 'a', label: 'Alerts', meta: 'Critical' },
            { value: 'b', label: 'Hosts', meta: 'high' },
            { value: 'c', label: 'Agents', meta: 'Degraded' },
            { value: 'd', label: 'Cases', meta: 'MALICIOUS' },
            { value: 'e', label: 'Firewall', meta: '1 new' },
            { value: 'f', label: 'Archive', meta: 'No access' },
          ]}
        />,
      )
      const said = warn.mock.calls.map((c) => String(c[0]))
      expect(said).toHaveLength(4)
      expect(said[0]).toMatch(/<DropdownList label="Views">: item "Alerts" has meta "Critical", a Severity word/)
      expect(said[1]).toMatch(/item "Hosts" has meta "high", a Risk word/)
      expect(said[2]).toMatch(/item "Agents" has meta "Degraded", a Status word/)
      expect(said[3]).toMatch(/item "Cases" has meta "MALICIOUS", a Verdict word/)
      warn.mockClear()
      // A word in two taxonomies names both.
      render(<AllTabs items={[{ value: 'firewall', label: 'Firewall', meta: 'Warning' }]} />)
      expect(String(warn.mock.calls[0][0])).toMatch(/a Severity and Status word/)
    } finally {
      warn.mockRestore()
    }
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
    expect(trigger()).toHaveFocus()
    // From the keyboard too.
    trigger().focus()
    await userEvent.keyboard('{Enter}')
    await settle()
    await userEvent.keyboard('{Enter}')
    await settle()
    expect(onValueChange).not.toHaveBeenCalled()
    expect(screen.queryByRole('menu')).toBeNull()
    expect(trigger()).toHaveFocus()
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
  // One test per way of opening, each followed by one arrow key: Base UI's own active item must
  // have moved to the current one too, or the arrow key would start from where Base UI landed.
  const OPENS: [string, () => Promise<void>][] = [
    ['a pointer press', () => userEvent.click(trigger())],
    ['Enter', async () => { trigger().focus(); await userEvent.keyboard('{Enter}') }],
    ['Space', async () => { trigger().focus(); await userEvent.keyboard(' ') }],
    ['Arrow Down', async () => { trigger().focus(); await userEvent.keyboard('{ArrowDown}') }],
    ['Arrow Up', async () => { trigger().focus(); await userEvent.keyboard('{ArrowUp}') }],
  ]
  const landsOn = async (name: string | RegExp) => {
    await settle()
    await settle()
    expect(item(name)).toHaveFocus()
    expect(item(name)).toHaveAttribute('data-highlighted')
    expect(screen.getAllByRole('menuitemradio').filter((r) => r.hasAttribute('data-highlighted'))).toHaveLength(1)
  }
  for (const [how, open] of OPENS) {
    it(`lands on the current item after opening by ${how}, and the next arrow key moves on from it`, async () => {
      render(<AllTabs defaultValue="firewall" />)
      await open()
      await landsOn(/^Firewall/)
      await userEvent.keyboard('{ArrowDown}')
      expect(item(/^Archive/)).toHaveFocus()
      await userEvent.keyboard('{ArrowUp}')
      await userEvent.keyboard('{ArrowUp}')
      expect(item('Alerts')).toHaveFocus()
    })
  }

  // [[rule: dropdown-list-focus-current]]
  it('lands on the current item when it is the last, and the loop wraps from there', async () => {
    for (const [how, open] of OPENS) {
      const { unmount } = render(<AllTabs defaultValue="reports" />)
      await open()
      await landsOn('Reports')
      await userEvent.keyboard('{ArrowDown}')
      // Base UI defers the focus by a frame when the loop wraps.
      await settle()
      expect(item('Alerts'), how).toHaveFocus()
      unmount()
    }
  })

  // [[rule: dropdown-list-focus-current]]
  it('lands on a disabled current item too, which still cannot be chosen', async () => {
    const onValueChange = vi.fn()
    for (const [how, open] of OPENS) {
      const { unmount } = render(<AllTabs defaultValue="archive" onValueChange={onValueChange} />)
      await open()
      await landsOn('Archive, No access')
      expect(item('Archive, No access'), how).toHaveAttribute('aria-checked', 'true')
      await userEvent.keyboard('{ArrowDown}')
      expect(item('Reports'), how).toHaveFocus()
      unmount()
    }
    expect(onValueChange).not.toHaveBeenCalled()
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
  it('a press outside closes it', async () => {
    const onOpenChange = vi.fn()
    render(<AllTabs onOpenChange={onOpenChange} />)
    await openWithClick()
    await userEvent.click(screen.getByRole('button', { name: 'After' }))
    await settle()
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  // [[rule: dropdown-list-non-modal]]
  it('is non-modal: the page keeps its accessibility tree and its scroll, and Tab leaves the list', async () => {
    render(<AllTabs />)
    trigger().focus()
    await userEvent.keyboard('{Enter}')
    await settle()
    const after = screen.getByRole('button', { name: 'After' })
    expect(after.closest('[aria-hidden="true"]')).toBeNull()
    expect(after.closest('[inert]')).toBeNull()
    for (const el of [document.documentElement, document.body]) {
      expect(el.style.overflow).not.toBe('hidden')
      expect(el.style.overflowY).not.toBe('hidden')
    }
    // Not trapped: Tab from inside the list moves on through the page.
    expect(item(/^Firewall/)).toHaveFocus()
    await userEvent.tab()
    await settle()
    expect(document.activeElement?.closest('.vela-dropdown-list')).toBeNull()
    expect(after).toHaveFocus()
  })

  // [[rule: dropdown-list-non-modal]]
  it('is non-modal: a press outside closes the list and still reaches what it landed on', async () => {
    const pressed = vi.fn()
    render(
      <div>
        <AllTabs />
        <button type="button" onClick={pressed}>Elsewhere</button>
      </div>,
    )
    await openWithClick()
    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }))
    await settle()
    expect(screen.queryByRole('menu')).toBeNull()
    expect(pressed).toHaveBeenCalledTimes(1)
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

  // [[rule: dropdown-list-trigger-instant-from-keyboard]]
  it('marks a keyboard open and close instant, on the list and on the trigger, until the next pointer interaction', async () => {
    render(<AllTabs />)
    trigger().focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('menu')).toHaveAttribute('data-vela-instant')
    expect(trigger()).toHaveAttribute('data-vela-instant')
    await userEvent.keyboard('{Escape}')
    await settle()
    expect(trigger()).toHaveAttribute('data-vela-instant')
    // The next pointer interaction clears it.
    await userEvent.hover(trigger())
    expect(trigger()).not.toHaveAttribute('data-vela-instant')
    // A pointer open is not instant, and neither is its close by a choice.
    await openWithClick()
    expect(trigger()).not.toHaveAttribute('data-vela-instant')
    expect(screen.getByRole('menu')).not.toHaveAttribute('data-vela-instant')
    await userEvent.click(item('Reports'))
    await settle()
    expect(trigger()).not.toHaveAttribute('data-vela-instant')
    // A keyboard choice closes it instantly; a pointer in the list clears it as well.
    await userEvent.keyboard('{Enter}')
    await settle()
    expect(trigger()).toHaveAttribute('data-vela-instant')
    await userEvent.hover(item('Alerts'))
    expect(trigger()).not.toHaveAttribute('data-vela-instant')
    await userEvent.keyboard('{Enter}')
    await settle()
    expect(screen.queryByRole('menu')).toBeNull()
    expect(trigger()).toHaveAttribute('data-vela-instant')
  })

  it('marks the popup while the pointer is the last input in it, so a disabled item it rests on shows no highlight', async () => {
    render(<AllTabs />)
    trigger().focus()
    await userEvent.keyboard('{Enter}')
    await settle()
    const menu = screen.getByRole('menu')
    expect(menu).not.toHaveAttribute('data-vela-pointer')
    await userEvent.hover(item('Archive, No access'))
    expect(menu).toHaveAttribute('data-vela-pointer')
    await userEvent.keyboard('{ArrowDown}')
    expect(menu).not.toHaveAttribute('data-vela-pointer')
  })
})
