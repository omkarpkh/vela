import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect, vi } from 'vitest'
import { Icon } from './Icon'
import { ICON_NAMES, type IconName } from '../../icons/names'
import { Button } from '../Button'

const svgOf = (c: HTMLElement) => c.querySelector('svg')!

describe('Icon', () => {
  // [[rule: icon-decorative-unless-labelled]]
  it('is aria-hidden with no role when it has no label', () => {
    const { container } = render(<Icon name="shield-x" />)
    const svg = svgOf(container)
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).not.toHaveAttribute('role')
    expect(svg).not.toHaveAttribute('aria-label')
    expect(screen.queryByRole('img')).toBeNull()
  })

  // [[rule: icon-decorative-unless-labelled]]
  it('is an img named by its label, and not hidden, when it has one', () => {
    render(<Icon name="rotate-ccw-clock" size="large" label="Audit history" />)
    const img = screen.getByRole('img', { name: 'Audit history' })
    expect(img.tagName.toLowerCase()).toBe('svg')
    expect(img).not.toHaveAttribute('aria-hidden')
  })

  // [[rule: icon-decorative-unless-labelled]]
  it('treats an empty label as no label, so it never announces an empty image', () => {
    const { container } = render(<Icon name="check" label="" />)
    expect(svgOf(container)).toHaveAttribute('aria-hidden', 'true')
    expect(svgOf(container)).not.toHaveAttribute('role')
  })

  // [[rule: icon-never-focusable]]
  it('is never a tab stop, labelled or not', () => {
    const { container } = render(<><Icon name="copy" /><Icon name="lock" label="Locked by policy" /></>)
    for (const svg of container.querySelectorAll('svg')) {
      expect(svg).toHaveAttribute('focusable', 'false')
      expect(svg).not.toHaveAttribute('tabindex')
    }
  })

  // [[rule: icon-stroke-from-token]]
  it('carries no width, height or stroke-width attribute, and the stylesheet binds the tokens', () => {
    const { container } = render(<Icon name="wrench" />)
    const svg = svgOf(container)
    for (const a of ['width', 'height', 'stroke-width']) expect(svg).not.toHaveAttribute(a)
    for (const el of svg.querySelectorAll('*')) expect(el).not.toHaveAttribute('stroke-width')
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
    expect(svg).toHaveAttribute('fill', 'none')
    expect(svg).toHaveAttribute('stroke', 'currentColor')
    expect(svg).toHaveAttribute('stroke-linecap', 'round')
    expect(svg).toHaveAttribute('stroke-linejoin', 'round')

    const css = readFileSync(resolve(process.cwd(), 'src/components/Icon/Icon.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const rule = (sel: string) => css.match(new RegExp(`${sel.replace(/\./g, '\\.')}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
    expect(rule('.vela-icon')).toMatch(/stroke-width:\s*var\(--vela-icon-stroke\)/)
    expect(rule('.vela-icon')).toMatch(/width:\s*var\(--vela-icon-size\);[\s\S]*height:\s*var\(--vela-icon-size\)/)
    expect(rule('.vela-icon--small')).toContain('var(--vela-icon-size-small)')
    expect(rule('.vela-icon--large')).toContain('var(--vela-icon-size-large)')
    expect(rule('.vela-icon--default')).toContain('color: var(--vela-icon-strong)')
    expect(rule('.vela-icon--muted')).toContain('color: var(--vela-icon-default)')
  })

  it.each([['regular', 'default'], ['small', 'muted'], ['large', 'default']] as const)('binds the %s size and the %s tone classes', (size, tone) => {
    const { container } = render(<Icon name="bell" size={size} tone={tone} />)
    expect(svgOf(container)).toHaveClass('vela-icon', `vela-icon--${size}`, `vela-icon--${tone}`)
  })

  it('defaults to regular and default, and inherit sets no tone class so the glyph takes the text colour', () => {
    const { container } = render(<><Icon name="bell" /><Icon name="bell" tone="inherit" /></>)
    const [a, b] = container.querySelectorAll('svg')
    expect(a).toHaveClass('vela-icon', 'vela-icon--regular', 'vela-icon--default')
    expect(b.getAttribute('class')).toBe('vela-icon vela-icon--regular')
  })

  it('sits in the Button icon slot with tone="inherit", which the slot hides from assistive technology', () => {
    render(<Button icon={<Icon name="plus" tone="inherit" />}>Add rule</Button>)
    const button = screen.getByRole('button', { name: 'Add rule' })
    expect(button.querySelector('.vela-btn__icon > svg.vela-icon')).not.toBeNull()
  })

  // [[rule: icon-unknown-name-throws]]
  it('throws a named error for a name outside the set, for the caller the type cannot reach', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Icon name={'shield' as IconName} />)).toThrow(/<Icon name="shield">: not in Vela's curated set/)
    expect(() => render(<Icon name={'trash-2' as IconName} />)).toThrow(/not in Vela's curated set/)
    spy.mockRestore()
  })

  // [[rule: icon-set-is-generated]]
  it.each(ICON_NAMES)('renders %s as a 24-grid svg with drawn geometry', (name) => {
    const { container } = render(<Icon name={name} />)
    const svg = svgOf(container)
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
    expect(svg.querySelectorAll('path, circle, rect, line, polyline, polygon, ellipse').length).toBeGreaterThan(0)
  })
})
