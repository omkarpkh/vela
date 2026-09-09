# Component overview

Pick the component by **what the user is doing**, not by what looks closest. Match the need
below, then open the per-component file for props, tokens, and anti-patterns.

## Catalogue

| Component | Use it for | File |
|---|---|---|
| Button | Triggering an action (save, submit, delete, apply) | `components/button.md` |
| Toggle | A binary setting that takes effect immediately | `components/toggle.md` |
| Input | Single-line text entry | `components/input.md` |
| Contextual Alert | Inline severity banner (success/info/warning/minor/major/critical) | `components/contextual-alert.md` |
| Status Indicator | A health dot for one of five states | `components/status-indicator.md` |
| Tabs | Navigate between different content panels | `components/tabs.md` |

## Disambiguations (where AI usually picks wrong)

- **Toggle vs Checkbox** — immediate effect (notifications on/off, dark mode) → **Toggle**.
  Records intent until a Save click → **Checkbox**. Checkbox is not in this kit; flag the gap.
- **Tabs vs View Switcher** — different content sections → **Tabs**. The *same* dataset
  rendered differently (Grid / Dashboard / Chart) → **View Switcher**, which is not in this
  kit. If only the presentation of one dataset changes, do not reach for Tabs.
- **Contextual Alert vs Status Indicator** — an event the user must read → **Alert**.
  An object's ongoing health, usually in a table cell → **Status Indicator**.
- **Severity vs Risk vs Status** — three taxonomies, never interchangeable.
  Severity (6 levels) describes *events*. Risk (3 levels) describes *scoring*. Status
  (5 states) is the dot only. There is no "high severity" and no "critical risk".

## If no component fits

Do not invent one silently. State that the kit has no component for the need and pick the
closest match while flagging the gap. Not yet specced: Checkbox, Radio, Dropdown List,
Select List, Token Pill, Number Stepper, Text Area, Modal, Tooltip, Icon Button,
Actions Dropdown, View Switcher. Flag rather than guess.

## How each component file is structured

Intent → When to use → Props (closed sets) → Hard constraints → Token bindings → Sizes →
Typography → States → Accessibility → Anti-patterns. Read the Anti-patterns block.

## Cross-cutting rules

- **Bind semantic tokens**, never primitives or hex.
- **Numeric tokens carry their unit** — use directly, never `calc(... * 1px)`.
- **Closed prop sets** — never add variants, sizes or appearances beyond the Props table.
- **Both themes are real.** Never hardcode a colour that only works in light mode.
- **Colour is never the only signal** (WCAG 1.4.1) — always pair it with text or an icon.
