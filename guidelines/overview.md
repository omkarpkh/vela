# Component overview

Pick the component by **what the user is doing**, not by what looks closest. Match the need
below, then open the per-component file for props, tokens, and anti-patterns.

## Catalogue

| Component | Use it for | File |
|---|---|---|
| Button | Triggering an action (save, submit, delete, apply) | `components/button.md` |
| Toggle | A binary setting that takes effect immediately | `components/toggle.md` |
| Input | Single-line text entry | `components/input.md` |
| Text Area | Multi-line text entry, with an optional live character count | `components/text-area.md` |
| Contextual Alert | Inline severity banner (success/info/warning/minor/major/critical) | `components/contextual-alert.md` |
| Status Indicator | A health dot for one of five states | `components/status-indicator.md` |
| Risk Pill | A read-only risk score (low/medium/high) on an object | `components/risk-pill.md` |
| Tabs | Navigate between different content panels | `components/tabs.md` |
| Icon | One of fifty curated glyphs beside text or in another component's icon slot — never a control, never a taxonomy mark | `components/icon.md` |
| Checkbox | Recording intent until a Save — alone, or any-of-several in a Checkbox.Group (headless entry only) | `components/checkbox.md` |
| Radio Group | Exactly one of two to five visible options, committed by a Save (headless entry only) | `components/radio-group.md` |
| Table | Records compared across named columns — sortable headers, two densities, a scroll region (Experimental) | `components/table.md` |
| Popover | A non-modal panel opened from a button — filters, detail, a short edit — with the page still usable (headless entry only) | `components/popover.md` |
| Tooltip | A short text-only label on hover and focus; supplementary, never the only copy (headless entry only) | `components/tooltip.md` |
| Dialog | A modal decision that blocks the task; `variant="alert"` confirms a destructive action (headless entry only) | `components/dialog.md` |
| Toast | A floating, polite confirmation that something already happened — never the only record, never the only Undo (headless entry only) | `components/toast.md` |

Checkbox, Radio Group, Popover, Tooltip, Dialog and Toast ship from `@omkarux/vela/headless` (Base
UI as an optional peer) and are Experimental; the other ten ship from `@omkarux/vela` with no
dependencies (Risk Pill, Icon, Text Area and Table are Experimental there).

## Disambiguations (where AI usually picks wrong)

- **Toggle vs Checkbox** — immediate effect (notifications on/off, dark mode) → **Toggle**.
  Records intent until a Save click → **Checkbox**. The test is the Save button: if one is
  needed it is a Checkbox; if the change is already live it is a Toggle.
- **Radio Group vs Select List** — two to five options the user should see side by side, one
  answer → **Radio Group**. More than five, or options known by name (a country, a tenant) →
  Select List, which is not in this kit; flag the gap rather than stacking radios. Any number of
  answers → **Checkbox.Group**.
- **Tabs vs View Switcher** — different content sections → **Tabs**. The *same* dataset
  rendered differently (Grid / Dashboard / Chart) → **View Switcher**, which is not in this
  kit. If only the presentation of one dataset changes, do not reach for Tabs.
- **Popover vs Tooltip vs Dialog** — the user opens a panel on purpose and may act in it while
  the page stays usable → **Popover**. A short text-only hint on hover or focus about a control
  that does something else → **Tooltip** (an ⓘ infotip is a Popover: its trigger's purpose is
  opening it). A decision that must be answered before anything else → **Dialog**; a destructive
  or irreversible one → **Dialog `variant="alert"`**. A list of commands from a button is an
  Actions Dropdown, not in this kit — not a Popover.
- **Toast vs Contextual Alert vs Dialog** — something the user just did **has completed** and the
  page already shows it → **Toast** (`success`, `info` or `warning` only), a notice that leaves.
  An event the user must read and that stays until resolved, or **any failure** → **Contextual
  Alert** in the page, next to its subject. A question → **Dialog**. A toast is never the only
  record of what it says and never the only place an Undo lives: the Undo is on the page, and the
  toast's action is a shortcut to it.
- **Contextual Alert vs Status Indicator vs Risk Pill** — an event the user must read →
  **Alert**. An object's ongoing health, usually in a table cell → **Status Indicator**. A
  risk *score* on an object → **Risk Pill**. A removable filter chip → Token Pill, not in this kit.
- **Table vs Data Grid vs a list** — records read and compared across columns → **Table**.
  Cells edited or navigated with the arrow keys like a spreadsheet → Data Grid, not in this kit.
  One record's fields → a description list. Cards below a width → a card list, not in this kit;
  never restyle a table into cards. Status and risk go **in cells**, as Status Indicator and Risk
  Pill — never as a colour on the row.
- **Input vs Text Area** — one line (a name, a hostname, a CIDR) → **Input**. Free text that
  runs past a line (a justification, an incident note) → **Text Area**. Neither is a code
  editor; syntax-highlighted entry is not in this kit.
- **Severity vs Risk vs Status** — three taxonomies, never interchangeable.
  Severity (6 levels) describes *events* and is Contextual Alert's. Risk (3 levels) describes
  *scoring* and is Risk Pill's. Status (5 states) is the Status Indicator dot only. There is no
  "high severity" and no "critical risk".
- **Icon vs Contextual Alert vs Icon Button** — a glyph that reinforces text, or labels a cell
  → **Icon**. The mark of an event the user must read → **Contextual Alert**, which owns the
  severity marks (an Icon has no severity tone). A glyph you click (close, copy, more) → **Icon
  Button**, which is not in this kit; flag the gap. A glyph that is not in `ICON_NAMES` does not
  exist: name the closest curated one and flag it, never import another icon library.

## If no component fits

Do not invent one silently. State that the kit has no component for the need and pick the
closest match while flagging the gap. Not yet specced: Dropdown List, Select List, Token Pill,
Number Stepper, Icon Button, Actions Dropdown, View Switcher, Data Grid, Card List.
Flag rather than guess.

## How each component file is structured

Intent → When to use → Props (closed sets) → Hard constraints → Token bindings → Sizes →
Typography → States → Accessibility → Anti-patterns. Read the Anti-patterns block.

## Cross-cutting rules

- **Bind semantic tokens**, never primitives or hex.
- **Numeric tokens carry their unit** — use directly, never `calc(... * 1px)`.
- **Closed prop sets** — never add variants, sizes or appearances beyond the Props table.
- **Both themes are real.** Never hardcode a colour that only works in light mode.
- **Colour is never the only signal** (WCAG 1.4.1) — always pair it with text or an icon.
