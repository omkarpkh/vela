/**
 * The Rules tab (playground spec, section 8; slice 2 of the playground uplift, s5-tabs).
 *
 * The rows come from the spec, which ships with the page, so they are on screen at once. The proof
 * file (`npm run proofs`, scripts/check-rules.mjs --write) adds what only the build knows: the file
 * and line of each proof, and for a compiler rule its fixture and the compiler's own words.
 *
 * - A summary: the count, a cell per rule (filled: a machine checks it; outlined: a reviewer does),
 *   and the same counts in words, so forced colours lose nothing (sweep T64).
 * - A ledger by checker, with plain headings. A checker with no rules has no group (T6).
 * - Each row: a picture only where the spec has a real example (a compiler rule's fixture is its
 *   don't; no example, no picture), the rule's one line, its action, and a disclosure with the rest
 *   of its words and its rule id. The rule id is shown nowhere else (Omkar's review, comment 1).
 * - The proof is one link, "See the test on GitHub", to the exact file and line; the visible words
 *   carry no path, line or commit.
 * - Find matches a rule's words and its id; the count is said politely once typing pauses (T9, T53).
 * - A link to a rule (`?rule=<id>`) opens its group, reveals it past "Show N more", tints it and
 *   puts focus on its words (T10, T12); a rule id that no longer exists says so (T11).
 * - The proof file's own states: loading (after a second, "Loading proof…" where the links will be;
 *   T4) and failed (said in words, with Try again; T5).
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { version } from '../../package.json'
import { Button, Icon, cn } from '../../src'
import { Markdown, inline } from './Markdown'
import { CHECKERS, leadOf, plain, plural, ruleMatches, summaryWords, undash, dontsOf, type SpecRule } from './rules-read'
import { SectionIndex, type SectionLink } from '../shell/SectionIndex'
import { Fold, ShowMore, Rest, SHOW_FIRST } from '../shell/Fold'

export type ProofLevel = 'compiler' | 'runtime' | 'browser' | 'convention'
export interface ProofRule {
  id: string
  level: ProofLevel
  sentence: string
  proof: { file: string; line: number } | null
  fixture?: { name: string; snippet: string; error: string }
}
export interface ProofMap { spec: string; typescript: string; rules: ProofRule[] }

export type ProofStatus = 'loading' | 'slow' | 'ready' | 'failed'

/** The proof map for one component: fetched when its page is read, again on Try again. */
export function useProofs(id: string): { map: ProofMap | null; settled: boolean; status: ProofStatus; retry: () => void } {
  const [state, setState] = useState<{ map: ProofMap | null; status: ProofStatus }>({ map: null, status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    setState((s) => (s.map ? s : { map: null, status: 'loading' }))
    // After a second with no file, the proof column says it is still coming (T4).
    const slow = window.setTimeout(() => { if (live) setState((s) => (s.status === 'loading' ? { ...s, status: 'slow' } : s)) }, 1000)
    fetch(`${import.meta.env.BASE_URL}proofs/${id}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((m: ProofMap) => { if (live) setState(m && Array.isArray(m.rules) ? { map: m, status: 'ready' } : { map: null, status: 'failed' }) })
      .catch(() => { if (live) setState({ map: null, status: 'failed' }) })
      .finally(() => window.clearTimeout(slow))
    return () => { live = false; window.clearTimeout(slow) }
  }, [id, attempt])
  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { map: state.map, settled: state.status === 'ready' || state.status === 'failed', status: state.status, retry }
}

/** The link to a proof's file and line, at the commit the page was built from (A19). */
export function proofAt(proof: { file: string; line: number }, commit: string) {
  const ref = /^[0-9a-f]{7,40}$/.test(commit) ? commit : 'main'
  return {
    words: `${proof.file}, line ${proof.line}, at ${ref}`,
    href: `https://github.com/omkarpkh/vela/blob/${ref}/${proof.file}#L${proof.line}`,
  }
}

/** The groups a proof map fills, in order, with their counts. */
export const groupsOf = (rules: { level: ProofLevel }[]) =>
  CHECKERS.map((g) => ({ ...g, count: rules.filter((r) => r.level === g.level).length })).filter((g) => g.count > 0)

/** One "See the test on GitHub", named for its rule so a list of links tells them apart. */
function TestLink({ href, rule }: { href: string; rule: string }) {
  return (
    <a className="pg-rule__test" href={href} target="_blank" rel="noreferrer">
      See the test on GitHub<span className="vela-sr-only">: {rule}</span>
      <Icon name="external-link" size="small" />
    </a>
  )
}

function Row({ r, proof, status, commit, targeted, opened, onOpened }: {
  r: SpecRule; proof: ProofRule | undefined; status: ProofStatus; commit: string
  targeted: boolean; opened: boolean; onOpened: (open: boolean) => void
}) {
  const panel = useId()
  const leadId = useId()
  const { lead, rest } = leadOf(r.sentence)
  const at = proof?.proof ? proofAt(proof.proof, commit) : null
  const fixture = r.level === 'compiler' ? proof?.fixture : undefined
  const waiting = r.level !== 'convention' && !proof && (status === 'slow')
  return (
    <li className={cn('pg-rule', targeted && 'pg-rule--target')} data-rule={r.id} id={`rule-${r.id}`}>
      <div className="pg-rule__row">
        {/* The only picture a rule has today is its fixture: the don't, as written (decision of 1 Nov). */}
        {fixture && (
          <figure className="pg-rule__pics" aria-label={`Don't: ${fixture.snippet}`}>
            <span className="pg-rule__dont" aria-hidden="true">
              <Icon name="x" size="small" />
              <code>{fixture.snippet}</code>
            </span>
          </figure>
        )}
        <p className="pg-rule__lead" id={leadId} tabIndex={-1}>{inline(lead, 0)}</p>
        <span className="pg-rule__act">
          {fixture && (
            <button type="button" className="pg-rule__action" aria-expanded={opened} aria-controls={panel} onClick={() => onOpened(!opened)}>
              {opened ? 'Hide the attempt' : 'Try to break it'}
            </button>
          )}
          {(r.level === 'runtime' || r.level === 'browser') && at && <TestLink href={at.href} rule={plain(lead)} />}
          {waiting && <span className="pg-rule__wait">Loading proof…</span>}
        </span>
        <button
          type="button"
          className="pg-rule__more"
          aria-expanded={opened}
          aria-controls={panel}
          aria-label="More about this rule"
          aria-describedby={leadId}
          onClick={() => onOpened(!opened)}
        >
          <Icon name={opened ? 'chevron-up' : 'chevron-down'} size="small" />
        </button>
      </div>
      <div id={panel} className="pg-rule__detail" hidden={!opened}>
        <div className="pg-rule__text">
          <p className="pg-p"><strong>{inline(lead, 0)}.</strong>{rest ? <> {inline(rest, 1)}</> : null}</p>
          <p className="pg-rule__id">Rule id <code>{r.id}</code></p>
          {r.level === 'compiler' && at && <TestLink href={at.href} rule={plain(lead)} />}
        </div>
        {fixture && (
          <div className="pg-rule__try">
            <p className="pg-rule__label">We tried this</p>
            <pre className="pg-rule__code">{fixture.snippet}</pre>
            <p className="pg-rule__label">The compiler says</p>
            <pre className="pg-rule__code">{compilerWords(fixture.error)}</pre>
          </div>
        )}
      </div>
    </li>
  )
}

/** The compiler's own message, without the scratch file's name and position: only what a reader needs. */
const compilerWords = (error: string) => error.split('\n').map((l) => l.replace(/^\S+\(\d+,\d+\): error TS\d+: /, '')).join('\n')

export interface RulesTabProps {
  name: string
  rules: SpecRule[]
  /** The spec's own sections after the rules: States, Motion, Anti-patterns. */
  sections: { heading: string; body: string }[]
  proofs: ReturnType<typeof useProofs>
  commit: string
  /** `?rule=` on arrival, or "Open proof" from a lock panel. */
  target: string | null
  onTargetDone: () => void
  /** "Search all of Vela for …": opens the site's Search on these words. */
  onSearchAll: (words: string) => void
  /** Read the spec, when it has no tagged rules. */
  specHref: string
  children?: ReactNode
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const SECTION_WORDS: Record<string, { index: string; heading: string }> = {
  'Anti-patterns': { index: "Don'ts", heading: "Don't, and what to do instead" },
}

export function RulesTab({ name, rules, sections, proofs, commit, target, onTargetDone, onSearchAll, specHref, children }: RulesTabProps) {
  const [query, setQuery] = useState('')
  const [said, setSaid] = useState('')
  const [closed, setClosed] = useState<Set<string>>(() => new Set())
  const [more, setMore] = useState<Set<string>>(() => new Set())
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  const [targeted, setTargeted] = useState<string | null>(null)
  const [missing, setMissing] = useState<string | null>(null)
  const missingRef = useRef<HTMLDivElement>(null)
  const findId = useId()
  const byId = useMemo(() => new Map(proofs.map?.rules.map((r) => [r.id, r]) ?? []), [proofs.map])
  const groups = groupsOf(rules)
  const q = query.trim()
  const shown = q ? rules.filter((r) => ruleMatches(r, q)) : rules
  const sum = summaryWords(rules)
  const extra = sections.map((s) => {
    const dont = s.heading.startsWith('Anti-patterns') ? dontsOf(s.body) : null
    const words = SECTION_WORDS[s.heading] ?? { index: s.heading, heading: s.heading }
    return { ...s, id: slug(s.heading), dont, words }
  })

  // The count, said once typing pauses, never per key (sweep, T53 refined).
  useEffect(() => {
    if (!q) { setSaid(''); return }
    const t = window.setTimeout(() => setSaid(`${shown.length} of ${rules.length} rules shown`), 300)
    return () => window.clearTimeout(t)
  }, [q, shown.length, rules.length])

  // A link to one rule: open its group, reveal it, tint it, focus its words. Gone: say so.
  useEffect(() => {
    if (!target) return
    const r = rules.find((x) => x.id === target)
    if (!r) {
      setMissing(target)
      onTargetDone()
      requestAnimationFrame(() => { missingRef.current?.focus(); missingRef.current?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }) })
      return
    }
    setMissing(null)
    setQuery('')
    setClosed((c) => { const n = new Set(c); n.delete(r.level); return n })
    setMore((m) => new Set(m).add(r.level))
    setTargeted(r.id)
    onTargetDone()
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`#rule-${CSS.escape(r.id)} .pg-rule__lead`)
      el?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior })
      el?.focus({ preventScroll: true })
    }))
  }, [target, rules, onTargetDone])

  const index: SectionLink[] = [
    ...groups.map((g) => ({ id: g.level, label: g.index, count: g.count })),
    ...extra.map((s, i) => ({ id: s.id, label: s.words.index, count: s.dont ? s.dont.length : undefined, sep: i === 0 && groups.length > 0 })),
  ]
  const allIds = index.map((s) => s.id)
  const anyOpen = allIds.some((id) => !closed.has(id))
  const setFold = (id: string, isOpen: boolean) => setClosed((c) => { const n = new Set(c); if (isOpen) n.delete(id); else n.add(id); return n })

  const tools = (
    <>
      <label className="pg-find" htmlFor={findId}>
        <span className="pg-find__label">Find a rule</span>
        <span className="pg-find__field">
          <Icon name="search" size="small" />
          <input id={findId} type="search" className="pg-find__input" placeholder="for example, text link" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" spellCheck={false} />
        </span>
      </label>
      <button type="button" className="pg-collapse" onClick={() => setClosed(anyOpen ? new Set(allIds) : new Set())}>
        <Icon name={anyOpen ? 'chevron-up' : 'chevron-down'} size="small" />
        {anyOpen ? 'Collapse all' : 'Expand all'}
      </button>
    </>
  )

  return (
    <>
      <SectionIndex items={index} ready={proofs.settled} tools={tools} />
      <p className="vela-sr-only" role="status">{said}</p>
      <div className="pg-rules">
        {rules.length === 0 ? (
          <div className="pg-empty" data-arrive="1">
            <p className="pg-p">No rules are tagged in this spec yet.</p>
            <p className="pg-p"><a href={specHref}>Read the spec</a></p>
          </div>
        ) : (
          <div className="pg-summary" data-arrive="1">
            <p className="pg-summary__count"><span className="pg-summary__n">{rules.length}</span> {rules.length === 1 ? 'rule' : 'rules'}</p>
            <div className="pg-summary__cells-wrap">
              <span className="pg-summary__cells" aria-hidden="true">
                {[...rules].sort((a, b) => Number(a.level === 'convention') - Number(b.level === 'convention')).map((r) => <span key={r.id} className={cn('pg-summary__cell', r.level !== 'convention' && 'is-machine')} />)}
              </span>
              <p className="pg-summary__words">{sum.words}</p>
            </div>
            {sum.machine > 0 && proofs.status !== 'failed' && (
              <p className="pg-summary__pass">{sum.machine === 1 ? `The machine check passes in ${version}` : `All ${sum.machine} machine checks pass in ${version}`}</p>
            )}
          </div>
        )}

        {proofs.status === 'failed' && (
          <div className="pg-callout" role="status">
            <Icon name="info" size="small" />
            <div>
              <p className="pg-p"><strong>The proof links did not load.</strong> These are the spec's own words; Try to break it and See the test on GitHub come back once they load.</p>
              <Button size="tiny" appearance="hollow" onClick={proofs.retry}>Try again</Button>
            </div>
          </div>
        )}

        {missing && (
          <div className="pg-callout" ref={missingRef} tabIndex={-1}>
            <Icon name="info" size="small" />
            <div>
              <p className="pg-p"><strong>No rule called {missing} on {name}.</strong> It may have been renamed. {rules.length === 1 ? 'The one rule is below.' : `All ${rules.length} are below.`}</p>
              <p className="pg-p"><button type="button" className="pg-linkbutton" onClick={() => onSearchAll(missing)}>Search for it across Vela</button></p>
            </div>
          </div>
        )}

        {q && shown.length === 0 && (
          <div className="pg-nomatch">
            <p className="pg-nomatch__lead">No rule on {name} matches “{q}”.</p>
            <p className="pg-p">Rules are found by their words and their rule id.</p>
            <p className="pg-nomatch__ways">
              <Button size="regular" appearance="hollow" onClick={() => { setQuery(''); document.getElementById(findId)?.focus() }}>Clear the search</Button>
              <button type="button" className="pg-linkbutton" onClick={() => onSearchAll(q)}>Search all of Vela for “{q}”</button>
            </p>
          </div>
        )}

        {groups.map((g) => {
          const all = shown.filter((r) => r.level === g.level)
          if (q && all.length === 0) return null
          const first = q ? all : all.slice(0, SHOW_FIRST)
          const rest = q ? [] : all.slice(SHOW_FIRST)
          const revealed = more.has(g.level)
          const row = (r: SpecRule) => (
            <Row
              key={r.id}
              r={r}
              proof={byId.get(r.id)}
              status={proofs.status}
              commit={commit}
              targeted={targeted === r.id}
              opened={open.has(r.id)}
              onOpened={(o) => setOpen((s) => { const n = new Set(s); if (o) n.add(r.id); else n.delete(r.id); return n })}
            />
          )
          return (
            <Fold
              key={g.level}
              id={g.level}
              heading={all.length === 1 ? g.heading[0] : g.heading[1]}
              count={all.length}
              open={!closed.has(g.level)}
              onOpenChange={(o) => setFold(g.level, o)}
              className="pg-group"
            >
              <ul className="pg-rules__list" data-arrive="3">
                {first.map(row)}
              </ul>
              {rest.length > 0 && (
                <>
                  <Rest as="ul" className="pg-rules__list pg-rules__rest" shown={revealed} onFound={() => setMore((m) => new Set(m).add(g.level))}>
                    {rest.map(row)}
                  </Rest>
                  {!revealed && <ShowMore more={rest.length} onShow={() => setMore((m) => new Set(m).add(g.level))} />}
                </>
              )}
            </Fold>
          )
        })}

        {!q && extra.map((s) => (
          <Fold key={s.id} id={s.id} heading={s.words.heading} count={s.dont ? s.dont.length : undefined} open={!closed.has(s.id)} onOpenChange={(o) => setFold(s.id, o)} className="pg-group">
            {s.dont ? <Donts rows={s.dont} revealed={more.has(s.id)} onReveal={() => setMore((m) => new Set(m).add(s.id))} /> : <Markdown source={undash(s.body)} em />}
          </Fold>
        ))}
        {children}
      </div>
    </>
  )
}

/** "Don't, and what to do instead": a two-column table, six rows, then Show N more. */
function Donts({ rows, revealed, onReveal }: { rows: { dont: string; instead: string }[]; revealed: boolean; onReveal: () => void }) {
  const head = (
    <thead><tr><th scope="col">Don't</th><th scope="col">Instead</th></tr></thead>
  )
  const line = (d: { dont: string; instead: string }, i: number) => (
    <tr key={i}><td>{inline(d.dont, 0)}</td><td>{d.instead ? inline(d.instead, 1) : ''}</td></tr>
  )
  return (
    <>
      <table className="pg-table pg-donts">
        {head}
        <tbody>{rows.slice(0, SHOW_FIRST).map(line)}</tbody>
        {rows.length > SHOW_FIRST && <Rest as="tbody" shown={revealed} onFound={onReveal}>{rows.slice(SHOW_FIRST).map((d, i) => line(d, i + SHOW_FIRST))}</Rest>}
      </table>
      {!revealed && <ShowMore more={rows.length - SHOW_FIRST} onShow={onReveal} />}
    </>
  )
}

/** The words for the Next card into this tab. */
export const rulesLine = (n: number) => `${plural(n, 'rule')}, each with how it is checked`
