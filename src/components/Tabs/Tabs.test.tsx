import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Tabs } from './Tabs'

function Fixture(props: { onValueChange?: (v: string) => void }) {
  return (
    <Tabs defaultValue="alerts" onValueChange={props.onValueChange}>
      <Tabs.List aria-label="Views">
        <Tabs.Trigger value="alerts" count={12}>Alerts</Tabs.Trigger>
        <Tabs.Trigger value="assets">Assets</Tabs.Trigger>
        <Tabs.Trigger value="audit" disabled>Audit</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Panel value="alerts">Alerts panel</Tabs.Panel>
      <Tabs.Panel value="assets">Assets panel</Tabs.Panel>
      <Tabs.Panel value="audit">Audit panel</Tabs.Panel>
    </Tabs>
  )
}

describe('Tabs', () => {
  it('wires tablist, tabs and panel with matching ARIA relationships', () => {
    render(<Fixture />)
    const tab = screen.getByRole('tab', { name: /Alerts/ })
    const panel = screen.getByRole('tabpanel')
    expect(screen.getByRole('tablist')).toHaveAccessibleName('Views')
    expect(tab).toHaveAttribute('aria-selected', 'true')
    expect(tab).toHaveAttribute('aria-controls', panel.id)
    expect(panel).toHaveAttribute('aria-labelledby', tab.id)
  })

  it('renders only the active panel', () => {
    render(<Fixture />)
    expect(screen.getByText('Alerts panel')).toBeInTheDocument()
    expect(screen.queryByText('Assets panel')).toBeNull()
  })

  it('uses a roving tabindex so the tablist is one tab stop', () => {
    render(<Fixture />)
    expect(screen.getByRole('tab', { name: /Alerts/ })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'Assets' })).toHaveAttribute('tabindex', '-1')
  })

  it('moves between tabs with arrow keys and skips disabled tabs', async () => {
    render(<Fixture />)
    const first = screen.getByRole('tab', { name: /Alerts/ })
    first.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Assets' })).toHaveFocus()
    expect(screen.getByText('Assets panel')).toBeInTheDocument()
    // Audit is disabled, so ArrowRight wraps back to the first tab.
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /Alerts/ })).toHaveFocus()
  })

  it('jumps to first and last with Home and End', async () => {
    render(<Fixture />)
    screen.getByRole('tab', { name: /Alerts/ }).focus()
    await userEvent.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Assets' })).toHaveFocus()
    await userEvent.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: /Alerts/ })).toHaveFocus()
  })

  it('reports changes to the consumer', async () => {
    const onValueChange = vi.fn()
    render(<Fixture onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Assets' }))
    expect(onValueChange).toHaveBeenCalledWith('assets')
  })

  it('fails loudly when a part is used outside Tabs', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Tabs.Trigger value="x">Orphan</Tabs.Trigger>)).toThrow(
      /must be rendered inside <Tabs>/,
    )
    spy.mockRestore()
  })
})
