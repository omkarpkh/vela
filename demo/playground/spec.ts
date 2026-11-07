/**
 * Reads a component spec (guidelines/components/*.md) into the pieces the playground
 * renders: the Props table becomes the controls, the token names become the token pane,
 * the sections become the rules. The spec is the contract; the playground is one more
 * thing generated from it. Nothing here is hand-listed per component.
 */
export type ControlKind = 'select' | 'boolean' | 'text'
export interface Control {
  prop: string
  kind: ControlKind
  type: string
  options?: string[]
  default?: string | boolean
  notes: string
}
export interface PropRow { part?: string; prop: string; type: string; default?: string; notes: string }
export interface Section { heading: string; body: string }
export interface Spec {
  title: string
  intro: string
  sections: Section[]
  props: PropRow[]
  controls: Control[]
  tokens: string[]
  /** Token bindings table, keyed by its first column (e.g. "primary · filled"). */
  bindings: Record<string, Record<string, string>>
}

const unquote = (s: string) => s.replace(/`/g, '').trim()
// Split a markdown table row on unescaped pipes; `\|` inside a cell is a literal pipe.
export const cells = (line: string) =>
  line.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, '|').trim())

// A fenced code block is not a table, even when a line in it starts with a pipe: a TypeScript
// union written one member per line (`  | { name: "github" }`) would otherwise read as prop rows.
export const withoutCode = (body: string) => body.replace(/^\s*```[^\n]*\n[\s\S]*?^\s*```[^\n]*$/gm, '')

const tableRows = (body: string) => {
  const lines = withoutCode(body).split('\n').filter((l) => l.trim().startsWith('|'))
  if (lines.length < 2) return { header: [] as string[], rows: [] as string[][] }
  const header = cells(lines[0])
  const rows = lines.slice(2).map(cells) // slice(2) skips the |---| separator
  return { header, rows }
}

export function sectionOf(spec: Spec, heading: string): Section | undefined {
  return spec.sections.find((s) => s.heading.toLowerCase().startsWith(heading.toLowerCase()))
}

function controlFor(row: PropRow): Control | null {
  const type = unquote(row.type)
  const literals = [...type.matchAll(/"([^"]+)"/g)].map((m) => m[1])
  const def = row.default === undefined || row.default === '—' ? undefined : unquote(row.default).replace(/^"|"$/g, '')
  const base = { prop: row.prop, type, notes: row.notes }
  if (literals.length >= 2 && type.replace(/"[^"]+"/g, '').replace(/[\s|]/g, '') === '')
    return { ...base, kind: 'select', options: literals, default: def }
  if (type === 'boolean') return { ...base, kind: 'boolean', default: def === 'true' }
  if (type === 'string') return { ...base, kind: 'text', default: def }
  if (type === 'ReactNode' && row.prop === 'children') return { ...base, kind: 'text', default: def }
  if (type === 'ReactNode' && row.prop === 'icon') return { ...base, kind: 'boolean', default: false }
  return null
}

export function parseSpec(md: string, known: readonly string[] = []): Spec {
  const title = (md.match(/^# (.+)$/m)?.[1] ?? 'Component').trim()
  const afterTitle = md.split(/^# .+$/m)[1] ?? ''
  const intro = afterTitle.trim().split(/\n\s*\n/)[0]?.replace(/\n/g, ' ').trim() ?? ''

  const sections: Section[] = []
  for (const chunk of md.split(/^## /m).slice(1)) {
    const nl = chunk.indexOf('\n')
    sections.push({ heading: chunk.slice(0, nl).trim(), body: chunk.slice(nl + 1).trim() })
  }

  const propsSection = sections.find((s) => s.heading === 'Props' || s.heading === 'Composition')
  const props: PropRow[] = []
  if (propsSection) {
    const { header, rows } = tableRows(propsSection.body)
    const hasPart = header[0]?.toLowerCase() === 'part'
    // A Composition table may carry a Default column (Checkbox, Radio Group and Tabs do).
    const defaultCol = hasPart ? header.findIndex((h) => h.toLowerCase() === 'default') : -1
    let part = ''
    for (const r of rows) {
      if (hasPart) {
        if (r[0]) part = unquote(r[0])
        const notes = r[defaultCol > 0 ? defaultCol + 1 : 3] ?? ''
        props.push({ part, prop: unquote(r[1]), type: r[2] ?? '', default: defaultCol > 0 ? r[defaultCol] : undefined, notes })
      } else {
        props.push({ prop: unquote(r[0]), type: r[1] ?? '', default: r[2], notes: r[3] ?? '' })
      }
    }
  }
  // Composition tables describe several parts; only the root part's props are controls. The root
  // part is written as code (`RadioGroup`) and the title as words ("Radio Group"); compare without spaces.
  const compact = (s: string) => s.replace(/\s+/g, '')
  const controls = props
    .filter((r) => !r.part || compact(r.part) === compact(title))
    .map(controlFor)
    .filter((c): c is Control => c !== null)

  // A spec may write a pattern (`--vela-bg-severity-{severity}`): the scan expands a trailing-dash
  // prefix against the known token names, so the pane lists every token the pattern stands for.
  const found = md.match(/--vela-[a-z0-9-]+/g) ?? []
  const tokens = [...new Set(found.flatMap((t) => (t.endsWith('-') ? known.filter((k) => k.startsWith(t)) : [t])))]

  const bindings: Record<string, Record<string, string>> = {}
  const bind = sections.find((s) => s.heading.startsWith('Token bindings'))
  if (bind) {
    const { header, rows } = tableRows(bind.body)
    for (const r of rows) {
      const key = unquote(r[0])
      bindings[key] = Object.fromEntries(header.slice(1).map((h, i) => [h, unquote(r[i + 1] ?? '')]))
    }
  }
  return { title, intro, sections, props, controls, tokens, bindings }
}

/**
 * The values a Props type cell allows, when the cell is nothing but literals: `"top" | "bottom"`,
 * `1 | 2 | 3`, `true`. Undefined for a free type (`string`, `ReactNode`, a callback, an object, or a
 * mix such as `boolean | "page"`): those are described by the type, not listed. A string-only union
 * of two or more is what `controlFor` makes a select; this reads the same cell for the numbers and
 * single literals the controls leave out (components.json lists them all).
 */
export function literalsOf(typeCell: string): (string | number | boolean)[] | undefined {
  const members = unquote(typeCell).split('|').map((m) => m.trim())
  const values: (string | number | boolean)[] = []
  for (const m of members) {
    if (/^"[^"]*"$/.test(m)) values.push(m.slice(1, -1))
    else if (/^-?\d+(\.\d+)?$/.test(m)) values.push(Number(m))
    else if (m === 'true' || m === 'false') values.push(m === 'true')
    else return undefined
  }
  return values.length > 0 ? values : undefined
}

/**
 * One prop row as one prop per name. A spec may write two names in one row (`value` / `onValueChange`,
 * typed `string` / `(v) => void`) or two parts (`Table.Head` / `Table.Body`). The playground shows the
 * row as written; components.json lists each name on its own, each with its own type when the type
 * cell is split the same way, or the shared type when it is not.
 */
export function splitRow(row: PropRow): PropRow[] {
  const parts = (row.part ?? '').split(/\s+\/\s+/).map((p) => p.trim())
  const names = row.prop.split(/\s+\/\s+/).map((p) => p.trim())
  const types = row.type.split(/(?<=`)\s+\/\s+(?=`)/).map((t) => t.trim())
  const out: PropRow[] = []
  for (const part of parts)
    names.forEach((prop, i) => out.push({ ...row, ...(row.part === undefined ? {} : { part }), prop, type: types.length === names.length ? types[i] : row.type }))
  return out
}

export interface Implementation { entry: string; implementation: string; dependencies: string; status: string }

/** The rows of the spec's `## Implementations` table, by its column names; empty when it has none. */
export function implementationsOf(spec: Spec): Implementation[] {
  const s = spec.sections.find((x) => x.heading === 'Implementations')
  if (!s) return []
  const { header, rows } = tableRows(s.body)
  const col = (name: string) => header.findIndex((h) => h.toLowerCase() === name)
  const [e, i, d, st] = [col('entry point'), col('implementation'), col('dependencies'), col('status')]
  return rows.map((r) => ({
    entry: unquote(r[e] ?? ''),
    implementation: r[i] ?? '',
    dependencies: r[d] ?? '',
    status: unquote(r[st] ?? '').replace(/\*/g, ''),
  }))
}

/** Prints a JSX call for the current control values, omitting defaults and empties. */
export function printJsx(
  name: string,
  values: Record<string, string | boolean | undefined>,
  defaults: Record<string, string | boolean | undefined>,
  children?: string,
  raw: Record<string, string> = {},
): string {
  const attrs: string[] = []
  for (const [k, v] of Object.entries(values)) {
    if (k === 'children' || v === undefined || v === '' || v === false || v === defaults[k]) continue
    attrs.push(typeof v === 'boolean' ? k : `${k}="${v}"`)
  }
  for (const [k, v] of Object.entries(raw)) attrs.push(`${k}={${v}}`)
  const head = `<${name}${attrs.length ? ' ' + attrs.join(' ') : ''}`
  const body = children?.trim()
  return body ? `${head}>\n  ${body}\n</${name}>` : `${head} />`
}
