import { describe, it, expect } from 'vitest'
import { readLink, writeLink, queryOf } from '../../demo/playground/link'
import type { Control } from '../../demo/playground/spec'

// Shared links (playground spec, section 11): closed sets only, illegal values replaced with a
// notice, free text never read, and the format versioned.
const controls: Control[] = [
  { prop: 'variant', kind: 'select', options: ['primary', 'standard', 'destructive'], default: 'standard', type: '', notes: '' },
  { prop: 'size', kind: 'select', options: ['tiny', 'regular', 'large', 'huge'], default: 'regular', type: '', notes: '' },
  { prop: 'loading', kind: 'boolean', default: false, type: '', notes: '' },
  { prop: 'children', kind: 'text', default: 'Save Changes', type: '', notes: '' },
]
const defaults = { variant: 'primary', size: 'regular', loading: false, children: 'Save Changes' }

describe('reading a link', () => {
  it('reads closed sets, the stage and Compare', () => {
    const r = readLink('v=1&variant=destructive&loading=true&stage=full&compare=themes', 'Button', controls, defaults)
    expect(r).toEqual({ values: { variant: 'destructive', loading: true }, stage: 'full', compare: 'themes', notices: [] })
  })

  it('never reads free text: a link cannot put a stranger\'s words on the page', () => {
    const r = readLink('v=1&children=Your%20account%20is%20suspended&variant=standard', 'Button', controls, defaults)
    expect(r.values).toEqual({ variant: 'standard' })
    expect(r.notices).toEqual([])
  })

  it('replaces an illegal value with the default, and says so', () => {
    const r = readLink('v=1&size=xl&loading=maybe', 'Button', controls, defaults)
    expect(r.values).toEqual({})
    expect(r.notices).toEqual([
      "This link asked for size `xl`, which Button doesn't have. Showing `regular`.",
      "This link asked for loading `maybe`, which isn't on or off. Showing off.",
    ])
  })

  it('ignores anything it does not know', () => {
    expect(readLink('v=1&onclick=alert(1)&theme=neon', 'Button', controls, defaults)).toEqual({ values: {}, notices: [] })
  })

  it('reads only version 1, and says why it read nothing otherwise', () => {
    expect(readLink('v=2&variant=destructive', 'Button', controls, defaults).values).toEqual({})
    expect(readLink('v=2&variant=destructive', 'Button', controls, defaults).notices[0]).toMatch(/version 2/)
    expect(readLink('variant=destructive', 'Button', controls, defaults).notices[0]).toMatch(/doesn't say which version/)
    expect(readLink('', 'Button', controls, defaults)).toEqual({ values: {}, notices: [] })
  })

  it('reads the implementation only when the page offers a choice', () => {
    expect(readLink('v=1&implementation=headless', 'Tabs', controls, defaults, ['core', 'headless']).values).toEqual({ implementation: 'headless' })
    expect(readLink('v=1&implementation=vue', 'Tabs', controls, defaults, ['core', 'headless']).notices[0]).toMatch(/vue implementation/)
  })

  it('reads the container width as a number of pixels, and nothing else (slice 2b)', () => {
    expect(readLink('v=1&w=480', 'Tabs', controls, defaults).width).toBe(480)
    const r = readLink('v=1&w=480px', 'Tabs', controls, defaults)
    expect(r.width).toBeUndefined()
    expect(r.notices).toEqual(["This link asked for a container width of `480px`, which isn't a number of pixels. Showing the full width."])
    expect(readLink('v=1&w=-20', 'Tabs', controls, defaults).width).toBeUndefined()
  })

  it('finds the query after the address', () => {
    expect(queryOf('#/components/button?v=1&size=tiny')).toBe('v=1&size=tiny')
    expect(queryOf('#/components/button')).toBe('')
  })
})

describe('writing a link', () => {
  const base = { stage: 'beside' as const, defaultStage: 'beside' as const, compare: 'off' as const }
  it('writes nothing at the defaults, so the address stays clean', () => {
    expect(writeLink(controls, defaults, defaults, base)).toBe('')
  })
  it('writes only what differs, closed sets only, versioned', () => {
    const q = writeLink(controls, { ...defaults, variant: 'destructive', children: 'Delete everything' }, defaults, { ...base, stage: 'full', compare: 'themes' })
    expect(q).toBe('v=1&variant=destructive&stage=full&compare=themes')
  })
  it('writes the container width only when the frame is narrowed', () => {
    expect(writeLink(controls, defaults, defaults, { ...base, width: 480 })).toBe('v=1&w=480')
    expect(writeLink(controls, defaults, defaults, { ...base, width: undefined })).toBe('')
  })
  it('round-trips', () => {
    const values = { ...defaults, size: 'tiny', loading: true }
    const q = writeLink(controls, values, defaults, base)
    expect({ ...defaults, ...readLink(q, 'Button', controls, defaults).values }).toEqual(values)
  })
})
