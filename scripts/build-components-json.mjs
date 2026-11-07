/**
 * Writes guidelines/components.json: every built component, read from its spec, for an agent that
 * needs to find a component, its closed props and the closest match when nothing fits.
 *
 * The markdown specs stay the source people edit. This file is generated from them with the
 * playground's own parser (demo/playground/spec.ts and status.ts, imported as they are: Node strips
 * their types), so the site and the JSON read a spec the same way. Proposals are left out: they are
 * not built.
 *
 *   npm run components     writes the file (`npm run build` runs it too), and the "Closest existing
 *                          component" options of the component-request form from it
 *
 * src/styles/components-json.test.ts fails when a spec is badly written (`problemsOf`), when the
 * committed file is stale, or when an import the file names is not exported where it says.
 * scripts/verify-pack.mjs checks the file is in the tarball.
 *
 * The output is stable on purpose: components sorted by name, tokens sorted, props and values in
 * the order the spec writes them (that order means something), two-space JSON with a trailing
 * newline, and no timestamp or package version, so a release does not change it.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { implementationsOf, literalsOf, parseSpec, sectionOf, splitRow, withoutCode } from '../demo/playground/spec.ts'
import { LABELS, statusOf } from '../demo/playground/status.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SPEC_DIR = 'guidelines/components'
export const OUT = 'guidelines/components.json'
export const FORM = '.github/ISSUE_TEMPLATE/component-request.yml'

const unquote = (s) => s.replace(/`/g, '').trim()
const compact = (s) => s.replace(/\s+/g, '')

/** What the package's own manifest says can be imported, and which peers are optional. */
function manifest() {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const entries = Object.entries(pkg.exports)
    .filter(([, target]) => typeof target === 'object' && target.import)
    .map(([key]) => (key === '.' ? pkg.name : `${pkg.name}/${key.replace(/^\.\//, '')}`))
  return { core: pkg.name, entries }
}

/** Every token name, as the CSS names it, for the `{pattern}` expansion. */
function knownTokens() {
  const tokens = JSON.parse(readFileSync(join(root, 'tokens/vela.tokens.json'), 'utf8'))
  const known = []
  for (const [g, toks] of Object.entries(tokens)) if (!g.startsWith('$')) for (const n of Object.keys(toks)) if (!n.startsWith('$')) known.push(`--vela-${n}`)
  return known
}

/**
 * The names a spec says to import. A Props table describes one component, named by its title
 * without spaces ("Radio Group" is `RadioGroup`). A Composition table describes parts: the ones
 * imported are the undotted parts the section's code example renders (`<Tooltip`) or calls (`useToast(`);
 * a part such as Toast's `Toast`, which is the options `add` takes, is neither and is not imported.
 */
function namesOf(spec) {
  const section = spec.sections.find((s) => s.heading === 'Props' || s.heading === 'Composition')
  if (!section || section.heading === 'Props') return [compact(spec.title)]
  const parts = [...new Set(spec.props.map((p) => p.part ?? '').filter((p) => p && !p.includes('.')).map((p) => p.replace(/\(\)$/, '')))]
  // The example is the section's code blocks only: its prose may name a part to say it is not one
  // (Toast: "there is no `<Toast>` element").
  const example = [...section.body.matchAll(/^\s*```[^\n]*\n([\s\S]*?)^\s*```/gm)].map((m) => m[1]).join('\n')
  return parts.filter((p) => new RegExp(`<${p}[\\s>/]|\\b${p}\\(`).test(example))
}

/** A Default cell as a value: `"top"` is "top", `false` is false, `3` is 3; `—` is no default. */
function defaultOf(cell) {
  if (cell === undefined || cell.trim() === '—') return undefined
  const raw = unquote(cell)
  try { return JSON.parse(raw) } catch { return raw }
}

/**
 * What is wrong with a spec, as sentences; empty when it is well written. Each problem is one an
 * agent reading components.json would otherwise inherit silently. Not checked here because a test
 * already does: a token that does not exist (src/styles/playground.test.ts) and the rule tags
 * under Hard constraints (scripts/check-rules.mjs).
 */
export function problemsOf(md, { entries = manifest().entries } = {}) {
  const problems = []
  const spec = parseSpec(md)
  if (!/^# .+$/m.test(md)) problems.push('no "# Title" line')
  const intro = spec.intro
  if (!/^# .+$/m.test(md) || !intro || /^(#|\*\*Status:\*\*|\||```|- )/.test(intro)) problems.push('no intro paragraph under the title')
  // GOVERNANCE.md: Approved is the default and is not written down, so a missing line is Approved.
  const line = md.match(/^\*\*Status:\*\*\s*([^\n]*)/m)
  if (line && !LABELS.some((l) => line[1].trim().toLowerCase().startsWith(l.toLowerCase())))
    problems.push(`the **Status:** line names no known label (one of ${LABELS.join(', ')}): "${line[1].trim().slice(0, 40)}"`)
  if (!sectionOf(spec, 'When to use')) problems.push('no "## When to use" section')

  const section = spec.sections.find((s) => s.heading === 'Props' || s.heading === 'Composition')
  if (!section) problems.push('no "## Props" or "## Composition" section')
  else if (spec.props.length === 0) problems.push(`the ${section.heading} section has no table rows`)
  if (section) {
    const header = withoutCode(section.body).split('\n').find((l) => l.trim().startsWith('|')) ?? ''
    const hasDefault = /\|\s*Default\s*\|/i.test(header)
    const seen = new Set()
    for (const row of spec.props) {
      const where = row.part ? `${row.part} ${row.prop || '(no name)'}` : row.prop || '(no name)'
      if (!row.prop) problems.push(`a ${section.heading} row has an empty prop name`)
      if (!unquote(row.type)) problems.push(`${where}: empty type`)
      if (hasDefault && (row.default ?? '').trim() === '') problems.push(`${where}: empty Default cell (write — for none)`)
      for (const one of splitRow(row)) {
        if (one.prop && !/^[A-Za-z][A-Za-z0-9-]*$/.test(one.prop)) problems.push(`${where}: "${one.prop}" is not one prop name`)
        const key = `${one.part ?? ''}\u0000${one.prop}`
        if (one.prop && seen.has(key)) problems.push(`${one.part ? `${one.part} ` : ''}${one.prop}: listed twice`)
        seen.add(key)
      }
    }
    if (spec.props.length > 0 && namesOf(spec).length === 0)
      problems.push('no part of the Composition table is rendered or called in its example, so nothing says what to import')
  }

  const impl = spec.sections.find((s) => s.heading === 'Implementations')
  const rows = implementationsOf(spec)
  if (impl && rows.length === 0) problems.push('an Implementations section with no table')
  for (const r of rows) {
    if (!entries.includes(r.entry)) problems.push(`Implementations: "${r.entry}" is not an entry point of the package (${entries.join(', ')})`)
    if (!LABELS.includes(r.status)) problems.push(`Implementations: ${r.entry || '(no entry)'} has status "${r.status}", not one of ${LABELS.join(', ')}`)
  }
  return problems
}

/** One spec, as its components.json entry. */
export function componentOf(file, md, known, core) {
  const spec = parseSpec(md, known)
  const status = statusOf(md)
  const names = namesOf(spec)
  const rows = implementationsOf(spec)
  const imports = rows.length > 0
    ? rows.map((r) => ({ from: r.entry, names, peers: [...new Set(r.dependencies.match(/@[a-z0-9-]+\/[a-z0-9-]+/g) ?? [])].sort(), status: r.status }))
    : [{ from: core, names, peers: [], status: status.label }]
  const props = spec.props.flatMap(splitRow).map((row) => {
    const values = literalsOf(row.type)
    const def = defaultOf(row.default)
    return {
      part: row.part ?? names[0],
      name: row.prop,
      type: unquote(row.type),
      ...(values ? { values } : {}),
      ...(def === undefined ? {} : { default: def }),
      required: /^\*\*Required[.,]/.test(row.notes),
      notes: row.notes,
    }
  })
  return {
    name: spec.title,
    spec: `${SPEC_DIR}/${file}`,
    purpose: spec.intro,
    status: { label: status.label, note: status.note },
    imports,
    whenToUse: sectionOf(spec, 'When to use')?.body ?? '',
    props,
    tokens: [...spec.tokens].sort(),
  }
}

/** The whole file as text, and every problem found on the way, each prefixed with its spec path. */
export function buildComponents() {
  const { core, entries } = manifest()
  const known = knownTokens()
  const files = readdirSync(join(root, SPEC_DIR)).filter((f) => f.endsWith('.md')).sort()
  const problems = []
  const components = []
  for (const file of files) {
    const md = readFileSync(join(root, SPEC_DIR, file), 'utf8')
    for (const p of problemsOf(md, { entries })) problems.push(`${SPEC_DIR}/${file}: ${p}`)
    components.push(componentOf(file, md, known, core))
  }
  components.sort((a, b) => a.name.localeCompare(b.name, 'en'))
  const doc = {
    about: 'Every built Vela component, generated from guidelines/components/*.md by scripts/build-components-json.mjs. Do not edit: change the spec and run npm run components. Each spec is the full contract; this is its index.',
    components,
  }
  return { text: `${JSON.stringify(doc, null, 2)}\n`, problems, components }
}

/**
 * The component-request form with its "Closest existing component" options rewritten: every
 * component name, in components.json's order, between the two marker comments. The options after
 * the block ("None comes close") are the form's own.
 */
export function renderForm(yml, components) {
  const block = /^( *)# generated:closest .*\n(?:\1- .*\n)*?\1# \/generated\n/m
  const m = yml.match(block)
  if (!m) throw new Error(`${FORM}: no "# generated:closest" ... "# /generated" block under the closest options`)
  const indent = m[1]
  const open = m[0].split('\n')[0]
  const rows = components.map((c) => `${indent}- ${c.name}`)
  return yml.replace(block, [open, ...rows, `${indent}# /generated`, ''].join('\n'))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { text, problems, components } = buildComponents()
  if (problems.length > 0) {
    console.error(`components.json: ${problems.length} spec problem${problems.length === 1 ? '' : 's'}\n${problems.map((p) => `  ${p}`).join('\n')}`)
    process.exit(1)
  }
  writeFileSync(join(root, OUT), text)
  const form = readFileSync(join(root, FORM), 'utf8')
  writeFileSync(join(root, FORM), renderForm(form, components))
  console.log(`  wrote ${OUT}: ${components.length} components, and the closest-component options in ${FORM}`)
}
