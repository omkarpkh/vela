import { useEffect, useId, type CSSProperties, type ReactNode } from 'react'
import { Button, Toggle, StatusIndicator, RiskPill, Tabs, Table, BrandMark } from '../../src'
import type { Status, Risk } from '../../src'
import { PROPOSALS } from '../playground/proposals'
import { figmaUrl } from '../links'
import { href } from '../router'
import { CopyButton, CopyStatus, useCopy } from '../shell/Copy'
import { ActionLink } from '../shell/ActionLink'
import { SeverityTag } from '../shell/SeverityTag'
import { ProductMark } from '../shell/ProductMark'
import { Card } from '../shell/Card'
import { CopyMorph } from '../shell/CopyMorph'
import { sectionOf, jumpTo } from '../shell/SectionIndex'
import { useArrival } from '../shell/arrival'
import { figmaOf } from '../playground/tokens'
import { OUTPUT_NAMES } from './How'
import {
  FACTS, RULES, RELEASED, STAMP, TARGETS, FOUNDATIONS_LINE, PROPOSAL_RULES,
  SEVERITIES, STATUSES, RISKS, STATUS_WORDS, moodStyle,
} from './overview-facts'
import './overview.css'

// The site's home, #/ (approved by Omkar on 1 Nov 2026, the playground thread's hand-off; redrawn in
// slice 6 of the playground uplift). Every number on it comes from the build (overview-facts.ts) and is
// marked with data-generated, so a unit test can take them away and find no digit left
// (src/styles/site-overview.test.tsx). The gallery that was here is All states, #/states.
//
// The brand parts are as approved (the logo states at 09:34 IST, the Overview at 09:45 IST): the Pulse
// mark beside the heading, which pulses once per visit and replays when pressed
// (demo/shell/ProductMark.tsx), and the mood stills behind the hero, for the theme the page resolved
// to. The panel is solid, so the text never sits on the image.
//
// Slice 6: the hero shows a small console made of Vela's own parts beside the panel; one primary
// action; the facts lighter; every way in, and every proposal, a card with a picture of where it goes.
// Pictures are the real parts, inert and hidden from assistive technology; their words are 12px or more.

const INSTALL = 'npm install @omkarux/vela'

/** A value the build counted or read. Inline, so it sits inside the sentence it belongs to. */
const G = ({ children }: { children: ReactNode }) => <span data-generated="">{children}</span>

function Install() {
  const id = useId()
  const { state, copy } = useCopy(INSTALL, id)
  return (
    <div className="ov-install">
      <div className="ov-install__line">
        <code id={id} className="ov-install__code">{INSTALL}</code>
        <CopyButton what="install command" onCopy={copy} />
      </div>
      <CopyStatus state={state} what="install command" />
    </div>
  )
}

/** A screen from a security console, built from the kit as it ships. A picture: inert, its words in the caption. */
const ROWS: { asset: string; status: Status; risk: Risk }[] = [
  { asset: 'vpn-edge-east', status: 'unhealthy', risk: 'high' },
  { asset: 'api-gateway', status: 'medium', risk: 'medium' },
  { asset: 'mail-relay', status: 'healthy', risk: 'low' },
]
function Console() {
  return (
    <figure className="ov-console" data-arrive="1">
      <div className="ov-console__screen" aria-hidden="true" inert>
        <Tabs defaultValue="assets">
          <Tabs.List aria-label="Views">
            <Tabs.Trigger value="alerts">Alerts</Tabs.Trigger>
            <Tabs.Trigger value="assets">Assets</Tabs.Trigger>
            <Tabs.Trigger value="audit">Audit</Tabs.Trigger>
          </Tabs.List>
        </Tabs>
        <Table caption="Assets" captionHidden density="compact">
          <Table.Head>
            <Table.Row><Table.HeaderCell>Asset</Table.HeaderCell><Table.HeaderCell>Health</Table.HeaderCell><Table.HeaderCell>Risk</Table.HeaderCell></Table.Row>
          </Table.Head>
          <Table.Body>
            {ROWS.map((r) => (
              <Table.Row key={r.asset}>
                <Table.HeaderCell scope="row">{r.asset}</Table.HeaderCell>
                <Table.Cell><StatusIndicator status={r.status} label={STATUS_WORDS[r.status]} /></Table.Cell>
                <Table.Cell><RiskPill risk={r.risk} size="small" /></Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
      <figcaption className="ov-console__caption">A console screen made of Vela: Tabs, Table, Status Indicator and Risk Pill, as they ship.</figcaption>
    </figure>
  )
}

function Fact({ n, line, link, to }: { n: ReactNode; line: ReactNode; link: string; to: string }) {
  return (
    <li className="ov-fact">
      <p className="ov-fact__n">{n}</p>
      <p className="ov-fact__line">{line}</p>
      <a className="ov-link" href={to}>{link}</a>
    </li>
  )
}

// ----------------------------------------------------------------------------- the pictures --
// Each is the real thing: the kit's own parts, the token file's own values, the build's own counts.

const paint = (token: string) => ({ background: `var(${token})` }) as CSSProperties

function ScalesThumb() {
  return (
    <span className="ov-thumb ov-thumb--scales">
      <span className="ov-thumb__col"><span className="ov-thumb__label">Severity</span>{SEVERITIES.map((s) => <SeverityTag key={s} severity={s} />)}</span>
      <span className="ov-thumb__col"><span className="ov-thumb__label">Status</span>{STATUSES.map((s) => <StatusIndicator key={s} status={s} label={STATUS_WORDS[s]} />)}</span>
      <span className="ov-thumb__col"><span className="ov-thumb__label">Risk</span>{RISKS.map((r) => <RiskPill key={r} risk={r} />)}</span>
    </span>
  )
}

function ComponentsThumb() {
  return (
    <span className="ov-thumb ov-thumb--stack">
      <span className="ov-thumb__row"><Button variant="primary" size="tiny">Add Rule</Button><Button variant="primary" appearance="hollow" size="tiny">Export</Button></span>
      <Toggle label="Email alerts" checked onChange={() => {}} size="tiny" />
      <span className="ov-thumb__row"><StatusIndicator status="healthy" label="Healthy" /><RiskPill risk="high" size="small" /></span>
    </span>
  )
}

const SWATCHES = ['--vela-btn-primary-bg', '--vela-signal-severity-critical', '--vela-signal-status-healthy', '--vela-signal-risk-medium', '--vela-text-heading']
const BARS = ['--vela-space-10', '--vela-space-20', '--vela-space-40']
function FoundationsThumb() {
  return (
    <span className="ov-thumb ov-thumb--stack">
      <span className="ov-thumb__row">{SWATCHES.map((t) => <span key={t} className="ov-thumb__swatch" style={paint(t)} />)}</span>
      <span className="ov-thumb__row"><span className="vela-h2 ov-thumb__aa">Aa</span><span className="vela-h4 ov-thumb__aa">Aa</span><span className="vela-meta">Aa</span></span>
      <span className="ov-thumb__bars">{BARS.map((t) => <span key={t} className="ov-thumb__bar" style={{ width: `var(${t})` } as CSSProperties} />)}</span>
    </span>
  )
}

function PatternsThumb() {
  return (
    <span className="ov-thumb ov-thumb--row">
      <code className="ov-thumb__code">npm install @omkarux/vela</code>
      <CopyMorph what="install command" text={INSTALL} box="small" pose={{ state: 'copied' }} />
      <span className="ov-thumb__label">Copied</span>
    </span>
  )
}

function RulesThumb() {
  return (
    <span className="ov-thumb ov-thumb--stack">
      <span className="ov-thumb__split">
        <span className="ov-thumb__part ov-thumb__part--auto" style={{ flexGrow: RULES.automated }} />
        <span className="ov-thumb__part ov-thumb__part--review" style={{ flexGrow: RULES.review }} />
      </span>
      <span className="ov-thumb__row ov-thumb__words">
        <span><span className="ov-thumb__key ov-thumb__key--auto" /><G>{RULES.automated}</G> proved by a machine</span>
        <span><span className="ov-thumb__key ov-thumb__key--review" /><G>{RULES.review}</G> by a reviewer</span>
      </span>
    </span>
  )
}

function HowThumb() {
  return (
    <span className="ov-thumb ov-thumb--how">
      <code className="ov-thumb__file">vela.tokens.json</code>
      <span className="ov-thumb__fan">{OUTPUT_NAMES.map((n) => <span key={n} className="ov-thumb__out">{n}</span>)}</span>
    </span>
  )
}

const FIGMA_VARS = ['--vela-btn-primary-bg', '--vela-text-default', '--vela-signal-severity-critical']
function FigmaThumb() {
  return (
    <span className="ov-thumb ov-thumb--row">
      <BrandMark name="figma" label="Figma" />
      <span className="ov-thumb__vars">
        {FIGMA_VARS.map((t) => <span key={t} className="ov-thumb__var"><span className="ov-thumb__dot" style={paint(t)} />{figmaOf(t)}</span>)}
      </span>
    </span>
  )
}

/** A proposal's rules as cells: filled for one that will have a proof, outlined for one a reviewer checks. On a dashed plate: it is a spec, not built. */
function ProposalThumb({ id }: { id: string }) {
  const r = PROPOSAL_RULES[id]
  if (!r) return <span className="ov-thumb ov-thumb--spec" />
  return (
    <span className="ov-thumb ov-thumb--spec">
      <span className="ov-thumb__cells">
        {Array.from({ length: r.rules }, (_, i) => <span key={i} className={i < r.proved ? 'ov-thumb__cell is-proved' : 'ov-thumb__cell'} />)}
      </span>
      <span className="ov-thumb__caption"><G>{r.rules}</G> rules, <G>{r.proved}</G> with a proof</span>
    </span>
  )
}

/** `theme` is the site's resolved theme (Appearance: System resolves to light or dark). */
export function Overview({ theme }: { theme: 'light' | 'dark' }) {
  useArrival()
  // A link to a section of the Overview (Not found's "proposals" card) lands on it, focused.
  useEffect(() => {
    const s = sectionOf(window.location.hash)
    if (s) jumpTo({ id: s, label: s })
  }, [])
  return (
    <article className="ov">
      <div className="ov-hero" style={moodStyle(theme) as CSSProperties}>
        {/* 128px beside the panel; 96px above it at 520px and below, and never smaller. */}
        <div className="ov-hero__mark">
          <ProductMark size="hero" on={theme} decorative animate="once" replay={{ label: 'Play the pulse' }} />
        </div>
        <div className="ov-hero__panel">
          <h1 className="vela-h1">Vela Design System</h1>
          <p className="vela-body ov-hero__claim">For data-heavy products, built first for security consoles. Every rule that can be tested is tested before a change ships.</p>
          <div className="ov-hero__actions">
            <ActionLink weight="primary" href={TARGETS.components}>Browse components</ActionLink>
          </div>
          <Install />
        </div>
        <Console />
      </div>

      <section className="ov-section" aria-labelledby="ov-check" data-arrive="2">
        <h2 id="ov-check" className="vela-h3">Check it yourself</h2>
        <ul className="ov-facts">
          <Fact n={<G>{RULES.total}</G>} line={<>rules in the specs, <G>{RULES.automated}</G> with an automated proof</>} link="See the rules" to={TARGETS.rules} />
          <Fact n={<G>{FACTS.checks}</G>} line="automated checks on every change" link="How they run" to={TARGETS.how} />
          <Fact n={<G>{FACTS.pairs}</G>} line="contrast pairs, light and dark" link="See the pairs" to={TARGETS.pairs} />
          <Fact n={<G>{FACTS.deps}</G>} line="runtime dependencies" link="See package.json" to={TARGETS.packageJson} />
          <Fact n={<G>{FACTS.built}</G>} line={<>components built, <G>{FACTS.specified}</G> more specified</>} link="See the status" to={TARGETS.status} />
        </ul>
        <p className="vela-meta ov-stamp"><G>{STAMP}</G></p>
      </section>

      <section className="ov-section" aria-labelledby="ov-security">
        <h2 id="ov-security" className="vela-h3">Built for security products</h2>
        <div className="ov-wide">
          <Card
            level={3}
            href={TARGETS.taxonomies}
            title={<>Severity <G>{SEVERITIES.length}</G>, status <G>{STATUSES.length}</G>, risk <G>{RISKS.length}</G></>}
            line="An event, a thing's health, a score. Three scales with their own tokens and words, never mixed, and colour is never the only signal."
            thumbnail={<ScalesThumb />}
          />
        </div>
      </section>

      <section className="ov-section" aria-labelledby="ov-ways">
        <h2 id="ov-ways" className="vela-h3">Ways in</h2>
        <ul className="ov-ways">
          <li><Card level={3} href={TARGETS.components} title="Components" line={<><G>{FACTS.built}</G> built, with a workbench for each</>} thumbnail={<ComponentsThumb />} /></li>
          <li><Card level={3} href={TARGETS.foundations} title="Foundations" line={<G>{FOUNDATIONS_LINE}</G>} thumbnail={<FoundationsThumb />} /></li>
          <li><Card level={3} href={TARGETS.patterns} title="Patterns" line="Decisions across components, starting with Copy" thumbnail={<PatternsThumb />} /></li>
          <li><Card level={3} href={TARGETS.rules} title="Rules" line="Every rule, by component, with its proof" thumbnail={<RulesThumb />} /></li>
          <li><Card level={3} href={TARGETS.how} title="How it is made" line="One token file, made into everything else" thumbnail={<HowThumb />} /></li>
          <li><Card level={3} href={figmaUrl()} title="Figma library" line="The same tokens and components, for design" thumbnail={<FigmaThumb />} /></li>
        </ul>
      </section>

      <section className="ov-section" aria-labelledby="section-proposals">
        <h2 id="section-proposals" className="vela-h3" tabIndex={-1}>Specified, not built yet</h2>
        <p className="vela-body ov-lede">Agentic components, written as specs before any code.</p>
        <ul className="ov-proposals">
          {PROPOSALS.map((p) => (
            <li key={p.id}><Card level={3} href={href({ kind: 'proposal', id: p.id })} title={<span data-generated="">{p.name}</span>} line={<span data-generated="">{p.what}</span>} thumbnail={<ProposalThumb id={p.id} />} className="ov-proposal" /></li>
          ))}
        </ul>
      </section>

      <section className="ov-section" aria-labelledby="ov-new">
        <h2 id="ov-new" className="vela-h3">New in <G>{RELEASED.version}</G></h2>
        <p className="vela-meta ov-stamp">Released <G>{RELEASED.date}</G></p>
        <ul className="vela-body ov-highlights">{RELEASED.highlights.map((h) => <li key={h} data-generated="">{h}</li>)}</ul>
        <a className="ov-link" href={TARGETS.changelog}>All changes</a>
      </section>

      <footer className="ov-foot">
        <ul className="vela-meta ov-foot__links">
          <li><a href={TARGETS.roadmap}>Roadmap</a></li>
          <li><a href={TARGETS.governance}>Governance</a></li>
          <li><a href={TARGETS.changelog}>Changelog</a></li>
          <li><a href={TARGETS.licence}>MIT licence</a></li>
        </ul>
      </footer>
    </article>
  )
}
