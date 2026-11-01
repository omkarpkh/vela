import type { ReactNode } from 'react'
import { cells } from './spec'
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

/**
 * `top` is the element a `## ` heading becomes. Inside a playground tab, an `h2` already heads the
 * tab, so `## ` is an `h3` (the default). On a page of its own (a foundation), the page's `h1` is
 * the only heading above, so `## ` is an `h2` and the levels don't skip (axe: heading-order).
 */
export function Markdown({ source, top = 'h3', em = false }: { source: string; top?: 'h2' | 'h3'; em?: boolean }) {
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
      while (i < lines.length && lines[i].startsWith('|')) rows.push(cells(lines[i++]))
      const [head, , ...body] = rows
      out.push(
        <ScrollRegion key={k++} label={`${head[0] ? head[0].replace(/[`*]/g, '') + ' table' : 'Table'}, scrollable`} className="pg-tablewrap">
          <table className="pg-table">
            <thead><tr>{head.map((h, j) => <th key={j}>{inline(h, j)}</th>)}</tr></thead>
            <tbody>{body.map((r, j) => <tr key={j}>{r.map((c, m) => <td key={m}>{inline(c, m, em)}</td>)}</tr>)}</tbody>
          </table>
        </ScrollRegion>,
      )
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
      out.push(level <= 1 ? <h2 key={k++} className="vela-h3 pg-h1">{text}</h2>
        : level === 2 ? <H2 key={k++} className="vela-h4 pg-h2">{text}</H2>
        : <H3 key={k++} className="pg-h">{text}</H3>)
      i++
    } else if (line.trim() === '') {
      i++
    } else {
      const buf: string[] = []
      while (i < lines.length && lines[i].trim() !== '' && !/^(\||- |```|#)/.test(lines[i])) buf.push(lines[i++])
      out.push(<p key={k++} className="pg-p">{inline(buf.join(' '), 0, em)}</p>)
    }
  }
  return <>{out}</>
}
