import { useEffect, useMemo, useState } from 'react'
import { Toggle, Input, Tabs, cn } from '../src'
import tokensJson from '../tokens/vela.tokens.json'
import { REGISTRY, type Values } from './playground/registry'
import { parseSpec, sectionOf, type Control } from './playground/spec'
import { Markdown } from './playground/Markdown'
import './playground.css'

type Mode = 'light' | 'dark'
type Tok = { $type: string; $value: unknown; $extensions?: { vela?: { dark?: string; figma?: string } } }
const ALL: Record<string, Tok> = {}
for (const [g, toks] of Object.entries(tokensJson as Record<string, unknown>)) if (!g.startsWith('$')) Object.assign(ALL, toks as Record<string, Tok>)

// The same alias walk the CSS makes, so the pane shows what the browser resolves.
function resolve(name: string, mode: Mode): string {
  const t = ALL[name]
  if (!t) return '?'
  let v = t.$value
  if (mode === 'dark' && t.$extensions?.vela?.dark) v = t.$extensions.vela.dark
  if (typeof v === 'string' && /^\{.+\}$/.test(v)) return resolve(v.slice(1, -1), mode)
  if (t.$type === 'dimension') { const d = v as { value: number; unit: string }; return `${d.value}${d.unit}` }
  if (t.$type === 'cubicBezier') return `cubic-bezier(${(v as number[]).join(', ')})`
  return String(v)
}
const KNOWN = Object.keys(ALL).map((n) => `--vela-${n}`)
const figmaOf = (name: string) => ALL[name]?.$extensions?.vela?.figma ?? '—'
const isColor = (name: string) => ALL[name]?.$type === 'color'

function Field({ c, value, unavailable, onChange }: { c: Control; value: Values[string]; unavailable: string[]; onChange: (v: string | boolean) => void }) {
  if (c.kind === 'boolean')
    return <Toggle label={c.prop} size="tiny" checked={value === true} disabled={unavailable.includes('true')} onChange={onChange} />
  if (c.kind === 'select')
    return (
      <label className="pg-field">
        <span className="vela-meta">{c.prop}</span>
        <select className="pg-select" value={String(value ?? c.default ?? '')} onChange={(e) => onChange(e.target.value)}>
          {c.options!.map((o) => (
            <option key={o} value={o} disabled={unavailable.includes(o)}>{o}{unavailable.includes(o) ? '  (not with this appearance)' : ''}</option>
          ))}
        </select>
      </label>
    )
  return <Input label={c.prop} size="tiny" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
}

export function Playground() {
  const [id, setId] = useState(REGISTRY[0].id)
  const entry = REGISTRY.find((e) => e.id === id) ?? REGISTRY[0]
  const spec = useMemo(() => parseSpec(entry.spec, KNOWN), [entry])
  const controls = useMemo(() => [...spec.controls.filter((c) => !entry.hide?.includes(c.prop)), ...(entry.extra ?? [])], [spec, entry])
  const [values, setValues] = useState<Values>({})
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const next: Values = {}
    for (const c of controls) next[c.prop] = entry.seed[c.prop] ?? c.default
    for (const [k, v] of Object.entries(entry.seed)) if (!(k in next)) next[k] = v
    setValues(next)
  }, [entry, controls])

  const v = entry.constrain ? entry.constrain(values) : values
  const unavailable = entry.unavailable?.(v) ?? {}
  const code = entry.code(v, spec)
  const bound = entry.bindingKey ? spec.bindings[entry.bindingKey(v)] : undefined
  const boundTokens = new Set(Object.values(bound ?? {}))
  const isBound = entry.highlight ? entry.highlight(v) : (t: string) => boundTokens.has(t)
  const rules = ['Hard constraints', 'States', 'Motion', 'Anti-patterns'].map((h) => sectionOf(spec, h)).filter((s): s is NonNullable<typeof s> => !!s)
  const figma = sectionOf(spec, 'Figma mapping')

  return (
    <section className="demo-section">
      <h2 className="vela-h3">Playground</h2>
      <p className="vela-meta demo-note">
        The controls are read from the spec's Props table; the rules, the tokens and the Figma mapping are the same file.
        Change a control and the code, the bound tokens and the Figma names follow — nothing here is listed twice.
      </p>

      <div className="pg-top">
        <label className="pg-field">
          <span className="vela-meta">Component</span>
          <select className="pg-select" value={id} onChange={(e) => setId(e.target.value)}>
            {REGISTRY.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </label>
        <Toggle label="Reduced motion" size="tiny" checked={reduced} onChange={setReduced} />
        <div className="pg-intro"><Markdown source={spec.intro} /></div>
      </div>

      <div className="pg">
        <aside className="pg-panel pg-controls" aria-label="Controls">
          {controls.map((c) => (
            <Field key={c.prop} c={c} value={v[c.prop]} unavailable={unavailable[c.prop] ?? []} onChange={(val) => setValues((s) => ({ ...s, [c.prop]: val }))} />
          ))}
          <p className="vela-meta" style={{ margin: 0 }}>Selects are native: Select List is not in this kit yet, and the kit does not invent one.</p>
        </aside>

        <div className={cn('pg-stage', reduced && 'pg-reduced')}>
          {(['light', 'dark'] as Mode[]).map((m) => (
            <div key={m} className="vela-root pg-frame" data-theme={m}>
              <span className="pg-frame-label vela-meta">{m}</span>
              <div key={JSON.stringify(v)} className="pg-frame-body">{entry.render(v)}</div>
            </div>
          ))}
        </div>

        <aside className="pg-panel pg-contract" aria-label="Contract">
          <Tabs defaultValue="code" size="regular">
            <Tabs.List aria-label="Contract views">
              <Tabs.Trigger value="code">Code</Tabs.Trigger>
              <Tabs.Trigger value="tokens" count={spec.tokens.length}>Tokens</Tabs.Trigger>
              <Tabs.Trigger value="rules">Rules</Tabs.Trigger>
              <Tabs.Trigger value="figma">Figma</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Panel value="code">
              <pre className="pg-code">{code}</pre>
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
              <p className="pg-p">{bound || entry.highlight ? 'Highlighted rows are the ones bound for the current values.' : 'Every token this spec names, resolved for both themes.'}</p>
            </Tabs.Panel>
            <Tabs.Panel value="rules">
              {rules.map((s) => (
                <div key={s.heading}>
                  <h4 className="pg-h">{s.heading}</h4>
                  <Markdown source={s.body} />
                </div>
              ))}
            </Tabs.Panel>
            <Tabs.Panel value="figma">{figma ? <Markdown source={figma.body} /> : <p className="pg-p">No Figma mapping in this spec.</p>}</Tabs.Panel>
          </Tabs>
        </aside>
      </div>
    </section>
  )
}
