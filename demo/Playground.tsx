import { useEffect, useMemo, useId, useRef, useState } from 'react'
import { Button, Toggle, Tabs, cn } from '../src'
import tokensJson from '../tokens/vela.tokens.json'
import darkJson from '../tokens/vela.dark.tokens.json'
import { REGISTRY, type Values, type Lock } from './playground/registry'
import { parseSpec, sectionOf } from './playground/spec'
import { ControlField, LockPanel, AlsoInTheApi, CodeBar, type OpenLock } from './playground/Workbench'
import { readLink, writeLink, queryOf, type Stage, type Compare } from './playground/link'
import { Markdown } from './playground/Markdown'
import { installFor } from './playground/install'
import { statusOf } from './playground/status'
import { rulesOf, dependenciesFor, figmaSetFor, builtLine } from './playground/facts'
import { LINKS } from './links'
import { replaceRoute, href, type PageTab } from './router'
import { CopyButton, CopyStatus, useCopy } from './shell/Copy'
import { buildIndex, closest } from './playground/search'
import { Segments } from './shell/Segments'
import { ScrollRegion } from './shell/ScrollRegion'
import { StageBoundary, COMMIT, type Settings } from './shell/ErrorBoundary'
import './playground.css'

type Mode = 'light' | 'dark'
const STAGE_OPTIONS = [
  { value: 'beside', label: 'Beside' },
  { value: 'full', label: 'Full width' },
] as const
// Compare splits the stage (section 5). Brands joins when a second brand exists (B4, B9): there is
// none yet, so it is not offered.
const COMPARE_OPTIONS = [
  { value: 'off', label: 'Off' },
  { value: 'themes', label: 'Themes' },
] as const

/** The page's own theme: the Theme control's choice, or the system's when it says System. */
function usePageTheme(): Mode {
  const read = (): Mode => {
    const set = document.documentElement.getAttribute('data-theme')
    if (set === 'light' || set === 'dark') return set
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  const [mode, setMode] = useState<Mode>(read)
  useEffect(() => {
    const on = () => setMode(read())
    const mo = new MutationObserver(on)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', on)
    return () => { mo.disconnect(); mq.removeEventListener('change', on) }
  }, [])
  return mode
}

/** Per-viewer storage, safe when empty or refused (section 5: the stage choice is kept per component). */
const stored = {
  get: (k: string) => { try { return window.localStorage.getItem(k) } catch { return null } },
  set: (k: string, v: string) => { try { window.localStorage.setItem(k, v) } catch { /* not kept; fine */ } },
}
// DTCG 2025.10: colours are { colorSpace, components, hex } objects, aliases are full paths
// ({primitives.grey-700}), the vendor data sits under the reverse-domain key, and the dark
// values live in tokens/vela.dark.tokens.json — the overlay tokens/vela.resolver.json applies.
const VENDOR = 'com.omkarux.vela'
type Tok = { $type: string; $value: unknown; $extensions?: { [VENDOR]?: { figma?: string } } }
const ALL: Record<string, Tok> = {}
for (const [g, toks] of Object.entries(tokensJson as Record<string, unknown>))
  if (!g.startsWith('$')) for (const [n, t] of Object.entries(toks as Record<string, Tok>)) if (!n.startsWith('$')) ALL[n] = t
const DARK: Record<string, unknown> = {}
for (const [g, toks] of Object.entries(darkJson as Record<string, unknown>))
  if (!g.startsWith('$')) for (const [n, t] of Object.entries(toks as Record<string, { $value?: unknown }>)) if (!n.startsWith('$')) DARK[n] = t.$value
const KNOWN = Object.keys(ALL).map((n) => `--vela-${n}`)

// The same alias walk the CSS makes, so the pane shows what the browser resolves.
function resolve(name: string, mode: Mode): string {
  const t = ALL[name]
  if (!t) return '?'
  const v = mode === 'dark' && name in DARK ? DARK[name] : t.$value
  if (typeof v === 'string' && /^\{.+\}$/.test(v)) return resolve(v.slice(1, -1).split('.').pop()!, mode)
  if (t.$type === 'color') { const c = v as { components: number[]; hex?: string }; return c.hex ?? `#${c.components.map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')}` }
  if (t.$type === 'dimension') { const d = v as { value: number; unit: string }; return `${d.value}${d.unit}` }
  if (t.$type === 'duration') { const d = v as { value: number; unit: string }; return `${d.value}${d.unit}` }
  if (t.$type === 'cubicBezier') return `cubic-bezier(${(v as number[]).join(', ')})`
  return String(v)
}
const figmaOf = (name: string) => ALL[name]?.$extensions?.[VENDOR]?.figma ?? '—'
const isColor = (name: string) => ALL[name]?.$type === 'color'

// The component under test renders here, as its own element, so a render error throws inside the
// stage's error boundary rather than in the page that holds it.
function Rendered({ entry, v }: { entry: (typeof REGISTRY)[number]; v: Values }) {
  return <>{entry.render(v)}</>
}

export function Playground({ id, tab }: { id: string; tab?: PageTab }) {
  const entry = REGISTRY.find((e) => e.id === id)
  if (!entry) return <Unknown name={id} />
  return <PlaygroundFor entry={entry} tab={tab} />
}

/** A link to a component that doesn't exist (playground spec, section 7): the closest names, by search. */
function Unknown({ name }: { name: string }) {
  const near = useMemo(() => closest(buildIndex(), name), [name])
  return (
    <article className="pg-unknown">
      <h1 className="vela-h2">There's no component called “{name}”.</h1>
      {near.length > 0 && (
        <>
          <p className="vela-body">The closest names:</p>
          <ul className="pg-list">
            {near.map((i) => <li key={i.id}><a href={i.href}>{i.title}</a></li>)}
          </ul>
        </>
      )}
      <p className="vela-body"><a href="#/status">Browse all components</a></p>
    </article>
  )
}

const BUILT = builtLine(COMMIT, import.meta.env.VITE_VELA_BUILT)

/** One step of the Use panel: what to do, where, the line itself and its Copy. */
function UseStep({ n, title, hint, text, what, className, note }: { n: number; title: string; hint: string; text: string; what: string; className: string; note?: string }) {
  const id = useId()
  const { state, copy } = useCopy(text, id)
  return (
    <li className="pg-use__step">
      <p className="pg-use__label"><span className="pg-use__title">{n} · {title}</span> <span className="pg-use__hint">{hint}</span></p>
      <div className="pg-use__line">
        <code id={id} className={className}>{text}</code>
        <CopyButton what={what} onCopy={copy} />
      </div>
      {note && <p className="pg-install-note">{note}</p>}
      <CopyStatus state={state} what={what} />
    </li>
  )
}

function PlaygroundFor({ entry, tab }: { entry: (typeof REGISTRY)[number]; tab?: PageTab }) {
  const spec = useMemo(() => parseSpec(entry.spec, KNOWN), [entry])
  const controls = useMemo(
    () => [
      ...spec.controls.filter((c) => !entry.hide?.includes(c.prop) && !entry.noControl?.includes(c.prop)),
      ...(entry.extra ?? []),
    ],
    [spec, entry],
  )
  const initial = useMemo(() => {
    const next: Values = {}
    for (const c of controls) next[c.prop] = entry.seed[c.prop] ?? c.default
    for (const [k, v] of Object.entries(entry.seed)) if (!(k in next)) next[k] = v
    return next
  }, [entry, controls])
  const implIds = entry.implementations?.map((i) => i.id) ?? []
  const legal = (x: Values) => { const l = entry.locks?.(x) ?? {}; return !Object.entries(l).some(([p, byValue]) => String(x[p]) in byValue) }
  // A shared link, read once when the page opens (section 11): closed sets only, illegal values
  // replaced by the defaults, and a notice for each.
  const link = useMemo(() => {
    const read = readLink(queryOf(window.location.hash), entry.name, controls, initial, implIds)
    const merged = { ...initial, ...read.values }
    if (!legal(merged)) return { ...read, values: {}, notices: [...read.notices, `This link asked for a combination ${entry.name} doesn't allow, so the stage shows the defaults.`] }
    return read
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry, controls, initial])
  const [values, setValues] = useState<Values>(() => ({ ...initial, ...link.values }))
  const [reduced, setReduced] = useState(false)
  const stageKey = `vela.playground.stage.${entry.id}`
  // Default: Beside. Full width is the default only for a component whose spec states a minimum
  // width wider than the stage gives beside the controls; no spec states one as a number yet (A1).
  const defaultStage: Stage = 'beside'
  const [stage, setStageState] = useState<Stage>(() => link.stage ?? (stored.get(stageKey) === 'full' ? 'full' : stored.get(stageKey) === 'beside' ? 'beside' : defaultStage))
  const setStage = (st: Stage) => { setStageState(st); stored.set(stageKey, st) }
  // Compare is kept across every component (spec v1.2, call 10): someone who always wants both themes
  // sets it once. Per viewer, safe when empty; a link's own choice wins.
  const [compare, setCompareState] = useState<Compare>(() => link.compare ?? (stored.get('vela.playground.compare') === 'themes' ? 'themes' : 'off'))
  const setCompare = (c: Compare) => { setCompareState(c); stored.set('vela.playground.compare', c) }
  // "Open proof" from the lock panel: the Rules tab, then focus on that rule (spec v1.2, section 8).
  const [proofRule, setProofRule] = useState<string | null>(null)
  const [lock, setLock] = useState<OpenLock | null>(null)
  // Bumped on every change, so a changed code line's tint runs once and settles to its mark.
  const [settle, setSettle] = useState(0)
  const [announce, setAnnounce] = useState('')
  // Bumped by "Reset settings" in the stage's error state, so a reset to the same values still retries.
  const [attempt, setAttempt] = useState(0)
  const pageTheme = usePageTheme()
  const codeId = useId().replace(/:/g, '')
  const lockOpener = useRef<HTMLElement | null>(null)

  const set = (patch: Values, said?: string) => {
    setValues((s) => ({ ...s, ...patch }))
    setSettle((n) => n + 1)
    setLock(null)
    // Announced once, politely, never twice (section 13).
    setAnnounce(said ?? `Stage updated: ${Object.entries(patch).map(([k, x]) => `${k} ${x === true ? 'on' : x === false ? 'off' : x}`).join(', ')}`)
  }

  const v = entry.constrain ? entry.constrain(values) : values
  const locks: Record<string, Record<string, Lock>> = entry.locks?.(v) ?? {}
  const code = entry.code(v, spec)
  // Two entry points, one playground: the import line and the install command follow the chosen
  // implementation. The install command is generated from package.json's peerDependenciesMeta.
  const impl = entry.implementations?.find((i) => i.id === v.implementation) ?? entry.implementations?.[0]
  const importPath = impl?.entry ?? '@omkarux/vela'
  const install = installFor(importPath)
  const sourcePath = impl && impl.id !== 'core' ? `src/${impl.id}/${entry.src}/${entry.src}.tsx` : `src/components/${entry.src}/${entry.src}.tsx`
  const bound = entry.bindingKey ? spec.bindings[entry.bindingKey(v)] : undefined
  const boundTokens = new Set(Object.values(bound ?? {}))
  const isBound = entry.highlight ? entry.highlight(v) : (t: string) => boundTokens.has(t)
  const rules = ['Hard constraints', 'States', 'Motion', 'Anti-patterns'].map((h) => sectionOf(spec, h)).filter((s): s is NonNullable<typeof s> => !!s)
  const figma = sectionOf(spec, 'Figma mapping')
  const figmaSet = figmaSetFor(entry.file)
  const importLine = `import { ${entry.imports ?? entry.src} } from '${importPath}'`
  const snippet = `${importLine}\n\n${code}`
  const status = statusOf(entry.spec)
  const ruleCount = rulesOf(entry.spec)
  // A tab appears only when its data exists (B9): no empty tab, and none named for what isn't there.
  // The Changelog tab waits for per-component changelog tags (D3), so it has none yet.
  const tabs: { value: 'playground' | PageTab; label: string; count?: number }[] = [
    { value: 'playground', label: 'Playground' },
    ...(rules.length > 0 ? [{ value: 'rules' as const, label: 'Rules' }] : []),
    ...(spec.tokens.length > 0 ? [{ value: 'tokens' as const, label: 'Tokens', count: spec.tokens.length }] : []),
    ...(figmaSet ? [{ value: 'figma' as const, label: 'Figma' }] : []),
  ]
  const current = tabs.some((t) => t.value === tab) ? tab! : 'playground'
  useEffect(() => {
    if (current !== 'rules' || !proofRule) return
    const tagged = document.querySelector<HTMLElement>(`.pg-rules [data-rule~="${CSS.escape(proofRule)}"]`)
    const target = tagged?.closest<HTMLElement>('li, p') ?? tagged
    if (target) {
      target.tabIndex = -1
      target.classList.add('pg-rule--target')
      target.scrollIntoView({ block: 'center' })
      target.focus({ preventScroll: true })
    }
    setProofRule(null)
  }, [current, proofRule])
  const selects = controls.filter((c) => c.kind === 'select')
  const texts = controls.filter((c) => c.kind === 'text')
  const booleans = controls.filter((c) => c.kind === 'boolean')
  const uncontrolled = spec.props.filter((p) => !controls.some((c) => c.prop === p.prop) && !entry.hide?.includes(p.prop))
  const dirty = JSON.stringify(values) !== JSON.stringify(initial) || stage !== defaultStage || compare !== 'off'
  const frames: Mode[] = compare === 'themes' ? ['light', 'dark'] : [pageTheme]
  const changedProps = controls.filter((c) => v[c.prop] !== initial[c.prop]).map((c) => c.prop)
  const levelOf = (rule: string) => entry.spec.match(new RegExp(`\\[\\[rule:\\s*${rule}\\s*\\|\\s*(\\w+)\\s*\\]\\]`))?.[1]

  // The address carries the settings (section 11), replaced, not pushed: no history entry per click.
  useEffect(() => {
    const q = writeLink(controls, v, initial, { implementation: impl?.id, defaultImplementation: implIds[0], stage, defaultStage, compare })
    const next = `${href({ kind: 'component', id: entry.id, tab: tab })}${q ? `?${q}` : ''}`
    if (window.location.hash !== next) window.history.replaceState(window.history.state, '', next)
  })

  const resetAll = () => { setValues(initial); setStage(defaultStage); setCompare('off'); setLock(null); setAnnounce('Stage updated: every setting back to its default') }
  // What a stage error report may carry: values from closed sets only (selects and switches, the
  // implementation, the stage view), never the free text typed into a field.
  const closedSettings: Settings = Object.fromEntries([
    ...controls.filter((c) => c.kind !== 'text').map((c) => [c.prop, v[c.prop]] as const),
    ...(impl ? [['implementation', impl.id] as const] : []),
    ['stage', stage] as const,
    ['compare', compare] as const,
  ])

  return (
    <>
      <header className="pg-head">
        <div className="pg-head__text">
          <p className="vela-meta pg-head__eyebrow">Components / {entry.group}</p>
          <h1 className="vela-h2">{entry.name}</h1>
          <div className="pg-intro"><Markdown source={spec.intro} /></div>
        </div>
        <section className="pg-use" aria-labelledby={`use-${entry.id}`}>
          <h2 id={`use-${entry.id}`} className="pg-use__heading">Use {entry.name}</h2>
          {entry.implementations && entry.implementations.length > 1 && (
            <Segments
              label="Implementation"
              value={impl?.id ?? entry.implementations[0].id}
              options={entry.implementations.map((i) => ({ value: i.id, label: i.id }))}
              onChange={(id) => setValues((s) => ({ ...s, implementation: id }))}
            />
          )}
          <ol className="pg-use__steps">
            <UseStep n={1} title="Install" hint="in your terminal, once per project" text={install.command} what="install command" className="pg-install-command" note={install.note} />
            <UseStep n={2} title="Import" hint="at the top of each file that uses it" text={importLine} what="import line" className="pg-import" />
          </ol>
          <p className="pg-use__links">
            <a className="vela-meta" href={`https://github.com/omkarpkh/vela/blob/main/guidelines/components/${entry.file}`}>Spec on GitHub</a>
            <a className="vela-meta" href={`https://github.com/omkarpkh/vela/blob/main/${sourcePath}`}>Source</a>
            {figmaSet && <a className="vela-meta" href={figmaSet.url}>Figma</a>}
          </p>
        </section>
      </header>

      <div className="pg-facts-wrap">
      <dl className="pg-facts" aria-label="Contract">
        <div className="pg-fact"><dt>Status</dt><dd>{status.label}</dd></div>
        <div className="pg-fact"><dt>Entry</dt><dd><code>{importPath}</code></dd></div>
        <div className="pg-fact"><dt>Dependencies</dt><dd>{dependenciesFor(importPath)}</dd></div>
        <div className="pg-fact"><dt>Minimum width</dt><dd>Not stated in the spec yet</dd></div>
        <div className="pg-fact"><dt>Built</dt><dd>{BUILT}</dd></div>
        <div className="pg-fact pg-fact--rules">
          <dt>Rules</dt>
          <dd>
            <span className="pg-fact__total">{ruleCount.total}</span>
            {ruleCount.byLevel.map((l) => <span key={l.level} className="site-tag">{l.count} {l.words}</span>)}
          </dd>
        </div>
      </dl>
      </div>

      <div className="pg-tabs">
        <Tabs value={current} onValueChange={(t) => { setLock(null); replaceRoute({ kind: 'component', id: entry.id, tab: t === 'playground' ? undefined : (t as PageTab) }) }}>
          <Tabs.List aria-label={`${entry.name} page`}>
            {tabs.map((t) => <Tabs.Trigger key={t.value} value={t.value} count={t.count}>{t.label}</Tabs.Trigger>)}
          </Tabs.List>

          <Tabs.Panel value="playground">
            <div className={cn('pg', stage === 'full' && 'pg--full')}>
              <div className="pg-main">
                <div className="pg-toolbar">
                  <span className="pg-toolbar__group"><span className="pg-toolbar__label" aria-hidden="true">Stage</span>
                  <Segments label="Stage" value={stage} options={STAGE_OPTIONS} onChange={(st) => { setStage(st); setAnnounce(`Stage updated: ${st === 'full' ? 'full width' : 'beside the controls'}`) }} />
                  </span>
                  <span className="pg-toolbar__group"><span className="pg-toolbar__label" aria-hidden="true">Compare</span>
                  <Segments label="Compare" value={compare} options={COMPARE_OPTIONS} onChange={(cmp) => { setCompare(cmp); setAnnounce(`Stage updated: ${cmp === 'themes' ? 'light and dark side by side' : 'one theme, the page\'s'}`) }} />
                  </span>
                  <div className="pg-toolbar__spacer" />
                  <Toggle label="Reduced motion" size="tiny" checked={reduced} onChange={setReduced} />
                  <span className="pg-reset">
                    <Button size="tiny" appearance="hollow" disabled={!dirty} onClick={resetAll}>Reset</Button>
                    {!dirty && <span className="pg-reset__why">Nothing to reset</span>}
                  </span>
                </div>
                {/* A landmark of its own (spec section 13): header, nav, main, Stage, Controls and Code. */}
                <section aria-label="Stage" className="pg-stage-region">
                <StageBoundary
                  key={`${entry.id}|${stage}|${compare}|${JSON.stringify(v)}|${attempt}`}
                  component={entry.id}
                  settings={closedSettings}
                  onReset={() => { setValues(initial); setAttempt((n) => n + 1) }}
                >
                  <ScrollRegion label="Stage, scrollable" className={cn('pg-stage', frames.length === 1 && 'pg-stage--single', reduced && 'pg-reduced')}>
                    {frames.map((m) => (
                      <div key={m} className="vela-root pg-frame" data-theme={m}>
                        <span className="pg-frame-label vela-meta">
                          {m}{compare === 'off' ? ' · follows the page theme' : ''}{stage === 'full' ? ' · Full width' : ''}
                        </span>
                        <div className="pg-frame-body"><Rendered entry={entry} v={v} /></div>
                      </div>
                    ))}
                  </ScrollRegion>
                </StageBoundary>
                </section>
                <p className="vela-sr-only" role="status">{announce}</p>
                {stage === 'beside' && (
                  <CodeBar id={codeId} snippet={snippet} changedProps={changedProps} settle={settle}>
                    <p className="pg-p">Defaults from the Props table are omitted, exactly as the spec's own example writes them. A marked line carries a prop you changed.</p>
                  </CodeBar>
                )}
              </div>

              <aside className="pg-panel pg-props" aria-label="Controls">
                {/* D4: about one Tab stop per value, so the first thing here skips past them all. */}
                <a
                  className="pg-skip vela-sr-only"
                  href={`#${codeId}`}
                  onClick={(e) => { e.preventDefault(); document.getElementById(codeId)?.focus() }}
                >
                  Skip to code
                </a>
                <div className="pg-props__head">
                  <h2 className="vela-h4">Controls</h2>
                  <p className="pg-props__lead">Every value the spec allows</p>
                </div>
                {link.notices.length > 0 && (
                  <div className="pg-notice">
                    {link.notices.map((n) => <p key={n}>{n}</p>)}
                  </div>
                )}
                <div className="pg-controls">
                  {[...selects, ...texts, ...booleans].map((c) => (
                    <div key={c.prop} className="pg-control">
                      <ControlField
                        c={c}
                        value={v[c.prop]}
                        changed={v[c.prop] !== initial[c.prop]}
                        locks={locks[c.prop] ?? {}}
                        onChange={(val) => set({ [c.prop]: val })}
                        onLockedPress={(value) => {
                          lockOpener.current = document.activeElement as HTMLElement | null
                          setLock({ prop: c.prop, value, lock: locks[c.prop][value] })
                        }}
                      />
                      {lock && lock.prop === c.prop && (
                        <LockPanel
                          open={lock}
                          component={entry.id}
                          levelOf={levelOf}
                          onMove={(patch) => {
                            set(patch)
                            // Focus goes to the value the move chose, now current.
                            requestAnimationFrame(() => document.querySelector<HTMLElement>(`.pg-control [data-prop="${c.prop}"] [aria-current="true"]`)?.focus())
                          }}
                          onClose={() => { setLock(null); lockOpener.current?.focus() }}
                          onOpenProof={(rule) => { setLock(null); setProofRule(rule); replaceRoute({ kind: 'component', id: entry.id, tab: 'rules' }) }}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <AlsoInTheApi rows={uncontrolled} explain={entry.explain} />
              </aside>
              {stage === 'full' && (
                <CodeBar id={codeId} snippet={snippet} changedProps={changedProps} settle={settle}>
                  <p className="pg-p">Defaults from the Props table are omitted, exactly as the spec's own example writes them. A marked line carries a prop you changed.</p>
                </CodeBar>
              )}
            </div>
          </Tabs.Panel>

          <Tabs.Panel value="rules">
            <div className="pg-rules">
              {rules.map((s) => (
                <div key={s.heading}>
                  <h2 className="vela-h4 pg-h2">{s.heading}</h2>
                  <Markdown source={s.body} />
                </div>
              ))}
            </div>
          </Tabs.Panel>

          <Tabs.Panel value="tokens">
            <ScrollRegion label="Tokens, scrollable" className="pg-tablewrap">
              <table className="pg-table pg-table--tokens">
                <thead><tr><th>Token</th><th>Light</th><th>Dark</th><th>Figma</th></tr></thead>
                <tbody>
                  {spec.tokens.map((t) => {
                    const n = t.replace(/^--vela-/, '')
                    const l = resolve(n, 'light'), d = resolve(n, 'dark')
                    return (
                      <tr key={t} className={isBound(t) ? 'is-bound' : undefined}>
                        <td><code>{t}</code></td>
                        <td>{isColor(n) && <span className="pg-chip" style={{ background: l }} />}<code>{l}</code></td>
                        <td>{isColor(n) && <span className="pg-chip" style={{ background: d }} />}<code>{d}</code></td>
                        <td><code>{figmaOf(n)}</code></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </ScrollRegion>
            <p className="pg-p">{bound || entry.highlight ? 'Highlighted rows are bound for the current values.' : 'Every token this spec names, resolved for both themes.'}</p>
          </Tabs.Panel>

          {figmaSet && (
            <Tabs.Panel value="figma">
              <p className="pg-p">
                <a href={figmaSet.url}>Open {entry.name} in the Figma library</a>
                {' '}— the file is public, and everything in it is generated from the same token file and specs as this page ({LINKS.figma.replace('https://www.', '')}).
              </p>
              {figma ? <Markdown source={figma.body} /> : <p className="pg-p">No Figma mapping in this spec.</p>}
            </Tabs.Panel>
          )}
        </Tabs>
      </div>
    </>
  )
}
