import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Button, Icon, cn } from '../../src'
import { IconButton } from '../../src/headless'
import { inline } from '../playground/Markdown'
import { CATALOG as REGISTRY } from '../playground/catalog'
import { PROPOSALS, loadProposal } from '../playground/proposals'
import type { ProposalDetail, ProposalState, ProposalPart, PromiseLevel, PartStatus } from '../playground/proposal-read'
import { WORKED_EXAMPLES, type WorkedExample } from '../playground/proposal-steps'
import { undash } from '../playground/rules-read'
import { LINKS } from '../links'
import { href } from '../router'
import { SectionIndex, useIndexForm, type SectionLink } from '../shell/SectionIndex'
import { NextCard } from '../shell/Card'
import { ShowMore, Rest, SHOW_FIRST } from '../shell/Fold'
import { useArrival } from '../shell/arrival'
import { partStatus, statusWords, Sketch, Pin, capital, quoteOf } from './proposal-parts'
import { listWords } from '../playground/proposal-read'
import { missingTag } from '../playground/search'
import '../playground.css'
import './proposal.css'

// A Proposal page (slice 4 of the playground uplift, s5-proposal: Storyboard B with three parts of
// Blueprint A). A written spec that is not built: no stage, no controls, no snippet and no install,
// and the page says so first. Everything below the banner is read from the spec (proposal-read.ts):
// - the job in steps, only from the spec's own worked example (proposal-steps.ts); a spec without
//   one leads with its states, and says why (open question 2, sweep P2);
// - every state, from the States table, as cards: six, then "Show N more";
// - where it sits, from "Built from", each part's status read from the kit's catalogue;
// - until it is built, the kit parts the spec builds on, in its own words, and any part the kit
//   lacks, flagged with the closest one it has;
// - promises, counted by how each will be checked; sources from the Intent; word sets;
// - Props, in a side panel that is a full sheet under 960 CSS px.
// Spec words reach the page through the display layer (`undash`), so no dash reaches a reader and
// no spec file is rewritten.
const BUILT = REGISTRY.map((e) => e.name)

type Page = ProposalDetail & { source: string }

export function Proposal({ id }: { id: string }) {
  const p = PROPOSALS.find((x) => x.id === id)
  const [page, setPage] = useState<Page | null>(null)
  useArrival()
  useEffect(() => {
    let live = true
    setPage(null)
    // The spec and its parser load together, when the page opens; neither is in the main bundle.
    const md = loadProposal(id)
    if (md && p) {
      Promise.all([md, import('../playground/proposal-read')]).then(([source, { readProposal }]) => {
        if (!live) return
        setPage({ ...readProposal(source, p.name, BUILT), source })
      })
    }
    return () => { live = false }
  }, [id, p])

  const [propsOpen, setPropsOpen] = useState(false)
  const propsButton = useRef<HTMLButtonElement>(null)
  const indexForm = useIndexForm()

  if (!p) return <p className="vela-body">No proposal called “{id}”.</p>
  const example = WORKED_EXAMPLES[id]
  const at = PROPOSALS.indexOf(p)
  const prev = PROPOSALS[at - 1]
  const next = PROPOSALS[at + 1]
  const spec = `${LINKS.github}/blob/main/guidelines/proposals/${p.file}`

  const index: SectionLink[] = page ? [
    { id: 'job', label: 'The job' },
    { id: 'states', label: 'Every state', count: page.states.length },
    { id: 'where', label: 'Where it sits' },
    { id: 'until', label: 'Until it is built' },
    { id: 'promises', label: 'Promises', count: page.promises.length },
    { id: 'sources', label: 'Why it exists', count: page.sources.length },
    ...(page.wordSets.length ? [{ id: 'words', label: 'Word sets', count: page.wordSets.length }] : []),
  ] : []

  return (
    <article className="doc proposal">
      <header className="pg-head proposal__head">
        <div className="pg-head__text">
          <p className="vela-meta pg-head__eyebrow">Components / Agent review</p>
          <div className="pg-head__title">
            <h1 className="vela-h2">{p.name}</h1>
            <span className="site-tag prop-chip">Proposal</span>
          </div>
          <p className="pg-head__line">{page ? plainLine(page.line) : plainLine(p.what)}</p>
          <p className="vela-meta proposal__facts">Experimental, not in the kit · no Figma set yet · nothing to install</p>
        </div>
        <div className="pg-head__use">
          {page && (
            <Button ref={propsButton} variant="primary" appearance="hollow" size="regular" aria-expanded={propsOpen} aria-controls="proposal-props" onClick={() => setPropsOpen((o) => !o)}>
              Show props <span className="proposal__count">{page.propRows.length}</span>
            </Button>
          )}
          <p className="pg-head__links">
            <a href={spec} target="_blank" rel="noreferrer">Read the spec<Icon name="external-link" size="small" /></a>
            {p.discuss && <a href={p.discuss} target="_blank" rel="noreferrer">Discuss on GitHub<Icon name="external-link" size="small" /></a>}
          </p>
        </div>
      </header>

      <div className="proposal__banner" role="note" data-arrive="1">
        <Icon name="info" />
        <p className="vela-body"><strong>This is a proposal, not a component.</strong> A written spec with no code yet, so there is nothing to install. Every picture on this page is a sketch.</p>
      </div>

      <div className={cn('shell-railpage', indexForm === 'strip' && 'is-narrow')} aria-busy={page ? undefined : true}>
        {page && (
          <div className="shell-railpage__rail">
            <SectionIndex items={index} form={indexForm} label="On this page" ready={!!page} />
          </div>
        )}
        <div className="shell-railpage__main proposal__main">
          {!page && <p className="vela-body">Loading this page…</p>}
          {page && (
            <>
              <Job name={p.name} page={page} example={example} />
              {example && <States states={page.states} />}
              <WhereItSits self={p.name} parts={page.parts} />
              <UntilBuilt parts={page.parts} discuss={p.discuss ?? `${LINKS.github}/issues`} />
              <Promises promises={page.promises} />
              <Sources sources={page.sources} />
              {page.wordSets.length > 0 && <WordSets sets={page.wordSets} />}
              <nav className="proposal__next" aria-label="More proposals">
                {prev && <NextCard eyebrow="Previous proposal" href={href({ kind: 'proposal', id: prev.id })} title={prev.name} line={plainLine(prev.what)} />}
                {next
                  ? <NextCard eyebrow="Next proposal" href={href({ kind: 'proposal', id: next.id })} title={next.name} line={plainLine(next.what)} />
                  : <NextCard eyebrow={`That is all ${numberWord(PROPOSALS.length)}`} href={href({ kind: 'overview' })} title="Back to every proposal" line="On the Overview, under Specified, not built yet" />}
              </nav>
            </>
          )}
        </div>
      </div>

      {page && (
        <PropsPanel
          name={p.name}
          rows={page.propRows}
          spec={spec}
          open={propsOpen}
          onClose={() => { setPropsOpen(false); propsButton.current?.focus() }}
        />
      )}
    </article>
  )
}

/** A clause as a sentence: it ends with a full stop. */
const sentence = (s: string) => (/[.!?]$/.test(s) ? s : `${s}.`)

/** Where a missing part stands, in words a reader can use: never a phase number. */
function standsWords(stands?: string): string {
  const tag = stands ? missingTag(stands) : 'Not in Vela'
  return tag === 'Planned' ? 'Planned, not built yet.' : tag === 'Specified' ? 'Specified, not built yet.' : 'Not planned yet.'
}

const NUMBERS = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const numberWord = (n: number) => NUMBERS[n] ?? String(n)

/** A spec line as plain words on the page: no markdown, no dash. */
const plainLine = (md: string) => undash(md).replace(/\*\*|`/g, '').replace(/\s+/g, ' ').trim()

function Heading({ id, children, aside }: { id: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="proposal__heading">
      <h2 id={`section-${id}`} className="vela-h3" tabIndex={-1}>{children}</h2>
      {aside && <p className="vela-meta">{aside}</p>}
    </div>
  )
}

// ------------------------------------------------------------------------------ the job --

function Job({ name, page, example }: { name: string; page: Page; example?: WorkedExample }) {
  if (!example) {
    // Sweep P2: no story is invented. The states lead until the spec gains a worked example.
    return (
      <>
        <section className="proposal__section" aria-labelledby="section-job" data-arrive="2">
          <Heading id="job">The job</Heading>
          <p className="vela-body proposal__lede">{plainLine(page.line)}</p>
          <div className="proposal__nostory" role="note">
            <Icon name="info" />
            <p className="vela-body">Steps are drawn from the spec's worked example. This spec has none yet, so its states lead.</p>
          </div>
        </section>
        <States states={page.states} arrive />
      </>
    )
  }
  return <Steps name={name} example={example} />
}

function Steps({ name, example }: { name: string; example: WorkedExample }) {
  const [at, setAt] = useState(0)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const base = useId()
  const steps = example.steps
  const step = steps[at]
  const go = (i: number, focus = false) => {
    const n = (i + steps.length) % steps.length
    setAt(n)
    if (focus) tabs.current[n]?.focus()
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); go(at + 1, true) }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); go(at - 1, true) }
    else if (e.key === 'Home') { e.preventDefault(); go(0, true) }
    else if (e.key === 'End') { e.preventDefault(); go(steps.length - 1, true) }
  }
  const last = at === steps.length - 1
  return (
    <section className="proposal__section" aria-labelledby="section-job" data-arrive="2">
      <Heading id="job" aside={`From the spec's worked example: ${capital(undash(example.label))}. The words are the spec's; grey bars stand for content it does not give.`}>
        The job, in {numberWord(steps.length)} steps
      </Heading>
      {/* Steps: a site stand-in for a storyboard, not a kit part. A tab list named "Steps", with arrow
          keys, as any Vela Tabs (sweep P27); each tab is a small sketch and the step's words. */}
      <div className="prop-steps" role="tablist" aria-label="Steps" onKeyDown={onKey}>
        {steps.map((s, i) => (
          <button
            key={i}
            ref={(el) => { tabs.current[i] = el }}
            type="button"
            role="tab"
            id={`${base}-tab-${i}`}
            aria-selected={i === at}
            aria-controls={`${base}-panel`}
            tabIndex={i === at ? 0 : -1}
            className="prop-step"
            onClick={() => go(i)}
          >
            <Sketch name={undash(s.title)} blocks={s.blocks} small />
            <span className="prop-step__words"><span className="prop-step__n">{i + 1}</span> {capital(undash(s.title))}</span>
          </button>
        ))}
      </div>
      <div className="prop-steps__panel" role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-tab-${at}`}>
        <Sketch name={`${name}, step ${at + 1}: ${undash(step.title)}`} caption={`From the spec's worked example, ${undash(example.label)}`} blocks={step.blocks} />
        <div className="prop-notice">
          <h3 className="vela-h6">What to notice</h3>
          <ol className="prop-notice__list">
            {step.notes.map((n) => (
              <li key={n.pin}><Pin n={n.pin} /><span>{capital(undash(n.text))}</span></li>
            ))}
          </ol>
          <p className="vela-meta">Grey bars stand for content the spec does not give.</p>
        </div>
      </div>
      <div className="prop-steps__nav">
        {/* Sweep P11: at step 1 Previous can't act and says why in its name; at the last, Next starts again. */}
        <Button size="tiny" appearance="hollow" variant="primary" icon={<Icon name="chevron-left" size="small" />} aria-disabled={at === 0 ? true : undefined} aria-label={at === 0 ? 'Previous: this is the first step' : undefined} onClick={() => { if (at > 0) go(at - 1) }}>
          Previous
        </Button>
        <span className="vela-meta" aria-live="polite">Step {at + 1} of {steps.length}</span>
        <Button size="tiny" appearance="hollow" variant="primary" icon={<Icon name={last ? 'rotate-ccw-clock' : 'arrow-right'} size="small" />} onClick={() => go(last ? 0 : at + 1)}>
          {last ? 'Start again' : 'Next'}
        </Button>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------- states --

/** A state's own name in the address: `?state=hidden-characters`. */
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const stateAsked = () => {
  const h = window.location.hash
  return new URLSearchParams(h.includes('?') ? h.slice(h.indexOf('?') + 1) : '').get('state')
}

function States({ states, arrive }: { states: ProposalState[]; arrive?: boolean }) {
  const asked = useMemo(stateAsked, [])
  const askedAt = states.findIndex((s) => slug(s.name) === asked)
  const [more, setMore] = useState(askedAt >= SHOW_FIRST)
  const [open, setOpen] = useState<Set<number>>(() => new Set(askedAt >= 0 ? [askedAt] : []))
  // Sweep P14: a link to one state reveals it past "Show N more", opens it and moves to it.
  useEffect(() => {
    if (askedAt < 0) return
    const el = document.getElementById(`state-${slug(states[askedAt].name)}`)
    if (el) { el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }); el.focus({ preventScroll: true }) }
  }, [askedAt, states])
  const card = (s: ProposalState, i: number) => (
    <StateCard key={s.name} state={s} open={open.has(i)} asked={i === askedAt} onToggle={() => setOpen((o) => { const n = new Set(o); if (n.has(i)) n.delete(i); else n.add(i); return n })} />
  )
  const rest = states.length - SHOW_FIRST
  return (
    <section className="proposal__section" aria-labelledby="section-states" data-arrive={arrive ? '3' : undefined}>
      <Heading id="states" aside={`${states.length} in the spec`}>Every state, drawn</Heading>
      <ul className="prop-states">{states.slice(0, SHOW_FIRST).map(card)}</ul>
      {rest > 0 && (
        <>
          <Rest as="ul" className="prop-states" shown={more} onFound={() => setMore(true)}>
            {states.slice(SHOW_FIRST).map((s, i) => card(s, i + SHOW_FIRST))}
          </Rest>
          {!more && <ShowMore more={rest} onShow={() => setMore(true)} />}
        </>
      )}
    </section>
  )
}

function StateCard({ state, open, asked, onToggle }: { state: ProposalState; open: boolean; asked: boolean; onToggle: () => void }) {
  const body = useId()
  const quote = quoteOf(state.renders)
  const name = plainLine(state.name)
  return (
    <li id={`state-${slug(state.name)}`} tabIndex={-1} className={cn('prop-state', open && 'is-open', asked && 'is-asked')}>
      <Sketch
        name={quote ? `${name}: ${quote}` : name}
        small
        blocks={[{ lines: quote ? [{ text: quote, kind: 'heading' }, { bar: 'long' }] : [{ bar: 'long' }, { bar: 'short' }] }]}
      />
      <h3 className="prop-state__name">{name}</h3>
      <button type="button" className="prop-more" aria-expanded={open} aria-controls={body} onClick={onToggle}>
        <Icon name={open ? 'chevron-down' : 'chevron-right'} size="small" />
        {open ? 'Less' : 'What it shows'}
      </button>
      <div id={body} className="prop-state__body" hidden={!open}>
        <p className="vela-body">{inline(undash(state.renders), 0, true)}</p>
      </div>
    </li>
  )
}

// ------------------------------------------------------------------------ where it sits --

function PartBox({ name, status, here }: { name: string; status: PartStatus; here?: boolean }) {
  const kind = here ? 'self' : status.kind
  const inner = (
    <>
      <span className="prop-part__name">{name}</span>
      <span className="prop-part__status">{here ? 'This page' : statusWords(status)}</span>
    </>
  )
  const link = !here && (status.kind === 'kit' || status.kind === 'proposal') ? status.href : undefined
  return link
    ? <a className={`prop-part prop-part--${kind}`} href={link}>{inner}</a>
    : <span className={`prop-part prop-part--${kind}`}>{inner}</span>
}

const AROUND_ORDER = ['around', 'later'] as const

function WhereItSits({ self, parts }: { self: string; parts: ProposalPart[] }) {
  const built = parts.filter((p) => p.role === 'built-from')
  return (
    <section className="proposal__section" aria-labelledby="section-where">
      <Heading id="where">Where it sits</Heading>
      <div className="prop-map">
        <div className="prop-map__row">
          <span className="prop-map__label">This page</span>
          <ul className="prop-map__parts"><li><PartBox name={self} status={{ kind: 'self' }} here /></li></ul>
        </div>
        <div className="prop-map__row">
          <span className="prop-map__label">Built from</span>
          <ul className="prop-map__parts">{built.map((p) => <li key={p.name}><PartBox name={p.name} status={partStatus(p.name)} /></li>)}</ul>
        </div>
        {AROUND_ORDER.map((role) => {
          const list = parts.filter((p) => p.role === role)
          if (!list.length) return null
          return (
            <div key={role} className="prop-map__row">
              <span className="prop-map__label">{role === 'around' ? 'Around it' : 'Later'}</span>
              <ul className="prop-map__parts">{list.map((p) => <li key={p.name}><PartBox name={p.name} status={partStatus(p.name)} /></li>)}</ul>
            </div>
          )
        })}
        <p className="vela-meta prop-map__key">Solid edge: in the kit. Dashed edge: a proposal, or not in the kit. Each box also says so in words. The ink edge is this page.</p>
      </div>
    </section>
  )
}

// ------------------------------------------------------------------- until it is built --

function UntilBuilt({ parts, discuss }: { parts: ProposalPart[]; discuss: string }) {
  const built = parts.filter((p) => p.role === 'built-from')
  const kit = built.filter((p) => partStatus(p.name).kind === 'kit')
  const missing = built.filter((p) => partStatus(p.name).kind === 'missing')
  const waiting = built.filter((p) => partStatus(p.name).kind === 'proposal').map((p) => p.name)
  return (
    <section className="proposal__section" aria-labelledby="section-until">
      <Heading id="until" aside="The kit's own parts this proposal is built from, and what the spec uses each for">Until it is built, use these</Heading>
      <ul className="prop-until">
        {kit.map((p) => {
          const s = partStatus(p.name) as Extract<PartStatus, { kind: 'kit' }>
          return (
            <li key={p.name} className="prop-until__item">
              <a className="prop-until__name" href={s.href}>{p.name}</a>
              <span className="site-tag">{s.status}</span>
              {p.words && <p className="vela-body prop-until__words">{sentence(capital(plainLine(p.words)))}</p>}
            </li>
          )
        })}
        {missing.map((p) => {
          const s = partStatus(p.name) as Extract<PartStatus, { kind: 'missing' }>
          return (
            <li key={p.name} className="prop-until__item prop-until__item--missing">
              <span className="prop-until__name">{p.name}</span>
              <span className="site-tag prop-chip">Not in the kit</span>
              <p className="vela-body prop-until__words">{p.words ? `Needed ${sentence(plainLine(p.words))} ` : ''}{standsWords(s.stands)}</p>
              {s.closest && <p className="vela-body prop-until__words">Closest in the kit today: <a href={s.closest.href}>{s.closest.name}</a></p>}
            </li>
          )
        })}
      </ul>
      {waiting.length > 0 && (
        <p className="vela-body">Waiting on {waiting.length === 1 ? 'one proposal' : `${numberWord(waiting.length)} proposals`}: {listWords(waiting)}{missing.length ? `, and on ${listWords(missing.map((m) => m.name))}, which the kit does not have` : ''}.</p>
      )}
      <p className="vela-meta proposal__ask">Want it built sooner? <a href={discuss} target="_blank" rel="noreferrer">Discuss on GitHub<Icon name="external-link" size="small" /></a></p>
    </section>
  )
}

// --------------------------------------------------------------------------- promises --

const CHECKERS: { level: PromiseLevel; words: string; icon: 'terminal' | 'circle-check' | 'eye' | 'user' }[] = [
  { level: 'compiler', words: 'The compiler will refuse', icon: 'terminal' },
  { level: 'runtime', words: 'A unit test will check', icon: 'circle-check' },
  { level: 'browser', words: 'A real browser will prove', icon: 'eye' },
  { level: 'convention', words: 'A reviewer will check', icon: 'user' },
]

function Promises({ promises }: { promises: ProposalDetail['promises'] }) {
  const proved = promises.filter((p) => p.level !== 'convention').length
  const [more, setMore] = useState<Set<PromiseLevel>>(new Set())
  return (
    <section className="proposal__section" aria-labelledby="section-promises">
      <Heading id="promises" aside={`${proved} will have a proof. None is checked yet: nothing is built.`}>{promises.length} promises, planned</Heading>
      <div className="prop-promises">
        {CHECKERS.map((c) => {
          const list = promises.filter((p) => p.level === c.level)
          if (!list.length) return null
          const shown = more.has(c.level)
          return (
            <section key={c.level} className="prop-promises__col" aria-label={`${c.words}: ${list.length}`}>
              <h3 className="prop-promises__head"><Icon name={c.icon} size="small" /><span>{c.words}</span><span className="prop-promises__n">{list.length}</span></h3>
              <ul className="prop-promises__list">{list.slice(0, SHOW_FIRST).map((p) => <li key={p.id}>{plainLine(p.lead)}</li>)}</ul>
              {list.length > SHOW_FIRST && (
                <>
                  <Rest as="ul" className="prop-promises__list" shown={shown} onFound={() => setMore((m) => new Set(m).add(c.level))}>
                    {list.slice(SHOW_FIRST).map((p) => <li key={p.id}>{plainLine(p.lead)}</li>)}
                  </Rest>
                  {!shown && <ShowMore more={list.length - SHOW_FIRST} onShow={() => setMore((m) => new Set(m).add(c.level))} />}
                </>
              )}
            </section>
          )
        })}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------- sources --

function Sources({ sources }: { sources: ProposalDetail['sources'] }) {
  return (
    <section className="proposal__section" aria-labelledby="section-sources">
      <Heading id="sources" aside={`${sources.length} sources, each from the spec`}>Why it exists</Heading>
      <ul className="prop-sources">
        {sources.map((s) => (
          <li key={s.title} className="prop-source">
            <Icon name="info" size="small" />
            <div>
              {s.href
                ? <a className="prop-source__title" href={s.href} target="_blank" rel="noreferrer">{plainLine(s.title)}<Icon name="external-link" size="small" /></a>
                : <span className="prop-source__title">{plainLine(s.title)}</span>}
              {s.line && <p className="vela-meta prop-source__line">{capital(plainLine(s.line))}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

// -------------------------------------------------------------------------- word sets --

function WordSets({ sets }: { sets: ProposalDetail['wordSets'] }) {
  const n = sets.length
  return (
    <section className="proposal__section" aria-labelledby="section-words">
      <Heading id="words" aside="Words only: no colour, no icon. They never cross Severity, Risk or Status.">
        {capital(numberWord(n))} new word {n === 1 ? 'set' : 'sets'}
      </Heading>
      <ul className="prop-sets">
        {sets.map((s) => (
          <li key={s.name} className="prop-set">
            <h3 className="prop-set__name">{s.name} · {s.values.length}</h3>
            <p className="vela-meta">{capital(plainLine(s.describes))}</p>
            <ul className="prop-set__values">{s.values.map((v) => <li key={v}><code>{v}</code></li>)}</ul>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ------------------------------------------------------------------------- props panel --

/**
 * Props, in a side panel (sweep P9, P10). Not a dialog: the page stays readable behind it and Tab
 * carries on into it. Opening moves focus to Close; Esc or Close shuts it and focus goes back to
 * the button that opened it. Under 960 CSS px it is a full sheet with "Back to the page".
 */
function PropsPanel({ name, rows, spec, open, onClose }: { name: string; rows: ProposalDetail['propRows']; spec: string; open: boolean; onClose: () => void }) {
  const close = useRef<HTMLDivElement>(null)
  const headingId = useId()
  useEffect(() => {
    if (!open) return
    close.current?.querySelector('button')?.focus()
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  return (
    <section id="proposal-props" className="prop-panel" hidden={!open} aria-labelledby={headingId}>
      <div className="prop-panel__back">
        <Button size="tiny" appearance="hollow" variant="primary" icon={<Icon name="arrow-left" size="small" />} onClick={onClose}>Back to the page</Button>
      </div>
      <div className="prop-panel__head">
        <h2 id={headingId} className="vela-h3">Props <span className="proposal__count">{rows.length}</span></h2>
        <div ref={close} className="prop-panel__close"><IconButton label={`Close the props of ${name}`} icon="x" size="regular" onClick={onClose} /></div>
      </div>
      <p className="vela-body">These may change before the component is built.</p>
      <dl className="prop-panel__rows">
        {rows.map((r) => (
          <div key={r.name} className="prop-panel__row">
            <dt><code className="prop-panel__name">{r.name}</code> <code className="prop-panel__type">{undash(r.type)}</code></dt>
            <dd className="vela-meta">{inline(undash(r.notes), 0)}</dd>
          </div>
        ))}
      </dl>
      <a href={spec} target="_blank" rel="noreferrer" className="prop-panel__spec">The full props table in the spec<Icon name="external-link" size="small" /></a>
    </section>
  )
}
