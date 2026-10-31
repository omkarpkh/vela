import { FOUNDATIONS } from '../nav'
import { Markdown } from '../playground/Markdown'
// The Markdown renderer's code blocks and tables are styled there (`.pg-code`, `.pg-tablewrap`). Without
// it, a page opened directly, before any playground page, drew a long code line past the window.
import '../playground.css'

export function Foundation({ id }: { id: string }) {
  const f = FOUNDATIONS.find((x) => x.id === id)
  if (!f) return <p className="vela-body">No foundation called “{id}”.</p>
  const body = f.md.replace(/^# .+\n/, '')
  return (
    <article className="doc">
      <header className="page-head">
        <p className="vela-meta page-head__eyebrow">{f.kind}</p>
        <h1 className="vela-h2">{f.title}</h1>
      </header>
      <div className="doc__body"><Markdown source={body} /></div>
    </article>
  )
}
