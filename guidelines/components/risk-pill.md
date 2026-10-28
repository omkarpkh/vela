# Risk Pill

A small read-only pill carrying one of exactly three risk levels, usually in a table cell or
next to the thing that was scored — a user, an asset, a finding.

## When to use Risk Pill

- A risk **score** on an object → **Risk Pill**.
- An event the user must read → **Contextual Alert** (that is severity, six levels).
- An object's ongoing health → **Status Indicator** (that is status, five states).
- A removable filter chip or tag → a Token Pill, **not in this kit**. Flag the gap.

## Props

```tsx
<RiskPill risk="high" label="High · 87" />
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `risk` | `"low" \| "medium" \| "high"` | — | **Required. These three only.** |
| `label` | `string` | — | Visible text. Omitted, the pill renders the level word (`"Low"` / `"Medium"` / `"High"`). A custom label must still name the level. |
| `size` | `"regular" \| "small"` | `"regular"` | **These two only.** |

## Hard constraints

- **Three levels.** Not severity's six, not status's five. There is no `"critical"` risk and
  no `"unhealthy"` risk, and `risk` is required — the compiler rejects an invented level, a
  severity used as a risk, and a pill with no level. [[rule: risk-closed-set | compiler]]
- **Two sizes.** `regular` and `small`. There is no `"large"` and no `"tiny"`. [[rule: risk-pill-sizes-closed | compiler]]
- **Never colour-only.** With no `label` the pill renders the level word, so it is never an
  empty coloured box. A custom `label` replaces the word and must still name the level —
  `"High · 87"`, never a bare `"87"`. [[rule: risk-never-colour-only | runtime]]
- **A pill is a label, not a control.** It renders a `<span>`: no hover, no focus, no click
  handler. Filtering by risk is another component's job. [[rule: risk-pill-is-not-interactive | runtime]]
- **`medium` risk is not `medium` status.** The same word sits in two taxonomies: here it is
  the middle of a three-point score; on Status Indicator it means degraded. Never derive one
  from the other. [[rule: risk-medium-is-a-score | convention]]

## Token bindings

Every level binds its own row of the **risk** taxonomy and nothing else: `--vela-bg-risk-*`,
`--vela-text-risk-*`, `--vela-border-risk-*`. Never a severity background, never a status fill.

| risk | Background | Text | Border |
|---|---|---|---|
| low | `--vela-bg-risk-low` | `--vela-text-risk-low` | `--vela-border-risk-low` |
| medium | `--vela-bg-risk-medium` | `--vela-text-risk-medium` | `--vela-border-risk-medium` |
| high | `--vela-bg-risk-high` | `--vela-text-risk-high` | `--vela-border-risk-high` |

Radius is `--vela-radius-3` — the inline-chip scope in `foundations/radius.md`. Despite the
name, a Risk Pill is **not** `--vela-radius-full`; that token belongs to the Status Indicator
dot and the Toggle track only.

The text pair (`--vela-text-risk-*` on `--vela-bg-risk-*`) is asserted at 4.5:1 in both themes
in `PAIRS`. The border is decorative — the text carries the meaning — and is not asserted.

## Sizes

| size | Height | H-padding | Font |
|---|---|---|---|
| regular | `--vela-control-height-24` | `--vela-space-10` | Meta 12/18 |
| small | hugs the text: `--vela-text-meta-line-height` plus the 1px border | `--vela-space-5` | Meta 12/18 |

`regular` shares Button `tiny`'s height on purpose, so a pill and a tiny button sit level in a
toolbar or a table row. Label weight is **Regular 400**; the colour pair carries the emphasis.

## States

None. A Risk Pill has no hover, no focus, no pressed and no disabled state — a label that
cannot be acted on must not pretend to react. If it changes level, the colour row re-points;
nothing animates.

## Responsive behaviour

A Risk Pill is inline text and behaves like it. It has no minimum width of its own: in a narrow
table cell or a host-given widget width it **wraps with its label** — pill and label move to the
next line as one unit (`white-space: nowrap` keeps the label from breaking inside the pill), the
way a word wraps — and it **never truncates**: an ellipsis would hide the level word, which is
the signal.
At both densities (comfortable and compact) it keeps its minimum height: `regular` stays
`--vela-control-height-24`, `small` stays its line-height plus the border. Density tokens do not
exist yet (see `DESIGN.md`, *Responsive and density*); until they do, nothing here changes
between densities.

## Accessibility

- The visible text is the accessible name. There is no `aria-label`, no `role`: a pill is text.
- Colour is never the only signal: the level word (or a label that names it) is always rendered.
- Both themes are real: every token in the row re-points in dark mode.

## Figma mapping

Library file: **Vela Design System** → page `Risk Pill`. Six variants: `Risk` (3) x `Size` (2),
plus a `Label text` text property. The set is created by
`scripts/figma/components/risk-pill.figma.js`; until that builder has been run in the file,
the library has no Risk Pill set.

| Figma property | Code prop |
|---|---|
| `Risk` | `risk` |
| `Size` | `size` |
| `Label text` | `label` — the Figma default is the level word, as in code |

**Every fill, stroke and text binds that level's own `risk/<level>/*` variable; the height of the
regular size binds `control-height/24` and the small size hugs its text.** Nothing in this
component is literal: no raw size, no raw colour, no raw radius.

## Anti-patterns

- ❌ `risk="critical"` → that is severity (will not compile).
- ❌ `risk="unhealthy"` → that is status (will not compile).
- ❌ Binding `--vela-bg-severity-*` or `--vela-signal-status-*` to the pill → wrong taxonomy.
- ❌ `label="87"` on a coloured pill → colour has become the only signal; name the level.
- ❌ `--vela-radius-full` on the pill → reserved for the status dot and the toggle track.
- ❌ A click handler, a hover state or a dismiss "×" → that is a Token Pill, not in this kit.
- ❌ Four or five levels → the set is closed at three.
