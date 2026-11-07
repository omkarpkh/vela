/**
 * Writes the token tables in DESIGN.md from tokens/vela.tokens.json, so the values in the one
 * rules document cannot go stale. Everything else in DESIGN.md is written by hand.
 *
 * A generated block sits between two comments and is replaced whole:
 *
 *   <!-- generated:<block> (npm run tokens) -->
 *   ...
 *   <!-- /generated -->
 *
 * The blocks: `font-families` (Typography), `scales` (spacing, radius, icon and control sizes,
 * under Token layers and naming) and `motion` (durations, delays and easings). Each row is the
 * token, its value as the CSS receives it, and the token's `$description` ("(none yet)" where
 * the token has none). A family's description is printed once per table, on its first step.
 *
 *   npm run tokens     writes the blocks (after the CSS, Dart and MUI outputs)
 *   --check            fails instead of writing (the first step of npm run tokens:check, so a
 *                      stale table fails CI before `npm run tokens` rewrites it)
 *
 * src/styles/design-md.test.ts fails when a block is stale, and when a hand-written line names a
 * token and also states its value (`statedValues`): the value belongs in the table, the line says
 * when to use the token. The check reads one line at a time, so a value wrapped onto the line
 * after its token's name is not caught.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadTokenSet, cssColor, pxOf, msOf, cubicBezierOf, fontFamilyCss, springOf } from './tokens-core.mjs'

export const FILE = 'DESIGN.md'
const BLOCK = /(<!-- generated:([a-z-]+) \(npm run tokens\) -->\n)([\s\S]*?)(<!-- \/generated -->)/g

/** A resolved raw value as the CSS writes it (the value an alias ends at, never `var(...)`). */
function rendered(set, name, mode) {
  const t = set.all[name]
  const v = set.resolved(name, mode)
  switch (t.$type) {
    case 'color': return cssColor(v, name)
    case 'dimension': return `${pxOf(v, name)}px`
    case 'duration': return `${msOf(v, name)}ms`
    case 'cubicBezier': return `cubic-bezier(${cubicBezierOf(v, name).join(', ')})`
    case 'fontFamily': return fontFamilyCss(v)
    case 'number': return String(v)
    default: throw new Error(`${name}: no rendering for $type ${t.$type}`)
  }
}

const cell = (s) => s.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim()
/**
 * The Description cell. A family's text (a step with `descriptionFrom`, tokens-core's group
 * descriptions) is printed once per table, on the family's first described step; its later steps
 * leave the cell empty, so a paragraph is not repeated down the table. A step's own description is
 * always printed on its own row. Dart and the Figma payload keep the text on every step: those are
 * read one token at a time, this table top to bottom.
 */
const description = (set, name, shown) => {
  const t = set.all[name]
  if (t.descriptionFrom) {
    if (shown.has(t.descriptionFrom)) return ''
    shown.add(t.descriptionFrom)
  }
  return cell(t.$description ?? '') || '(none yet)'
}

/** The Value cell: one value, or the light and dark values where a theme re-points it. */
function valueCell(set, name) {
  const spring = springOf(set, name)
  if (spring)
    return `a spring: stiffness ${spring.stiffness}, damping ${spring.damping}, mass ${spring.mass}, drawn over \`--vela-${spring.durationToken}\`; where \`linear()\` is unsupported, \`${rendered(set, name, set.defaultContext)}\``
  const values = set.contexts.map((c) => rendered(set, name, c))
  const alias = set.terminal(name) !== name ? ` (\`--vela-${set.terminal(name)}\`)` : ''
  if (values.every((v) => v === values[0])) return `\`${cell(values[0])}\`${alias}`
  return set.contexts.map((c, i) => `${c}: \`${cell(values[i])}\``).join(', ')
}

const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n')
const rowsFor = (set, names, shown = new Set()) => names.map((n) => [`\`--vela-${n}\``, valueCell(set, n), description(set, n, shown)])
const pick = (set, test) => set.order.filter(test)

/** The scales, in the order DESIGN.md names them: spacing, radius, icon box, control height. */
const SCALES = [
  ['Spacing', (n) => /^space-\d+$/.test(n)],
  ['Radius', (n) => /^radius-/.test(n)],
  ['Icon box', (n) => /^icon-(\d+|size(-[a-z]+)?)$/.test(n)],
  ['Control height', (n) => /^control-height-\d+$/.test(n)],
]

export const BLOCKS = {
  'font-families': (set) => table(['Token', 'Stack', 'For'], rowsFor(set, pick(set, (n) => set.all[n].$type === 'fontFamily'))),
  scales: (set) => {
    const shown = new Set() // one table: a family's text once across all four scales
    return table(['Scale', 'Token', 'Value', 'Description'], SCALES.flatMap(([scale, test]) =>
      rowsFor(set, pick(set, test), shown).map((r, i) => [i === 0 ? scale : '', ...r])))
  },
  motion: (set) => table(['Token', 'Value', 'Description'], rowsFor(set, pick(set, (n) => set.all[n].group === 'motion' && ['duration', 'cubicBezier'].includes(set.all[n].$type)))),
}

/** DESIGN.md with every generated block rewritten. Throws on an unknown block name. */
export function renderDesign(md, set) {
  const seen = new Set()
  const out = md.replace(BLOCK, (_, open, name, _body, close) => {
    const make = BLOCKS[name]
    if (!make) throw new Error(`${FILE}: unknown generated block "${name}" (have ${Object.keys(BLOCKS).join(', ')})`)
    seen.add(name)
    return `${open}${make(set)}\n${close}`
  })
  const missing = Object.keys(BLOCKS).filter((b) => !seen.has(b))
  if (missing.length) throw new Error(`${FILE}: no generated block for ${missing.join(', ')}`)
  return out
}

/** The lines outside generated blocks, with their line numbers. */
export function handWrittenLines(md) {
  const lines = md.split('\n')
  const out = []
  let inside = false
  lines.forEach((line, i) => {
    if (/^<!-- generated:/.test(line)) inside = true
    if (!inside) out.push({ n: i + 1, line })
    if (/^<!-- \/generated -->/.test(line)) inside = false
  })
  return out
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The ways a token's value can be written: its value in each theme, and a spring's stiffness. */
export function valueForms(set, name) {
  const forms = new Set(set.contexts.map((c) => rendered(set, name, c)))
  const spring = springOf(set, name)
  if (spring) forms.add(`stiffness ${spring.stiffness}`)
  return [...forms]
}

/** A pattern that finds one value form as written, not inside a longer number or word. */
function formPattern(form) {
  const body = escape(form).replace(/\s*,\s*/g, '\\s*,\\s*').replace(/\\\(/g, '\\(\\s*').replace(/\\\)/g, '\\s*\\)')
  return new RegExp(`(?<![\\w.#-])${body}(?!\\w|\\.\\d)`, 'i')
}

/**
 * Every hand-written line that names a token (`--vela-<name>`) and also states that token's value:
 * `[{ n, token, value, line }]`. Names that are not tokens (`--vela-text-meta-*`) are skipped.
 */
export function statedValues(md, set) {
  const hits = []
  for (const { n, line } of handWrittenLines(md)) {
    for (const m of line.matchAll(/--vela-([a-z0-9]+(?:-[a-z0-9]+)*)/g)) {
      const name = m[1]
      if (!set.all[name]) continue
      for (const form of valueForms(set, name)) if (formPattern(form).test(line)) hits.push({ n, token: `--vela-${name}`, value: form, line: line.trim() })
    }
  }
  return hits
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  const set = loadTokenSet(root)
  const path = join(root, FILE)
  const before = readFileSync(path, 'utf8')
  const after = renderDesign(before, set)
  // --check (tokens:check, before `npm run tokens` rewrites the file): fail on a stale table, and
  // on a hand-written line that states a token's value. A plain run writes the tables.
  if (process.argv.includes('--check')) {
    const stated = statedValues(after, set)
    for (const h of stated) console.error(`  ${FILE}:${h.n} names ${h.token} and states its value (${h.value}); the value belongs in the generated table`)
    if (after !== before) console.error(`  ${FILE}: the generated token tables are stale: run npm run tokens`)
    if (after !== before || stated.length) process.exit(1)
    console.log(`check:design  ${FILE} token tables are up to date; no hand-written line states a token's value`)
    process.exit(0)
  }
  if (after !== before) writeFileSync(path, after)
  console.log(`build:design  ${Object.keys(BLOCKS).length} token tables → ${FILE}${after === before ? ' (unchanged)' : ''}`)
}
