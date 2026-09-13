import type { ReactNode } from 'react'
import { cells } from './spec'

// Just enough markdown for the specs: headings, paragraphs, lists, tables, fenced code,
// inline code and bold. No dependency, no HTML injection.
function inline(text: string, key: number): ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean)
  return (
    <span key={key}>
      {parts.map((p, i) =>
        p.startsWith('`') ? <code key={i}>{p.slice(1, -1)}</code>
        : p.startsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong>
        : p.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'),
      )}
    </span>
  )
}

export function Markdown({ source }: { source: string }) {
  const out: ReactNode[] = []
  const lines = source.split('\n')
  let i = 0
  let k = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('```')) {
      const buf: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++])
      i++
      out.push(<pre key={k++} className="pg-code">{buf.join('\n')}</pre>)
    } else if (line.startsWith('|')) {
      const rows: string[][] = []
      while (i < lines.length && lines[i].startsWith('|')) rows.push(cells(lines[i++]))
      const [head, , ...body] = rows
      out.push(
        <div key={k++} className="pg-tablewrap">
          <table className="pg-table">
            <thead><tr>{head.map((h, j) => <th key={j}>{inline(h, j)}</th>)}</tr></thead>
            <tbody>{body.map((r, j) => <tr key={j}>{r.map((c, m) => <td key={m}>{inline(c, m)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      )
    } else if (/^- /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^- /.test(lines[i])) {
        let item = lines[i++].slice(2)
        while (i < lines.length && /^  \S/.test(lines[i])) item += ' ' + lines[i++].trim()
        items.push(item)
      }
      out.push(<ul key={k++} className="pg-list">{items.map((it, j) => <li key={j}>{inline(it, j)}</li>)}</ul>)
    } else if (/^#{1,4} /.test(line)) {
      out.push(<h4 key={k++} className="pg-h">{line.replace(/^#+ /, '')}</h4>)
      i++
    } else if (line.trim() === '') {
      i++
    } else {
      const buf: string[] = []
      while (i < lines.length && lines[i].trim() !== '' && !/^(\||- |```|#)/.test(lines[i])) buf.push(lines[i++])
      out.push(<p key={k++} className="pg-p">{inline(buf.join(' '), 0)}</p>)
    }
  }
  return <>{out}</>
}
