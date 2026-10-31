# Popover

A small **non-modal** panel anchored to the button that opened it — filters for a table, the
detail behind a count, a short form that edits one thing — dismissed by Escape, by a press
outside, or by the trigger again, with the rest of the page still usable.

**Status:** Experimental — born in `@omkarux/vela/headless` (Base UI 1.9) with Tooltip and Dialog;
there is no core implementation, and its Figma set is published in the library (built from
`scripts/figma/components/popover.figma.js`). Approved once the API has settled; see `GOVERNANCE.md`.
**Dependencies:** @base-ui/react (optional peer, via /headless)

## When to use Popover (vs. Tooltip, vs. Dialog)

- A panel the user **opens on purpose** and may **act in** — a filter set, a column picker, a
  short edit — while the page behind stays usable → **Popover**.
- A short **label or hint** on hover or focus, text only, nothing to act on → **Tooltip**
  (`tooltip.md`). If the trigger's purpose is to open the panel, it is a Popover; if the trigger
  does something else and the text only explains it, it is a Tooltip.
- A **decision that blocks the task** — confirm, fill in, or cancel before anything else happens
  → **Dialog** (`dialog.md`). A popover never traps focus and never locks the page.
- A list of **commands** that open from a button (Edit / Duplicate / Delete) → an Actions
  Dropdown, which is **not in this kit**. Flag the gap; do not build a menu out of a Popover.
- A picker of **one value from many** → a Select List, **not in this kit**. Flag it.
- Anything the user must see to do the task — an error, the only copy of a key — is never only
  in a Popover: the page has to carry it.

## Composition

```tsx
<Popover
  trigger={<Button>Filters</Button>}
  title="Filter alerts"
  placement="bottom"
  align="start"
  onOpenChange={setFiltersOpen}
>
  <Checkbox.Group label="Severity" defaultValue={['critical']}>
    <Checkbox value="critical" label="Critical" />
    <Checkbox value="major" label="Major" />
  </Checkbox.Group>
</Popover>
```

| Part | Prop | Type | Default | Notes |
|---|---|---|---|---|
| `Popover` | `trigger` | `ReactElement` | — | **Required.** The one element that opens it — a `Button` or a native `<button>`. It keeps its own props; the popover adds `aria-expanded`, `aria-haspopup` and the toggle. |
| | `title` | `string` | — | **Required.** Rendered as the popover's heading and wired as its accessible name. |
| | `placement` | `"top" \| "bottom" \| "start" \| "end"` | `"bottom"` | **These four only.** The side of the trigger. `start` / `end` follow the writing direction. It flips to the opposite side when there is no room. |
| | `align` | `"start" \| "center" \| "end"` | `"center"` | **These three only.** Where it lines up along that side. |
| | `size` | `"regular" \| "wide"` | `"regular"` | **These two only.** The width: `--vela-popover-width` (280) or `--vela-popover-width-wide` (400). |
| | `open` | `boolean` | — | Controlled. Exclusive with `defaultOpen`. |
| | `defaultOpen` | `boolean` | `false` | Uncontrolled initial state. Exclusive with `open`. |
| | `onOpenChange` | `(open: boolean) => void` | — | Receives the **next** state. |
| | `children` | `ReactNode` | — | The body, under the title. It scrolls when the room runs out; the title stays. |

## Hard constraints

- **`title` is required and is a `string`.** The popup is a `role="dialog"`, and an unnamed
  dialog is announced as "dialog" and nothing else. [[rule: popover-title-required | compiler]]
- **`trigger` is required.** A popover is anchored to the element that opened it; there is no
  free-floating popover. [[rule: popover-trigger-required | compiler]]
- **Controlled and uncontrolled are exclusive.** Pass `open` **or** `defaultOpen`; both is a
  build failure, as on Tabs. [[rule: popover-controlled-exclusive | compiler]]
- **Four placements, three alignments.** `top`, `bottom`, `start`, `end` and `start`, `center`,
  `end`. There is no `left` / `right` (use the logical `start` / `end`) and no `auto` — it flips on
  its own. [[rule: popover-placement-closed | compiler]]
- **Two sizes.** `regular` and `wide`. There is no `small`, no `full`. [[rule: popover-sizes-closed | compiler]]
- **Focus moves in on open and back to the trigger on close.** The first control in the popover
  takes focus (the popup itself when it has none); Escape or the trigger returns it to the trigger,
  so a keyboard user never loses their place. [[rule: popover-focus-in-and-back | runtime]]
- **Escape and a press outside close it.** Both, every time — a popover the user cannot dismiss
  is a Dialog wearing the wrong name. [[rule: popover-dismiss-escape-outside | runtime]]
- **It is non-modal.** The page behind is neither hidden from assistive technology nor scroll
  locked, and focus is not trapped: Tab leaves the popover. [[rule: popover-is-non-modal | runtime]]
- **It is named by its title.** `role="dialog"` with `aria-labelledby` pointing at the rendered
  heading. [[rule: popover-named-by-title | runtime]]
- **Never the only copy of information the page needs.** A popover is closed most of the time; an
  error, a status or a value the task depends on lives on the page. [[rule: popover-never-only-copy | convention]]
- **It grows from its trigger, by transform and opacity alone.** Opened with a pointer it scales
  from 0.96 to full size as it fades in, pivoting on Base UI's `--transform-origin` — the point on
  the popup nearest the trigger — so it comes out of the button whichever side it opens on. [[rule: popover-grows-from-its-trigger | browser]]
- **Closed and reopened mid-flight, it turns round.** The motion is a transition, so a press that
  reopens it while it is still fading out brings the same popup back from where it is, and it ends
  open and at rest. [[rule: popover-reopen-mid-flight | browser]]
- **From the keyboard it does not animate.** Enter or Space on the trigger opens it, and Escape
  closes it, at once. [[rule: popover-keyboard-is-instant | browser]]
- **Under reduced motion it is at its end state.** Open is full size and opaque; closed is gone. [[rule: popover-motion-reduced-end-state | browser]]

## Token bindings

| Part | Background | Border | Text |
|---|---|---|---|
| popup | `--vela-bg-raised` | `--vela-border-default` | `--vela-text-default` |
| title | — | — | `--vela-text-heading` |

Radius `--vela-radius-4` (the default scope: a popover is a card that floats). Padding
`--vela-space-15`; title-to-body gap `--vela-space-10`; the gap to the trigger is
`--vela-space-5`, written as padding on the positioner's trigger-facing side so no number lives in
the JavaScript. The popup sits at `--vela-layer-overlay`. **There is no shadow**: no elevation token
exists, and the kit does not invent one — the `--vela-border-default` edge is what separates the
popover from what it floats over, and it is asserted in `PAIRS` against the page (3.47 light, 3.69
dark) and the container (3.07 light, 3.29 dark). The body text on `--vela-bg-raised` is asserted at
7.69 light and 8.84 dark, the title at 16.98 and 13.10. Body copy is `--vela-text-default`, never
`--vela-text-de-emphasized`: grey-500 on the dark raised surface is 3.99:1 and fails.

## Sizes

| size | Width | Title | Body |
|---|---|---|---|
| regular | `--vela-popover-width` (280) | H5 14/21 SemiBold | Body 14/21 |
| wide | `--vela-popover-width-wide` (400) | H5 14/21 SemiBold | Body 14/21 |

## States

- **Open / closed** — the trigger carries `aria-expanded`; nothing else changes on it.
- **Focus** — the global ring (`.vela-root :focus-visible`), which reaches the popup because the
  portal element carries `vela-root` (see Implementations).
- **Motion** — see below.

## Motion

| Moment | What moves | Timing | Why |
|---|---|---|---|
| Appears | opacity, and scale from 0.96, pivoting on the point nearest the trigger | `--vela-duration-base` (180ms), `--vela-ease-out` | orientation: it grows out of the button that opened it |
| Leaves | opacity only, at full size | `--vela-duration-base` (180ms) | softer than it arrived; it is going nowhere |
| From the keyboard | nothing | instant | Escape, or Enter / Space on the trigger: from the keyboard nothing animates |

`--vela-duration-base`, not `fast`: a popover is opened deliberately, a few times a day, and carries
content to read — it is something that appears, which is what `base` is for. The 4% of scale is
the whole movement, about 11px across a 280px popover, so on `--vela-ease-out` it is most of the
way there in the first frames. Under `prefers-reduced-motion` the global collapse in `base.css`
applies; the popover reads correctly frozen at either end. The values were approved on 31 October 2026, from the Motion review page (`#/motion`); decision 006.

## Responsive behaviour

The popover is **never wider or taller than the room beside its trigger**: its width is the size
token capped at the available width, and its height is capped at the available height, past which
the body scrolls and the title stays. It **flips** to the opposite side when the preferred one has
no room, and shifts along the side to stay inside the viewport (Base UI's collision padding, 5px
from the edge — its default, which happens to equal the `--vela-space-5` step; not a binding). Minimum width: whatever the host leaves — in a 400px embed a `wide` popover is as wide as the
space allows and its body wraps; nothing clips and nothing truncates. Density tokens do not exist
yet (see `DESIGN.md`, *Responsive and density*); until they do, the two sizes are the only width
control and the padding does not change.

## Accessibility

- The trigger is the element you pass, with `aria-haspopup="dialog"`, `aria-expanded` and
  `aria-controls` added; it opens on click, Enter and Space, as a button does.
- The popup is `role="dialog"`, named by its heading through `aria-labelledby`.
- **Focus** moves to the first control in the popup on open — the popup itself when there is none
  — and back to the trigger on close. It is not trapped: Tab moves on through the page, and the
  popover closes when focus leaves it.
- **Escape** closes it; so does a press outside. The page behind keeps its accessibility tree and
  its scroll.

## Implementations

Popover ships from `@omkarux/vela/headless` only. There is no hand-rolled core and none is planned
(`decisions/002-agent-ready-direction`).

| Entry point | Implementation | Dependencies | Status |
|---|---|---|---|
| `@omkarux/vela/headless` | **headless** — Base UI 1.9 `Popover` (`src/headless/Popover`) | **`@base-ui/react` (optional peer, via /headless)** | Experimental |

Where Base UI's defaults differ from this spec, the implementation maps to the spec and the
difference is recorded here:

- **Trigger.** Base UI's compound `Popover.Trigger` is not exposed; `trigger` is one element,
  rendered through the Trigger's `render` prop, so a Vela `Button` keeps its own behaviour and
  Base UI adds the ARIA and the toggle. Base UI's detached triggers, handles and payloads are not
  exposed.
- **Placement.** Base UI's `side` takes four physical and two logical values; this spec exposes
  four, all logical (`start` / `end` are Base UI's `inline-start` / `inline-end`). `align` is Base
  UI's, unchanged.
- **Offset.** Base UI's `sideOffset` is a number of pixels in JavaScript. This spec writes the gap
  as `--vela-space-5` padding on the positioner's trigger-facing side (keyed on Base UI's
  `data-side`), so the spacing scale stays the only place the value lives.
- **Portal and theme.** Base UI portals the popup to `<body>`, outside the `.vela-root` the trigger
  sits in and outside any `data-theme` subtree. The portal element carries `vela-root` itself (the
  font, the global focus ring and the reduced-motion collapse reach the popup), and on mount copies
  the `data-theme` of the trigger's nearest themed ancestor — a popover opened from a dark sidebar
  in a light app is dark.
- **Not exposed.** Base UI's `modal` (a popover here is always non-modal; a modal one is a Dialog),
  `openOnHover` (an infotip that opens on hover is still a Popover, but the kit has not specced
  it — flag it), `Popover.Arrow` (Vela overlays are flat) and `Popover.Close` (Escape, a press
  outside and the trigger close it).
- **Keyboard and motion.** Base UI animates every open and close; this implementation marks one
  that came from the keyboard with `data-vela-instant`, and the stylesheet skips the transition.
  The pivot of the grow is Base UI's `--transform-origin`, written on the positioner and inherited
  by the popup; no JavaScript of Vela's measures anything.
- **Extra attributes.** Base UI adds `data-open` / `data-closed`, `data-side`, `data-align`,
  focus-guard `<span>`s and `data-base-ui-*` markers; ids are Base UI's. None is part of the
  contract.

## Figma mapping

Library file: **Vela Design System** → page `Popover`. Two variants, `Size` (regular / wide), plus
a `Title text` text property. The set is created by `scripts/figma/components/popover.figma.js`;
it is published in the library. Place an instance
beside the Button it belongs to; the anchoring is code.

| Figma property | Code prop |
|---|---|
| `Size` | `size` |
| `Title text` | `title` |

**Placement, alignment, flipping, focus and dismissal have no Figma expression: they exist only in
code. The popup fills `surface/raised`, strokes `border/default`, rounds at `radius/4` and is
`popover/width` (or `/width-wide`) wide; the title binds `text/heading` and the body `text/default`.**
Nothing in this component is literal.

## Anti-patterns

- ❌ A Popover holding the only copy of an error, a status or a value the task needs → put it on the page.
- ❌ A list of commands (Edit / Duplicate / Delete) in a Popover → an Actions Dropdown, not in this kit; flag the gap.
- ❌ A Popover that must be answered before anything else → that is a Dialog.
- ❌ A Popover opened on hover to show a label → that is a Tooltip.
- ❌ `<Popover>` with no `title` → will not compile; an unnamed dialog is announced as "dialog".
- ❌ `placement="left"` or `placement="auto"` → the set is `top | bottom | start | end`, and it flips on its own.
- ❌ A shadow added in your own CSS → no elevation token exists; the border is the edge.
- ❌ A non-button `trigger` (a `<div>` or a `<span>`) → no role, no keyboard; pass a Button.
