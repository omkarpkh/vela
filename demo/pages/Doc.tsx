import { useEffect, useState } from 'react'
import { Markdown } from '../playground/Markdown'

// Project documents rendered from the same markdown the repository ships, so the site cannot
// say something the repo does not. Each one is a route (#/changelog, #/contributing, …).
// Each document is loaded when its page opens, as the Proposal pages' specs are, so the
// changelog and the rest do not ride in the main bundle (the build's chunk-size warning must
// not grow).
const LOADERS = import.meta.glob<string>(['../../CHANGELOG.md', '../../CONTRIBUTING.md', '../../ACCESSIBILITY.md', '../../ROADMAP.md'], { query: '?raw', import: 'default' })

export const DOCS = [
  { id: 'changelog', eyebrow: 'Record', title: 'Changelog', file: '../../CHANGELOG.md' },
  { id: 'roadmap', eyebrow: 'Plan', title: 'Roadmap', file: '../../ROADMAP.md' },
  { id: 'contributing', eyebrow: 'Project', title: 'Contributing', file: '../../CONTRIBUTING.md' },
  { id: 'accessibility', eyebrow: 'Project', title: 'Accessibility', file: '../../ACCESSIBILITY.md' },
] as const

export type DocId = (typeof DOCS)[number]['id']
export const isDocId = (id: string): id is DocId => DOCS.some((d) => d.id === id)

export function Doc({ id }: { id: DocId }) {
  const d = DOCS.find((x) => x.id === id)!
  const [body, setBody] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    setBody(null)
    LOADERS[d.file]?.().then((md) => { if (live) setBody(md.replace(/^# .+\n/, '')) })
    return () => { live = false }
  }, [d.file])
  return (
    <article className="doc">
      <header className="page-head">
        <p className="vela-meta page-head__eyebrow">{d.eyebrow}</p>
        <h1 className="vela-h2">{d.title}</h1>
      </header>
      <div className="doc__body" aria-busy={body === null ? true : undefined}>
        {body !== null && <Markdown source={body} />}
      </div>
    </article>
  )
}
