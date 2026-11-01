import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect, vi } from 'vitest'
import { BrandMark, type BrandMarkProps } from './BrandMark'

const svgOf = (c: HTMLElement) => c.querySelector('svg')!
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8')
/** Every `d` attribute in a file, in order. */
const pathsIn = (svg: string) => [...svg.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].map((m) => m[1])

// The owners' own files, checked in beside their source notes (src/brand-marks/<name>/SOURCE.md).
const OWNER = {
  github: { file: 'src/brand-marks/github/mark-github-16.svg', viewBox: '0 0 16 16', fillRule: null },
  figma: { file: 'src/brand-marks/figma/figma-mono-line-black.svg', viewBox: '212 340 600 600', fillRule: 'evenodd' },
} as const

describe('BrandMark', () => {
  // [[rule: brand-mark-owner-drawing]]
  it.each([
    ['github', 'regular'],
    ['github', 'large'],
    ['figma', 'large'],
  ] as const)('draws %s at %s as its owner drew it, path for path', (name, size) => {
    const { container } = render(<BrandMark {...({ name, size, decorative: true } as BrandMarkProps)} />)
    const svg = svgOf(container)
    const owner = read(OWNER[name].file)
    const drawn = [...svg.querySelectorAll('path')].map((p) => p.getAttribute('d'))
    expect(pathsIn(owner).length).toBeGreaterThan(0)
    expect(drawn).toEqual(pathsIn(owner))
    // The owner's square viewBox (Figma's is the file's canvas cropped to the mark), one fill, no stroke.
    expect(svg).toHaveAttribute('viewBox', OWNER[name].viewBox)
    const [, , w, h] = OWNER[name].viewBox.split(' ').map(Number)
    expect(w).toBe(h)
    expect(svg).toHaveAttribute('fill', 'currentColor')
    for (const el of [svg, ...svg.querySelectorAll('*')]) {
      expect(el).not.toHaveAttribute('stroke')
      expect(el).not.toHaveAttribute('style')
      expect(el).not.toHaveAttribute('transform')
    }
    expect(svg.querySelector('path')!.getAttribute('fill-rule')).toBe(OWNER[name].fillRule)
    // The file's own fill-rule, where it has one: Figma's two top counters need evenodd to stay open.
    if (OWNER[name].fillRule) expect(owner).toContain(`fill-rule="${OWNER[name].fillRule}"`)
    // Width and height come from Icon's size tokens, never from the svg.
    for (const a of ['width', 'height']) expect(svg).not.toHaveAttribute(a)
    expect(svg).toHaveClass('vela-brand-mark', `vela-brand-mark--${size}`)
  })

  // [[rule: brand-mark-owner-drawing]]
  it("crops Figma's canvas to a square that holds the whole mark", () => {
    // The mark's bounds in the owner file, read from its path: x 304–720.156, y 340–940.
    const d = pathsIn(read(OWNER.figma.file))[0]
    const xs = [...d.matchAll(/(?:[MLC]|\s)(\d+(?:\.\d+)?) (\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]))
    expect(Math.min(...xs)).toBe(304)
    expect(Math.max(...xs)).toBeCloseTo(720.156, 3)
    expect(read(OWNER.figma.file)).toMatch(/viewBox="0 0 1024 1280"/)
    const [x, y, w] = OWNER.figma.viewBox.split(' ').map(Number)
    expect([x, y, x + w, y + w]).toEqual([212, 340, 812, 940])
  })

  it("binds Icon's two size tokens, sets its colour to --vela-brand-mark and fills with currentColor, in the stylesheet", () => {
    const css = read('src/components/BrandMark/BrandMark.css').replace(/\/\*[\s\S]*?\*\//g, '')
    const rule = (sel: string) => css.match(new RegExp(`${sel.replace(/\./g, '\\.')}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
    expect(rule('.vela-brand-mark--regular')).toMatch(/width:\s*var\(--vela-icon-size\);\s*height:\s*var\(--vela-icon-size\)/)
    expect(rule('.vela-brand-mark--large')).toMatch(/width:\s*var\(--vela-icon-size-large\);\s*height:\s*var\(--vela-icon-size-large\)/)
    expect(rule('.vela-brand-mark')).toMatch(/color:\s*var\(--vela-brand-mark\)/)
    expect(rule('.vela-brand-mark')).toMatch(/fill:\s*currentColor/)
    expect(rule('.vela-brand-mark')).toMatch(/stroke:\s*none/)
    expect(css).not.toMatch(/forced-color-adjust/)
  })

  it('is large by default', () => {
    const { container } = render(<BrandMark name="github" label="GitHub" />)
    expect(svgOf(container)).toHaveClass('vela-brand-mark--large')
  })

  // [[rule: brand-mark-named-once]]
  it('with a label, is an img named by it, and not hidden', () => {
    render(<BrandMark name="github" label="GitHub" />)
    const img = screen.getByRole('img', { name: 'GitHub' })
    expect(img.tagName.toLowerCase()).toBe('svg')
    expect(img).toHaveAttribute('aria-label', 'GitHub')
    expect(img).not.toHaveAttribute('aria-hidden')
    expect(img.querySelector('title')).toBeNull()
  })

  // [[rule: brand-mark-named-once]]
  it('decorative, is hidden and never focusable, with no role and no name', () => {
    const { container } = render(<a href="https://github.com/omkarpkh/vela" aria-label="Vela on GitHub"><BrandMark name="github" decorative /></a>)
    const svg = svgOf(container)
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('focusable', 'false')
    expect(svg).not.toHaveAttribute('role')
    expect(svg).not.toHaveAttribute('aria-label')
    expect(screen.queryByRole('img')).toBeNull()
    // The control carries the one name.
    expect(screen.getByRole('link', { name: 'Vela on GitHub' })).toBeInTheDocument()
  })

  // [[rule: brand-mark-named-once]]
  it('never carries a <title>, labelled or not, at any size', () => {
    const { container } = render(<>
      <BrandMark name="github" size="regular" label="GitHub" />
      <BrandMark name="github" decorative />
      <BrandMark name="figma" label="Figma" />
      <BrandMark name="figma" decorative />
    </>)
    const svgs = container.querySelectorAll('svg')
    expect(svgs).toHaveLength(4)
    for (const svg of svgs) {
      expect(svg.querySelector('title, desc')).toBeNull()
      expect(svg).toHaveAttribute('focusable', 'false')
      expect(svg.hasAttribute('aria-label') && svg.hasAttribute('aria-hidden')).toBe(false)
    }
  })

  it('throws a named error for what the types reject, for the caller the types cannot reach', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const bad = (p: object) => () => render(<BrandMark {...(p as BrandMarkProps)} />)
    expect(bad({ name: 'npm', decorative: true })).toThrow(/<BrandMark name="npm">: not a brand mark/)
    expect(bad({ name: 'toString', decorative: true })).toThrow(/not a brand mark/)
    expect(bad({ name: 'figma', size: 'regular', decorative: true })).toThrow(/large only/)
    expect(bad({ name: 'github', size: 'small', decorative: true })).toThrow(/use "regular" or "large"/)
    expect(bad({ name: 'github' })).toThrow(/exactly one of `label`/)
    expect(bad({ name: 'github', label: 'GitHub', decorative: true })).toThrow(/exactly one of `label`/)
    expect(bad({ name: 'github', label: ' ' })).toThrow(/exactly one of `label`/)
    spy.mockRestore()
  })
})
