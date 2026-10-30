import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
// Shared with `npm run css:check` so the gate and the report cannot disagree.
import { checkCss, lintCss } from '../../scripts/check-css.mjs'

// The first two non-negotiables — semantic tokens only, units carried by the token — were
// review conventions in the component stylesheets. This makes them a failing test: a raw
// colour or a bare length in src/components/**/*.css or src/headless/**/*.css fails `npm test` unless the line carries
// a `/* vela-allow: <reason> */` waiver, and every waiver is printed, never silent.
describe('component CSS binds tokens', () => {
  const report = checkCss()

  it('lints every component stylesheet', () => {
    expect(report.map((r) => r.file).sort()).toEqual([
      ...['Button', 'ContextualAlert', 'Icon', 'Input', 'RiskPill', 'StatusIndicator', 'Table', 'Tabs', 'TextArea', 'Toggle'].map((c) => `src/components/${c}/${c}.css`),
      // The headless-born components keep their stylesheets beside their implementation.
      ...['Checkbox', 'Dialog', 'Popover', 'RadioGroup', 'Toast', 'Tooltip'].map((c) => `src/headless/${c}/${c}.css`),
    ])
  })

  it.each(report.map((r) => r.file))('%s has no raw colour, primitive or bare length without a waiver', (file) => {
    const r = report.find((x) => x.file === file)!
    expect(r.problems.map((p) => `${p.rule} line ${p.line}: ${p.prop}: ${p.value} — ${p.what}`)).toEqual([])
  })

  it('every waiver says why', () => {
    for (const r of report) for (const w of r.waivers) expect(w.reason, `${r.file} line ${w.line}`).not.toBe('')
  })

  it('the dev entry imports every component stylesheet the bundle does, in the same order', () => {
    // scripts/build-css.mjs assembles dist/vela.css; src/styles/index.css is the dev and demo entry.
    // Both list the stylesheets by hand, and the Icon page's e2e found the dev entry one short.
    const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8')
    const bundle = [...read('scripts/build-css.mjs').matchAll(/'src\/((?:components|headless)\/\w+\/\w+\.css)'/g)].map((m) => m[1])
    const dev = [...read('src/styles/index.css').matchAll(/@import '\.\.\/((?:components|headless)\/\w+\/\w+\.css)'/g)].map((m) => m[1])
    expect(dev).toEqual(bundle)
    expect(bundle).toEqual(report.map((r) => r.file.replace(/^src\//, '')).sort((a, b) => bundle.indexOf(a) - bundle.indexOf(b)))
  })

  it('no stylesheet carries a waiver — the literal geometry recorded in Phase 0 is tokenised', () => {
    // A new waiver is a new token request: add the token, bind it, and this stays empty.
    const waiving = report.filter((r) => r.waivers.length).map((r) => r.file.split('/')[2]).sort()
    expect(waiving).toEqual([])
  })
})

// The checker itself: what it must catch and what it must leave alone, so a green run above
// means "clean" and not "blind".
describe('the CSS checker', () => {
  const rules = (css: string) => lintCss(css).findings.filter((f) => !f.waived).map((f) => `${f.rule}:${f.prop}`)

  it('catches hex, colour functions, named colours and primitives in values only', () => {
    expect(rules('.a { color: #49555a; }')).toEqual(['raw-colour:color'])
    expect(rules('.a { color: #fff; background: #ffffff80; }')).toEqual(['raw-colour:color', 'raw-colour:background'])
    expect(rules('.a { background: rgb(0 0 0 / 0.06); }')).toEqual(['raw-colour:background'])
    expect(rules('.a { border-color: hsla(0, 0%, 0%, .5); outline-color: oklch(60% 0.1 20); }')).toEqual(['raw-colour:border-color', 'raw-colour:outline-color'])
    expect(rules('.a { color: white; background: Red; }')).toEqual(['raw-colour:color', 'raw-colour:background'])
    expect(rules('.a { color: var(--vela-grey-700); background: var(--vela-white); }')).toEqual(['primitive:color', 'primitive:background'])
    expect(rules('.a { color: var(--x, #fff); }')).toEqual(['raw-colour:color'])
    // Selectors and custom-property names are not values: a class called --warning or a token
    // called --vela-black is not a colour.
    expect(rules('.vela-alert--warning .red { color: var(--vela-text-default); }')).toEqual([])
    expect(rules('.a { color: var(--vela-black-ish-semantic); }')).toEqual([])
  })

  it('leaves transparent, currentColor, inherit and none alone', () => {
    expect(rules('.a { background: transparent; border: 1px solid currentColor; color: inherit; outline: none; }')).toEqual([])
  })

  it('catches bare lengths and leaves 0, hairlines, percentages and unitless numbers alone', () => {
    expect(rules('.a { width: 34px; margin-left: 2px; padding: 0.5rem; font-size: 1.2em; }')).toEqual(['raw-length:width', 'raw-length:margin-left', 'raw-length:padding', 'raw-length:font-size'])
    expect(rules('.a { transform: translateX(14px); }')).toEqual(['raw-length:transform'])
    expect(rules('.a { padding: 0; margin: 0px; width: 100%; line-height: 1.5; opacity: .5; transform: scale(0.97) translate(-50%, 0); transition: opacity 700ms; rotate: 90deg; }')).toEqual([])
    expect(rules('.a { border: 1px solid; inset: -1px; margin-bottom: -1px; outline-offset: 1px; border-bottom: 1px solid var(--vela-border-subtle); }')).toEqual([])
    // A hairline drawn as an inset shadow; a shadow's blur or a larger offset is still a raw length.
    expect(rules('.a { box-shadow: inset 0 -1px 0 var(--vela-border-subtle); }')).toEqual([])
    expect(rules('.a { box-shadow: 0 4px 8px var(--vela-border-subtle); }')).toEqual(['raw-length:box-shadow', 'raw-length:box-shadow'])
    // 1px is a hairline, not a general-purpose unit.
    expect(rules('.a { padding: 1px; gap: 1px; }')).toEqual(['raw-length:padding', 'raw-length:gap'])
  })

  it('ignores comments, including sizes mentioned in prose, and reads multi-line declarations', () => {
    expect(rules('/* 4.8px a side at 320px */ .a { color: var(--vela-text-default); /* was #fff */ }')).toEqual([])
    expect(rules('.a {\n  transition: color var(--vela-duration-base),\n              transform 2px;\n}')).toEqual(['raw-length:transition'])
  })

  // foundations/motion.md, rule 1: only transform, opacity and filter move. A colour may settle
  // (Button's hover), layout never animates, and a bare duration is `all`.
  it('lets transform, opacity, filter and colours transition, and rejects layout, `all` and a bare duration', () => {
    expect(rules('.a { transition: transform var(--vela-duration-travel) var(--vela-ease-spring), opacity 1ms; }')).toEqual([])
    expect(rules('.a { transition: color var(--vela-duration-fast) var(--vela-ease-standard),\n  border-color var(--vela-duration-fast), background-color 1ms, filter 1ms; }')).toEqual([])
    expect(rules('.a { transition: none; transition-property: transform, opacity; transition-duration: 1ms; }')).toEqual([])
    expect(rules('.a { transition: left var(--vela-duration-base); }')).toEqual(['motion-property:transition'])
    expect(rules('.a { transition: transform 1ms, width 1ms; }')).toEqual(['motion-property:transition'])
    expect(rules('.a { transition-property: height; }')).toEqual(['motion-property:transition-property'])
    expect(rules('.a { transition: all var(--vela-duration-base); }')).toEqual(['motion-property:transition'])
    expect(rules('.a { transition: var(--vela-duration-base) var(--vela-ease-out); }')).toEqual(['motion-property:transition'])
  })

  it('allows only the moving properties inside @keyframes', () => {
    expect(rules('@keyframes a { from { opacity: 0; scale: 0.8; filter: blur(var(--vela-blur-materialize)); } to { opacity: 1; transform: none; rotate: 360deg; } }')).toEqual([])
    expect(rules('@keyframes a { to { width: 100%; } }')).toEqual(['motion-property:width'])
    expect(rules('@media (hover: hover) { @keyframes b { 50% { margin-left: 0; } } }')).toEqual(['motion-property:margin-left'])
    // Outside @keyframes the same declarations are ordinary layout.
    expect(rules('@keyframes a { to { opacity: 1; } } .b { width: 100%; }')).toEqual([])
  })

  it('honours an inline waiver with a reason, reports it, and rejects one without', () => {
    const r = lintCss('.a { width: 34px; height: 20px; } /* vela-allow: needs sizing token, tracked in Phase 0 */')
    expect(r.findings.map((f) => f.waived)).toEqual([true, true])
    expect(r.waivers).toEqual([{ line: 1, reason: 'needs sizing token, tracked in Phase 0' }])
    // A waiver on one line does not reach the next.
    expect(rules('.a { width: 34px; } /* vela-allow: recorded gap */\n.b { width: 8px; }')).toEqual(['raw-length:width'])
    expect(lintCss('.a { width: 34px; } /* vela-allow: */').waivers).toEqual([{ line: 1, reason: '' }])
  })
})
