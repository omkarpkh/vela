import { useId, type ReactNode } from 'react'
import { StatusIndicator, RiskPill } from '../../src'
import { PROPOSALS } from '../nav'
import { figmaUrl } from '../links'
import { href } from '../router'
import { CopyButton, CopyStatus, useCopy } from '../shell/Copy'
import { ActionLink } from '../shell/ActionLink'
import { SeverityTag } from '../shell/SeverityTag'
import {
  FACTS, RULES, RELEASED, STAMP, TARGETS, FOUNDATIONS_LINE,
  SEVERITIES, STATUSES, RISKS, STATUS_WORDS,
} from './overview-facts'
import './overview.css'

// The site's home, #/ (approved by Omkar on 1 Nov 2026, the playground thread's hand-off). Every
// number on it comes from the build (overview-facts.ts) and is marked with data-generated, so a
// unit test can take them away and find no digit left (src/styles/site-overview.test.tsx). The
// gallery that was here is All states, #/states.
//
// Brand parts come in a second pass: the hero's mark (the empty slot below) and the mood
// background behind the hero panel. The panel is solid so that background never shows through it.

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

function Fact({ n, line, link, to }: { n: ReactNode; line: ReactNode; link: string; to: string }) {
  return (
    <li className="ov-fact">
      <p className="ov-fact__n">{n}</p>
      <p className="vela-body ov-fact__line">{line}</p>
      <a className="ov-link" href={to}>{link}</a>
    </li>
  )
}

function Way({ title, line, to }: { title: string; line: ReactNode; to: string }) {
  return (
    <li>
      <a className="ov-way" href={to}>
        <h3 className="vela-h4 ov-way__title">{title}</h3>
        <span className="vela-body ov-way__line">{line}</span>
      </a>
    </li>
  )
}

export function Overview() {
  return (
    <article className="ov">
      <div className="ov-hero">
        {/* The mark's slot (second pass): 128px beside the panel, 96px above it at 520px and below. Empty, it takes no space. */}
        <div className="ov-hero__mark" aria-hidden="true" />
        <div className="ov-hero__panel">
          <h1 className="vela-h1">Vela Design System</h1>
          <p className="vela-body ov-hero__claim">A token-first design system for security products. Every enforceable rule carries a proof, or the build fails.</p>
          <Install />
          <div className="ov-hero__actions">
            <ActionLink weight="primary" href={TARGETS.components}>Browse components</ActionLink>
            <ActionLink weight="secondary" href={figmaUrl()}>Open the Figma library</ActionLink>
          </div>
        </div>
      </div>

      <section className="ov-section" aria-labelledby="ov-check">
        <h2 id="ov-check" className="vela-h3">Check it yourself</h2>
        <p className="vela-body ov-lede">Each number is counted by the build, and each link opens the proof.</p>
        <ul className="ov-facts">
          <Fact n={<G>{RULES.total}</G>} line={<>rules in the specs. <G>{RULES.automated}</G> have an automated proof; <G>{RULES.review}</G> are checked in review.</>} link="See the rules" to={TARGETS.rules} />
          <Fact n={<G>{FACTS.checks}</G>} line="automated checks, run on every change" link="How they run" to={TARGETS.how} />
          <Fact n={<G>{FACTS.pairs}</G>} line="contrast pairs, each checked in light and dark" link="See the pairs" to={TARGETS.pairs} />
          <Fact n={<G>{FACTS.deps}</G>} line="runtime dependencies in the core" link="See package.json" to={TARGETS.packageJson} />
          <Fact n={<G>{FACTS.built}</G>} line={<>components built, and <G>{FACTS.specified}</G> more specified</>} link="See the status" to={TARGETS.status} />
        </ul>
        <p className="vela-meta ov-stamp"><G>{STAMP}</G></p>
      </section>

      <section className="ov-section" aria-labelledby="ov-security">
        <h2 id="ov-security" className="vela-h3">Built for security products</h2>
        <p className="vela-body ov-lede">Severity is an event, status is health, and risk is a score. Each has its own tokens and its own words, and always carries its label, so colour is never the only signal.</p>
        <div className="ov-cards">
          <div className="ov-card">
            <h3 className="vela-h4">Severity · <G>{SEVERITIES.length}</G></h3>
            <p className="vela-meta">For alerts and findings</p>
            <ul className="ov-chips">{SEVERITIES.map((s) => <li key={s}><SeverityTag severity={s} /></li>)}</ul>
          </div>
          <div className="ov-card">
            <h3 className="vela-h4">Status · <G>{STATUSES.length}</G></h3>
            <p className="vela-meta">For the health of a thing</p>
            <ul className="ov-chips">{STATUSES.map((s) => <li key={s}><StatusIndicator status={s} label={STATUS_WORDS[s]} /></li>)}</ul>
          </div>
          <div className="ov-card">
            <h3 className="vela-h4">Risk · <G>{RISKS.length}</G></h3>
            <p className="vela-meta">For a score, such as an asset's</p>
            <ul className="ov-chips">{RISKS.map((r) => <li key={r}><RiskPill risk={r} /></li>)}</ul>
          </div>
        </div>
      </section>

      <section className="ov-section" aria-labelledby="ov-ways">
        <h2 id="ov-ways" className="vela-h3">Ways in</h2>
        <ul className="ov-ways">
          <Way title="Components" line={<><G>{FACTS.built}</G> built, with a workbench for each</>} to={TARGETS.components} />
          <Way title="Patterns" line="Decisions across components, starting with Copy" to={TARGETS.patterns} />
          <Way title="Foundations" line={<G>{FOUNDATIONS_LINE}</G>} to={TARGETS.foundations} />
          <Way title="Rules" line="Every rule, by component, with its proof" to={TARGETS.rules} />
          <Way title="Figma library" line="The same tokens and components, for design" to={figmaUrl()} />
          <Way title="All states" line="Every component in every state on one page" to={TARGETS.states} />
        </ul>
      </section>

      <div className="ov-news">
        <section className="ov-section" aria-labelledby="ov-new">
          <h2 id="ov-new" className="vela-h3">New in <G>{RELEASED.version}</G></h2>
          <p className="vela-meta">Released <G>{RELEASED.date}</G></p>
          <ul className="vela-body ov-highlights">{RELEASED.highlights.map((h) => <li key={h} data-generated="">{h}</li>)}</ul>
          <a className="ov-link" href={TARGETS.changelog}>All changes</a>
        </section>
        <section className="ov-section" aria-labelledby="ov-specified">
          <h2 id="ov-specified" className="vela-h3">Specified, not built yet</h2>
          <p className="vela-body ov-lede">Agentic components, written as specs, before any code</p>
          <ul className="ov-tags">
            {PROPOSALS.map((p) => <li key={p.id}><a className="ov-tag" href={href({ kind: 'proposal', id: p.id })} data-generated="">{p.title}</a></li>)}
          </ul>
        </section>
      </div>

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
