# Dialog

A **modal** window for a decision that blocks the task — edit one thing and save, or cancel — with
the page behind it dimmed, inert and scroll-locked until it closes. Its `alert` variant
confirms a destructive or irreversible action, with an explicit way out.

**Status:** Experimental — born in `@omkarux/vela/headless` (Base UI 1.9) with Popover and Tooltip;
there is no core implementation, and its Figma set is built in the library file (from
`scripts/figma/components/dialog.figma.js`) but not published yet. Approved once the API has settled and the set is
published; see `GOVERNANCE.md`.
**Dependencies:** @base-ui/react (optional peer, via /headless)

## When to use Dialog (vs. Popover, vs. a page)

- The user must **answer before going on** — save or discard an edit, name a new policy, choose
  between two outcomes → **Dialog**.
- The answer **destroys or cannot be undone** — delete a policy, revoke every session, wipe a
  device → **Dialog `variant="alert"`**: a question, a safe cancel, and a destructive confirm.
- A panel the user may consult **while the page stays usable** — filters, details, a quick edit
  that does not block → **Popover** (`popover.md`).
- A long form, a multi-step flow, or anything the user would want a URL for → a **page** (or a
  side panel, which is **not in this kit**), not a Dialog. A dialog that scrolls for screens is a
  page in the wrong container.
- A message the user should read but need not answer → a **Contextual Alert** on the page
  (`contextual-alert.md`). A dialog that only says "OK" interrupts for nothing.
- A notification that comes and goes on its own, confirming something already done → **Toast**
  (`toast.md`). A toast never asks; a question is a Dialog.

## Composition

```tsx
<Dialog
  trigger={<Button>Edit Policy</Button>}
  title="Edit policy"
  description="Changes apply to every tenant on save."
  footer={
    <>
      <Dialog.Close><Button>Cancel</Button></Dialog.Close>
      <Button variant="primary" onClick={save}>Save Changes</Button>
    </>
  }
>
  <Input label="Policy name" defaultValue="Block legacy TLS" />
</Dialog>

<Dialog
  variant="alert"
  trigger={<Button variant="destructive">Delete Policy</Button>}
  title="Delete “Block legacy TLS”?"
  description="Its 14 rules stop applying at once. This cannot be undone."
  cancelLabel="Keep Policy"
  confirmLabel="Delete Policy"
  onConfirm={deletePolicy}
/>
```

| Part | Prop | Type | Default | Notes |
|---|---|---|---|---|
| `Dialog` | `variant` | `"standard" \| "alert"` | `"standard"` | **These two only.** `alert` is for a destructive or irreversible confirmation. |
| | `title` | `string` | — | **Required.** Rendered as the dialog's heading and wired as its accessible name. |
| | `description` | `string` | — | A sentence under the title, wired by `aria-describedby`. |
| | `size` | `"regular" \| "wide"` | `"regular"` | **These two only.** The width: `--vela-dialog-width` (480) or `--vela-dialog-width-wide` (720). |
| | `trigger` | `ReactElement` | — | The element that opens it — a `Button`. Omit it when `open` is driven from elsewhere. |
| | `open` | `boolean` | — | Controlled. Exclusive with `defaultOpen`. |
| | `defaultOpen` | `boolean` | `false` | Uncontrolled initial state. Exclusive with `open`. |
| | `onOpenChange` | `(open: boolean) => void` | — | Receives the **next** state. |
| | `children` | `ReactNode` | — | The body. It scrolls; the header and the footer stay. |
| | `footer` | `ReactNode` | — | **`standard` only.** The actions, right-aligned. Wrap one in `Dialog.Close` to close on click. |
| | `closeLabel` | `string` | `"Close"` | **`standard` only.** The accessible name of the header's close button. |
| | `cancelLabel` | `string` | — | **Required with `alert`.** The safe action: focused on open, and what Escape does. |
| | `confirmLabel` | `string` | — | **Required with `alert`.** The destructive action, verb-first ("Delete Policy"). |
| | `onConfirm` | `() => void` | — | **Required with `alert`.** Called on confirm; the dialog then closes. |
| `Dialog.Close` | `children` | `ReactElement` | — | **Required.** The one element that closes the dialog when activated. Inside a `Dialog` only. |

## Hard constraints

- **`title` is required and is a `string`.** A dialog with no name is announced as "dialog" and
  nothing else. [[rule: dialog-title-required | compiler]]
- **`description` is a `string`.** It is read as the dialog's description, so it holds a sentence,
  not controls; controls go in the body. [[rule: dialog-description-is-text | compiler]]
- **Controlled and uncontrolled are exclusive.** `open` **or** `defaultOpen`, as on Popover. [[rule: dialog-controlled-exclusive | compiler]]
- **Two sizes, two variants.** `regular` / `wide` and `standard` / `alert`. There is no `small`,
  no `fullscreen`, no `sheet`. [[rule: dialog-props-closed | compiler]]
- **An alert has an explicit cancel and a confirm.** `variant="alert"` without `cancelLabel`,
  `confirmLabel` or `onConfirm` does not compile: a destructive question needs a named way out and
  a named way through. [[rule: alert-dialog-requires-cancel-and-confirm | compiler]]
- **An alert's actions are fixed.** `footer` and `closeLabel` do not compile with `alert`: the
  component renders the cancel and a confirm that is **always a `destructive` Button**, so a
  destructive confirmation can never be styled as a safe one. [[rule: alert-dialog-actions-are-fixed | compiler]]
- **The confirm is destructive and the cancel takes focus.** In an alert the confirm renders as
  `variant="destructive"`, and focus lands on the cancel when it opens — Enter on a dialog that just
  appeared must never destroy anything. [[rule: alert-dialog-cancel-first | runtime]]
- **Focus is trapped and comes back.** On open, focus moves into the dialog (a standard dialog's
  first control in the body or footer, else its close button); Tab cycles inside it; on close it
  returns to the trigger. [[rule: dialog-traps-focus-and-returns | runtime]]
- **The page behind is inert and does not scroll.** While open, everything outside the dialog is
  hidden from assistive technology and the document is scroll-locked. [[rule: dialog-inert-and-scroll-locked | runtime]]
- **Escape closes it — as the cancel, in an alert.** A standard dialog also closes on a press on
  the backdrop; an alert does not, because a stray click is not an answer. [[rule: dialog-dismissal | runtime]]
- **`aria-describedby` points only at a rendered description.** No `description` → no attribute. [[rule: dialog-describedby-only-rendered | runtime]]
- **`Dialog.Close` renders inside a `Dialog`.** Outside one it throws a named error rather than
  rendering a button that closes nothing. [[rule: dialog-close-requires-dialog | runtime]]
- **The body scrolls; the header and the footer stay.** A dialog is never taller than the viewport
  less its gutters; past that its body scrolls inside it, and the title and the actions stay on
  screen. Only a real layout can show this. [[rule: dialog-body-scrolls | browser]]
- **A dialog is for a decision that blocks the task.** Not for a message (a Contextual Alert), not
  for a long form (a page), and never two at once unless the second is a confirmation the first
  asked for. [[rule: dialog-blocks-for-a-decision | convention]]
- **It enters on ease-out, by opacity and a step of rise.** Only `opacity` and `transform` move, on
  `--vela-ease-out` because it enters; opened from the keyboard nothing moves at all. [[rule: dialog-enters-on-ease-out | browser]]

## Token bindings

| Part | Background | Border | Text |
|---|---|---|---|
| backdrop | `--vela-bg-scrim` at `--vela-opacity-scrim` | — | — |
| popup | `--vela-bg-raised` | — | `--vela-text-default` |
| title | — | — | `--vela-text-heading` |
| footer | — | `--vela-border-subtle` (top rule) | — |
| close button | rest none, hovered `--vela-btn-standard-hover-bg` | — | glyph `--vela-icon-strong` |

The backdrop is `--vela-bg-scrim` (black) drawn at `--vela-opacity-scrim` (0.5): an opacity, not a
translucent colour, because primitives are opaque and the Figma sync carries opaque colours only.
Radius `--vela-radius-8` (the modal scope in `foundations/radius.md`). Header padding
`--vela-space-20` `--vela-space-20` `--vela-space-10`, title-to-description gap `--vela-space-5`;
body padding `--vela-space-10` `--vela-space-20`; footer padding `--vela-space-15`
`--vela-space-20` `--vela-space-20`, actions `--vela-space-10` apart. The viewport keeps
`--vela-space-20` of gutter on every side. Backdrop and viewport sit at `--vela-layer-overlay`. The
close button is `--vela-control-height-24` square with a `--vela-icon-16` glyph and radius
`--vela-radius-3` (the dismiss-button scope). Its hover is the standard button's hover fill, not
`--vela-bg-hover`: in dark, `--vela-bg-hover` is the raised surface itself and the hover would show
nothing. Pairs asserted: title 16.98 / 13.10, body 7.69 / 8.84 on `--vela-bg-raised`; the glyph
7.69 / 8.84 at rest and 5.93 / 7.11 hovered. Description and body copy are `--vela-text-default`,
not `--vela-text-de-emphasized` (3.99:1 on the dark raised surface). The alert's confirm is the
kit's destructive Button and inherits its pairs.

## Sizes

| size | Width | Title | Body |
|---|---|---|---|
| regular | `--vela-dialog-width` (480) | H4 16/24 | Body 14/21 |
| wide | `--vela-dialog-width-wide` (720) | H4 16/24 | Body 14/21 |

## States

- **Open / closed** — a trigger carries `aria-expanded`; the page behind is inert while open.
- **Focus** — the global ring; it reaches the dialog because the portal carries `vela-root`.
- **Close button hover** — the standard hover fill under `@media (hover: hover)`, in at
  `--vela-duration-fast`, out at `--vela-duration-base`.
- **Motion** — see below.

## Motion

| Moment | What moves | Timing | Why |
|---|---|---|---|
| Appears | the backdrop's opacity; the popup's opacity and `--vela-space-5` of rise | `--vela-duration-base` (180ms), `--vela-ease-out` | orientation: the page recedes, the question arrives |
| Leaves | opacity only, backdrop and popup | `--vela-duration-base` (180ms) | softer than it arrived |
| From the keyboard | nothing | instant | Enter or Space on the trigger, Escape: from the keyboard nothing animates |

## Responsive behaviour

The dialog is **centred, never wider than the viewport less `--vela-space-20` a side, and never
taller**: at 400px wide a `regular` dialog is 360px and a `wide` one the same. Past the height, the
**body scrolls** and the header and the footer stay. The footer's actions **wrap** onto a second
row rather than shrink or truncate. A dialog is a viewport-level surface, so it sizes against the
viewport, not its container — the one place the kit's container-query rule does not apply, because
a modal is not embedded in anything. Minimum width: the viewport's, less the gutters; the title and
the description wrap and never truncate. Density tokens do not exist yet (see `DESIGN.md`).

## Accessibility

- The popup is `role="dialog"` — `role="alertdialog"` with `variant="alert"` — named by its heading
  through `aria-labelledby`, described by `description` through `aria-describedby` when there is one.
- **Focus is trapped**: it moves in on open, Tab and Shift+Tab cycle inside, and it returns to the
  trigger on close. In an alert it lands on the cancel.
- **The page behind is inert**: hidden from assistive technology (`aria-hidden`), pointer presses
  are caught by the backdrop, and the document does not scroll.
- **Escape** closes it (in an alert, that is the cancel). A standard dialog also closes on a press
  on the backdrop; an alert does not.
- The header's close button is a real `<button>` named by `closeLabel` ("Close").

## Implementations

Dialog ships from `@omkarux/vela/headless` only. There is no hand-rolled core and none is planned
(`decisions/002-agent-ready-direction`).

| Entry point | Implementation | Dependencies | Status |
|---|---|---|---|
| `@omkarux/vela/headless` | **headless** — Base UI 1.9 `Dialog` and `AlertDialog` (`src/headless/Dialog`) | **`@base-ui/react` (optional peer, via /headless)** | Experimental |

Where Base UI's defaults differ from this spec, the implementation maps to the spec and the
difference is recorded here:

- **One component, two Base UI components.** `variant="standard"` is Base UI's `Dialog`;
  `variant="alert"` is its `AlertDialog`, which renders `role="alertdialog"` and ignores presses
  outside. Their parts are shared (`AlertDialog` re-exports Dialog's Popup, Title, Description,
  Close), so one tree renders both.
- **The alert's actions.** Base UI leaves an alert dialog's buttons to the author. This spec fixes
  them — a cancel, then a confirm that is always the kit's destructive `Button` — and the types
  forbid a `footer` with `alert`.
- **Initial focus.** Base UI focuses the first tabbable element, which in a standard dialog is the
  header's close button. This spec moves focus to the first control in the body, then the footer,
  and only then the close button; in an alert, always to the cancel.
- **Parts.** Base UI's compound parts are not exposed except `Dialog.Close`, which renders the one
  element it wraps through Base UI's `render` and carries Vela's own provider guard. Handles,
  payloads, detached triggers, `modal={false}` and nested-dialog styling are not exposed.
- **Portal and theme.** As Popover: the portal element carries `vela-root` and copies the
  `data-theme` of the trigger's nearest themed ancestor — or, with no trigger, of a hidden marker
  rendered where the `<Dialog>` is.
- **Keyboard and motion.** An open or close from the keyboard is marked `data-vela-instant`, and
  the stylesheet skips the transition on the popup and the backdrop.
- **Extra attributes.** Base UI adds `data-open` / `data-closed`, `data-nested`, its own
  pointer-catching layer, focus-guard `<span>`s and `data-base-ui-*` markers, and writes the scroll
  lock as inline styles on `<html>` and `<body>`; none is part of the contract.

## Figma mapping

Library file: **Vela Design System** → page `Dialog`. Four variants, `Variant` (standard / alert) x
`Size` (regular / wide), each with its own title in a text layer named `Title`, plus a
`Description` boolean. There is no `Title text` property: a Figma text property holds one default
for the whole set, and a standard dialog and an alert are titled differently. The set is
created by `scripts/figma/components/dialog.figma.js`; until that builder has been run in the file,
the library has no Dialog set. The backdrop is not part of the set: a dialog frame is placed over a
`surface/scrim` rectangle at the `opacity/scrim` layer opacity.

| Figma property | Code prop |
|---|---|
| `Variant` | `variant` |
| `Size` | `size` |
| `Title` (text layer, override on the instance) | `title` |
| `Description` (boolean) | `description` |

**Focus trapping, inertness, scroll locking, Escape and the return of focus exist only in code. The
popup fills `surface/raised` and rounds at `radius/8`; it is `dialog/width` (or `/width-wide`) wide.
The footer's rule is `border/subtle`; the close glyph binds `icon/strong`; the alert's confirm uses
the destructive button colours and its cancel the standard ones.** Nothing in this component is
literal.

## Anti-patterns

- ❌ A Dialog that only says "OK" → a Contextual Alert on the page.
- ❌ A long form or a multi-step flow in a Dialog → a page; a dialog that scrolls for screens is a page in the wrong container.
- ❌ A destructive confirmation in a standard Dialog with a red button you styled yourself → `variant="alert"`; its confirm is always destructive.
- ❌ `variant="alert"` with no `cancelLabel` → will not compile; a destructive question needs a named way out.
- ❌ A `footer` on an alert → will not compile; the actions are fixed.
- ❌ A Dialog for a panel the user consults while working → a Popover.
- ❌ Opening a second Dialog from a Dialog for anything but a confirmation it asked for → restructure the flow.
- ❌ `<Dialog.Close>` outside a Dialog → throws.
