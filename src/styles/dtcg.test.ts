import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createTokenSet, loadTokenSet, hexOf, msOf, deprecationNote } from '../../scripts/tokens-core.mjs'
import { renderCss } from '../../scripts/build-tokens.mjs'
import { generateDart } from '../../scripts/build-tokens-dart.mjs'
import { generateMui } from '../../scripts/build-tokens-mui.mjs'

// The DTCG 2025.10 conformance gate, and the reader every generator shares. `npm run tokens:validate`
// is what CI runs; this makes it part of `npm test` as well, so a non-conformant edit fails locally
// before it reaches a workflow. The rest exercises the one thing no token in the source does yet:
// $deprecated — a deprecated token must still emit, with a note, in every target.
const root = resolve(process.cwd())

// Counts come from the source files, so adding a token does not mean editing a test; the
// shape rules below are what matter, and tokens.test.ts asserts every token's form.
const countTokens = (doc: Record<string, any>): number =>
  Object.entries(doc)
    .filter(([k]) => !k.startsWith('$'))
    .reduce((n, [, v]) => n + (v && typeof v === 'object' && '$value' in v ? 1 : countTokens(v)), 0)
const TOKEN_COUNT = countTokens(JSON.parse(readFileSync(resolve(root, 'tokens/vela.tokens.json'), 'utf8')))
const DARK_COUNT = countTokens(JSON.parse(readFileSync(resolve(root, 'tokens/vela.dark.tokens.json'), 'utf8')))

describe('DTCG 2025.10 conformance', () => {
  it('npm run tokens:validate passes: @terrazzo/parser reports 0 errors and 0 warnings, and Vela’s stricter rules hold', () => {
    const r = spawnSync('node', ['scripts/validate-tokens.mjs'], { cwd: root, encoding: 'utf8' })
    expect(r.status, r.stderr + r.stdout).toBe(0)
    expect(r.stdout).toContain('0 errors, 0 warnings')
    expect(r.stdout).toMatch(new RegExp(`${TOKEN_COUNT} tokens, ${DARK_COUNT} dark overrides`))
  })

  it('the shared reader loads the resolver, the base set and the dark overlay, and refuses legacy shapes', () => {
    // the reader is plain JS; `any` keeps TS from inferring `{}` for its token map
    const set: any = loadTokenSet(root)
    expect(set.contexts).toEqual(['light', 'dark'])
    expect(set.defaultContext).toBe('light')
    expect(set.order).toHaveLength(TOKEN_COUNT)
    expect(set.terminal('text-default', 'light')).toBe('grey-700')
    expect(set.terminal('text-default', 'dark')).toBe('grey-300')
    // a two-hop alias: btn-disabled-text → text-inactive → grey-400 in light; re-pointed directly in dark
    expect(set.terminal('btn-disabled-text', 'light')).toBe('grey-400')
    expect(set.terminal('btn-disabled-text', 'dark')).toBe('grey-700')
    expect(hexOf(set.resolved('bg-global', 'dark'))).toBe('#11171a')
    expect(msOf(set.all['duration-fast'].$value)).toBe(120)
    expect(() => hexOf('#191d1f' as never)).toThrow(/object/)
    expect(() => hexOf({ colorSpace: 'srgb', components: [1, 1, 1], hex: '#fffffe' })).toThrow(/does not match/)
    expect(() => msOf('120ms' as never)).toThrow(/value, unit/)
  })
})

describe('$deprecated travels to every target', () => {
  const base = JSON.parse(readFileSync(resolve(root, 'tokens/vela.tokens.json'), 'utf8'))
  const overlay = JSON.parse(readFileSync(resolve(root, 'tokens/vela.dark.tokens.json'), 'utf8'))
  // Deprecate one semantic colour with a reason, one primitive with a bare `true`, and a whole
  // group whose one token opts back out with `false` — the three forms the Format module allows.
  base.color['bg-raised'].$deprecated = 'use bg-container'
  base.primitives['grey-50'].$deprecated = true
  base.motion.$deprecated = true
  base.motion['ease-standard'].$deprecated = false
  const set: any = createTokenSet({ base, overlays: { dark: [overlay] } })

  it('is read from the token or inherited from its group, and `false` on the token overrides the group', () => {
    expect(set.all['bg-raised'].deprecated).toBe('use bg-container')
    expect(set.all['grey-50'].deprecated).toBe(true)
    expect(set.all['duration-fast'].deprecated).toBe(true)
    expect(set.all['ease-standard'].deprecated).toBe(false)
    expect(set.all['bg-global'].deprecated).toBe(false)
    expect(deprecationNote(set.all['bg-raised'])).toBe('deprecated: use bg-container')
    expect(deprecationNote(set.all['grey-50'])).toBe('deprecated')
    expect(deprecationNote(set.all['ease-standard'])).toBe('')
  })

  it('CSS: the custom property still emits, with a /* deprecated */ note, in both themes', () => {
    const light = renderCss(set, '  @bg-raised\n  @bg-global\n  @grey-50\n  @duration-fast /* kept */\n  @ease-standard\n', 'light')
    expect(light).toBe([
      '  --vela-bg-raised: var(--vela-white); /* deprecated: use bg-container */',
      '  --vela-bg-global: var(--vela-white);',
      '  --vela-grey-50: #f7f9f9; /* deprecated */',
      '  --vela-duration-fast: 120ms; /* deprecated */ /* kept */',
      '  --vela-ease-standard: cubic-bezier(0.2, 0, 0.2, 1);',
      '',
    ].join('\n'))
    expect(renderCss(set, '@bg-raised', 'dark')).toBe('--vela-bg-raised: var(--vela-grey-850); /* deprecated: use bg-container */')
  })

  it('Dart: the member still exists, with a doc comment, and the untouched file is otherwise unchanged', () => {
    const { dart } = generateDart(set, '0.0.0-test')
    expect(dart).toContain('  /// Deprecated: use bg-container\n  final Color bgRaised;')
    expect(dart).toContain('  /// Deprecated\n  static const Color grey50 = Color(0xFFF7F9F9);')
    expect(dart).toContain('  /// Deprecated\n  static const Duration durationFast = Duration(milliseconds: 120);')
    expect(dart).not.toMatch(/Deprecated\n  static const Cubic easeStandard/)
    const clean = generateDart(loadTokenSet(root), '0.0.0-test').dart
    expect(clean).not.toContain('Deprecated')
    expect(dart.split('\n').filter((l) => !l.includes('Deprecated'))).toEqual(clean.split('\n'))
  })

  it('MUI: the colour still resolves (the bridge has no comment channel), identically to the clean set', () => {
    const a = generateMui(set, '0.0.0-test') as any, b = generateMui(loadTokenSet(root), '0.0.0-test')
    expect(a.light.palette.background.paper).toBe('#ffffff')
    expect(a.dark.palette.background.paper).toBe('#262e31')
    expect(a).toEqual(b)
  })
})
