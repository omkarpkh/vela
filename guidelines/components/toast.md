# Toast

A short, floating **confirmation that something already happened** — "Policy saved", "Export
started" — raised by the app, announced politely, and gone on its own or when dismissed. It is never
the only record of what it says, never the only place an Undo lives, and never carries a decision.

**Status:** Experimental — born in `@omkarux/vela/headless` (Base UI 1.9); there is no core
implementation, and its Figma set is published in the library (built from
`scripts/figma/components/toast.figma.js`). Approved once the API has settled; see `GOVERNANCE.md`.
**Dependencies:** @base-ui/react (optional peer, via /headless)

## When to use Toast (vs. Contextual Alert, vs. Dialog)

- An action the user just took **has completed**, and the page already shows the result — the row
  updated, the policy listed, the export queued in Reports — and a moment's confirmation helps →
  **Toast**.
- An event or condition the user **must read**, next to the thing it is about, that stays until
  it is resolved — a failed scan, a degraded connector, an error in a form → **Contextual Alert**
  (`contextual-alert.md`), in the page. A toast floats away from its subject and leaves on a timer.
- **Anything that failed** and needs the user to act — a save that did not save, a policy that did
  not apply → the error goes **where the work is**: an Input `error`, a Contextual Alert `major`.
  A toast never reports a failure (see *Hard constraints*, `toast-severity-closed`).
- A **question** — confirm, cancel, choose → **Dialog** (`dialog.md`); a destructive one →
  `variant="alert"`. A toast never asks: it has at most one action, and that action is a shortcut.
- An object's **ongoing** health → **Status Indicator**. A toast describes a moment, not a state.
- **Agentic actions.** When an agent acts on the user's behalf, the record of what it did — and the
  Undo — live in the place the agent's work is reviewed (an activity log, the object's history),
  and a toast may point at it. The toast is the notice, never the ledger.

## Composition

```tsx
<ToastProvider placement="bottom-end">   {/* once, near the root of the app */}
  <App />
</ToastProvider>

// Anywhere below it:
const toast = useToast()

async function save() {
  await savePolicy(policy)
  toast.add({ severity: 'success', title: 'Policy saved', description: 'Block legacy TLS now applies to 14 tenants.' })
}

function remove() {
  archivePolicy(policy)          // the row now shows "Archived", with its own Restore button
  toast.add({
    title: 'Policy archived',
    action: { label: 'Undo', onClick: () => restorePolicy(policy) },   // a shortcut to that Restore
  })
}
```

| Part | Prop | Type | Default | Notes |
|---|---|---|---|---|
| `ToastProvider` | `placement` | `"bottom-end" \| "top-end" \| "bottom-center"` | `"bottom-end"` | **These three only.** Where the region sits. `end` follows the writing direction. |
| | `limit` | `1 \| 2 \| 3` | `3` | **These three only.** How many toasts show at once; older ones wait, hidden, and return as newer ones leave. |
| | `label` | `string` | `"Notifications"` | The region's accessible name — the landmark F6 lands on. |
| | `dismissLabel` | `string` | `"Dismiss"` | The accessible name of every toast's close button. |
| | `children` | `ReactNode` | — | **Required.** The app. |
| `useToast()` | `add` | `(options: ToastOptions) => string` | — | Raises a toast with the options below and returns its id. **Inside a `ToastProvider` only**; outside one `useToast()` throws a named error. |
| | `dismiss` | `(id: string) => void` | — | Dismisses the toast `add` returned that id for. |
| `Toast` | `title` | `string` | — | **Required.** What happened, past tense: "Policy saved". The toast's accessible name. |
| | `description` | `string` | — | One sentence of detail, wired as the toast's description. |
| | `severity` | `"success" \| "info" \| "warning"` | `"info"` | **These three only** — a subset of the Severity taxonomy. |
| | `action` | `{ label: string; onClick: () => void }` | — | **At most one.** A shortcut — "View", "Undo" — to something that also exists on the page. Activating it runs `onClick` and dismisses the toast. |

`Toast` is not a component you render: its rows are `ToastOptions`, what `add` takes. There is no
`<Toast>` element — a toast exists only as something the app raised.

There is no `timeout`, no `duration`, no `priority` and no `id` option: how long a toast stays and
how it is announced follow from its severity and its action (below), not from the caller.

## Hard constraints

- **`title` is required and is a `string`.** It is the toast's accessible name — a toast with no
  title is announced as "dialog" — and it says what happened in words, so the severity is never
  carried by the icon alone. [[rule: toast-title-required | compiler]]
- **`description` is a `string`.** It is read as the toast's description: a sentence, never a
  control or a link. [[rule: toast-description-is-text | compiler]]
- **Three severities: `success`, `info`, `warning`.** A toast confirms something that already
  happened. `minor`, `major` and `critical` describe events the user must read and act on, and
  those belong in a Contextual Alert on the page, where they stay until resolved — not in a surface
  that leaves on a timer. A failure of the user's own action is shown where the work is, not in a
  toast. And a toast's severity is the Severity taxonomy only: `"high"` is a Risk, `"unhealthy"` a
  Status, `"error"` nothing; none compiles. [[rule: toast-severity-closed | compiler]]
- **At most one action, and it has a label.** `action` is one `{ label, onClick }`, never an
  array: two buttons on a toast are a decision, and a decision is a Dialog. The label is a string,
  a verb or "View" — never an icon alone. [[rule: toast-one-action-with-label | compiler]]
- **The caller does not set the timing or the politeness.** `add` takes `title`, `description`,
  `severity` and `action` and nothing else: no `timeout`, no `priority`, no `id`. Both follow from
  the severity and the action, so no toast can be made to vanish in a second or to interrupt. [[rule: toast-options-closed | compiler]]
- **Three placements: `bottom-end`, `top-end`, `bottom-center`.** No start side — in a console the
  start side carries the navigation — no `top-center`, which sits over the page title and the
  global banners, and no physical `bottom-right`: `end` follows the writing direction. [[rule: toast-placement-closed | compiler]]
- **At most three at once.** `limit` is `1`, `2` or `3`. More than three stacked confirmations is a
  log, and a log belongs on a page. [[rule: toast-limit-closed | compiler]]
- **Only a plain confirmation times out.** A `success` or `info` toast with no action leaves after
  `--vela-duration-toast` (6000ms), read from the stylesheet. A `warning`, and **any toast with an
  action**, never times out: it stays until it is dismissed or its action is taken (WCAG 2.2.1,
  Timing Adjustable — an action on a timer is a time limit on a function, and a caveat on a timer is
  one some readers never finish). [[rule: toast-timing-by-severity | runtime]]
- **Hover and focus pause it.** While the pointer is over the region, or focus is inside it, every
  timer stops; leaving resumes each with the time it had left, never a fresh one. So does the
  window losing focus. [[rule: toast-pauses-on-hover-and-focus | runtime]]
- **Every toast is announced politely.** The region is a `role="region"` landmark with
  `aria-live="polite"`; no toast is `role="alert"` or assertive. Politeness is derived from severity
  as on Contextual Alert — `major` and `critical` interrupt, everything else waits — and a toast
  never carries `major` or `critical`, so it never interrupts. [[rule: toast-polite-live-region | runtime]]
- **F6 reaches the region from anywhere.** F6 moves focus to the region (and pauses every timer);
  Tab then moves into the toasts, and Shift+Tab from the region, or the last toast leaving, returns
  focus to where it was. [[rule: toast-region-reachable-f6 | runtime]]
- **A toast never takes focus.** Adding one moves nothing: the user's focus, caret and selection
  stay where they were. [[rule: toast-never-steals-focus | runtime]]
- **Escape dismisses the focused toast** — that one only — and focus moves to the next toast, or back
  to where it was before F6. [[rule: toast-escape-dismisses | runtime]]
- **Every toast can be dismissed.** Each carries a real close button named by `dismissLabel`
  ("Dismiss"), whatever its severity — a toast that cannot be cleared is a banner in the wrong
  place. [[rule: toast-always-dismissible | runtime]]
- **The action is a real button, and it closes the toast.** It renders as a tiny standard Button
  named by its label; activating it calls `onClick` once and dismisses the toast. [[rule: toast-action-runs-and-dismisses | runtime]]
- **`useToast` needs a `ToastProvider`.** Outside one it throws a named error rather than returning
  an `add` that adds to nothing. [[rule: toast-requires-provider | runtime]]
- **The severity mark is decorative.** The icon is `aria-hidden`; the title carries the meaning. [[rule: toast-icon-is-decorative | runtime]]
- **It stays on screen at every width.** The region sits `--vela-space-20` from the viewport's edges
  at its placement, and a toast is `--vela-toast-width` wide, never wider than the viewport less
  those gutters. Only a real layout can show this. [[rule: toast-stays-in-viewport | browser]]
- **It enters from the edge it sits on, by transform and opacity alone.** A new toast travels its
  own height in from its edge as it fades in; nothing in the region animates layout, and every
  movement is a transition, never a keyframe. [[rule: toast-enters-from-its-edge | browser]]
- **The stack collapses, and spreads on hover or focus.** Behind the front toast each older one
  steps back `--vela-space-10` and 5% smaller, its top edge one step above the one in front. While
  the pointer is over the region, or keyboard focus is in it, every toast sits at full size
  `--vela-space-10` beyond the toasts in front of it. Under reduced motion both are reached at
  once. [[rule: toast-stack-collapses-and-spreads | browser]]
- **A collapsed stack never hides a warning.** A warning never times out, so behind another toast it
  would stay out of sight for as long as it lasts. While a warning sits behind the front toast the
  stack stays spread and its title is on screen; a warning in front collapses the stack as usual.
  [[rule: toast-stack-keeps-warnings-in-view | browser]]
- **A toast raised mid-flight re-flows the stack from where it is.** The stack moves by transitions,
  so a second toast turns every movement round from its current position and each toast ends in
  its place. [[rule: toast-stack-reflows-mid-flight | browser]]
- **From the keyboard, nothing in the stack animates.** F6 spreads it at once; Escape, or Enter or
  Space on a toast's button, dismisses that toast at once, and the toasts behind it close up at
  once. [[rule: toast-keyboard-dismiss-is-instant | browser]]
- **A swipe follows the pointer, then carries on out.** Dragged towards the edge it sits on, a toast
  moves with the pointer with no transition between; released past the threshold it continues out
  in that direction from where it was, fading. [[rule: toast-swipe-follows-the-pointer | browser]]
- **A toast confirms; it never decides.** It reports something that has already happened. It does
  not ask a question, does not offer two outcomes, and does not wait on the user to finish a task.
  [[rule: toast-confirms-what-happened | convention]]
- **Never the only record.** What a toast says is also on the page — the updated row, the listed
  policy, the audit entry, the queued export — so a user who never sees it (it timed out, they were
  away, they use a screen reader that was busy) loses nothing. [[rule: toast-never-only-record | convention]]
- **Undo on a toast is only a shortcut.** An Undo (or Restore, or Revert) on a toast must also exist
  in place — on the row, in the object's history — and keep working after the toast is gone. The
  toast's action is the fast path to it, never the only path. [[rule: toast-undo-also-in-place | convention]]

## Token bindings

| Part | Background | Border | Text |
|---|---|---|---|
| toast | `--vela-bg-raised` | `--vela-border-default` | `--vela-text-default` |
| title | — | — | `--vela-text-heading` |
| mark (success · info · warning) | — | — | `--vela-icon-severity-success` · `--vela-icon-severity-info` · `--vela-icon-severity-warning` |
| close button | rest none, hovered `--vela-btn-standard-hover-bg` | — | glyph `--vela-icon-strong` |
| action | the standard tiny Button's own tokens | | |

A toast is the raised surface a Popover uses — there is **no shadow** (no elevation token exists);
the `--vela-border-default` edge separates it from the page (3.47 light, 3.69 dark) and the
container (3.07 / 3.29). The title on `--vela-bg-raised` is 16.98 / 13.10, the description 7.69 /
8.84. The severity mark binds its own severity's icon colour on the raised surface — not on its
severity background, as in a Contextual Alert — asserted in `PAIRS`: success 8.03 / 7.00, info
7.45 / 5.87, warning 5.83 / 9.62. The close glyph is the Dialog's, 7.69 / 8.84 at rest and 5.93 /
7.11 hovered. The action is a **standard** tiny Button, not a text-link: the link colour on the dark
raised surface is 4.35:1 and fails.

Geometry: padding `--vela-space-15`, mark-to-text gap `--vela-space-10`, title-to-description
`--vela-space-5`, the action `--vela-space-10` under the text; radius `--vela-radius-4`; spread
toasts sit `--vela-space-10` apart and collapsed ones step back `--vela-space-10` each; the region sits `--vela-space-20` from the viewport's edges at
`--vela-layer-overlay`. The mark is an `--vela-icon-16` glyph centred in an `--vela-icon-20` box one
body line tall, as on the Contextual Alert, so it sits on the title's line. The close button is
`--vela-control-height-24` square, an `--vela-icon-16` glyph, radius `--vela-radius-3`.

## Sizes

One size: `--vela-toast-width` (360), Title H5 14/21 SemiBold, description Body 14/21. A toast that
needs a second paragraph is a Contextual Alert on the page.

## States

- **Entering / leaving** — see *Motion*.
- **Paused** — while the region is hovered or holds focus; nothing on screen changes.
- **Collapsed / spread** — see *Motion*. Collapsed, the toasts behind the front one show only their
  top edge; spread, every toast is in full view. Both are layouts of the same list: every toast stays
  in the accessibility tree and reachable with Tab in either.
- **Waiting** — past `limit`, an older toast is hidden and inert until a newer one leaves; it keeps
  its place in the queue. This holds for a warning too: `limit` decides what is shown, the stack
  only how.
- **Focus** — the global ring, on the toast itself (it is focusable once the user is in the region)
  and on its buttons; it reaches the region because the portal carries `vela-root`.
- **Close button hover** — the standard hover fill under `@media (hover: hover)`, in at
  `--vela-duration-fast`, out at `--vela-duration-base`.

## Motion

| Moment | What moves | Timing | Why |
|---|---|---|---|
| Appears | opacity, and its own height of travel in from the edge it sits on (`transform`) | `--vela-duration-base` (180ms), `--vela-ease-out` | orientation: it says where it came from |
| The stack moves back | each older toast steps back `--vela-space-10` and 5% smaller (`translate`, `scale`) | `--vela-duration-travel` (240ms), `--vela-ease-spring` | continuity: the same toasts, making room |
| Spreads (hover, focus inside) | every toast to full size, `--vela-space-10` beyond the toasts in front (`translate`, `scale`) | `--vela-duration-travel` (240ms), `--vela-ease-spring` | orientation: the whole stack, readable |
| Leaves | opacity, and its height of travel back out towards its edge | `--vela-duration-base` (180ms), `--vela-ease-out` | it goes back where it came from |
| Swiped away | follows the pointer, then carries on out in the swipe's direction, fading | while dragged: none; released: `--vela-duration-base` | continuity: it does not snap back before it goes |
| From the keyboard | nothing | instant | F6, Tab, Escape, Enter / Space on its buttons: from the keyboard nothing animates |
| Stays | nothing | `--vela-duration-toast` (6000ms), paused on hover and focus | a dwell, not an animation |

How it is built, all in `Toast.css`, from Base UI's own signals:

- **One grid cell holds every toast**, so they overlap, each its natural height, anchored on the edge
  the region sits on. The stack moves on the `translate` and `scale` properties, keyed on Base UI's
  `--toast-index` (0 at the front) and `--toast-offset-y` (the heights of the toasts in front); the
  entrance, the exit and the swipe move on `transform`. The two compose, so a toast can enter while
  the one behind it is still stepping back, and neither restarts the other.
- **Collapsed**, a toast behind the front one is scaled from the edge that shows (its top edge at the
  bottom placements, its bottom edge at `top-end`), so it peeks out by exactly one step for each
  toast in front — when the toasts are the same height. A taller toast behind a shorter one shows
  more of itself. The stack does not clamp heights: that would need `height` to animate, and only
  `transform`, `opacity` and `filter` do. `--toast-height` and `--toast-frontmost-height` are
  therefore not used.
- **Spread** is Base UI's `data-expanded` on the region (the pointer over it, or keyboard focus in
  it), or `data-vela-spread`, which the component sets while a warning is behind the front toast. A
  pointer crossing the gap between two spread toasts is still over the region: each toast extends its
  hover area across the gap nearer its edge.
- **The spring** is the curve the stack moves on because the stack is travel across a distance and
  the same toasts are moving while on screen. Entering and leaving are on `--vela-ease-out`: no
  overshoot on the way in.
- **Swipe** is Base UI's. While the pointer is down it moves the toast with an inline transform and
  no transition; released past its threshold it sets `data-swipe-direction`, and the exit carries on
  from `--toast-swipe-movement-x/y` in that direction. A press that starts on a button never swipes.
- **Keyboard**: a key pressed in the region, or F6 anywhere, marks the region `data-vela-instant`:
  no transition on any toast. A pointer on the region, or a new toast raised by the app, clears it —
  a toast the app raises still enters, wherever focus is.

Under `prefers-reduced-motion` the global collapse in `base.css` applies to every movement here: the
stack collapses and spreads at once. It does not shorten the dwell: `--vela-duration-toast` is a
timer, not a transition. No prop turns any of this on or off; the prop set stays closed. The values
are provisional until reviewed on the Motion review page (`#/motion`).

## Responsive behaviour

The region is **fixed to the viewport**, `--vela-space-20` from the edges at its placement; a toast
is `--vela-toast-width` (360) wide and **never wider than the viewport less those gutters**, so at a
400px viewport it is exactly 360 and below that it narrows. Its title and description **wrap** —
never truncate — and the close button stays on the first line at the end. Like Dialog, the region
is a viewport-level surface and sizes against the viewport, not its container: there is one region
for the app, not one per embedded widget. The newest toast is nearest the edge it sits on, the
older ones collapsed behind it and spread `--vela-space-10` apart on hover or focus (see *Motion*);
past `limit` the oldest wait, hidden. Minimum width: the viewport's, less the
gutters. Density tokens do not exist yet (see `DESIGN.md`); the padding does not change.

## Accessibility

- The region is `role="region"`, named by `label` ("Notifications"), `aria-live="polite"`: a new
  toast's title and description are read when the user is idle, never interrupting.
- Each toast is `role="dialog"` (non-modal), named by its title and described by its description; it
  is focusable once the user is in the region.
- **F6** moves focus to the region from anywhere; **Tab** moves into the toasts and their buttons;
  **Shift+Tab** from the region returns focus to where it was. Tell users about F6 in your app's
  keyboard help: it is the only way a keyboard user can reach a toast before it leaves.
- **Escape** dismisses the focused toast. **Focus is never moved by a toast arriving.**
- Hovering the region, or focus inside it, pauses every timer; a toast with an action, or a
  warning, has no timer at all.
- The severity mark is `aria-hidden`; the title says what happened.

## Implementations

Toast ships from `@omkarux/vela/headless` only. There is no hand-rolled core and none is planned
(`decisions/002-agent-ready-direction`).

| Entry point | Implementation | Dependencies | Status |
|---|---|---|---|
| `@omkarux/vela/headless` | **headless** — Base UI 1.9 `Toast` (`src/headless/Toast`) | **`@base-ui/react` (optional peer, via /headless)** | Experimental |

Where Base UI's defaults differ from this spec, the implementation maps to the spec and the
difference is recorded here:

- **One provider, one hook.** Base UI's `Toast.Provider`, `Toast.Portal`, `Toast.Viewport` and
  `Toast.Root` parts are not exposed: `ToastProvider` renders the region, and `useToast()` wraps
  Base UI's `useToastManager()` as `add` / `dismiss`. Its `update`, `promise`, `toasts` list,
  `createToastManager` (adding from outside React), anchored toasts (`Toast.Positioner`,
  `Toast.Arrow`) and custom `data` are not exposed.
- **Timing.** Base UI's `timeout` (default 5000ms, any number, `0` for never) is set per toast by
  the caller. This spec derives it: `--vela-duration-toast`, read from the stylesheet each time a
  toast is added, for a `success` or `info` toast with no action; `0` — never — for a `warning` or
  any toast with an action. When no stylesheet is loaded the token's own value (6000ms) applies.
- **Politeness.** Base UI's `priority: 'high'` renders an extra visually hidden `role="alert"` copy
  and hides the toast itself from assistive technology until it is focused. This spec never uses it:
  every toast is `priority: 'low'`, announced by the region's polite live region.
- **Pausing.** Base UI pauses every timer on hover over the viewport, on keyboard focus inside it,
  on F6 and while the window is blurred, and resumes with the time remaining. Unchanged, and it is
  what `toast-pauses-on-hover-and-focus` asserts.
- **F6 and Escape.** Base UI listens for F6 on the window while any toast exists, focuses the
  viewport, and closes the toast that holds focus on Escape. Unchanged.
- **Limit.** Base UI keeps toasts past `limit` in its list, marked `data-limited` and `inert`. This
  spec's `limit` is closed to `1 | 2 | 3`, and the stylesheet hides a limited toast until it is back
  under the limit.
- **Close and action buttons.** Base UI's `Toast.Close` is `aria-hidden` unless the stack is
  expanded or it has focus — a stacked-deck design. Vela's toasts are a flat list, so the close
  button and the action are Vela's own buttons calling the manager's `close`, never hidden from
  assistive technology. The action is the kit's tiny standard `Button`.
- **Stack.** Base UI exposes CSS variables (`--toast-index`, `--toast-offset-y`, `--toast-height`,
  `--toast-frontmost-height`) and `data-expanded` for a collapsed, expand-on-hover deck. This spec
  uses the index, the offset and `data-expanded`; it does not clamp a stacked toast to the front
  one's height (that would animate `height`). It adds one thing Base UI does not have: the stack
  stays spread while a warning is behind the front toast (`toast-stack-keeps-warnings-in-view`).
- **Swipe.** Base UI dismisses on a swipe (`down` and `right` by default), at every placement this
  spec allows (it turns swipe off only for anchored toasts, which are not exposed). This spec swipes
  toward the edge a toast sits on: `right` or `down` at `bottom-end`, `right` or `up` at `top-end`, `down` at
  `bottom-center`. Swipe directions are physical in Base UI, so in a right-to-left document the
  `end` placements still swipe right; this is recorded as a gap, not a feature.
- **Portal and theme.** As Popover: the portal element carries `vela-root`, and the `data-theme` of
  the provider's nearest themed ancestor, re-read every time a toast is added — so the region follows
  a theme switch made after the provider mounted.
- **With a Dialog open.** A Dialog makes everything outside itself inert, the toast region included,
  and its scrim covers the region. A toast raised while a Dialog is open waits behind it; raise the
  toast after the Dialog closes — the Dialog was the decision, the toast is its receipt.
- **Extra attributes.** Base UI adds `data-starting-style` / `data-ending-style`, `data-type` (the
  severity), `data-swiping`, `data-swipe-direction`, `data-expanded` (on the region and each toast), focus-guard `<span>`s and
  `data-base-ui-*` markers; ids are Base UI's. None is part of the contract.

## Figma mapping

Library file: **Vela Design System** → page `Toast`. Three variants, `Severity` (success / info /
warning), plus `Description` and `Action` booleans. There is no `Title text` property: a Figma text
property holds one default for the whole set, and each severity's example is titled differently, so
each variant keeps its title in a layer named `Title`, overridden on the instance. The set is
created by `scripts/figma/components/toast.figma.js`; it is published in the
library. The region, the placement and the stack are not part of the set: place
instances `space/10` apart, `space/20` from the frame's edge.

| Figma property | Code prop |
|---|---|
| `Severity` | `severity` |
| `Title` (text layer, overridden on the instance) | `title` |
| `Description` (boolean) | `description` |
| `Action` (boolean) | `action` — presence of the object, not a flag |

**The timer, the pause on hover and focus, F6, Escape, the live region and the limit exist only in
code. The toast fills `surface/raised`, strokes `border/default`, rounds at `radius/4` and is
`toast/width` wide; the mark binds `severity/<severity>/icon`, the title `text/heading`, the
description `text/default`, the close glyph `icon/strong`; the action is drawn from the standard
button tokens at `control-height/24`.** Nothing in this component is literal.

## Anti-patterns

- ❌ A toast as the only record of what happened → put it on the page too (the row, the history, the log); the toast is the notice.
- ❌ An Undo that exists only on the toast → the Undo lives in place and keeps working after the toast is gone; the toast's action is a shortcut to it.
- ❌ A toast that asks ("Delete this policy?") or offers two buttons → a Dialog, `variant="alert"` if it destroys anything.
- ❌ `severity: 'critical'` or `'major'` → will not compile; an event that must be read and resolved is a Contextual Alert on the page.
- ❌ "Save failed" in a toast → the error belongs where the work is: an Input `error` or a Contextual Alert.
- ❌ `severity: 'high'` or `'unhealthy'` → will not compile; those are the Risk and Status taxonomies.
- ❌ `timeout: 2000` to make it go faster → will not compile; the timing follows from severity and action.
- ❌ A `ToastProvider` per widget or per page section → one region for the app, near the root.
- ❌ A toast raised while a Dialog is still open → close the Dialog first; the toast is the receipt.
- ❌ A shadow added in your own CSS → no elevation token exists; the border is the edge.
