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
 * - Slice 6 of the playground uplift: each mode shows what it looks like before it is chosen, a small
 *   page painted by the real tokens in a light or a dark subtree (System is both, split, as it follows
 *   the screen), and System says which it is now. The pictures are decorative; the words name each mode.
 */
import { useId, useRef, useState } from 'react'
import { cn } from '../../src'
import { Segments } from './Segments'
import './shell.css'

export type Theme = 'system' | 'light' | 'dark'

/** A page in miniature, drawn with the tokens of the theme it sits in: the bar, the nav, a heading, a button, a dot. */
function MiniPage() {
  return (
    <span className="shell-preview__page">
      <span className="shell-preview__bar" />
      <span className="shell-preview__body">
        <span className="shell-preview__nav" />
        <span className="shell-preview__main">
          <span className="shell-preview__line" />
          <span className="shell-preview__line shell-preview__line--short" />
          <span className="shell-preview__row"><span className="shell-preview__button" /><span className="shell-preview__dot" /></span>
        </span>
      </span>
    </span>
  )
}
const Preview = ({ theme }: { theme: 'light' | 'dark' | 'system' }) => (
  <span className={cn('shell-preview', theme === 'system' && 'shell-preview--split')}>
    {theme === 'system'
      ? <><span data-theme="light" className="shell-preview__half"><MiniPage /></span><span data-theme="dark" className="shell-preview__half"><MiniPage /></span></>
      : <span data-theme={theme} className="shell-preview__whole"><MiniPage /></span>}
  </span>
)

const MODES = [
  { value: 'system', label: 'System', picture: <Preview theme="system" /> },
  { value: 'light', label: 'Light', picture: <Preview theme="light" /> },
  { value: 'dark', label: 'Dark', picture: <Preview theme="dark" /> },
] as const
const CUSTOM_REASON = 'Custom is coming with createBrand.'
const BRANDS = [
  { value: 'default', label: 'Default', swatch: '--vela-btn-primary-bg' },
  { value: 'custom', label: 'Custom', locked: { reason: CUSTOM_REASON, describedBy: 'appearance-custom-reason' } },
] as const

const systemDark = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches

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
          {theme === 'system' && <span className="shell-appearance__note">System follows your screen. It is {systemDark() ? 'dark' : 'light'} now.</span>}
        </div>
        <div className="shell-appearance__group">
          <span className="shell-appearance__label" aria-hidden="true">Brand</span>
          <Segments label="Brand" value="default" options={BRANDS} onChange={() => {}} />
          {/* The lock glyph never appears without its reason in view (icon.md, Glyphs). */}
          <span id="appearance-custom-reason" className="shell-appearance__note">{CUSTOM_REASON}</span>
        </div>
        <p className="shell-appearance__note">Severity, risk and status colours are the same in every brand.</p>
      </section>
    </div>
  )
}
