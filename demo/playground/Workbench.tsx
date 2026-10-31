/**
 * The workbench's controls, lock panel and code bar (playground spec, section 5; slice 2).
 *
 * - Closed props with up to six values are segments (D4): Tab reaches each, Enter or Space chooses,
 *   arrows do nothing, the current one carries aria-current.
 * - A value the spec's rules forbid with the current settings is locked (A13; Omkar's decision of
 *   30 Oct): reachable, aria-disabled, its reason read with it. Pressing it opens the lock panel:
 *   the rule in words, its id and enforcement, a link to its proof, and the legal moves.
 * - Above six values, a native select of the legal values only, with a line naming what is locked
 *   (A24), until Select List exists.
 * - A control and its code line carry a change mark while they differ from the page's defaults.
 */
import { Fragment, useEffect, useId, useRef, type ReactNode } from 'react'
import { Button, Input, Toggle, cn } from '../../src'
import type { Control, PropRow } from './spec'
import type { Lock, Values } from './registry'
import { Segments } from '../shell/Segments'
import { ScrollRegion } from '../shell/ScrollRegion'
import { CopyButton, CopyStatus, useCopy } from '../shell/Copy'
import { Markdown } from './Markdown'
import { LEVELS } from './facts'

export const SEGMENT_MAX = 6

export interface OpenLock { prop: string; value: string; lock: Lock }

/** One control. `locks` are this prop's locked values, by value. */
export function ControlField({ c, value, changed, locks, onChange, onLockedPress }: {
  c: Control
  value: Values[string]
  changed: boolean
  locks: Record<string, Lock>
  onChange: (v: string | boolean) => void
  onLockedPress: (value: string) => void
}) {
  const labelId = useId()
  if (c.kind === 'select' && c.options!.length <= SEGMENT_MAX)
    return (
      <div className={cn('pg-field', changed && 'is-changed')} data-prop={c.prop}>
        <span className="pg-field__label" id={labelId}>{c.prop}</span>
        <Segments
          label={c.prop}
          value={String(value ?? c.default ?? '')}
          options={c.options!.map((o) => ({ value: o, label: o, locked: locks[o] ? { reason: locks[o].reason } : undefined }))}
          onChange={onChange}
          onLockedPress={onLockedPress}
        />
      </div>
    )
  if (c.kind === 'select') {
    // A24: more than six values. The legal ones only; what is locked is named below, with its rule.
    const lockedValues = c.options!.filter((o) => locks[o])
    const legal = c.options!.filter((o) => !locks[o])
    const reasons = [...new Set(lockedValues.map((o) => locks[o].reason))]
    return (
      <label className={cn('pg-field', changed && 'is-changed')} data-prop={c.prop}>
        <span className="pg-field__label">{c.prop}</span>
        <span className="pg-select-wrap">
          <select className="pg-select" value={String(value ?? c.default ?? '')} onChange={(e) => onChange(e.target.value)}>
            {legal.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </span>
        <span className="pg-field__note">
          {c.options!.length} values{lockedValues.length > 0 ? `, ${lockedValues.length} unavailable: ${lockedValues.join(', ')}. ${reasons.join(' ')}` : ''}
        </span>
      </label>
    )
  }
  if (c.kind === 'boolean') {
    // A switch whose "on" the rules forbid is disabled, with its reason beside it (DESIGN.md, States).
    const lock = locks['true']
    return (
      <div className={cn('pg-field pg-field--switch', changed && 'is-changed')} data-prop={c.prop}>
        <Toggle label={c.prop} size="tiny" checked={value === true} disabled={!!lock && value !== true} onChange={onChange} />
        {lock && value !== true && <span className="pg-field__note">{lock.reason}</span>}
      </div>
    )
  }
  return (
    <div className={cn('pg-field', changed && 'is-changed')} data-prop={c.prop}>
      <Input label={c.prop} size="tiny" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

/** The lock panel: the rule in words, its id and enforcement, the proof, and the legal moves. */
export function LockPanel({ open, component, levelOf, onMove, onClose }: {
  open: OpenLock
  component: string
  levelOf: (rule: string) => string | undefined
  onMove: (patch: Values) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLElement>(null)
  const headingId = useId()
  useEffect(() => { ref.current?.focus() }, [open.prop, open.value])
  const level = levelOf(open.lock.rule)
  const words = LEVELS.find((l) => l.level === level)?.words
  return (
    <section
      ref={ref}
      className="pg-lock"
      aria-labelledby={headingId}
      tabIndex={-1}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }}
    >
      <h3 id={headingId} className="pg-lock__heading">{open.lock.heading}</h3>
      <p className="pg-lock__reason">{open.lock.reason}</p>
      <p className="pg-lock__rule">
        <code>{open.lock.rule}</code>
        {words && <span className="site-tag">{level === 'convention' ? 'convention' : `Enforced by ${words}`}</span>}
        <a href={`#/components/${component}/rules`}>Open proof</a>
      </p>
      <div className="pg-lock__moves">
        {open.lock.moves.map((m) => (
          <Button key={m.label} size="tiny" appearance="hollow" onClick={() => onMove(m.patch)}>{m.label}</Button>
        ))}
        <Button size="tiny" appearance="hollow" onClick={onClose}>Keep it as it is</Button>
      </div>
    </section>
  )
}

/** Plain words for a prop with no control, from the spec's own Notes (or the registry's, when given). */
export function AlsoInTheApi({ rows, explain }: { rows: PropRow[]; explain?: Record<string, string> }) {
  if (rows.length === 0) return null
  return (
    <div className="pg-uncontrolled">
      <h3>Also in the API</h3>
      <p className="pg-uncontrolled__lead">Props with no control here, because they look the same whichever you pick.</p>
      <dl>
        {rows.map((p) => (
          <div key={`${p.part ?? ''}${p.prop}`} className="pg-uncontrolled__row">
            <dt><code>{p.part ? `${p.part}.` : ''}{p.prop}</code> <code className="pg-uncontrolled__type">{p.type.replace(/`/g, '')}</code></dt>
            <dd>{explain?.[p.prop] ? <Markdown source={explain[p.prop]} /> : p.notes ? <Markdown source={p.notes} /> : null}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/**
 * The code bar: the import line and the JSX, Copy for exactly that, and a change mark on each line
 * that carries a prop changed from its default. `settle` remounts the marked lines, so their tint
 * runs once per change and then settles to the mark.
 */
export function CodeBar({ id, snippet, changedProps, settle, children }: { id: string; snippet: string; changedProps: string[]; settle: number; children?: ReactNode }) {
  const codeId = `${id}-code`
  const { state, copy } = useCopy(snippet, codeId)
  const lines = snippet.split('\n')
  const marked = (line: string) => changedProps.some((p) => new RegExp(`(^|\\s)${p}(=|\\s|/?>|$)`).test(line))
  return (
    <section id={id} className="pg-panel pg-codebar" aria-labelledby={`${id}-h`} tabIndex={-1}>
      <div className="pg-codebar__head">
        <h2 id={`${id}-h`} className="pg-codebar__title">Import and usage</h2>
        <CopyButton what="snippet" onCopy={copy} />
      </div>
      <ScrollRegion as="pre" id={codeId} label="Code, scrollable" className="pg-code">
        {lines.map((l, i) => {
          const m = i > 0 && marked(l)
          return (
            <Fragment key={m ? `${i}-${settle}` : i}>
              <span className={cn('pg-code__line', m && 'is-changed')}>{l}</span>
              {i < lines.length - 1 ? '\n' : ''}
            </Fragment>
          )
        })}
      </ScrollRegion>
      <CopyStatus state={state} what="snippet" className="pg-codebar__status" />
      {children}
    </section>
  )
}
