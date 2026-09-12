import { useEffect, useState } from 'react'
import {
  Button, Toggle, Input, ContextualAlert, StatusIndicator, Tabs,
} from '../src'
import type { Severity, Status } from '../src'
import { PlusIcon } from '../src/lib/icons'
import './demo.css'
import { Adopt } from './Adopt'

type Theme = 'system' | 'light' | 'dark'
type View = 'components' | 'adopt'

const SEVERITIES: Severity[] = ['success', 'info', 'warning', 'minor', 'major', 'critical']
const STATUSES: Status[] = ['unknown', 'healthy', 'warning', 'medium', 'unhealthy']
const SIZES = ['tiny', 'regular', 'large', 'huge'] as const

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="demo-section">
      <h2 className="vela-h3">{title}</h2>
      {note && <p className="vela-meta demo-note">{note}</p>}
      <div className="demo-body">{children}</div>
    </section>
  )
}

export function App() {
  const [theme, setTheme] = useState<Theme>('system')
  const [view, setView] = useState<View>('components')
  const [alerts, setAlerts] = useState<Severity[]>(SEVERITIES)
  const [notify, setNotify] = useState(true)
  const [tenant, setTenant] = useState('')

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
  }, [theme])

  const tenantError = tenant.length > 0 && tenant !== tenant.toLowerCase()
    ? 'Tenant names must be lowercase.'
    : undefined

  return (
    <div className="vela-root demo-root">
      <header className="demo-header">
        <div>
          <h1 className="vela-h2">Vela</h1>
          <p className="vela-meta">
            @omkarux/vela · 6 components · 76 contrast pairs asserted in both themes
          </p>
        </div>
        <div className="demo-controls">
          <div className="demo-views" role="group" aria-label="View">
            {(['components', 'adopt'] as View[]).map((v) => (
              <Button
                key={v}
                size="tiny"
                variant={view === v ? 'primary' : 'standard'}
                appearance={view === v ? 'filled' : 'hollow'}
                onClick={() => setView(v)}
              >
                {v === 'components' ? 'Components' : 'Adopt without rewrite'}
              </Button>
            ))}
          </div>
        <div className="demo-themes" role="group" aria-label="Theme">
          {(['system', 'light', 'dark'] as Theme[]).map((t) => (
            <Button
              key={t}
              size="tiny"
              variant={theme === t ? 'primary' : 'standard'}
              appearance={theme === t ? 'filled' : 'hollow'}
              onClick={() => setTheme(t)}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </Button>
          ))}
        </div>
        </div>
      </header>

      {view === 'adopt' && <Adopt mode={theme} />}
      {view === 'components' && (<>
      <Section title="Button" note="variant encodes consequence · appearance encodes weight · sizes are a closed set of four">
        <div className="demo-row">
          <Button variant="primary" appearance="filled" icon={<PlusIcon />}>Add Rule</Button>
          <Button variant="primary" appearance="hollow">Cancel</Button>
          <Button variant="primary" appearance="text-link">Learn More</Button>
          <Button variant="standard" appearance="filled">Export</Button>
          <Button variant="standard" appearance="hollow">Reset</Button>
          <Button variant="destructive" appearance="filled">Delete Account</Button>
          <Button variant="destructive" appearance="hollow">Revoke Access</Button>
        </div>
        <div className="demo-row">
          {SIZES.map((size) => (
            <Button key={size} size={size} variant="standard">{size}</Button>
          ))}
        </div>
        <div className="demo-row">
          <Button disabled>Disabled</Button>
          <Button loading>Saving Changes</Button>
          <Button variant="primary" loading>Applying Policy</Button>
        </div>
      </Section>

      <Section title="Toggle" note="a binary setting that takes effect immediately — if it needs a Save click, it is a Checkbox">
        <div className="demo-row">
          <Toggle label="Email alerts" checked={notify} onChange={setNotify} />
          <Toggle label="Weekly digest" defaultChecked={false} />
          <Toggle label="Tiny" size="tiny" defaultChecked />
          <Toggle label="Disabled" disabled />
        </div>
      </Section>

      <Section title="Input" note="type a capital letter to see the error state wire up aria-invalid and role=alert">
        <div className="demo-grid">
          <Input label="Tenant name" hint="Lowercase letters only" value={tenant}
                 onChange={(e) => setTenant(e.target.value)} error={tenantError} placeholder="acme-prod" />
          <Input label="Region" size="large" defaultValue="ap-south-1" required />
          <Input label="Legacy ID" size="tiny" disabled defaultValue="—" />
        </div>
      </Section>

      <Section title="Contextual Alert" note="six severities · major and critical announce assertively, the rest are polite">
        <div className="demo-stack">
          {alerts.map((s) => (
            <ContextualAlert key={s} severity={s} title={s[0].toUpperCase() + s.slice(1)}
                             onDismiss={s === 'critical' ? undefined : () => setAlerts((a) => a.filter((x) => x !== s))}>
              {s === 'critical'
                ? 'Cannot be dismissed — there is no resolution path that does not involve acting.'
                : `This is a ${s} alert bound entirely to --vela-*-severity-${s} tokens.`}
            </ContextualAlert>
          ))}
          {alerts.length < SEVERITIES.length && (
            <Button size="tiny" appearance="hollow" onClick={() => setAlerts(SEVERITIES)}>Restore All</Button>
          )}
        </div>
      </Section>

      <Section title="Status Indicator" note="five health states — not severity's six, not risk's three">
        <div className="demo-row">
          {STATUSES.map((s) => (
            <StatusIndicator key={s} status={s} label={s[0].toUpperCase() + s.slice(1)} />
          ))}
        </div>
        <p className="vela-meta">Without a visible label the dot still carries a text alternative:</p>
        <div className="demo-row">
          {STATUSES.map((s) => <StatusIndicator key={s} status={s} />)}
        </div>
      </Section>

      <Section title="Tabs" note="one tab stop for the whole list · arrow keys move · Home/End jump · disabled tabs are skipped">
        <Tabs defaultValue="alerts">
          <Tabs.List aria-label="Views">
            <Tabs.Trigger value="alerts" count={12}>Alerts</Tabs.Trigger>
            <Tabs.Trigger value="assets" count={340}>Assets</Tabs.Trigger>
            <Tabs.Trigger value="audit" disabled>Audit</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Panel value="alerts">
            <p className="vela-body">Focus a tab and press → then Home. Audit is disabled and gets skipped.</p>
          </Tabs.Panel>
          <Tabs.Panel value="assets">
            <p className="vela-body">Only the active panel is mounted.</p>
          </Tabs.Panel>
        </Tabs>
      </Section>

      <Section title="Tokens" note="every swatch below is a semantic token — switch the theme above and watch them re-point">
        <div className="demo-swatches">
          {[
            ['--vela-bg-global', 'bg-global'], ['--vela-bg-container', 'bg-container'],
            ['--vela-text-default', 'text-default'], ['--vela-text-heading', 'text-heading'],
            ['--vela-text-link', 'text-link'], ['--vela-border-default', 'border-default'],
            ...SEVERITIES.map((s) => [`--vela-signal-severity-${s}`, `severity-${s}`]),
            ...STATUSES.map((s) => [`--vela-signal-status-${s}`, `status-${s}`]),
          ].map(([token, label]) => (
            <div className="demo-swatch" key={token}>
              <span className="demo-chip" style={{ background: `var(${token})` }} />
              <code className="vela-meta">{label}</code>
            </div>
          ))}
        </div>
      </Section>
      </>)}

      <footer className="demo-footer vela-meta">
        Zero runtime dependencies · ESM · light + dark · WCAG 2.1 AA asserted in CI
      </footer>
    </div>
  )
}
