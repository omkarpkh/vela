/**
 * Component CSS lint.
 *
 * The first non-negotiable is "bind semantic tokens, never a primitive, never raw hex", and
 * the second is "numeric tokens carry their unit". Until now both were review conventions:
 * nothing failed the build when a component stylesheet wrote `rgb(0 0 0 / 0.06)` or `34px`.
 * This is that check. It reads every src/components/**\/*.css and src/headless/**\/*.css (the
 * stylesheets of the headless-born components, Checkbox and Radio Group) and fails on:
 *
 *   raw-colour      a 3/4/6/8-digit hex, rgb()/rgba()/hsl()/hsla()/oklch()/oklab()/lab()/lch()/
 *                   hwb(), or a CSS named colour. `transparent` and `currentColor` are not
 *                   colours here — they defer to the cascade and survive a theme change.
 *   primitive       var(--vela-grey-700), var(--vela-white): a primitive bound directly, which
 *                   is what breaks dark mode (the theme re-points semantics only).
 *   raw-length      a bare px / rem / em length that should be a token.
 *   motion-property a transition or a keyframe that moves anything but transform (with its
 *                   `translate` / `scale` / `rotate` longhands), opacity or filter
 *                   (foundations/motion.md, rule 1). Colour properties may also transition —
 *                   a hover colour is a state settling, not movement — but width, height,
 *                   margin, padding, left/top, `all`, or a bare duration (which means `all`)
 *                   fail. Inside @keyframes only the moving properties are allowed.
 *
 * Allowed without a waiver: `0` in any unit; `1px` (and `-1px`) where it is a hairline or the
 * compensation for one — border*, outline*, inset*, margin*, top/right/bottom/left; `100%` and
 * every other percentage (translate percentages included); unitless numbers (line-height,
 * `scale(0.97)`, opacity); durations and angles.
 *
 * A bare value that genuinely has no token yet is WAIVED INLINE, on the same line, with a reason:
 *
 *   width: 34px; height: 20px;   /* vela-allow: needs sizing token, tracked in Phase 0 *\/
 *
 * A waiver covers every finding on its line (or on the lines a multi-line declaration spans),
 * is printed, and is never silent — the report lists each one with its reason, the way the
 * Figma builder lint prints its `@allow` lines. A waiver with no reason is itself a failure.
 *
 *   node scripts/check-css.mjs            # report; exit 1 on an unwaived finding
 *   node scripts/check-css.mjs --json     # the findings as JSON (what the vitest test reads)
 *
 * Scope is deliberately the two component trees, src/components and src/headless: base.css owns
 * the sr-only hack and the reduced-motion collapse, which are the two legitimate raw values in the
 * kit, and the token files are generated.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const DEFAULT_ROOT = join(here, '..')

// The CSS named colours (CSS Color Module Level 4), minus the two that defer to the cascade.
const NAMED = new Set(`aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet
brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan
darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred
darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue
dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray
green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen
lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink
lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen
linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue
mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy
oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip
peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown
seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal
thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen`.split(/\s+/))

const COLOUR_FN = /\b(rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(/i
const HEX = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/i
// Primitive families, as tokens.light.css declares them: a colour scale step or black/white.
const PRIMITIVE = /var\(\s*(--vela-(?:grey|primary|blue|green|red|critical|yellow|orange)-\d+|--vela-(?:black|white))\s*[,)]/g
const LENGTH = /(?<![\w.-])(-?\d*\.?\d+)(px|rem|em)\b/g
// Where ±1px is a hairline, or the compensation for one.
const HAIRLINE_PROPS = /^(border|outline|inset|margin|top|right|bottom|left)/
const WAIVER = /\/\*\s*vela-allow:\s*([^*]*?)\s*\*\//
// What may move (foundations/motion.md, rule 1), and the colour properties that may settle.
const MOVES = new Set(['transform', 'translate', 'scale', 'rotate', 'opacity', 'filter'])
const COLOUR_PROPS = /^(color|background-color|border(-(top|right|bottom|left|block|inline)(-(start|end))?)?-color|outline-color|fill|stroke|text-decoration-color|caret-color|accent-color)$/
const TIME = /^-?\d*\.?\d+m?s$/
/** Split on commas outside parentheses: `color 1s, transform 2s cubic-bezier(0, 0, 1, 1)` → two items. */
const topLevel = (v) => {
  const out = []
  let depth = 0, cur = ''
  for (const ch of v) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) { out.push(cur); cur = '' } else cur += ch
  }
  out.push(cur)
  return out.map((x) => x.trim()).filter(Boolean)
}
/** The properties a `transition` / `transition-property` value names; a bare duration means `all`. */
const transitioned = (prop, value) => topLevel(value).map((item) => {
  if (prop === 'transition-property') return item.toLowerCase()
  const first = item.split(/\s+/)[0].toLowerCase()
  return TIME.test(first) || first.startsWith('var(') || first.startsWith('cubic-bezier(') || first.startsWith('linear') || first.startsWith('ease') || first.startsWith('steps(') ? 'all' : first
})

const walk = (dir) => {
  const out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p))
    else if (e.name.endsWith('.css')) out.push(p)
  }
  return out.sort()
}

/**
 * Lint one stylesheet. Returns { findings, waivers }: each finding is
 * { rule, line, prop, value, what, waived }, each waiver { line, reason }.
 */
export function lintCss(source) {
  const findings = []
  const waivers = new Map()   // line → reason ('' when the waiver carries none)

  // Pass 1: record waivers by line, then strip comments while keeping line numbers.
  const lines = source.split('\n')
  lines.forEach((l, i) => {
    const m = l.match(WAIVER)
    if (m) waivers.set(i + 1, m[1].trim())
  })
  let code = ''
  let inComment = false
  for (let i = 0; i < source.length; i++) {
    if (!inComment && source.startsWith('/*', i)) { inComment = true; i++; continue }
    if (inComment && source.startsWith('*/', i)) { inComment = false; i++; continue }
    code += inComment && source[i] !== '\n' ? ' ' : source[i]
  }

  // Pass 2: split into declarations. A buffer ending at `{` is a selector or at-rule and is
  // discarded; one ending at `;` or `}` is a declaration. Each keeps the lines it spans.
  let buf = ''
  let line = 1
  let start = 1
  const blocks = []   // the selector or at-rule of each open block, so a declaration knows it is in @keyframes
  const flush = (isDecl) => {
    const text = buf
    buf = ''
    if (!isDecl) return
    const m = text.match(/^\s*([\w-]+)\s*:\s*([\s\S]+?)\s*$/)
    if (!m) return
    const [, prop, rawValue] = m
    const from = start
    const to = line
    const waiverLine = [...waivers.keys()].find((n) => n >= from && n <= to)
    const waived = waiverLine !== undefined
    const hit = (rule, what) => findings.push({ rule, line: from, prop, value: rawValue.replace(/\s+/g, ' ').trim(), what, waived })

    // Primitives first, on the raw value: the name is the evidence.
    for (const p of rawValue.matchAll(PRIMITIVE)) hit('primitive', `binds the primitive ${p[1]} — bind the semantic token for the role`)

    // Then colours and lengths on the value with strings and custom-property NAMES removed, so
    // `var(--vela-black)` is not also a named colour and "Open Sans" is not a length.
    const value = rawValue.replace(/"[^"]*"|'[^']*'/g, '""').replace(/--[\w-]+/g, '')
    if (HEX.test(value)) hit('raw-colour', `raw hex ${value.match(HEX)[0]}`)
    const fn = value.match(COLOUR_FN)
    if (fn) hit('raw-colour', `${fn[1]}() is a raw colour — bind a --vela-* semantic token`)
    for (const word of value.toLowerCase().match(/[a-z]+/g) ?? [])
      if (NAMED.has(word)) hit('raw-colour', `named colour "${word}" — bind a --vela-* semantic token`)

    // Motion: what a transition or a keyframe may move.
    const inKeyframes = blocks.some((b) => /^@(-webkit-)?keyframes\b/.test(b))
    if (inKeyframes && !MOVES.has(prop) && !prop.startsWith('--')) hit('motion-property', `@keyframes animate ${prop} — only transform, translate, scale, rotate, opacity and filter move`)
    if (prop === 'transition' || prop === 'transition-property') {
      for (const p of transitioned(prop, value)) {
        if (p === 'none' || MOVES.has(p) || COLOUR_PROPS.test(p)) continue
        hit('motion-property', p === 'all'
          ? 'transitions `all` (a bare duration means all) — name the property: transform, opacity, filter, or a colour'
          : `transitions ${p} — only transform, opacity and filter move; colours may settle; layout never animates`)
      }
    }

    for (const l of value.matchAll(LENGTH)) {
      const n = Number(l[1])
      if (n === 0) continue
      if (Math.abs(n) === 1 && l[2] === 'px' && HAIRLINE_PROPS.test(prop)) continue
      hit('raw-length', `bare ${l[1]}${l[2]} — use a token, or waive it on this line with /* vela-allow: <reason> */`)
    }
  }
  for (let i = 0; i < code.length; i++) {
    const ch = code[i]
    if (ch === '\n') line++
    if (ch === '{') { blocks.push(buf.trim()); flush(false); start = line; continue }
    if (ch === ';') { flush(true); start = line; continue }
    if (ch === '}') { flush(true); blocks.pop(); start = line; continue }
    if (!buf.trim() && ch !== '\n') start = line
    buf += ch
  }
  flush(true)

  return { findings, waivers: [...waivers].map(([l, reason]) => ({ line: l, reason })) }
}

// The two trees that hold component stylesheets: the core and the headless-born components.
const DIRS = ['src/components', 'src/headless']

/** Lint every component stylesheet under `root`. */
export function checkCss(root = DEFAULT_ROOT) {
  const files = DIRS.map((d) => join(root, d)).flatMap((dir) => (statSync(dir, { throwIfNoEntry: false })?.isDirectory() ? walk(dir) : []))
  const report = []
  for (const file of files) {
    const { findings, waivers } = lintCss(readFileSync(file, 'utf8'))
    const problems = findings.filter((f) => !f.waived)
    for (const w of waivers) if (!w.reason) problems.push({ rule: 'waiver-without-reason', line: w.line, prop: '', value: '', what: 'a vela-allow waiver must say why — /* vela-allow: <reason> */', waived: false })
    report.push({ file: relative(root, file), findings, waivers, problems })
  }
  return report
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = checkCss()
  const failed = report.some((r) => r.problems.length)
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report))
    process.exit(failed ? 1 : 0)
  }
  console.log('\n  COMPONENT CSS\n  ' + '-'.repeat(58))
  for (const r of report) {
    const waived = r.findings.filter((f) => f.waived)
    console.log(`  ${r.file}: ${r.problems.length ? r.problems.length + ' violation(s)' : 'clean'}${waived.length ? `, ${waived.length} waived` : ''}`)
    for (const p of r.problems) console.log(`    ✗ ${p.rule}  line ${p.line}  ${p.prop ? p.prop + ': ' + p.value : ''}\n        ${p.what}`)
    for (const w of r.waivers) console.log(`    · waived line ${w.line} — ${w.reason}`)
  }
  const total = report.reduce((n, r) => n + r.problems.length, 0)
  const waived = report.reduce((n, r) => n + r.findings.filter((f) => f.waived).length, 0)
  console.log(failed
    ? `\n  ${total} violation(s). Bind a --vela-* token, or waive the line with a reason.\n`
    : `\n  Every component stylesheet binds tokens; ${waived} literal value(s) carry a waiver and a reason.\n`)
  process.exit(failed ? 1 : 0)
}
