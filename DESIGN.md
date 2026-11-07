# Vela — global design rules

This is the one document an agent reads before touching any UI in this repository, or any UI
built with Vela. It ships at the root of the npm package (`node_modules/@omkarux/vela/DESIGN.md`). It
collects the rules that apply everywhere; the per-component specs in `guidelines/components/`
add the rules for one component. Read this, then the spec, then act. Paths under `src/`,
`scripts/`, `tests/` and `decisions/` are in the repository, not the package.

## Purpose and scope

Vela is a design system for data-heavy products, built first for security consoles. The tokens are the only place a
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
  `calc(var(--vela-space-10) * 1px)`, which multiplies a length by a length and is not valid CSS. Applies to `--vela-space-*`,
  `--vela-icon-*`, `--vela-control-height-*`, `--vela-radius-*` and every typography size and
  line-height.
- **No primitives in component CSS.** `var(--vela-grey-700)` in `src/components/**` fails the
  build; the one exception a spec may record is a role no semantic covers, and that is a
  reason to add the semantic, not to bind the primitive. Vela's own brand assets (`brand/`) are the one
  place primitives are named directly, because they are images, not interface.
- **No raw values.** No hex, no `rgb()`/`hsl()`/`oklch()`, no CSS named colour (`transparent`
  and `currentColor` defer to the cascade and are fine), no bare `px`/`rem`/`em`. `0`, a `1px`
  hairline on a border/outline/inset/margin property, percentages and unitless numbers pass. A
  literal that genuinely has no token yet is waived on its own line with
  `/* vela-allow: <reason> */`, and every waiver is printed in the report.

The scales do not interpolate: the steps in the table below are the only ones. `--vela-space-25`
exists and `--vela-space-50` does not; there is no 35 and no 70. Each radius has a scope, and
`--vela-radius-full` belongs to the Status Indicator dot and the Toggle track only
(`guidelines/foundations/spacing.md`, `radius.md`, `sizing.md`). Button and the input family do
not share a height ramp: a `regular` Button is 35px and a `regular` Input is 26px, deliberately.

The table is generated from `tokens/vela.tokens.json` by `npm run tokens`; edit the token file,
never the table.

<!-- generated:scales (npm run tokens) -->
| Scale | Token | Value | Description |
|---|---|---|---|
| Spacing | `--vela-space-5` | `5px` | The spacing scale for padding and gaps. 5 between an icon and its label; 10 for control padding and tight stacks; 15 for default button padding and form gaps; 20 for section padding and tab gaps; 25 for wide inner padding; 30 for large button padding; 40 between sections; 60 and 80 for page rhythm. These steps are the only ones: there is no 35, 50 or 70. Put the gap on the flex or grid parent, not margins on the children. The value already carries px, so never wrap it in calc(… * 1px). |
|  | `--vela-space-10` | `10px` |  |
|  | `--vela-space-15` | `15px` |  |
|  | `--vela-space-20` | `20px` |  |
|  | `--vela-space-25` | `25px` | 25 exists; 50 does not. Do not interpolate the scale. |
|  | `--vela-space-30` | `30px` |  |
|  | `--vela-space-40` | `40px` |  |
|  | `--vela-space-60` | `60px` |  |
|  | `--vela-space-80` | `80px` |  |
| Radius | `--vela-radius-3` | `3px` | Corner radius. Each step has a scope, and using one outside it is drift: 4 is the default corner for every component, cards included; 3 for small inner elements such as dismiss buttons and inline chips; 8 for modal and dialog containers only; 12 for the outer edge of a top level side panel only; full for Status Indicator dots and the Toggle track only. Buttons are never pill shaped. |
|  | `--vela-radius-4` | `4px` | The default corner for every component. |
|  | `--vela-radius-8` | `8px` |  |
|  | `--vela-radius-12` | `12px` |  |
|  | `--vela-radius-full` | `9999px` | Status Indicator dots and the Toggle track only. |
| Icon box | `--vela-icon-12` | `12px` | Icon boxes for the glyph slots inside components. 12 in Button tiny; 16 in Button regular, large and huge, and in alerts; 20 for dismiss controls; 24 is reserved. A Button icon never goes above 16, even at huge. The Icon component binds its own boxes (icon-size, icon-size-small, icon-size-large), so it can change without moving these. |
|  | `--vela-icon-16` | `16px` | Button icons never exceed 16. 12 at tiny, 16 everywhere else. |
|  | `--vela-icon-20` | `20px` |  |
|  | `--vela-icon-24` | `24px` |  |
|  | `--vela-icon-size` | `16px` | Icon component, size regular: the glyph box beside 14px body text (Body/Default, Button regular). Same value as icon/16. |
|  | `--vela-icon-size-small` | `12px` | Icon component, size small: beside 12px meta text and in Button tiny. Same value as icon/12. |
|  | `--vela-icon-size-large` | `20px` | Icon component, size large: a standalone glyph (table cell, toolbar, card header) or beside 16px text. Same value as icon/20. |
| Control height | `--vela-control-height-24` | `24px` | Button and the input family do not share a height ramp. |
|  | `--vela-control-height-25` | `25px` | Button and the input family do not share a height ramp. |
|  | `--vela-control-height-26` | `26px` | Button and the input family do not share a height ramp. |
|  | `--vela-control-height-35` | `35px` | Button and the input family do not share a height ramp. |
|  | `--vela-control-height-40` | `40px` | Button and the input family do not share a height ramp. |
|  | `--vela-control-height-48` | `48px` | Button and the input family do not share a height ramp. |
|  | `--vela-control-height-60` | `60px` | Button and the input family do not share a height ramp. |
<!-- /generated -->

## Typography

Three families, each a token, each with a fallback stack so the kit degrades rather than breaks
(`guidelines/foundations/typography.md`). The table is generated from the token file by
`npm run tokens`; the display family is the one a brand may re-point.

<!-- generated:font-families (npm run tokens) -->
| Token | Stack | For |
|---|---|---|
| `--vela-font-family-primary` | `"Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` | All UI text. |
| `--vela-font-family-display` | `"Open Sans", -apple-system, sans-serif` | Headlines, brand moments and big headline numbers. Open Sans by default, so a big number and the words beside it are one family (decisions/007-display-face-open-sans). A brand theme may re-point it for headlines and brand moments, never for numbers people compare, which bind font-family-primary. Wherever it shows a number the figures are tabular (CSS font-variant-numeric: tabular-nums). |
| `--vela-font-family-mono` | `ui-monospace, "SF Mono", "Cascadia Mono", "Roboto Mono", Menlo, Consolas, monospace` | System monospace stack, no web font: identifiers, hashes, IPs, timestamps and counts that must align. Figma text style Mono/Meta draws it in Roboto Mono. |
<!-- /generated -->

The mono stack is **system fonts only** — no web font is downloaded; each platform's own
monospace answers first. It is used at Meta's size, line height, weight and tracking
(`--vela-text-meta-*`), which Figma carries as the text style **`Mono/Meta`** in Roboto Mono
(Figma names one family per style, and Roboto Mono is the stack's Google-hosted member). Sizes
are triples: never take a size without its line height.

**The display face is Open Sans by default, and a brand may change it for headlines only**
(`decisions/007-display-face-open-sans`). A big number gets its presence from size and weight, as
H1 to H3 do, not from a second family. The display token is a brand setting that a white-label
theme may re-point, under one rule: **a brand may choose a display face for headlines and brand
moments, never for numbers people compare.** Numbers read against each other (a table column, one
measure across a row of stat cards) bind `--vela-font-family-primary`, so a brand's face never
reaches them; wherever the display face does show a number, the figures are tabular
(`font-variant-numeric: tabular-nums`), and `scripts/check-css.mjs` fails a block that sets the
display face without them (`display-tabular`). Which numbers are compared is a reviewer's check.
The rule in full is in `foundations/typography.md`.

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
  settings as they are, or under a policy that applies to everyone, while the control itself
  still works. It stays reachable: in the tab or arrow-key order, marked `aria-disabled="true"`,
  never the native attribute. It states its reason in words a person can act on, read with it:
  as its accessible description, or in the meta slot in a Dropdown List. A value a person's role
  may never have is not shown at all. The reason is never faded. Choosing it selects nothing, and it
  never animates as a press. "Locked" is Vela's internal word. People meet the screen reader's
  own word for `aria-disabled` and the reason, and never "Locked" as a status, because in a
  console "locked" means locked accounts and policies. A whole control that can't act is
  Disabled, above. Cited by Segmented Control and Dropdown List, both as `locked: { reason }`.
  A locked value may carry Icon's `lock` before its label, and then its reason is also visible
  beside it (`icon.md`, *Glyphs*).
- **Loading** — the label stays, a spinner appears, `aria-busy="true"` is set, the control stays
  focusable and ignores clicks. CSS keys on `[aria-busy="true"]`. Swapping the label for a
  spinner would strip the accessible name mid-request; disabling it would drop focus.
- **Pressed** — pointer only, `transform: scale(0.97)`, keyed on `[data-vela-pressed]` (set by
  the component) or `:active` without JS, and excluded for `:focus-visible`, so Space and Enter
  never scale: a keyboard press collapses the focus ring instead. The hit target never moves. The
  small controls — the Checkbox box, the Radio circle, the Toggle track — press the same way, from
  their centre on `:active`, to `scale(0.9)`: 3% of 16px is a quarter of a pixel, which is no
  feedback at all.
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

Four durations and three curves animate, and no component defines its own duration or curve.
Their values are in the table below; this list says when to use each.

- `--vela-duration-instant`: a press landing. Press-in only.
- `--vela-duration-fast`: anything else that answers a pointer.
- `--vela-duration-base`: anything that settles or appears.
- `--vela-duration-travel`: a change that crosses a distance (the Tabs underline growing under a
  pressed tab, the Tabs hover preview fading in). Still under 300ms.
- `--vela-ease-standard`: things that change or move while on screen: hover colours, a press, a
  knob. Never a bare `ease`.
- `--vela-ease-out`: things that enter. Fast at the start, at rest at the end, no overshoot.
- `--vela-ease-spring`: a spring, generated into a CSS `linear()` easing over
  `--vela-duration-travel` at token build time, with `--vela-ease-out` where `linear()` is not
  supported. Only for the moments a spec names (today: the Tabs underline growing in place after a
  pointer press, and the Toast stack moving back and spreading), always paired with
  `--vela-duration-travel`.

Two delays are waits, not animations: `--vela-delay-tooltip` before a Tooltip opens on hover, and
`--vela-delay-preview`, the rest before the Tabs hover preview appears (see the overlays paragraph
below and `guidelines/components/tabs.md#motion`). `--vela-duration-toast` is a dwell, and the two
brand-pulse tokens belong to the site's hero logo alone, never to a component.

The table is generated from `tokens/vela.tokens.json` by `npm run tokens`:

<!-- generated:motion (npm run tokens) -->
| Token | Value | Description |
|---|---|---|
| `--vela-duration-instant` | `70ms` | A press landing. Below the ~85ms where a delay starts to read as lag, so contact and acknowledgement arrive together. Press-in only — the release settles at duration-base. |
| `--vela-duration-fast` | `120ms` | Anything that answers a pointer: hover in, exits. |
| `--vela-duration-base` | `180ms` | Anything that settles or enters: hover out, appearing. |
| `--vela-duration-travel` | `240ms` | The one step above duration-base, still under 300ms, for a change that crosses a distance: the Tabs underline growing in place under the tab that was pressed, and the Tabs hover preview fading in. The spring curve is drawn over this duration, so the two are used together. |
| `--vela-delay-tooltip` | `600ms` | How long the pointer rests on a trigger before its Tooltip opens. A delay, not an animation: it stops tooltips flashing as the pointer crosses a toolbar. Equal to Base UI's default, which applies when the stylesheet is not loaded. |
| `--vela-delay-preview` | `80ms` | How long the pointer rests on an unselected tab before its hover preview (the Tabs Seed) starts to appear. A delay on the way in only, not an animation: a pointer sweeping across a row of tabs shows nothing, and the reduced-motion collapse never shortens it. |
| `--vela-duration-toast` | `6000ms` | How long a Toast that times out (success or info, with no action) stays before it leaves. A dwell, not an animation: the reduced-motion collapse never touches it, and the timer pauses while the region is hovered or holds focus. Warnings and any toast with an action never time out. |
| `--vela-duration-brand-pulse` | `900ms` | The hero logo only: the pulse of the Pulse mark in the site's Overview hero, played once per visit. The one exception to the under-300ms rule. Never on in-app navigation, never under reduced motion, never at 32px or below, and never bound by a component or by anything a consumer builds with Vela. |
| `--vela-delay-brand-pulse-outer` | `120ms` | The hero logo only: how long after the pulse starts the outer ring of the Pulse mark joins it. Part of the same one-off hero moment as duration-brand-pulse, with the same limits: hero only, once per visit, never under reduced motion, never in a component. |
| `--vela-ease-standard` | `cubic-bezier(0.2, 0, 0.2, 1)` | For things that change or move while on screen: a hover colour, a press, a knob sliding. Never a bare ease. Things that enter take ease-out; the spring is only for the moments a spec names. |
| `--vela-ease-out` | `cubic-bezier(0.25, 1, 0.5, 1)` | For things that enter. Starts at four times the average speed, so the first frame already shows movement, then slows to rest with no overshoot. |
| `--vela-ease-spring` | a spring: stiffness 1200, damping 56, mass 1, drawn over `--vela-duration-travel`; where `linear()` is unsupported, `cubic-bezier(0.25, 1, 0.5, 1)` | A spring for the few moments a spec names, such as the Tabs underline growing under a pressed tab: it arrives quickly and settles with a slight overshoot. The stiffness, damping and mass in the extension are the source; CSS receives them as a linear() easing drawn over duration-travel. Where linear() is not supported, and in any tool that does not read the spring, the value is ease-out. |
<!-- /generated -->

The three new values (`duration-travel`, `ease-out`, `ease-spring`), and the values the specs choose
with them (the overlays' 0.96, the small controls' 0.9, the toast stack's step and scale), were
approved by the owner on 31 October 2026, from recordings of the playground's Motion review page
(`#/motion`); decision 006 records it.

Overlays enter on `--vela-ease-out` and leave on opacity alone; one opened or closed from the
keyboard does not animate (`data-vela-instant`). Popover and Tooltip grow from their trigger —
scale from 0.96 plus opacity, pivoting on Base UI's `--transform-origin` — the Popover at `base`, the
Tooltip at `fast` because it has already waited for the pointer to rest. Dialog appears at `base` on
opacity plus a `--vela-space-5` step of rise. A Toast travels its own height in from the edge it sits
on at `base` and leaves the same way, fading (the one overlay whose exit travels: it goes back where
it came from); the stack behind it steps back and spreads on the spring (`toast.md`, Motion). The
Dropdown List, built after this pass was written, now moves on Popover's rule: it grows from 0.96
from its trigger and leaves on a fade, at `base` (`dropdown-list.md`, Motion; decision 008).
A Tooltip waits `--vela-delay-tooltip` on hover and opens at once on focus; inside one
`TooltipProvider` (a toolbar, a row of Icon Buttons), once one is open its neighbours open at once.
A Toast stays for `--vela-duration-toast`, a dwell and not an animation: paused on hover and
focus, untouched by the reduced-motion collapse, and only when it is a `success` or `info` with no
action; a warning or a toast with an action stays until dismissed.

Only `transform`, `opacity` and `filter` animate (a colour may settle, as a hover does; layout
never moves), and `scripts/check-css.mjs` fails a transition or keyframe that moves anything
else. The one exception is an icon glyph's own strokes, which may draw with `stroke-dashoffset`
by transition inside a `.vela-icon`, under the guards in `foundations/motion.md` (decision 004). Pointer states enter faster than they leave
(hover in at `fast`, out at `base`; press in at `instant`, out at `base`). Transitions, not
keyframes, for anything a person can re-trigger. A state change moves only the part that shows the
state — a Checkbox mark, a Radio dot — and the component that owns the state moves it, never an
Icon prop. No looping attention-seekers — the loading
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

A brand theme for white-label use, which is planned and not built, re-points semantics the same
way. The display face, `--vela-font-family-display`, is the one type setting it may change, for
headlines and brand moments only (*Typography*, above). Until it lands, a host re-points the token
on `:root` or a subtree, under the same rule.

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
Number Stepper, Actions Dropdown, View Switcher, Data Grid (arrow-key cell navigation,
`role="grid"`), Card List. Flag rather than guess. Checkbox (with Checkbox.Group), Radio Group,
Popover, Tooltip, Icon Button, Dialog (with its `alert` variant — the kit's modal), Toast and Dropdown List are
specced and ship from `@omkarux/vela/headless` only (Experimental); Table ships from the core entry (Experimental)
and is read, not navigated cell by cell. The disambiguations agents most often get wrong
— Toggle vs Checkbox, Radio Group vs Select List, Tabs vs View Switcher, Popover vs Tooltip vs
Dialog, Toast vs Alert vs Dialog, Dropdown List vs Select List vs Actions Dropdown, Alert vs Status
Indicator vs Risk Pill — are in `guidelines/overview.md`.

## How to add a component

1. **Spec first** — `guidelines/components/<name>.md` with the sections the tests enforce (Intent → When to use → Props → Hard constraints with `[[rule: …]]` tags → Token bindings → Sizes → States → Accessibility → Figma mapping → Anti-patterns), listed in `overview.md` and `llms.txt`.
2. **Then tokens and tests** — bind existing semantics or add the semantic to the token file (never a primitive, never a raw value); add every new pair to `PAIRS`; a "Responsive behaviour" section in the spec; a fixture per `compiler` rule in `verify-pack.mjs`, a unit test per `runtime` rule, a Playwright spec per `browser` rule; a `scripts/figma/components/<name>.figma.js` builder that passes `npm run components:figma:lint`; a playground entry.
3. **Then verify and record** — `npm run verify` and `npm run test:e2e` green, `npm run checks` so the count on the site is the count CI runs, and a changelog entry. The full path, with who reviews what, is in `CONTRIBUTING.md`.
