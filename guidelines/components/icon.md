# Icon

One glyph from a closed, curated set of fifty, drawn from Lucide and compiled into the package,
at one of three token-bound sizes. It sits beside text, in a table cell or in another
component's icon slot; it is never a control and never a severity, risk or status mark.

**Status:** Experimental — specced, built and tested, and the glyph list is new; the Figma set's
builder (`scripts/figma/components/icon.figma.js`) passes the lint in the mock Plugin API but has
not been run in the library yet. Approved once the set is published and the kit's own inline
glyphs (`src/lib/icons.tsx`) have moved onto it; see `GOVERNANCE.md`.

**Dependencies:** none

## When to use Icon

- A glyph that reinforces adjacent text — "Blocked" beside `shield-x`, "Export" beside
  `download` → **Icon**, `aria-hidden` (no `label`).
- A glyph that stands alone in a cell or a header and carries meaning nothing beside it states →
  **Icon** with a `label`.
- The mark of an event the user must read → **Contextual Alert**, which owns the severity marks.
  An Icon in a severity colour is not a substitute (there is no severity `tone`).
- A risk score or an object's health → **Risk Pill** or **Status Indicator**. A shield is not a
  risk level and a circle is not a status dot.
- A clickable glyph (close, copy, more) → an **Icon Button**, which is **not in this kit**. Flag
  the gap; do not put a click handler on an Icon (it will not compile) or wrap it in a `<div>`.
- Inside a Button → pass the Icon to Button's `icon` slot with `tone="inherit"`, so the glyph takes
  the label colour; Button keeps owning the slot's size.

## Props

```tsx
<Icon name="shield-x" /> Blocked by policy
<Icon name="rotate-ccw-clock" size="large" label="Audit history" />
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `name` | `IconName` | — | **Required.** One of the fifty names in *Glyphs* below, exported as `ICON_NAMES`. Lucide's canonical names: `funnel` not `filter`, `trash` not `trash-2`, `rotate-ccw-clock` not `history`. |
| `size` | `"regular" \| "small" \| "large"` | `"regular"` | **These three only.** 16, 12, 20px. |
| `tone` | `"default" \| "muted" \| "inherit"` | `"default"` | **These three only.** No severity, risk or status tone. |
| `label` | `string` | — | The accessible name. Present → `role="img"` and `aria-label`; absent → `aria-hidden`. |
| `className` | `string` | — | Layout only (a margin, an alignment). Never a size or a colour. |

## Hard constraints

- **Fifty glyphs.** `name` is required and is one of `ICON_NAMES`: an invented name, a Lucide
  glyph outside the curated set (`"airplay"`), a Lucide alias (`"trash-2"`) and a missing name are
  compile errors. A new glyph is a spec change: this table, then `scripts/icons.list.json`, then
  `npm run icons:build`. [[rule: icon-name-closed-set | compiler]]
- **Three sizes.** `regular`, `small`, `large` — not a number, not `"medium"`. The boxes are the
  three icon-size tokens. [[rule: icon-size-closed-set | compiler]]
- **Three tones.** `default`, `muted`, `inherit`. There is no `"critical"`, `"high"` or
  `"unhealthy"` tone: a glyph in a taxonomy's colour belongs to the component that owns the
  taxonomy. [[rule: icon-tone-closed-set | compiler]]
- **An icon is not a control.** No `onClick`, no `tabIndex`, no `style`: the props are closed and
  the compiler rejects them. A clickable glyph is an Icon Button, not in the kit. [[rule: icon-not-interactive | compiler]]
- **An unknown name throws a named error.** For the JavaScript caller the type cannot reach,
  `<Icon name="shield">` throws `not in Vela's curated set` rather than React's "element type is
  invalid". [[rule: icon-unknown-name-throws | runtime]]
- **Decorative unless labelled.** Without `label` the svg is `aria-hidden="true"` and has no role,
  so assistive technology skips it and the adjacent text carries the meaning. With `label` it is
  `role="img"` named by the label, and not hidden. [[rule: icon-decorative-unless-labelled | runtime]]
- **Never focusable.** The svg carries `focusable="false"` and no `tabindex`, so a glyph is never
  a tab stop, labelled or not. [[rule: icon-never-focusable | runtime]]
- **Size and stroke come from the tokens.** The svg carries no `width`, `height` or
  `stroke-width`; `Icon.css` binds `--vela-icon-size*` and `--vela-icon-stroke`, so a token change
  moves every glyph and nothing can disagree with it. [[rule: icon-stroke-from-token | runtime]]
- **The set is generated, never hand-edited.** Every name in `scripts/icons.list.json` is in
  `ICON_NAMES`, renders a glyph, and has a row in the table below; `npm run icons:check` (in
  `verify`) fails if the committed output differs from a rebuild. [[rule: icon-set-is-generated | runtime]]
- **A glyph is not a taxonomy.** `shield-x` is not "critical", `circle-check` is not "healthy",
  `triangle-alert` is not the warning severity. Severity, risk and status keep their own
  components, and an Icon never stands in for one. [[rule: icon-not-a-taxonomy | convention]]
- **A meaningful glyph is never alone.** If the glyph carries meaning, either text beside it
  states that meaning or `label` does — the label is the fallback, not the default.
  [[rule: icon-meaning-has-words | convention]]
- **`muted` sits on the page, not on a container.** `--vela-icon-default` measures 3.47:1 on
  `--vela-bg-global` and 3.07:1 on `--vela-bg-container` in light mode; the kit's floor is the
  input border's 3.29:1, so on a container use `default`. [[rule: icon-muted-on-page | convention]]

## Token bindings

| tone | Colour |
|---|---|
| default | `--vela-icon-strong` |
| muted | `--vela-icon-default` |
| inherit | `currentColor` — the surrounding text's colour |

The token names predate the component: `--vela-icon-strong` is the full-strength glyph colour (the
same grey as `--vela-text-default`, so a glyph beside body copy matches it) and
`--vela-icon-default` is the de-emphasised one. Both are in `PAIRS`: `default` on the page and on
a container (7.69:1 and 6.82:1 light, 11.55:1 and 10.30:1 dark), `muted` on the page (3.47:1
light, 5.22:1 dark), against the 3:1 non-text minimum.

Stroke is `--vela-icon-stroke`: 2, in the 24-unit grid the glyphs are drawn on. Because the svg's
`viewBox` is 24 and the box is the size token, the stroke scales with the box.

## Sizes

| size | Box | Stroke renders | Beside |
|---|---|---|---|
| small | `--vela-icon-size-small` (12px) | 1px | 12px meta text, Button `tiny` |
| regular | `--vela-icon-size` (16px) | 1.33px | 14px body text, Button `regular` and up |
| large | `--vela-icon-size-large` (20px) | 1.67px | a standalone glyph, or 16px text |

The stroke stays at Lucide's 2 because it renders exactly 1px at small and about the stem weight
of Open Sans Regular at the other two; 1.5 would render 0.75px at small and blur
(`foundations/sizing.md`).

## States

None. An Icon has no hover, focus, pressed or disabled state: it is not a control. Inside a
control that has one (a disabled Button), `tone="inherit"` lets the control's colour carry it.
An Icon does not animate — `loader-circle` is a still glyph; the one loop in the kit is Button's
loading spinner.

## Responsive behaviour

An Icon is fixed geometry: `flex: none`, its box is the size token, and it never grows, shrinks or
scales with its container or the viewport. Its minimum width is its box — 12, 16 or 20px — and it
has nothing to degrade to below it, because it never carries meaning alone: in a narrow cell the
**text beside it wraps after the glyph**, never before it, and the glyph is never truncated or
clipped. A standalone labelled glyph keeps its `aria-label` at any width; a visible legend, where
one is needed, is the host's. Density tokens do not exist yet (see `DESIGN.md`, *Responsive and
density*); compact density will not change the three boxes, which are already the smallest the
stroke stays crisp at.

## Glyphs

Lucide 1.63.0, ISC (a subset derives from Feather, MIT; see `NOTICE`). The order is the order of
`scripts/icons.list.json`, and a test holds this table to it. "Meaning" is what the glyph says in a
Vela console; a glyph is not used for anything else.

| Glyph | Meaning | Used by |
|---|---|---|
| `shield-x` | Blocked — a policy or an agent action was stopped | Verdict Card (Phase 2) |
| `shield-alert` | Flagged — needs a person's review | Verdict Card, Approval Queue (Phase 2) |
| `shield-check` | Allowed — checked and let through | Verdict Card (Phase 2) |
| `shield-question-mark` | No verdict yet — unverified | Verdict Card (Phase 2) |
| `clock-alert` | A deadline at risk or passed | Approval Queue timer, Awareness Clock (Phase 2) |
| `undo-2` | Reversible — the rollback path | Action Impact card (Phase 2) |
| `hourglass` | Waiting on a person — pending approval | Approval Queue (Phase 2) |
| `wrench` | Remediation — a fix to apply | Action Impact card, findings |
| `circle-slash` | Not applicable — excluded from scope | Table rows, policy scope |
| `move-right` | Changes from → to — a before and after | Action Impact card, Agent Action Ledger |
| `check` | Done, selected, confirmed inline | Lists, menus |
| `minus` | Remove one, collapse | Steppers, disclosure |
| `x` | Close, clear, remove | Dismiss controls (an Icon Button, not in the kit) |
| `plus` | Add, create | Button icon slot |
| `search` | Search | Search fields |
| `funnel` | Filter (Lucide's name for filter) | Table toolbars |
| `chevron-down` | Expand, open a list | Disclosure, selects |
| `chevron-up` | Collapse | Disclosure |
| `chevron-left` | Previous page or item | Pagination |
| `chevron-right` | Next page or item, drill in | Pagination, rows |
| `arrow-left` | Back | Page headers |
| `arrow-right` | Forward, next step | Wizards, links |
| `arrow-up-right` | Open the detail view, inside the product | Row and card links |
| `external-link` | Leaves the product — another site or tab | Links to docs, vendors |
| `copy` | Copy to the clipboard | IDs, hashes, commands |
| `info` | More information — a hint, not the info severity | Field help |
| `triangle-alert` | Caution beside text — not the warning severity | Inline notes |
| `circle-alert` | Needs attention — a field or row to look at | Forms, rows |
| `circle-check` | Passed — a check that succeeded | Check lists, results |
| `circle-x` | Failed — a check that did not | Check lists, results |
| `eye` | Show — reveal a masked value | Secrets, tokens |
| `eye-off` | Hide — the value is masked | Secrets, tokens |
| `refresh-cw` | Refresh, run again | Toolbars |
| `loader-circle` | In progress (a still glyph; nothing animates it) | Job rows |
| `ellipsis` | More actions | Actions Dropdown (not in the kit) |
| `settings` | Settings, configuration | Headers, rows |
| `lock` | Locked — restricted or read-only by policy | Fields, rows |
| `lock-open` | Unlocked — editable | Fields, rows |
| `user` | A person — a human actor | Agent Provenance (Phase 2) |
| `users` | A group or team | Assignment, scope |
| `calendar` | A date, a schedule | Filters, fields |
| `clock` | A time, a duration, last seen | Timestamps |
| `download` | Export, download | Toolbars |
| `upload` | Import, upload | Toolbars |
| `trash` | Delete (Lucide's `trash-2` before 1.0) | Beside a `destructive` Button label |
| `pencil` | Edit | Rows, fields |
| `bell` | Notifications | Headers |
| `bot` | An agent — an automated actor | Agent Provenance (Phase 2) |
| `terminal` | A command, a shell, a script | Evidence, runbooks |
| `rotate-ccw-clock` | History, audit trail (Lucide's name for history) | Audit, Agent Action Ledger |

The shields are reserved for the Verdict Card. Until the Verdict taxonomy is specced (`ROADMAP.md`,
Phase 2) they carry their word, never a level, and they bind no taxonomy colour.

## Accessibility

- Decorative by default: `aria-hidden="true"`, no role, and the adjacent text is the name.
- Labelled: `role="img"` with `aria-label`; the label is a noun phrase for what the glyph means
  here ("Blocked", "Audit history"), not the glyph's name ("shield x").
- Never focusable (`focusable="false"`, no `tabindex`), so it never adds a tab stop.
- `default` and `muted` are asserted at 3:1 against the page in both themes (`PAIRS`); `inherit`
  takes the pair of the text it sits in. Colour is never the only signal: the meaning is in words.

## Figma mapping

Library file: **Vela Design System** → page `Icon`. Fifty variants: `Glyph` (50), one per curated
name, created by `scripts/figma/components/icon.figma.js` (generated by `npm run icons:build`).
Until that builder has been run in the file, the library has no Icon set.

| Figma property | Code prop |
|---|---|
| `Glyph` | `name` — the same kebab name |
| Instance width and height | `size` — not a property: bind them to `icon/size-small`, `icon/size` or `icon/size-large` |
| Stroke colour variable | `tone` — not a property: the stroke binds `icon/strong`; swap it for `icon/default` for `muted` |

**Each variant is a box bound to icon/size holding one flattened vector on Lucide's 24-unit grid,
scaled into the box, its stroke bound to icon/strong. The stroke weight is the one literal: Figma
draws strokes in canvas pixels and cannot bind a product of two variables, so the builder writes
icon/stroke × icon/size ÷ 24 = 1.33, what the code renders at regular. A small or large instance
keeps 1.33 where the code renders 1 and 1.67 — a recorded gap.** `label` and `inherit` have no
Figma expression: a label is code-only, and an inherited colour is the instance's override.

## Anti-patterns

- ❌ `<Icon name="filter" />` or `name="trash-2"` → Lucide 1.x names: `funnel`, `trash` (will not compile).
- ❌ `<Icon name="shield-x" tone="critical" />` → there is no severity tone; an event's mark is a Contextual Alert (will not compile).
- ❌ `<Icon name="x" onClick={close} />` or a `<div onClick>` around it → that is an Icon Button, not in the kit.
- ❌ `size={24}` or `className` that sets width or colour → three sizes, two tones, from the tokens.
- ❌ A labelled glyph with the label repeating the adjacent text → `aria-hidden` (no `label`) when the text is there.
- ❌ A bare `shield-check` in a table cell as the only sign a row is allowed → the word, or a label.
- ❌ Importing `lucide-react` beside Vela for "just one more icon" → request it as a spec change.
