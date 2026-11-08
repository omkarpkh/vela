/**
 * Search: a shell part of the Vela site, not a kit component, never exported from the package.
 *
 * Stands in for: a command palette, which needs Combobox (ROADMAP.md, Phase 1). Not in the kit, so
 * flagged rather than invented. Spec: the playground spec, sections 3 (the header button) and 10.
 *
 * - Opened by the header button, ⌘K or Ctrl K anywhere, or `/` when focus is not in a text field.
 * - The button's name is its visible words; the shortcut is announced through aria-keyshortcuts.
 * - Slice 7 (item 2b; Omkar, 8 Nov 2026): the button sizes itself by its own slot in the header, a
 *   container query, never by the window. The full hint when it fits; "Search" and the shortcut when
 *   it doesn't; Vela's Icon Button alone, named "Search", when the slot is tight and on a phone. The
 *   words never wrap. "Or type a name you know" is said again in the dialog's own field.
 * - A modal dialog (the native <dialog>: Escape closes it, the page behind is inert) holding a
 *   combobox input and a listbox of results. Up and Down move, Enter opens, Escape closes and puts
 *   focus back on the button that opened it.
 * - Each result: its title, its lifecycle tag in words, "also called: …" when an alias matched, and
 *   one line that tells it apart from its neighbours.
 * - Slice 6 of the playground uplift: each result has a mark for its kind, a glyph from the kit's Icon
 *   set over the kind's word (Component, Rule, Proposal, Foundation, Contract, Not in Vela), so the
 *   kind is told by shape and by word, never by colour. A rule is titled in plain words, with its id
 *   under it in code, where it is still found and copied from. A tag that says only the kind again is
 *   not shown twice.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Icon, type IconName } from '../../src'
import { IconButton } from '../../src/headless'
import { buildIndex, search, MISSING, KIND_WORDS, type Hit, type Item, type Kind } from '../playground/search'
import { CATALOG as REGISTRY } from '../playground/catalog'
import './shell.css'

const MISSING_STANDS: Record<string, string> = Object.fromEntries(MISSING.map((m) => [m.id, m.stands]))
const CLOSEST: Record<string, string> = Object.fromEntries(MISSING.map((m) => [m.id, REGISTRY.find((e) => e.id === m.closest)?.name ?? m.closest]))

const KIND_GLYPH: Record<Kind, IconName> = { component: 'shield-check', missing: 'circle-slash', proposal: 'pencil', foundation: 'settings', rule: 'check' }
/** The kind's word: a foundation that is a contract says Contract. */
export const kindWord = (i: Item) => (i.kind === 'foundation' && i.tag === 'Contract' ? 'Contract' : KIND_WORDS[i.kind])

const isApple = () => /mac|iphone|ipad|ipod/i.test((navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? '')

/** The search glyph in the header's field-like button and in the dialog's field. */
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5 14 14" strokeLinecap="round" />
    </svg>
  )
}

const SEARCH_EVENT = 'vela:search'
/** Opens the site's Search with these words already typed. */
export const searchFor = (words: string) => window.dispatchEvent(new CustomEvent(SEARCH_EVENT, { detail: words }))

const inTextField = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))

/** The keys that open Search, announced on each of its header buttons. */
const SHORTCUTS = 'Control+K Meta+K /'

export function Search() {
  const index = useMemo(buildIndex, [])
  const dialog = useRef<HTMLDialogElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const iconButton = useRef<HTMLButtonElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  // Decided once at load, as the spec says; both shortcuts work everywhere.
  const [key] = useState(() => (isApple() ? '⌘K' : 'Ctrl K'))
  const id = useId()
  const hits: Hit[] = useMemo(() => search(index, query), [index, query])

  const open = (words = '') => {
    const d = dialog.current
    if (!d || d.open) return
    setQuery(words)
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
    // A page may open Search on words of its own ("Search all of Vela for …"): see searchFor.
    const onAsk = (e: Event) => open(typeof (e as CustomEvent).detail === 'string' ? (e as CustomEvent<string>).detail : '')
    window.addEventListener(SEARCH_EVENT, onAsk)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener(SEARCH_EVENT, onAsk) }
  }, [])

  useEffect(() => setActive(0), [query])
  useEffect(() => { document.getElementById(`${id}-opt-${active}`)?.scrollIntoView({ block: 'nearest' }) }, [active, id])

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (hits.length ? (a + 1) % hits.length : 0)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (hits.length ? (a - 1 + hits.length) % hits.length : 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); go(hits[active]) }
  }

  const q = query.trim()

  // The header button on screen: the worded one or the Icon Button, whichever the slot shows.
  const shown = () => [button.current, iconButton.current].find((b) => b && b.offsetParent !== null) ?? button.current

  return (
    <div className="shell-search-slot">
      {/* WCAG 2.5.3, Label in Name: the name is the visible words, so a voice-control user can say
          what they see (playground spec v1.2, section 3). The shortcut is aria-keyshortcuts, never
          part of the name. The second half of the hint is not drawn when the slot is narrower, and
          is not read then either, so the name is always the words on screen. */}
      <button
        ref={button}
        type="button"
        className="shell-search-button"
        aria-keyshortcuts={SHORTCUTS}
        onClick={() => open()}
      >
        <SearchIcon />
        <span className="shell-search-button__text">Search<span className="shell-search-button__more">, or type a name you know</span></span>
        <kbd className="shell-kbd" aria-hidden="true">{key}</kbd>
      </button>
      {/* Tight, and on a phone: Vela's Icon Button, as the GitHub, npm and Figma marks are (item 7). */}
      <IconButton ref={iconButton} className="shell-search-icon" label="Search" icon="search" aria-keyshortcuts={SHORTCUTS} tooltipPlacement="bottom" onClick={() => open()} />
      <dialog
        ref={dialog}
        className="shell-search"
        aria-label="Search"
        // Escape and a click on the backdrop close it; focus goes back to the button either way.
        onClose={() => shown()?.focus()}
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
            placeholder="Type a name you know, an alias such as “modal”, or a rule id"
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
              <span className="shell-search__kind" data-kind={h.item.kind}>
                <Icon name={KIND_GLYPH[h.item.kind]} />
                <span className="shell-search__kindword">{kindWord(h.item)}</span>
              </span>
              <span className="shell-search__text">
                <span className="shell-search__title">
                  {h.item.title}
                  {h.item.tag && h.item.tag !== kindWord(h.item) && <span className="site-tag">{h.item.tag}</span>}
                  {h.alias && <span className="shell-search__alias">also called: {h.alias}</span>}
                </span>
                {h.item.ruleId && <code className="shell-search__id">{h.item.ruleId}</code>}
                <span className="shell-search__sign">
                  {h.item.kind === 'missing' ? `${h.item.title} isn't in Vela yet. It's ${MISSING_STANDS[h.item.id]}. ${h.item.sign} Closest today: ${CLOSEST[h.item.id]}.` : h.item.sign}
                </span>
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
    </div>
  )
}
