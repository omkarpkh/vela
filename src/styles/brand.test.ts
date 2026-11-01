import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { markSeed, applySeed, seedLabel } from '../../scripts/brand/mark-seed.mjs'
import { loadThemes, resolve as tokenValue } from '../../scripts/contrast-core.mjs'

const root = resolve(process.cwd())

// The release seed (scripts/brand/mark-seed.mjs): n = major × 100 + minor; lobes = n mod 24, or 24
// when that is 0, never under 3; step = lobes / 100. A patch release keeps its minor's seed.
describe('markSeed', () => {
  it.each([
    ['0.15.0', 15, 0.15],
    ['0.15.3', 15, 0.15],
    ['1.0.0', 4, 0.04],
    ['1.2.0', 6, 0.06],
    ['0.1.0', 3, 0.03],
    ['0.24.0', 24, 0.24],
  ])('%s gives %i lobes and a step of %s', (version, lobes, step) => {
    expect(markSeed(version)).toEqual({ lobes, step })
  })

  it('names the seed by its step, with two decimals', () => {
    expect(seedLabel(markSeed('0.15.0'))).toBe('0.15')
    expect(seedLabel(markSeed('1.0.0'))).toBe('0.04')
  })

  it('refuses a string that is not a version', () => {
    expect(() => markSeed('next')).toThrow()
  })
})

// The stored shader hard-codes the 0.15.0 seed (`15.*th`, `fi*.15`) and is never edited: its hash
// identifies it. applySeed swaps the values in at load time.
describe('applySeed', () => {
  const sample = 'float r = cos(15.*th);\nfloat t = fi*.15;\n'

  it('leaves the source unchanged for the 0.15.0 seed', () => {
    expect(applySeed(sample, markSeed('0.15.0'))).toBe(sample)
  })

  it('writes another seed in the same number style', () => {
    expect(applySeed(sample, markSeed('1.0.0'))).toBe('float r = cos(4.*th);\nfloat t = fi*.04;\n')
    expect(applySeed(sample, markSeed('0.24.0'))).toBe('float r = cos(24.*th);\nfloat t = fi*.24;\n')
  })

  // The real shader: its hash identifies it, so seeding it with the version it was drawn for must
  // give back every byte, and another seed must change only the two literals.
  const shader = readFileSync(join(root, 'brand/mood-o.frag.glsl'), 'utf8')

  it('is the stored shader, unedited', () => {
    expect(createHash('sha256').update(readFileSync(join(root, 'brand/mood-o.frag.glsl'))).digest('hex')).toMatch(/^c71fad628d8cbeae/)
  })

  it('leaves the real shader byte-identical for the 0.15.0 seed', () => {
    expect(applySeed(shader, markSeed('0.15.0'))).toBe(shader)
  })

  it('changes only the lobes and the twist in the real shader for another seed', () => {
    const seeded = applySeed(shader, markSeed('1.2.0'))
    const changed = shader.split('\n').filter((line, i) => line !== seeded.split('\n')[i])
    expect(changed).toEqual([expect.stringContaining('15.*th + fi*.15*6.2832')])
    expect(seeded).toContain('6.*th + fi*.06*6.2832')
  })

  it('throws when a seeded literal is missing or appears twice', () => {
    expect(() => applySeed('float t = fi*.15;', markSeed('1.0.0'))).toThrow(/15/)
    expect(() => applySeed(sample + sample, markSeed('1.0.0'))).toThrow(/found 2/)
  })
})

// The two pulse tokens are for the hero logo on the site only (guidelines/foundations/motion.md).
// The token stylesheet declares them; no component or style under src/ may bind them.
describe('the brand pulse tokens', () => {
  const names = ['duration-brand-pulse', 'delay-brand-pulse-outer'].map((n) => `--vela-${n}`)
  const walk = (dir: string): string[] =>
    readdirSync(join(root, dir)).flatMap((f) => {
      const p = `${dir}/${f}`
      return statSync(join(root, p)).isDirectory() ? walk(p) : [p]
    })
  const declaredIn = 'src/styles/tokens.light.css'
  // The token stylesheets declare every token; tokens.dev.css is build-css's untracked copy of them.
  const tokenSheets = new Set([declaredIn, 'src/styles/tokens.dev.css'])
  const self = 'src/styles/brand.test.ts'

  it('are declared in the token stylesheet', () => {
    const css = readFileSync(join(root, declaredIn), 'utf8')
    expect(css).toMatch(/--vela-duration-brand-pulse: 900ms;/)
    expect(css).toMatch(/--vela-delay-brand-pulse-outer: 120ms;/)
  })

  it('are bound by no file under src/', () => {
    const binders = walk('src')
      .filter((f) => !tokenSheets.has(f) && f !== self)
      .filter((f) => names.some((n) => readFileSync(join(root, f), 'utf8').includes(n)))
    expect(binders).toEqual([])
  })
})

// The site's favicon is a copy of the brand file, never a redraw.
describe('the favicon', () => {
  it('is byte-identical to brand/vela-favicon-16.svg', () => {
    expect(readFileSync(join(root, 'demo/public/favicon.svg')).equals(readFileSync(join(root, 'brand/vela-favicon-16.svg')))).toBe(true)
  })

  it('is linked from the site, through the base path', () => {
    expect(readFileSync(join(root, 'demo/index.html'), 'utf8')).toContain('<link rel="icon" type="image/svg+xml" href="%BASE_URL%favicon.svg" />')
  })

  it('is the core-16 mark in the squircle tile, the README\'s path', () => {
    expect(readFileSync(join(root, 'brand/vela-favicon-16.svg'), 'utf8')).toContain('<path d="M16 0C28.6 0 32 3.4 32 16S28.6 32 16 32 0 28.6 0 16 3.4 0 16 0Z" fill="#0a6c7d"/>')
  })
})

// The home-screen tile (npm run brand:touch-icon): brand/vela-app-icon.svg rendered at 180px, never
// redrawn. The PNG names the SVG it came from by its SHA-256, so a changed app icon fails here until
// the script is run again.
describe('the apple-touch-icon', () => {
  const png = readFileSync(join(root, 'demo/public/apple-touch-icon.png'))
  /** Every chunk of the PNG, by type, with its data. */
  const chunks = () => {
    const out: { type: string; data: Buffer }[] = []
    for (let i = 8; i < png.length;) {
      const n = png.readUInt32BE(i)
      out.push({ type: png.toString('latin1', i + 4, i + 8), data: png.subarray(i + 8, i + 8 + n) })
      i += 12 + n
    }
    return out
  }

  it('is a 180 × 180 PNG with an alpha channel', () => {
    expect(png.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true)
    const ihdr = chunks()[0]
    expect(ihdr.type).toBe('IHDR')
    expect([ihdr.data.readUInt32BE(0), ihdr.data.readUInt32BE(4), ihdr.data[9]]).toEqual([180, 180, 6])
  })

  it('was rendered from the app icon as it is now', () => {
    const text = chunks().filter((c) => c.type === 'tEXt').map((c) => c.data.toString('latin1').split('\0'))
    const sha = createHash('sha256').update(readFileSync(join(root, 'brand/vela-app-icon.svg'))).digest('hex')
    expect(text).toContainEqual(['vela-source-sha256', sha])
  })

  it('is small, and linked from the site through the base path', () => {
    expect(png.length).toBeLessThan(20 * 1024)
    expect(readFileSync(join(root, 'demo/index.html'), 'utf8')).toContain('<link rel="apple-touch-icon" href="%BASE_URL%apple-touch-icon.png" />')
  })
})

// The browser's bar matches the header, which is --vela-bg-global, in each theme.
describe('theme-color', () => {
  it('is bg-global in light and in dark', () => {
    const { light, dark } = loadThemes()
    const html = readFileSync(join(root, 'demo/index.html'), 'utf8')
    expect(html).toContain(`<meta name="theme-color" media="(prefers-color-scheme: light)" content="${tokenValue(light, '--vela-bg-global')}" />`)
    expect(html).toContain(`<meta name="theme-color" media="(prefers-color-scheme: dark)" content="${tokenValue(dark, '--vela-bg-global')}" />`)
  })
})

// The mood stills carry their seed in their names (npm run brand:stills). After a minor or major
// version change they are stale until the script is run again (RELEASING.md), and this fails.
// AVIF first and WebP as the fallback, each at 1× and 2×; the PNG master is never committed.
describe('the mood stills', () => {
  const dir = join(root, 'demo/public/brand')
  const files = readdirSync(dir).sort()

  it("are the sixteen for this version's seed, and nothing else", () => {
    const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    const seed = seedLabel(markSeed(version))
    const expected = ['desktop', 'phone'].flatMap((v) => ['light', 'dark'].flatMap((t) =>
      [1, 2].flatMap((x) => ['avif', 'webp'].map((f) => `mood-${v}-${t}-${seed}@${x}x.${f}`))))
    expect(files).toEqual(expected.sort())
  })

  // The budget agreed by the playground and Figma threads: 250 kB (250,000 bytes) per image.
  it.each(files)('%s is within the 250 kB budget', (file) => {
    expect(statSync(join(dir, file)).size).toBeLessThanOrEqual(250_000)
  })
})
