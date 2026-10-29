import { useEffect, useMemo, useState } from 'react'
import { Button, Toggle, Input, Tabs, cn } from '../src'
import tokensJson from '../tokens/vela.tokens.json'
import darkJson from '../tokens/vela.dark.tokens.json'
import { REGISTRY, type Values } from './playground/registry'
import { parseSpec, sectionOf, type Control } from './playground/spec'
import { Markdown } from './playground/Markdown'
import { dependenciesOf } from './pages/Status'
import { LINKS, figmaUrl } from './links'
import './playground.css'

type Mode = 'light' | 'dark'
type StageView = 'both' | Mode
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

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <Button
      size="tiny"
      appearance="hollow"
      className="pg-code-copy"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500) } catch { /* clipboard unavailable */ }
      }}
    >
      {done ? 'Copied' : 'Copy'}
    </Button>
  )
}

export function Playground({ id }: { id: string }) {
  const entry = REGISTRY.find((e) => e.id === id)
  if (!entry) return <p className="vela-body">No component called “{id}”.</p>
  return <PlaygroundFor entry={entry} />
}

function PlaygroundFor({ entry }: { entry: (typeof REGISTRY)[number] }) {
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
  useEffect(() => setValues(initial), [initial])

  const v = entry.constrain ? entry.constrain(values) : values
  const unavailable = entry.unavailable?.(v) ?? {}
  const code = entry.code(v, spec)
  // Two entry points, one playground: the import line and the "Dependencies" line follow the chosen
  // implementation; a component with one implementation (core-only, or headless-born) reads its
  // dependencies from the spec.
  const impl = entry.implementations?.find((i) => i.id === v.implementation) ?? entry.implementations?.[0]
  const importPath = impl?.entry ?? '@omkarux/vela'
  const dependencies = impl?.dependencies ?? dependenciesOf(entry.spec)
  const sourcePath = impl && impl.id !== 'core' ? `src/${impl.id}/${entry.src}/${entry.src}.tsx` : `src/components/${entry.src}/${entry.src}.tsx`
  const bound = entry.bindingKey ? spec.bindings[entry.bindingKey(v)] : undefined
  const boundTokens = new Set(Object.values(bound ?? {}))
  const isBound = entry.highlight ? entry.highlight(v) : (t: string) => boundTokens.has(t)
  const rules = ['Hard constraints', 'States', 'Motion', 'Anti-patterns'].map((h) => sectionOf(spec, h)).filter((s): s is NonNullable<typeof s> => !!s)
  const figma = sectionOf(spec, 'Figma mapping')
  const selects = controls.filter((c) => c.kind === 'select')
  const texts = controls.filter((c) => c.kind === 'text')
  const booleans = controls.filter((c) => c.kind === 'boolean')
  const uncontrolled = spec.props.filter((p) => !controls.some((c) => c.prop === p.prop) && !entry.hide?.includes(p.prop))
  const dirty = JSON.stringify(values) !== JSON.stringify(initial)
  const frames: Mode[] = stage === 'both' ? ['light', 'dark'] : [stage]

  return (
    <>
      <header className="pg-head">
        <div className="pg-head__text">
          <p className="vela-meta pg-head__eyebrow">Component</p>
          <h1 className="vela-h2">{entry.name}</h1>
          <div className="pg-intro"><Markdown source={spec.intro} /></div>
        </div>
        <div className="pg-head__links">
          <a className="vela-meta" href={`https://github.com/omkarpkh/vela/blob/main/guidelines/components/${entry.file}`}>Spec on GitHub</a>
          <a className="vela-meta" href={`https://github.com/omkarpkh/vela/blob/main/${sourcePath}`}>Source</a>
          <a className="vela-meta" href={figmaUrl(entry.figma)}>Figma</a>
        </div>
      </header>

      <div className="pg">
        <div className="pg-main">
          <div className="pg-toolbar">
            <div className="pg-toolbar__group" role="group" aria-label="Stage">
              {(['both', 'light', 'dark'] as StageView[]).map((s) => (
                <Button key={s} size="tiny" variant={stage === s ? 'primary' : 'standard'} appearance={stage === s ? 'filled' : 'hollow'} onClick={() => setStage(s)}>
                  {s === 'both' ? 'Light + dark' : s[0].toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
            {entry.implementations && entry.implementations.length > 1 && (
              <div className="pg-toolbar__group" role="group" aria-label="Implementation">
                {entry.implementations.map((i) => (
                  <Button key={i.id} size="tiny" variant={impl?.id === i.id ? 'primary' : 'standard'} appearance={impl?.id === i.id ? 'filled' : 'hollow'} onClick={() => setValues((s) => ({ ...s, implementation: i.id }))}>
                    {i.id}
                  </Button>
                ))}
              </div>
            )}
            <div className="pg-toolbar__spacer" />
            <Toggle label="Reduced motion" size="tiny" checked={reduced} onChange={setReduced} />
          </div>
          <div className={cn('pg-stage', frames.length === 1 && 'pg-stage--single', reduced && 'pg-reduced')}>
            {frames.map((m) => (
              <div key={m} className="vela-root pg-frame" data-theme={m}>
                <span className="pg-frame-label vela-meta">{m}</span>
                <div key={JSON.stringify(v)} className="pg-frame-body">{entry.render(v)}</div>
              </div>
            ))}
          </div>

          <section className="pg-panel pg-contract" aria-label="Contract">
            <Tabs defaultValue="code" size="regular">
              <Tabs.List aria-label="Contract views">
                <Tabs.Trigger value="code">Code</Tabs.Trigger>
                <Tabs.Trigger value="tokens" count={spec.tokens.length}>Tokens</Tabs.Trigger>
                <Tabs.Trigger value="rules">Rules</Tabs.Trigger>
                <Tabs.Trigger value="figma">Figma</Tabs.Trigger>
              </Tabs.List>
              <Tabs.Panel value="code">
                <div className="pg-code-wrap">
                  <pre className="pg-code">{code}</pre>
                  <CopyButton text={code} />
                </div>
                <p className="pg-p pg-install">
                  <code>{`import { ${entry.imports ?? entry.src} } from '${importPath}'`}</code>
                  {' · '}
                  <span className="pg-dependencies">Dependencies: {dependencies}</span>
                </p>
                <p className="pg-p">Defaults from the Props table are omitted, exactly as the spec's own example writes them.</p>
              </Tabs.Panel>
              <Tabs.Panel value="tokens">
                <div className="pg-tablewrap">
                  <table className="pg-table">
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
                </div>
                <p className="pg-p">{bound || entry.highlight ? 'Highlighted rows are bound for the current values.' : 'Every token this spec names, resolved for both themes.'}</p>
              </Tabs.Panel>
              <Tabs.Panel value="rules">
                <div className="pg-rules">
                  {rules.map((s) => (
                    <div key={s.heading}>
                      <h3 className="vela-h4 pg-h2">{s.heading}</h3>
                      <Markdown source={s.body} />
                    </div>
                  ))}
                </div>
              </Tabs.Panel>
              <Tabs.Panel value="figma">
                <p className="pg-p">
                  <a href={figmaUrl(entry.figma)}>{entry.figma ? `Open ${entry.name} in the Figma library` : 'Open the Figma library'}</a>
                  {' '}— the file is public, and everything in it is generated from the same token file and specs as this page ({LINKS.figma.replace('https://www.', '')}).
                </p>
                {figma ? <Markdown source={figma.body} /> : <p className="pg-p">No Figma mapping in this spec.</p>}
              </Tabs.Panel>
            </Tabs>
          </section>
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
    </>
  )
}
