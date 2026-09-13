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

const tableRows = (body: string) => {
  const lines = body.split('\n').filter((l) => l.trim().startsWith('|'))
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
    let part = ''
    for (const r of rows) {
      if (hasPart) {
        if (r[0]) part = unquote(r[0])
        props.push({ part, prop: unquote(r[1]), type: r[2] ?? '', notes: r[3] ?? '' })
      } else {
        props.push({ prop: unquote(r[0]), type: r[1] ?? '', default: r[2], notes: r[3] ?? '' })
      }
    }
  }
  // Composition tables describe several parts; only the root part's props are controls.
  const controls = props
    .filter((r) => !r.part || r.part === title)
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
