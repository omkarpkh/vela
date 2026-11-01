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
  const report = checkCss().filter((r) => r.scope === 'component')

  it('lints every component stylesheet', () => {
    expect(report.map((r) => r.file).sort()).toEqual([
      ...['BrandMark', 'Button', 'ContextualAlert', 'Icon', 'Input', 'RiskPill', 'StatusIndicator', 'Table', 'Tabs', 'TextArea', 'Toggle'].map((c) => `src/components/${c}/${c}.css`),
      // The headless-born components keep their stylesheets beside their implementation.
      ...['Checkbox', 'Dialog', 'DropdownList', 'IconButton', 'Popover', 'RadioGroup', 'Toast', 'Tooltip'].map((c) => `src/headless/${c}/${c}.css`),
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

// The site (demo/) follows DESIGN.md like the kit: semantic tokens, units carried by the token. The
// one difference is that a layout width waiting for the breakpoint tokens is a true literal there, so
// the site may waive it, with a reason, where the component stylesheets may not. The audit counted
// 36 bare values in the site CSS; what is left is pinned here, so a new literal is a decision.
describe('site CSS binds tokens', () => {
  const report = checkCss().filter((r) => r.scope === 'site')
  const SITE_STYLESHEETS = ['demo/demo.css', 'demo/playground.css', 'demo/pages/docs.css', 'demo/pages/foundation.css', 'demo/pages/overview.css', 'demo/pages/proposal.css', 'demo/shell/shell.css']

  it('lints every stylesheet under demo/', () => {
    expect(report.map((r) => r.file).sort()).toEqual([...SITE_STYLESHEETS].sort())
  })

  it.each(SITE_STYLESHEETS)('%s has no raw colour, primitive or bare length without a waiver', (file) => {
    const r = report.find((x) => x.file === file)!
    expect(r.problems.map((p) => `${p.rule} line ${p.line}: ${p.prop}: ${p.value} — ${p.what}`)).toEqual([])
  })

  it('every site waiver says why, and the waived literals stay few', () => {
    for (const r of report) for (const w of r.waivers) expect(w.reason, `${r.file} line ${w.line}`).not.toBe('')
    const waived = report.flatMap((r) => r.findings.filter((f) => f.waived).map((f) => `${r.file}:${f.line} ${f.prop}`))
    expect(waived.length, waived.join('\n')).toBeLessThanOrEqual(20)
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

  // Rule 1's one exception (decisions/004-icon-strokes-draw): an icon glyph's own strokes may draw
  // on and off with stroke-dashoffset, by transition, inside .vela-icon. Nothing else gains.
  it('lets stroke-dashoffset transition inside .vela-icon only, never in @keyframes, never dasharray', () => {
    const what = (css: string) => lintCss(css).findings.map((f) => f.what)
    expect(rules('.vela-icon .part { transition: stroke-dashoffset var(--vela-duration-travel) var(--vela-ease-out), opacity var(--vela-duration-fast) var(--vela-ease-standard); }')).toEqual([])
    expect(rules('@media (hover: hover) { .vela-copy:hover .vela-icon .part { transition-property: stroke-dashoffset, opacity; } }')).toEqual([])
    expect(rules('.chart path { transition: stroke-dashoffset var(--vela-duration-fast) var(--vela-ease-standard); }')).toEqual(['motion-property:transition'])
    expect(what('.chart path { transition: stroke-dashoffset var(--vela-duration-fast) var(--vela-ease-standard); }')).toEqual(["transitions stroke-dashoffset — only an icon glyph's strokes may draw (inside .vela-icon)"])
    expect(rules('.vela-icon .part { transition: stroke-dasharray var(--vela-duration-fast) var(--vela-ease-standard); }')).toEqual(['motion-property:transition'])
    expect(rules('@keyframes draw { to { stroke-dashoffset: 1; } }')).toEqual(['motion-property:stroke-dashoffset'])
    expect(what('@keyframes draw { to { stroke-dashoffset: 1; } }')).toEqual(['@keyframes animate stroke-dashoffset — only transform, translate, scale, rotate, opacity and filter move'])
  })

  it('counts a selector as inside an icon only when every element it matches is', () => {
    const draws = (selector: string) => rules(`${selector} { transition: stroke-dashoffset var(--vela-duration-fast); }`)
    expect(draws('.vela-icon')).toEqual([])
    expect(draws('.vela-copy[data-copied] > .vela-icon .tick')).toEqual([])
    // A different class, a negation, a parent that has an icon, a sibling of one, a list with an outsider.
    for (const selector of ['.vela-icon-button path', '.x:not(.vela-icon) path', '.btn:has(.vela-icon)', '.vela-icon + .chart path', '.vela-icon ~ svg path', '.vela-icon .a, .chart path', '[class~="vela-icon"] path'])
      expect(draws(selector), selector).toEqual(['motion-property:transition'])
  })

  it('accepts raw lengths on the icon grid only for transform-origin and inside translate()', () => {
    expect(rules('.vela-icon .x { transform-origin: 22px 22px; }')).toEqual([])
    expect(rules('.vela-icon .x { transform: translate(2px, -1.5px) rotate(-8deg); }')).toEqual([])
    expect(rules('.vela-icon .x { transform: translateX(3px) translateY(-1px) scale(1.2); }')).toEqual([])
    expect(rules('.vela-icon .x { margin: 3px; }')).toEqual(['raw-length:margin'])
    expect(rules('.vela-icon .x { stroke-width: 2px; }')).toEqual(['raw-length:stroke-width'])
    // Only the translate() function: other functions, and the `translate` longhand, are still checked.
    expect(rules('.vela-icon .x { transform: translate(2px) skewX(2px); }')).toEqual(['raw-length:transform'])
    expect(rules('.vela-icon .x { translate: 2px 1px; }')).toEqual(['raw-length:translate', 'raw-length:translate'])
    // Outside an icon a length is a screen pixel and needs a token.
    expect(rules('.card { transform-origin: 22px 22px; }')).toEqual(['raw-length:transform-origin', 'raw-length:transform-origin'])
    expect(rules('.vela-icon-button { transform-origin: 22px 22px; }')).toEqual(['raw-length:transform-origin', 'raw-length:transform-origin'])
  })

  // A control with its own press response turns off the browser's tap flash (DESIGN.md, States: Pressed).
  it('fails a stylesheet that styles [data-vela-pressed] without -webkit-tap-highlight-color: transparent', () => {
    const tap = (css: string) => rules(css).filter((r) => r.startsWith('tap-highlight'))
    expect(tap('.b[data-vela-pressed] { transform: scale(0.97); }')).toEqual(['tap-highlight:-webkit-tap-highlight-color'])
    expect(lintCss('.a { color: inherit; }\n.b[data-vela-pressed] { transform: scale(0.97); }').findings.map((f) => f.line)).toEqual([2])
    expect(tap('.b { -webkit-tap-highlight-color: transparent; }\n.b[data-vela-pressed] { transform: scale(0.97); }')).toEqual([])
    expect(tap('.b { all: unset; -webkit-tap-highlight-color: transparent; } .b[data-vela-pressed] { transform: scale(0.97); }')).toEqual([])
    // A highlight that is merely recoloured is still a flash; and a comment is not a declaration.
    expect(tap('.b { -webkit-tap-highlight-color: var(--vela-bg-hover); } .b[data-vela-pressed] { transform: scale(0.97); }')).toEqual(['tap-highlight:-webkit-tap-highlight-color'])
    expect(tap('/* -webkit-tap-highlight-color: transparent; */ .b[data-vela-pressed] { transform: scale(0.97); }')).toEqual(['tap-highlight:-webkit-tap-highlight-color'])
    // The check keys on the flag; a stylesheet that never styles it is not asked.
    expect(tap('.b:active { transform: scale(0.97); }')).toEqual([])
    expect(lintCss('.b[data-vela-pressed] { transform: scale(0.97); } /* vela-allow: no */').findings.map((f) => f.waived)).toEqual([false])
  })

  // The css half of brand-mark-never-moves; the computed-style half is in tests/e2e/playground.spec.ts.
  it('fails any transition, animation or transform on a Brand Mark or inside it, even `none`, and no waiver reaches it', () => {
    const still = (css: string) => rules(css).filter((r) => r.startsWith('brand-mark-still'))
    expect(still('.vela-brand-mark { transition: color 120ms; }')).toEqual(['brand-mark-still:transition'])
    expect(still('.vela-brand-mark--large { animation: pulse 1s; }')).toEqual(['brand-mark-still:animation'])
    expect(still('.vela-brand-mark path { transform: none; }')).toEqual(['brand-mark-still:transform'])
    expect(still('.vela-icon-button:active > .vela-brand-mark { scale: 0.97; }')).toEqual(['brand-mark-still:scale'])
    expect(still('@media (hover: hover) { .host:hover .vela-brand-mark { translate: 0 -1px; } }')).toEqual(['brand-mark-still:translate'])
    expect(still('.a, .vela-brand-mark { transition-duration: 0s; }')).toEqual(['brand-mark-still:transition-duration'])
    // Its box, its colour and its neighbours are not motion.
    expect(still('.vela-brand-mark { width: var(--vela-icon-size); fill: currentColor; }')).toEqual([])
    expect(still('.vela-brand-mark + .label { transform: scale(0.97); }')).toEqual([])
    expect(still('.vela-brand-marks, :not(.vela-brand-mark) { transform: scale(0.97); }')).toEqual([])
    expect(lintCss('.vela-brand-mark { transform: none; } /* vela-allow: just this once */').findings.map((f) => f.waived)).toEqual([false])
  })

  // Slice 1 of the playground uplift: the site's own two rules, neither waivable.
  it('site: every page control (cursor: pointer) has a pressed rule beside it', () => {
    const site = (css: string) => lintCss(css, { site: true }).findings.filter((f) => f.rule === 'pressed-state').map((f) => f.value)
    expect(site('.seg { cursor: pointer; }')).toEqual(['.seg'])
    expect(site('.seg { cursor: pointer; } .seg:not(.is-locked):active { background: var(--vela-bg-selected); }')).toEqual([])
    expect(site('.a, .b summary { cursor: pointer; } .a:active { color: inherit; }')).toEqual(['.b summary'])
    // A component's own press response counts; another control's does not.
    expect(site('.cm { cursor: pointer; } .cm[data-press] .glyph { transform: scale(0.88); }')).toEqual([])
    expect(site('.card { cursor: pointer; } .cards:active { color: inherit; }')).toEqual(['.card'])
    // Not a control, and not the kit: the component stylesheets are held by their own press rules.
    expect(site('.handle { cursor: ew-resize; }')).toEqual([])
    expect(lintCss('.seg { cursor: pointer; }').findings).toEqual([])
    expect(lintCss('.seg { cursor: pointer; } /* vela-allow: no */', { site: true }).findings.map((f) => f.waived)).toEqual([false])
  })

  it('site: a state drawn as a box-shadow is restated for forced colours, which drop every shadow', () => {
    const site = (css: string) => lintCss(css, { site: true }).findings.filter((f) => f.rule === 'shadow-meaning').map((f) => f.value)
    expect(site('.seg[aria-current="true"] { box-shadow: inset 0 0 0 1px var(--vela-border-active); }')).toEqual(['.seg[aria-current="true"]'])
    expect(site(`.seg[aria-current="true"] { box-shadow: inset 0 0 0 1px var(--vela-border-active); }
      @media (forced-colors: active) { .seg[aria-current='true'] { border-color: Highlight; } }`)).toEqual([])
    expect(site('.row.is-changed, .row:active { box-shadow: inset var(--vela-stroke-2) 0 0 var(--vela-border-active); } @media (forced-colors: active) { .row.is-changed { border-color: Highlight; } }')).toEqual(['.row:active'])
    // A hairline that marks no state, and a shadow taken away, carry no meaning.
    expect(site('.cell { box-shadow: 1px 0 0 var(--vela-border-subtle); } .a:hover { box-shadow: none; }')).toEqual([])
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
