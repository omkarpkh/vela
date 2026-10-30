import { useCallback, useEffect, useId, useRef, useState, type RefObject } from 'react'
import { Tabs, Toggle } from '../../../src'
// Internal to the component, not part of the public API: the same measurement the shipped
// indicator uses, so the gliding Seed and the underline agree on where a tab is.
import { measureIndicator } from '../../../src/components/Tabs/motion'
import './tabs-preview-proto.css'

// PROTOTYPE — not shipped. The Tabs hover preview ("the Seed"), for the owner's review on the
// Motion page. It wraps the real core <Tabs> rather than copying it: the shipped component already
// accepts a className on the root and on each trigger, and a trigger renders its children inside
// the <button>, so the preview layers go in as decorative children and every rule lives in
// tabs-preview-proto.css, scoped under .tp. Nothing in src/ changes; the keyboard path, the
// data-vela-moving / data-vela-instant marks and the shipped sliding indicator are the real ones.
//
// The layers inside each trigger (all aria-hidden, all empty, so the tab's accessible name and
// text are unchanged):
//   .tp-seed   the Seed: a full-width stroke-2 bar scaled to a third, feathered by a static mask
//   .tp-line   A only: a square-ended full-width bar, the underline the Seed grows into
//   .tp-bloom  Dawn bloom: a faint vertical gradient rising from the Seed, below the label's text box
//   .tp-hair   the control: a full-width 1px feathered hairline
//
// "Seed between tabs: Glide" adds one row-level Seed inside the tab list (beside the shipped
// indicator), placed from the measured tab geometry through two custom properties, so it can travel
// from one rested tab to the next by transform alone. The per-tab Seeds then stop answering hover;
// they still carry A's grow-in-place on a press. See useGlide below.

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'alerts', label: 'Alerts', count: 12 },
  { value: 'assets', label: 'Assets', count: 340 },
  { value: 'identities', label: 'Identities' },
  { value: 'policies', label: 'Policies' },
  { value: 'devices', label: 'Devices' },
  { value: 'reports', label: 'Reports' },
  { value: 'audit', label: 'Audit log' },
  { value: 'sessions', label: 'Sessions' },
  { value: 'integrations', label: 'Integrations' },
]

type Variant = 'seed' | 'hairline'
type Click = 'grow' | 'land'
type Strength = '40' | '55'
type Between = 'fade' | 'glide'

// The rest before the preview moves or appears. Same provisional value as --tp-rest in the CSS;
// here because the glide's rest is a pointer timer, scaled by the page's slow-motion factor so a
// slowed review keeps its proportions (CSS delays are slowed by the playback-rate loop instead).
const REST_MS = 80
const SLOW = 5
// Further than this many tabs away, the Seed does not glide: it fades out at the old tab and in at
// the new one, so it never sweeps across the whole row.
const GLIDE_MAX = 2
// The Seed is a third of its tab, but never under this (Material 3's tab indicator floor) and never
// wider than the tab. Same value as the comment beside --tp-seed-scale in the CSS.
const SEED_MIN_PX = 24
// Glide only: once the pointer has left the tab the Seed is under (into a gap, or onto another tab
// it has not rested on yet), the Seed waits this long for a new rest and then fades out where it
// is, so it never stays under a tab the pointer has left. Shorter than a show delay would be, and
// inside the 150-200ms the hover-intent research suggests; restarted only when the pointer leaves
// that tab again, not by every move, so a pointer travelling along the row still lets it go.
const OUT_MS = 180
/** The Seed's scale, as a fraction of its tab's width: a third, floored at SEED_MIN_PX, at most 1. */
const seedScale = (tabWidth: number) => (tabWidth > 0 ? Math.min(1, Math.max(1 / 3, SEED_MIN_PX / tabWidth)) : 1 / 3)

/**
 * The gliding Seed's controller. Imperative on purpose: it only ever sets two custom properties and
 * a few data attributes on the row-level Seed, and the CSS transitions do all the moving — no
 * animation loop, no re-render per pointer move.
 *
 * Two row-level elements, used one at a time: the "active" one glides; only for the far fallback
 * does the other take over (the active one fades out where it is while the other appears at the
 * new tab), because one element cannot be in two places at once.
 */
function useGlide(frame: RefObject<HTMLDivElement | null>, enabled: boolean, slow: boolean) {
  const api = useRef<{ onSelect: (value: string) => void } | null>(null)
  const slowRef = useRef(slow)
  slowRef.current = slow

  useEffect(() => {
    const list = frame.current?.querySelector<HTMLElement>('[role="tablist"]')
    const els = [...(frame.current?.querySelectorAll<HTMLElement>('.tp-glide') ?? [])]
    if (!enabled || !list || els.length !== 2) return
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    const tabs = () => [...list.querySelectorAll<HTMLElement>('[role="tab"]')]
    let active = 0
    let at: HTMLElement | null = null       // the tab the visible Seed is under, or null when hidden
    let timer = 0
    let out = 0                              // the out-delay, running while the pointer is off `at`
    let px = -1, py = -1                     // the pointer's last position over the list

    const place = (el: HTMLElement, tab: HTMLElement) => {
      const m = measureIndicator(list, tab)
      if (!m) return
      const w = m.scale * list.clientWidth          // the tab's width
      const s = seedScale(w)                         // the Seed, as a fraction of it
      el.style.setProperty('--tp-gx', `${m.x + (w * (1 - s)) / 2}px`)
      el.style.setProperty('--tp-gs', String(m.scale * s))
    }
    const hide = (el: HTMLElement, why: 'leave' | 'select') => {
      el.removeAttribute('data-shown')
      el.setAttribute('data-hide', why)
    }
    const hideAll = (why: 'leave' | 'select') => { window.clearTimeout(out); out = 0; if (at) hide(els[active], why); at = null }
    // Off the Seed's tab: start the out-delay once; a rest that lands first cancels it.
    const away = () => { if (at && !out) out = window.setTimeout(() => { out = 0; hideAll('leave') }, OUT_MS * (slowRef.current ? SLOW : 1)) }
    const back = () => { window.clearTimeout(out); out = 0 }
    const show = (tab: HTMLElement) => {
      back()
      const all = tabs()
      const el = els[active]
      if (at && Math.abs(all.indexOf(tab) - all.indexOf(at)) <= GLIDE_MAX) {
        // Glide: one object, from where it is to the new tab.
        el.setAttribute('data-move', 'glide')
        place(el, tab)
      } else {
        // Appear here: a jump while invisible, then a fade in. Far away, the old one fades out
        // where it is at the same time.
        if (at) { hide(el, 'leave'); active = 1 - active }
        const next = els[active]
        next.setAttribute('data-move', 'jump')
        next.removeAttribute('data-hide')
        place(next, tab)
        next.setAttribute('data-shown', '')
      }
      at = tab
    }
    const rested = (tab: HTMLElement) => {
      if (tab.getAttribute('aria-selected') === 'true' || (tab as HTMLButtonElement).disabled) hideAll('leave')
      else show(tab)
    }

    // A rest is the pointer standing still on a tab, not merely being over it: every move restarts
    // the wait, so a pointer travelling along the row at any speed never pulls the Seed after it.
    // The tab under the pointer: on a move, or after the row scrolled under a still pointer.
    const consider = (tab: HTMLElement | null) => {
      window.clearTimeout(timer)
      // Back on the Seed's tab: keep it. Anywhere else (a gap, or a tab not yet rested on): the
      // out-delay runs, and a tab starts its own rest.
      if (tab && tab === at) { back(); return }
      away()
      if (tab) timer = window.setTimeout(() => rested(tab), REST_MS * (slowRef.current ? SLOW : 1))
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || !fine.matches) return
      px = e.clientX; py = e.clientY
      consider((e.target as Element).closest<HTMLElement>('[role="tab"]'))
    }
    const onScroll = () => {
      if (px < 0) return
      const under = document.elementFromPoint(px, py)
      consider(under && list.contains(under) ? under.closest<HTMLElement>('[role="tab"]') : null)
    }
    const onLeave = () => { window.clearTimeout(timer); px = py = -1; hideAll('leave') }
    list.addEventListener('pointermove', onMove)
    list.addEventListener('pointerleave', onLeave)
    list.addEventListener('scroll', onScroll, { passive: true })
    api.current = {
      // A selection (pointer or keyboard) on the tab the Seed is under: it fades out over the first
      // half of the travel, or at once when the root is marked instant.
      onSelect: (value) => {
        const tab = tabs().find((t) => t.querySelector(`[data-value="${CSS.escape(value)}"]`)) ?? null
        if (tab && tab === at) hideAll('select')
      },
    }
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(out)
      list.removeEventListener('pointermove', onMove)
      list.removeEventListener('pointerleave', onLeave)
      list.removeEventListener('scroll', onScroll)
      api.current = null
      for (const el of els) { el.removeAttribute('data-shown'); el.removeAttribute('data-hide'); el.removeAttribute('data-move') }
    }
  }, [frame, enabled])

  return useCallback((value: string) => api.current?.onSelect(value), [])
}

function GlideSeed() {
  return (
    <span className="tp-glide" aria-hidden="true">
      <span className="tp-glide__bloom" />
      <span className="tp-glide__seed" />
    </span>
  )
}

// data-value lets the glide controller find a trigger by its value without reading the label.
function Layers({ value }: { value: string }) {
  return (
    <>
      <span className="tp-l tp-bloom" aria-hidden="true" data-value={value} />
      <span className="tp-l tp-seed" aria-hidden="true" />
      <span className="tp-l tp-line" aria-hidden="true" />
      <span className="tp-l tp-hair" aria-hidden="true" />
    </>
  )
}

/** Sets each trigger's --tp-s (the Seed's scale with its floor) from its width, and keeps it current. */
function useSeedScale(frame: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const triggers = [...(frame.current?.querySelectorAll<HTMLElement>('[role="tab"]') ?? [])]
    const set = (t: HTMLElement) => t.style.setProperty('--tp-s', String(seedScale(t.offsetWidth)))
    triggers.forEach(set)
    const ro = new ResizeObserver((entries) => entries.forEach((e) => set(e.target as HTMLElement)))
    triggers.forEach((t) => ro.observe(t))
    return () => ro.disconnect()
  }, [frame])
}

function Row({ theme, glide, slow }: { theme: 'light' | 'dark'; glide: boolean; slow: boolean }) {
  const frame = useRef<HTMLDivElement>(null)
  const onSelect = useGlide(frame, glide, slow)
  useSeedScale(frame)
  return (
    <div ref={frame} className="vela-root pg-frame tp-frame" data-theme={theme}>
      <span className="pg-frame-label vela-meta">{theme}</span>
      <div className="pg-frame-body tp-frame__body">
        <Tabs defaultValue="overview" onValueChange={onSelect}>
          <Tabs.List aria-label={`Views (prototype, ${theme})`}>
            {TABS.map((t) => (
              <Tabs.Trigger key={t.value} value={t.value} count={t.count}>
                {t.label}
                <Layers value={t.value} />
              </Tabs.Trigger>
            ))}
            {/* The row-level Seeds for Glide: decorative, not tabs, so roving focus never sees them. */}
            <GlideSeed />
            <GlideSeed />
          </Tabs.List>
          {TABS.map((t) => (
            <Tabs.Panel key={t.value} value={t.value}>
              <p className="vela-body tp-panel">{t.label} panel.</p>
            </Tabs.Panel>
          ))}
        </Tabs>
      </div>
    </div>
  )
}

function Choice<T extends string>({ label, value, options, onChange, disabled }: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  disabled?: boolean
}) {
  const id = useId()
  return (
    <label className="pg-field tp-field" htmlFor={id}>
      <span className="pg-field__label">{label}</span>
      <span className="pg-select-wrap">
        <select id={id} className="pg-select" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as T)}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </span>
    </label>
  )
}

export function TabsPreviewProto({ slow, onSlowChange }: { slow: boolean; onSlowChange: (v: boolean) => void }) {
  const [variant, setVariant] = useState<Variant>('seed')
  const [click, setClick] = useState<Click>('grow')
  const [strength, setStrength] = useState<Strength>('40')
  const [bloom, setBloom] = useState(false)
  const [between, setBetween] = useState<Between>('glide')
  const seed = variant === 'seed'
  const glide = seed && between === 'glide'
  // Glide is the default with A, Fade with B; either can then be chosen by hand.
  const chooseClick = (c: Click) => { setClick(c); setBetween(c === 'grow' ? 'glide' : 'fade') }

  return (
    <section className="motion-section tp-section" aria-labelledby="motion-tabs-preview">
      <h2 id="motion-tabs-preview" className="vela-h3">Tabs hover preview — prototypes (not shipped)</h2>
      <p className="vela-body motion-copy">
        Rest the pointer on a tab that is not selected. After a short rest (80ms, so a quick sweep across the row shows
        nothing) a short, soft-ended line — the Seed — fades in under it at reduced strength, in the selected underline's
        colour. The selected underline does not move while you hover. Press the tab: in <strong>A · Grow in place</strong> the
        Seed grows into the new underline while the old one dissolves where it was; in <strong>B · Land on the marker</strong> the
        shipped underline travels over and covers the Seed. From the keyboard nothing appears and nothing animates.
      </p>
      <p className="vela-body motion-copy">
        <strong>Seed between tabs.</strong> <em>Fade</em>: each tab has its own Seed, which fades out as the pointer leaves
        and in at the next tab after the rest. <em>Glide</em> (the default with A): one Seed for the row, which travels from
        the tab it was under to the next one once the pointer stands still there for 80ms — by transform only, on{' '}
        <code>--vela-ease-out</code> over <code>--vela-duration-fast</code>. More than two tabs away it does not glide: it
        fades out where it was and in where you rest, so it never sweeps the whole row. Leaving the row fades it out.
      </p>
      <p className="vela-meta motion-copy tp-provisional">
        Provisional, demo-only values: strength 40% / 55% (a future <code>--vela-opacity-preview</code> token; not added),
        the 80ms rest delay, the 180ms out-delay (Glide), the Seed at one third of the tab but never under 24px, the bloom at {'≈'}15%. They live in
        <code> demo/pages/motion/tabs-preview-proto.css</code>; no shipped stylesheet, token or API changes.
      </p>
      <div className="pg-toolbar motion-toolbar tp-toolbar">
        <Choice<Variant> label="Variant" value={variant} onChange={setVariant} options={[
          { value: 'seed', label: 'Seed' },
          { value: 'hairline', label: 'Feathered hairline (control)' },
        ]} />
        <Choice<Click> label="Click" value={click} onChange={chooseClick} disabled={!seed} options={[
          { value: 'grow', label: 'A · Grow in place' },
          { value: 'land', label: 'B · Land on the marker' },
        ]} />
        <Choice<Between> label="Seed between tabs" value={between} onChange={setBetween} disabled={!seed} options={[
          { value: 'fade', label: 'Fade' },
          { value: 'glide', label: 'Glide' },
        ]} />
        <Choice<Strength> label="Strength" value={strength} onChange={setStrength} disabled={!seed} options={[
          { value: '40', label: '40%' },
          { value: '55', label: '55%' },
        ]} />
        <Toggle label="Dawn bloom" size="tiny" checked={bloom} onChange={setBloom} disabled={!seed} />
        {/* The same state as the ×5 switch at the top of the page, mirrored here so the review does
            not need a scroll; named differently so the page keeps one control by that name. */}
        <Toggle label="Slow motion (×5, same as above)" size="tiny" checked={slow} onChange={onSlowChange} />
      </div>
      <div
        className="pg-stage pg-stage--single tp"
        data-variant={variant}
        data-click={click}
        data-strength={strength}
        data-bloom={bloom && seed ? 'on' : 'off'}
        data-between={glide ? 'glide' : 'fade'}
      >
        <Row theme="light" glide={glide} slow={slow} />
        <Row theme="dark" glide={glide} slow={slow} />
      </div>
      <p className="vela-meta tp-note">
        {seed
          ? `Seed · ${click === 'grow' ? 'A · grow in place' : 'B · land on the marker'} · ${between === 'glide' ? 'glide' : 'fade'} between tabs · ${strength}% · bloom ${bloom ? 'on' : 'off'}`
          : 'Feathered hairline · full width, 1px, 40% · the shipped travel on click'}
      </p>
    </section>
  )
}
