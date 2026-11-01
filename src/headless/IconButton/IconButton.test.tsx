import * as React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { IconButton } from './IconButton'
import type { IconButtonProps } from './IconButton'

// The spec is guidelines/components/icon-button.md. Icon Button ships from `@omkarux/vela/headless`
// only; its tooltip is Vela's Tooltip with kind="label". The two browser rules (the hit area under
// touch, forced colours) are in tests/e2e/playground.spec.ts: jsdom has no layout and no paint.
const wait = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)))

// jsdom loads no stylesheet, so the delay token is declared here, as dist/vela.css declares it on :root.
function withDelayToken(value: string) {
  const style = document.createElement('style')
  style.textContent = `button, a { --vela-delay-tooltip: ${value}; }`
  document.head.appendChild(style)
}
afterEach(() => document.head.querySelectorAll('style').forEach((s) => s.remove()))

/** A tooltip popup, which is aria-hidden by design, so it is found with hidden: true. */
const tip = () => screen.queryByRole('tooltip', { hidden: true })

describe('Icon Button (headless)', () => {
  // [[rule: icon-button-named-by-label]]
  it('is named by its label alone, and every glyph is hidden from assistive technology', () => {
    render(
      <>
        <IconButton label="Close" icon="x" size="tiny" onClick={() => {}} />
        <IconButton label="Vela on GitHub" brandMark="github" href="https://github.com/omkarpkh/vela" />
        <IconButton label="Vela in Figma" brandMark="figma" href="https://www.figma.com/" opensInNewTab />
        <IconButton label="Vela on npm" word="npm" href="https://www.npmjs.com/package/@omkarux/vela" opensInNewTab />
      </>,
    )
    expect(screen.getByRole('button', { name: 'Close' })).toHaveAttribute('aria-label', 'Close')
    expect(screen.getByRole('link', { name: 'Vela on GitHub' })).toHaveAttribute('aria-label', 'Vela on GitHub')
    // A link that opens a new tab says so, in the name.
    expect(screen.getByRole('link', { name: 'Vela in Figma, opens in a new tab' })).toBeInTheDocument()
    const npm = screen.getByRole('link', { name: 'Vela on npm, opens in a new tab' })
    // The word is visible text, and still not the name: it is aria-hidden, the label names the link.
    expect(npm.querySelector('.vela-icon-button__word')).toHaveAttribute('aria-hidden', 'true')
    for (const control of [...screen.getAllByRole('button'), ...screen.getAllByRole('link')]) {
      expect(control).not.toHaveAttribute('title')
      for (const svg of control.querySelectorAll('svg')) {
        expect(svg).toHaveAttribute('aria-hidden', 'true')
        expect(svg).toHaveAttribute('focusable', 'false')
        expect(svg).not.toHaveAttribute('role')
        expect(svg.querySelector('title')).toBeNull()
      }
    }
    // Each glyph is the one asked for: Icon's x, Brand Mark's two, the word.
    expect(screen.getByRole('button', { name: 'Close' }).querySelector('.vela-icon.vela-icon--regular')).not.toBeNull()
    expect(screen.getByRole('link', { name: 'Vela on GitHub' }).querySelector('.vela-brand-mark--large')).not.toBeNull()
    expect(screen.getByRole('link', { name: /Figma/ }).querySelector('.vela-brand-mark')).toHaveAttribute('viewBox', '212 340 600 600')
    expect(npm).toHaveTextContent('npm')
  })

  // [[rule: icon-button-named-by-label]]
  it('throws a named error for what the types reject: no label, two glyphs, none, both forms', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const bad = (props: Record<string, unknown>) => () => render(<IconButton {...(props as unknown as IconButtonProps)} />)
    expect(bad({ icon: 'x', onClick: () => {} })).toThrow('`label` is required')
    expect(bad({ label: '  ', icon: 'x', onClick: () => {} })).toThrow('`label` is required')
    expect(bad({ label: 'Close', icon: 'x', word: 'npm', onClick: () => {} })).toThrow('exactly one of `icon`, `brandMark` or `word` (got 2)')
    expect(bad({ label: 'Close', onClick: () => {} })).toThrow('(got 0)')
    expect(bad({ label: 'Close', icon: 'x', onClick: () => {}, href: '/x' })).toThrow('not both and not neither')
    expect(bad({ label: 'Figma', brandMark: 'figma', size: 'tiny', href: '/x' })).toThrow('20px only')
    spy.mockRestore()
  })

  // [[rule: icon-button-tooltip-repeats-name]]
  it('shows the name on hover only after --vela-delay-tooltip, and never wires it as a description', async () => {
    withDelayToken('300ms')
    render(<IconButton label="Search" icon="search" onClick={() => {}} />)
    const button = screen.getByRole('button', { name: 'Search' })
    await userEvent.hover(button)
    await wait(100)
    expect(tip()).toBeNull()
    await wait(400)
    expect(tip()).toHaveTextContent('Search')
    // Heard once: the popup is hidden, nothing points at it, and the name is still the label.
    expect(tip()).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(button).not.toHaveAttribute('aria-describedby')
    expect(button).toHaveAccessibleName('Search')
    expect(button).toHaveAccessibleDescription('')
    await userEvent.unhover(button)
    await wait(50)
    expect(tip()).toBeNull()
  })

  // [[rule: icon-button-tooltip-repeats-name]]
  it('shows the name at once on keyboard focus, with ", opens in a new tab" when it does, and Escape closes it', async () => {
    withDelayToken('5s')
    render(
      <>
        <button type="button">Before</button>
        <IconButton label="Vela on GitHub" brandMark="github" href="https://github.com/omkarpkh/vela" opensInNewTab />
      </>,
    )
    screen.getByRole('button', { name: 'Before' }).focus()
    await userEvent.tab()
    const link = screen.getByRole('link', { name: 'Vela on GitHub, opens in a new tab' })
    expect(link).toHaveFocus()
    await wait(20)
    expect(tip()).toHaveTextContent('Vela on GitHub, opens in a new tab')
    expect(tip()).toHaveAttribute('data-instant', 'focus')
    expect(link).not.toHaveAttribute('aria-describedby')
    await userEvent.keyboard('{Escape}')
    await wait(20)
    expect(tip()).toBeNull()
    expect(link).toHaveFocus()
  })

  // [[rule: icon-button-tooltip-repeats-name]]
  it('stays open while the pointer moves onto the tooltip (WCAG 1.4.13, hoverable)', async () => {
    withDelayToken('0ms')
    render(<IconButton label="Copy" icon="copy" onClick={() => {}} />)
    const button = screen.getByRole('button', { name: 'Copy' })
    await userEvent.hover(button)
    await wait(20)
    const popup = tip()!
    expect(popup).toHaveTextContent('Copy')
    // Leaving the trigger for the popup keeps it open.
    fireEvent.pointerLeave(button)
    fireEvent.mouseLeave(button, { relatedTarget: popup })
    await userEvent.hover(popup)
    await wait(50)
    expect(tip()).not.toBeNull()
  })

  // [[rule: icon-button-link-form]]
  it('is an <a href>: Enter follows it, Space does not, and opensInNewTab sets target and rel', async () => {
    render(
      <>
        <IconButton label="Vela on npm" word="npm" href="#npm" />
        <IconButton label="Vela in Figma" brandMark="figma" href="#figma" opensInNewTab />
      </>,
    )
    const npm = screen.getByRole('link', { name: 'Vela on npm' })
    expect(npm.tagName).toBe('A')
    expect(npm).toHaveAttribute('href', '#npm')
    expect(npm).not.toHaveAttribute('target')
    expect(npm).not.toHaveAttribute('rel')
    expect(npm).not.toHaveAttribute('type')
    const figma = screen.getByRole('link', { name: 'Vela in Figma, opens in a new tab' })
    expect(figma).toHaveAttribute('target', '_blank')
    expect(figma).toHaveAttribute('rel', 'noopener noreferrer')

    // jsdom does not navigate, so a click on the link is what Enter produces; Space produces none.
    const follows = vi.fn((e: Event) => e.preventDefault())
    npm.addEventListener('click', follows)
    npm.focus()
    await userEvent.keyboard('{Enter}')
    expect(follows).toHaveBeenCalledTimes(1)
    await userEvent.keyboard(' ')
    expect(follows).toHaveBeenCalledTimes(1)
  })

  // [[rule: icon-button-link-form]]
  it('the button form is a <button type="button"> that acts on Enter and Space, and forwards its ref', async () => {
    const onClick = vi.fn()
    const ref = React.createRef<HTMLButtonElement | HTMLAnchorElement>()
    render(<IconButton ref={ref} label="Close" icon="x" onClick={onClick} data-testid="close" />)
    const button = screen.getByRole('button', { name: 'Close' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveAttribute('data-testid', 'close')
    expect(ref.current).toBe(button)
    button.focus()
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(2)
  })

  // [[rule: icon-button-disabled-native]]
  it('disabled is the native attribute: out of the tab order, no tooltip, no click and no press', async () => {
    withDelayToken('0ms')
    const onClick = vi.fn()
    render(
      <>
        <button type="button">Before</button>
        <IconButton label="Copy" icon="copy" onClick={onClick} disabled />
        <button type="button">After</button>
      </>,
    )
    const copy = screen.getByRole('button', { name: 'Copy' })
    expect(copy).toBeDisabled()
    expect(copy).not.toHaveAttribute('aria-disabled')
    screen.getByRole('button', { name: 'Before' }).focus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
    await userEvent.hover(copy)
    await wait(30)
    expect(tip()).toBeNull()
    await userEvent.click(copy)
    expect(onClick).not.toHaveBeenCalled()
    // A disabled button gets no pointer events, so nothing sets the press flag.
    expect(copy).not.toHaveAttribute('data-vela-pressed')
  })

  // [[rule: icon-button-disabled-native]]
  it('marks a pointer press with data-vela-pressed and clears it on release; a keyboard press marks nothing', async () => {
    render(<IconButton label="Search" icon="search" onClick={() => {}} />)
    const button = screen.getByRole('button', { name: 'Search' })
    fireEvent.pointerDown(button, { pointerId: 1 })
    expect(button).toHaveAttribute('data-vela-pressed')
    fireEvent.pointerUp(button, { pointerId: 1 })
    expect(button).not.toHaveAttribute('data-vela-pressed')
    button.focus()
    fireEvent.keyDown(button, { key: ' ' })
    expect(button).not.toHaveAttribute('data-vela-pressed')
  })
})
