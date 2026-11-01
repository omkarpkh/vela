import { Fragment, type ReactNode } from 'react'
import { cells } from './spec'
import { undash } from './rules-read'
import { ScrollRegion } from '../shell/ScrollRegion'

// Just enough markdown for the specs: headings, paragraphs, lists, tables, fenced code,
// inline code and bold. No dependency, no HTML injection.
// `[[rule: id | enforcement]]` tags a spec rule for scripts/check-rules.mjs. It is metadata for
// the gate, not prose, so it never reaches the page. (An HTML comment would have rendered
// literally here — this renderer has no HTML pass, on purpose.)
export const RULE_TAG = /\s*\[\[rule:[^\]]*\]\]/g

/**
 * Inline markdown: code, bold (with code inside it), and links as their words. `em` also reads
 * single-asterisk emphasis; only pages that ask for it get it, because a lone `*` in a spec (a glob,
 * a footnote) is not emphasis.
 */
export function inline(text: string, key: number, em = false): ReactNode {
  // The tag's id stays as data on the text it closes, so "Open proof" can land on that rule.
  const ids = [...text.matchAll(/\[\[rule:\s*([^|\]]+?)\s*\|/g)].map((m) => m[1])
  const parts = text.replace(RULE_TAG, '').split(em ? /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g : /(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean)
  return (
    <span key={key} data-rule={ids.length ? ids.join(' ') : undefined}>
      {parts.map((p, i) =>
        p.startsWith('`') ? <code key={i}>{p.slice(1, -1)}</code>
        : p.startsWith('**') ? <strong key={i}>{p.slice(2, -2).split(/(`[^`]+`)/g).map((q, j) => (q.startsWith('`') ? <code key={j}>{q.slice(1, -1)}</code> : q))}</strong>
        : em && /^\*[^*]/.test(p) && p.endsWith('*') && p.length > 2 ? <em key={i}>{p.slice(1, -1)}</em>
        : p.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'),
      )}
    </span>
  )
}

/** Where a link in a repository document points: a full URL as it is, a repo path on GitHub. */
export function linkHref(target: string, base: string): string {
  if (/^(https?:|mailto:|#)/.test(target)) return target
  const path = target.replace(/^\.\//, '')
  return `${base}/${path}`
}

/** The id a document heading takes, `section-<slug>`: the section index's target and the address's `?section=`. */
export const slugOf = (heading: string) =>
  heading.toLowerCase().replace(/`|\*\*/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/**
 * Inline markdown for a repository document (slice 5 of the playground uplift): links are real links,
 * whatever their words hold, and the words go through the display layer (`undash`), so no dash, no
 * bracket and no asterisk reaches the reader.
 */
export function docInline(text: string, key: number, base: string): ReactNode {
  // Code first, kept whole (double backticks too, and a rule tag written as code), so nothing inside it
  // is read as a link, emphasis or a dash; it comes back at the end, character for character.
  const codes: string[] = []
  // A span opens and closes on runs of the same number of backticks (CommonMark), so ` ```tsx ` is code.
  const t = undash(text.replace(/(?<!`)(`+)(?!`)(.+?)(?<!`)\1(?!`)/g, (_m, _run: string, body: string) => {
    codes.push(/^ .* $/.test(body) && body.trim() ? body.slice(1, -1) : body)
    return `\u0000${codes.length - 1}\u0000`
  }).replace(RULE_TAG, ''))
  const runs = (s: string): ReactNode[] => s.split(/\u0000(\d+)\u0000/).map((p, i) => (i % 2 ? <code key={`c${i}`}>{codes[Number(p)]}</code> : p))
  const marks = (s: string): ReactNode[] => s.split(/(\*\*[^*]+?\*\*|\*[^*\s][^*]*?\*)/g).filter(Boolean).map((p, i) =>
    p.length > 4 && p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{runs(p.slice(2, -2))}</strong>
    : p.length > 2 && /^\*[^*]/.test(p) && p.endsWith('*') ? <em key={i}>{runs(p.slice(1, -1))}</em>
    : <Fragment key={i}>{runs(p)}</Fragment>)
  const parts = t.split(/(\[[^\]]+\]\([^)\s]+\))/g).filter(Boolean)
  return (
    <span key={key}>
      {parts.map((p, i) => {
        const m = p.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)
        return m ? <a key={i} href={linkHref(m[2], base)}>{marks(m[1])}</a> : <Fragment key={i}>{marks(p)}</Fragment>
      })}
    </span>
  )
}

/** A table row's cells, where a pipe inside a code span stays in its cell. */
export function docCells(line: string): string[] {
  const out: string[] = ['']
  let tick = 0
  const row = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  for (let i = 0; i < row.length; i++) {
    const c = row[i]
    if (c === '`') {
      let n = 1
      while (row[i + n] === '`') n++
      tick = tick === 0 ? n : tick === n ? 0 : tick
      out[out.length - 1] += row.slice(i, i + n)
      i += n - 1
    } else if (c === '|' && tick === 0 && row[i - 1] !== '\\') out.push('')
    else out[out.length - 1] += c
  }
  return out.map((c) => c.replace(/\\\|/g, '|').trim())
}

/** A bullet list with one level of nesting: `- ` items, `  - ` sub-items, and indented continuations. */
function readList(lines: string[], from: number): { items: { text: string; sub: string[] }[]; next: number } {
  const items: { text: string; sub: string[] }[] = []
  let i = from
  while (i < lines.length) {
    const line = lines[i]
    if (/^- /.test(line)) items.push({ text: line.slice(2), sub: [] })
    else if (/^ {2}- /.test(line) && items.length) items[items.length - 1].sub.push(line.slice(4))
    else if (/^ {4,}\S/.test(line) && items.length && items[items.length - 1].sub.length) {
      const sub = items[items.length - 1].sub
      sub[sub.length - 1] += ' ' + line.trim()
    } else if (/^ {2,}\S/.test(line) && items.length) items[items.length - 1].text += ' ' + line.trim()
    else break
    i++
  }
  return { items, next: i }
}

/**
 * `top` is the element a `## ` heading becomes. Inside a playground tab, an `h2` already heads the
 * tab, so `## ` is an `h3` (the default). On a page of its own (a foundation), the page's `h1` is
 * the only heading above, so `## ` is an `h2` and the levels don't skip (axe: heading-order).
 */
export function Markdown({ source, top = 'h3', em = false, doc }: { source: string; top?: 'h2' | 'h3'; em?: boolean; doc?: { base: string } }) {
  const out: ReactNode[] = []
  const lines = source.split('\n')
  let i = 0
  let k = 0
  // Each scrollable code block is its own region, so each needs its own name (axe: landmark-unique).
  let codes = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('```')) {
      const buf: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++])
      i++
      out.push(<ScrollRegion key={k++} as="pre" label={++codes === 1 ? 'Code, scrollable' : `Code ${codes}, scrollable`} className="pg-code">{buf.join('\n')}</ScrollRegion>)
    } else if (line.startsWith('|')) {
      const rows: string[][] = []
      while (i < lines.length && lines[i].startsWith('|')) rows.push(doc ? docCells(lines[i++]) : cells(lines[i++]))
      const [head, , ...body] = rows
      out.push(
        <ScrollRegion key={k++} label={`${head[0] ? head[0].replace(/[`*]/g, '') + ' table' : 'Table'}, scrollable`} className="pg-tablewrap">
          <table className="pg-table">
            <thead><tr>{head.map((h, j) => <th key={j}>{doc ? docInline(h, j, doc.base) : inline(h, j)}</th>)}</tr></thead>
            <tbody>{body.map((r, j) => <tr key={j}>{r.map((c, m) => <td key={m}>{doc ? docInline(c, m, doc.base) : inline(c, m, em)}</td>)}</tr>)}</tbody>
          </table>
        </ScrollRegion>,
      )
    } else if (doc && /^- /.test(line)) {
      const { items, next } = readList(lines, i)
      i = next
      out.push(
        <ul key={k++} className="pg-list">
          {items.map((it, j) => (
            <li key={j}>
              {docInline(it.text, j, doc.base)}
              {it.sub.length > 0 && <ul className="pg-list pg-list--sub">{it.sub.map((t, n) => <li key={n}>{docInline(t, n, doc.base)}</li>)}</ul>}
            </li>
          ))}
        </ul>,
      )
    } else if (doc && /^\d+\. /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        let item = lines[i++].replace(/^\d+\. /, '')
        while (i < lines.length && /^ {2,}\S/.test(lines[i])) item += ' ' + lines[i++].trim()
        items.push(item)
      }
      out.push(<ol key={k++} className="pg-list">{items.map((it, j) => <li key={j}>{docInline(it, j, doc.base)}</li>)}</ol>)
    } else if (/^- /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^- /.test(lines[i])) {
        let item = lines[i++].slice(2)
        while (i < lines.length && /^  \S/.test(lines[i])) item += ' ' + lines[i++].trim()
        items.push(item)
      }
      out.push(<ul key={k++} className="pg-list">{items.map((it, j) => <li key={j}>{inline(it, j, em)}</li>)}</ul>)
    } else if (/^#{1,4} /.test(line)) {
      const level = line.match(/^#+/)![0].length
      const text = line.replace(/^#+ /, '')
      const H2 = top, H3 = top === 'h2' ? 'h3' : 'h4'
      if (doc) {
        // A document's heading: its words through the display layer, a version's brackets gone, and an id the index can reach.
        const words = docInline(text.replace(/^\[([^\]]+)\](?!\()/, '$1'), 0, doc.base)
        const id = level === 2 ? `section-${slugOf(text)}` : undefined
        out.push(level <= 1 ? <h2 key={k++} className="vela-h3 pg-h1">{words}</h2>
          : level === 2 ? <H2 key={k++} id={id} className="vela-h4 pg-h2">{words}</H2>
          : <H3 key={k++} className="pg-h">{words}</H3>)
        i++
        continue
      }
      out.push(level <= 1 ? <h2 key={k++} className="vela-h3 pg-h1">{text}</h2>
        : level === 2 ? <H2 key={k++} className="vela-h4 pg-h2">{text}</H2>
        : <H3 key={k++} className="pg-h">{text}</H3>)
      i++
    } else if (line.trim() === '') {
      i++
    } else {
      const buf: string[] = []
      while (i < lines.length && lines[i].trim() !== '' && !/^(\||- |```|#)/.test(lines[i]) && !(doc && /^\d+\. /.test(lines[i]))) buf.push(lines[i++])
      out.push(<p key={k++} className="pg-p">{doc ? docInline(buf.join(' '), 0, doc.base) : inline(buf.join(' '), 0, em)}</p>)
    }
  }
  return <>{out}</>
}
