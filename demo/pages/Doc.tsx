import { Markdown } from '../playground/Markdown'
import changelogMd from '../../CHANGELOG.md?raw'
import contributingMd from '../../CONTRIBUTING.md?raw'
import accessibilityMd from '../../ACCESSIBILITY.md?raw'
import roadmapMd from '../../ROADMAP.md?raw'

// Project documents rendered from the same markdown the repository ships, so the site cannot
// say something the repo does not. Each one is a route (#/changelog, #/contributing, …).
export const DOCS = [
  { id: 'changelog', eyebrow: 'Record', title: 'Changelog', md: changelogMd },
  { id: 'roadmap', eyebrow: 'Plan', title: 'Roadmap', md: roadmapMd },
  { id: 'contributing', eyebrow: 'Project', title: 'Contributing', md: contributingMd },
  { id: 'accessibility', eyebrow: 'Project', title: 'Accessibility', md: accessibilityMd },
] as const

export type DocId = (typeof DOCS)[number]['id']
export const isDocId = (id: string): id is DocId => DOCS.some((d) => d.id === id)

export function Doc({ id }: { id: DocId }) {
  const d = DOCS.find((x) => x.id === id)!
  const body = d.md.replace(/^# .+\n/, '')
  return (
    <article className="doc">
      <header className="page-head">
        <p className="vela-meta page-head__eyebrow">{d.eyebrow}</p>
        <h1 className="vela-h2">{d.title}</h1>
      </header>
      <div className="doc__body"><Markdown source={body} /></div>
    </article>
  )
}
