import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { markSeed, applySeed, seedLabel } from '../../scripts/brand/mark-seed.mjs'

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
})

// The mood stills carry their seed in their names (npm run brand:stills). After a minor or major
// version change they are stale until the script is run again (RELEASING.md), and this fails.
describe('the mood stills', () => {
  it("are the four for this version's seed, and only those", () => {
    const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    const seed = seedLabel(markSeed(version))
    const stills = readdirSync(join(root, 'demo/public/brand')).filter((f) => f.startsWith('mood-')).sort()
    expect(stills).toEqual(['desktop-dark', 'desktop-light', 'phone-dark', 'phone-light'].map((s) => `mood-${s}-${seed}@2x.webp`))
  })
})
