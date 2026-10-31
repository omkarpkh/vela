/**
 * The Rules tab, from the proof map (playground spec, section 8; slice 4).
 *
 * `npm run proofs` (scripts/check-rules.mjs --write) writes one JSON file per component: each rule's
 * id, level and sentence, the file and line of its proof, and for a compiler rule its fixture and the
 * compiler's own error. The page fetches the file for the component being read (B8). Until it
 * arrives, or if it can't, the tab shows the spec's own text, as before.
 *
 * - A "Show" row filters by level. Rules are grouped by level, in the order the guarantees weaken.
 * - Each rule: its sentence, its enforcement tag (a label, never a control), and a separate action:
 *   "Try to break it" for a compiler rule, "Open proof" for a runtime or browser rule.
 * - Proof links point at the file and line at the commit the page was built from (A19).
 * - The compiler's error is a neutral code block, never in error colours (A14).
 */
import { useEffect, useId, useState } from 'react'
import { version } from '../../package.json'
import { Segments } from '../shell/Segments'
import { Markdown } from './Markdown'
import { dateWords } from './facts'

export type ProofLevel = 'compiler' | 'runtime' | 'browser' | 'convention'
export interface ProofRule {
  id: string
  level: ProofLevel
  sentence: string
  proof: { file: string; line: number } | null
  fixture?: { name: string; snippet: string; error: string }
}
export interface ProofMap { spec: string; typescript: string; rules: ProofRule[] }

/** The four groups, in the order the guarantees weaken, with what each tag and line says. */
export const GROUPS: { level: ProofLevel; heading: string; tag: string; checked: string }[] = [
  { level: 'compiler', heading: 'Enforced by the compiler', tag: 'Enforced by compiler', checked: 'Checked against the types in the source and in the shipped package.' },
  { level: 'runtime', heading: 'Checked at runtime', tag: 'Enforced by unit test', checked: 'Checked by a unit test.' },
  { level: 'browser', heading: 'Proved in a real browser', tag: 'Enforced by browser test', checked: 'Checked by a Playwright test in Chromium.' },
  { level: 'convention', heading: 'Conventions', tag: 'convention', checked: '' },
]

/** The proof map for one component, fetched when its page is read; `settled` once it came or failed. */
export function useProofs(id: string): { map: ProofMap | null; settled: boolean } {
  const [state, setState] = useState<{ map: ProofMap | null; settled: boolean }>({ map: null, settled: false })
  useEffect(() => {
    let live = true
    fetch(`${import.meta.env.BASE_URL}proofs/${id}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((m: ProofMap | null) => { if (live) setState({ map: m && Array.isArray(m.rules) ? m : null, settled: true }) })
      .catch(() => { if (live) setState({ map: null, settled: true }) })
    return () => { live = false }
  }, [id])
  return state
}

/** "src/components/Tabs/Tabs.test.tsx, line 159, at f3d8844", and the link to that line. */
export function proofAt(proof: { file: string; line: number }, commit: string) {
  const ref = /^[0-9a-f]{7,40}$/.test(commit) ? commit : 'main'
  return {
    words: `${proof.file}, line ${proof.line}, at ${ref}`,
    href: `https://github.com/omkarpkh/vela/blob/${ref}/${proof.file}#L${proof.line}`,
  }
}

function Rule({ r, commit, typescript }: { r: ProofRule; commit: string; typescript: string }) {
  const [open, setOpen] = useState(false)
  const panel = useId()
  const group = GROUPS.find((g) => g.level === r.level)!
  const at = r.proof ? proofAt(r.proof, commit) : null
  return (
    <li className="pg-rule" data-rule={r.id}>
      <div className="pg-rule__sentence"><Markdown source={r.sentence} /></div>
      <div className="pg-rule__meta">
        <span className="site-tag">{group.tag}</span>
        <code className="pg-rule__id">{r.id}</code>
        {r.level === 'compiler' && r.fixture && (
          <button type="button" className="pg-rule__action" aria-expanded={open} aria-controls={panel} onClick={() => setOpen((o) => !o)}>
            Try to break it
          </button>
        )}
        {(r.level === 'runtime' || r.level === 'browser') && at && (
          <a className="pg-rule__action" href={at.href}>Open proof</a>
        )}
      </div>
      {r.level !== 'convention' && at && (
        <p className="pg-rule__where">{group.checked} Proof: <a href={at.href}>{at.words}</a>.</p>
      )}
      {r.level === 'compiler' && r.fixture && (
        <div id={panel} className="pg-rule__try" hidden={!open}>
          <p className="pg-rule__label">The fixture:</p>
          <pre className="pg-rule__code">{r.fixture.snippet}</pre>
          <p className="pg-rule__label">What the compiler says if this rule is broken (TypeScript {typescript}):</p>
          <pre className="pg-rule__code">{r.fixture.error}</pre>
        </div>
      )}
    </li>
  )
}

export function RulesFromProofs({ map, commit, built, intro }: { map: ProofMap; commit: string; built: string | undefined; intro?: string }) {
  const [show, setShow] = useState<'all' | ProofLevel>('all')
  const counts = GROUPS.map((g) => ({ ...g, count: map.rules.filter((r) => r.level === g.level).length })).filter((g) => g.count > 0)
  const words = (l: ProofLevel) => (l === 'browser' ? 'browser test' : l)
  const ref = /^[0-9a-f]{7,40}$/.test(commit) ? `commit ${commit}` : 'an unknown commit'
  return (
    <div className="pg-proofs">
      {intro && <div className="pg-proofs__intro"><Markdown source={intro} /></div>}
      <p className="pg-proofs__built">
        Every proof below passed in the build that published this page: {[version, ref, dateWords(built)].filter(Boolean).join(', ')}.
      </p>
      <div className="pg-proofs__show">
        <span className="pg-toolbar__label" aria-hidden="true">Show</span>
        <Segments
          label="Show"
          value={show}
          options={[{ value: 'all', label: `All ${map.rules.length}` }, ...counts.map((g) => ({ value: g.level, label: `${words(g.level)} ${g.count}` }))]}
          onChange={setShow}
        />
      </div>
      {counts.filter((g) => show === 'all' || show === g.level).map((g) => (
        <section key={g.level} className="pg-proofs__group" aria-labelledby={`pg-proofs-${g.level}`}>
          <h2 id={`pg-proofs-${g.level}`} className="vela-h4 pg-h2">{g.heading}</h2>
          {g.level === 'convention' && <p className="pg-proofs__note">Not mechanically enforced. A reviewer checks these; no test can.</p>}
          <ul className="pg-proofs__list">
            {map.rules.filter((r) => r.level === g.level).map((r) => <Rule key={r.id} r={r} commit={commit} typescript={map.typescript} />)}
          </ul>
        </section>
      ))}
    </div>
  )
}
