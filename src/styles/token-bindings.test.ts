import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, relative, join } from 'node:path'

// Every semantic colour token has to be drawn by something: a component's CSS or TSX in src/, the
// site's CSS or TSX in demo/, or one of the two platform generators in scripts/ (the Material UI
// bridge and the Flutter theme), which name tokens by their bare name in quotes. A token nothing
// draws is a colour nobody has checked in place: it can pass every contrast pair and still be wrong
// where it lands. So a new colour token arrives with the thing that uses it, or it is reserved here.
//
// RESERVED holds the colour tokens kept for components that are coming, bound by nothing today.
// Reserving one is a decision, not a default: it is listed here with the reason, and when a
// component starts to bind it the test fails and names the file, so the token leaves the list and
// its owner is on record.
//
// Severity and Risk are grids (guidelines/foundations/color.md: every level defines a complete row,
// "no cell is missing"). A grid is bound as a set: if any token named `*-severity-*` is bound, every
// cell of the Severity grid passes, and the same for `*-risk-*` and Risk. Without this, a row the
// taxonomy requires (the indicator borders, the risk icon colours) would have to be deleted or
// reserved just because no component draws that cell yet, and the grid would stop being complete.
// Status is one row of five dots, all bound by the Status Indicator, so it needs no such rule.
const RESERVED: Record<string, string> = {
  'bg-inactive': 'kept for components that are coming (decided 10 Nov 2026)',
  'icon-on-brand': 'kept for components that are coming (decided 10 Nov 2026)',
  'icon-selected': 'kept for components that are coming (decided 10 Nov 2026)',
  'primary-active-bg': 'kept for components that are coming (decided 10 Nov 2026)',
  'text-on-brand': 'freed when the Flutter theme\'s onError moved to the page colour in 0.16.1; kept for components that are coming (10 Nov 2026)',
}
const GRIDS = [
  { name: 'Severity', member: /^[a-z]+-severity-/ },
  { name: 'Risk', member: /^[a-z]+-risk-/ },
]

const root = resolve(process.cwd())
const doc = JSON.parse(readFileSync(resolve(root, 'tokens/vela.tokens.json'), 'utf8'))
const colour = doc.color as Record<string, any>
const names = Object.keys(colour).filter((n) => !n.startsWith('$') && colour[n].$type === 'color')

const walk = (dir: string, out: string[] = []): string[] => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}
// The token stylesheets declare every token (tokens.light.css, tokens.dark.body.css and build-css's
// untracked tokens.dev.css), and tests name tokens to check them: none of them draws one.
const consumers = [...walk(resolve(root, 'src')), ...walk(resolve(root, 'demo'))]
  .filter((f) => /\.(css|tsx?)$/.test(f) && !/\.test\.tsx?$/.test(f) && !/[\\/]styles[\\/]tokens\.[\w.]+\.css$/.test(f))
  .map((f) => ({ file: relative(root, f), text: readFileSync(f, 'utf8') }))
const generators = ['scripts/build-tokens-mui.mjs', 'scripts/build-tokens-dart.mjs']
  .map((f) => ({ file: f, text: readFileSync(resolve(root, f), 'utf8') }))

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** The files that draw a token directly: `--vela-<name>` not followed by more of a name, or `'<name>'` in a generator. */
const directly = (name: string): string[] => {
  const asVar = new RegExp(`--vela-${esc(name)}(?![a-z0-9-])`)
  const asName = new RegExp(`'${esc(name)}'`)
  return [...consumers.filter((c) => asVar.test(c.text)), ...generators.filter((g) => asName.test(g.text))].map((c) => c.file)
}

// A semantic that aliases another semantic (focus-ring-color → border-active) draws its target
// wherever it is drawn, so the target counts as bound through it.
const where = new Map(names.map((n) => [n, directly(n)]))
for (let changed = true; changed; ) {
  changed = false
  for (const n of names) {
    const v = colour[n].$value
    const target = typeof v === 'string' && v.startsWith('{color.') ? v.slice(7, -1) : null
    if (target && where.get(n)!.length && !where.get(target)!.length) {
      where.set(target, [`through ${n}`])
      changed = true
    }
  }
}
const bound = (n: string) => where.get(n)!.length > 0
const gridOf = (n: string) => GRIDS.find((g) => g.member.test(n))
const gridBound = (g: (typeof GRIDS)[number]) => names.some((n) => g.member.test(n) && bound(n))

describe('colour token bindings', () => {
  it('every semantic colour token is drawn somewhere, reserved, or a cell of a bound Severity or Risk grid', () => {
    const unbound = names.filter((n) => !bound(n) && !(n in RESERVED) && !(gridOf(n) && gridBound(gridOf(n)!)))
    expect(
      unbound,
      unbound.map((n) => `--vela-${n} is bound by nothing (no component, site page, bridge or Flutter theme). Bind it where it is used, or add it to RESERVED in src/styles/token-bindings.test.ts with the reason.`).join('\n'),
    ).toEqual([])
  })

  it('a reserved token is bound by nothing; once a component binds it, it leaves RESERVED', () => {
    const nowBound = Object.keys(RESERVED).filter(bound)
    expect(
      nowBound,
      nowBound.map((n) => `--vela-${n} is reserved but now bound by ${where.get(n)!.join(', ')}. Remove it from RESERVED; that file owns it now.`).join('\n'),
    ).toEqual([])
  })

  it('every reserved token is a semantic colour token that exists', () => {
    expect(Object.keys(RESERVED).filter((n) => !names.includes(n))).toEqual([])
  })

  it('the Severity and Risk grids are each bound through at least one cell', () => {
    for (const g of GRIDS) expect(gridBound(g), `${g.name}: no ${g.member} token is bound by anything`).toBe(true)
  })
})
