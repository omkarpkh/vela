/** WCAG 2.1 relative luminance + contrast, and a resolver for var() chains. */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function parseDecls(css) {
  const map = new Map()
  for (const m of css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    map.set(m[1], m[2].trim())
  }
  return map
}

export function loadThemes() {
  const light = parseDecls(readFileSync(join(root, 'src/styles/tokens.light.css'), 'utf8'))
  const darkOverlay = parseDecls(readFileSync(join(root, 'src/styles/tokens.dark.body.css'), 'utf8'))
  const dark = new Map(light)
  for (const [k, v] of darkOverlay) dark.set(k, v)
  return { light, dark }
}

/** Follow var(--a) -> var(--b) -> #hex. Throws on a dangling reference. */
export function resolve(map, name, seen = new Set()) {
  if (seen.has(name)) throw new Error(`Circular token reference at ${name}`)
  seen.add(name)
  const raw = map.get(name)
  if (raw === undefined) throw new Error(`Unknown token ${name}`)
  const varMatch = raw.match(/^var\((--[\w-]+)\)$/)
  if (varMatch) return resolve(map, varMatch[1], seen)
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) {
    throw new Error(`Token ${name} is not a resolvable color: "${raw}"`)
  }
  return raw
}

function toRgb(hex) {
  let h = hex.slice(1)
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
}

export function luminance(hex) {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(fgHex, bgHex) {
  const a = luminance(fgHex)
  const b = luminance(bgHex)
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

/** [foreground, background, label, kind]  kind: 'text' (4.5) | 'ui' (3.0) */
export const PAIRS = [
  ['--vela-text-default',        '--vela-bg-global',    'Body text on page',            'text'],
  ['--vela-text-default',        '--vela-bg-container', 'Body text on container',       'text'],
  ['--vela-text-heading',        '--vela-bg-global',    'Heading on page',              'text'],
  ['--vela-text-de-emphasized',  '--vela-bg-global',    'De-emphasized text',           'text'],
  ['--vela-text-link',           '--vela-bg-global',    'Link text',                    'text'],
  ['--vela-text-error',          '--vela-bg-global',    'Error text',                   'text'],
  ['--vela-control-placeholder', '--vela-control-bg',   'Input placeholder',            'text'],

  ['--vela-btn-primary-text',       '--vela-btn-primary-bg',     'Primary button label',     'text'],
  ['--vela-btn-standard-text',      '--vela-btn-standard-bg',    'Standard button label',    'text'],
  ['--vela-btn-destructive-text',   '--vela-btn-destructive-bg', 'Destructive button label', 'text'],
  ['--vela-btn-hollow-primary-text','--vela-bg-global',          'Hollow primary label',     'text'],

  // Hover, not rest. Every mouse press begins from hover, so a button spends real time in these
  // colours — and they were unasserted until a dark-mode hover was found at 3.18:1 against its own
  // white label. A state a person can see is a state the suite has to check.
  ['--vela-btn-primary-text',       '--vela-btn-primary-hover-bg',     'Primary button label, hovered',     'text'],
  ['--vela-btn-standard-text',      '--vela-btn-standard-hover-bg',    'Standard button label, hovered',    'text'],
  ['--vela-btn-destructive-text',   '--vela-btn-destructive-hover-bg', 'Destructive button label, hovered', 'text'],
  ['--vela-btn-hollow-primary-text','--vela-btn-hollow-hover-bg',      'Hollow primary label, hovered',     'text'],

  ...['success', 'info', 'warning', 'minor', 'major', 'critical'].flatMap((s) => [
    [`--vela-text-severity-${s}`, `--vela-bg-severity-${s}`, `Severity ${s} text`, 'text'],
    [`--vela-icon-severity-${s}`, `--vela-bg-severity-${s}`, `Severity ${s} icon`, 'ui'],
    // The alert's dismiss glyph inherits the severity text colour and sits on --vela-bg-hover
    // while hovered (it used to sit on an unasserted rgb(0 0 0 / 0.06)). A glyph is non-text.
    [`--vela-text-severity-${s}`, '--vela-bg-hover', `Severity ${s} dismiss glyph, hovered`, 'ui'],
  ]),
  ...['low', 'medium', 'high'].flatMap((r) => [
    [`--vela-text-risk-${r}`, `--vela-bg-risk-${r}`, `Risk ${r} text`, 'text'],
    [`--vela-icon-risk-${r}`, `--vela-bg-risk-${r}`, `Risk ${r} icon`, 'ui'],
  ]),

  ['--vela-control-border',     '--vela-control-bg',      'Input border',           'ui'],
  // Checkbox and Radio Group (Phase 1, headless). The box and the circle rest on control-bg with
  // the input border; checked, they fill with control-check-bg-checked and the mark, the dash and
  // the dot are drawn on that fill in control-check-mark. Dark re-points the fill to primary-450,
  // not primary-400: white on primary-400 is 3.18:1, white on primary-450 is 4.74:1 and the fill
  // still clears the page at 3.82:1. The error ring is the Input's error border, asserted here for
  // the first time — Input never listed it.
  ['--vela-control-check-mark',       '--vela-control-check-bg-checked', 'Check mark / radio dot on the checked fill', 'ui'],
  ['--vela-control-check-bg-checked', '--vela-bg-global',                'Checked box / selected radio on page',       'ui'],
  ['--vela-control-check-bg-checked', '--vela-bg-container',             'Checked box / selected radio on container',  'ui'],
  ['--vela-control-border-error',     '--vela-control-bg',               'Control error border',                       'ui'],
  // Overlays (Phase 1, headless): Popover and Dialog sit on --vela-bg-raised (white light, grey-850
  // dark), which no text pair had been asserted on. Their title is text-heading and their body and
  // description text-default — not text-de-emphasized, which is grey-500 on grey-850 in dark at
  // 3.99:1 and fails. A Popover has no shadow (no elevation token exists): its border-default edge is
  // what separates it from the page or container it floats over. The Tooltip is the one inverted
  // surface: text-tooltip on bg-tooltip. The tooltip's own edge against the page is deliberately NOT
  // a pair — it is not a control boundary (WCAG 1.4.11 asks that of things you operate), and in dark
  // grey-700 on grey-950 is 2.35:1; the text, at 7.69:1 on its surface, is what carries it.
  ['--vela-text-heading',       '--vela-bg-raised',    'Overlay title on raised surface',  'text'],
  ['--vela-text-default',       '--vela-bg-raised',    'Overlay body on raised surface',   'text'],
  ['--vela-border-default',     '--vela-bg-container', 'Overlay edge on container',        'ui'],
  ['--vela-text-tooltip',       '--vela-bg-tooltip',   'Tooltip text',                     'text'],
  ['--vela-btn-standard-border','--vela-btn-standard-bg', 'Standard button border', 'ui'],
  ['--vela-border-default',     '--vela-bg-global',       'Default border on page', 'ui'],
  ['--vela-border-active',  '--vela-bg-global',  'Focus ring',          'ui'],
  ...['unknown', 'healthy', 'warning', 'medium', 'unhealthy'].map((s) => [
    `--vela-signal-status-${s}`, '--vela-bg-global', `Status dot: ${s}`, 'ui',
  ]),
]

export const THRESHOLD = { text: 4.5, ui: 3.0 }

export function auditTheme(map) {
  return PAIRS.map(([fg, bg, label, kind]) => {
    const ratio = contrast(resolve(map, fg), resolve(map, bg))
    return { label, kind, ratio, min: THRESHOLD[kind], pass: ratio >= THRESHOLD[kind], fg, bg }
  })
}
