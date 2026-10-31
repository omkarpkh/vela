# Vela — global design rules

This is the one document an agent reads before touching any UI in this repository. It
collects the rules that apply everywhere; the per-component specs in `guidelines/components/`
add the rules for one component. Read this, then the spec, then act.

## Purpose and scope

Vela is a token-first design system for security products. The tokens are the only place a
value is written (`tokens/vela.tokens.json`), and they compile to CSS, a Figma library, a
Flutter theme and a Material UI theme from that one source. **The guideline is the
specification and the source is one implementation of it**: do not infer an API from
`src/`, and do not treat the React code as the contract — the tokens, the closed prop sets,
the taxonomies and the accessibility rules hold for any framework, and the specs are written
to be implementation-independent (`guidelines/llms.txt`, `guidelines/setup.md`).

The React package has two entry points (`decisions/002-agent-ready-direction`): `@omkarux/vela`
is hand-rolled and has zero runtime dependencies; `@omkarux/vela/headless` builds the same
specs on Base UI (`@base-ui/react`, an optional peer) and is Experimental. The first headless
component is Tabs, so the two can be compared against one spec, one stylesheet and one test
file; Checkbox, Radio Group, the three overlays — Popover, Tooltip, Dialog — Toast and Dropdown
List were born there and ship from `/headless` only. Choose the core entry unless you already carry Base UI or need a behaviour the core does
not yet implement; a spec's "Implementations" section lists what each entry ships and where they
differ.

## Token layers and naming

Two layers (`guidelines/tokens.md`, `guidelines/foundations/color.md`):

| Layer | Looks like | Bind it? |
|---|---|---|
| **Primitive** | `--vela-grey-700`, `--vela-red-500`, `--vela-white` | Never in a component. Primitives exist so semantics can be re-pointed for theming; binding one is what breaks dark mode. |
| **Semantic** | `--vela-text-default`, `--vela-bg-severity-major` | Always. |

Every semantic token is `--vela-<role>-<context>-<state>`. Decide it in three steps:

1. **What am I colouring?** → `text` / `bg` / `border` / `icon` / `signal`
2. **In what context?** → nothing (global), `severity-*`, `risk-*`, `status-*`, `btn-*`, `control-*`
3. **What state?** → nothing (default), `-hover`, `-active`, `-inactive`, `-disabled`

Body copy → `--vela-text-default`. A critical alert's background → `--vela-bg-severity-critical`.
A focused input's border → `--vela-control-border-active`. An unhealthy node's dot →
`--vela-signal-status-unhealthy`. The ones you will actually reach for most — `--vela-text-default`,
`--vela-text-heading`, `--vela-text-de-emphasized`, `--vela-bg-global`, `--vela-bg-container`,
`--vela-border-default`, `--vela-border-subtle`, `--vela-space-10/15/20`, `--vela-radius-4` —
are listed with their uses in `guidelines/tokens.md`.

Three rules follow, and all three are checked by `scripts/check-css.mjs` in `npm test`:

- **Numeric tokens already carry their unit.** `padding: var(--vela-space-10)`, never
  `calc(var(--vela-space-10) * 1px)` — that produces `10px * 1px`. Applies to `--vela-space-*`,
  `--vela-icon-*`, `--vela-control-height-*`, `--vela-radius-*` and every typography size and
  line-height.
- **No primitives in component CSS.** `var(--vela-grey-700)` in `src/components/**` fails the
  build; the one exception a spec may record is a role no semantic covers, and that is a
  reason to add the semantic, not to bind the primitive.
- **No raw values.** No hex, no `rgb()`/`hsl()`/`oklch()`, no CSS named colour (`transparent`
  and `currentColor` defer to the cascade and are fine), no bare `px`/`rem`/`em`. `0`, a `1px`
  hairline on a border/outline/inset/margin property, percentages and unitless numbers pass. A
  literal that genuinely has no token yet is waived on its own line with
  `/* vela-allow: <reason> */`, and every waiver is printed in the report.

The scales do not interpolate: `--vela-space-25` exists and `--vela-space-50` does not; there is
no 35 and no 70. Radius has four tokens each with a scope, and `--vela-radius-full` belongs to the
Status Indicator dot and the Toggle track only (`guidelines/foundations/spacing.md`, `radius.md`,
`sizing.md`). Button and the input family do not share a height ramp — a `regular` Button is
35px and a `regular` Input is 26px, deliberately.

## Typography

Three families, each a token, each with a fallback stack so the kit degrades rather than breaks
(`guidelines/foundations/typography.md`):

| Token | Stack | For |
|---|---|---|
| `--vela-font-family-primary` | `"Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` | all UI text |
| `--vela-font-family-display` | `"Oswald", "Open Sans", -apple-system, sans-serif` | large stat and number displays only |
| `--vela-font-family-mono` | `ui-monospace, "SF Mono", "Cascadia Mono", "Roboto Mono", Menlo, Consolas, monospace` | identifiers, hashes, IPs, timestamps, counts that must align |

The mono stack is **system fonts only** — no web font is downloaded; each platform's own
monospace answers first. It is used at Meta's size, line height, weight and tracking
(`--vela-text-meta-*`), which Figma carries as the text style **`Mono/Meta`** in Roboto Mono
(Figma names one family per style, and Roboto Mono is the stack's Google-hosted member). Sizes
are triples: never take a size without its line height.

## The three taxonomies

Vela deliberately separates **severity** (events), **risk** (scoring) and **status** (the health
dot). They are three vocabularies with three token rows, and they are never interchanged
(`guidelines/foundations/color.md`, `guidelines/overview.md`).

| Taxonomy | Values | Describes | Owned by | Tokens |
|---|---|---|---|---|
| **Severity** (6) | `success` · `info` · `warning` · `minor` · `major` · `critical` | an event the user must read | Contextual Alert (a Toast carries only `success` · `info` · `warning`) | `--vela-{bg,border,signal,icon,text}-severity-*`, `--vela-border-severity-*-indicator` |
| **Risk** (3) | `low` · `medium` · `high` | a score on an object | Risk Pill | the same six roles, `--vela-*-risk-*` |
| **Status** (5) | `unknown` · `healthy` · `warning` · `medium` · `unhealthy` | an object's ongoing health | Status Indicator | `--vela-signal-status-*` — one row, five swatches, no other roles |

There is no "high severity", no "critical risk" and no "critical status". Every level defines a
complete row — if a token you expect does not resolve, you have the wrong taxonomy, not a gap.
The same word can sit in two taxonomies and mean two things: `warning` is a severity and a
status; `medium` is the middle of the risk score and, on the Status Indicator, means degraded.
Never derive one from the other. The compiler rejects a crossed value (`<StatusIndicator
status="critical">`, `<RiskPill risk="critical">`, `<ContextualAlert severity="high">`), and
the fixtures that prove it live in `scripts/verify-pack.mjs`.

## Closed prop sets

**If a value is not in the component's Props table, it does not exist.** `variant`,
`appearance`, `size`, `severity`, `status`, `risk` each accept only the literals the spec lists;
an invented one — `size="medium"` on a Button, a seventh severity — is a compile error, not a
fallback (`guidelines/components/button.md`, Hard constraints).

How it is enforced:

- The props are TypeScript literal unions, and where values constrain each other the type is a
  **discriminated union** — `appearance="text-link"` requires `variant="primary"`, narrows `size`
  to `tiny | regular` and has `icon?: never`, so the compiler rejects the combination without a
  code review.
- Every rule in a spec's **Hard constraints** carries a tag, `[[rule: id | compiler|runtime|browser|convention]]`,
  and `scripts/check-rules.mjs` fails the build unless each `compiler` rule has a hand-written
  fixture in `scripts/verify-pack.mjs` that the shipped `.d.ts` actually rejects, each `runtime`
  rule is referenced by a unit test, each `browser` rule by a Playwright spec. `convention` is a
  real answer for what cannot be mechanised ("one primary filled button per page").
- A spec that documents a prop the playground cannot demonstrate still lists it; the playground's
  controls are generated from the Props table (`demo/playground/spec.ts`).

How to flag a gap: do not widen the union. State that the kit has no value for the need, name the
closest match, and record the gap in the spec — a new value is a spec change first, then a type,
a fixture, a Figma variant and a changelog entry (see *How to add a component*).

## States

States are not variants: `disabled`, `loading`, `selected`, `checked`, `invalid` are booleans
or derived, never a value of `variant`/`appearance`/`size`. Button's `disabled` has no Figma axis
on purpose; where a set does carry a `State` axis (Input, Tabs, Toggle) it mirrors a state the
markup already carries, not a new variant.

- **Hover** — only where hover exists. Every hover rule in component CSS sits under
  `@media (hover: hover)`; touch gets press feedback instead of a hover state that sticks after
  the tap. Filled buttons
  darken (lighten in dark mode) through their `-hover-bg` token; `text-link` shifts colour and
  stays un-underlined.
- **Focus** — one treatment for the whole kit, `.vela-root :focus-visible` in
  `src/styles/base.css`, bound to `--vela-focus-ring-width/offset/color`. Never a per-component
  outline, never `outline: none`.
- **Disabled** — the native attribute. CSS keys on `:disabled`. A disabled control leaves the
  tab order; explain why in adjacent helper text. A control that cannot act must not pretend to
  react, so disabled and busy controls do not animate.
- **Locked** — a value in a set (a segment, a list item) that can't be chosen with the other
  settings as they are, while the control itself still works. It stays reachable: in the tab
  or arrow-key order, marked `aria-disabled="true"`, never the native attribute. It states its
  reason in words a person can act on, read with it: as its accessible description, or as its
  `meta` in a Dropdown List. The reason is never faded. Choosing it selects nothing, and it
  never animates as a press. "Locked" is Vela's internal word. People meet the screen reader's
  own word for `aria-disabled` and the reason, and never "Locked" as a status, because in a
  console "locked" means locked accounts and policies. A whole control that can't act is
  Disabled, above. Cited by Segmented Control (`locked`) and Dropdown List (disabled items).
  A locked value may carry Icon's `lock` before its label, and then its reason is also visible
  beside it (`icon.md`, *Glyphs*).
- **Loading** — the label stays, a spinner appears, `aria-busy="true"` is set, the control stays
  focusable and ignores clicks. CSS keys on `[aria-busy="true"]`. Swapping the label for a
  spinner would strip the accessible name mid-request; disabling it would drop focus.
- **Pressed** — pointer only, `transform: scale(0.97)`, keyed on `[data-vela-pressed]` (set by
  the component) or `:active` without JS, and excluded for `:focus-visible`, so Space and Enter
  never scale: a keyboard press collapses the focus ring instead. The hit target never moves.
  A control with its own press response sets `-webkit-tap-highlight-color: transparent` beside it,
  in its own stylesheet (after any `all: unset`, which resets it), so a touch press does not also
  get the browser's flash; `css:check` fails a stylesheet that styles `[data-vela-pressed]` without
  it. Never on `.vela-root`: a host's links inside it would lose their only tap feedback.
- **Selected / checked / invalid** — CSS keys on the ARIA state the markup already carries:
  `[aria-selected="true"]` (Tabs), `[aria-checked="true"]` (Toggle, Checkbox, Radio Group),
  `[aria-checked="mixed"]` (an indeterminate Checkbox), `[aria-invalid="true"]` (Input, Checkbox,
  Radio Group). A red border without `aria-invalid` is an anti-pattern because the two cannot drift.

## Motion

Motion is feedback, never decoration (`guidelines/foundations/motion.md`). Vela animates for
one of three reasons — feedback, orientation, continuity — and a movement whose reason cannot
be named in one of those words does not ship. The frequency gate: something triggered hundreds
of times a day gets instant feedback under 200ms; from the keyboard, nothing animates.

Four durations and three curves, and no component defines its own duration or curve
(`--vela-delay-tooltip`, 600ms, is a wait before a Tooltip opens on hover, and `--vela-delay-preview`,
80ms, the rest before the Tabs hover preview appears; neither is an animation, see the overlays
bullet below and `guidelines/components/tabs.md#motion`):

- `--vela-duration-instant` (70ms) — a press landing; press-in only.
- `--vela-duration-fast` (120ms) — anything else that answers a pointer.
- `--vela-duration-base` (180ms) — anything that settles or appears.
- `--vela-duration-travel` (240ms) — a change that crosses a distance (the Tabs underline growing
  under a pressed tab, the Tabs hover preview fading in). Still under 300ms.
- `--vela-ease-standard` `cubic-bezier(0.2, 0, 0.2, 1)` — things that change or move while on
  screen: hover colours, a press, a knob. Never a bare `ease`.
- `--vela-ease-out` `cubic-bezier(0.25, 1, 0.5, 1)` — things that enter: fast at the start, at
  rest at the end, no overshoot.
- `--vela-ease-spring` — a spring (stiffness 1200, damping 56, mass 1), generated into a CSS
  `linear()` easing over `--vela-duration-travel` at token build time; `--vela-ease-out` where
  `linear()` is not supported. Only for the moments a spec names (today: the Tabs underline growing in
  place after a pointer press), always paired with `--vela-duration-travel`.

The three new values (`duration-travel`, `ease-out`, `ease-spring`) are **provisional** until the
owner has reviewed their feel on the playground's Motion review page (`#/motion`). The overlays
still enter on `--vela-ease-standard`; moving them to `--vela-ease-out` is a later part of the
motion pass, not this rule silently unmet.

Overlays (Popover, Tooltip, Dialog, Toast) and the Dropdown List appear at `base` on opacity plus a `--vela-space-5` step
of travel, and leave on opacity alone; one opened or closed from the keyboard does not animate
(`data-vela-instant`). A Tooltip waits `--vela-delay-tooltip` on hover and opens at once on focus.
A Toast stays `--vela-duration-toast` (6000ms) — a dwell, not an animation, paused on hover and
focus, untouched by the reduced-motion collapse — and only when it is a `success` or `info` with no
action; a warning or a toast with an action stays until dismissed.

Only `transform`, `opacity` and `filter` animate (a colour may settle, as a hover does; layout
never moves), and `scripts/check-css.mjs` fails a transition or keyframe that moves anything
else. The one exception is an icon glyph's own strokes, which may draw with `stroke-dashoffset`
by transition inside a `.vela-icon`, under the guards in `foundations/motion.md` (decision 004). Pointer states enter faster than they leave
(hover in at `fast`, out at `base`; press in at `instant`, out at `base`). Transitions, not
keyframes, for anything a person can re-trigger. No looping attention-seekers — the loading
spinner is the one loop. **`prefers-reduced-motion` is handled once, globally**, in
`src/styles/base.css`: durations collapse, loops run once, and every animation must read
correctly frozen at its end state. The reference implementation is
`guidelines/components/button.md#motion`.

## Theming

Three states, handled by the stylesheet (`guidelines/setup.md`): no attribute follows the OS
through `prefers-color-scheme`; `data-theme="light"` or `"dark"` forces a theme on the root or
**on any subtree**, so a dark sidebar can sit in a light app. `scripts/build-css.mjs` authors the
dark block once and emits it under both selectors so the two copies cannot drift.

**Dark mode re-points semantics only.** No primitive is redefined and no raw hex appears in the
dark block — a test fails the build if one does (`src/styles/contrast.test.ts`). That is the
return on the two-layer architecture and the reason components bind semantics: anything that
binds a primitive or a raw value simply does not respond to the theme. **Both themes are real**:
never hardcode a colour that only works in light mode, and never ship a pair you have only
looked at in one theme.

## Responsive and density

Vela is built for security consoles, and a console is read on a few known surfaces. These are
the widths every layout and every component is judged against:

| Surface | Width | What changes |
|---|---|---|
| Laptop | 1280 | the floor for a full console: tables keep every column, side panels overlay |
| Desktop | 1440 | the reference; the full visual suite runs here (`playwright.config.ts`) |
| Wide | 1920 | more rows and columns on screen, never larger type or looser spacing |
| SOC wall display | 2560 and up, read from metres away | larger type and signals, higher contrast margins, fewer things per screen |
| Embeddable widget | whatever the host gives it | the component, not the viewport, decides |

Rules that hold now, with the tokens they are waiting on named plainly:

- **Embeddable components use container queries, never viewport queries.** A Vela component can
  be dropped into a host's dashboard tile, a side panel or a table cell, and none of those knows
  the viewport. Size against the container (`@container`), not `@media (min-width)`.
- **Every component declares a minimum width and degrades to text below it.** Below its minimum
  a component does not overflow, clip or truncate its label: it falls back to the plain text
  that carries its meaning — the level word, the status word, the label — so the information
  survives even when the chrome does not. The minimum is stated in the spec.
- **Two density steps — `comfortable` and `compact`.** Comfortable is today's scale; compact
  tightens control heights and vertical spacing for dense tables and wall displays without
  changing type size or touch targets below 24px. Density is a property of a subtree, set the way
  a theme is, and it will be expressed as tokens — not as a prop on every component.
- **Every component spec carries a "Responsive behaviour" section** stating its minimum width,
  what it does below it, how it wraps, and what changes at each density. The heading test
  (`src/styles/guidelines.test.ts`) requires it.
- **Every component section is screenshotted at four widths** — 1440 (the full suite), 1280,
  1920 and 400 (the embeddable check) — against Linux baselines that only the CI runner writes
  (`.github/workflows/visual-baselines.yml`). A layout that breaks at a console width fails CI.

**Breakpoint and density tokens do not exist yet.** `--vela-breakpoint-*` and the compact
density values are being added in Phase 0 by the token stream; until they land, components
bind the existing spacing and sizing tokens, state their responsive behaviour in prose in the
spec, and do not hardcode a width. Do not add these tokens yourself.

## Accessibility

What CI asserts, and therefore what "accessible" means in a pull request:

- **Contrast.** Every foreground/background pair the kit ships is listed in `PAIRS` in
  `scripts/contrast-core.mjs` and asserted against WCAG 2.1 AA in `src/styles/contrast.test.ts`,
  in both themes: 4.5:1 for text, 3:1 for UI boundaries and non-text signals. A new colour pair
  goes into `PAIRS` or it is an unverified claim. The tightest shipped pair is the `unknown`
  status dot on a selected table row at 3.22:1 against a 3:1 minimum (Table, Phase 1: any tint
  under a grey-500 dot costs contrast, and this is the lightest selection tint still visible);
  before it, the input border at 3.29:1. Anything below 3.22:1 is a regression. The deliberate choices this
  produced — destructive buttons on `red-700` not `red-500`, status dots on the 600s and 700s —
  are recorded in `guidelines/foundations/color.md`; do not "fix" them back.
- **Rule fixtures.** `scripts/check-rules.mjs`: every tagged rule has a proof at its level, and
  every fixture names a rule. Required labels (`Toggle`, `Input`, `Tabs.List aria-label`), error
  as a message not a boolean, `aria-describedby` only to rendered elements, live-region
  politeness derived from severity — these are `compiler` or `runtime` rules with fixtures and
  tests behind them.
- **Browser rules.** What only layout can prove — a press never moves the hit target — is a
  `browser` rule with a Playwright spec in `tests/e2e/`, and the visual baselines in
  `tests/visual/` catch a stray padding change in both themes.
- **Stylesheets.** `scripts/check-css.mjs` keeps raw colours and bare lengths out of component
  CSS, so a pair that was never asserted cannot arrive through a stylesheet.

What stays manual: screen-reader behaviour in a real AT (roles, roving tabindex, announcements
are unit-tested in jsdom, not heard); keyboard flows across a whole page; the conventions the
compiler cannot count (one primary filled button per page, `destructive` for consequence not
emphasis); **colour is never the only signal** (WCAG 1.4.1) in composition — the components
render a text alternative, but a bare dot in a table with no header context is a page-level
failure; and the per-release scoring of whether an agent picks the right component for a prompt,
recorded in the changelog.

## Anti-patterns

Collected from every spec's Anti-patterns section and the foundations, deduplicated. Each spec
keeps its own list; read it before generating that component.

Tokens and theming
- Hardcoded colours → always `var(--vela-*)`; raw hex is invisible to theming and fails in dark mode.
- Binding a primitive (`--vela-grey-700`) → bind the semantic for the role.
- `calc(var(--vela-space-10) * 1px)` → the token carries its unit.
- `padding: 12px` → `--vela-space-10` or `--vela-space-15`; `--vela-space-50` → does not exist.
- `font-size: 15px` outside a Button `large` → not on the scale; setting `font-family`/`font-size`/`line-height` by hand → use the class or the tokens.
- Margin-bottom stacks → use `gap`.

Taxonomies
- `severity="high"` or `"error"`, `status="critical"`, `risk="critical"`, `risk="unhealthy"` → wrong taxonomy (will not compile).
- A risk token on a severity background, `--vela-signal-severity-*` on a status dot, `--vela-bg-severity-*` or `--vela-signal-status-*` on a risk pill → the rows never mix.
- Six or seven statuses, four or five risk levels → the sets are closed.

Geometry
- Pill-shaped buttons (`border-radius: 999px`) → buttons are `--vela-radius-4`; `--vela-radius-full` on anything but a status dot or a toggle track, including the Risk Pill.
- `--vela-radius-8` on a card → cards are `--vela-radius-4`; 8 is for modals.
- `--vela-control-height-48` for Button `huge` → huge is 60px; a 20px or 24px icon in a Button → 12 at tiny, 16 elsewhere.
- Fixed button widths → buttons hug their content; a trailing icon → icons sit left only.
- Input `regular` (26px) next to Button `regular` (35px) without deliberate alignment.

Semantics and labels
- Two primary filled buttons on one page; `destructive` for emphasis on a harmless action.
- A destructive or standard text-link → primary only (will not compile); underlining a text-link.
- SemiBold or Bold button labels → Regular 400 at every size; a bold H1 → H1 is Light 300.
- Non-verb labels ("Information", "Status") → if it is not an action, it is not a button.
- Placeholder as the label; `error={true}` with the message elsewhere → pass the message.
- `<Toggle />` with no label, `<Tabs.List>` without `aria-label` → will not compile.
- A Toggle behind a Save button → that is a Checkbox; Toggles for more than two states.
- Tabs for the same dataset in a different view → View Switcher; Tabs as page navigation → use real links; keeping hidden panels mounted to preserve form state → lift the state.
- Using a Contextual Alert as a toast → it is inline and does not float; a dismissible critical alert with no other resolution path; an info alert with `role="alert"`.
- A Toast as the only record of what happened, or the only place an Undo lives → the page carries both; a Toast that asks a question or offers two buttons → a Dialog; a `critical` or `major` toast, or a failure in a toast (will not compile for the severities) → a Contextual Alert where the work is.
- A click handler, a hover state or a dismiss "×" on a Risk Pill → that is a Token Pill, not in this kit.
- A Popover holding the only copy of something the task needs; a list of commands in a Popover → an Actions Dropdown, not in this kit.
- A list of commands in a Dropdown List → an Actions Dropdown, not in this kit; a Dropdown List as a form field → a Select List, not in this kit; `meta="Critical"` or a dot in an item's meta → meta is words, never a taxonomy; an ellipsis on a long name → names wrap in full.
- A link or a button in a Tooltip (will not compile) → a Popover; a Tooltip as the only name of an icon-only control → `aria-label` on the control; a Tooltip on a disabled control → adjacent text.
- A destructive confirmation in a standard Dialog → `variant="alert"`, whose confirm is always destructive; a Dialog that only says "OK" → a Contextual Alert.
- A shadow on an overlay → no elevation token exists; the border (Popover) or the scrim (Dialog) separates it.

Accessibility
- Conveying severity, status or risk by colour alone; a bare dot in a table with no label and no header context; `label="87"` on a coloured pill → name the level.
- Turning the border red without `aria-invalid`.
- Buttons or a custom `<div>` with click handlers → no role, no keyboard, no announcement.
- Every tab tabbable → use the roving tabindex the component already implements.
- `outline: none`, or a per-component focus ring → the ring is global.

## Not in the kit

Do not invent one silently. State that the kit has no component for the need and pick the
closest match while flagging the gap. Not yet specced: Select List, Token Pill,
Number Stepper, Icon Button, Actions Dropdown, View Switcher, Data Grid (arrow-key cell navigation,
`role="grid"`), Card List. Flag rather than guess. Checkbox (with Checkbox.Group), Radio Group,
Popover, Tooltip, Dialog (with its `alert` variant — the kit's modal), Toast and Dropdown List are
specced and ship from `@omkarux/vela/headless` only (Experimental); Table ships from the core entry (Experimental)
and is read, not navigated cell by cell. The disambiguations agents most often get wrong
— Toggle vs Checkbox, Radio Group vs Select List, Tabs vs View Switcher, Popover vs Tooltip vs
Dialog, Toast vs Alert vs Dialog, Dropdown List vs Select List vs Actions Dropdown, Alert vs Status
Indicator vs Risk Pill — are in `guidelines/overview.md`.

## How to add a component

1. **Spec first** — `guidelines/components/<name>.md` with the sections the tests enforce (Intent → When to use → Props → Hard constraints with `[[rule: …]]` tags → Token bindings → Sizes → States → Accessibility → Figma mapping → Anti-patterns), listed in `overview.md` and `llms.txt`.
2. **Then tokens and tests** — bind existing semantics or add the semantic to the token file (never a primitive, never a raw value); add every new pair to `PAIRS`; a "Responsive behaviour" section in the spec; a fixture per `compiler` rule in `verify-pack.mjs`, a unit test per `runtime` rule, a Playwright spec per `browser` rule; a `scripts/figma/components/<name>.figma.js` builder that passes `npm run components:figma:lint`; a playground entry.
3. **Then verify and record** — `npm run verify` and `npm run test:e2e` green, `npm run checks` so the count on the site is the count CI runs, and a changelog entry. The full path, with who reviews what, is in `CONTRIBUTING.md`.
