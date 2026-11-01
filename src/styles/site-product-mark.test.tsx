import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { markSeed, seedLabel } from '../../scripts/brand/mark-seed.mjs'
import { siteFacts } from '../../scripts/vite-site-facts.mjs'

// The site's stand-in for Product Mark (demo/shell/ProductMark.tsx), drawn from brand/, and the
// Overview's mood stills. The browser half (one pulse per visit, a press during play, reduced
// motion, 96px at 320, forced colours) is in tests/e2e/site.spec.ts.
const read = (f: string) => readFileSync(resolve(process.cwd(), f), 'utf8')
const pkg = JSON.parse(read('package.json'))

/** A fresh copy of the module, so its once-per-visit state starts again, as a full reload does. */
const fresh = async () => {
  vi.resetModules()
  return import('../../demo/shell/ProductMark')
}

/** `matchMedia` answering `reduce` for prefers-reduced-motion, as the reader's setting. */
const reduceMotion = (on: boolean) => {
  window.matchMedia = ((q: string) => ({
    matches: on && q.includes('prefers-reduced-motion: reduce'), media: q, onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

beforeEach(() => reduceMotion(false))
afterEach(() => cleanup())

describe('Product Mark: the masters, unmodified', () => {
  it('every size draws the path data of its brand/ file, in order', async () => {
    const { ProductMark, MASTER_FILES, parseSvg, pathData } = await fresh()
    const cases = [
      ['small', <ProductMark size="small" label="Vela Design System" />],
      ['regular', <ProductMark size="regular" decorative />],
      ['large', <ProductMark size="large" label="Vela Design System" />],
      ['hero-dark', <ProductMark size="hero" on="dark" label="Vela Design System" />],
      ['hero-light', <ProductMark size="hero" on="light" decorative />],
    ] as const
    for (const [key, el] of cases) {
      const file = read(MASTER_FILES[key])
      const expected = pathData(parseSvg(file))
      // And straight from the file's text, so a parser bug cannot hide in both halves.
      const raw = [...file.matchAll(/\sd="([^"]*)"/g)].map((m) => m[1])
      expect(expected, key).toEqual(raw)
      const { container, unmount } = render(el)
      const drawn = [...container.querySelectorAll('path')].map((p) => p.getAttribute('d'))
      expect(drawn, key).toEqual(raw)
      expect(container.querySelector('svg')!.getAttribute('viewBox'), key).toBe(parseSvg(file).attrs.viewBox)
      unmount()
    }
  })

  it('the hero wraps each ring in its own group, about its own centre, and the dot in a third', async () => {
    const { ProductMark } = await fresh()
    for (const on of ['dark', 'light'] as const) {
      const { container, unmount } = render(<ProductMark size="hero" on={on} decorative />)
      const inner = container.querySelector<SVGGElement>('.pm-ring--inner')!
      const outer = container.querySelector<SVGGElement>('.pm-ring--outer')!
      // The inner ring is its fill (and on dark its ramp) path; the outer is the file's 75% group.
      expect(inner.querySelectorAll(':scope > path'), on).toHaveLength(on === 'dark' ? 2 : 1)
      expect(outer.querySelector(':scope > g')!.getAttribute('opacity'), on).toBe('.75')
      expect(container.querySelector('.pm-dot > circle')!.getAttribute('r'), on).toBe('2.3')
      // brand/README.md, Geometry: ring 1 at (16, 16), ring 2 at (16.8, 16.8), on the 32 viewBox.
      expect(inner.style.transformOrigin, on).toBe('16px 16px')
      expect(outer.style.transformOrigin, on).toBe('16.8px 16.8px')
      unmount()
    }
  })

  it('gradient and filter ids are unique to each instance, and every reference finds its own', async () => {
    const { ProductMark } = await fresh()
    const { container } = render(<>
      <ProductMark size="hero" on="dark" label="Vela Design System" />
      <ProductMark size="hero" on="dark" decorative />
    </>)
    const ids = [...container.querySelectorAll('[id]')].map((e) => e.id)
    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
    for (const svg of container.querySelectorAll('svg')) {
      const own = new Set([...svg.querySelectorAll('[id]')].map((e) => e.id))
      const refs = [...svg.querySelectorAll('*')].flatMap((e) => [...e.attributes].flatMap((a) => [...a.value.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1])))
      expect(refs.length).toBeGreaterThan(0)
      for (const r of refs) expect(own.has(r), r).toBe(true)
    }
  })
})

describe('Product Mark: named once', () => {
  it('label is role="img" and its aria-label; decorative is aria-hidden; never a <title>', async () => {
    const { ProductMark } = await fresh()
    const { container } = render(<>
      <ProductMark size="large" label="Vela Design System" />
      <ProductMark size="regular" decorative />
    </>)
    const [named, decorative] = container.querySelectorAll('svg')
    expect(named).toHaveAttribute('role', 'img')
    expect(named).toHaveAttribute('aria-label', 'Vela Design System')
    expect(named).not.toHaveAttribute('aria-hidden')
    expect(decorative).toHaveAttribute('aria-hidden', 'true')
    expect(decorative).not.toHaveAttribute('role')
    expect(decorative).not.toHaveAttribute('aria-label')
    expect(container.querySelectorAll('title')).toHaveLength(0)
    expect(screen.getAllByRole('img')).toHaveLength(1)
  })

  it('replay is a button named by replay.label, and the mark inside is aria-hidden', async () => {
    const { ProductMark } = await fresh()
    const { container } = render(<ProductMark size="hero" on="light" decorative animate="once" replay={{ label: 'Play the pulse' }} />)
    const button = screen.getByRole('button', { name: 'Play the pulse' })
    expect(button.tagName).toBe('BUTTON')
    expect(button).toHaveAttribute('type', 'button')
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryAllByRole('img')).toHaveLength(0)
    expect(container.querySelectorAll('title, a')).toHaveLength(0)
  })
})

describe('Product Mark: the pulse plays once per visit, then only on a press', () => {
  const hero = (M: typeof import('../../demo/shell/ProductMark')) =>
    <M.ProductMark size="hero" on="dark" decorative animate="once" replay={{ label: 'Play the pulse' }} />
  const playing = () => screen.getByRole('button', { name: 'Play the pulse' }).getAttribute('data-playing')
  const end = () => fireEvent.animationEnd(document.querySelector('.pm-ring--outer')!)

  it('plays on the first render of a visit, not on a later one (a route change), and again after a reload', async () => {
    let M = await fresh()
    const first = render(hero(M))
    expect(playing()).toBe('pulse')
    end()
    expect(playing()).toBeNull()
    first.unmount()
    render(hero(M))
    expect(playing(), 'back on the Overview in the same visit').toBeNull()
    cleanup()
    M = await fresh()
    render(hero(M))
    expect(playing(), 'a full reload').toBe('pulse')
  })

  it('a press plays it once more; a press while it plays is ignored', async () => {
    const M = await fresh()
    render(hero(M))
    const button = screen.getByRole('button', { name: 'Play the pulse' })
    fireEvent.click(button)
    expect(playing()).toBe('pulse')
    // Only the outer ring, which starts and ends last, ends the pulse.
    fireEvent.animationEnd(document.querySelector('.pm-ring--inner')!)
    expect(playing()).toBe('pulse')
    end()
    expect(playing()).toBeNull()
    fireEvent.click(button)
    expect(playing()).toBe('pulse')
  })

  it('under reduced motion nothing plays on arrival, and a press is the fade', async () => {
    reduceMotion(true)
    const M = await fresh()
    render(hero(M))
    expect(playing()).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Play the pulse' }))
    expect(playing()).toBe('fade')
    end()
    expect(playing()).toBeNull()
  })

  it('never plays at large or below, or on a hero without animate', async () => {
    const { ProductMark } = await fresh()
    const { container } = render(<>
      <ProductMark size="large" label="Vela Design System" />
      <ProductMark size="hero" on="light" label="Vela Design System" />
    </>)
    expect(container.querySelectorAll('[data-playing]')).toHaveLength(0)
    expect(container.querySelectorAll('.pm-ring')).toHaveLength(2) // the hero's two rings, still
  })
  // The timing (the two pulse tokens, and duration-base for the fade) is read in a browser, in
  // tests/e2e/site.spec.ts: src/styles/brand.test.ts allows no file under src/ to name the tokens.
})

describe('Product Mark: the core marks in the page, and the header logo', () => {
  it('regular and large take the colour rule (primary-500 light, primary-300 dark), not the master\'s fixed colour', async () => {
    const { ProductMark, CORE_INK, MASTER_FILES } = await fresh()
    expect(CORE_INK).toEqual({ '--pm-ink-light': 'var(--vela-primary-500)', '--pm-ink-dark': 'var(--vela-primary-300)' })
    for (const size of ['regular', 'large'] as const) {
      // The master's own colour is the light half of the rule, so nothing is recoloured.
      expect(read(MASTER_FILES[size]), size).toContain('<svg style="color:#0a6c7d"')
      expect(read('src/styles/tokens.light.css'), size).toContain('--vela-primary-500: #0a6c7d;')
      const { container, unmount } = render(<ProductMark size={size} decorative />)
      const svg = container.querySelector('svg')!
      expect(svg, size).toHaveClass('pm--core')
      expect(svg.style.color, size).toBe('')
      expect(svg.style.getPropertyValue('--pm-ink-light'), size).toBe('var(--vela-primary-500)')
      expect(svg.style.getPropertyValue('--pm-ink-dark'), size).toBe('var(--vela-primary-300)')
      unmount()
    }
    // The favicon and the heroes set their own colours.
    const { container } = render(<>
      <ProductMark size="small" decorative />
      <ProductMark size="hero" on="light" decorative />
    </>)
    for (const svg of container.querySelectorAll('svg')) {
      expect(svg).not.toHaveClass('pm--core')
      expect(svg.style.getPropertyValue('--pm-ink-light')).toBe('')
    }
  })

  it('the stylesheet picks the pair with light-dark(), and binds no primitive itself', () => {
    const css = read('demo/shell/shell.css')
    expect(css).toContain('.pm--core { color: var(--pm-ink-light); color: light-dark(var(--pm-ink-light), var(--pm-ink-dark)); }')
    expect(css).not.toMatch(/var\(--vela-primary-\d+\)/)
  })

  it('the header draws the regular mark, decorative, inside its one link, and never a hero', () => {
    const app = read('demo/App.tsx')
    const header = app.slice(app.indexOf('<header'), app.indexOf('</header>'))
    expect(header.match(/<ProductMark [^>]*\/>/g)).toEqual(['<ProductMark size="regular" decorative />'])
    expect(header).not.toMatch(/animate=|replay=|size="hero"/)
  })
})

describe('the mood stills behind the hero', () => {
  const seed = seedLabel(markSeed(pkg.version))

  it("the seed comes from package.json's version, through the facts plugin", () => {
    expect(siteFacts().MOOD_SEED).toBe(seed)
  })

  it('every URL the hero asks for exists in demo/public/, and carries the seed', async () => {
    const { moodUrl, moodImage, moodStyle } = await import('../../demo/pages/overview-facts')
    const base = import.meta.env.BASE_URL
    const asked = (['light', 'dark'] as const).flatMap((theme) => {
      const style = moodStyle(theme)
      return [style['--ov-mood-wide'], style['--ov-mood-narrow']].flatMap((set) => [...set.matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1]))
    })
    expect(asked).toHaveLength(16)
    for (const url of asked) {
      expect(url.startsWith(base), url).toBe(true)
      expect(url, url).toContain(`-${seed}@`)
      expect(existsSync(resolve(process.cwd(), 'demo/public', url.slice(base.length))), url).toBe(true)
    }
    // AVIF first, then WebP, each at 1x and 2x.
    expect(moodImage('desktop', 'light')).toBe(`image-set(${[
      `url("${moodUrl('desktop', 'light', 1, 'avif')}") type("image/avif") 1x`,
      `url("${moodUrl('desktop', 'light', 2, 'avif')}") type("image/avif") 2x`,
      `url("${moodUrl('desktop', 'light', 1, 'webp')}") type("image/webp") 1x`,
      `url("${moodUrl('desktop', 'light', 2, 'webp')}") type("image/webp") 2x`,
    ].join(', ')})`)
    expect(moodUrl('phone', 'dark', 2, 'avif')).toBe(`${base}brand/mood-phone-dark-${seed}@2x.avif`)
  })

  it('the hero takes the desktop still above 520px, the phone still at 520px and below, and none in forced colours', () => {
    const css = read('demo/pages/overview.css')
    expect(css).toMatch(/\.ov-hero \{[^}]*background-image: var\(--ov-mood-wide, none\)/)
    expect(css).toMatch(/@container \(max-width: 520px\) \{[\s\S]*?\.ov-hero \{[^}]*background-image: var\(--ov-mood-narrow, none\)/)
    expect(css).toMatch(/@media \(forced-colors: active\) \{[\s\S]*?\.ov-hero \{ background-image: none; \}/)
  })

  it('the Overview sets the stills and the mark for the theme it is given', async () => {
    const { Overview } = await import('../../demo/pages/Overview')
    for (const theme of ['light', 'dark'] as const) {
      const { container, unmount } = render(<Overview theme={theme} />)
      const hero = container.querySelector<HTMLElement>('.ov-hero')!
      expect(hero.style.getPropertyValue('--ov-mood-wide')).toContain(`mood-desktop-${theme}-${seed}@1x.avif`)
      expect(hero.style.getPropertyValue('--ov-mood-narrow')).toContain(`mood-phone-${theme}-${seed}@2x.webp`)
      expect(hero.querySelector('.ov-hero__mark svg')).toHaveClass(`pm--on-${theme}`)
      // The mark comes before the panel, so it sits above it when the hero stacks.
      expect(hero.firstElementChild).toHaveClass('ov-hero__mark')
      unmount()
    }
  })
})
