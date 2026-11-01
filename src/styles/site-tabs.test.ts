import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import figmaMap from '../../guidelines/figma-map.json'
import { rulesFromSpec, undash, leadOf, ruleMatches, dontsOf, summaryWords, oneLine } from '../../demo/playground/rules-read'
import { inState } from '../../demo/playground/tokens'

// Slice 2 of the playground uplift (s5-tabs): what the Rules, Tokens and Figma tabs read from a spec.
// The page draws the Rules tab from the spec at once; these prove it reads the same rules the gate does.

const root = resolve(__dirname, '../..')
const specs = readdirSync(resolve(root, 'guidelines/components')).filter((f) => f.endsWith('.md'))
const read = (f: string) => readFileSync(resolve(root, 'guidelines/components', f), 'utf8')

describe('the Rules tab reads the spec', () => {
  it('finds every tagged rule, in order, as scripts/check-rules.mjs counts them', () => {
    for (const f of specs) {
      const md = read(f)
      const tags = [...md.matchAll(/\[\[rule:\s*([a-z0-9-]+)\s*\|\s*(compiler|runtime|browser|convention)\s*\]\]/g)].map((m) => m[1])
      expect(rulesFromSpec(md).map((r) => r.id), f).toEqual(tags)
    }
  })

  it('leads each row with the bold sentence the spec starts with, and keeps the rest for the opened row', () => {
    expect(leadOf('**Icons sit left only.**')).toEqual({ lead: 'Icons sit left only', rest: '' })
    expect(leadOf('**Width hugs content.** Never fix a button width.')).toEqual({ lead: 'Width hugs content', rest: 'Never fix a button width.' })
    // A bold lead that runs on is the whole sentence.
    expect(leadOf('**`text-link` is `tiny` or `regular` only**, and **never carries an icon**.').rest).toBe('')
    expect(leadOf('A plain rule. And more words.')).toEqual({ lead: 'A plain rule', rest: 'And more words.' })
  })

  it('finds a rule by its words and by its id, any case', () => {
    const r = { id: 'button-icons-left-only', sentence: '**Icons sit left only.**' }
    expect(ruleMatches(r, 'ICONS left')).toBe(true)
    expect(ruleMatches(r, 'button-icons')).toBe(true)
    expect(ruleMatches(r, 'pill')).toBe(false)
  })

  it('says filled and outlined in words, with the counts', () => {
    const rules = rulesFromSpec(read('button.md'))
    expect(summaryWords(rules).words).toBe('Filled: a machine checks it on every build, 5. Outlined: a reviewer checks it, 5.')
  })

  it("reads a spec's ❌ … → … anti-patterns as a don't and an instead", () => {
    const rows = dontsOf(readFileSync(resolve(root, 'guidelines/components/button.md'), 'utf8').split(/^## Anti-patterns\s*$/m)[1])!
    expect(rows[1]).toEqual({ dont: 'Pill-shaped buttons', instead: '`--vela-radius-4`.' })
    expect(rows[0].instead).toBe('')
    expect(dontsOf('- A bullet with no cross')).toBeNull()
  })
})

describe('undash: the display layer for spec text, never the spec', () => {
  it('turns a spaced dash into a full stop before a capital, a colon otherwise', () => {
    expect(undash('inward under the pointer — 4.8px a side')).toBe('inward under the pointer: 4.8px a side')
    expect(undash('a 320px button — A counter-scaled guard')).toBe('a 320px button. A counter-scaled guard')
    expect(undash('**Bold** — then words')).toBe('**Bold**: then words')
  })
  it('makes a range "to", a lone table dash "none", and leaves code alone', () => {
    expect(undash('2–4 rows')).toBe('2 to 4 rows')
    expect(undash('| a | — |')).toBe('| a | none |')
    expect(undash('`a — b` and c — d')).toBe('`a — b` and c: d')
  })
  it('leaves no em or en dash outside code in any spec', () => {
    for (const f of specs) {
      const out = undash(read(f)).split(/(`[^`]*`|```[\s\S]*?```)/g).filter((p) => !p.startsWith('`')).join('')
      expect(out, f).not.toMatch(/[—–]/)
    }
  })
  it("gives the header one line: the intro's first sentence", () => {
    expect(oneLine('Triggers an action: save, submit, delete, apply, cancel. Carries a text label.')).toBe('Triggers an action: save, submit, delete, apply, cancel.')
    expect(oneLine('A short confirmation. "Policy saved": raised by the app.')).toBe('A short confirmation.')
  })
})

describe('the Tokens tab', () => {
  it("finds a part's token in a state by the naming rule", () => {
    expect(inState('--vela-btn-primary-bg', 'hover')).toBe('--vela-btn-primary-hover-bg')
    expect(inState('--vela-btn-primary-text', 'hover')).toBeNull()
    expect(inState('--vela-btn-primary-bg', 'rest')).toBeNull()
  })
})

describe('the Figma tab', () => {
  it('says "Its builder is written" only where a builder is, for every set with no node yet', () => {
    const none = (figmaMap.sets as { spec: string; state: string }[]).filter((s) => s.state === 'none')
    expect(none.length).toBeGreaterThan(0)
    for (const s of none) {
      const name = s.spec.replace(/^guidelines\/components\//, '').replace(/\.md$/, '')
      expect(existsSync(resolve(root, `scripts/figma/components/${name}.figma.js`)), name).toBe(true)
    }
  })
})
