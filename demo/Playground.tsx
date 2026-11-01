import { useCallback, useEffect, useMemo, useId, useRef, useState } from 'react'
import { Button, Toggle, Tabs, Icon, cn } from '../src'
import { REGISTRY, type Values, type Lock } from './playground/registry'
import { parseSpec, sectionOf as specSection } from './playground/spec'
import { ControlField, LockPanel, AlsoInTheApi, CodeBar, type OpenLock } from './playground/Workbench'
import { readLink, writeLink, queryOf, type Stage, type Compare } from './playground/link'
import { installFor } from './playground/install'
import { statusOf } from './playground/status'
import { rulesOf } from './playground/facts'
import { replaceRoute, href, parseHash, type PageTab } from './router'
import { buildIndex, closest } from './playground/search'
import { Segments } from './shell/Segments'
import { ScrollRegion } from './shell/ScrollRegion'
import { StageBoundary, COMMIT, type Settings } from './shell/ErrorBoundary'
import { StageWidth, WidthHandle, FLOOR, clampWidth } from './playground/StageWidth'
import { useProofs, RulesTab, rulesLine } from './playground/Proofs'
import { sectionOf } from './shell/SectionIndex'
import { NextCard } from './shell/Card'
import { Announcer, CopyMark } from './shell/CopyMark'
import { searchFor } from './shell/Search'
import { useArrival } from './shell/arrival'
import { KNOWN, type Mode } from './playground/tokens'
import { TokensTab, tokensLine, variantsOf, boundInCode } from './playground/TokensTab'
import { FigmaTab, figmaEntryFor, figmaLine, settingWords } from './playground/FigmaTab'
import { rulesFromSpec, oneLine } from './playground/rules-read'
import './playground.css'

const STAGE_OPTIONS = [
  { value: 'beside', label: 'Beside' },
  { value: 'full', label: 'Full width' },
] as const
// Compare splits the stage (section 5). Brands joins when a second brand exists (B4, B9): there is
// none yet, so it is not offered.
const COMPARE_OPTIONS = [
  { value: 'off', label: 'Off' },
  { value: 'themes', label: 'Themes' },
] as const

/** The page's own theme: the Theme control's choice, or the system's when it says System. */
function usePageTheme(): Mode {
  const read = (): Mode => {
    const set = document.documentElement.getAttribute('data-theme')
    if (set === 'light' || set === 'dark') return set
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  const [mode, setMode] = useState<Mode>(read)
  useEffect(() => {
    const on = () => setMode(read())
    const mo = new MutationObserver(on)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', on)
    return () => { mo.disconnect(); mq.removeEventListener('change', on) }
  }, [])
  return mode
}

/** Per-viewer storage, safe when empty or refused (section 5: the stage choice is kept per component). */
const stored = {
  get: (k: string) => { try { return window.localStorage.getItem(k) } catch { return null } },
  set: (k: string, v: string) => { try { window.localStorage.setItem(k, v) } catch { /* not kept; fine */ } },
}

/** `?rule=<id>`: a link to one rule on the Rules tab. */
const ruleOf = (hash: string) => new URLSearchParams(queryOf(hash)).get('rule')

// The component under test renders here, as its own element, so a render error throws inside the
// stage's error boundary rather than in the page that holds it.
function Rendered({ entry, v }: { entry: (typeof REGISTRY)[number]; v: Values }) {
  return <>{entry.render(v)}</>
}

/** A field the on-screen keyboard opens for: a text input or a text area, not a switch or a select. */
const isTextControl = (el: EventTarget | null) =>
  el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && !['checkbox', 'radio', 'range', 'button', 'submit'].includes(el.type))

export function Playground({ id, tab }: { id: string; tab?: PageTab }) {
  const entry = REGISTRY.find((e) => e.id === id)
  if (!entry) return <Unknown name={id} />
  return <PlaygroundFor entry={entry} tab={tab} />
}

/** A link to a component that doesn't exist (playground spec, section 7): the closest names, by search. */
function Unknown({ name }: { name: string }) {
  const near = useMemo(() => closest(buildIndex(), name), [name])
  return (
    <article className="pg-unknown">
      <h1 className="vela-h2">There's no component called “{name}”.</h1>
      {near.length > 0 && (
        <>
          <p className="vela-body">The closest names:</p>
          <ul className="pg-list">
            {near.map((i) => <li key={i.id}><a href={i.href}>{i.title}</a></li>)}
          </ul>
        </>
      )}
      <p className="vela-body"><a href="#/status">Browse all components</a></p>
    </article>
  )
}

/** A media query's answer, kept current. */
function useMedia(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setMatches(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [query])
  return matches
}

function PlaygroundFor({ entry, tab }: { entry: (typeof REGISTRY)[number]; tab?: PageTab }) {
  const spec = useMemo(() => parseSpec(entry.spec, KNOWN), [entry])
  const controls = useMemo(
    () => [
      ...spec.controls.filter((c) => !entry.hide?.includes(c.prop) && !entry.noControl?.includes(c.prop)),
      ...(entry.extra ?? []),
    ],
    [spec, entry],
  )
  const initial = useMemo(() => {
    const next: Values = {}
    for (const c of controls) next[c.prop] = entry.seed[c.prop] ?? c.default
    for (const [k, v] of Object.entries(entry.seed)) if (!(k in next)) next[k] = v
    return next
  }, [entry, controls])
  const implIds = entry.implementations?.map((i) => i.id) ?? []
  const legal = (x: Values) => { const l = entry.locks?.(x) ?? {}; return !Object.entries(l).some(([p, byValue]) => String(x[p]) in byValue) }
  // A shared link, read once when the page opens (section 11): closed sets only, illegal values
  // replaced by the defaults, and a notice for each.
  const link = useMemo(() => {
    const read = readLink(queryOf(window.location.hash), entry.name, controls, initial, implIds)
    const merged = { ...initial, ...read.values }
    if (!legal(merged)) return { ...read, values: {}, notices: [...read.notices, `This link asked for a combination ${entry.name} doesn't allow, so the stage shows the defaults.`] }
    return read
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry, controls, initial])
  const [values, setValues] = useState<Values>(() => ({ ...initial, ...link.values }))
  const [reduced, setReduced] = useState(false)
  const stageKey = `vela.playground.stage.${entry.id}`
  // Default: Beside. Full width is the default only for a component whose spec states a minimum
  // width wider than the stage gives beside the controls; no spec states one as a number yet (A1).
  const defaultStage: Stage = 'beside'
  const [stage, setStageState] = useState<Stage>(() => link.stage ?? (stored.get(stageKey) === 'full' ? 'full' : stored.get(stageKey) === 'beside' ? 'beside' : defaultStage))
  const setStage = (st: Stage) => { setStageState(st); stored.set(stageKey, st) }
  // Compare is kept across every component (spec v1.2, call 10): someone who always wants both themes
  // sets it once. Per viewer, safe when empty; a link's own choice wins.
  const [compare, setCompareState] = useState<Compare>(() => link.compare ?? (stored.get('vela.playground.compare') === 'themes' ? 'themes' : 'off'))
  const setCompare = (c: Compare) => { setCompareState(c); stored.set('vela.playground.compare', c) }
  const [lock, setLock] = useState<OpenLock | null>(null)
  // Bumped on every change, so a changed code line's tint runs once and settles to its mark.
  const [settle, setSettle] = useState(0)
  const [announce, setAnnounce] = useState('')
  // Bumped by "Reset settings" in the stage's error state, so a reset to the same values still retries.
  const [attempt, setAttempt] = useState(0)
  // The phone stage strip (section 6, A8 and A12): pinned while the controls scroll, on a tall enough
  // phone screen (the media query in playground.css). It lets go while a text control has focus,
  // because the on-screen keyboard halves the height, and while the reader has expanded it.
  const [width, setWidth] = useState<number | undefined>(() => (entry.containerResponsive ? link.width : undefined))
  // The width the stage gives one frame's body: the top of the width control's range.
  const frameRef = useRef<HTMLDivElement>(null)
  const [avail, setAvail] = useState<number | null>(null)
  useEffect(() => {
    const el = frameRef.current
    if (!el || !entry.containerResponsive) return
    const measure = () => { const cs = getComputedStyle(el); setAvail(Math.floor(el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight))) }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  })
  const [phone, setPhone] = useState(() => window.matchMedia('(max-width: 600px)').matches)
  useEffect(() => {
    const m = window.matchMedia('(max-width: 600px)')
    const on = () => setPhone(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  const [typing, setTyping] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const pageTheme = usePageTheme()
  // Page tabs are size large, the clearest mark of level 1; under 480px they are regular and scroll
  // sideways, as Tabs does, with the current tab in view (sweep T44).
  const narrowTabs = useMedia('(max-width: 480px)')
  // Set by a Next card, so the tab it opens is read from its start.
  const toTabStart = useRef(false)
  useArrival()
  const codeId = useId().replace(/:/g, '')
  const lockOpener = useRef<HTMLElement | null>(null)

  const set = (patch: Values, said?: string) => {
    setValues((s) => ({ ...s, ...patch }))
    setSettle((n) => n + 1)
    setLock(null)
    // Announced once, politely, never twice (section 13).
    setAnnounce(said ?? `Stage updated: ${Object.entries(patch).map(([k, x]) => `${k} ${x === true ? 'on' : x === false ? 'off' : x}`).join(', ')}`)
  }

  const v = entry.constrain ? entry.constrain(values) : values
  const locks: Record<string, Record<string, Lock>> = entry.locks?.(v) ?? {}
  const code = entry.code(v, spec)
  // Two entry points, one playground: the import line and the install command follow the chosen
  // implementation. The install command is generated from package.json's peerDependenciesMeta.
  const impl = entry.implementations?.find((i) => i.id === v.implementation) ?? entry.implementations?.[0]
  const importPath = impl?.entry ?? '@omkarux/vela'
  const install = installFor(importPath)
  const sourcePath = impl && impl.id !== 'core' ? `src/${impl.id}/${entry.src}/${entry.src}.tsx` : `src/components/${entry.src}/${entry.src}.tsx`
  // Which tokens the stage's values bind: the spec's Token bindings row for them, or the registry's own rule.
  const boundFor = useCallback((x: Values) => {
    if (entry.highlight) return entry.highlight(x)
    const row = entry.bindingKey ? spec.bindings[entry.bindingKey(x)] : undefined
    const set = new Set(Object.values(row ?? {}))
    return (t: string) => set.has(t)
  }, [entry, spec])
  const specRules = useMemo(() => rulesFromSpec(entry.spec), [entry])
  // The Rules tab's own sections after the ledger: the spec's States, Motion and Anti-patterns.
  const ruleSections = useMemo(() => ['States', 'Motion', 'Anti-patterns'].map((h) => specSection(spec, h)).filter((s): s is NonNullable<typeof s> => !!s), [spec])
  const figma = specSection(spec, 'Figma mapping')
  const figmaEntry = figmaEntryFor(entry.file)
  const figmaUrl = figmaEntry && figmaEntry.state !== 'none' ? figmaEntry.url : null
  const importLine = `import { ${entry.imports ?? entry.src} } from '${importPath}'`
  const snippet = `${importLine}\n\n${code}`
  const status = statusOf(entry.spec)
  const ruleCount = rulesOf(entry.spec)
  const headless = importPath.endsWith('/headless')
  const importId = useId()
  const peerId = useId()
  // A tab appears only when its data exists (B9). Figma is always there: a component with no set yet
  // says so on the tab, with the code to use until then (sweep T26). Changelog waits for D3.
  const tabs: { value: 'playground' | PageTab; label: string; count?: number }[] = [
    { value: 'playground', label: 'Playground' },
    ...(specRules.length > 0 || ruleSections.length > 0 ? [{ value: 'rules' as const, label: 'Rules', count: specRules.length || undefined }] : []),
    ...(spec.tokens.length > 0 ? [{ value: 'tokens' as const, label: 'Tokens', count: spec.tokens.length }] : []),
    ...(figmaEntry ? [{ value: 'figma' as const, label: 'Figma' }] : []),
  ]
  const current = tabs.some((t) => t.value === tab) ? tab! : 'playground'
  const proofs = useProofs(entry.file.replace(/\.md$/, ''))
  // A link to one rule (`?rule=`, from Search or a shared link), or "Open proof" in a lock panel.
  const [targetRule, setTargetRule] = useState<string | null>(() => ruleOf(window.location.hash))
  useEffect(() => {
    const on = () => {
      const r = ruleOf(window.location.hash)
      const route = parseHash(window.location.hash)
      if (r && route.kind === 'component' && route.id === entry.id) setTargetRule(r)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [entry.id])
  const targetDone = useCallback(() => setTargetRule(null), [])
  // The setting chosen on the Figma tab, carried by its Next card into the Playground.
  const [figmaValues, setFigmaValues] = useState<Values | null>(null)
  const variants = useMemo(() => variantsOf(spec.bindings, controls.filter((c) => c.kind === 'select')), [spec, controls])
  const inCode = useMemo(() => boundInCode(entry.src, impl?.entry === '@omkarux/vela/headless' || (!entry.implementations?.some((i) => i.id === 'core') && !!entry.implementations)), [entry, impl])
  // The way on from each tab: the next one, and from the last, back to the Playground.
  const nextAfter = (t: 'playground' | PageTab) => (tabs.length > 1 ? tabs[(tabs.findIndex((x) => x.value === t) + 1) % tabs.length].value : null)
  const goTo = (t: 'playground' | PageTab) => replaceRoute({ kind: 'component', id: entry.id, tab: t === 'playground' ? undefined : (t as PageTab) })
  useEffect(() => {
    if (!toTabStart.current) return
    toTabStart.current = false
    const list = document.querySelector<HTMLElement>('.pg-tabs .vela-tabs__list')
    list?.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior })
    list?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus({ preventScroll: true })
  }, [current])
  const next = (t: 'playground' | PageTab) => {
    const to = nextAfter(t)
    if (!to) return null
    const fromFigma = t === 'figma' && to === 'playground' && !!figmaUrl
    const words = {
      playground: fromFigma
        ? { title: 'Try this setting in the Playground', line: settingWords(figmaEntry, controls, { ...v, ...(figmaValues ?? {}) }) }
        : { title: `Try ${entry.name} in the Playground`, line: 'Every value the spec allows, on the stage' },
      rules: { title: `Rules: what ${entry.name} always does`, line: rulesLine(ruleCount.total) },
      tokens: { title: `Tokens: what ${entry.name} is made of, in every state`, line: tokensLine(spec.tokens) },
      figma: figmaUrl
        ? { title: `Figma: find ${entry.name} in the library, and match its properties`, line: figmaLine(figmaEntry) }
        : { title: `Figma: ${entry.name} has no set yet`, line: figmaLine(figmaEntry) },
      changelog: { title: `Changelog: what changed in ${entry.name}`, line: '' },
    }[to]
    return (
      <NextCard
        className="pg-next"
        eyebrow={fromFigma ? 'Next' : undefined}
        href={href({ kind: 'component', id: entry.id, tab: to === 'playground' ? undefined : (to as PageTab) })}
        title={words.title}
        line={words.line || undefined}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
          e.preventDefault()
          setLock(null)
          // The way on carries the setting chosen on the Figma tab.
          if (fromFigma && figmaValues) set(figmaValues, 'Stage updated: the setting chosen on the Figma tab')
          toTabStart.current = true
          goTo(to)
        }}
      />
    )
  }
  const selects = controls.filter((c) => c.kind === 'select')
  const texts = controls.filter((c) => c.kind === 'text')
  const booleans = controls.filter((c) => c.kind === 'boolean')
  const uncontrolled = spec.props.filter((p) => !controls.some((c) => c.prop === p.prop) && !entry.hide?.includes(p.prop))
  // The width control's range: the spec's minimum (none is stated as a number yet, so 320px) to the stage's width.
  const wMax = avail ?? 0
  const wMin = Math.min(FLOOR, wMax)
  const frameWidth = entry.containerResponsive && avail !== null && width !== undefined ? clampWidth(width, wMin, wMax) : undefined
  const dirty = JSON.stringify(values) !== JSON.stringify(initial) || stage !== defaultStage || compare !== 'off' || width !== undefined
  const frames: Mode[] = compare === 'themes' ? ['light', 'dark'] : [pageTheme]
  const changedProps = controls.filter((c) => v[c.prop] !== initial[c.prop]).map((c) => c.prop)
  const levelOf = (rule: string) => entry.spec.match(new RegExp(`\\[\\[rule:\\s*${rule}\\s*\\|\\s*(\\w+)\\s*\\]\\]`))?.[1]

  // The address carries the settings (section 11), replaced, not pushed: no history entry per click.
  useEffect(() => {
    // Only while the address is still this page: a link to another page (Search) is never rewritten.
    const here = parseHash(window.location.hash)
    if (here.kind !== 'component' || here.id !== entry.id) return
    const q = writeLink(controls, v, initial, { implementation: impl?.id, defaultImplementation: implIds[0], stage, defaultStage, compare, width: frameWidth })
    // The section index's place (?section=) and a link to one rule (?rule=) are kept beside the
    // settings; a tab switch drops them.
    const section = sectionOf(window.location.hash)
    const rule = ruleOf(window.location.hash)
    const query = [q, section ? new URLSearchParams({ section }).toString() : '', rule ? new URLSearchParams({ rule }).toString() : ''].filter(Boolean).join('&')
    const next = `${href({ kind: 'component', id: entry.id, tab: tab })}${query ? `?${query}` : ''}`
    if (window.location.hash !== next) window.history.replaceState(window.history.state, '', next)
  })

  const resetAll = () => { setValues(initial); setStage(defaultStage); setCompare('off'); setWidth(undefined); setLock(null); setAnnounce('Stage updated: every setting back to its default') }
  // What a stage error report may carry: values from closed sets only (selects and switches, the
  // implementation, the stage view), never the free text typed into a field.
  const closedSettings: Settings = Object.fromEntries([
    ...controls.filter((c) => c.kind !== 'text').map((c) => [c.prop, v[c.prop]] as const),
    ...(impl ? [['implementation', impl.id] as const] : []),
    ['stage', stage] as const,
    ['compare', compare] as const,
  ])

  return (
    <>
      {/* One header band (s5-tabs): what it is, the line to import it, and where it lives. The install
          panel and the facts strip are gone: install is on the Overview, and a headless component
          names the peer it needs here, in one line. */}
      <Announcer>
      <header className="pg-head">
        <div className="pg-head__text">
          <p className="vela-meta pg-head__eyebrow">Components / {entry.group}</p>
          <div className="pg-head__title">
            <h1 className="vela-h2">{entry.name}</h1>
            <span className="site-tag">{status.label}</span>
          </div>
          <p className="pg-head__line">{oneLine(spec.intro).replace(/\*\*|`/g, '')}</p>
        </div>
        <div className="pg-head__use">
          <p className="pg-head__import">
            <code id={importId} className="pg-import">{importLine}</code>
            <CopyMark what="import line" text={importLine} shownId={importId} />
          </p>
          {/* A page that switches between the two entries keeps the line's place, unseen and unheard for
              core, so the header never changes height and the stage never moves (the 0px check). */}
          {(headless || (entry.implementations?.length ?? 0) > 1) && (
            <p className="pg-head__peer" style={headless ? undefined : { visibility: 'hidden' }} aria-hidden={headless ? undefined : true}>
              <span>{installFor('@omkarux/vela/headless').note?.replace(/, and npm.*$/, '')}. Install it too:</span>
              <code id={peerId} className={headless ? 'pg-install-command' : undefined}>{installFor('@omkarux/vela/headless').command}</code>
              <CopyMark what="install command" text={install.command} shownId={peerId} />
            </p>
          )}
          <p className="pg-head__links">
            <a href={`https://github.com/omkarpkh/vela/blob/main/guidelines/components/${entry.file}`} target="_blank" rel="noreferrer">Spec<Icon name="external-link" size="small" /></a>
            <a href={`https://github.com/omkarpkh/vela/blob/main/${sourcePath}`} target="_blank" rel="noreferrer">Source<Icon name="external-link" size="small" /></a>
            {figmaUrl && <a href={figmaUrl} target="_blank" rel="noreferrer">Figma<Icon name="external-link" size="small" /></a>}
          </p>
        </div>
      </header>
      </Announcer>

      <div className="pg-tabs">
        <Tabs size={narrowTabs ? 'regular' : 'large'} value={current} onValueChange={(t) => { setLock(null); goTo(t as 'playground' | PageTab) }}>
          <Tabs.List aria-label={`${entry.name} page`}>
            {tabs.map((t) => <Tabs.Trigger key={t.value} value={t.value} count={t.count}>{t.label}</Tabs.Trigger>)}
          </Tabs.List>

          <Tabs.Panel value="playground">
            <div className={cn('pg', stage === 'full' && 'pg--full', (typing || expanded) && 'is-unpinned')} data-arrive="1">
              <div className="pg-main">
                <div className="pg-toolbar">
                  <span className="pg-toolbar__group"><span className="pg-toolbar__label" aria-hidden="true">Stage</span>
                  <Segments label="Stage" value={stage} options={STAGE_OPTIONS} onChange={(st) => { setStage(st); setAnnounce(`Stage updated: ${st === 'full' ? 'full width' : 'beside the controls'}`) }} />
                  </span>
                  <span className="pg-toolbar__group"><span className="pg-toolbar__label" aria-hidden="true">Compare</span>
                  <Segments label="Compare" value={compare} options={COMPARE_OPTIONS} onChange={(cmp) => { setCompare(cmp); setAnnounce(`Stage updated: ${cmp === 'themes' ? 'light and dark side by side' : 'one theme, the page\'s'}`) }} />
                  </span>
                  {entry.containerResponsive && avail !== null && (
                    <StageWidth min={wMin} max={wMax} width={frameWidth} onChange={setWidth} phone={phone} />
                  )}
                  <div className="pg-toolbar__spacer" />
                  <Toggle label="Reduced motion" size="tiny" checked={reduced} onChange={setReduced} />
                  <span className="pg-reset">
                    <Button size="tiny" appearance="hollow" disabled={!dirty} onClick={resetAll}>Reset</Button>
                    {!dirty && <span className="pg-reset__why">Nothing to reset</span>}
                  </span>
                </div>
                {entry.widthNote?.(v) && <p className="pg-width__note">{entry.widthNote(v)}</p>}
                {/* A landmark of its own (spec section 13): header, nav, main, Stage, Controls and Code. */}
                <section aria-label="Stage" className="pg-stage-region">
                <button type="button" className="pg-expand vela-meta" aria-expanded={expanded} onClick={() => setExpanded((x) => !x)}>
                  Expand stage
                </button>
                <StageBoundary
                  key={`${entry.id}|${stage}|${compare}|${JSON.stringify(v)}|${attempt}`}
                  component={entry.id}
                  settings={closedSettings}
                  onReset={() => { setValues(initial); setAttempt((n) => n + 1) }}
                >
                  <ScrollRegion label="Stage, scrollable" className={cn('pg-stage', frames.length === 1 && 'pg-stage--single', entry.containerResponsive && 'pg-stage--responsive', reduced && 'pg-reduced')}>
                    {frames.map((m, i) => (
                      <div key={m} ref={i === 0 ? frameRef : undefined} className="vela-root pg-frame" data-theme={m}>
                        <span className="pg-frame-label vela-meta">
                          {m}{compare === 'off' ? ' · follows the page theme' : ''}{stage === 'full' ? ' · Full width' : ''}
                        </span>
                        {entry.containerResponsive ? (
                          // Only the frame moves (section 5): a hairline at its edge, its width beside it.
                          <div className={cn('pg-frame-body pg-frame-body--sized', frameWidth !== undefined && 'is-narrowed')} style={frameWidth !== undefined ? { width: frameWidth } : undefined}>
                            <Rendered entry={entry} v={v} />
                            {frameWidth !== undefined && <span className="pg-width__mark vela-meta" aria-hidden="true">{frameWidth}px</span>}
                            {!phone && avail !== null && <WidthHandle width={frameWidth ?? wMax} min={wMin} max={wMax} onChange={setWidth} />}
                          </div>
                        ) : <div className="pg-frame-body"><Rendered entry={entry} v={v} /></div>}
                      </div>
                    ))}
                  </ScrollRegion>
                </StageBoundary>
                </section>
                <p className="vela-sr-only" role="status">{announce}</p>
                {stage === 'beside' && (
                  <CodeBar id={codeId} snippet={snippet} changedProps={changedProps} settle={settle}>
                    <p className="pg-p">Defaults from the Props table are omitted, exactly as the spec's own example writes them. A marked line carries a prop you changed.</p>
                  </CodeBar>
                )}
              </div>

              <aside
                className="pg-panel pg-props"
                aria-label="Controls"
                onFocus={(e) => setTyping(isTextControl(e.target))}
                onBlur={(e) => { if (!isTextControl(e.relatedTarget)) setTyping(false) }}
              >
                {/* D4: about one Tab stop per value, so the first thing here skips past them all. */}
                <a
                  className="pg-skip vela-sr-only"
                  href={`#${codeId}`}
                  onClick={(e) => { e.preventDefault(); document.getElementById(codeId)?.focus() }}
                >
                  Skip to code
                </a>
                <div className="pg-props__head">
                  <h2 className="vela-h4">Controls</h2>
                  <p className="pg-props__lead">Every value the spec allows</p>
                </div>
                {link.notices.length > 0 && (
                  <div className="pg-notice">
                    {link.notices.map((n) => <p key={n}>{n}</p>)}
                  </div>
                )}
                <div className="pg-controls">
                  {/* Two entry points, one spec: the choice the header's import line follows. */}
                  {entry.implementations && entry.implementations.length > 1 && (
                    <div className="pg-control">
                      <div className="pg-field" data-prop="implementation">
                        <span className="pg-field__label">Built with</span>
                        <Segments
                          label="Implementation"
                          value={impl?.id ?? entry.implementations[0].id}
                          options={entry.implementations.map((i) => ({ value: i.id, label: i.id }))}
                          onChange={(id) => setValues((s) => ({ ...s, implementation: id }))}
                        />
                      </div>
                    </div>
                  )}
                  {[...selects, ...texts, ...booleans].map((c) => (
                    <div key={c.prop} className="pg-control">
                      <ControlField
                        c={c}
                        value={v[c.prop]}
                        changed={v[c.prop] !== initial[c.prop]}
                        locks={locks[c.prop] ?? {}}
                        onChange={(val) => set({ [c.prop]: val })}
                        onLockedPress={(value) => {
                          lockOpener.current = document.activeElement as HTMLElement | null
                          setLock({ prop: c.prop, value, lock: locks[c.prop][value] })
                        }}
                      />
                      {lock && lock.prop === c.prop && (
                        <LockPanel
                          open={lock}
                          component={entry.id}
                          levelOf={levelOf}
                          onMove={(patch) => {
                            set(patch)
                            // Focus goes to the value the move chose, now current.
                            requestAnimationFrame(() => document.querySelector<HTMLElement>(`.pg-control [data-prop="${c.prop}"] [aria-current="true"]`)?.focus())
                          }}
                          onClose={() => { setLock(null); lockOpener.current?.focus() }}
                          onOpenProof={(rule) => { setLock(null); setTargetRule(rule); replaceRoute({ kind: 'component', id: entry.id, tab: 'rules' }) }}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <AlsoInTheApi rows={uncontrolled} explain={entry.explain} />
              </aside>
              {stage === 'full' && (
                <CodeBar id={codeId} snippet={snippet} changedProps={changedProps} settle={settle}>
                  <p className="pg-p">Defaults from the Props table are omitted, exactly as the spec's own example writes them. A marked line carries a prop you changed.</p>
                </CodeBar>
              )}
            </div>
            {next('playground')}
          </Tabs.Panel>

          {tabs.some((t) => t.value === 'rules') && (
            <Tabs.Panel value="rules">
              {current === 'rules' && (
                <RulesTab
                  name={entry.name}
                  rules={specRules}
                  sections={ruleSections}
                  proofs={proofs}
                  commit={COMMIT}
                  target={targetRule}
                  onTargetDone={targetDone}
                  onSearchAll={searchFor}
                  specHref={`https://github.com/omkarpkh/vela/blob/main/guidelines/components/${entry.file}`}
                />
              )}
              {next('rules')}
            </Tabs.Panel>
          )}

          {spec.tokens.length > 0 && (
            <Tabs.Panel value="tokens">
              {current === 'tokens' && (
                <TokensTab
                  name={entry.name}
                  spec={spec}
                  tokens={spec.tokens}
                  inCode={inCode}
                  variants={variants}
                  startKey={entry.bindingKey?.(v)}
                  values={v}
                  render={entry.render}
                  code={(x) => entry.code(x, spec)}
                  isBound={boundFor}
                  pageTheme={pageTheme}
                />
              )}
              {next('tokens')}
            </Tabs.Panel>
          )}

          {figmaEntry && (
            <Tabs.Panel value="figma">
              {current === 'figma' && (
                <FigmaTab
                  name={entry.name}
                  entry={figmaEntry}
                  controls={controls}
                  initial={initial}
                  values={v}
                  render={entry.render}
                  code={(x) => entry.code(x, spec)}
                  locks={entry.locks}
                  mapping={figma?.body}
                  onlyInCode={spec.props.filter((p) => !entry.hide?.includes(p.prop) && !figmaEntry.figmaToProp.some((r) => r.prop.trim().split(/[\s,]/)[0] === p.prop))}
                  picture={!entry.noSetPicture}
                  issueHref={`https://github.com/omkarpkh/vela/issues/new?title=${encodeURIComponent(`Figma set for ${entry.name}`)}`}
                  onValues={setFigmaValues}
                />
              )}
              {next('figma')}
            </Tabs.Panel>
          )}
        </Tabs>
      </div>
    </>
  )
}
