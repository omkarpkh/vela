# Tooltip

A short **supplementary label** for a control — what an abbreviated or iconic action does, the
full text of a truncated value — shown on hover after a short rest and at once on keyboard focus,
dismissed by Escape. **Text only.** A user who never sees it misses nothing they need.

**Status:** Experimental — born in `@omkarux/vela/headless` (Base UI 1.9) with Popover and Dialog;
there is no core implementation, and its Figma set is published in the library (built from
`scripts/figma/components/tooltip.figma.js`). Approved once the API has settled; see `GOVERNANCE.md`.
**Dependencies:** @base-ui/react (optional peer, via /headless)

## When to use Tooltip (vs. Popover, vs. inline text)

- A **phrase that explains a control** the user can already operate — "Download the last 24 hours
  as CSV" on an Export button → **Tooltip**.
- Anything the user can **act in** — a link, a button, a checkbox, a form → **Popover**
  (`popover.md`). A tooltip closes the moment the pointer leaves; nothing in it can be reached.
- An **infotip** behind an ⓘ icon, whose only job is to show the text → a **Popover**: the
  trigger's purpose is opening the panel, and a touch user can open a Popover but never sees a
  tooltip.
- Information the task **depends on** — a requirement, an error, why a control is disabled →
  **inline text** beside the control (Input's `hint`, Checkbox's `description`). Tooltips are
  hidden from touch users and are not reliably announced.
- An **icon-only** control's name → its `aria-label`. A tooltip may show the same words to sighted
  users, but it is never what names the control (see Hard constraints).

## Composition

```tsx
<Tooltip content="Download the last 24 hours as CSV" placement="top">
  <Button>Export</Button>
</Tooltip>
```

| Part | Prop | Type | Default | Notes |
|---|---|---|---|---|
| `Tooltip` | `content` | `string` | — | **Required.** The text. A string: a tooltip never holds a link, a button, a list or bold. |
| | `children` | `ReactElement` | — | **Required.** The **one** element it describes — a `Button`, a native `<button>`, a link. It keeps its own accessible name. |
| | `placement` | `"top" \| "bottom" \| "start" \| "end"` | `"top"` | **These four only**, as Popover. It flips when there is no room. |
| | `align` | `"start" \| "center" \| "end"` | `"center"` | **These three only.** |

## Hard constraints

- **`content` is a `string`, and it is required.** Not `ReactNode`: a tooltip that could hold a
  link or a button would hold one, and nothing in it can be reached before it closes. [[rule: tooltip-content-is-text | compiler]]
- **It wraps exactly one element.** `children` is a single `ReactElement` — not a string, not a
  fragment of two — because the tooltip attaches its listeners and its description to that one
  element. [[rule: tooltip-wraps-one-element | compiler]]
- **Four placements, three alignments**, the Popover sets. No `left` / `right`, no `auto`. [[rule: tooltip-placement-closed | compiler]]
- **The trigger is named by itself, never by the tooltip.** The element needs its own accessible
  name — visible text or an `aria-label` — and the component throws a named error when it has
  none. An icon-only Button carries `aria-label`; the tooltip may repeat the words for sighted
  users. [[rule: tooltip-trigger-has-own-name | runtime]]
- **The tooltip is a description.** The popup is `role="tooltip"`, and while it is rendered the
  trigger's `aria-describedby` points at it — and only then: no dangling reference when it is
  closed, and any description the trigger already had is kept. [[rule: tooltip-is-a-description | runtime]]
- **Hover waits, focus does not.** On hover it opens after `--vela-delay-tooltip` (600ms), read from
  the stylesheet, so a pointer crossing a toolbar does not flash every label; on keyboard focus it
  opens at once. [[rule: tooltip-opens-on-hover-and-focus | runtime]]
- **Escape dismisses it** without moving focus or closing anything else. [[rule: tooltip-escape-dismisses | runtime]]
- **Never on a disabled control.** A disabled button takes no focus and, in most browsers, no
  pointer events, so its tooltip is unreachable — and why a control is disabled belongs in
  adjacent text (`DESIGN.md`, *States*). If a design insists, wrap the control in a focusable
  `<span tabIndex={0}>` with its own name and put the tooltip on that, and say so in review. [[rule: tooltip-not-on-disabled | convention]]
- **Supplementary only.** Touch users never see a tooltip (Base UI disables them on touch), so it
  never carries the only copy of anything. [[rule: tooltip-supplementary-only | convention]]
- **In forced colours it keeps an edge.** The fill is replaced by `Canvas`, so the popup takes a
  1px `CanvasText` border. [[rule: tooltip-forced-colours | browser]]
- **It grows from its trigger, by transform and opacity alone.** Opened by a resting pointer it
  scales from 0.96 to full size as it fades in, pivoting on Base UI's `--transform-origin` — the
  edge nearest the trigger. [[rule: tooltip-grows-from-its-trigger | browser]]
- **Closed and reopened mid-flight, it turns round.** A pointer that comes back while it is fading
  out brings the same tooltip back from where it is; it ends open and at rest. [[rule: tooltip-reopen-mid-flight | browser]]
- **From the keyboard it does not animate.** Focus opens it, and Escape closes it, at once. [[rule: tooltip-keyboard-is-instant | browser]]
- **Under reduced motion it is at its end state.** Open is full size and opaque; closed is gone. [[rule: tooltip-motion-reduced-end-state | browser]]

## Token bindings

| Part | Background | Text |
|---|---|---|
| popup | `--vela-bg-tooltip` | `--vela-text-tooltip` |

The one inverted surface in the kit: `--vela-text-tooltip` (white) on `--vela-bg-tooltip` (grey-800
light, grey-700 dark), asserted in `PAIRS` at 11.14 light and 7.69 dark. The tooltip's own edge
against the page is deliberately not a pair: it is not a control boundary, and the text carries it.
Text Meta 12/18; padding `--vela-space-5` `--vela-space-10`; radius `--vela-radius-4`; at most
`--vela-tooltip-width-max` (240) wide, past which the text wraps. The gap to the trigger is
`--vela-space-5`, written as positioner padding as on Popover; the popup sits at
`--vela-layer-overlay`. The hover delay is `--vela-delay-tooltip`.

## Sizes

One size. A tooltip is a phrase in Meta 12/18; it wraps at `--vela-tooltip-width-max` (240) and
never grows a second size for a second paragraph — a second paragraph is a Popover.

## States

- **Closed / open** — nothing on the trigger changes except `aria-describedby` while open.
- **Hover** — opens after `--vela-delay-tooltip`; moving the pointer onto the tooltip keeps it
  open (WCAG 1.4.13, hoverable), moving off both closes it.
- **Focus** — keyboard focus opens it at once; blur closes it.
- **Motion** — see below.

## Motion

| Moment | What moves | Timing | Why |
|---|---|---|---|
| Appears on hover | opacity, and scale from 0.96, pivoting on the edge nearest the trigger | `--vela-duration-fast` (120ms), `--vela-ease-out`, after `--vela-delay-tooltip` | feedback that the rest registered, coming from the control it labels |
| Leaves | opacity only | `--vela-duration-fast` (120ms) | continuity |
| From the keyboard | nothing | instant | focus opens it and Escape closes it with no transition |

`--vela-duration-fast`, not `base`, and faster than Popover: a tooltip has already waited
`--vela-delay-tooltip` (600ms) for the pointer to rest, it is a few words rather than content, and it
is crossed many times a day; 180ms more before the label is readable reads as lag. The values were approved on 31 October 2026, from the Motion review page (`#/motion`); decision 006.

## Responsive behaviour

The tooltip is **as wide as its text up to `--vela-tooltip-width-max`** (240) and never wider than
the room beside the trigger; past either it wraps, a word per line at worst, and never truncates.
It **flips** to the opposite side when there is no room and shifts along the side to stay on
screen. In a 400px embed nothing changes: a tooltip is already narrower than any host the kit
targets. There is no density step for it; density tokens do not exist yet (see `DESIGN.md`).

## Accessibility

- The popup is `role="tooltip"`; while it is shown, the trigger's `aria-describedby` names it.
- The trigger keeps its own **name** — text or `aria-label` — and the component refuses a trigger
  without one. Screen readers announce the name, then the tooltip as a description.
- Opens on hover (after the delay) and on keyboard focus (at once); Escape closes it; it is
  hoverable, so a pointer can move onto it to read it, and it closes when both are left.
- Disabled on touch: a touch user never sees it, which is why it may never be the only copy.

## Implementations

Tooltip ships from `@omkarux/vela/headless` only. There is no hand-rolled core and none is planned
(`decisions/002-agent-ready-direction`).

| Entry point | Implementation | Dependencies | Status |
|---|---|---|---|
| `@omkarux/vela/headless` | **headless** — Base UI 1.9 `Tooltip` (`src/headless/Tooltip`) | **`@base-ui/react` (optional peer, via /headless)** | Experimental |

Where Base UI's defaults differ from this spec, the implementation maps to the spec and the
difference is recorded here:

- **A description, not a visual-only label.** Base UI treats a tooltip as visual only: no role on
  the popup and nothing on the trigger, and it asks the author to give the trigger an `aria-label`.
  This spec keeps the `aria-label` requirement — and enforces it with a named error — and also
  makes the popup `role="tooltip"` wired by `aria-describedby` while it is rendered, so a
  screen-reader user who focuses the control hears the extra words too.
- **Delay.** Base UI's `delay` (default 600ms) is a number in JavaScript. This spec's delay is the
  `--vela-delay-tooltip` token, read from the trigger's computed style when it mounts; when no
  stylesheet is loaded Base UI's own default applies, and the token is set to that same value.
- **Focus opens at once.** Base UI opens a tooltip on keyboard focus without the hover delay; this
  spec keeps that — the delay exists to stop a pointer crossing a toolbar from flashing labels,
  which focus never does.
- **Content.** Base UI's popup takes any node; this spec's `content` is a `string`.
- **Trigger.** Base UI's compound `Tooltip.Trigger` is not exposed: `children` is one element,
  rendered through the Trigger's `render` prop. `Tooltip.Provider` (shared delay groups),
  `Tooltip.Arrow`, `trackCursorAxis`, handles and controlled `open` are not exposed.
- **Placement, offset, portal, theme.** As Popover: logical `start` / `end`, the gap as positioner
  padding, and the portal carries `vela-root` and the trigger's `data-theme`.
- **Extra attributes.** Base UI adds `data-instant` (honoured: a focus-opened tooltip does not
  animate), `data-side`, `data-align`, `tabindex="-1"` on the popup and `data-base-ui-*` markers;
  none is part of the contract.

## Figma mapping

Library file: **Vela Design System** → page `Tooltip`. Two variants, `Lines` (one / two), each
with its own sentence in a text layer named `Content`. There is no `Content` text property: a Figma
text property holds one default for the whole set, so it cannot carry a different sentence per
variant. `Lines` is not a prop: a one-line tooltip hugs its text and a two-line one
is `tooltip/width-max` wide and wraps, which is the only place the cap is visible in the file. There
is no placement axis: without an arrow — Vela overlays carry none — the four placements look the
same. The set is created by `scripts/figma/components/tooltip.figma.js`; it is published in
the library.

| Figma property | Code prop |
|---|---|
| `Content` (text layer, override on the instance) | `content` |
| `Lines` | none — the length of `content` decides where it wraps |

**The delay, the hover and focus triggers, Escape and the aria-describedby wiring exist only in
code. The popup fills `surface/tooltip`, rounds at `radius/4`, pads `space/5` by `space/10`, and its
text binds `text/tooltip` in Body/Meta.** Nothing in this component is literal.

## Anti-patterns

- ❌ A link, a button or a list in a tooltip → will not compile; that is a Popover.
- ❌ A tooltip as the only name of an icon-only control → give the control an `aria-label`; the component throws without one.
- ❌ A tooltip explaining why a control is disabled → say it in adjacent text; a disabled control cannot show a tooltip.
- ❌ An infotip (ⓘ) that only opens a tooltip → a Popover, so touch and screen-reader users can open it.
- ❌ A requirement or an error in a tooltip → inline text; touch users never see a tooltip.
- ❌ `<Tooltip content="…">Export</Tooltip>` around a bare string → will not compile; wrap one element.
- ❌ A paragraph in a tooltip → a Popover; a tooltip is a phrase.
