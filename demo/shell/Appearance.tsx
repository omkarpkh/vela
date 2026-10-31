/**
 * Appearance: a shell part of the Vela site, not a kit component, never exported from the package.
 * Spec: the playground spec, section 3 (the header button) and section 9 (the panel). Slice 5.
 *
 * - The header button shows an icon and the word "Appearance"; on a phone, the icon alone. Its
 *   accessible name says the current state ("Appearance: theme Light, brand Default"), and it
 *   starts with the visible word, so it passes WCAG 2.5.3 (Label in Name).
 * - The panel is a side panel, not a dialog: nothing behind it goes inert and focus is not
 *   trapped. It follows the button in reading order, so the next Tab reaches it. Escape and the
 *   button close it; Escape puts focus back on the button.
 * - Mode: System · Light · Dark. Brand: Default, and Custom unavailable, with its reason in view,
 *   until createBrand ships. There is no second brand yet, so none is offered (B9).
 * - Only this panel sets the page's theme and brand. The workbench's Compare only splits the stage.
 */
import { useId, useRef, useState } from 'react'
import { cn } from '../../src'
import { Segments } from './Segments'
import './shell.css'

export type Theme = 'system' | 'light' | 'dark'

const MODES = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const
const CUSTOM_REASON = 'Custom is coming with createBrand.'
const BRANDS = [
  { value: 'default', label: 'Default', swatch: '--vela-btn-primary-bg' },
  { value: 'custom', label: 'Custom', locked: { reason: CUSTOM_REASON } },
] as const

const themeWord = (t: Theme) => MODES.find((m) => m.value === t)!.label

function AppearanceIcon() {
  // Half a disc: the page in two themes. Decorative; the button's name carries the meaning.
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 2a6 6 0 0 1 0 12Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function Appearance({ theme, onTheme, compact }: { theme: Theme; onTheme: (t: Theme) => void; compact: boolean }) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const id = useId()
  const close = () => { setOpen(false); button.current?.focus() }
  // The phone header names it "Appearance" (section 3); elsewhere the name carries the state too.
  const name = compact ? 'Appearance' : `Appearance: theme ${themeWord(theme)}, brand Default`
  return (
    <div className="shell-appearance">
      <button
        ref={button}
        type="button"
        className={cn('shell-appearance__button', compact && 'is-compact')}
        aria-label={name}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <AppearanceIcon />
        {!compact && <span aria-hidden="true">Appearance</span>}
      </button>
      <section
        id={id}
        className="shell-appearance__panel"
        aria-label="Appearance"
        hidden={!open}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); close() } }}
      >
        <h2 className="vela-h5 shell-appearance__title">Appearance</h2>
        <div className="shell-appearance__group">
          <span className="shell-appearance__label" aria-hidden="true">Mode</span>
          <Segments label="Mode" value={theme} options={MODES} onChange={onTheme} />
        </div>
        <div className="shell-appearance__group">
          <span className="shell-appearance__label" aria-hidden="true">Brand</span>
          <Segments label="Brand" value="default" options={BRANDS} onChange={() => {}} />
          {/* The lock glyph never appears without its reason in view (icon.md, Glyphs). */}
          <span className="shell-appearance__note">{CUSTOM_REASON}</span>
        </div>
        <p className="shell-appearance__note">Severity, risk and status colours are the same in every brand.</p>
      </section>
    </div>
  )
}
