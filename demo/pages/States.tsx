import { useState } from 'react'
import { Button, Toggle, Input, ContextualAlert, StatusIndicator, RiskPill, Tabs } from '../../src'
import type { Severity } from '../../src'
import { PlusIcon } from '../../src/lib/icons'
import { PAIRS } from 'virtual:vela-site-facts'
// The taxonomy lists the Overview uses, each checked by the compiler to hold every value of its type,
// and the Status Indicator's own words for each status.
import { SEVERITIES, STATUSES, RISKS, STATUS_WORDS } from './overview-facts'

const SIZES = ['tiny', 'regular', 'large', 'huge'] as const

/**
 * The components this page shows, one section each, in page order. The header counts this list, and
 * a section's title must be one of them (or the Tokens section), so the count can't drift from the
 * page; src/styles/site-states.test.tsx holds the two together.
 */
export const SHOWN = ['Button', 'Toggle', 'Input', 'Contextual Alert', 'Status Indicator', 'Risk Pill', 'Tabs'] as const

function Section({ title, note, children }: { title: (typeof SHOWN)[number] | 'Tokens'; note?: string; children: React.ReactNode }) {
  return (
    <section className="demo-section">
      <h2 className="vela-h3">{title}</h2>
      {note && <p className="vela-meta demo-note">{note}</p>}
      <div className="demo-body">{children}</div>
    </section>
  )
}

// Every component in its states on one page, at #/states ("All states"; it was the Overview until
// 1 Nov 2026). The visual-regression baselines are taken here, section by section, so this page's
// markup is deliberately stable: the sections are screenshotted, the header above them is not.
export function States() {
  const [alerts, setAlerts] = useState<Severity[]>([...SEVERITIES])
  const [notify, setNotify] = useState(true)
  const [tenant, setTenant] = useState('')
  const tenantError = tenant.length > 0 && tenant !== tenant.toLowerCase()
    ? 'Tenant names must be lowercase.'
    : undefined

  return (
    <>
      <header className="page-head">
        <p className="vela-meta page-head__eyebrow">Start</p>
        <h1 className="vela-h2">Every component, every state</h1>
        <p className="vela-meta">{SHOWN.length} components · {PAIRS} contrast pairs, each asserted in both themes · set the theme in Appearance · <a href="#/how">how it is made</a></p>
      </header>
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
            <Button size="tiny" appearance="hollow" onClick={() => setAlerts([...SEVERITIES])}>Restore All</Button>
          )}
        </div>
      </Section>

      <Section title="Status Indicator" note="five health states — not severity's six, not risk's three">
        <div className="demo-row">
          {STATUSES.map((s) => (
            <StatusIndicator key={s} status={s} label={STATUS_WORDS[s]} />
          ))}
        </div>
        <p className="vela-meta">Without a visible label the dot still carries a text alternative:</p>
        <div className="demo-row">
          {STATUSES.map((s) => <StatusIndicator key={s} status={s} />)}
        </div>
      </Section>

      <Section title="Risk Pill" note="three risk levels — a score, not an event and not health · a label, never a control">
        <div className="demo-row">
          {RISKS.map((r) => <RiskPill key={r} risk={r} />)}
          <RiskPill risk="high" label="High · 87" />
        </div>
        <p className="vela-meta">Small, for dense tables — the regular size shares Button tiny's height:</p>
        <div className="demo-row">
          {RISKS.map((r) => <RiskPill key={r} risk={r} size="small" />)}
          <Button size="tiny" appearance="hollow">Review</Button>
          <RiskPill risk="medium" />
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
    </>
  )
}
