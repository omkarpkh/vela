import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button, Icon, Input, Table, Toggle } from '../../src'
import type { TableSortDirection } from '../../src'
import { inline } from '../playground/Markdown'
import { CATALOG } from '../playground/catalog'
import { proofAt, type ProofMap } from '../playground/Proofs'
import { StageWidth } from '../playground/StageWidth'
import { CopyMorph, MorphGlyph } from '../shell/CopyMorph'
import { PLATFORM } from '../shell/Copy'
import { useCopyMark, useCopyStore } from '../shell/CopyGroup'
import { Segments } from '../shell/Segments'
import { visible, tableOf } from './copy-read'
import {
  section, Words, Example, CopyValue, MarkSlot, failureWords, sampleSecret, ch, LQ, RQ, HIDDEN,
  wordsRows, wordsFor,
} from './copy-parts'

// The Copy pattern page, sections 5 to 13 (slice 6b; playground spec, section 12). The same rules as
// the first half: the words are copy.md's, a live example leads each section, switches simulate and
// say so, a sample secret is made only when it is fetched, and hidden characters are made here at
// runtime. Sections 10 and 12 lead with their tables; 13, the open questions, is words only.

export const SHOWN_MORE = [5, 6, 7, 8, 9, 10, 11, 12, 13]
type Say = (m: string) => void

/** A §3 table row's words, by its moment (and words, where the moment appears twice). */
const rowWords = (key: string) => {
  const r = wordsRows().find((x) => x.key === key)
  if (!r) throw new Error(`copy.md's words table has no row "${key}"`)
  return r
}

function Section({ n, children }: { n: number; children: ReactNode }) {
  return (
    <section className="copy-section" aria-labelledby={`copy-s${n}`}>
      <h2 id={`copy-s${n}`} className="vela-h3">{n} · {section(n).title}</h2>
      {children}
    </section>
  )
}

const clock = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

// ---------------------------------------------------------------------------- section 5 --

const KEY_TAIL = '9xLm'

function Secrets({ announce }: { announce: Say }) {
  const [blocked, setBlocked] = useState(false)
  const [mayReveal, setMayReveal] = useState(false)
  const [reads, setReads] = useState<{ n: number; at: string }>({ n: 0, at: '' })
  const [failed, setFailed] = useState(false)
  // The key is in the page only while it is shown to copy; never before a press, never after.
  const [shownKey, setShownKey] = useState<string | null>(null)
  const [receipt, setReceipt] = useState('')
  const field = useRef<HTMLInputElement>(null)
  const mark = useCopyMark('secret-api-key', 'version 1', 'secret')
  const msgId = useId()
  const may = rowWords('A secret blocked, may reveal')
  const mayNot = rowWords('A secret blocked, may not reveal')
  const [mayMsg, showLabel] = visible(may.words).split(' · ')
  const copied = rowWords('A secret copied')

  /** The sample server: each read is a request the product could log. */
  const fetchKey = () => new Promise<string>((ok) => window.setTimeout(() => {
    setReads((r) => ({ n: r.n + 1, at: clock() }))
    ok(sampleSecret(KEY_TAIL))
  }, 300))
  const receiptFor = (k: string) => visible(copied.words).replace(/\d+ characters/, `${k.length} characters`)

  const hide = () => setShownKey(null)
  useEffect(() => {
    if (!shownKey) return
    field.current?.focus()
    field.current?.select()
    const away = () => { if (document.hidden) hide() }
    document.addEventListener('visibilitychange', away)
    return () => document.removeEventListener('visibilitychange', away)
  }, [shownKey])

  const simulated: string[] = []
  if (blocked) simulated.push('The clipboard is blocked, so both tries are refused.')
  if (mayReveal) simulated.push('This person may reveal the key.')
  const words = failed ? (mayReveal ? mayMsg : visible(mayNot.words)) : ''
  return (
    <Section n={5}>
      <Example label="A masked key [sample]. Copy it; then turn on Clipboard blocked, with or without May reveal, and copy again." simulated={simulated}>
        <div className="pg-toolbar copy-toolbar">
          <Toggle label="Clipboard blocked" size="tiny" checked={blocked} onChange={setBlocked} />
          <Toggle label="May reveal" size="tiny" checked={mayReveal} onChange={(v) => { setMayReveal(v); if (!v) hide() }} />
        </div>
        <div className="copy-value">
          <span className="copy-value__row">
            <span className="copy-pair__key">API key [sample]</span>
            <span className="copy-value__text">•••••••• {KEY_TAIL}</span>
            <CopyMorph
              what="API key"
              text={fetchKey}
              simulate={{ api: blocked, fallback: blocked }}
              describedBy={failed ? msgId : undefined}
              onResult={(r, written) => {
                if (r === 'copied' && written) {
                  setFailed(false); hide(); mark.clear()
                  const words = receiptFor(written)
                  setReceipt(words)
                  announce(words)
                  return
                }
                setFailed(true)
                announce(mayReveal ? mayMsg : visible(mayNot.words))
              }}
              onHandBack={() => { setReceipt(''); mark.take('version 1') }}
            />
            <MarkSlot word={mark.word} />
          </span>
          {/* The receipt, while the tick shows (the tooltip's words); its line is kept so nothing moves. */}
          <span className="vela-meta copy-receipt" aria-hidden="true">{receipt}</span>
          {failed && (
            <span className="copy-value__failure">
              <span id={msgId} className="copy-value__msg">{words}</span>
              {mayReveal && !shownKey && (
                <Button size="tiny" appearance="hollow" onClick={async () => setShownKey(await fetchKey())}>{showLabel}</Button>
              )}
            </span>
          )}
          {shownKey && (
            <span className="copy-secret">
              <Input
                ref={field}
                label="API key [sample]"
                size="tiny"
                readOnly
                value={shownKey}
                hint={wordsFor(rowWords('A secret shown to copy'), PLATFORM)}
                onBlur={hide}
                onCopy={() => {
                  setFailed(false)
                  const words = receiptFor(shownKey)
                  setReceipt(words)
                  announce(words)
                  hide()
                }}
              />
              <Button size="tiny" appearance="hollow" onMouseDown={(e) => e.preventDefault()} onClick={hide}>Hide</Button>
            </span>
          )}
        </div>
        <p className="vela-meta copy-example__note">
          {reads.n === 0
            ? 'Not fetched yet: the key is not in the page.'
            : `Fetched from the sample server at the press: ${reads.n} ${reads.n === 1 ? 'read' : 'reads'}, the last at ${reads.at}.`}
        </p>
      </Example>
      <Words body={section(5).body} />
    </Section>
  )
}

// ---------------------------------------------------------------------------- section 6 --

const RLM = ch(0x200f)
/** Curly quotes and the non-breaking space, made from their code points. */
const CURLY = new RegExp(`[${[0x2018, 0x2019, 0x201c, 0x201d, 0x00a0].map((c) => ch(c)).join('')}]`)
const hasHidden = (s: string) => new RegExp(HIDDEN.source).test(s)

/** The value as Copyable Value shows a command: each hidden character as an escape, marked as one. */
function Escaped({ text }: { text: string }) {
  const parts = text.replace(/\n$/, '').split(new RegExp(`(${HIDDEN.source})`))
  return (
    <>
      {parts.map((p, i) => (new RegExp(`^${HIDDEN.source}$`).test(p)
        ? <span key={i} className="copy-escape" title="A hidden character">{`\\u${p.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`}</span>
        : <span key={i}>{p}</span>))}
    </>
  )
}

function Commands({ announce }: { announce: Say }) {
  const [newline, setNewline] = useState(true)
  // An agent's command, as an agent wrote it: curly quotes, and a right-to-left mark after --host.
  const command = `vela scan --tag ${LQ}prod${RQ} --host${RLM} 10.42.7.19${newline ? '\n' : ''}`
  // Copied exactly, with one trailing newline removed: older shells would run it at once.
  const written = command.replace(/\n$/, '')
  const warnings = [
    hasHidden(command) && visible(rowWords('Hidden characters found').words),
    CURLY.test(command) && visible(rowWords('Curly quotes or non-breaking spaces').words),
  ].filter(Boolean) as string[]
  const ids = useId()
  const mark = useCopyMark('agent-command', written, 'command')
  const [failure, setFailure] = useState('')
  const receipt = newline ? visible(rowWords('A command copied').words) : 'Copied command'
  return (
    <Section n={6}>
      <Example label="A command an agent wrote, as Vela shows it. Copy copies it exactly, and never fixes it.">
        <div className="pg-toolbar copy-toolbar">
          <Toggle label="Ends with a newline" size="tiny" checked={newline} onChange={setNewline} />
        </div>
        <div className="copy-value">
          <span className="copy-pair__key">Step 2, written by an agent</span>
          <span className="copy-value__row">
            <code className="copy-value__text copy-command"><Escaped text={command} /></code>
            <CopyMorph
              what="command"
              text={written}
              describedBy={[...warnings.map((_, i) => `${ids}-w${i}`), failure ? `${ids}-f` : ''].filter(Boolean).join(' ') || undefined}
              onResult={(r) => {
                if (r === 'copied') { setFailure(''); mark.clear(); announce(receipt); return }
                const w = failureWords(r, PLATFORM)
                setFailure(w)
                announce(w)
              }}
              onHandBack={() => mark.take(written)}
            />
            <MarkSlot word={mark.word} changeable />
          </span>
          <ul className="copy-warnings">
            {warnings.map((w, i) => (
              <li key={w} id={`${ids}-w${i}`}><Icon name="triangle-alert" size="small" tone="inherit" /> {w}</li>
            ))}
          </ul>
          {failure && <span id={`${ids}-f`} className="copy-value__msg">{failure}</span>}
        </div>
      </Example>
      <Words body={section(6).body} />
    </Section>
  )
}

// ---------------------------------------------------------------------------- section 7 --

interface Account { copyId: string; name: string; key: string; used: number }
/** Eight hex digits from a number: a fixed sample, the same on every load. */
const hex = (n: number) => { let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b) >>> 0; x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0; return ((x ^ (x >>> 16)) >>> 0).toString(16).padStart(8, '0') }
const ACCOUNTS: Account[] = Array.from({ length: 200 }, (_, i) => ({
  copyId: `svc-${i + 1}`,
  name: `svc-ingest-${String(i + 1).padStart(3, '0')}`,
  key: `kid_${hex(i + 1)}`,
  used: (i * 37) % 600 + 1,
}))
type SortKey = 'name' | 'used'

function Groups({ announce }: { announce: Say }) {
  const [rows, setRows] = useState(ACCOUNTS)
  const [sort, setSort] = useState<{ key: SortKey; direction: TableSortDirection }>({ key: 'name', direction: 'ascending' })
  const store = useCopyStore()
  const marked = rows.find((r) => r.copyId === store?.mark?.copyId)
  const sorted = useMemo(() => [...rows].sort((a, b) => {
    const d = sort.key === 'used' ? a.used - b.used : a.name.localeCompare(b.name)
    return sort.direction === 'descending' ? -d : d
  }), [rows, sort])
  const sortOf = (key: SortKey) => ({
    direction: sort.key === key ? sort.direction : ('none' as const),
    onSort: (next: 'ascending' | 'descending') => setSort({ key, direction: next }),
  })
  const rotate = () => {
    if (!marked) return
    setRows((rs) => rs.map((r) => (r.copyId === marked.copyId ? { ...r, key: `kid_${hex(Date.now() % 1000003)}` } : r)))
    announce(`Rotated the key for ${marked.name}`)
  }
  const reasonId = useId()
  return (
    <Section n={7}>
      <Example label="Copy a key id, then sort or rotate it: the mark follows the value, not the row.">
        <div className="pg-toolbar copy-toolbar">
          <Button size="tiny" appearance="hollow" disabled={!marked} aria-describedby={marked ? undefined : reasonId} onClick={rotate}>Rotate key</Button>
          <span id={reasonId} className="vela-meta">
            {marked ? `Rotates the key you copied, for ${marked.name}. [sample]` : 'Copy a key id first: Rotate key changes the one you copied.'}
          </span>
        </div>
        <Table caption="Service accounts, 200 rows [sample]" density="compact" stickyHeader className="pg-table-bounded">
          <Table.Head>
            <Table.Row>
              <Table.HeaderCell sort={sortOf('name')}>Service account</Table.HeaderCell>
              <Table.HeaderCell>Key id</Table.HeaderCell>
              <Table.HeaderCell sort={sortOf('used')}>Last used, minutes ago</Table.HeaderCell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {sorted.map((r) => (
              <Table.Row key={r.copyId}>
                <Table.HeaderCell scope="row">{r.name}</Table.HeaderCell>
                <Table.Cell>
                  <CopyValue id={`acct-${r.copyId}`} what={`key id for ${r.name}`} text={r.key} copyId={r.copyId} changeable announce={announce} />
                </Table.Cell>
                <Table.Cell numeric>{r.used}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
        <p className="vela-meta copy-example__note">
          In a virtualised table the mark follows the same rule (<code>copyable-value-mark-by-identity</code>).
        </p>
      </Example>
      <Words body={section(7).body} />
    </Section>
  )
}

// ---------------------------------------------------------------------------- section 8 --

const CAPTURED = '1 November 2026'
/** Captured from the live control above: Playwright, Chromium, forcedColors 'active', light, device scale 2. */
const FORCED = [
  { file: 'forced-colours-rest.png', alt: 'Forced colours, at rest: the request id, and the copy mark beside it in the system\'s text colour.' },
  { file: 'forced-colours-copied.png', alt: 'Forced colours, just copied from the keyboard: the copy mark has become a tick, inside the system\'s focus ring.' },
  { file: 'forced-colours-marked.png', alt: 'Forced colours, after the tick hands back: the copy mark again, and the word Copied beside it.' },
]

function SameStory({ announce }: { announce: Say }) {
  const [keyboard, setKeyboard] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [heard, setHeard] = useState<string[]>([])
  const say = (m: string) => { announce(m); setHeard((h) => [...h.slice(-3), m]) }
  const simulated: string[] = []
  if (keyboard) simulated.push('Every press counts as one from the keyboard, so nothing animates.')
  if (reduced) simulated.push('Reduced motion, for this example only: the tick lands in one frame, with no lean.')
  const base = import.meta.env.BASE_URL
  return (
    <Section n={8}>
      <Example label="The same control for everyone. Turn on a switch, then copy; the panel shows what a screen reader says." simulated={simulated}>
        <div className="pg-toolbar copy-toolbar">
          <Toggle label="Keyboard" size="tiny" checked={keyboard} onChange={setKeyboard} />
          <Toggle label="Reduced motion" size="tiny" checked={reduced} onChange={setReduced} />
        </div>
        <div className="copy-story">
          <p
            className={`copy-try ${reduced ? 'shell-cm-reduced' : ''}`}
            onFocus={(e) => { if (e.target instanceof HTMLButtonElement) setHeard((h) => [...h.slice(-3), `${e.target.getAttribute('aria-label')}, button`]) }}
          >
            <span className="copy-pair__key">Request id</span>{' '}
            <CopyValue id="story-request" what="request id" text="req_3c71d09a52" copyId="story-request" keyboard={keyboard} announce={say} />
          </p>
          <div className="copy-sr" aria-label="What a screen reader says" role="group">
            <p className="vela-meta copy-sr__title">What a screen reader says</p>
            {heard.length === 0
              ? <p className="vela-meta copy-sr__line">Nothing yet. Focus the control, or copy.</p>
              : <ol className="copy-sr__lines">{heard.map((h, i) => <li key={`${i}-${h}`} className="copy-sr__line">{h}</li>)}</ol>}
          </div>
        </div>
        <figure className="copy-forced">
          <div className="copy-forced__shots">
            {FORCED.map((f) => <img key={f.file} src={`${base}patterns/copy/${f.file}`} width={187} height={24} alt={f.alt} />)}
          </div>
          <figcaption className="vela-meta">Captured in Chromium&apos;s forced-colours emulation, {CAPTURED}. Every mark is a word or a shape, so nothing relies on a background.</figcaption>
        </figure>
      </Example>
      <Words body={section(8).body} />
    </Section>
  )
}

// ---------------------------------------------------------------------------- section 9 --

const TRAVEL = 240
const FRAMES = [0, 30, 60, 90, 120, 150, 180, 210, 240]

/**
 * The morph stopped at `t` milliseconds after a press from the hover pose: the real CSS transitions,
 * paused and sought with the Web Animations API, as the lab did. Decorative: the strip's words say
 * what each frame is. `play` replays it instead, at `rate`.
 */
function Frozen({ t, size, play = 0, rate = 1, reduced }: { t: number; size: 'small' | 'preview'; play?: number; rate?: number; reduced: boolean }) {
  const el = useRef<HTMLSpanElement>(null)
  const anims = useRef<Animation[]>([])
  // Each start (and each replay, and the page's reduced-motion switch) runs the press again.
  useLayoutEffect(() => {
    const host = el.current
    if (!host || typeof host.getAnimations !== 'function') return
    host.setAttribute('data-state', 'hover')
    host.setAttribute('data-instant', '')
    getComputedStyle(host.querySelector('.turn')!).transform
    host.removeAttribute('data-instant')
    getComputedStyle(host.querySelector('.turn')!).transform
    host.setAttribute('data-state', 'copied')
    anims.current = host.getAnimations({ subtree: true })
    for (const a of anims.current) { if (play) a.playbackRate = rate; else a.pause() }
  }, [play, rate, reduced])
  useLayoutEffect(() => {
    if (play) return
    for (const a of anims.current) {
      const end = Number(a.effect?.getComputedTiming().endTime ?? 0)
      // Never past the end: a finished transition lets go of its frame.
      a.currentTime = Math.min(t, Math.max(0, end - 0.01))
    }
  }, [t, play, rate, reduced])
  return (
    <span ref={el} className={`shell-cm shell-cm--still ${size === 'preview' ? 'shell-cm--preview' : ''}`} data-forced="" aria-hidden="true">
      <MorphGlyph />
    </span>
  )
}

function Motion({ reduced: pageReduced }: { reduced: boolean }) {
  const [t, setT] = useState(120)
  const [speed, setSpeed] = useState<'1' | 'slow'>('1')
  const [play, setPlay] = useState(0)
  const systemReduced = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const reduced = pageReduced || systemReduced
  const id = useId()
  return (
    <Section n={9}>
      <Example label="The real CSS, stopped at each moment after a press from the hover pose. Drag the time to scrub it, or play it.">
        {reduced && (
          <p className="vela-meta copy-example__note">
            Reduced motion is on, so the morph lands in one frame and every frame below shows its end. Turn it off to see the frames.
          </p>
        )}
        <div className="copy-frames" aria-label="Keyframes, 0 to 240 milliseconds, at 48 and 16 pixels" role="img">
          {FRAMES.map((f) => (
            <span key={f} className="copy-frames__frame">
              <Frozen t={f} size="preview" reduced={reduced} />
              <Frozen t={f} size="small" reduced={reduced} />
              <span className="vela-meta">{f} ms</span>
            </span>
          ))}
        </div>
        <div className="pg-toolbar copy-toolbar">
          <label className="pg-toolbar__label" htmlFor={id}>Time</label>
          <input
            id={id}
            className="copy-scrub"
            type="range"
            min={0}
            max={TRAVEL}
            step={10}
            value={t}
            aria-valuetext={`${t} milliseconds`}
            onChange={(e) => { setPlay(0); setT(e.target.valueAsNumber) }}
          />
          <span className="vela-meta copy-scrub__value" aria-hidden="true">{t} ms</span>
          <Segments label="Speed" value={speed} options={[{ value: '1', label: '1×' }, { value: 'slow', label: '5× slower' }] as const} onChange={setSpeed} />
          <Button size="tiny" appearance="hollow" onClick={() => setPlay((p) => p + 1)}>Play</Button>
        </div>
        <div className="copy-stage">
          <Frozen t={t} size="preview" play={play} rate={speed === 'slow' ? 0.2 : 1} reduced={reduced} />
        </div>
      </Example>
      <Words body={section(9).body} />
    </Section>
  )
}

// ---------------------------------------------------------------------- sections 10 to 13 --

function Components() {
  return (
    <Section n={10}>
      <Words body={section(10).body} />
    </Section>
  )
}

const WIDTH_MIN = 160
const WIDTH_FULL = 280

function MinimumWidth({ announce }: { announce: Say }) {
  const host = useRef<HTMLDivElement>(null)
  const [max, setMax] = useState(600)
  const [width, setWidth] = useState<number | undefined>(WIDTH_FULL)
  const [phone, setPhone] = useState(false)
  useEffect(() => {
    const el = host.current
    if (!el) return
    // The frame's padding and edge sit outside the width it gives the value.
    const measure = () => { const pad = el.firstElementChild ? el.firstElementChild.getBoundingClientRect().width - (el.firstElementChild as HTMLElement).clientWidth + 2 * parseFloat(getComputedStyle(el.firstElementChild).paddingLeft) : 0; setMax(Math.max(WIDTH_FULL, Math.floor(el.clientWidth - (pad || 0)))) }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    const m = window.matchMedia?.('(max-width: 600px)')
    setPhone(!!m?.matches)
    return () => ro?.disconnect()
  }, [])
  const w = width ?? max
  return (
    <Section n={11}>
      <Example label="A Copyable Value in a frame you can narrow. It stacks below 280px, and goes no narrower than 160px.">
        <div className="pg-toolbar copy-toolbar">
          <StageWidth min={WIDTH_MIN} max={max} width={width} onChange={setWidth} phone={phone} marks={[WIDTH_MIN, WIDTH_FULL]} />
          <Button size="tiny" appearance="hollow" onClick={() => setWidth(WIDTH_MIN)}>{WIDTH_MIN}px, the minimum</Button>
          <Button size="tiny" appearance="hollow" onClick={() => setWidth(WIDTH_FULL)}>{WIDTH_FULL}px, full layout</Button>
        </div>
        <div ref={host} className="copy-width">
          <div className="copy-width__frame" style={{ width: w }} data-width={w}>
            <span className="copy-width__value">
              <span className="copy-pair__key copy-width__label">Request id</span>
              <CopyValue id="width-request" what="request id" text="req_5e0b2d81f4" copyId="width-request" announce={announce} />
            </span>
          </div>
        </div>
      </Example>
      <Words body={section(11).body} />
    </Section>
  )
}

/** The kit component a rule belongs to, when it is built: the longest catalog id the rule id starts with. */
export function componentOf(rule: string): string | undefined {
  return [...CATALOG].map((c) => c.id).sort((a, b) => b.length - a.length).find((id) => rule.startsWith(`${id}-`))
}

function Tests() {
  const body = section(12).body
  const blocks = body.split(/\n\s*\n/)
  const at = blocks.findIndex((b) => b.startsWith('| The promise'))
  const rows = tableOf(blocks[at] ?? '').slice(1)
  const built = [...new Set(rows.map((r) => componentOf(r[1].replace(/`/g, ''))).filter(Boolean) as string[])]
  const [maps, setMaps] = useState<Record<string, ProofMap | null>>({})
  useEffect(() => {
    let live = true
    for (const id of built)
      fetch(`${import.meta.env.BASE_URL}proofs/${id}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
        .then((m: ProofMap | null) => { if (live) setMaps((x) => ({ ...x, [id]: m })) })
    return () => { live = false }
    // The rows are copy.md's and never change while the page is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const commit = import.meta.env.VITE_VELA_COMMIT || 'main'
  return (
    <Section n={12}>
      <Table caption="The rules this pattern stands on">
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell>The promise</Table.HeaderCell>
            <Table.HeaderCell>Rule</Table.HeaderCell>
            <Table.HeaderCell>Level</Table.HeaderCell>
            <Table.HeaderCell>Proof</Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {rows.map(([promise, rule, level]) => {
            const id = rule.replace(/`/g, '')
            const comp = componentOf(id)
            const proof = comp ? maps[comp]?.rules.find((r) => r.id === id)?.proof : null
            const at2 = proof ? proofAt(proof, commit) : null
            return (
              <Table.Row key={id}>
                <Table.HeaderCell scope="row">{inline(promise, 0)}</Table.HeaderCell>
                <Table.Cell>{inline(rule, 0)}</Table.Cell>
                <Table.Cell>{level}</Table.Cell>
                <Table.Cell>
                  {!comp ? 'not built yet'
                    : at2 ? <a href={at2.href}>Open proof</a>
                    : level === 'convention' ? 'a convention: a reviewer checks it'
                    : 'proof loading'}
                </Table.Cell>
              </Table.Row>
            )
          })}
        </Table.Body>
      </Table>
      {/* The table leads, its caption in place of copy.md's lead-in line ("The ones this pattern stands on:"). */}
      <Words body={blocks.filter((b, i) => i !== at && !/^The ones this pattern stands on:?$/.test(b.trim())).join('\n\n')} />
    </Section>
  )
}

function OpenQuestions() {
  return (
    <Section n={13}>
      <Words body={section(13).body} />
    </Section>
  )
}

export function MoreSections({ announce, reduced }: { announce: Say; reduced: boolean }) {
  return (
    <>
      <Secrets announce={announce} />
      <Commands announce={announce} />
      <Groups announce={announce} />
      <SameStory announce={announce} />
      <Motion reduced={reduced} />
      <Components />
      <MinimumWidth announce={announce} />
      <Tests />
      <OpenQuestions />
    </>
  )
}

// Used by the unit tests.
export { RLM, CURLY, hasHidden }
