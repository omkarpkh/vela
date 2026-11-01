import { Fragment, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button, Icon, Table, Toggle, cn } from '../../src'
import { inline } from '../playground/Markdown'
import { CopyMorph, type MorphPose, type MorphState } from '../shell/CopyMorph'
import { COPY_WORDS, PLATFORM, type Platform } from '../shell/Copy'
import { CopyGroupProvider } from '../shell/CopyGroup'
import { Segments } from '../shell/Segments'
import { Stage } from '../shell/Stage'
import { SectionIndex, useIndexForm, type SectionLink } from '../shell/SectionIndex'
import { useArrival } from '../shell/arrival'
import { LINKS } from '../links'
import {
  SECTIONS, section, Words, Example, Drawing, CopyValue, MarkSlot, useAnnouncer, failureWords, fetchSecret, escapeHidden,
  ZWSP, NBSP, LQ, RQ, PLATFORMS, platformWord, wordsRows, wordsFor, type WordsRow,
} from './copy-parts'
import { MoreSections, SHOWN_MORE } from './copy-more'
import { visible, tableOf } from './copy-read'
import '../playground.css'

// The Copy pattern page (playground spec, section 12): guidelines/patterns/copy.md, told with live
// examples. Slice 6a: the opening and sections 1 to 4; sections 5 to 13 follow in 6b. The words
// are read from copy.md, so the page and the repository cannot drift; a live example leads each
// numbered section, and the words are its caption. The examples use the icon thread's lab build as
// a shell part (demo/shell/CopyMorph.tsx), labelled "Experimental, not yet in the kit". Switches
// simulate a browser's refusals and say so; they never touch the browser's settings or permissions.

/** The sections the page shows: all of copy.md's, the opening and 1 to 13. */
export const SHOWN = [0, 1, 2, 3, 4, ...SHOWN_MORE]

// ------------------------------------------------------------------------------ opening --

const HOSTS = [
  { host: 'db-primary', ip: '10.42.7.19' },
  { host: 'cache-02', ip: '10.42.7.44' },
  { host: 'edge-11', ip: '10.42.8.3' },
]

function Opening({ announce }: { announce: (m: string) => void }) {
  const s = section(0)
  const aside = questionOf(s.body)
  // The opening's example is the page's lead: a stage, which says what the demo is made with. The
  // control is the site's own stand-in (demo/shell/CopyMorph.tsx), not a kit part (slice 4).
  return (
    <section id="copy-s0" className="copy-section copy-section--opening" aria-label="Opening">
      <Stage caption="Live demo" note="Made with the site's own copy control, not a kit part. Copy any address." arrive="1">
        <Table caption="Hosts" density="compact">
          <Table.Head>
            <Table.Row>
              <Table.HeaderCell>Host</Table.HeaderCell>
              <Table.HeaderCell>IP address</Table.HeaderCell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {HOSTS.map((h) => (
              <Table.Row key={h.host}>
                <Table.HeaderCell scope="row">{h.host}</Table.HeaderCell>
                <Table.Cell>
                  <CopyValue
                    id={`host-${h.host}`}
                    what={`${h.host} IP address`}
                    text={h.ip}
                    copyId={`host-${h.host}`}
                    announce={announce}
                  />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Stage>
      <Words body={s.body} skip={(b) => b.trim() === aside} />
    </section>
  )
}

/** The opening's italic question line, the page's one line under its title: "*Did it work? …*". */
function questionOf(body: string): string | undefined {
  return body.split(/\n\s*\n/).map((b) => b.trim()).find((b) => /^\*[^*].*\*$/.test(b))
}

/** The pattern's status word, from its **Status:** line. */
const statusWord = (body: string) => body.match(/\*\*Status:\*\*\s*([A-Z][a-z]+)/)?.[1]

/** The components that carry the pattern out, from its "Carried out by" list. */
function carriedBy(body: string): string[] {
  const at = body.indexOf('**Carried out by**')
  if (at < 0) return []
  const list = body.slice(at).split(/\n\s*\n/)[1] ?? ''
  return [...list.matchAll(/^- \*\*([^*]+)\*\*/gm)].map((m) => m[1])
}

// ---------------------------------------------------------------------------- section 1 --

function exportCsv() {
  const csv = ['host,ip', ...HOSTS.map((h) => `${h.host},${h.ip}`)].join('\n') + '\n'
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'hosts-sample.csv'
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function WhenToOffer({ announce }: { announce: (m: string) => void }) {
  const marker = (id: string) => ({ copyId: `do-${id}` })
  const s = section(1)
  const pairs: { title: string; doCopy: string; dont: string; alt: string; live: ReactNode; drawing: ReactNode }[] = [
    {
      title: 'Always visible', doCopy: 'Visible at rest, not only on hover.', dont: 'Shown only when the row is hovered: touch never sees it.',
      alt: 'Don\'t: the IP address 10.42.7.19 with an empty space where a copy control appears only on hover.',
      live: <CopyValue id="do-visible" what="IP address" text="10.42.7.19" announce={announce} {...marker('visible')} />,
      drawing: <span className="copy-drawing__row"><span className="copy-value__text">10.42.7.19</span><span className="copy-drawing__ghost">on hover</span></span>,
    },
    {
      title: 'No value, no control', doCopy: 'The field reads "Not set".', dont: 'A disabled copy button on a placeholder.',
      alt: 'Don\'t: a dash as a placeholder with a disabled copy button beside it.',
      live: <span className="copy-pair__field"><span className="copy-pair__key">Owner</span> Not set</span>,
      drawing: <span className="copy-drawing__row"><span>—</span><span className="copy-drawing__box copy-drawing__box--off">Copy</span></span>,
    },
    {
      title: 'Copy the full value', doCopy: 'Shows 1.2k, copies 1,200.', dont: 'Copies what the screen happens to show: "2 min ago".',
      alt: 'Don\'t: a copy control beside "2 min ago" that copies the words "2 min ago".',
      live: <CopyValue id="do-full" what="event count, 1,200" text="1,200" shown={<data value="1200">1.2k</data>} mono={false} announce={announce} {...marker('full')} />,
      drawing: <span className="copy-drawing__row"><span>2 min ago</span><span className="copy-drawing__box">Copy</span><span>copies “2 min ago”</span></span>,
    },
    {
      title: 'A secret is fetched', doCopy: 'Dots until it is copied; the key is fetched at the press. [sample]', dont: 'The secret sits in the page, masked by CSS.',
      alt: 'Don\'t: a masked key whose full value is in the page\'s markup, hidden only by CSS.',
      live: <CopyValue id="do-secret" what="API key [sample]" text={fetchSecret('a9F2')} shown="•••••••• a9F2" announce={announce} {...marker('secret')} />,
      drawing: <span className="copy-drawing__row"><span className="copy-value__text">•••••••• a9F2</span><span className="copy-drawing__note">the full key, in the markup</span></span>,
    },
    {
      title: 'Many rows are an export', doCopy: 'Export the hosts as a file.', dont: 'A "Copy table" button: hundreds of rows pasted as one block of text.',
      alt: 'Don\'t: a "Copy table" button that puts a whole table on the clipboard.',
      live: <Button size="tiny" appearance="hollow" onClick={exportCsv}>Export CSV</Button>,
      drawing: <span className="copy-drawing__row"><span className="copy-drawing__box">Copy table</span></span>,
    },
  ]
  return (
    <section className="copy-section" aria-labelledby="copy-s1">
      <h2 id="copy-s1" className="vela-h3">1 · {s.title}</h2>
      <CasePicker body={s.body} />
      <h3 className="vela-h5 copy-pairs__title">Do and don't, {pairs.length === 5 ? 'five' : pairs.length} pairs</h3>
      <Example label="Do (live) beside don't (drawn)">
        <ul className="copy-pairs">
          {pairs.map((p) => (
            <li key={p.title} className="copy-pair">
              <h3 className="vela-h6 copy-pair__title">{p.title}</h3>
              <div className="copy-pair__side">
                <p className="vela-meta copy-pair__verdict"><strong>Do.</strong> {p.doCopy}</p>
                <div className="copy-pair__live">{p.live}</div>
              </div>
              <div className="copy-pair__side copy-pair__side--dont">
                <p className="vela-meta copy-pair__verdict"><strong>Don&apos;t.</strong> {p.dont}</p>
                <Drawing alt={p.alt}>{p.drawing}</Drawing>
              </div>
            </li>
          ))}
        </ul>
      </Example>
      <Words body={s.body} skip={(b) => b.trim().startsWith('| You have')} />
    </section>
  )
}

/**
 * Section 1 as a picker (slice 4; sweep C6, C7): what you have, then the answer. The answer is a
 * polite live region, so a new choice is heard once; "See all 6 cases as one table" shows every
 * answer at once, the chosen row marked. Both read the section's own table.
 */
function CasePicker({ body }: { body: string }) {
  const table = body.split(/\n\s*\n/).find((b) => b.trim().startsWith('| You have')) ?? ''
  const [head, ...rows] = tableOf(table)
  const [at, setAt] = useState(1)
  const [all, setAll] = useState(false)
  const name = useId()
  const tableId = useId()
  if (!rows.length) return null
  return (
    <Example label="Pick what you have; the answer follows">
      <div className="copy-cases">
        <fieldset className="copy-cases__pick">
          <legend className="vela-h6">{head[0]}</legend>
          {rows.map((r, i) => (
            <label key={i} className={cn('copy-case', i === at && 'is-current')}>
              <input type="radio" name={name} checked={i === at} onChange={() => setAt(i)} />
              <span>{inline(r[0], 0)}</span>
            </label>
          ))}
        </fieldset>
        <div className="copy-cases__answer" aria-live="polite">
          <p className="vela-meta copy-cases__use">{head[1]}</p>
          <p className="vela-h4 copy-cases__words">{inline(rows[at][1], 0)}</p>
        </div>
      </div>
      <button type="button" className="copy-cases__all" aria-expanded={all} aria-controls={tableId} onClick={() => setAll((a) => !a)}>
        <Icon name={all ? 'chevron-down' : 'chevron-right'} size="small" />
        See all {rows.length} cases as one table
      </button>
      <div id={tableId} className="copy-cases__table" hidden={!all}>
        <Table caption={`When to offer copy: all ${rows.length} cases`} captionHidden>
          <Table.Head>
            <Table.Row>
              <Table.HeaderCell>{head[0]}</Table.HeaderCell>
              <Table.HeaderCell>{head[1]}</Table.HeaderCell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {rows.map((r, i) => (
              <Table.Row key={i} selected={i === at}>
                <Table.HeaderCell scope="row">{inline(r[0], 0)}</Table.HeaderCell>
                <Table.Cell>{inline(r[1], 0)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
    </Example>
  )
}

// ---------------------------------------------------------------------------- section 2 --

const STEPS = ['rest', 'hover', 'press', 'copied', 'away', 'return', 'marked', 'failed'] as const
type Step = (typeof STEPS)[number]
const STEP_LABEL: Record<Step, string> = { rest: 'Rest', hover: 'Hover', press: 'Press', copied: 'Copied', away: 'Away', return: 'Return', marked: 'Marked', failed: 'Failed' }
const POSE: Record<Exclude<Step, 'return'>, MorphPose> = {
  rest: { state: 'idle' }, hover: { state: 'hover' }, press: { state: 'hover', press: true },
  copied: { state: 'copied' }, away: { state: 'copied' }, marked: { state: 'idle' }, failed: { state: 'failed' },
}
const SLOW = 5
/** The glyph each frame of the strip shows: the mark at rest, the tick once copied, the failure. */
const FRAME_GLYPH: Record<Step, 'copy' | 'check' | 'circle-alert'> = {
  rest: 'copy', hover: 'copy', press: 'copy', copied: 'check', away: 'check', return: 'copy', marked: 'copy', failed: 'circle-alert',
}

/** The §2 list of states, keyed by the step its bold lead names ("**Rest.**", "**Hover** (pointer only)."). */
function statesOf(body: string) {
  const list = body.split(/\n\s*\n/).find((b) => b.startsWith('- **Rest.**')) ?? ''
  const items: { step: Step; text: string; sub: string[] }[] = []
  for (const l of list.split('\n')) {
    const m = l.match(/^- \*\*(\w+)/)
    if (m) items.push({ step: m[1].toLowerCase() as Step, text: l.slice(2), sub: [] })
    else if (/^\s+- /.test(l)) items[items.length - 1]?.sub.push(l.replace(/^\s+- /, ''))
  }
  return { list, items }
}

function HowItWorks({ announce }: { announce: (m: string) => void }) {
  const s = section(2)
  const { list, items } = useMemo(() => statesOf(s.body), [s.body])
  const [step, setStep] = useState<Step>('rest')
  const [speed, setSpeed] = useState<'1' | 'slow'>('1')
  const [pose, setPose] = useState<MorphPose>(POSE.rest)
  const stage = useRef<HTMLDivElement>(null)
  const timers = useRef<number[]>([])

  const choose = (next: Step) => {
    timers.current.forEach(clearTimeout)
    setStep(next)
    if (next !== 'return') { setPose(POSE[next]); return }
    // The return starts from the tick: put it there at once, then hand back.
    if (pose.state !== 'copied') setPose({ state: 'copied', instant: true })
    timers.current = [window.setTimeout(() => setPose({ state: 'idle', ret: true }), 40)]
  }
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // 5× slower: every transition on the stage plays at a fifth of its rate, including ones that start
  // later, which the frame loop catches on their first frame. No stylesheet changes.
  useEffect(() => {
    const el = stage.current
    if (speed !== 'slow' || !el || typeof el.getAnimations !== 'function') return
    let frame = 0
    const tick = () => {
      for (const a of el.getAnimations({ subtree: true })) if (a.playbackRate !== 1 / SLOW) a.playbackRate = 1 / SLOW
      frame = requestAnimationFrame(tick)
    }
    tick()
    return () => { cancelAnimationFrame(frame); for (const a of el.getAnimations({ subtree: true })) a.playbackRate = 1 }
  }, [speed])

  return (
    <section className="copy-section" aria-labelledby="copy-s2">
      <h2 id="copy-s2" className="vela-h3">2 · {s.title}</h2>
      <Example label="Choose a state to see the control in it. The states run in this order; Failed is the other path.">
        <div className="pg-toolbar copy-toolbar">
          {/* The frame strip is a picker (slice 4): each frame names its state and shows the mark in it. */}
          <div className="copy-strip" role="group" aria-label="State">
            {STEPS.map((v) => (
              <Fragment key={v}>
                {v === 'failed' && <span className="copy-strip__or" aria-hidden="true">or</span>}
                <button type="button" className={cn('copy-strip__frame', v === 'failed' && 'is-other')} aria-current={v === step ? 'true' : undefined} onClick={() => choose(v)}>
                  <Icon name={FRAME_GLYPH[v]} />
                  <span>{STEP_LABEL[v]}</span>
                </button>
              </Fragment>
            ))}
          </div>
          <Segments label="Speed" value={speed} options={[{ value: '1', label: '1×' }, { value: 'slow', label: '5× slower' }] as const} onChange={setSpeed} />
        </div>
        <p className="copy-strip__now" aria-live="polite">{inline(items.find((it) => it.step === step)?.text ?? '', 0)}</p>
        <div className="copy-stage" ref={stage}>
          <CopyMorph what="request id, large preview" text="req_8f2a91c4e7" box="preview" pose={pose} onResult={(r) => announce(r === 'copied' ? 'Copied request id' : failureWords(r, PLATFORM))} />
          <div className="copy-stage__side" aria-hidden="true">
            <MarkSlot word={step === 'marked' ? 'Copied' : null} />
            {step === 'away' && <span className="vela-meta">The page is hidden: the hold waits.</span>}
            {step === 'failed' && <span className="copy-value__msg">{COPY_WORDS.selected[PLATFORM]}</span>}
          </div>
        </div>
        {/* The words are the caption: the state on show is marked in words as well as by its edge. */}
        <ol className="pg-list copy-states">
          {items.map((it) => (
            <li key={it.step} className={it.step === step ? 'is-current' : undefined} aria-current={it.step === step ? 'step' : undefined}>
              {it.step === step && <span className="site-tag copy-states__now">Showing</span>} {inline(it.text, 0)}
              {it.sub.length > 0 && <ul className="pg-list">{it.sub.map((x, j) => <li key={j}>{inline(x, j)}</li>)}</ul>}
            </li>
          ))}
        </ol>
        <h3 className="vela-h6 copy-try__title">At real size, to try</h3>
        <p className="copy-try">
          <span className="copy-pair__key">Request id</span>{' '}
          <CopyValue id="try-request" what="request id" text="req_8f2a91c4e7" copyId="try-request" announce={announce} />
        </p>
      </Example>
      <Words body={s.body} skip={(b) => b === list} />
    </section>
  )
}

// ---------------------------------------------------------------------------- section 3 --

type Kind = 'request' | 'invite' | 'key' | 'command' | 'multiline' | 'hidden' | 'curly'
type Spot = 'name' | 'tooltip' | 'announced' | 'description' | 'beside' | 'under'
interface Specimen { kind: Kind; state: MorphState; spots: Spot[]; mark?: string; select?: boolean }

const KINDS: Record<Kind, { label: string; what: string; value: string; shown?: string }> = {
  request: { label: 'Request id', what: 'request id', value: 'req_8f2a91c4e7' },
  invite: { label: 'Invite link', what: 'invite link', value: 'https://vela.example/invite/7Q2f9xLm' },
  key: { label: 'API key [sample]', what: 'API key', value: 'vela_sample_7Q2f9xLm', shown: '•••••••• 9xLm' },
  command: { label: 'Command', what: 'command', value: 'vela scan --host 10.42.7.19\n' },
  multiline: { label: 'Command', what: 'command', value: 'vela login\nvela scan --host 10.42.7.19\nvela report --last' },
  hidden: { label: 'Command', what: 'command', value: `vela scan --host${ZWSP} 10.42.7.19` },
  curly: { label: 'Command', what: 'command', value: `vela scan --tag ${LQ}prod${RQ} --host${NBSP}10.42.7.19` },
}
/** Each row of the words table, keyed by its moment and its words, and how the specimen shows it. */
const SPECIMENS: Record<string, Specimen> = {
  'At rest': { kind: 'request', state: 'idle', spots: ['name', 'tooltip'] },
  'Tick showing, pointer or focus arrives': { kind: 'request', state: 'copied', spots: ['tooltip'] },
  'Copied': { kind: 'request', state: 'copied', spots: ['announced'] },
  'Fetching a value': { kind: 'invite', state: 'busy', spots: ['tooltip', 'description'] },
  'Marked, in a group · Copied': { kind: 'request', state: 'idle', spots: ['beside'] },
  'Marked, in a group · Copied here earlier. Copy again to be sure.': { kind: 'request', state: 'idle', spots: ['description'], mark: 'Copied' },
  'A secret copied': { kind: 'key', state: 'copied', spots: ['announced', 'tooltip'] },
  'A command copied': { kind: 'command', state: 'copied', spots: ['announced', 'tooltip'] },
  'A multi-line command copied': { kind: 'multiline', state: 'copied', spots: ['announced', 'tooltip'] },
  'Hidden characters found': { kind: 'hidden', state: 'idle', spots: ['beside', 'description'] },
  'Curly quotes or non-breaking spaces': { kind: 'curly', state: 'idle', spots: ['beside', 'description'] },
  'Changed since copied · Changed since you copied': { kind: 'key', state: 'idle', spots: ['beside'] },
  'Changed since copied · This value changed after you copied it. Copy again to get the new one.': { kind: 'key', state: 'idle', spots: ['description'], mark: 'Changed since you copied' },
  'Blocked, text selected': { kind: 'request', state: 'failed', spots: ['announced', 'description'], select: true },
  'Blocked, nothing selected': { kind: 'request', state: 'failed', spots: ['announced', 'description'] },
  'A secret blocked, may reveal': { kind: 'key', state: 'failed', spots: ['under'] },
  'A secret blocked, may not reveal': { kind: 'key', state: 'failed', spots: ['under'] },
  'A secret shown to copy': { kind: 'key', state: 'idle', spots: ['under'], select: true },
  'A fetch failed': { kind: 'invite', state: 'failed', spots: ['announced', 'description'] },
}
const SPOT_LABEL: Record<Spot, string> = { name: 'Name', tooltip: 'Tooltip', announced: 'Announced', description: 'Description', beside: 'Beside the value', under: 'Under the value' }

function WordsSection({ announce }: { announce: (m: string) => void }) {
  const s = section(3)
  const rows = useMemo(wordsRows, [])
  const [row, setRow] = useState<WordsRow>(rows[0])
  const [pose, setPose] = useState<MorphPose>({ state: 'idle' })
  const spec = SPECIMENS[row.key] ?? SPECIMENS['At rest']
  const kind = KINDS[spec.kind]
  const words = wordsFor(row, PLATFORM)
  const shown = kind.shown && !(row.moment === 'A secret shown to copy') ? kind.shown : escapeHidden(kind.value)
  const valueRef = useRef<HTMLSpanElement>(null)
  const blocks = s.body.split(/\n\s*\n/)
  const at = blocks.findIndex((b) => b.startsWith('| Moment'))
  const table = blocks[at]
  const before = blocks.slice(0, at).join('\n\n')
  const after = blocks.slice(at + 1).join('\n\n')

  const show = (r: WordsRow) => {
    setRow(r)
    announce(`Showing: ${r.moment}`)
    const sp = SPECIMENS[r.key]
    setPose({ state: sp.state, instant: true })
    // A failure that left the text selected, and a secret shown to copy, select the value; focus stays.
    window.requestAnimationFrame(() => {
      const sel = window.getSelection()
      sel?.removeAllRanges()
      if (sp.select && valueRef.current) { const range = document.createRange(); range.selectNodeContents(valueRef.current); sel?.addRange(range) }
    })
  }

  const spots = new Map<Spot, string>()
  if (spec.spots.includes('name')) spots.set('name', words)
  for (const sp of spec.spots) if (sp !== 'name') spots.set(sp, words)
  const beside = spec.mark ?? spots.get('beside')
  return (
    <section className="copy-section" aria-labelledby="copy-s3">
      <h2 id="copy-s3" className="vela-h3">3 · {s.title}</h2>
      <Example label={`Showing: ${row.moment}. Use Show me in the table to put the control in another moment.`}>
        <div className="copy-specimen">
          <span className="copy-pair__key">{kind.label}</span>
          <span className="copy-value__row">
            <span ref={valueRef} className="copy-value__text copy-specimen__value">{shown}</span>
            <CopyMorph what={kind.what} text={kind.value} box="regular" pose={pose} onResult={(r) => announce(r === 'copied' ? `Copied ${kind.what}` : failureWords(r, PLATFORM))} />
            <span className="copy-mark">
              <span className={`copy-value__mark ${beside ? 'is-on' : 'is-off'}`}>{beside || 'Copied'}</span>
            </span>
          </span>
          {spots.get('under') && <span className="copy-value__msg">{spots.get('under')}</span>}
          <dl className="copy-specimen__where">
            {!spots.has('name') && <div><dt>Name</dt><dd>Copy {kind.what}</dd></div>}
            {[...spots].filter(([sp]) => sp !== 'beside' && sp !== 'under').map(([sp, w]) => (
              <div key={sp}><dt>{SPOT_LABEL[sp]}</dt><dd>{sp === 'name' ? `Copy ${kind.what}` : w}</dd></div>
            ))}
          </dl>
        </div>
      </Example>
      <Words body={before} />
      {table && (
        <Table caption="Words, one row per moment" captionHidden>
          <Table.Head>
            <Table.Row>
              <Table.HeaderCell>Moment</Table.HeaderCell>
              <Table.HeaderCell>Words</Table.HeaderCell>
              <Table.HeaderCell>Where</Table.HeaderCell>
              <Table.HeaderCell><span className="vela-sr-only">Show it</span></Table.HeaderCell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {rows.map((r) => (
              <Table.Row key={r.key} selected={r.key === row.key}>
                <Table.HeaderCell scope="row">{inline(r.moment, 0)}</Table.HeaderCell>
                <Table.Cell>{inline(r.words, 0)}</Table.Cell>
                <Table.Cell>{inline(r.where, 0)}</Table.Cell>
                <Table.Cell>
                  {/* The name starts with the visible words (WCAG 2.5.3) and says which row it shows. */}
                  <Button size="tiny" appearance="hollow" className="copy-showme" aria-label={`Show me: ${r.key === r.moment ? r.moment : `${r.moment}, ${visible(r.words)}`}`} onClick={() => show(r)}>
                    Show me
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
      <Words body={after} />
    </section>
  )
}

// ---------------------------------------------------------------------------- section 4 --

function WhenItFails({ announce }: { announce: (m: string) => void }) {
  const s = section(4)
  const [blocked, setBlocked] = useState(false)
  const [embedded, setEmbedded] = useState(false)
  const [platform, setPlatform] = useState<Platform>(PLATFORM)
  const simulated: string[] = []
  if (blocked) simulated.push('The clipboard is blocked, so both tries are refused.')
  if (embedded) simulated.push('An embedded app: its host refuses the Clipboard API, so only the older copy command can work.')
  if (platform !== PLATFORM) simulated.push(`The platform is ${platformWord(platform)}; this device is ${platformWord(PLATFORM)}.`)
  return (
    <section className="copy-section" aria-labelledby="copy-s4">
      <h2 id="copy-s4" className="vela-h3">4 · {s.title}</h2>
      <Example label="Turn a switch on, then copy. The switches play out a browser's refusal; your browser's settings are not changed." simulated={simulated}>
        <div className="pg-toolbar copy-toolbar">
          <Toggle label="Clipboard blocked" size="tiny" checked={blocked} onChange={setBlocked} />
          <Toggle label="Embedded app" size="tiny" checked={embedded} onChange={setEmbedded} />
          <span className="pg-toolbar__group">
            <span className="vela-meta" aria-hidden="true">Platform</span>
            <Segments label="Platform" value={platform} options={PLATFORMS} onChange={setPlatform} />
          </span>
        </div>
        <p className="copy-try">
          <span className="copy-pair__key">Session id</span>{' '}
          <CopyValue
            key={platform}
            id="fails-session"
            what="session id"
            text="sess_41c9e07a2b"
            platform={platform}
            simulate={{ api: blocked || embedded, fallback: blocked }}
            announce={announce}
          />
        </p>
      </Example>
      <Words body={s.body} />
    </section>
  )
}

// ---------------------------------------------------------------------------------- page --

export function CopyPattern() {
  const { announce, region } = useAnnouncer()
  const [reduced, setReduced] = useState(false)
  const form = useIndexForm()
  useArrival()
  const opening = section(0).body
  const question = questionOf(opening)
  const parts = carriedBy(opening)
  // The rail (slice 4): the opening and every numbered section, by the first words of its title.
  const index: SectionLink[] = SHOWN.map((n) => n === 0
    ? { id: 'opening', label: 'Opening', target: 'copy-s0' }
    : { id: `s${n}`, label: `${n} ${section(n).title.split(',')[0]}`, target: `copy-s${n}` })
  return (
    <CopyGroupProvider>
      <article className={`doc copy-page ${reduced ? 'shell-cm-reduced' : ''}`}>
        <header className="pg-head copy-page__head">
          <div className="pg-head__text">
            <p className="vela-meta pg-head__eyebrow">Patterns</p>
            <div className="pg-head__title">
              <h1 className="vela-h2">Copy</h1>
              {statusWord(opening) && <span className="site-tag">{statusWord(opening)}</span>}
            </div>
            {question && <p className="pg-head__line">{question.slice(1, -1)}</p>}
            {parts.length > 0 && <p className="vela-meta copy-page__parts">A pattern: its {parts.length === 2 ? 'two ' : ''}components, {parts.join(' and ')}, are specified, not built.</p>}
          </div>
          <div className="pg-head__use">
            <div className="pg-toolbar copy-toolbar copy-page__settings">
              <Toggle label="Reduced motion" size="tiny" checked={reduced} onChange={setReduced} />
            </div>
            <p className="pg-head__links">
              <a href={`${LINKS.github}/blob/main/guidelines/patterns/copy.md`} target="_blank" rel="noreferrer">Spec on GitHub<Icon name="external-link" size="small" /></a>
            </p>
          </div>
        </header>
        <div className={cn('shell-railpage', form === 'strip' && 'is-narrow')}>
          <div className="shell-railpage__rail">
            <SectionIndex items={index} form={form} label="On this page" />
          </div>
          <div className="shell-railpage__main">
            <Opening announce={announce} />
            <WhenToOffer announce={announce} />
            <HowItWorks announce={announce} />
            <WordsSection announce={announce} />
            <WhenItFails announce={announce} />
            <MoreSections announce={announce} reduced={reduced} />
          </div>
        </div>
        {region}
      </article>
    </CopyGroupProvider>
  )
}

export { SECTIONS, SPECIMENS, wordsRows }
