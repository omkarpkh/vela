import { useEffect, useId, useMemo, useState } from 'react'
import { Button, Toggle, Input, Tabs, cn } from '../src'
import tokensJson from '../tokens/vela.tokens.json'
import darkJson from '../tokens/vela.dark.tokens.json'
import { REGISTRY, type Values } from './playground/registry'
import { parseSpec, sectionOf, type Control } from './playground/spec'
import { Markdown } from './playground/Markdown'
import { installFor } from './playground/install'
import { statusOf } from './playground/status'
import { rulesOf, dependenciesFor, figmaSetFor, builtLine } from './playground/facts'
import { LINKS } from './links'
import { replaceRoute, type PageTab } from './router'
import { CopyButton, CopyStatus, useCopy } from './shell/Copy'
import { Segments } from './shell/Segments'
import { ScrollRegion } from './shell/ScrollRegion'
import { StageBoundary, COMMIT, type Settings } from './shell/ErrorBoundary'
import './playground.css'

type Mode = 'light' | 'dark'
type StageView = 'both' | Mode
const STAGE_VIEWS = [
  { value: 'both', label: 'Light + dark' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const
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

function Field({ c, value, unavailable, onChange }: { c: Control; value: Values[string]; unavailable: string[]; onChange: (v: string | boolean) => void }) {
  if (c.kind === 'select')
    return (
      <label className="pg-field">
        <span className="pg-field__label">{c.prop}</span>
        <span className="pg-select-wrap">
          <select className="pg-select" value={String(value ?? c.default ?? '')} onChange={(e) => onChange(e.target.value)}>
            {c.options!.map((o) => (
              <option key={o} value={o} disabled={unavailable.includes(o)}>{o}{unavailable.includes(o) ? '  · not with this appearance' : ''}</option>
            ))}
          </select>
        </span>
      </label>
    )
  return <Input label={c.prop} size="tiny" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
}

// The component under test renders here, as its own element, so a render error throws inside the
// stage's error boundary rather than in the page that holds it.
function Rendered({ entry, v }: { entry: (typeof REGISTRY)[number]; v: Values }) {
  return <>{entry.render(v)}</>
}

export function Playground({ id, tab }: { id: string; tab?: PageTab }) {
  const entry = REGISTRY.find((e) => e.id === id)
  if (!entry) return <p className="vela-body">No component called “{id}”.</p>
  return <PlaygroundFor entry={entry} tab={tab} />
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
      <CopyStatus state={state} />
    </li>
  )
}

/** The code bar: the import line and the JSX for the current settings, and Copy for exactly that. */
function CodeBar({ snippet }: { snippet: string }) {
  const id = useId()
  const { state, copy } = useCopy(snippet, id)
  return (
    <section className="pg-panel pg-codebar" aria-labelledby={`${id}-h`}>
      <div className="pg-codebar__head">
        <h2 id={`${id}-h`} className="pg-codebar__title">Import and usage</h2>
        <CopyButton what="snippet" onCopy={copy} />
      </div>
      <ScrollRegion as="pre" id={id} label="Code, scrollable" className="pg-code">{snippet}</ScrollRegion>
      <CopyStatus state={state} className="pg-codebar__status" />
      <p className="pg-p">Defaults from the Props table are omitted, exactly as the spec's own example writes them.</p>
    </section>
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
  const [values, setValues] = useState<Values>(initial)
  const [reduced, setReduced] = useState(false)
  const [stage, setStage] = useState<StageView>('both')
  // Bumped by "Reset settings" in the stage's error state, so a reset to the same values still retries.
  const [attempt, setAttempt] = useState(0)
  useEffect(() => setValues(initial), [initial])

  const v = entry.constrain ? entry.constrain(values) : values
  const unavailable = entry.unavailable?.(v) ?? {}
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
  const selects = controls.filter((c) => c.kind === 'select')
  const texts = controls.filter((c) => c.kind === 'text')
  const booleans = controls.filter((c) => c.kind === 'boolean')
  const uncontrolled = spec.props.filter((p) => !controls.some((c) => c.prop === p.prop) && !entry.hide?.includes(p.prop))
  const dirty = JSON.stringify(values) !== JSON.stringify(initial)
  const frames: Mode[] = stage === 'both' ? ['light', 'dark'] : [stage]
  // What a stage error report may carry: values from closed sets only (selects and switches, the
  // implementation, the stage view), never the free text typed into a field.
  const closedSettings: Settings = Object.fromEntries([
    ...controls.filter((c) => c.kind !== 'text').map((c) => [c.prop, v[c.prop]] as const),
    ...(impl ? [['implementation', impl.id] as const] : []),
    ['stage', stage] as const,
  ])

  return (
    <>
      <header className="pg-head">
        <div className="pg-head__text">
          <p className="vela-meta pg-head__eyebrow">Component</p>
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
        <Tabs value={current} onValueChange={(t) => replaceRoute({ kind: 'component', id: entry.id, tab: t === 'playground' ? undefined : (t as PageTab) })}>
          <Tabs.List aria-label={`${entry.name} page`}>
            {tabs.map((t) => <Tabs.Trigger key={t.value} value={t.value} count={t.count}>{t.label}</Tabs.Trigger>)}
          </Tabs.List>

          <Tabs.Panel value="playground">
            <div className="pg">
              <div className="pg-main">
                <div className="pg-toolbar">
                  <Segments label="Stage" value={stage} options={STAGE_VIEWS} onChange={setStage} />
                  <div className="pg-toolbar__spacer" />
                  <Toggle label="Reduced motion" size="tiny" checked={reduced} onChange={setReduced} />
                </div>
                <StageBoundary
                  key={`${entry.id}|${stage}|${JSON.stringify(v)}|${attempt}`}
                  component={entry.id}
                  settings={closedSettings}
                  onReset={() => { setValues(initial); setAttempt((n) => n + 1) }}
                >
                  <ScrollRegion label="Stage, scrollable" className={cn('pg-stage', frames.length === 1 && 'pg-stage--single', reduced && 'pg-reduced')}>
                    {frames.map((m) => (
                      <div key={m} className="vela-root pg-frame" data-theme={m}>
                        <span className="pg-frame-label vela-meta">{m}</span>
                        <div className="pg-frame-body"><Rendered entry={entry} v={v} /></div>
                      </div>
                    ))}
                  </ScrollRegion>
                </StageBoundary>
                <CodeBar snippet={snippet} />
              </div>

              <aside className="pg-panel pg-props" aria-label="Props">
                <div className="pg-props__head">
                  <h2 className="vela-h4">Props</h2>
                  <Button size="tiny" appearance="hollow" disabled={!dirty} onClick={() => setValues(initial)}>Reset</Button>
                </div>
                {selects.map((c) => (
                  <Field key={c.prop} c={c} value={v[c.prop]} unavailable={unavailable[c.prop] ?? []} onChange={(val) => setValues((s) => ({ ...s, [c.prop]: val }))} />
                ))}
                {texts.map((c) => (
                  <Field key={c.prop} c={c} value={v[c.prop]} unavailable={[]} onChange={(val) => setValues((s) => ({ ...s, [c.prop]: val }))} />
                ))}
                {booleans.length > 0 && (
                  <div className="pg-booleans">
                    {booleans.map((c) => (
                      <Toggle key={c.prop} label={c.prop} size="tiny" checked={v[c.prop] === true} disabled={(unavailable[c.prop] ?? []).includes('true')} onChange={(val) => setValues((s) => ({ ...s, [c.prop]: val }))} />
                    ))}
                  </div>
                )}
                {uncontrolled.length > 0 && (
                  <div className="pg-uncontrolled">
                    <h3>Also in the API</h3>
                    <dl>
                      {uncontrolled.map((p) => (
                        <div key={`${p.part ?? ''}${p.prop}`} style={{ display: 'contents' }}>
                          <dt>{p.part ? `${p.part}.` : ''}{p.prop}</dt>
                          <dd><code>{p.type.replace(/`/g, '')}</code></dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
                <p className="vela-meta pg-hint">Selects are native: Select List is not in this kit yet, and the kit does not invent one.</p>
              </aside>
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
