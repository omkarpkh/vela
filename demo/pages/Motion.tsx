import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Toggle, Tabs } from '../../src'
import { Tabs as HeadlessTabs } from '../../src/headless'
import tokensJson from '../../tokens/vela.tokens.json'
import { springAt, springLinear } from '../../scripts/spring.mjs'
import '../playground.css'

// The motion pass, for the owner's review: the Tabs underline and its hover preview (the Seed) in
// both implementations and both themes, a Replay that presses the tabs the way a pointer does, a
// slow-motion switch, and every motion token with its value and its reason — read from
// tokens/vela.tokens.json, so this page cannot disagree with the file the CSS is generated from.
const VENDOR = 'com.omkarux.vela'
type Spring = { stiffness: number; damping: number; mass: number; duration: string }
type MotionToken = { $type: string; $value: unknown; $description?: string; $extensions?: { [VENDOR]?: { figma?: string; spring?: Spring } } }
const MOTION = (tokensJson as unknown as { motion: Record<string, MotionToken> }).motion
const NEW = new Set(['ease-out', 'ease-spring', 'duration-travel'])

const ms = (name: string) => (MOTION[name].$value as { value: number }).value
const bezierOf = (name: string): number[] => {
  const v = MOTION[name].$value
  return typeof v === 'string' ? bezierOf(v.slice(1, -1).split('.').pop()!) : (v as number[])
}
const springOfToken = (name: string) => {
  const s = MOTION[name].$extensions?.[VENDOR]?.spring
  return s ? { ...s, durationMs: ms(s.duration.slice(1, -1).split('.').pop()!) } : null
}
const SPRING = springOfToken('ease-spring')!
const SPRING_CURVE = springLinear(SPRING, SPRING.durationMs)

function valueOf(name: string): string {
  const t = MOTION[name]
  if (t.$type === 'duration') return `${ms(name)}ms`
  if (t.$type === 'dimension') return `${(t.$value as { value: number }).value}px`
  const s = springOfToken(name)
  if (s) return `spring · stiffness ${s.stiffness}, damping ${s.damping}, mass ${s.mass} · drawn over ${s.durationMs}ms as linear() (${SPRING_CURVE.points.length} stops, ${(SPRING_CURVE.overshoot * 100).toFixed(1)}% overshoot) · fallback cubic-bezier(${bezierOf(name).join(', ')})`
  return `cubic-bezier(${bezierOf(name).join(', ')})`
}

// A cubic-bezier easing evaluated the way the browser does: solve x(t) = progress of time, return y(t).
function bezier([x1, y1, x2, y2]: number[]) {
  const B = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3
  return (x: number) => {
    let lo = 0, hi = 1
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (B(x1, x2, mid) < x) lo = mid; else hi = mid }
    return B(y1, y2, (lo + hi) / 2)
  }
}

function Curves() {
  const W = 320, H = 160, PAD = 12
  const top = 1.06
  const path = (f: (x: number) => number) =>
    Array.from({ length: 121 }, (_, i) => i / 120)
      .map((x, i) => `${i ? 'L' : 'M'}${(PAD + x * (W - 2 * PAD)).toFixed(1)},${(H - PAD - (f(x) / top) * (H - 2 * PAD)).toFixed(1)}`)
      .join(' ')
  const y1 = H - PAD - (1 / top) * (H - 2 * PAD)
  const curves = [
    { name: 'ease-standard', cls: 'motion-curve--standard', f: bezier(bezierOf('ease-standard')) },
    { name: 'ease-out', cls: 'motion-curve--out', f: bezier(bezierOf('ease-out')) },
    { name: 'ease-spring', cls: 'motion-curve--spring', f: (x: number) => springAt(SPRING, (x * SPRING.durationMs) / 1000) },
  ]
  return (
    <figure className="motion-curves">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Progress over time for ease-standard, ease-out and the spring">
        <line className="motion-curve__rule" x1={PAD} x2={W - PAD} y1={y1} y2={y1} />
        <line className="motion-curve__rule" x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} />
        {curves.map((c) => <path key={c.name} className={`motion-curve ${c.cls}`} d={path(c.f)} />)}
      </svg>
      <figcaption className="vela-meta">
        {curves.map((c) => <span key={c.name} className={`motion-key ${c.cls}`}>{c.name}</span>)}
        <span>Time runs left to right across the whole duration; the upper rule is the end value.</span>
      </figcaption>
    </figure>
  )
}

const TABS = [
  { value: 'alerts', label: 'Alerts', count: 12 },
  { value: 'assets', label: 'Assets', count: 340 },
  { value: 'identities', label: 'Identities' },
  { value: 'audit', label: 'Audit log' },
]

function Sample({ implementation }: { implementation: 'core' | 'headless' }) {
  const T = implementation === 'headless' ? HeadlessTabs : Tabs
  return (
    <div className="motion-sample" data-implementation={implementation}>
      <p className="vela-meta motion-sample__label">{implementation === 'core' ? 'Core · @omkarux/vela' : 'Headless · @omkarux/vela/headless (Base UI)'}</p>
      <T defaultValue="alerts">
        <T.List aria-label={`Views (${implementation})`}>
          {TABS.map((t) => <T.Trigger key={t.value} value={t.value} count={t.count}>{t.label}</T.Trigger>)}
        </T.List>
        {TABS.map((t) => <T.Panel key={t.value} value={t.value}><p className="vela-body motion-sample__panel">{t.label} panel.</p></T.Panel>)}
      </T>
    </div>
  )
}

// A press the way a pointer makes one, so the components take their pointer path: pointerdown
// (which records the modality), pointerup, click. Base UI and the core both activate on it.
function press(el: HTMLElement) {
  const init = { bubbles: true, cancelable: true, button: 0, pointerType: 'mouse', isPrimary: true }
  el.dispatchEvent(new PointerEvent('pointerdown', init))
  el.dispatchEvent(new PointerEvent('pointerup', init))
  el.click()
}

const SLOW = 5

export function Motion() {
  const stage = useRef<HTMLDivElement>(null)
  const [slow, setSlow] = useState(false)
  const [playing, setPlaying] = useState(false)
  const timers = useRef<number[]>([])
  const supportsLinear = typeof CSS !== 'undefined' && CSS.supports('transition-timing-function', 'linear(0, 1)')

  // Slow motion without touching a component's CSS: every running animation on the page — CSS
  // transitions are Animation objects — is played at a fifth of its rate while the switch is on,
  // including ones that start later, which the frame loop catches on their first frame.
  useEffect(() => {
    if (!slow || typeof document.getAnimations !== 'function') return
    let frame = 0
    const tick = () => {
      for (const a of document.getAnimations()) if (a.playbackRate !== 1 / SLOW) a.playbackRate = 1 / SLOW
      frame = requestAnimationFrame(tick)
    }
    tick()
    return () => {
      cancelAnimationFrame(frame)
      for (const a of document.getAnimations()) a.playbackRate = 1
    }
  }, [slow])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // Replay: from the first tab to the far end, back one, then home — a far press, a near one and a
  // return, in every list on the stage at once. The pause between presses scales with slow motion.
  const replay = useCallback(() => {
    timers.current.forEach(clearTimeout)
    const lists = [...(stage.current?.querySelectorAll<HTMLElement>('[role="tablist"]') ?? [])]
    const at = (i: number) => lists.forEach((l) => { const tab = l.querySelectorAll<HTMLElement>('[role="tab"]')[i]; if (tab) press(tab) })
    // Start from the first tab without animating: a click from code (no pointerdown) is instant.
    lists.forEach((l) => l.querySelector<HTMLElement>('[role="tab"]')?.click())
    const step = (ms('duration-travel') + 360) * (slow ? SLOW : 1)
    setPlaying(true)
    timers.current = [
      window.setTimeout(() => at(TABS.length - 1), 120),
      window.setTimeout(() => at(1), 120 + step),
      window.setTimeout(() => at(0), 120 + 2 * step),
      window.setTimeout(() => setPlaying(false), 120 + 3 * step),
    ]
  }, [slow])

  return (
    <article className="doc motion-page">
      <header className="page-head">
        <p className="vela-meta page-head__eyebrow">Review</p>
        <h1 className="vela-h2">Motion review</h1>
        <p className="vela-meta">
          A review aid for the motion pass, part 1. Every value here is provisional until the feel is approved; look at it again
          tomorrow before deciding. Slow motion is for review only — it changes the playback rate of the page's running
          animations and touches no component stylesheet.
        </p>
      </header>

      <section className="motion-section" aria-labelledby="motion-tabs">
        <h2 id="motion-tabs" className="vela-h3">Tabs: the hover preview and the press</h2>
        <p className="vela-body motion-copy">
          Rest the pointer on a tab that is not selected: after <code>--vela-delay-preview</code> a short, soft-ended bar, the
          Seed, fades in under it at <code>--vela-opacity-preview</code>, in the underline&apos;s colour. Press the tab: the Seed
          grows into the underline where it is, on the spring over <code>--vela-duration-travel</code>, while the old underline
          shrinks away under the old tab; nothing travels across the row. Focus a tab and use the arrow keys: the underline
          moves at once and no Seed appears, because from the keyboard nothing animates. Press again while it is growing and
          every part turns towards its new end from wherever it is.
        </p>
        <div className="pg-toolbar motion-toolbar">
          <Button size="tiny" variant="standard" appearance="hollow" onClick={replay} aria-describedby="motion-replay-note">Replay</Button>
          <Toggle label={`×${SLOW} slow motion`} size="tiny" checked={slow} onChange={setSlow} />
          <span id="motion-replay-note" className="vela-meta motion-status" aria-live="polite">
            {playing ? 'Playing…' : supportsLinear ? 'This browser draws the spring (linear() is supported).' : 'This browser falls back to ease-out (no linear() support).'}
          </span>
        </div>
        <div ref={stage} className="pg-stage motion-stage">
          {(['light', 'dark'] as const).map((m) => (
            <div key={m} className="vela-root pg-frame motion-frame" data-theme={m}>
              <span className="pg-frame-label vela-meta">{m}</span>
              <div className="pg-frame-body motion-frame__body">
                <Sample implementation="core" />
                <Sample implementation="headless" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="motion-section" aria-labelledby="motion-curves">
        <h2 id="motion-curves" className="vela-h3">The curves</h2>
        <Curves />
      </section>

      <section className="motion-section" aria-labelledby="motion-tokens">
        <h2 id="motion-tokens" className="vela-h3">Motion tokens</h2>
        <table className="how-table motion-tokens">
          <thead>
            <tr><th scope="col">Token</th><th scope="col">Value</th><th scope="col">Why</th></tr>
          </thead>
          <tbody>
            {Object.entries(MOTION).filter(([n]) => !n.startsWith('$')).map(([name, t]) => (
              <tr key={name} data-token={name}>
                <th scope="row"><code>--vela-{name}</code>{NEW.has(name) && <span className="vela-meta motion-new"> new</span>}</th>
                <td><code>{valueOf(name)}</code></td>
                <td>{t.$description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </article>
  )
}
