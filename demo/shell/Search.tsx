/**
 * Search: a shell part of the Vela site, not a kit component, never exported from the package.
 *
 * Stands in for: a command palette, which needs Combobox (ROADMAP.md, Phase 1). Not in the kit, so
 * flagged rather than invented. Spec: the playground spec, sections 3 (the header button) and 10.
 *
 * - Opened by the header button, ⌘K or Ctrl K anywhere, or `/` when focus is not in a text field.
 * - A modal dialog (the native <dialog>: Escape closes it, the page behind is inert) holding a
 *   combobox input and a listbox of results. Up and Down move, Enter opens, Escape closes and puts
 *   focus back on the button that opened it.
 * - Each result: its title, its lifecycle tag in words, "also called: …" when an alias matched, and
 *   one line that tells it apart from its neighbours.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { cn } from '../../src'
import { buildIndex, search, MISSING, type Hit } from '../playground/search'
import { REGISTRY } from '../playground/registry'
import './shell.css'

const MISSING_STANDS: Record<string, string> = Object.fromEntries(MISSING.map((m) => [m.id, m.stands]))
const CLOSEST: Record<string, string> = Object.fromEntries(MISSING.map((m) => [m.id, REGISTRY.find((e) => e.id === m.closest)?.name ?? m.closest]))

const isApple = () => /mac|iphone|ipad|ipod/i.test((navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? '')

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5 14 14" strokeLinecap="round" />
    </svg>
  )
}

const inTextField = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))

export function Search({ compact }: { compact: boolean }) {
  const index = useMemo(buildIndex, [])
  const dialog = useRef<HTMLDialogElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  // Decided once at load, as the spec says; both shortcuts work everywhere.
  const [key] = useState(() => (isApple() ? '⌘K' : 'Ctrl K'))
  const id = useId()
  const hits: Hit[] = useMemo(() => search(index, query), [index, query])

  const open = () => {
    const d = dialog.current
    if (!d || d.open) return
    setQuery('')
    setActive(0)
    d.showModal()
    input.current?.focus()
  }
  const close = () => dialog.current?.close()
  const go = (h: Hit | undefined) => {
    if (!h) return
    close()
    window.location.hash = h.item.href
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); open() }
      else if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !inTextField(e.target) && !dialog.current?.open) { e.preventDefault(); open() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => setActive(0), [query])
  useEffect(() => { document.getElementById(`${id}-opt-${active}`)?.scrollIntoView({ block: 'nearest' }) }, [active, id])

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (hits.length ? (a + 1) % hits.length : 0)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (hits.length ? (a - 1 + hits.length) % hits.length : 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); go(hits[active]) }
  }

  const label = compact ? 'Search' : 'Search components, foundations and rules'
  const q = query.trim()

  return (
    <>
      <button ref={button} type="button" className={cn('shell-search-button', compact && 'is-compact')} aria-label={label} onClick={open}>
        <SearchIcon />
        {!compact && <span className="shell-search-button__text">Search, or type a name you know</span>}
        {!compact && <kbd className="shell-kbd" aria-hidden="true">{key}</kbd>}
      </button>
      <dialog
        ref={dialog}
        className="shell-search"
        aria-label="Search"
        // Escape and a click on the backdrop close it; focus goes back to the button either way.
        onClose={() => button.current?.focus()}
        onClick={(e) => { if (e.target === dialog.current) close() }}
      >
        <div className="shell-search__field">
          <SearchIcon />
          <input
            ref={input}
            className="shell-search__input"
            type="text"
            role="combobox"
            aria-label="Search"
            aria-expanded={hits.length > 0}
            aria-controls={`${id}-list`}
            aria-autocomplete="list"
            aria-activedescendant={hits.length ? `${id}-opt-${active}` : undefined}
            autoComplete="off"
            spellCheck={false}
            placeholder="A name, an alias such as “modal”, or a rule id"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
          />
          <span className="shell-search__count" aria-live="polite">{q ? `${hits.length} ${hits.length === 1 ? 'result' : 'results'}` : ''}</span>
        </div>
        <ul id={`${id}-list`} role="listbox" aria-label="Results" className="shell-search__list" hidden={hits.length === 0}>
          {hits.map((h, i) => (
            <li
              key={`${h.item.kind}-${h.item.id}`}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              className="shell-search__option"
              onMouseMove={() => setActive(i)}
              onClick={() => go(h)}
            >
              <span className="shell-search__title">
                {h.item.title}
                {h.item.tag && <span className="site-tag">{h.item.tag}</span>}
                {h.alias && <span className="shell-search__alias">also called: {h.alias}</span>}
              </span>
              <span className="shell-search__sign">
                {h.item.kind === 'missing' ? `${h.item.title} isn't in Vela yet. It's ${MISSING_STANDS[h.item.id]}. ${h.item.sign} Closest today: ${CLOSEST[h.item.id]}.` : h.item.sign}
              </span>
            </li>
          ))}
        </ul>
        {q && hits.length === 0 && (
          <div className="shell-search__empty">
            <p><strong>Nothing matches “{q}”.</strong></p>
            <p>Search covers component names, aliases and rule ids.</p>
            <p><a href="#/status" onClick={close}>Browse all components</a></p>
          </div>
        )}
        <div className="shell-search__foot">
          <span><kbd className="shell-kbd">↑</kbd> <kbd className="shell-kbd">↓</kbd> to move</span>
          <span><kbd className="shell-kbd">Enter</kbd> to open</span>
          <span><kbd className="shell-kbd">Esc</kbd> to close</span>
        </div>
      </dialog>
    </>
  )
}
