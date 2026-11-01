import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { STILL, STILL_DIR, STILL_KEY, THEMES, components, stillKey, stillFiles } from '../../scripts/stills/still-key.mjs'
import { CATALOG } from '../../demo/playground/catalog'
import { STILL_SIZE } from '../../demo/shell/Still'

// Slice 7: every built component has a still (npm run stills), drawn from the component as it is
// now. A component with no still, or with a still drawn before its source, CSS or resting form last
// changed, fails here until the script is run again and the result committed. The same idea as the
// touch icon (brand.test.ts): the PNG names what it was drawn from by its SHA-256.
const root = resolve(process.cwd())
const dir = join(root, 'demo/public', STILL_DIR)
const files = readdirSync(dir).sort()

/** The PNG's tEXt chunks, as [key, value]. */
function texts(png: Buffer): string[][] {
  const out: string[][] = []
  for (let i = 8; i < png.length;) {
    const n = png.readUInt32BE(i)
    if (png.toString('latin1', i + 4, i + 8) === 'tEXt') out.push(png.toString('latin1', i + 8, i + 8 + n).split('\0'))
    i += 12 + n
  }
  return out
}

describe('the component stills', () => {
  it('cover every built component, in the catalogue the site reads', () => {
    expect(components(root).map((c) => c.id)).toEqual(CATALOG.map((c) => c.id))
  })

  it('are two files per component and theme, and nothing else', () => {
    const expected = components(root).flatMap((c) => THEMES.flatMap((t) => Object.values(stillFiles(c.id, t)))).sort()
    expect(files).toEqual(expected)
  })

  it.each(components(root).flatMap((c) => THEMES.map((t) => [c.id, t, c.src] as const)))('%s (%s) was drawn from the component as it is now', (id, theme, src) => {
    const png = readFileSync(join(dir, stillFiles(id, theme).png))
    // 1× PNG, the still's size (IHDR's width and height).
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([STILL.width, STILL.height])
    expect(texts(png), 'stale: run npm run stills and commit the result').toContainEqual([STILL_KEY, stillKey(root, src)])
  })

  it('are small: each AVIF under 6 kB, each PNG under 12 kB, all of them under 300 kB', () => {
    let total = 0
    for (const f of files) {
      const size = statSync(join(dir, f)).size
      total += size
      expect(size, f).toBeLessThanOrEqual(f.endsWith('.avif') ? 6_000 : 12_000)
    }
    expect(total).toBeLessThanOrEqual(300_000)
  })

  it('are shown at the size they are drawn at', () => {
    expect(STILL_SIZE).toEqual(STILL)
  })

  it('a changed source changes the key', () => {
    const a = stillKey(root, 'Button')
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(stillKey(root, 'Toggle')).not.toBe(a)
  })
})
