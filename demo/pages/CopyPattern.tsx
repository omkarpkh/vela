import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button, Table, Toggle } from '../../src'
import copyMd from '../../guidelines/patterns/copy.md?raw'
import { inline, Markdown } from '../playground/Markdown'
import { CopyMorph, type MorphPose, type MorphState } from '../shell/CopyMorph'
import { COPY_WORDS, PLATFORM, type CopyResult, type Platform } from '../shell/Copy'
import { Segments } from '../shell/Segments'
import { LINKS } from '../links'
import { readPattern, splitParagraph, tableOf, visible, type PatternSection } from './copy-read'
import '../playground.css'

// The Copy pattern page (playground spec, section 12): guidelines/patterns/copy.md, told with live
// examples. Slice 6a: the opening and sections 1 to 4; sections 5 to 13 follow in 6b. The words
// are read from copy.md, so the page and the repository cannot drift; a live example leads each
// numbered section, and the words are its caption. The examples use the icon thread's lab build as
// a shell part (demo/shell/CopyMorph.tsx), labelled "Experimental, not yet in the kit". Switches
// simulate a browser's refusals and say so; they never touch the browser's settings or permissions.

const SECTIONS = readPattern(copyMd)
const section = (n: number) => SECTIONS.find((s) => s.n === n)!
/** The sections this slice shows. */
export const SHOWN = [0, 1, 2, 3, 4]

// ---------------------------------------------------------------------------- the words --

/**
 * The section's words: paragraphs (split between sentences when one is longer than the playground
 * allows), lists with their nested items, numbered lists, and tables, which Markdown renders.
 * `skip` leaves out blocks the page shows another way (the §2 list is the scrubber's caption).
 */
function Words({ body, skip }: { body: string; skip?: (block: string) => boolean }) {
  const blocks = body.split(/\n\s*\n/).map((b) => b.replace(/\s+$/, '')).filter(Boolean)
  const out: ReactNode[] = []
  blocks.forEach((b, k) => {
    if (skip?.(b)) return
    const lines = b.split('\n')
    if (lines[0].startsWith('|')) { out.push(<Markdown key={k} source={b} />); return }
    if (/^\*[^*].*\*$/.test(b)) { out.push(<p key={k} className="pg-p copy-page__aside"><em>{b.slice(1, -1)}</em></p>); return }
    // A paragraph, then any list that follows it with no blank line between ("The page:" then "- …").
    const lead: string[] = []
    while (lines.length && !/^(- |\d+\. )/.test(lines[0])) lead.push(lines.shift()!)
    if (lead.length) splitParagraph(lead.join(' ')).forEach((p, i) => out.push(<p key={`${k}-${i}`} className="pg-p">{inline(p, i)}</p>))
    if (lines.length) out.push(<List key={`${k}-l`} lines={lines} />)
  })
  return <div className="copy-page__words">{out}</div>
}

/** A list, numbered or not, with items nested by indent. */
function List({ lines }: { lines: string[] }) {
  type Item = { text: string; sub: string[] }
  const items: Item[] = []
  const ordered = /^\d+\. /.test(lines[0])
  for (const l of lines) {
    if (/^(- |\d+\. )/.test(l)) items.push({ text: l.replace(/^(- |\d+\. )/, ''), sub: [] })
    else if (/^\s+- /.test(l)) items[items.length - 1]?.sub.push(l.replace(/^\s+- /, ''))
    else if (items.length) {
      const it = items[items.length - 1]
      if (it.sub.length) it.sub[it.sub.length - 1] += ' ' + l.trim()
      else it.text += ' ' + l.trim()
    }
  }
  const L = ordered ? 'ol' : 'ul'
  return (
    <L className="pg-list copy-page__list">
      {items.map((it, i) => (
        <li key={i}>
          {inline(it.text, 0)}
          {it.sub.length > 0 && <ul className="pg-list">{it.sub.map((s, j) => <li key={j}>{inline(s, j)}</li>)}</ul>}
        </li>
      ))}
    </L>
  )
}

// --------------------------------------------------------------------- shared example parts --

/** One polite region for the page: each outcome is announced once, and focus never moves. */
function useAnnouncer() {
  const [text, setText] = useState('')
  const frame = useRef(0)
  const announce = useCallback((msg: string) => {
    // Cleared first, so the same words said again (a second copy) are announced again.
    setText('')
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => setText(msg))
  }, [])
  useEffect(() => () => cancelAnimationFrame(frame.current), [])
  const region = <p role="status" className="vela-sr-only copy-page__announcer">{text}</p>
  return { announce, region }
}

/** The frame every live example sits in, with its label and, while a switch is on, what it simulates. */
function Example({ label, simulated, children }: { label: string; simulated?: string[]; children: ReactNode }) {
  const id = useId()
  return (
    <div className="copy-example" role="group" aria-labelledby={id}>
      <p id={id} className="vela-meta copy-example__label">
        <span className="site-tag">Experimental, not yet in the kit</span> {label}
      </p>
      {simulated && simulated.length > 0 && (
        <p className="vela-meta copy-example__simulated">Simulated: {simulated.join(' ')}</p>
      )}
      {children}
    </div>
  )
}

/** A "don't" drawing: a picture, not a control. It never takes focus and holds nothing that does. */
function Drawing({ alt, children }: { alt: string; children: ReactNode }) {
  return <div className="copy-drawing" role="img" aria-label={alt}>{children}</div>
}

const failureWords = (r: CopyResult, platform: Platform) =>
  r === 'selected' ? COPY_WORDS.selected[platform] : r === 'none' ? COPY_WORDS.none : ''

/**
 * A value with its copy control, its "Copied" mark and its failure words, which are also the
 * control's description. `marked` is the group's: one clipboard governs the page, so only one value
 * carries the mark.
 */
function CopyValue({ id, what, text, shown, marked, onMarked, announce, platform = PLATFORM, simulate, box, pose, extra, mono = true }: {
  id: string; what: string; text: string | (() => Promise<string>); shown?: ReactNode
  marked?: boolean; onMarked?: (on: boolean) => void; announce: (m: string) => void
  platform?: Platform; simulate?: { api?: boolean; fallback?: boolean }; box?: 'small' | 'regular'
  pose?: MorphPose; extra?: ReactNode; mono?: boolean
}) {
  const [failure, setFailure] = useState('')
  const valueId = `${id}-value`
  const msgId = `${id}-msg`
  return (
    <span className="copy-value">
      <span className="copy-value__row">
        <span id={valueId} className={mono ? 'copy-value__text' : undefined}>{shown ?? (typeof text === 'string' ? text : '')}</span>
        <CopyMorph
          what={what}
          text={text}
          shownId={typeof text === 'string' && !shown ? valueId : undefined}
          box={box}
          pose={pose}
          simulate={simulate}
          describedBy={failure ? msgId : undefined}
          onResult={(r) => {
            if (r === 'copied') { setFailure(''); onMarked?.(false); announce(`Copied ${what}`); return }
            const words = failureWords(r, platform)
            setFailure(words)
            announce(words)
          }}
          onHandBack={() => onMarked?.(true)}
        />
        {/* The mark is a word, never a colour. Its place is kept while it is hidden, so a table
            column does not change width when the word arrives. */}
        {onMarked && <span className={`copy-value__mark ${marked && !failure ? 'is-on' : 'is-off'}`}>Copied</span>}
        {extra}
      </span>
      {failure && <span id={msgId} className="copy-value__msg">{failure}</span>}
    </span>
  )
}

// ------------------------------------------------------------------------------ opening --

const HOSTS = [
  { host: 'db-primary', ip: '10.42.7.19' },
  { host: 'cache-02', ip: '10.42.7.44' },
  { host: 'edge-11', ip: '10.42.8.3' },
]

function Opening({ announce }: { announce: (m: string) => void }) {
  const [mark, setMark] = useState<string | null>(null)
  const s = section(0)
  const aside = s.body.split(/\n\s*\n/).map((b) => b.trim()).find((b) => /^\*[^*].*\*$/.test(b))
  return (
    <section className="copy-section" aria-label="Opening">
      <Example label="Copy any address. The tick says it worked; the word Copied says which one you took; the copy mark says you can take it again.">
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
                    marked={mark === h.host}
                    onMarked={(on) => setMark((m) => (on ? h.host : m === h.host ? null : m))}
                    announce={announce}
                  />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
        {aside && <p className="vela-body copy-example__caption"><em>{aside.slice(1, -1)}</em></p>}
      </Example>
      <Words body={s.body} skip={(b) => b.trim() === aside} />
    </section>
  )
}

// ---------------------------------------------------------------------------- section 1 --

/** A sample secret in an invented format, made when it is fetched, never kept in the page. */
const sampleSecret = (tail: string) => {
  const abc = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = 'vela_sample_'
  for (let i = 0; i < 6; i++) s += abc[Math.floor(Math.random() * abc.length)]
  return s + tail
}
const fetchSecret = (tail: string) => () => new Promise<string>((ok) => window.setTimeout(() => ok(sampleSecret(tail)), 400))

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
  const [mark, setMark] = useState<string | null>(null)
  const marker = (id: string) => ({ marked: mark === id, onMarked: (on: boolean) => setMark((m) => (on ? id : m === id ? null : m)) })
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
      alt: 'Don\'t: a masked key whose real value, vela_sample_ and the rest, is in the page\'s markup.',
      live: <CopyValue id="do-secret" what="API key [sample]" text={fetchSecret('a9F2')} shown="•••••••• a9F2" announce={announce} {...marker('secret')} />,
      drawing: <span className="copy-drawing__row"><span className="copy-value__text">•••••••• a9F2</span><span className="copy-drawing__note">vela_sample_… in the markup</span></span>,
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
      <Words body={s.body} />
    </section>
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
  const [mark, setMark] = useState(false)
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
          <Segments label="State" value={step} options={STEPS.map((v) => ({ value: v, label: STEP_LABEL[v] }))} onChange={choose} />
          <Segments label="Speed" value={speed} options={[{ value: '1', label: '1×' }, { value: 'slow', label: '5× slower' }] as const} onChange={setSpeed} />
        </div>
        <div className="copy-stage" ref={stage}>
          <CopyMorph what="request id, large preview" text="req_8f2a91c4e7" box="preview" pose={pose} onResult={(r) => announce(r === 'copied' ? 'Copied request id' : failureWords(r, PLATFORM))} />
          <div className="copy-stage__side" aria-hidden="true">
            {step === 'marked' && <span className="copy-value__mark">Copied</span>}
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
          <CopyValue id="try-request" what="request id" text="req_8f2a91c4e7" marked={mark} onMarked={setMark} announce={announce} />
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

const ch = String.fromCharCode
// Hidden characters are made here, at runtime, and never typed into the source.
const ZWSP = ch(0x200b)
const NBSP = ch(0x00a0)
const LQ = ch(0x201c)
const RQ = ch(0x201d)
const KINDS: Record<Kind, { label: string; what: string; value: string; shown?: string }> = {
  request: { label: 'Request id', what: 'request id', value: 'req_8f2a91c4e7' },
  invite: { label: 'Invite link', what: 'invite link', value: 'https://vela.example/invite/7Q2f9xLm' },
  key: { label: 'API key [sample]', what: 'API key', value: 'vela_sample_7Q2f9xLm', shown: '•••••••• 9xLm' },
  command: { label: 'Command', what: 'command', value: 'vela scan --host 10.42.7.19\n' },
  multiline: { label: 'Command', what: 'command', value: 'vela login\nvela scan --host 10.42.7.19\nvela report --last' },
  hidden: { label: 'Command', what: 'command', value: `vela scan --host${ZWSP} 10.42.7.19` },
  curly: { label: 'Command', what: 'command', value: `vela scan --tag ${LQ}prod${RQ} --host${NBSP}10.42.7.19` },
}
/** Hidden characters shown as escapes, the way Copyable Value shows them (copy.md, section 6). */
const HIDDEN = new RegExp(`[${[[0x200b, 0x200f], [0x202a, 0x202e], [0x2060, 0x2060], [0x2066, 0x2069], [0xfeff, 0xfeff]].map(([a, b]) => `${ch(a)}-${ch(b)}`).join('')}]`, 'g')
const escapeHidden = (s: string) => s.replace(HIDDEN, (c) => `\\u${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`)

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

export interface WordsRow { moment: string; words: string; where: string; key: string }
/** The §3 table's rows. A moment that appears twice is told apart by its words. */
export function wordsRows(): WordsRow[] {
  const [, ...rows] = tableOf(section(3).body.split(/\n\s*\n/).find((b) => b.startsWith('| Moment')) ?? '')
  const twice = (m: string) => rows.filter((r) => r[0] === m).length > 1
  return rows.map(([moment, words, where]) => ({ moment, words, where, key: twice(moment) ? `${moment} · ${visible(words)}` : moment }))
}

/** The words a row shows, for this platform: the four failure strings are the Copy Button spec's own. */
function wordsFor(row: WordsRow, platform: Platform): string {
  if (row.moment === 'Blocked, text selected') return COPY_WORDS.selected[platform]
  if (row.moment === 'Blocked, nothing selected') return COPY_WORDS.none
  const w = visible(row.words).replace(/\s*\((?:per platform|⌘C;[^)]*)\)\s*$/, '')
  if (row.moment === 'A secret shown to copy')
    return platform === 'touch' ? 'Selected. Tap and hold it, then choose Copy.' : platform === 'apple' ? w : w.replace('⌘C', 'Ctrl+C')
  return w
}

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
            {beside && <span className="copy-value__mark">{beside}</span>}
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

const PLATFORMS = [
  { value: 'other', label: 'Ctrl+C' },
  { value: 'apple', label: '⌘C' },
  { value: 'touch', label: 'Touch' },
] as const
const platformWord = (p: Platform) => PLATFORMS.find((x) => x.value === p)!.label

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
  return (
    <article className={`doc copy-page ${reduced ? 'shell-cm-reduced' : ''}`}>
      <header className="page-head">
        <p className="vela-meta page-head__eyebrow">Pattern</p>
        <h1 className="vela-h2">Copy</h1>
        <p className="vela-meta">
          A scenario pattern, read from <code>guidelines/patterns/copy.md</code>. This page has the opening and sections 1 to 4;
          sections 5 to 13 are in the <a href={`${LINKS.github}/blob/main/guidelines/patterns/copy.md`}>pattern on GitHub</a> until
          they come here.
        </p>
        <div className="pg-toolbar copy-toolbar copy-page__settings">
          <Toggle label="Reduced motion" size="tiny" checked={reduced} onChange={setReduced} />
        </div>
      </header>
      <Opening announce={announce} />
      <WhenToOffer announce={announce} />
      <HowItWorks announce={announce} />
      <WordsSection announce={announce} />
      <WhenItFails announce={announce} />
      {region}
    </article>
  )
}

export { SECTIONS, SPECIMENS, type PatternSection }
