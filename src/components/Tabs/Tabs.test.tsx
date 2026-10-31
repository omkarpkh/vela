import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Tabs as CoreTabs } from './Tabs'
import { Tabs as HeadlessTabs } from '../../headless/Tabs'
import { previewScale, PREVIEW_SCALE } from './motion'

// The spec is the contract and these are its tests, so they run against both implementations:
// the hand-rolled core (`@omkarux/vela`) and the Base UI-backed headless one
// (`@omkarux/vela/headless`). An assertion that holds for one and not the other is a spec
// difference, and it belongs in the spec's "Implementations" section, not in a second test file.
const IMPLEMENTATIONS = [
  ['core', CoreTabs],
  ['headless', HeadlessTabs],
] as const

// Focusing a tab is a state change for the headless implementation (Base UI tracks the highlighted
// item on focus), so the test's own `.focus()` call goes through act() like any other update.
const focus = (el: HTMLElement) => act(() => el.focus())

describe.each(IMPLEMENTATIONS)('Tabs (%s)', (_name, Tabs) => {
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

  it('wires tablist, tabs and panel with matching ARIA relationships', () => {
    render(<Fixture />)
    const tab = screen.getByRole('tab', { name: /Alerts/ })
    const panel = screen.getByRole('tabpanel')
    expect(screen.getByRole('tablist')).toHaveAccessibleName('Views')
    expect(tab).toHaveAttribute('aria-selected', 'true')
    expect(tab).toHaveAttribute('aria-controls', panel.id)
    expect(panel).toHaveAttribute('aria-labelledby', tab.id)
  })

  // [[rule: tabs-only-active-panel-renders]]
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
    focus(screen.getByRole('tab', { name: /Alerts/ }))
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Assets' })).toHaveFocus()
    expect(screen.getByText('Assets panel')).toBeInTheDocument()
    // Audit is disabled, so ArrowRight wraps back to the first tab.
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /Alerts/ })).toHaveFocus()
  })

  it('jumps to first and last with Home and End', async () => {
    render(<Fixture />)
    focus(screen.getByRole('tab', { name: /Alerts/ }))
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

  // The CSS keys on the native attribute (`.vela-tabs__trigger:disabled`), the browser keeps a
  // natively disabled button out of the tab order and swallows its clicks. Both implementations
  // must render the attribute, not only an ARIA state.
  it('renders a disabled trigger with the native disabled attribute', () => {
    render(<Fixture />)
    expect(screen.getByRole('tab', { name: 'Audit' })).toBeDisabled()
  })

  // The same stylesheet styles both: the class names are the contract between the spec's
  // token bindings and whichever implementation renders the markup.
  it('emits the class names Tabs.css styles', () => {
    const { container } = render(<Fixture />)
    expect(container.querySelector('.vela-tabs.vela-tabs--regular')).not.toBeNull()
    expect(container.querySelector('.vela-tabs__list')).toBe(screen.getByRole('tablist'))
    expect(screen.getByRole('tab', { name: /Alerts/ })).toHaveClass('vela-tabs__trigger')
    expect(screen.getByRole('tabpanel')).toHaveClass('vela-tabs__panel')
    expect(container.querySelector('.vela-tabs__count')).toHaveTextContent('12')
  })

  it('applies the size modifier', () => {
    const { container } = render(
      <Tabs defaultValue="a" size="large">
        <Tabs.List aria-label="Views"><Tabs.Trigger value="a">A</Tabs.Trigger></Tabs.List>
        <Tabs.Panel value="a">Panel</Tabs.Panel>
      </Tabs>,
    )
    expect(container.querySelector('.vela-tabs')).toHaveClass('vela-tabs--large')
  })

  // The hover preview and the press (tabs.md, Motion). Hover, layout and Web Animations need a
  // browser, so the browser rules are proved in tests/e2e; what jsdom can prove is the markup and
  // the modality.
  // [[rule: tabs-preview-decorative]]
  it('renders the Seed and the line inside each trigger as empty decorative layers that leave the name alone', () => {
    render(<Fixture />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(3)
    for (const tab of tabs) {
      const layers = [...tab.querySelectorAll('.vela-tabs__seed, .vela-tabs__line')]
      expect(layers.map((l) => l.className)).toEqual(['vela-tabs__seed', 'vela-tabs__line'])
      for (const l of layers) {
        expect(l).toHaveAttribute('aria-hidden', 'true')
        expect(l).toBeEmptyDOMElement()
      }
    }
    expect(tabs[0]).toHaveAccessibleName('Alerts 12')
    expect(tabs[1]).toHaveAccessibleName('Assets')
    // Nothing in the list but the tabs: no row-level bar, no extra stop for roving focus.
    expect([...screen.getByRole('tablist').children].every((c) => c.getAttribute('role') === 'tab')).toBe(true)
  })

  it('sets each trigger\'s preview scale, an internal custom property, never a prop', () => {
    render(<Fixture />)
    // jsdom lays nothing out, so every tab is 0px wide and gets the plain third.
    for (const tab of screen.getAllByRole('tab')) expect(Number(tab.style.getPropertyValue(PREVIEW_SCALE))).toBeCloseTo(1 / 3, 6)
  })

  it('marks a keyboard switch instant and a pointer switch not', async () => {
    const { container } = render(<Fixture />)
    const root = container.querySelector('.vela-tabs')!
    expect(root).not.toHaveAttribute('data-vela-instant')
    focus(screen.getByRole('tab', { name: /Alerts/ }))
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Assets' })).toHaveAttribute('aria-selected', 'true')
    expect(root).toHaveAttribute('data-vela-instant')
    await userEvent.click(screen.getByRole('tab', { name: /Alerts/ }))
    expect(screen.getByRole('tab', { name: /Alerts/ })).toHaveAttribute('aria-selected', 'true')
    expect(root).not.toHaveAttribute('data-vela-instant')
    // jsdom runs no animations, so a pointer flight ends in the same commit it starts.
    expect(screen.getByRole('tablist')).not.toHaveAttribute('data-vela-moving')
  })

  // [[rule: tabs-parts-require-provider]]
  it('fails loudly when a part is used outside Tabs', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Tabs.Trigger value="x">Orphan</Tabs.Trigger>)).toThrow(
      /must be rendered inside <Tabs>/,
    )
    spy.mockRestore()
  })
})

// The Seed's size as a fraction of its tab: a third, floored at the token's 24px, never wider than
// the tab (tabs.md, Hard constraints; the rendered width is proved in tests/e2e).
// [[rule: tabs-preview-size]]
describe('previewScale', () => {
  it('is a third of a tab wide enough for a third to clear the floor', () => {
    expect(previewScale(150, 24)).toBeCloseTo(1 / 3, 6)
  })
  it('is held at the floor on a short tab', () => {
    expect(previewScale(48, 24)).toBe(0.5)
  })
  it('is never wider than a tab narrower than the floor', () => {
    expect(previewScale(13, 24)).toBe(1)
  })
  it('falls back to a third when the tab has no width yet or no floor is known', () => {
    expect(previewScale(0, 24)).toBeCloseTo(1 / 3, 6)
    expect(previewScale(40, 0)).toBeCloseTo(1 / 3, 6)
  })
})
