import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SectionIndex, sectionOf, withSection, INDEX_MIN } from '../../demo/shell/SectionIndex'
import { Stage } from '../../demo/shell/Stage'
import { Card, NextCard } from '../../demo/shell/Card'

// The shell parts of slice 1 of the playground uplift (s5-tabs, s5-proposal). Each stands in for
// something the kit doesn't have, and is not exported from the package. The section index is wired
// on the component pages' Rules tab (tests/e2e/site.spec.ts, "slice 1 · the shell"); the rail form,
// the stage and the card with a thumbnail ship here first and are used by later slices.

const ITEMS = [
  { id: 'compiler', label: 'Compiler', count: 3 },
  { id: 'browser', label: 'Browser', count: 2 },
  { id: 'states', label: 'States' },
  { id: 'motion', label: 'Motion' },
]

function Page({ form }: { form?: 'strip' | 'rail' }) {
  return (
    <>
      <SectionIndex items={ITEMS} form={form} />
      {ITEMS.map((s) => <h2 key={s.id} id={`section-${s.id}`} tabIndex={-1}>{s.label} heading</h2>)}
    </>
  )
}

describe('Section index (shell part for an in-page index)', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/#/components/button/rules?v=1&size=large')
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('reads and writes ?section= in the hash, keeping every other parameter', () => {
    expect(sectionOf('#/components/button/rules?v=1&section=states')).toBe('states')
    expect(sectionOf('#/components/button/rules')).toBeNull()
    expect(withSection('#/components/button/rules?v=1&size=large', 'browser')).toBe('#/components/button/rules?v=1&size=large&section=browser')
    expect(withSection('#/components/button/rules?section=browser', 'states')).toBe('#/components/button/rules?section=states')
  })

  it('is a nav of links named "On this tab"; the place is aria-current="location"', () => {
    render(<Page />)
    const nav = screen.getByRole('navigation', { name: 'On this tab' })
    const links = Array.from(nav.querySelectorAll('a'))
    expect(links.map((a) => a.textContent)).toEqual(['Compiler 3', 'Browser 2', 'States', 'Motion'])
    expect(links.map((a) => a.getAttribute('aria-current'))).toEqual(['location', null, null, null])
    // Real links with the full route, so they work without script; never tabs.
    expect(links[1]).toHaveAttribute('href', '#/components/button/rules?v=1&size=large&section=browser')
    expect(nav.querySelector('[role="tab"]')).toBeNull()
  })

  it('a jump replaces the address, moves the place and gives the heading focus', async () => {
    const user = userEvent.setup()
    render(<Page />)
    const entries = window.history.length
    await user.click(screen.getByRole('link', { name: 'States' }))
    expect(window.location.hash).toBe('#/components/button/rules?v=1&size=large&section=states')
    expect(window.history.length).toBe(entries)
    expect(screen.getByRole('link', { name: 'States' })).toHaveAttribute('aria-current', 'location')
    expect(screen.getByRole('heading', { name: 'States heading' })).toHaveFocus()
    // Instant: never a smooth sweep.
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' })
  })

  it('arrives at the section the address names', () => {
    window.history.replaceState(null, '', '/#/components/button/rules?section=motion')
    render(<Page />)
    expect(screen.getByRole('link', { name: 'Motion' })).toHaveAttribute('aria-current', 'location')
    expect(screen.getByRole('heading', { name: 'Motion heading' })).toHaveFocus()
  })

  it(`is not drawn for fewer than ${INDEX_MIN} sections`, () => {
    render(<SectionIndex items={ITEMS.slice(0, INDEX_MIN - 1)} />)
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('the rail is the same index for a page without page tabs, named "On this page"', () => {
    render(<Page form="rail" />)
    const nav = screen.getByRole('navigation', { name: 'On this page' })
    expect(nav).toHaveClass('shell-index--rail')
  })

  it('narrow: one button says where you are and opens the list; Escape closes it and returns focus', async () => {
    const user = userEvent.setup()
    render(<Page />)
    const toggle = screen.getByRole('button', { name: 'On this tab Compiler 3' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('navigation', { name: 'On this tab' })).toHaveClass('is-open')
    screen.getByRole('link', { name: 'Browser 2' }).focus()
    await user.keyboard('{Escape}')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveFocus()
    // Choosing a section closes it, and the button names the new place.
    await user.click(toggle)
    await user.click(screen.getByRole('link', { name: 'Browser 2' }))
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'On this tab Browser 2' })).toBe(toggle)
  })
})

describe('Stage (shell part for the live demo)', () => {
  it('is a region named "Live demo" with a "Live" caption, the props as code, and the component on its slab', () => {
    render(<Stage props={'<Tabs size="regular">'} tools={<button type="button">Reduced motion</button>}><button type="button">Alerts</button></Stage>)
    const region = screen.getByRole('region', { name: 'Live demo' })
    expect(region.querySelector('.shell-stage__live')).toHaveTextContent('Live')
    expect(region.querySelector('code.shell-stage__props')).toHaveTextContent('<Tabs size="regular">')
    expect(region.querySelector('.shell-stage__tools')).toContainElement(screen.getByRole('button', { name: 'Reduced motion' }))
    expect(region.querySelector('.shell-stage__slab')).toContainElement(screen.getByRole('button', { name: 'Alerts' }))
  })

  it('keeps its edge in forced colours, where its fill is dropped: a CanvasText border, never a shadow', () => {
    const css = readFileSync(resolve(process.cwd(), 'demo/shell/shell.css'), 'utf8')
    const forced = [...css.matchAll(/@media \(forced-colors: active\) \{([\s\S]*?)\n\}/g)].map((m) => m[1]).join('\n')
    expect(forced).toMatch(/\.shell-stage \{ border-color: CanvasText; \}/)
    expect(forced).toMatch(/\.shell-index__link\[aria-current="location"\] \{ border-bottom-color: CanvasText; \}/)
    expect(css).not.toMatch(/\.shell-stage[^{]*\{[^}]*box-shadow/)
  })
})

describe('Card with thumbnail and Next card (shell parts)', () => {
  it('a card is one link; its picture is inert and hidden, so its controls are never reached or heard', () => {
    render(<Card href="#/status" title="Components" line="19 built" level={3} thumbnail={<button type="button">Save</button>} />)
    const link = screen.getByRole('link', { name: 'Components 19 built' })
    expect(link).toHaveAttribute('href', '#/status')
    expect(screen.getByRole('heading', { level: 3, name: 'Components' })).toBeInTheDocument()
    const thumb = link.querySelector('.shell-card__thumb')!
    expect(thumb).toHaveAttribute('aria-hidden', 'true')
    expect(thumb).toHaveAttribute('inert')
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull()
  })

  it('a Next card says where it goes on, under "Next on this page"', () => {
    render(<NextCard href="#/components/button/tokens" title="Tokens: what Button is made of" line="30 tokens, each in light and dark" />)
    const link = screen.getByRole('link', { name: /^Next on this page Tokens: what Button is made of 30 tokens, each in light and dark$/ })
    expect(link).toHaveAttribute('href', '#/components/button/tokens')
    expect(link.querySelector('.shell-next__thumb')).toBeNull()
  })
})
