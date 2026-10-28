import { REGISTRY } from '../playground/registry'
import { href } from '../router'
import { figmaUrl } from '../links'
import { version } from '../../package.json'

// Component lifecycle, read from the specs. GOVERNANCE.md: Approved is the default and is not
// written down; any other label is a `**Status:**` line under the intent paragraph. This page
// shows the label the spec carries, so the site and the spec cannot disagree.
type Label = 'Approved' | 'Known bugs' | 'Experimental' | 'Retired'
const LABELS: Label[] = ['Approved', 'Known bugs', 'Experimental', 'Retired']

function statusOf(spec: string): { label: Label; note: string } {
  const m = spec.match(/^\*\*Status:\*\*\s*([^\n]+?)(?:\s+[—-]\s+([\s\S]*?))?\n\n/m)
  if (!m) return { label: 'Approved', note: '' }
  const word = LABELS.find((l) => m[1].trim().toLowerCase().startsWith(l.toLowerCase()))
  return { label: word ?? 'Approved', note: (m[2] ?? '').replace(/`/g, '').replace(/\s+/g, ' ').trim() }
}

const PROMISE: Record<Label, string> = {
  Approved: 'Semver applies in full; breaking changes follow VERSIONING.md.',
  'Known bugs': 'Safe to use; the defects are linked from the spec and fixed in a patch.',
  Experimental: 'May change in a minor release without a deprecation window.',
  Retired: 'Stays two minors with a dev-only warning, then is deleted; the spec names the replacement.',
}

export function Status() {
  const rows = REGISTRY.map((e) => ({ id: e.id, name: e.name, ...statusOf(e.spec) }))
  const counts = LABELS.map((l) => [l, rows.filter((r) => r.label === l).length] as const).filter(([, n]) => n > 0)
  return (
    <article className="doc">
      <header className="page-head">
        <p className="vela-meta page-head__eyebrow">Record</p>
        <h1 className="vela-h2">Component status</h1>
        <p className="vela-meta">
          @omkarux/vela {version} · {rows.length} components · {counts.map(([l, n]) => `${n} ${l}`).join(' · ')} · labels are read from each spec, see GOVERNANCE.md
        </p>
      </header>
      <div className="doc__body">
        <table className="status-table">
          <thead>
            <tr><th scope="col">Component</th><th scope="col">Status</th><th scope="col">What it promises</th><th scope="col">Where</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <th scope="row"><a href={href({ kind: 'component', id: r.id })}>{r.name}</a></th>
                <td><span className={`status-label status-label--${r.label.toLowerCase().replace(/\s+/g, '-')}`}>{r.label}</span>{r.note && <span className="vela-meta status-note">{r.note}</span>}</td>
                <td className="vela-meta">{PROMISE[r.label]}</td>
                <td className="vela-meta"><a href={`https://github.com/omkarpkh/vela/blob/main/guidelines/components/${r.id}.md`}>spec</a> · <a href={figmaUrl()}>Figma</a></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="vela-meta">
          Approved means specced, built, tested, in the Figma library, every rule tagged and proved. The first component to leave Approved
          carries its label in the spec, in the Figma set's description and here, from the same line.
        </p>
      </div>
    </article>
  )
}
