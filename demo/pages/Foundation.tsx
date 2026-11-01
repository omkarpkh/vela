import { FOUNDATIONS } from '../nav'
import { Markdown } from '../playground/Markdown'
import { LINKS } from '../links'
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
      {/* A contract is read as a document (slice 5 of the playground uplift): links are links and no dash
          or markdown mark reaches the page. The foundations proper are redrawn in slice 6. */}
      <div className="doc__body"><Markdown source={body} top="h2" doc={f.kind === 'Contract' ? { base: `${LINKS.github}/blob/main/guidelines/contracts` } : undefined} /></div>
    </article>
  )
}
